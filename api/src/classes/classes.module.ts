import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsModule } from '../students/students.module.js';
import { ClassesController } from './classes.controller.js';
import { ClassesService } from './classes.service.js';
import { Classroom } from './classroom.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Classroom]), StudentsModule],
  controllers: [ClassesController],
  providers: [ClassesService],
})
export class ClassesModule {}
