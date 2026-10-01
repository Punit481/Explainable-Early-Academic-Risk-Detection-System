package com.riskdetection.mlservice;

import java.util.List;
import java.util.Map;

/**
 * Turns one student's raw JSON fields into the 35 numbers the models expect,
 * doing exactly what the Python preprocessing did:
 *  - text values become numbers using the saved mappings (e.g. Mjob "other" -> 2)
 *  - numbers are copied as they are
 *  - attendance, quiz_avg and trend are calculated from absences, G1 and G2
 *
 * Bad input throws IllegalArgumentException, which the controller turns into 400.
 */
public class FeatureEncoder {

    private final ModelMetadata metadata;

    public FeatureEncoder(ModelMetadata metadata) {
        this.metadata = metadata;
    }

    public float[] encode(Map<String, Object> student) {
        List<String> featureNames = metadata.features();
        float[] features = new float[featureNames.size()];

        for (int i = 0; i < featureNames.size(); i++) {
            String name = featureNames.get(i);
            // Calculate in double (like pandas), then store as float (like XGBoost/ONNX)
            double value = switch (name) {
                case "attendance" -> 100 * (1 - number(student, "absences") / metadata.maxAbsences());
                case "quiz_avg" -> (number(student, "G1") + number(student, "G2")) / 2;
                case "trend" -> number(student, "G2") - number(student, "G1");
                default -> metadata.categorical().containsKey(name)
                        ? category(student, name)
                        : number(student, name);
            };
            features[i] = (float) value;
        }
        return features;
    }

    private double number(Map<String, Object> student, String field) {
        Object value = student.get(field);
        if (value == null) {
            throw new IllegalArgumentException("Missing field: " + field);
        }
        if (!(value instanceof Number number)) {
            throw new IllegalArgumentException("Field " + field + " must be a number, got: " + value);
        }
        return number.doubleValue();
    }

    private int category(Map<String, Object> student, String field) {
        Object value = student.get(field);
        if (value == null) {
            throw new IllegalArgumentException("Missing field: " + field);
        }
        Map<String, Integer> mapping = metadata.categorical().get(field);
        Integer code = mapping.get(value.toString());
        if (code == null) {
            throw new IllegalArgumentException(
                    "Field " + field + " has unknown value '" + value + "', expected one of " + mapping.keySet());
        }
        return code;
    }
}
