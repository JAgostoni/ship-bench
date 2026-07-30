import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  await prisma.article.deleteMany();
  await prisma.user.deleteMany();
  const passwordHash = await bcrypt.hash('password', 10);
  const user = await prisma.user.create({
    data: { username: 'admin', passwordHash },
  });
  const titles = ['First Article', 'Second Article', 'Third Article', 'Fourth Article', 'Fifth Article'];
  for (let i = 0; i < titles.length; i++) {
    await prisma.article.create({
      data: {
        title: titles[i],
        content: `Content for ${titles[i]}`,
        status: 'DRAFT',
        // authorId could be added later
      },
    });
  }
  console.log('Seeded');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
