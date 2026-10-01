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
- **Docker Compose** runs everything together; nginx (in the web image) serves the
  React app and proxies `/api/*` to the api. Only port 8000 is published.

## Build order

1. Model export — **done**
2. ml-service — **done**
3. api — **done**
4. web — **done**
5. Docker — **done** (local only; deploying online is a later decision)

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

## api

NestJS 12, TypeORM 1.x, PostgreSQL 17 (in Docker). From the repo root:

```
docker compose up -d postgres        # PostgreSQL on 127.0.0.1:5432
cd api && cp .env.example .env       # use the POSTGRES_PASSWORD from the root .env
npm test                             # unit tests
npm run test:e2e                     # needs PostgreSQL; uses a fake ml-service
npm run start:dev                    # serves on port 3000; needs ml-service on 8080
```

- Endpoints: `POST /auth/register`, `POST /auth/login`, `GET|POST /classes`,
  `GET /classes/:id`, `POST /classes/:id/upload` (multipart, field `file`),
  `GET /students/:id`, `POST /students/:id/what-if`. All but `/auth/*` need
  `Authorization: Bearer <token>`. Other teachers' data returns 404.
- `data/sample_class.csv` is a ready-made class to upload (30 students).
- ES-module project: local imports end in `.js` (e.g. `'./auth.module.js'`).
- TypeORM 1.x: `select` takes an object (`{ id: true }`), not an array.
- npm 10.9 crashes installing this project (`Cannot read properties of null
  (reading 'edgesOut')`); use `npx npm@11 install` instead.
- Tables come only from migrations (`src/migrations/`), which run when the api
  starts. After changing an entity: `npm run migration:generate --
  src/migrations/<Name>` (needs PostgreSQL), check the SQL, add the class to
  `src/migrations/index.ts`.

## web

Vite 8, React 19, TypeScript, react-router 7, Recharts, Tailwind CSS 4. From `web/`:

```
npm run dev      # http://localhost:5173; needs the api on 3000 (and ml-service on 8080)
npm test         # component tests (Vitest + Testing Library)
npm run build    # type-check + production build
```

- Vite proxies `/api/*` to `localhost:3000` (prefix stripped), so no CORS is needed.
- react-router is on 7.x because 8.x needs Node >= 22.22 (this machine has 22.17).
- Code style here: no semicolons, single quotes (the Vite template's style).
- Colors with meaning live in `src/index.css` (light + dark): status colors for
  risk levels (always with icon + label), blue/red for SHAP bars (validated for
  color-blind safety). Don't reuse them for anything else.

## Docker (whole stack)

From the repo root, with a `.env` copied from `.env.example` (POSTGRES_PASSWORD, JWT_SECRET):

```
docker compose up -d --build    # http://localhost:8000
docker compose logs -f api      # follow one service's logs
docker compose down             # stop (data stays in the postgres-data volume)
docker compose down -v          # stop and delete all data
```

- The ml-service image runs `mvn package`, so it only builds if all test cases pass.
- XGBoost4J needs `libgomp1` on Linux (installed in both ml-service stages).
- The api/web build stages install npm 11 because the lockfiles come from npm 11.
- PostgreSQL's password is set only when its volume is first created; changing
  `POSTGRES_PASSWORD` later needs `docker compose down -v` (deletes data).
