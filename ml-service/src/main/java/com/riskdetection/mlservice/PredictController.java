package com.riskdetection.mlservice;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class PredictController {

    private final PredictionService predictionService;

    public PredictController(PredictionService predictionService) {
        this.predictionService = predictionService;
    }

    /** Takes one student's raw fields (same as model/test_cases.json "input") and returns the prediction. */
    @PostMapping("/predict")
    public PredictionResponse predict(@RequestBody Map<String, Object> student) {
        return predictionService.predict(student);
    }

    /** Missing fields, wrong types or unknown text values -> 400 with a readable message. */
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleBadInput(IllegalArgumentException e) {
        return Map.of("error", e.getMessage());
    }
}
