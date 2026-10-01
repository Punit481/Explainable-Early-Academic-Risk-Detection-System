import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Teacher } from '../auth/teacher.entity.js';

// Named Classroom because "class" is a reserved word in TypeScript
@Entity()
export class Classroom {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  teacherId: number;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher;
}
