import { prisma } from '../src/lib/prisma.js';
const r = await prisma.book.updateMany({ where: { status: 'processing' }, data: { status: 'failed', error: 'Prekinuto — biće ponovo obrađeno.' } });
console.log('Resetovano processing→failed:', r.count);
await prisma.$disconnect();
