import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createDatabase } from '../src/server/db/create';

const file = process.env.DATABASE_FILE ?? './data/kb.db';
const dir = './data/backups';
mkdirSync(dir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = join(dir, `kb-${stamp}.db`);

const { sqlite } = createDatabase(file);
sqlite.exec(`VACUUM INTO '${target.replace(/\\/g, '/')}'`);
sqlite.close();

console.log('Backup written to', target);
