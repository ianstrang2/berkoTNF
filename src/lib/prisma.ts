import { PrismaClient } from '@prisma/client'

// Create a custom type that extends the PrismaClient to include our new models
type CustomPrismaClient = PrismaClient & {
  app_config: any;
  app_config_defaults: any;
  team_size_templates: any;
  team_size_templates_defaults: any;
  team_balance_weights: any;
  team_balance_weights_defaults: any;
  upcoming_matches: any;
  upcoming_match_players: any;
  aggregated_season_stats: any;
  aggregated_recent_performance: any;
};

// Initialize Prisma client with debug logging
const prismaClientSingleton = () => {
  // Enable logging to see more details about Prisma operations
  const client = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });
  
  // Log available models to check if our defaults tables are recognized
  console.log('Prisma client models:', Object.keys(client));
  
  // Try to access one of the defaults tables directly
  client.$queryRaw`SELECT * FROM app_config_defaults LIMIT 1`
    .then((result) => console.log('Direct SQL query result:', result))
    .catch((error) => console.error('Direct SQL query error:', error));
  
  return client as CustomPrismaClient;
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Clear any cached Prisma client to ensure we use the new one with logging
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = undefined;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;