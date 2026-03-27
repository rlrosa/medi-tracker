import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const accountId = 'cmn75kwb80000qyel999z7gdv'; // RR's account
  
  const medications = await prisma.medication.findMany({
    where: { patient: { accountId } },
    include: { patient: true, schedules: true, logs: { orderBy: { administeredAt: 'desc' }, take: 20 } }
  });

  const now = new Date();
  const startDate = now;
  const lookbackLimit = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
  const futureLimit = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

  console.log('--- VERIFY UPCOMING FIX (ANCHORED) ---');
  medications.forEach(med => {
    med.schedules.forEach(schedule => {
      // ANCHOR to createdAt for consistency
      let currentDue = schedule.startDate ? new Date(schedule.startDate) : new Date(schedule.createdAt);
      
      if (schedule.intervalHours) {
        while (currentDue.getTime() < lookbackLimit.getTime()) {
          currentDue = new Date(currentDue.getTime() + schedule.intervalHours * 60 * 60 * 1000);
        }
      }

      console.log(`\nMed: ${med.name} | Sch: ${schedule.name} | Anchor: ${schedule.createdAt.toISOString()}`);
      while (currentDue && currentDue <= futureLimit) {
        const isAlreadyLogged = med.logs.some(l => {
          const sameSchedule = l.scheduleId === schedule.id;
          if (!sameSchedule) return false;
          if (l.scheduledAt && Math.abs(new Date(l.scheduledAt).getTime() - currentDue!.getTime()) < (2 * 60 * 1000)) return true;
          const administeredAt = new Date(l.administeredAt).getTime();
          const scheduledAt = currentDue!.getTime();
          const marginMs = (schedule.marginMinutes || 60) * 60 * 1000;
          return Math.abs(administeredAt - scheduledAt) < marginMs;
        });

        if (currentDue >= lookbackLimit && currentDue <= futureLimit) {
             console.log(`  Dose: ${currentDue.toISOString()} | Overdue: ${currentDue < now} | Already Logged: ${isAlreadyLogged}`);
        }
        
        if (schedule.intervalHours) {
          currentDue = new Date(currentDue.getTime() + schedule.intervalHours * 60 * 60 * 1000);
        } else {
          break;
        }
      }
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
