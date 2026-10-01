package com.riskdetection.mlservice;

import ai.onnxruntime.OrtException;
import jakarta.annotation.PreDestroy;
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
 * Loads every stage's models once at startup and turns one student into a prediction:
 * pick stage -> encode -> XGBoost (risk + SHAP) -> Isolation Forest (anomaly) -> intervention.
 */
@Service
public class PredictionService {

    private static final int TOP_FACTORS = 5;

    private final ModelMetadata metadata;
    private final FeatureEncoder encoder;
    // Same order as metadata.stages(): most information first
    private final List<StageModel> stageModels = new ArrayList<>();

    public PredictionService(@Value("${model.dir}") String modelDir) throws XGBoostError, OrtException {
        Path dir = Path.of(modelDir);
        metadata = new ObjectMapper().readValue(dir.resolve("metadata.json").toFile(), ModelMetadata.class);
        encoder = new FeatureEncoder(metadata);
        for (ModelMetadata.Stage stage : metadata.stages()) {
            stageModels.add(new StageModel(stage, dir.resolve(stage.name())));
        }
    }

    public PredictionResponse predict(Map<String, Object> student) {
        StageModel model = chooseStage(student);
        List<String> featureNames = model.stage().features();
        float[] features = encoder.encode(student, featureNames);
        try {
            StageModel.Risk risk = model.predictRisk(features);
            boolean anomaly = model.isAnomaly(features);

            double riskScore = round(risk.probability() * 100, 2);
            String riskLevel = riskLevel(riskScore);

            return new PredictionResponse(
                    model.stage().name(),
                    round(risk.probability(), 6),
                    riskScore,
                    riskLevel,
                    anomaly,
                    intervention(riskLevel, anomaly),
                    topFactors(student, featureNames, features, risk.contributions()));
        } catch (XGBoostError | OrtException e) {
            throw new IllegalStateException("Model prediction failed", e);
        }
    }

    /** The stage with the most information whose required grades the student has. */
    private StageModel chooseStage(Map<String, Object> student) {
        if (student.get("G2") != null && student.get("G1") == null) {
            throw new IllegalArgumentException("G2 was given without G1");
        }
        for (StageModel model : stageModels) {
            if (model.stage().requires().stream().allMatch(field -> student.get(field) != null)) {
                return model;
            }
        }
        throw new IllegalStateException("No stage without required grades in metadata.json");
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
            Map<String, Object> student, List<String> featureNames, float[] features, float[] contributions) {
        List<PredictionResponse.ShapFactor> factors = new ArrayList<>();
        for (int i = 0; i < features.length; i++) {
            String name = featureNames.get(i);
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
        for (StageModel model : stageModels) {
            model.close();
        }
    }
}
