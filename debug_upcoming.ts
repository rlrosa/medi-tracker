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

  console.log('--- DEBUG UPCOMING ---');
  medications.forEach(med => {
    console.log(`\nMed: ${med.name}`);
    med.schedules.forEach(schedule => {
      console.log(`  Sch: ${schedule.name} (Interval: ${schedule.intervalHours}h)`);
      const lastLog = med.logs.find(log => log.scheduleId === schedule.id);
      if (lastLog) {
        console.log(`    Last Log AdministeredAt: ${lastLog.administeredAt.toISOString()}`);
        console.log(`    Last Log ScheduledAt: ${lastLog.scheduledAt?.toISOString()}`);
      } else {
        console.log(`    No last log for this schedule.`);
      }

      let nextDue: Date | null = null;
      if (lastLog && schedule.intervalHours) {
        const baseTime = lastLog.scheduledAt ? new Date(lastLog.scheduledAt) : new Date(lastLog.administeredAt);
        nextDue = new Date(baseTime.getTime() + schedule.intervalHours * 60 * 60 * 1000);
        console.log(`    Calculated NextDue (base + interval): ${nextDue.toISOString()}`);
      } else {
        nextDue = schedule.startDate ? new Date(schedule.startDate) : now;
        console.log(`    Calculated NextDue (start or now): ${nextDue.toISOString()}`);
      }

      // Lookback logic
      if (schedule.intervalHours && nextDue) {
        while (nextDue.getTime() < lookbackLimit.getTime()) {
          nextDue = new Date(nextDue.getTime() + schedule.intervalHours * 60 * 60 * 1000);
        }
        console.log(`    NextDue after Lookback: ${nextDue.toISOString()}`);
      }

      let currentDue = nextDue ? new Date(nextDue) : null;
      while (currentDue && currentDue <= futureLimit) {
        console.log(`    Projected Dose At: ${currentDue.toISOString()} (Overdue: ${currentDue < now})`);
        // Check if this specific instance is already in logs
        const isAlreadyLogged = med.logs.some(l => 
          l.scheduleId === schedule.id && 
          l.scheduledAt && 
          Math.abs(new Date(l.scheduledAt).getTime() - currentDue!.getTime()) < 1000
        );
        console.log(`      Already Logged: ${isAlreadyLogged}`);
        
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
