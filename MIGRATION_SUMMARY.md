# Prisma Client Migration Summary

## Changes Made

1. Consolidated Prisma clients from two sources to a single source:
   - Removed direct instantiations of `PrismaClient` across the codebase
   - Made `src/lib/prisma.ts` the central Prisma client instance
   - Modified `lib/db.ts` to re-export the client from `src/lib/prisma.ts`
   - Updated imports in files that were using direct instantiations

2. Fixed initialization in `src/lib/prisma.ts`: 
   - Removed problematic direct SQL query during initialization that was failing in production

## Files Modified

1. **Main Prisma Files**:
   - `src/lib/prisma.ts` - Removed direct SQL query during initialization
   - `lib/db.ts` - Changed to re-export from main prisma client

2. **Stat Update Files**:
   - `src/lib/stats/matchReportHelpers.ts`
   - `src/lib/stats/updateAllTimeStats.ts`
   - `src/lib/stats/updateHalfAndFullSeasonStats.ts`
   - `src/lib/stats/updateRecentPerformance.ts`
   - `src/lib/stats/updateSeasonHonours.ts`

3. **Config Files**:
   - `src/lib/config.ts`

## Potential Issues to Watch For

1. **Database Connection Pool**:
   - The application now uses a single Prisma client which manages a single connection pool
   - This may affect performance characteristics compared to before, especially if the separate clients were handling different loads

2. **File Path Differences**:
   - We've replaced `../db` imports with `../prisma` imports
   - In some files in the `/lib` directory, you'll now import from `../src/lib/prisma` which is a relative import that crosses directory boundaries

3. **Type Compatibility**:
   - We've kept the `PrismaClient` import in files that use the type in function parameters
   - This might need adjustment if your project layout changes

4. **Transaction Handling**:
   - All stat update functions take an optional transaction parameter
   - Since they're now using the same client, this should work even better than before

## Testing Recommendations

1. Test the `/api/maintenance/refresh-aggregations` endpoint that was previously failing
2. Test all stat update functions in both local and production environments
3. Monitor database connection pool usage to ensure it's not being exhausted
4. If you use connection pooling services like PgBouncer, monitor those configurations

## Next Steps

If this consolidation resolves the issues, you might want to:

1. Consider adding better error handling in Prisma initialization
2. Review and standardize your project directory structure (the mix of `src/lib` and `lib` is unusual)
3. Consider adding proper health checks for database connectivity 