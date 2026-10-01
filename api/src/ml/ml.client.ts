import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** One student's raw fields, e.g. { school: 'GP', age: 17, G1: 12, ... } */
export type StudentFeatures = Record<string, string | number>;

/** One feature's share of the prediction (SHAP value), as returned by ml-service. */
export interface ShapFactor {
  feature: string;
  value: string | number;
  contribution: number;
  effect: string;
}

/** What ml-service's POST /predict returns. */
export interface Prediction {
  stage: string;
  riskProbability: number;
  riskScore: number;
  riskLevel: string;
  anomaly: boolean;
  intervention: string;
  topFactors: ShapFactor[];
}

/** ml-service rejected the student's data (missing field, unknown value, ...). Becomes a 400. */
export class InvalidStudentDataError extends BadRequestException {}

/** The only code in the api that talks to ml-service. */
@Injectable()
export class MlClient {
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.getOrThrow<string>('ML_SERVICE_URL');
  }

  async predict(features: StudentFeatures): Promise<Prediction> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(features),
      });
    } catch {
      throw new ServiceUnavailableException('ml-service is not reachable');
    }

    if (response.status === 400) {
      const body = (await response.json()) as { error: string };
      throw new InvalidStudentDataError(body.error);
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(`ml-service returned ${response.status}`);
    }
    return (await response.json()) as Prediction;
  }
}
