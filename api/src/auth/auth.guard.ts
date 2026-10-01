import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

type AuthenticatedRequest = Request & { teacherId: number };

/**
 * Protects a controller: the request must have "Authorization: Bearer <token>"
 * with a valid token from POST /auth/login. Stores the teacher's id on the request.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing login token');
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number }>(token);
      request.teacherId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired login token');
    }
    return true;
  }
}

/** Use in a guarded controller method: `@TeacherId() teacherId: number` */
export const TeacherId = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().teacherId,
);
