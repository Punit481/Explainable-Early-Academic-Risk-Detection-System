// Used only by the TypeORM command line (npm run migration:generate), which compares
// the entity classes with the real database and writes the SQL needed to match them.
import { DataSource } from 'typeorm';
import { Teacher } from './auth/teacher.entity.js';
import { Classroom } from './classes/classroom.entity.js';
import { migrations } from './migrations/index.js';
import { Student } from './students/student.entity.js';

try {
  process.loadEnvFile(); // reads .env (Node's built-in loader)
} catch {
  // No .env file: use the environment as it is
}

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Teacher, Classroom, Student],
  migrations,
});
