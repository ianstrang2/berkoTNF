// scripts/testRLS.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function countForTenant(tenantId: string) {
  // Make sure RLS context is set
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;

  const players = await prisma.players.count();
  const matches = await prisma.upcoming_matches.count();
  const pool = await prisma.match_player_pool.count();

  return { players, matches, pool };
}

async function main() {
  const tenantA = '00000000-0000-0000-0000-000000000001'; // Default tenant
  const tenantB = '00000000-0000-0000-0000-000000000002'; // Fake tenant

  console.log(`\n🔎 Testing RLS isolation...\n`);

  const aResults = await countForTenant(tenantA);
  console.log('Tenant A results:', aResults);

  const bResults = await countForTenant(tenantB);
  console.log('Tenant B results:', bResults);

  console.log(`\n✅ If Tenant B shows all zeros, RLS is working correctly!`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
