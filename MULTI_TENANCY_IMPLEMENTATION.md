# Multi-Tenancy Implementation Guide

## 🎯 Overview

This guide documents the multi-tenancy implementation for BerkoTNF. The implementation follows the specifications in `docs/SPEC_multi_tenancy.md` and introduces tenant isolation while preserving existing functionality.

## 📋 What Has Been Implemented

### ✅ Completed Components

1. **Database Schema Changes**
   - `tenants` table for organizational isolation
   - `tenant_id` columns added to all core tables
   - Tenant-scoped unique constraints
   - Multi-tenant performance indexes
   - Foreign key relationships for data integrity

2. **Core Infrastructure**
   - Tenant-aware advisory locks (`src/lib/tenantLocks.ts`)
   - Tenant-scoped Prisma wrapper (`src/lib/tenantPrisma.ts`)
   - Tenant context management (`src/lib/tenantContext.ts`)

3. **Database Migrations**
   - Safe, zero-downtime migration scripts
   - Automated backfill with default tenant
   - Constraint updates for tenant isolation

4. **API Route Updates**
   - Updated example routes to use tenant-aware queries
   - Preserved existing API contracts
   - Added tenant context resolution

5. **Migration Tools**
   - Automated migration runner script
   - Validation and rollback support

## 🚀 Getting Started

### Step 1: Apply Database Migrations

```bash
# Run the multi-tenancy migrations
node scripts/run-migrations.js

# Update Prisma schema from database
npx prisma db pull

# Generate new Prisma client
npx prisma generate
```

### Step 2: Update API Routes

The implementation provides a gradual migration path. Here's how to update existing routes:

#### Before (Single-tenant)
```typescript
export async function GET() {
  const players = await prisma.players.findMany({
    where: { is_retired: false }
  });
  return NextResponse.json({ data: players });
}
```

#### After (Multi-tenant)
```typescript
import { createTenantPrisma } from '@/lib/tenantPrisma';
import { getCurrentTenantId } from '@/lib/tenantContext';

export async function GET() {
  // Get tenant context
  const tenantId = getCurrentTenantId();
  const tenantPrisma = createTenantPrisma(tenantId);
  
  // Query is automatically scoped to tenant
  const players = await tenantPrisma.players.findMany({
    where: { is_retired: false }
  });
  return NextResponse.json({ data: players });
}
```

### Step 3: Using Tenant-Aware Locks

For operations requiring concurrency protection:

```typescript
import { withTenantMatchLock } from '@/lib/tenantLocks';

export async function updateMatch(tenantId: string, matchId: number) {
  return withTenantMatchLock(tenantId, matchId, async (tx) => {
    // All operations within this callback are:
    // 1. Within a database transaction
    // 2. Protected by a tenant-scoped advisory lock
    // 3. Isolated from other tenants
    
    const match = await tx.upcoming_matches.update({
      where: { upcoming_match_id: matchId },
      data: { is_balanced: true }
    });
    
    return match;
  });
}
```

## 🏗️ Architecture Details

### Default Tenant Strategy

The implementation uses a default tenant approach for backward compatibility:

- **Default Tenant ID**: `00000000-0000-0000-0000-000000000001`
- **Tenant Slug**: `berko-tnf`
- **Migration**: All existing data is assigned to the default tenant

This ensures that:
- Existing application functionality is preserved
- No data is lost during migration
- The system is immediately multi-tenant ready

### Tenant Context Resolution

Current implementation provides basic tenant context:

```typescript
// Current: Returns default tenant for backward compatibility
const tenantId = getCurrentTenantId();

// Future: Will support multiple resolution methods
// - Session-based (admin users)
// - Token-based (RSVP functionality)  
// - Header-based (API requests)
```

### Data Isolation

All database queries are automatically scoped to tenants:

```typescript
// This query will only return players from the current tenant
const players = await tenantPrisma.players.findMany();

// Raw queries must include tenant filtering
const results = await prisma.$queryRaw`
  SELECT * FROM players 
  WHERE tenant_id = ${tenantId}
`;
```

## 🔧 Key Files and Their Purpose

### Core Multi-Tenant Libraries

| File | Purpose |
|------|---------|
| `src/lib/tenantLocks.ts` | Tenant-aware advisory locks and utilities |
| `src/lib/tenantPrisma.ts` | Tenant-scoped Prisma wrapper |
| `src/lib/tenantContext.ts` | Tenant context management |

### Database Files

| File | Purpose |
|------|---------|
| `sql/migrations/001_add_multi_tenancy.sql` | Core multi-tenancy database changes |
| `sql/migrations/002_update_unique_constraints.sql` | Tenant-scoped constraint updates |
| `scripts/run-migrations.js` | Automated migration runner |

### Updated Schema

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Updated with tenant relationships and constraints |

### Example API Updates

| File | Purpose |
|------|---------|
| `src/app/api/upcoming/route.ts` | Public route with tenant awareness |
| `src/app/api/admin/players/route.ts` | Admin route with tenant scoping |

## 📊 Database Changes Summary

### New Tables

- **`tenants`**: Core tenant management
  - `tenant_id` (UUID, PK)
  - `slug` (unique identifier)
  - `name` (display name)
  - `is_active` (status flag)
  - `settings` (JSON configuration)

### Modified Tables

All core tables now include:
- `tenant_id UUID NOT NULL` column
- Foreign key to `tenants` table
- Updated unique constraints (tenant-scoped)
- Performance indexes with `tenant_id` leading

### Affected Tables

- `players` - Player management
- `upcoming_matches` - Match scheduling
- `match_player_pool` - RSVP functionality
- `upcoming_match_players` - Team assignments
- `matches` - Historical data
- `player_matches` - Performance data
- All `aggregated_*` tables - Statistics
- Configuration tables (`app_config`, `team_size_templates`, etc.)

## 🔒 Security & Isolation

### Data Isolation

- **Database Level**: Tenant ID required in all queries
- **Application Level**: Tenant-scoped Prisma wrapper
- **Lock Level**: Tenant-aware advisory locks

### Migration Safety

- **Zero Downtime**: Migrations designed for production safety
- **Rollback Support**: Each step has documented rollback procedures
- **Data Preservation**: All existing data migrated to default tenant

### Validation

- **Tenant Validation**: Helper functions to verify tenant existence
- **Context Validation**: Ensures valid tenant context in requests
- **Query Validation**: Automatic tenant scoping prevents cross-tenant access

## 🧪 Testing the Implementation

### Basic Tenant Functionality

```typescript
// Test tenant context
import { getCurrentTenantId, validateTenantId } from '@/lib/tenantContext';

const tenantId = getCurrentTenantId();
console.log('Current tenant:', tenantId);

const isValid = await validateTenantId(tenantId);
console.log('Tenant is valid:', isValid);
```

### Test Tenant Isolation

```typescript
// Test that queries are tenant-scoped
import { createTenantPrisma } from '@/lib/tenantPrisma';

const tenantPrisma = createTenantPrisma('00000000-0000-0000-0000-000000000001');
const players = await tenantPrisma.players.findMany();
console.log('Players in default tenant:', players.length);
```

### Test Advisory Locks

```typescript
// Test tenant-scoped locking
import { withTenantMatchLock } from '@/lib/tenantLocks';

await withTenantMatchLock('tenant-id', 123, async (tx) => {
  console.log('Operating within tenant-scoped lock');
  // Perform protected operations
});
```

## 🎯 Next Steps

### Immediate (Required for Production)

1. **Row Level Security (RLS)**
   - Implement RLS policies for database-level isolation
   - Add session context support for RLS

2. **Enhanced Tenant Resolution**
   - Session-based tenant detection for admin routes
   - Token-based tenant detection for RSVP routes

3. **Remaining Route Updates**
   - Update all remaining API routes to use tenant-aware queries
   - Add tenant context to background jobs

### Future Enhancements

1. **RSVP System Integration**
   - Token-based tenant resolution for public RSVP routes
   - Per-tenant RSVP configuration

2. **Authentication Integration**
   - User-based tenant assignment
   - Multi-tenant admin authentication

3. **Advanced Features**
   - Cross-tenant analytics (superadmin)
   - Tenant-specific branding and configuration

## ⚠️ Important Notes

### Backward Compatibility

- All existing functionality is preserved
- API contracts remain unchanged
- Default tenant ensures seamless operation

### Performance Considerations

- All indexes are optimized with `tenant_id` leading
- Query performance should be equivalent or better
- Advisory locks prevent cross-tenant contention

### Migration Validation

After applying migrations, verify:

```sql
-- Check that all tables have tenant_id
SELECT table_name 
FROM information_schema.columns 
WHERE column_name = 'tenant_id';

-- Verify default tenant exists
SELECT * FROM tenants WHERE slug = 'berko-tnf';

-- Check data integrity
SELECT 
  'players' as table_name,
  COUNT(*) as total_rows,
  COUNT(tenant_id) as rows_with_tenant
FROM players;
```

## 🆘 Troubleshooting

### Common Issues

1. **Migration Failures**
   - Check database permissions
   - Verify connection string
   - Review migration logs

2. **Query Errors**
   - Ensure tenant context is set
   - Check for missing tenant_id in WHERE clauses
   - Verify Prisma client is regenerated

3. **Performance Issues**
   - Check that tenant indexes are being used
   - Review query execution plans
   - Ensure proper tenant scoping

### Getting Help

- Review `docs/SPEC_multi_tenancy.md` for detailed specifications
- Check migration logs in database for any issues
- Test thoroughly in development before production deployment

---

This implementation provides a solid foundation for multi-tenancy while maintaining backward compatibility and preparing for future RSVP and authentication features.
