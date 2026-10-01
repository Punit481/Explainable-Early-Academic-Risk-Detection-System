import { InitialSchema1790883458391 } from './1790883458391-InitialSchema.js';
import { AddStudentStage1790885538031 } from './1790885538031-AddStudentStage.js';

// Every migration, oldest first. Add each new one here after generating it
// (npm run migration:generate -- src/migrations/<Name>). The api runs any that
// haven't run yet when it starts.
export const migrations = [InitialSchema1790883458391, AddStudentStage1790885538031];
