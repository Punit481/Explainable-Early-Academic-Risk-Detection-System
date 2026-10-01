import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { Teacher } from './teacher.entity.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    private readonly jwt: JwtService,
  ) {}

  async register(email: string, name: string, password: string) {
    if (await this.teachers.existsBy({ email })) {
      throw new ConflictException('An account with this email already exists');
    }
    const teacher = await this.teachers.save({
      email,
      name,
      passwordHash: await hash(password, 10),
    });
    return { id: teacher.id, email: teacher.email, name: teacher.name };
  }

  async login(email: string, password: string) {
    const teacher = await this.teachers.findOneBy({ email });
    // Same message for "no such email" and "wrong password", so emails can't be guessed
    if (!teacher || !(await compare(password, teacher.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const accessToken = await this.jwt.signAsync({ sub: teacher.id });
    return { accessToken };
  }
}
