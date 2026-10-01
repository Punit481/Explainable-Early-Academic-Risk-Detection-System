package com.riskdetection.mlservice;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;
import java.util.Map;

/**
 * Java version of model/metadata.json, written by export/export_models.py.
 * Everything the service needs to turn a student into model input lives here,
 * so retraining the models never requires changing Java code.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ModelMetadata(
        // Text columns and their number for each value, e.g. Mjob: {"other": 2, ...}
        Map<String, Map<String, Integer>> categorical,
        // Largest absences value in the training data, used for attendance
        int maxAbsences,
        // Ordered from most to least information (after_period_2, after_period_1, start_of_term)
        List<Stage> stages,
        RiskLevels riskLevels,
        // Keys: High, Medium, LowAnomaly, Low
        Map<String, String> interventions) {

    /**
     * One point in the school year with its own models in model/{name}/.
     * requires: the grades that must be known to use it; features: in the exact order the models expect.
     */
    public record Stage(String name, List<String> requires, List<String> features) {
    }

    /** Risk score thresholds: score <= lowMax is Low, <= mediumMax is Medium, else High. */
    public record RiskLevels(double lowMax, double mediumMax) {
    }
}
