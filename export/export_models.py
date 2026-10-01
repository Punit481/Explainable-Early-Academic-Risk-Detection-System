"""
Export the trained models so the Java ML service can use them.
Run once from the repo root:  python export/export_models.py
Writes model/xgb_model.json, model/isolation_forest.onnx,
model/metadata.json, model/test_cases.json
"""

import json
import os

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import accuracy_score, f1_score, recall_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

DATA_PATH = "data/student-mat.csv"
OUT_DIR = "model"
os.makedirs(OUT_DIR, exist_ok=True)

# 1. Same preprocessing as the notebook
df = pd.read_csv(DATA_PATH, sep=";")
df["risk"] = (df["G3"] < 10).astype(int)

MAX_ABSENCES = int(df["absences"].max())
df["attendance"] = 100 * (1 - df["absences"] / MAX_ABSENCES)
df["quiz_avg"] = (df["G1"] + df["G2"]) / 2
df["trend"] = df["G2"] - df["G1"]

y = df["risk"]
X = df.drop(["risk", "G3"], axis=1)
FEATURES = list(X.columns)

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

X_train, X_test, y_train, y_test = train_test_split(
    X_encoded, y, test_size=0.2, random_state=42, stratify=y
)

# 2. Train the same models
xgb = XGBClassifier(eval_metric="logloss", random_state=42)
xgb.fit(X_train, y_train)
pred = xgb.predict(X_test)
print("XGBoost on test set (should match the README):")
print(f"  Accuracy: {accuracy_score(y_test, pred):.3f}")
print(f"  Recall:   {recall_score(y_test, pred):.3f}")
print(f"  F1:       {f1_score(y_test, pred):.3f}")

iso = IsolationForest(contamination=0.1, random_state=42)
iso.fit(X_encoded)

# 3. Export
xgb.get_booster().save_model(os.path.join(OUT_DIR, "xgb_model.json"))

from skl2onnx import to_onnx
onnx_model = to_onnx(
    iso,
    X_encoded.values[:1].astype(np.float32),
    target_opset={"": 15, "ai.onnx.ml": 3},
)
with open(os.path.join(OUT_DIR, "isolation_forest.onnx"), "wb") as f:
    f.write(onnx_model.SerializeToString())

metadata = {
    "features": FEATURES,
    "categorical": CATEGORICAL,
    "derived": {
        "attendance": "100 * (1 - absences / maxAbsences)",
        "quiz_avg": "(G1 + G2) / 2",
        "trend": "G2 - G1",
    },
    "maxAbsences": MAX_ABSENCES,
    "riskLevels": {"lowMax": 30, "mediumMax": 70},
    "interventions": {
        "High": "Immediate counseling & mentoring",
        "Medium": "Regular monitoring & academic support",
        "LowAnomaly": "Behavioral review (early warning)",
        "Low": "No action needed",
    },
}
with open(os.path.join(OUT_DIR, "metadata.json"), "w") as f:
    json.dump(metadata, f, indent=2)

# 4. Test cases for verifying the Java service later
import onnxruntime as ort
sess = ort.InferenceSession(os.path.join(OUT_DIR, "isolation_forest.onnx"))
input_name = sess.get_inputs()[0].name

raw_cols = [c for c in FEATURES if c not in ("attendance", "quiz_avg", "trend")]
sample_idx = list(X_test.index[:8])
anom_idx = [i for i in X_encoded.index if iso.predict(X_encoded.loc[[i]])[0] == -1]
if anom_idx and anom_idx[0] not in sample_idx:
    sample_idx.append(anom_idx[0])

cases = []
for i in sample_idx:
    row = X_encoded.loc[[i]]
    prob = float(xgb.predict_proba(row)[0, 1])
    onnx_label = int(np.ravel(sess.run(None, {input_name: row.values.astype(np.float32)})[0])[0])
    cases.append({
        "input": {c: (X.loc[i, c].item() if hasattr(X.loc[i, c], "item") else X.loc[i, c]) for c in raw_cols},
        "expected": {
            "riskProbability": round(prob, 6),
            "riskScore": round(prob * 100, 2),
            "anomaly": onnx_label == -1,
        },
    })
with open(os.path.join(OUT_DIR, "test_cases.json"), "w") as f:
    json.dump(cases, f, indent=2)

onnx_labels = sess.run(None, {input_name: X_encoded.values.astype(np.float32)})[0].ravel()
agree = (onnx_labels == iso.predict(X_encoded)).mean() * 100
print(f"\nIsolation Forest: ONNX matches scikit-learn on {agree:.1f}% of students")
print(f"Anomalies found: {(iso.predict(X_encoded) == -1).sum()} of {len(X_encoded)}")
print(f"\nSaved to {OUT_DIR}/")
