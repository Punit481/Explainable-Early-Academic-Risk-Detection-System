import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsNotEmpty, IsString } from 'class-validator';
import { AuthGuard, TeacherId } from '../auth/auth.guard.js';
import { ClassesService } from './classes.service.js';

class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

@Controller('classes')
@UseGuards(AuthGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  findAll(@TeacherId() teacherId: number) {
    return this.classesService.findAll(teacherId);
  }

  @Post()
  create(@TeacherId() teacherId: number, @Body() body: CreateClassDto) {
    return this.classesService.create(teacherId, body.name);
  }

  @Get(':id')
  findOne(@TeacherId() teacherId: number, @Param('id', ParseIntPipe) id: number) {
    return this.classesService.findOneWithStudents(teacherId, id);
  }

  /** multipart/form-data with the CSV in a field called "file" (max 1 MB) */
  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 1_000_000 } }))
  upload(
    @TeacherId() teacherId: number,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Attach the CSV file as form field "file"');
    }
    return this.classesService.uploadCsv(teacherId, id, file.buffer.toString('utf8'));
  }
}
