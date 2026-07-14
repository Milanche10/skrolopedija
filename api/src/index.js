import cron from 'node-cron';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';
import { scanKnowledgeDir } from './services/scan.js';
import { collectForCategory } from './services/webCollect.js';
import { hasAI, aiStatus } from './lib/llm.js';

const PORT = Number(process.env.PORT) || 4000;

const app = createApp();

app.listen(PORT, '0.0.0.0', async () => {
  const ai = await aiStatus();
  console.log(
    `Skrolopedija API sluša na :${PORT} (AI: ${ai.provider}/${ai.model} — ${ai.ready ? 'spreman' : 'NIJE spreman'}${ai.note ? ' · ' + ai.note : ''}${ai.error ? ' · ' + ai.error : ''})`
  );

  // startni sken baze znanja — registruje nove fajlove; obradu pokreće samo ako je uključeno
  const autoProcess = process.env.AUTO_PROCESS_ON_STARTUP === 'true' && ai.ready;
  try {
    const result = await scanKnowledgeDir(autoProcess);
    if (result.error) console.warn(result.error);
    else
      console.log(
        `Baza znanja: ${result.scanned} fajlova, ${result.added.length} novih registrovano, ${result.existing} već poznato.` +
          (result.added.length && !autoProcess
            ? ' Obrada se pokreće dugmetom u adminu (ili AUTO_PROCESS_ON_STARTUP=true).'
            : '')
      );
  } catch (err) {
    console.error('Startni sken baze znanja pao:', err);
  }

  // opcioni dnevni cron za web-prikupljanje
  const cronExpr = process.env.DAILY_COLLECT_CRON;
  if (cronExpr && cron.validate(cronExpr)) {
    cron.schedule(cronExpr, async () => {
      console.log('Dnevno web-prikupljanje…');
      const cats = await prisma.category.findMany({ where: { isActive: true } });
      for (const cat of cats) {
        try {
          const cards = await collectForCategory(cat.id, 3);
          console.log(`  ${cat.label}: +${cards.length} kartica`);
        } catch (err) {
          console.warn(`  ${cat.label}: ${err.message}`);
        }
      }
    });
    console.log(`Dnevni cron za web-prikupljanje: ${cronExpr}`);
  }
});
