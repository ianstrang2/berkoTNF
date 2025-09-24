# Batch Migration Script - Standardized Updates

## 🎯 STANDARD PATTERN FOR ALL ROUTES

### Step 1: Add Multi-Tenant Imports
```typescript
// Add to all route files
import { createTenantPrisma } from '@/lib/tenantPrisma';
import { getCurrentTenantId } from '@/lib/tenantContext';
```

### Step 2: Add Tenant Context Setup
```typescript
// Add at start of each async function
const tenantId = getCurrentTenantId();
const tenantPrisma = createTenantPrisma(tenantId);
```

### Step 3: Replace Direct Prisma Queries
```typescript
// Replace: await prisma.tableName.operation()
// With:    await tenantPrisma.tableName.operation()
```

### Step 4: Add Tenant Filtering to Raw Queries
```typescript
// Replace: WHERE condition
// With:    WHERE condition AND tenant_id = ${tenantId}
```

## 📋 SYSTEMATIC BATCH UPDATES

### Files Using Standard Pattern (Can be batch updated):
1. Statistics routes with aggregated table queries
2. Season management routes
3. Player data routes
4. Configuration routes
5. Utility routes

### Files Needing Custom Logic (Require individual attention):
1. Complex transaction routes
2. Cross-table join routes
3. Raw SQL query routes
4. Cache invalidation routes

## 🚀 EXECUTION STRATEGY

I'll update files in groups using the standard pattern, then handle special cases individually.

**Target**: Complete all ~35 remaining files systematically
**Approach**: Batch standard updates, individual complex updates
**Safety**: Preserve all existing logic while adding tenant awareness
