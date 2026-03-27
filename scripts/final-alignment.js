const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function run() {
  let retries = 5;
  while (retries > 0) {
    try {
      console.log('Attempting to connect to DB... (Retries left: ' + retries + ')');
      await prisma.$connect();
      console.log('CONNECTED successfully.');
      break;
    } catch (err) {
      console.log('Connection failed:', err.message);
      retries--;
      if (retries === 0) throw err;
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  try {
    // 1. Identify Authoritative Account
    const account = await prisma.account.findFirst({ where: { name: 'Rodri & Mari Account' } });
    if (!account) throw new Error('Rodri & Mari Account NOT found. This is unexpected.');
    console.log('Authoritative Account Found:', account.id);

    // 2. Identify/Verify Patient gabi
    const gabi = await prisma.patient.findFirst({ where: { name: 'gabi', accountId: account.id } });
    if (!gabi) throw new Error('Patient gabi NOT found in Rodri & Mari Account.');
    console.log('Authoritative Patient Found:', gabi.id);

    // 3. Re-map ALL medications to gabi
    const medUpdate = await prisma.medication.updateMany({
      data: { patientId: gabi.id }
    });
    console.log('Migrated', medUpdate.count, 'medications to patient gabi.');

    // 4. Create/Verify Users rr and mari
    const passwordHash = await bcrypt.hash('1234', 10);
    
    for (const uInfo of [{username: 'rr', role: 'ADMIN'}, {username: 'mari', role: 'USER'}]) {
      const existing = await prisma.user.findFirst({ 
        where: { OR: [{ username: uInfo.username }, { name: uInfo.username }] } 
      });

      if (!existing) {
        console.log('Creating user:', uInfo.username);
        await prisma.user.create({
          data: {
            username: uInfo.username,
            name: uInfo.username,
            passwordHash,
            role: uInfo.role,
            accountId: account.id
          }
        });
      } else {
        console.log('User already exists:', uInfo.username, 'Updating to correct account/role.');
        await prisma.user.update({
          where: { id: existing.id },
          data: { accountId: account.id, role: uInfo.role, passwordHash }
        });
      }
    }

    // 5. Cleanup redundant accounts
    const otherAccounts = await prisma.account.findMany({
      where: { NOT: { id: account.id } }
    });
    for (const acc of otherAccounts) {
      console.log('Cleaning up redundant account:', acc.name);
      await prisma.account.delete({ where: { id: acc.id } }).catch(e => console.log('Could not delete', acc.name, e.message));
    }

    console.log('FINAL CONSOLIDATION COMPLETE.');

  } catch (err) {
    console.error('CRITICAL ERROR DURING CONSOLIDATION:', err.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

run();
