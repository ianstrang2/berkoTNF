/**
 * Database Migration Runner
 * 
 * This script runs the multi-tenancy migrations in the correct order.
 * It's designed to be safe and idempotent - you can run it multiple times.
 * 
 * Usage:
 *   node scripts/run-migrations.js
 *   
 * Or with specific migration:
 *   node scripts/run-migrations.js 001
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Database connection details from environment
const DATABASE_URL = process.env.DATABASE_URL;
const DIRECT_URL = process.env.DIRECT_URL || DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

// Migration files in execution order
const MIGRATIONS = [
  '001_add_multi_tenancy.sql',
  '002_update_unique_constraints.sql',
  '003_update_sql_functions_multi_tenant.sql'
];

/**
 * Execute a SQL file against the database
 */
async function executeSqlFile(filePath) {
  return new Promise((resolve, reject) => {
    const command = `psql "${DIRECT_URL}" -f "${filePath}"`;
    
    console.log(`📁 Executing: ${path.basename(filePath)}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error executing ${filePath}:`);
        console.error(stderr || error.message);
        reject(error);
        return;
      }
      
      console.log(`✅ Successfully executed: ${path.basename(filePath)}`);
      if (stdout) {
        console.log(stdout);
      }
      
      resolve(stdout);
    });
  });
}

/**
 * Check if a migration file exists
 */
function migrationExists(fileName) {
  const filePath = path.join(__dirname, '..', 'sql', 'migrations', fileName);
  return fs.existsSync(filePath);
}

/**
 * Run a specific migration by number
 */
async function runSpecificMigration(migrationNumber) {
  const paddedNumber = migrationNumber.padStart(3, '0');
  const migration = MIGRATIONS.find(m => m.startsWith(paddedNumber));
  
  if (!migration) {
    console.error(`❌ Migration ${paddedNumber} not found`);
    process.exit(1);
  }
  
  const filePath = path.join(__dirname, '..', 'sql', 'migrations', migration);
  
  if (!migrationExists(migration)) {
    console.error(`❌ Migration file not found: ${filePath}`);
    process.exit(1);
  }
  
  try {
    await executeSqlFile(filePath);
    console.log(`🎉 Migration ${migration} completed successfully`);
  } catch (error) {
    console.error(`💥 Migration ${migration} failed`);
    process.exit(1);
  }
}

/**
 * Run all migrations in order
 */
async function runAllMigrations() {
  console.log('🚀 Starting multi-tenancy migrations...');
  console.log(`🔗 Database: ${DATABASE_URL.split('@')[1] || 'localhost'}`);
  console.log('');
  
  for (const migration of MIGRATIONS) {
    const filePath = path.join(__dirname, '..', 'sql', 'migrations', migration);
    
    if (!migrationExists(migration)) {
      console.error(`❌ Migration file not found: ${filePath}`);
      console.error('Please ensure all migration files are present in sql/migrations/');
      process.exit(1);
    }
    
    try {
      await executeSqlFile(filePath);
    } catch (error) {
      console.error(`💥 Migration failed: ${migration}`);
      console.error('Migration process stopped. Please fix the error and try again.');
      process.exit(1);
    }
  }
  
  console.log('');
  console.log('🎉 All migrations completed successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Update your Prisma schema: npx prisma db pull');
  console.log('2. Generate Prisma client: npx prisma generate');
  console.log('3. Test the application to ensure multi-tenancy is working');
}

/**
 * Validate database connection
 */
async function validateConnection() {
  return new Promise((resolve, reject) => {
    const command = `psql "${DIRECT_URL}" -c "SELECT 1 as test;"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Database connection failed:');
        console.error(stderr || error.message);
        console.error('');
        console.error('Please check:');
        console.error('- DATABASE_URL environment variable is correct');
        console.error('- Database server is running');
        console.error('- Credentials are valid');
        reject(error);
        return;
      }
      
      console.log('✅ Database connection successful');
      resolve();
    });
  });
}

/**
 * Main execution function
 */
async function main() {
  try {
    // Validate database connection first
    await validateConnection();
    
    // Check if specific migration requested
    const specificMigration = process.argv[2];
    
    if (specificMigration) {
      await runSpecificMigration(specificMigration);
    } else {
      await runAllMigrations();
    }
    
  } catch (error) {
    console.error('💥 Migration process failed:', error.message);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n⏹️ Migration process interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️ Migration process terminated');
  process.exit(1);
});

// Run the migrations
main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
