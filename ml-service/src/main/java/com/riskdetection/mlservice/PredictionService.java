package com.riskdetection.mlservice;

import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtException;
import ai.onnxruntime.OrtSession;
import jakarta.annotation.PreDestroy;
import ml.dmlc.xgboost4j.java.Booster;
import ml.dmlc.xgboost4j.java.DMatrix;
import ml.dmlc.xgboost4j.java.XGBoost;
import ml.dmlc.xgboost4j.java.XGBoostError;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Loads both models once at startup and turns one student into a prediction:
 * encode -> XGBoost (risk + SHAP) -> Isolation Forest (anomaly) -> intervention.
 */
@Service
public class PredictionService {

    private static final int TOP_FACTORS = 5;

    private final ModelMetadata metadata;
    private final FeatureEncoder encoder;
    private final Booster xgboost;
    private final OrtSession isolationForest;
    private final String isolationForestInput;

    public PredictionService(@Value("${model.dir}") String modelDir) throws XGBoostError, OrtException {
        Path dir = Path.of(modelDir);
        metadata = new ObjectMapper().readValue(dir.resolve("metadata.json").toFile(), ModelMetadata.class);
        encoder = new FeatureEncoder(metadata);
        xgboost = XGBoost.loadModel(dir.resolve("xgb_model.json").toString());
        isolationForest = OrtEnvironment.getEnvironment()
                .createSession(dir.resolve("isolation_forest.onnx").toString());
        isolationForestInput = isolationForest.getInputNames().iterator().next();
    }

    public PredictionResponse predict(Map<String, Object> student) {
        float[] features = encoder.encode(student);
        try {
            XgboostResult risk = runXgboost(features);
            boolean anomaly = isAnomaly(features);

            double riskScore = round(risk.probability() * 100, 2);
            String riskLevel = riskLevel(riskScore);

            return new PredictionResponse(
                    round(risk.probability(), 6),
                    riskScore,
                    riskLevel,
                    anomaly,
                    intervention(riskLevel, anomaly),
                    topFactors(student, features, risk.contributions()));
        } catch (XGBoostError | OrtException e) {
            throw new IllegalStateException("Model prediction failed", e);
        }
    }

    /** Risk probability plus one SHAP value per feature (the last value is the base value). */
    private record XgboostResult(double probability, float[] contributions) {
    }

    // synchronized: keeps it simple and safe to share one Booster between requests
    private synchronized XgboostResult runXgboost(float[] features) throws XGBoostError {
        DMatrix row = new DMatrix(features, 1, features.length, Float.NaN);
        try {
            float probability = xgboost.predict(row)[0][0];
            float[] contributions = xgboost.predictContrib(row, 0)[0];
            return new XgboostResult(probability, contributions);
        } finally {
            row.dispose();
        }
    }

    private boolean isAnomaly(float[] features) throws OrtException {
        OrtEnvironment env = OrtEnvironment.getEnvironment();
        try (OnnxTensor input = OnnxTensor.createTensor(env, new float[][]{features});
             OrtSession.Result result = isolationForest.run(Map.of(isolationForestInput, input))) {
            // Output 0 is the label, shape [1, 1]: -1 = anomaly, 1 = normal
            long[][] labels = (long[][]) result.get(0).getValue();
            return labels[0][0] == -1;
        }
    }

    private String riskLevel(double riskScore) {
        if (riskScore <= metadata.riskLevels().lowMax()) {
            return "Low";
        } else if (riskScore <= metadata.riskLevels().mediumMax()) {
            return "Medium";
        }
        return "High";
    }

    private String intervention(String riskLevel, boolean anomaly) {
        String key = riskLevel.equals("Low") && anomaly ? "LowAnomaly" : riskLevel;
        return metadata.interventions().get(key);
    }

    /** The features with the biggest SHAP values (positive or negative). */
    private List<PredictionResponse.ShapFactor> topFactors(
            Map<String, Object> student, float[] features, float[] contributions) {
        List<PredictionResponse.ShapFactor> factors = new ArrayList<>();
        for (int i = 0; i < features.length; i++) {
            String name = metadata.features().get(i);
            Object value = metadata.categorical().containsKey(name)
                    ? student.get(name)
                    : round(features[i], 2);
            double contribution = contributions[i];
            String effect = contribution > 0 ? "increases risk" : "decreases risk";
            factors.add(new PredictionResponse.ShapFactor(name, value, round(contribution, 4), effect));
        }
        factors.sort(Comparator.comparingDouble(
                (PredictionResponse.ShapFactor f) -> Math.abs(f.contribution())).reversed());
        return factors.subList(0, TOP_FACTORS);
    }

    private static double round(double value, int decimals) {
        double factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    @PreDestroy
    public void close() throws OrtException {
        isolationForest.close();
        xgboost.dispose();
    }
}
