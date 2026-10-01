package com.riskdetection.mlservice;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.io.File;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Checks that Java gives the same answers as Python for every case in
 * model/{stage}/test_cases.json (written by export/export_models.py),
 * including the SHAP explanation.
 */
class TestCasesTest {

    private static final String MODEL_DIR = "../model";

    private static PredictionService service;

    @BeforeAll
    static void loadModels() throws Exception {
        service = new PredictionService(MODEL_DIR);
    }

    private static List<Map<String, Map<String, Object>>> testCases(String stage) {
        return new ObjectMapper().readValue(
                new File(MODEL_DIR, stage + "/test_cases.json"), new TypeReference<>() {});
    }

    @ParameterizedTest
    @ValueSource(strings = {"after_period_2", "after_period_1", "start_of_term"})
    void matchesPythonForEveryTestCase(String stage) {
        List<Map<String, Map<String, Object>>> cases = testCases(stage);
        assertFalse(cases.isEmpty());

        for (int i = 0; i < cases.size(); i++) {
            Map<String, Object> input = cases.get(i).get("input");
            Map<String, Object> expected = cases.get(i).get("expected");
            String label = stage + " test case " + i;

            PredictionResponse result = service.predict(input);

            // The service picks the stage from which grades the input has
            assertEquals(expected.get("stage"), result.stage(), label);
            assertEquals((double) expected.get("riskProbability"), result.riskProbability(), 1e-5, label);
            assertEquals((double) expected.get("riskScore"), result.riskScore(), 0.01, label);
            assertEquals(expected.get("anomaly"), result.anomaly(), label);
            assertSameShap(expected, result, label);
        }
    }

    /** Same top factors in the same order as Python, with the same SHAP values. */
    @SuppressWarnings("unchecked")
    private static void assertSameShap(Map<String, Object> expected, PredictionResponse result, String label) {
        Map<String, Double> pythonShap = (Map<String, Double>) expected.get("shap");
        List<String> pythonTop = pythonShap.entrySet().stream()
                .sorted(Comparator.comparingDouble((Map.Entry<String, Double> e) -> Math.abs(e.getValue())).reversed())
                .limit(result.topFactors().size())
                .map(Map.Entry::getKey)
                .toList();
        List<String> javaTop = result.topFactors().stream().map(PredictionResponse.ShapFactor::feature).toList();
        assertEquals(pythonTop, javaTop, label);

        for (PredictionResponse.ShapFactor factor : result.topFactors()) {
            assertEquals(pythonShap.get(factor.feature()), factor.contribution(), 1e-4, label + " " + factor.feature());
        }
    }

    @Test
    void rejectsMissingField() {
        Map<String, Object> student = new HashMap<>(testCases("after_period_2").get(0).get("input"));
        student.remove("failures");

        assertThrows(IllegalArgumentException.class, () -> service.predict(student));
    }

    @Test
    void rejectsUnknownTextValue() {
        Map<String, Object> student = new HashMap<>(testCases("after_period_2").get(0).get("input"));
        student.put("Mjob", "pilot");

        assertThrows(IllegalArgumentException.class, () -> service.predict(student));
    }

    @Test
    void rejectsSecondGradeWithoutFirst() {
        Map<String, Object> student = new HashMap<>(testCases("after_period_2").get(0).get("input"));
        student.remove("G1");

        assertThrows(IllegalArgumentException.class, () -> service.predict(student));
    }
}
