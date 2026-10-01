import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InvalidStudentDataError, MlClient, StudentFeatures } from '../ml/ml.client.js';
import { parseStudentCsv } from './csv-parser.js';
import { Student } from './student.entity.js';

export interface RiskCounts {
  Low: number;
  Medium: number;
  High: number;
}

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student) private readonly students: Repository<Student>,
    private readonly ml: MlClient,
  ) {}

  /** Students of one class for the dashboard table, highest risk first. */
  findByClass(classroomId: number) {
    return this.students.find({
      select: {
        id: true,
        name: true,
        stage: true,
        riskScore: true,
        riskLevel: true,
        anomaly: true,
        intervention: true,
      },
      where: { classroomId },
      order: { riskScore: 'DESC' },
    });
  }

  /** How many Low / Medium / High students each class has. */
  async countByRiskLevel(classroomIds: number[]): Promise<Map<number, RiskCounts>> {
    const counts = new Map<number, RiskCounts>();
    for (const id of classroomIds) {
      counts.set(id, { Low: 0, Medium: 0, High: 0 });
    }
    if (classroomIds.length === 0) {
      return counts;
    }

    const rows: { classroomId: number; riskLevel: keyof RiskCounts; count: string }[] = await this.students
      .createQueryBuilder('student')
      .select('student.classroomId', 'classroomId')
      .addSelect('student.riskLevel', 'riskLevel')
      .addSelect('COUNT(*)', 'count')
      .where({ classroomId: In(classroomIds) })
      .groupBy('student.classroomId')
      .addGroupBy('student.riskLevel')
      .getRawMany();

    for (const row of rows) {
      counts.get(row.classroomId)![row.riskLevel] = Number(row.count);
    }
    return counts;
  }

  /** One student, only if they are in one of this teacher's classes. */
  async findOne(teacherId: number, id: number): Promise<Student> {
    const student = await this.students.findOne({ where: { id, classroom: { teacherId } } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return student;
  }

  /**
   * Predicts every row of the CSV and saves the valid ones to the class.
   * Rows ml-service rejects are reported back instead of stopping the upload.
   * If ml-service is down, nothing is saved.
   */
  async importCsv(classroomId: number, csvText: string) {
    const newStudents: Partial<Student>[] = [];
    const errors: { line: number; message: string }[] = [];

    for (const row of parseStudentCsv(csvText)) {
      if (!row.name) {
        errors.push({ line: row.line, message: 'Missing name' });
        continue;
      }
      try {
        const prediction = await this.ml.predict(row.features);
        newStudents.push({
          classroomId,
          name: row.name,
          features: row.features,
          ...prediction,
          predictedAt: new Date(),
        });
      } catch (error) {
        if (!(error instanceof InvalidStudentDataError)) {
          throw error;
        }
        errors.push({ line: row.line, message: error.message });
      }
    }

    await this.students.save(newStudents);
    return { imported: newStudents.length, errors };
  }

  /** "What if this student had these values?" Returns a new prediction without saving it. */
  async whatIf(teacherId: number, id: number, changes: StudentFeatures) {
    const student = await this.findOne(teacherId, id);
    return this.ml.predict({ ...student.features, ...changes });
  }
}
