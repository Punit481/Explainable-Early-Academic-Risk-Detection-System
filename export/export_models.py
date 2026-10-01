"""
Export the trained models so the Java ML service can use them.
Run once from the repo root:  python export/export_models.py

Trains one XGBoost risk model and one Isolation Forest per stage of the school year,
because a teacher has less information early on:
  after_period_2  both period grades (G1, G2) are known
  after_period_1  only G1 is known
  start_of_term   no grades yet (and no absences: the dataset's absences cover the whole year)

Writes:
  model/metadata.json                  shared mappings + each stage's feature list
  model/metrics.json                   test-set results per stage (used in the README)
  model/<stage>/xgb_model.json         XGBoost model, for XGBoost4J
  model/<stage>/isolation_forest.onnx  Isolation Forest, for ONNX Runtime
  model/<stage>/test_cases.json        inputs + expected outputs (incl. SHAP), to verify Java
  data/sample_class.csv                demo class: 30 test-set students with all grades
  data/sample_class_start_of_term.csv  the same students before any grades or absences
"""

import json
import os

import numpy as np
import onnxruntime as ort
import pandas as pd
import shap
from skl2onnx import to_onnx
from sklearn.ensemble import IsolationForest
from sklearn.metrics import accuracy_score, brier_score_loss, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict, train_test_split
from xgboost import DMatrix, XGBClassifier

DATA_PATH = "data/student-mat.csv"
OUT_DIR = "model"

DERIVED = ["attendance", "quiz_avg", "trend"]

# Ordered from most to least information. The Java service uses the first stage
# whose required grades are all in the request.
STAGES = [
    {"name": "after_period_2", "requires": ["G1", "G2"], "drop": []},
    {"name": "after_period_1", "requires": ["G1"], "drop": ["G2", "quiz_avg", "trend"]},
    {
        "name": "start_of_term",
        "requires": [],
        "drop": ["G1", "G2", "quiz_avg", "trend", "absences", "attendance"],
    },
]

RISK_LEVELS = {"lowMax": 30, "mediumMax": 70}

# Shallow trees, learned slowly. XGBoost's defaults (depth 6) memorize this small dataset
# and give overconfident scores (up to 99 with no grades at all); these settings had
# better AUC and calibration (Brier score) at every stage.
XGB_PARAMS = dict(
    max_depth=2,
    learning_rate=0.05,
    n_estimators=200,
    min_child_weight=3,
    subsample=0.8,
    colsample_bytree=0.8,
    eval_metric="logloss",
    random_state=42,
)

# 1. Same preprocessing as the notebook
df = pd.read_csv(DATA_PATH, sep=";")
df["risk"] = (df["G3"] < 10).astype(int)

MAX_ABSENCES = int(df["absences"].max())
df["attendance"] = 100 * (1 - df["absences"] / MAX_ABSENCES)
df["quiz_avg"] = (df["G1"] + df["G2"]) / 2
df["trend"] = df["G2"] - df["G1"]

y = df["risk"]
X = df.drop(["risk", "G3"], axis=1)
ALL_FEATURES = list(X.columns)

# LabelEncoder numbers text values alphabetically; same thing, but we save the mapping
CATEGORICAL = {}
X_encoded = X.copy()
for col in X.columns:
    if not pd.api.types.is_numeric_dtype(X[col]):
        values = sorted(X[col].unique())
        mapping = {v: i for i, v in enumerate(values)}
        CATEGORICAL[col] = mapping
        X_encoded[col] = X[col].map(mapping)
X_encoded = X_encoded.astype(float)

# One split for all stages, so their results are comparable
train_idx, test_idx = train_test_split(X_encoded.index, test_size=0.2, random_state=42, stratify=y)
y_train, y_test = y[train_idx], y[test_idx]
baseline = max(y_test.mean(), 1 - y_test.mean())  # accuracy of always guessing the majority
print(f"Test set: {len(test_idx)} students, {y_test.mean():.1%} at risk")
print(f"Baseline (always guess 'not at risk'): accuracy {baseline:.3f}\n")

metadata_stages = []
metrics = {"testStudents": len(test_idx), "baselineAccuracy": round(baseline, 3), "stages": {}}

for stage in STAGES:
    name = stage["name"]
    features = [f for f in ALL_FEATURES if f not in stage["drop"]]
    raw_features = [f for f in features if f not in DERIVED]
    stage_dir = os.path.join(OUT_DIR, name)
    os.makedirs(stage_dir, exist_ok=True)

    # 2. Train the same models as the notebook, on this stage's features
    X_stage = X_encoded[features]
    xgb = XGBClassifier(**XGB_PARAMS)
    xgb.fit(X_stage.loc[train_idx], y_train)
    prob = xgb.predict_proba(X_stage.loc[test_idx])[:, 1]
    pred = (prob >= 0.5).astype(int)
    flagged = prob * 100 > RISK_LEVELS["lowMax"]  # shown as Medium or High in the dashboard
    # One test split of 79 students is noisy, so also cross-validate on the training part
    cv_prob = cross_val_predict(
        XGBClassifier(**XGB_PARAMS),
        X_stage.loc[train_idx],
        y_train,
        cv=StratifiedKFold(5, shuffle=True, random_state=42),
        method="predict_proba",
    )[:, 1]

    stage_metrics = {
        "features": len(features),
        "accuracy": round(accuracy_score(y_test, pred), 3),
        "precision": round(precision_score(y_test, pred), 3),
        "recall": round(recall_score(y_test, pred), 3),
        "f1": round(f1_score(y_test, pred), 3),
        "auc": round(roc_auc_score(y_test, prob), 3),
        "cvAuc": round(roc_auc_score(y_train, cv_prob), 3),
        "brier": round(brier_score_loss(y_test, prob), 3),
        # Share of truly at-risk students the dashboard marks Medium or High
        "flaggedRecall": round(float(flagged[y_test.values == 1].mean()), 3),
    }
    metrics["stages"][name] = stage_metrics
    print(f"{name}: {len(features)} features")
    print("  " + "  ".join(f"{k}={v}" for k, v in stage_metrics.items() if k != "features"))

    iso = IsolationForest(contamination=0.1, random_state=42)
    iso.fit(X_stage)

    # 3. Export
    xgb.get_booster().save_model(os.path.join(stage_dir, "xgb_model.json"))
    onnx_model = to_onnx(
        iso,
        X_stage.values[:1].astype(np.float32),
        target_opset={"": 15, "ai.onnx.ml": 3},
    )
    # skl2onnx lists the opsets in a random order per run; sort them so re-exporting
    # gives a byte-for-byte identical file (CI checks this)
    opsets = sorted((o.domain, o.version) for o in onnx_model.opset_import)
    del onnx_model.opset_import[:]
    for domain, version in opsets:
        onnx_model.opset_import.add(domain=domain, version=version)
    onnx_path = os.path.join(stage_dir, "isolation_forest.onnx")
    with open(onnx_path, "wb") as f:
        f.write(onnx_model.SerializeToString())

    metadata_stages.append({"name": name, "requires": stage["requires"], "features": features})

    # 4. SHAP: XGBoost's built-in values (what Java uses) must match the shap library
    test_matrix = DMatrix(X_stage.loc[test_idx])
    builtin = xgb.get_booster().predict(test_matrix, pred_contribs=True)[:, :-1]
    library = shap.TreeExplainer(xgb).shap_values(X_stage.loc[test_idx])
    print(f"  SHAP: XGBoost built-in vs shap library, max difference {np.abs(builtin - library).max():.2e}")

    # 5. Test cases for verifying the Java service
    sess = ort.InferenceSession(onnx_path)
    input_name = sess.get_inputs()[0].name

    sample_idx = list(test_idx[:8])
    anomalies = X_stage.index[iso.predict(X_stage) == -1]
    if len(anomalies) and anomalies[0] not in sample_idx:
        sample_idx.append(anomalies[0])

    cases = []
    for i in sample_idx:
        row = X_stage.loc[[i]]
        p = float(xgb.predict_proba(row)[0, 1])
        onnx_label = int(np.ravel(sess.run(None, {input_name: row.values.astype(np.float32)})[0])[0])
        contributions = xgb.get_booster().predict(DMatrix(row), pred_contribs=True)[0]
        cases.append({
            "input": {c: (X.loc[i, c].item() if hasattr(X.loc[i, c], "item") else X.loc[i, c]) for c in raw_features},
            "expected": {
                "stage": name,
                "riskProbability": round(p, 6),
                "riskScore": round(p * 100, 2),
                "anomaly": onnx_label == -1,
                "shap": {f: round(float(v), 6) for f, v in zip(features, contributions[:-1])},
            },
        })
    with open(os.path.join(stage_dir, "test_cases.json"), "w") as f:
        json.dump(cases, f, indent=2)

    onnx_labels = sess.run(None, {input_name: X_stage.values.astype(np.float32)})[0].ravel()
    agree = (onnx_labels == iso.predict(X_stage)).mean() * 100
    print(f"  Isolation Forest: ONNX matches scikit-learn on {agree:.1f}%, {len(anomalies)} anomalies\n")

metadata = {
    "categorical": CATEGORICAL,
    "derived": {
        "attendance": "100 * (1 - absences / maxAbsences)",
        "quiz_avg": "(G1 + G2) / 2",
        "trend": "G2 - G1",
    },
    "maxAbsences": MAX_ABSENCES,
    "stages": metadata_stages,
    "riskLevels": RISK_LEVELS,
    "interventions": {
        "High": "Immediate counseling & mentoring",
        "Medium": "Regular monitoring & academic support",
        "LowAnomaly": "Behavioral review (early warning)",
        "Low": "No action needed",
    },
}
with open(os.path.join(OUT_DIR, "metadata.json"), "w") as f:
    json.dump(metadata, f, indent=2)
with open(os.path.join(OUT_DIR, "metrics.json"), "w") as f:
    json.dump(metrics, f, indent=2)

# 6. Demo classes for the dashboard: students from the TEST set only,
# so the demo never shows students the models were trained on
NAMES = [
    "Aarav Shah", "Priya Nair", "Rohan Mehta", "Ananya Iyer", "Kabir Singh", "Diya Patel",
    "Arjun Rao", "Isha Gupta", "Vihaan Das", "Meera Pillai", "Aditya Kumar", "Saanvi Reddy",
    "Ishaan Joshi", "Kavya Menon", "Reyansh Bose", "Tara Kapoor", "Dev Malhotra", "Nisha Verma",
    "Kunal Desai", "Riya Sharma", "Yash Chopra", "Aisha Khan", "Siddharth Jain", "Pooja Bhat",
    "Nikhil Agarwal", "Sneha Kulkarni", "Rahul Mishra", "Tanvi Saxena", "Manav Sethi", "Zoya Ali",
]
raw_columns = [c for c in ALL_FEATURES if c not in DERIVED]
demo = X.loc[test_idx[: len(NAMES)], raw_columns].copy()
demo.insert(0, "name", NAMES)
demo.to_csv("data/sample_class.csv", sep=";", index=False)
demo.drop(columns=["G1", "G2", "absences"]).to_csv("data/sample_class_start_of_term.csv", sep=";", index=False)

print(f"Saved models to {OUT_DIR}/ and demo classes to data/")
