import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createDatabase } from '../src/server/db/create';
import { seed } from '../src/server/db/seed';

const file = process.env.DATABASE_FILE ?? './data/kb.db';
mkdirSync(dirname(file), { recursive: true });

const { sqlite, db } = createDatabase(file);
seed(db);
sqlite.close();

console.log('Seeded', file);
