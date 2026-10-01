import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, TeacherId } from '../auth/auth.guard.js';
import type { StudentFeatures } from '../ml/ml.client.js';
import { StudentsService } from './students.service.js';

@Controller('students')
@UseGuards(AuthGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get(':id')
  findOne(@TeacherId() teacherId: number, @Param('id', ParseIntPipe) id: number) {
    return this.studentsService.findOne(teacherId, id);
  }

  /** Body: only the fields to change, e.g. { "absences": 2, "studytime": 3 } */
  @Post(':id/what-if')
  @HttpCode(200)
  whatIf(
    @TeacherId() teacherId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() changes: StudentFeatures,
  ) {
    return this.studentsService.whatIf(teacherId, id, changes);
  }
}
