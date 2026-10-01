import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { InvalidStudentDataError, MlClient, Prediction, StudentFeatures } from '../src/ml/ml.client.js';

/**
 * Runs the whole api against the real PostgreSQL database (docker compose up -d),
 * with a fake ml-service so the tests don't need Java running.
 */

// Fake ml-service: risk score depends only on G2 (G2 = 0 -> 100, G2 = 20 -> 0)
const fakeMlClient = {
  async predict(features: StudentFeatures): Promise<Prediction> {
    if (typeof features.G2 !== 'number') {
      throw new InvalidStudentDataError('Missing field: G2');
    }
    const riskScore = 100 - features.G2 * 5;
    return {
      riskProbability: riskScore / 100,
      riskScore,
      riskLevel: riskScore <= 30 ? 'Low' : riskScore <= 70 ? 'Medium' : 'High',
      anomaly: false,
      intervention: 'test intervention',
      topFactors: [{ feature: 'G2', value: features.G2, contribution: 1, effect: 'increases risk' }],
    };
  },
};

describe('api (e2e)', () => {
  let app: INestApplication;
  let api: ReturnType<typeof request>;
  let tokenA: string;
  let tokenB: string;
  let classId: number;
  let studentId: number;

  // Unique emails, so the tests can run again without clearing the database
  const run = Date.now();
  const teacherA = { email: `a-${run}@school.test`, name: 'Teacher A', password: 'password-a' };
  const teacherB = { email: `b-${run}@school.test`, name: 'Teacher B', password: 'password-b' };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MlClient)
      .useValue(fakeMlClient)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    api = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('auth', () => {
    it('registers teachers without returning the password hash', async () => {
      const res = await api.post('/auth/register').send(teacherA).expect(201);
      expect(res.body).toEqual({ id: expect.any(Number), email: teacherA.email, name: 'Teacher A' });

      await api.post('/auth/register').send(teacherB).expect(201);
    });

    it('rejects a duplicate email and invalid input', async () => {
      await api.post('/auth/register').send(teacherA).expect(409);
      await api.post('/auth/register').send({ email: 'not-an-email', name: 'X', password: 'short' }).expect(400);
    });

    it('logs in with the right password only', async () => {
      await api.post('/auth/login').send({ email: teacherA.email, password: 'wrong-password' }).expect(401);

      const res = await api.post('/auth/login').send(teacherA).expect(200);
      expect(res.body).toEqual({
        accessToken: expect.any(String),
        teacher: { name: 'Teacher A', email: teacherA.email },
      });
      tokenA = res.body.accessToken;
      tokenB = (await api.post('/auth/login').send(teacherB).expect(200)).body.accessToken;
    });

    it('rejects requests without a valid token', async () => {
      await api.get('/classes').expect(401);
      await api.get('/classes').set('Authorization', 'Bearer not-a-real-token').expect(401);
    });
  });

  describe('classes and CSV upload', () => {
    it('creates a class', async () => {
      await api.post('/classes').auth(tokenA, { type: 'bearer' }).send({}).expect(400);

      const res = await api.post('/classes').auth(tokenA, { type: 'bearer' }).send({ name: '10-A' }).expect(201);
      classId = res.body.id;
    });

    it('imports valid rows and reports invalid ones', async () => {
      const csv = 'name;G1;G2\n"Low Risk";15;18\n"High Risk";5;4\n"Missing G2";10;\n';

      const res = await api
        .post(`/classes/${classId}/upload`)
        .auth(tokenA, { type: 'bearer' })
        .attach('file', Buffer.from(csv), 'class.csv')
        .expect(201);

      expect(res.body).toEqual({ imported: 2, errors: [{ line: 4, message: 'Missing field: G2' }] });
    });

    it('rejects an upload without a file or without a name column', async () => {
      await api.post(`/classes/${classId}/upload`).auth(tokenA, { type: 'bearer' }).expect(400);
      await api
        .post(`/classes/${classId}/upload`)
        .auth(tokenA, { type: 'bearer' })
        .attach('file', Buffer.from('G1,G2\n10,10\n'), 'class.csv')
        .expect(400);
    });

    it('lists the class students highest risk first', async () => {
      const res = await api.get(`/classes/${classId}`).auth(tokenA, { type: 'bearer' }).expect(200);

      expect(res.body.name).toBe('10-A');
      expect(res.body.students.map((s: { name: string }) => s.name)).toEqual(['High Risk', 'Low Risk']);
      expect(res.body.students[0]).toMatchObject({ riskScore: 80, riskLevel: 'High' });
      studentId = res.body.students[0].id;
    });

    it('counts students per risk level', async () => {
      const res = await api.get('/classes').auth(tokenA, { type: 'bearer' }).expect(200);

      expect(res.body).toEqual([{ id: classId, name: '10-A', riskCounts: { Low: 1, Medium: 0, High: 1 } }]);
    });
  });

  describe('students', () => {
    it('returns one student with their features and SHAP factors', async () => {
      const res = await api.get(`/students/${studentId}`).auth(tokenA, { type: 'bearer' }).expect(200);

      expect(res.body).toMatchObject({ name: 'High Risk', features: { G1: 5, G2: 4 }, riskScore: 80 });
      expect(res.body.topFactors).toHaveLength(1);
    });

    it('what-if returns a new prediction without saving it', async () => {
      const res = await api
        .post(`/students/${studentId}/what-if`)
        .auth(tokenA, { type: 'bearer' })
        .send({ G2: 16 })
        .expect(200);
      expect(res.body).toMatchObject({ riskScore: 20, riskLevel: 'Low' });

      const saved = await api.get(`/students/${studentId}`).auth(tokenA, { type: 'bearer' }).expect(200);
      expect(saved.body).toMatchObject({ riskScore: 80, features: { G2: 4 } });
    });

    it('what-if passes ml-service validation errors back as 400', async () => {
      await api
        .post(`/students/${studentId}/what-if`)
        .auth(tokenA, { type: 'bearer' })
        .send({ G2: 'lots' })
        .expect(400);
    });
  });

  describe("another teacher's data", () => {
    it('is not visible (404, as if it did not exist)', async () => {
      await api.get(`/classes/${classId}`).auth(tokenB, { type: 'bearer' }).expect(404);
      await api.get(`/students/${studentId}`).auth(tokenB, { type: 'bearer' }).expect(404);
      await api.post(`/students/${studentId}/what-if`).auth(tokenB, { type: 'bearer' }).send({}).expect(404);
      await api
        .post(`/classes/${classId}/upload`)
        .auth(tokenB, { type: 'bearer' })
        .attach('file', Buffer.from('name;G2\nX;10\n'), 'class.csv')
        .expect(404);

      const res = await api.get('/classes').auth(tokenB, { type: 'bearer' }).expect(200);
      expect(res.body).toEqual([]);
    });
  });
});
