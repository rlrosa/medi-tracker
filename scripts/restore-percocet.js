const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const targetAccount = await prisma.account.findFirst({ where: { name: 'The Smith Household' } });
    if (!targetAccount) throw new Error('Target account not found');

    const targetPatient = await prisma.patient.findFirst({ 
      where: { name: 'Grandma Betty', accountId: targetAccount.id } 
    });
    if (!targetPatient) throw new Error('Target patient not found');

    console.log('Target Patient Found:', targetPatient.name, '(' + targetPatient.id + ')');

    // Update Percocet
    const updatedMed = await prisma.medication.update({
      where: { id: 'cmn65y5qd0001qybtm572jc7u' },
      data: { patientId: targetPatient.id }
    });

    console.log('SUCCESS: Percocet restored to', targetPatient.name);

    // Audit: Any others?
    const legacyMeds = await prisma.medication.findMany({
      where: { patient: { account: { name: 'Legacy Migrated Account' } } },
      include: { patient: true }
    });

    if (legacyMeds.length > 0) {
      console.log('Warning: Other medications still in legacy account:', legacyMeds.map(m => m.name));
    } else {
      console.log('No other medications found in legacy account.');
    }

  } catch (err) {
    console.error('Restoration Failed:', err.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}
run();
