# Explainable Early Academic Risk Detection and Intervention System

## Overview

This project develops an explainable machine learning system for early academic risk detection.

The system combines:

- Academic Risk Prediction using XGBoost
- Explainable AI using SHAP
- Anomaly Detection using Isolation Forest
- Probability-Based Risk Scoring
- Personalized Intervention Recommendation

## Dataset

UCI Student Performance Dataset

## Models Used

- Logistic Regression
- Decision Tree
- XGBoost
- Voting Classifier

## Results

### XGBoost Performance

- Accuracy: 92.4%
- Recall: 88.5%
- F1 Score: 88.5%

### Key Findings

- Full feature model outperformed reduced feature model
- SHAP identified quiz_avg, attendance, and failures as key predictors
- Isolation Forest detected hidden early-warning students

## Project Pipeline

1. Data Preprocessing
2. Feature Engineering
3. Model Training
4. Feature Selection
5. Explainability
6. Anomaly Detection
7. Risk Scoring
8. Intervention Recommendation

## Technologies

- Python
- Pandas
- NumPy
- Scikit-Learn
- XGBoost
- SHAP
- Matplotlib
