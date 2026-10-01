import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MlClient } from '../ml/ml.client.js';
import { Student } from './student.entity.js';
import { StudentsController } from './students.controller.js';
import { StudentsService } from './students.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Student])],
  controllers: [StudentsController],
  providers: [StudentsService, MlClient],
  exports: [StudentsService],
})
export class StudentsModule {}
