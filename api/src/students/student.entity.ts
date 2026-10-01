import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Classroom } from '../classes/classroom.entity.js';
import type { ShapFactor, StudentFeatures } from '../ml/ml.client.js';

@Entity()
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  classroomId: number;

  @ManyToOne(() => Classroom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classroomId' })
  classroom: Classroom;

  // The raw dataset fields, passed as they are to ml-service (which validates them)
  @Column({ type: 'jsonb' })
  features: StudentFeatures;

  // Latest prediction from ml-service
  @Column({ type: 'double precision' })
  riskProbability: number;

  @Column({ type: 'double precision' })
  riskScore: number;

  @Column()
  riskLevel: string;

  @Column()
  anomaly: boolean;

  @Column()
  intervention: string;

  @Column({ type: 'jsonb' })
  topFactors: ShapFactor[];

  @Column({ type: 'timestamptz' })
  predictedAt: Date;
}
