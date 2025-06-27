#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting deployment process...');

// Run this script from the project root
const projectRoot = process.cwd();
const migrationPath = path.join(projectRoot, 'prisma/migrations/20230803_add_aggregations.sql');

try {
  // Step 1: Run Prisma migrations
  console.log('Running Prisma migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  // Step 2: Check if our pre-aggregation migrations exist and apply them
  if (fs.existsSync(migrationPath)) {
    console.log('Applying pre-aggregation SQL migrations...');
    
    // Get database URL from environment or use default
    const dbUrl = process.env.DATABASE_URL || '';
    
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    // Apply SQL script directly
    execSync(`npx prisma db execute --file ${migrationPath}`, { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    console.log('Pre-aggregation SQL migrations applied successfully');
  } else {
    console.log('No pre-aggregation SQL migrations found, skipping...');
  }
  
  // Step 3: Run initial data aggregation
  console.log('Running initial data aggregation...');
  
  try {
    // Get the base URL from environment variable or default to localhost for local deployment
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    console.log(`Using base URL: ${baseUrl} for API calls`);
    
    // Hit the API endpoint to refresh aggregations
    // Using curl as it's typically available in deployment environments
    execSync(`curl -s ${baseUrl}/api/maintenance/refresh-aggregations`, {
      stdio: 'inherit'
    });
    
    console.log('Initial data aggregation completed successfully');
  } catch (error) {
    console.warn('Warning: Failed to run initial data aggregation. This may need to be run manually.');
    console.warn('Error:', error.message);
  }
  
  // Step 4: Build the Next.js application
  console.log('Building Next.js application...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('Starting post-deploy script...');
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  
  console.log(`Using base URL: ${baseUrl}`);
  
  try {
    console.log('Calling the stats update endpoint...');
    execSync(`curl -s -X POST ${baseUrl}/api/admin/trigger-stats-update`, {
      stdio: 'inherit',
      timeout: 120000 // 2 minute timeout
    });
    console.log('Successfully called the stats update endpoint.');
  } catch (error) {
    console.warn('Warning: Failed to call the stats update endpoint.');
    console.warn('Error:', error.message);
  }
  
  console.log('Deployment process completed successfully!');
} catch (error) {
  console.error('Deployment failed:', error.message);
  process.exit(1);
} 