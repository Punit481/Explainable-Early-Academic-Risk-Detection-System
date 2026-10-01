package com.riskdetection.mlservice;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.io.File;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Checks that Java gives the same answers as Python for every case in
 * model/test_cases.json (written by export/export_models.py).
 */
class TestCasesTest {

    private static final String MODEL_DIR = "../model";

    private static PredictionService service;
    private static List<Map<String, Map<String, Object>>> testCases;

    @BeforeAll
    static void loadModels() throws Exception {
        service = new PredictionService(MODEL_DIR);
        testCases = new ObjectMapper().readValue(
                new File(MODEL_DIR, "test_cases.json"), new TypeReference<>() {});
    }

    @Test
    void matchesPythonForEveryTestCase() {
        assertEquals(9, testCases.size());

        for (int i = 0; i < testCases.size(); i++) {
            Map<String, Object> input = testCases.get(i).get("input");
            Map<String, Object> expected = testCases.get(i).get("expected");

            PredictionResponse result = service.predict(input);

            String label = "test case " + i;
            assertEquals((double) expected.get("riskProbability"), result.riskProbability(), 1e-5, label);
            assertEquals((double) expected.get("riskScore"), result.riskScore(), 0.01, label);
            assertEquals(expected.get("anomaly"), result.anomaly(), label);
        }
    }

    @Test
    void rejectsMissingField() {
        Map<String, Object> student = new HashMap<>(testCases.get(0).get("input"));
        student.remove("G2");

        assertThrows(IllegalArgumentException.class, () -> service.predict(student));
    }

    @Test
    void rejectsUnknownTextValue() {
        Map<String, Object> student = new HashMap<>(testCases.get(0).get("input"));
        student.put("Mjob", "pilot");

        assertThrows(IllegalArgumentException.class, () -> service.predict(student));
    }
}
