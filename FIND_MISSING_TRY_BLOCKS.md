# 🔍 Finding Missing Try Blocks - Pattern Guide

## 🚨 The Problem

Routes using `withTenantContext` that have `catch` blocks but are missing the opening `try {` block cause syntax errors:

```typescript
// ❌ BROKEN PATTERN
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    const data = await prisma.table.findMany({ ... });
    return NextResponse.json({ data });
  } catch (error: any) {  // ❌ No matching try!
    return NextResponse.json({ error: error.message }, { status: 500 });
  });
}
```

**Error Message:**
```
Error: × Expected ',', got 'catch'
```

---

## ✅ Search Command to Find All Instances

### **Step 1: Find all catch blocks in API routes**

```bash
grep -r "^\s{2}\} catch \(error" src/app/api --include="*.ts"
```

This finds files with catch blocks at the API route level (2-space indentation).

### **Step 2: Check each file manually**

For each file found, check if `withTenantContext` callback has `try {` immediately after:

**Good:**
```typescript
return withTenantContext(request, async (tenantId) => {
  try {  // ✅ Has try block
```

**Bad:**
```typescript
return withTenantContext(request, async (tenantId) => {
  const data = ...  // ❌ Missing try block
```

---

## ✅ The Correct Pattern

**Every route with error handling should follow this structure:**

```typescript
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      // All route logic here
      const data = await prisma.table.findMany({
        where: withTenantFilter(tenantId)
      });
      
      return NextResponse.json({ success: true, data });
    } catch (error: any) {
      console.error('Error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }
  }).catch(handleTenantError);
}
```

**Key Points:**
1. ✅ `try {` immediately after `async (tenantId) => {`
2. ✅ All code indented inside try block
3. ✅ `catch` at same level as `try`
4. ✅ `.catch(handleTenantError)` at the end

---

## 📋 Files Fixed in This Session

**Match Control Center Routes (8 files):**
1. `/admin/upcoming-matches/[id]/lock-pool/route.ts`
2. `/admin/upcoming-matches/[id]/confirm-teams/route.ts`
3. `/admin/upcoming-matches/[id]/complete/route.ts`
4. `/admin/upcoming-matches/[id]/unlock-pool/route.ts`
5. `/admin/upcoming-matches/[id]/unlock-teams/route.ts`
6. `/admin/upcoming-matches/[id]/undo/route.ts`
7. `/admin/upcoming-match-players/swap/route.ts`
8. `/admin/upcoming-match-players/route.ts` (GET, POST, PUT, DELETE)

**Additional Routes (1 file):**
9. `/admin/upcoming-matches/[id]/historical-data/route.ts` (new file)

---

## 🔧 How to Fix

For each broken file:

1. **Add `try {`** after the async callback:
   ```typescript
   return withTenantContext(request, async (tenantId) => {
     try {  // ← ADD THIS
   ```

2. **Indent all code** inside the try block (add 2 spaces)

3. **Keep catch block** at proper indentation:
   ```typescript
     } catch (error: any) {  // ← Same level as try
   ```

4. **Add `.catch(handleTenantError)`** at the end:
   ```typescript
   }).catch(handleTenantError);  // ← ADD THIS
   }
   ```

---

## 🎯 Prevention

**When writing new API routes, always use this template:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';
import { withTenantFilter } from '@/lib/tenantFilter';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      // Your code here
      
      return NextResponse.json({ success: true, data });
    } catch (error: any) {
      console.error('Error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }
  }).catch(handleTenantError);
}
```

---

## 📊 Impact of Fixes

**Before:**
- ❌ 9 routes with syntax errors
- ❌ Runtime failures when those endpoints were called
- ❌ Broken Match Control Center workflow

**After:**
- ✅ All routes compile successfully
- ✅ Full Match Control Center works end-to-end
- ✅ Proper error handling throughout

---

**Use this document to quickly find and fix similar issues in the future!** 🎯

