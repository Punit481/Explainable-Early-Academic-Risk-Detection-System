import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { ClassesModule } from './classes/classes.module.js';
import { migrations } from './migrations/index.js';
import { StudentsModule } from './students/students.module.js';

@Module({
  imports: [
    // Reads .env (DATABASE_URL, JWT_SECRET, ML_SERVICE_URL)
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        // Tables are created and changed only by migrations (src/migrations),
        // which run automatically when the api starts.
        migrations,
        migrationsRun: true,
      }),
    }),
    AuthModule,
    ClassesModule,
    StudentsModule,
  ],
  providers: [
    // Checks every request body against its DTO rules; drops unknown fields
    { provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true }) },
  ],
})
export class AppModule {}
