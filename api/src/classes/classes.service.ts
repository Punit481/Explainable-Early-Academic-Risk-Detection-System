import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentsService } from '../students/students.service.js';
import { Classroom } from './classroom.entity.js';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Classroom) private readonly classrooms: Repository<Classroom>,
    private readonly studentsService: StudentsService,
  ) {}

  /** The teacher's classes, each with how many Low / Medium / High risk students it has. */
  async findAll(teacherId: number) {
    const classes = await this.classrooms.find({ where: { teacherId }, order: { id: 'ASC' } });
    const counts = await this.studentsService.countByRiskLevel(classes.map((c) => c.id));
    return classes.map((c) => ({ id: c.id, name: c.name, riskCounts: counts.get(c.id) }));
  }

  async create(teacherId: number, name: string) {
    const classroom = await this.classrooms.save({ teacherId, name });
    return { id: classroom.id, name: classroom.name };
  }

  /** One class with its students, highest risk first. */
  async findOneWithStudents(teacherId: number, id: number) {
    const classroom = await this.findOwned(teacherId, id);
    const students = await this.studentsService.findByClass(id);
    return { id: classroom.id, name: classroom.name, students };
  }

  async uploadCsv(teacherId: number, id: number, csvText: string) {
    await this.findOwned(teacherId, id);
    return this.studentsService.importCsv(id, csvText);
  }

  /** 404 both when the class doesn't exist and when it belongs to another teacher. */
  private async findOwned(teacherId: number, id: number): Promise<Classroom> {
    const classroom = await this.classrooms.findOneBy({ id, teacherId });
    if (!classroom) {
      throw new NotFoundException('Class not found');
    }
    return classroom;
  }
}
