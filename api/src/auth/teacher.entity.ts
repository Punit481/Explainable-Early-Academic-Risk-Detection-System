import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Teacher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  // Never the password itself, only its bcrypt hash
  @Column()
  passwordHash: string;
}
