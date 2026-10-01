# Explainable Early Academic Risk Detection System

An explainable ML system for early academic risk detection (UCI Student Performance
dataset), being turned into a full-stack teacher dashboard.

## Architecture

- **notebooks/ + export/** — Python is used ONLY for training and exporting models.
  `export/export_models.py` writes `model/`:
  - `xgb_model.json` — XGBoost risk classifier
  - `isolation_forest.onnx` — Isolation Forest anomaly detector
  - `metadata.json` — feature order, categorical mappings, derived-feature formulas,
    `maxAbsences`, risk thresholds, interventions
  - `test_cases.json` — inputs with expected outputs, for verifying the Java service
- **ml-service/** — Spring Boot (Java). Loads `xgb_model.json` with XGBoost4J and
  `isolation_forest.onnx` with ONNX Runtime. Encodes input using `metadata.json`.
  `POST /predict` returns `riskProbability`, `riskScore`, `riskLevel`
  (Low <= 30, Medium <= 70, High), anomaly flag, intervention, and top SHAP factors
  (XGBoost4J `predictContrib`). Must pass every case in `model/test_cases.json`.
- **api/** — NestJS (Node). Teacher login with JWT, students/classes in PostgreSQL,
  CSV upload, calls ml-service over REST.
- **web/** — React + TypeScript dashboard. Class table with risk badges, student
  detail page with SHAP chart, what-if simulator, CSV upload.
- **Docker Compose** to run everything together.

## Build order

1. Model export — **done**
2. ml-service — **done**
3. api
4. web
5. Docker + deploy

## Working rules

- One step at a time. Explain what you'll do and why before writing code, and wait
  for the user's OK.
- The user is a student and needs to explain this project in interviews, so keep the
  code simple and readable.
- Commit after each working step.

## Python environment

Use the conda env `ml_project_py312` (Python 3.12). The older `ml_project` env
(Python 3.10) is broken: its scipy build fails to load on this macOS.

Re-export the models from the repo root:

```
conda run -n ml_project_py312 python export/export_models.py
```

Expected output: XGBoost accuracy 0.924, recall 0.885, F1 0.885; ONNX matches
scikit-learn on 100% of students; 40 of 395 anomalies.

## ml-service

Spring Boot 4.1, Java 21, XGBoost4J 3.4.0, ONNX Runtime 1.30. From `ml-service/`:

```
mvn test               # checks every case in model/test_cases.json
mvn spring-boot:run    # serves POST /predict on port 8080
```

- Reads models from `../model` by default; set `MODEL_DIR` to override.
- On macOS, XGBoost4J needs OpenMP from Homebrew (`brew install libomp`).
- Spring Boot 4 uses Jackson 3: import `tools.jackson.databind.*`, not
  `com.fasterxml.jackson.databind.*` (annotations are still `com.fasterxml`).
