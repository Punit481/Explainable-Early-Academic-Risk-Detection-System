package com.riskdetection.mlservice;

import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtException;
import ai.onnxruntime.OrtSession;
import ml.dmlc.xgboost4j.java.Booster;
import ml.dmlc.xgboost4j.java.DMatrix;
import ml.dmlc.xgboost4j.java.XGBoost;
import ml.dmlc.xgboost4j.java.XGBoostError;

import java.nio.file.Path;
import java.util.Map;

/** One stage's two models, loaded from model/{stage}/: XGBoost (risk + SHAP) and Isolation Forest (anomaly). */
public class StageModel implements AutoCloseable {

    /** Risk probability plus one SHAP value per feature (the last value is the base value). */
    public record Risk(double probability, float[] contributions) {
    }

    private final ModelMetadata.Stage stage;
    private final Booster xgboost;
    private final OrtSession isolationForest;
    private final String isolationForestInput;

    public StageModel(ModelMetadata.Stage stage, Path stageDir) throws XGBoostError, OrtException {
        this.stage = stage;
        xgboost = XGBoost.loadModel(stageDir.resolve("xgb_model.json").toString());
        isolationForest = OrtEnvironment.getEnvironment()
                .createSession(stageDir.resolve("isolation_forest.onnx").toString());
        isolationForestInput = isolationForest.getInputNames().iterator().next();
    }

    public ModelMetadata.Stage stage() {
        return stage;
    }

    // synchronized: keeps it simple and safe to share one Booster between requests
    public synchronized Risk predictRisk(float[] features) throws XGBoostError {
        DMatrix row = new DMatrix(features, 1, features.length, Float.NaN);
        try {
            float probability = xgboost.predict(row)[0][0];
            float[] contributions = xgboost.predictContrib(row, 0)[0];
            return new Risk(probability, contributions);
        } finally {
            row.dispose();
        }
    }

    public boolean isAnomaly(float[] features) throws OrtException {
        OrtEnvironment env = OrtEnvironment.getEnvironment();
        try (OnnxTensor input = OnnxTensor.createTensor(env, new float[][]{features});
             OrtSession.Result result = isolationForest.run(Map.of(isolationForestInput, input))) {
            // Output 0 is the label, shape [1, 1]: -1 = anomaly, 1 = normal
            long[][] labels = (long[][]) result.get(0).getValue();
            return labels[0][0] == -1;
        }
    }

    @Override
    public void close() throws OrtException {
        isolationForest.close();
        xgboost.dispose();
    }
}
