package com.riskdetection.mlservice;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.Map;

/**
 * Java version of model/metadata.json, written by export/export_models.py.
 * Everything the service needs to turn a student into model input lives here,
 * so retraining the model never requires changing Java code.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ModelMetadata(
        // Feature names in the exact order the models expect them
        List<String> features,
        // Text columns and their number for each value, e.g. Mjob: {"other": 2, ...}
        Map<String, Map<String, Integer>> categorical,
        // Largest absences value in the training data, used for attendance
        int maxAbsences,
        RiskLevels riskLevels,
        // Keys: High, Medium, LowAnomaly, Low
        Map<String, String> interventions) {

    /** Risk score thresholds: score <= lowMax is Low, <= mediumMax is Medium, else High. */
    public record RiskLevels(double lowMax, double mediumMax) {
    }
}
