import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service.js';

// Request bodies. The global ValidationPipe checks these rules and returns 400 if they fail.
class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @MinLength(8)
  password: string;
}

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.name, body.password);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }
}
