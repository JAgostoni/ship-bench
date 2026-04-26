import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';

const prisma = new PrismaClient();

async function setupTestDb() {
  const testDbPath = path.resolve(__dirname, '../../test.db');
  
  // Update environment variable so that NEW Prisma clients use the test db
  process.env.DATABASE_URL = `file:${testDbPath}`;

  console.log('Running migrations on test database...');
  execSync('npx prisma migrate deploy');

  // Seed basic data using a fresh client to ensure it uses the updated DATABASE_URL
  const testPrisma = new PrismaClient();
  try {
    await testPrisma.user.upsert({
      where: { email: 'test-user@example.com' },
      update: {},
      create: {
        id: 'test-user',
        name: 'Test User',
        email: 'test-user@example.com',
      },
    });
    
    // Also seed a default article for Journey 1
    await testPrisma.article.upsert({
      where: { slug: 'next.js' },
      update: {},
      create: {
        title: 'Next.js',
        content: 'Next.js is a React framework.',
        slug: 'next.js',
        authorId: 'test-user',
      },
    });
  } finally {
    await testPrisma.$disconnect();
  }
}

export { setupTestDb };