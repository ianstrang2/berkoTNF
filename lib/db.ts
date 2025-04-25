// Instead of creating a new Prisma client, we'll re-export the main one
// This ensures a single connection throughout the application
export { prisma } from '../src/lib/prisma'; 