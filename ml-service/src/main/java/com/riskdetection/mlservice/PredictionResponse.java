package com.riskdetection.mlservice;

import java.util.List;

/** What POST /predict returns for one student. */
public record PredictionResponse(
        double riskProbability,
        double riskScore,
        String riskLevel,
        boolean anomaly,
        String intervention,
        List<ShapFactor> topFactors) {

    /**
     * One feature's share of the prediction (its SHAP value).
     * contribution is in XGBoost's log-odds units: positive pushes towards "at risk".
     * value is what the student sent (or the calculated value for derived features).
     */
    public record ShapFactor(String feature, Object value, double contribution, String effect) {
    }
}
