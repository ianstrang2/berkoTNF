# Phase 2 Testing Checklist

**Date:** 2025-01-08  
**Purpose:** Verify Prisma middleware is working correctly  
**Estimated Time:** 15-20 minutes

---

## ✅ Quick Verification (5 minutes)

### Test 1: Dev Server Starts Successfully

```bash
npm run dev
```

**Expected in logs:**
```
[PRISMA] Client initialized with RLS middleware
```

**✅ Pass if:** Server starts without errors

---

### Test 2: Middleware Logs Appear

Make any API request while logged in:

```bash
# Terminal 1: Watch logs
npm run dev

# Terminal 2: Make request
curl http://localhost:3000/api/players \
  -H "Cookie: [your-session-cookie]"
```

**Expected in logs:**
```
[PRISMA_MIDDLEWARE] Set RLS context: 00000000-0000-0000-0000-000000000001
```

**✅ Pass if:** You see middleware logs with correct tenant UUID

---

### Test 3: Both Tenants Work

1. **Login as BerkoTNF** (`07949251277`)
   - Navigate to `/admin/players`
   - **Expected:** See 82 players
   - **Check logs:** `Set RLS context: 00000000-0000-0000-0000-000000000001`

2. **Login as Poo Wanderers** (`07949222222`)
   - Navigate to `/admin/players` (or wherever players are displayed)
   - **Expected:** See 1 player
   - **Check logs:** `Set RLS context: 2cd8f68f-6389-4b54-9065-18ec447434e3`

**✅ Pass if:** Both tenants see only their own data

---

## 🔬 Detailed Verification (15 minutes)

### Test 4: Verify RLS Context in Database

Open Supabase SQL Editor and run:

```sql
-- Test 1: Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity as "RLS Enabled?"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('players', 'matches', 'tenants')
ORDER BY tablename;

-- Expected: All should be true
```

```sql
-- Test 2: Simulate middleware behavior
BEGIN;

-- Set context like middleware does
SELECT set_config('app.tenant_id', '00000000-0000-0000-0000-000000000001', true);

-- Check it was set
SELECT current_setting('app.tenant_id', true) as "Current Tenant";
-- Expected: 00000000-0000-0000-0000-000000000001

-- Test RLS enforcement
SELECT COUNT(*) as "BerkoTNF Players" FROM players;
-- Expected: 82

ROLLBACK;
```

```sql
-- Test 3: Verify RLS blocks without context
BEGIN;

-- Don't set context
SELECT COUNT(*) as "Should Be 0" FROM players;
-- Expected: 0 (RLS blocks access)

ROLLBACK;
```

**✅ Pass if:** All queries return expected results

---

### Test 5: Test Cross-Tenant Isolation

1. **Login as BerkoTNF** (`07949251277`)

2. **Make API request:**
   ```bash
   curl http://localhost:3000/api/players
   ```

3. **Check response:**
   - Player names should be BerkoTNF members only
   - Count should be 82
   - No "Poo Jones" in results

4. **Check logs:**
   ```
   [PRISMA_MIDDLEWARE] Set RLS context: 00000000-0000-0000-0000-000000000001
   ```

5. **Repeat for Poo Wanderers** (`07949222222`)
   - Should see 1 player only
   - Should NOT see any BerkoTNF players
   - Different tenant UUID in logs

**✅ Pass if:** No cross-tenant data visible

---

### Test 6: Test Middleware Without Context (Edge Case)

This test verifies that routes without `withTenantContext` still fail safely.

1. **Temporarily bypass the wrapper:**
   - Find a route using `withTenantContext`
   - Comment out the wrapper temporarily
   - Just call Prisma directly

2. **Make request:**
   ```bash
   curl http://localhost:3000/api/[your-route]
   ```

3. **Expected behavior:**
   - **Logs:** `[PRISMA_MIDDLEWARE] No tenant context - RLS may block query`
   - **Response:** Empty data or error
   - **Database:** Query returns 0 rows due to RLS

4. **Restore the wrapper** after testing

**✅ Pass if:** Middleware logs warning and RLS blocks access

---

### Test 7: Test Auth Flow Still Works

The auth flow uses cross-tenant lookup (service role), so it should NOT use middleware:

1. **Logout completely**

2. **Login with phone number:**
   ```
   Phone: 07949251277 (BerkoTNF)
   or
   Phone: 07949222222 (Poo Wanderers)
   ```

3. **Complete OTP verification**

4. **Expected:**
   - Login succeeds ✅
   - Redirected to dashboard ✅
   - No middleware logs for `/api/auth/link-by-phone` (uses service role)

**✅ Pass if:** Login works without middleware interference

---

## 📊 Performance Check

### Test 8: Verify Reasonable Performance

Make several API requests and check response times:

```bash
# Install httpie for better output (optional)
# brew install httpie

# Test API response time
time curl http://localhost:3000/api/players

# Repeat 5 times
for i in {1..5}; do
  time curl -s http://localhost:3000/api/players > /dev/null
done
```

**Expected overhead:**
- 2-3ms per query for middleware
- Total API response < 500ms (typical)

**✅ Pass if:** No significant performance degradation

---

## 🐛 Error Scenarios

### Test 9: Test Without Session (Should Fail Gracefully)

```bash
# Make request without authentication
curl http://localhost:3000/api/players

# Expected: 401 Unauthorized
```

**✅ Pass if:** Returns proper 401 error (not 500)

---

### Test 10: Test Invalid Tenant ID (Edge Case)

This shouldn't happen in normal operation, but let's verify graceful failure:

1. **Manually set invalid tenant in session** (via code or hack)
2. **Make API request**
3. **Expected:** Error handling catches it, returns 403 or 500

**✅ Pass if:** Doesn't crash, returns error response

---

## 🔍 Code Review Checklist

### Test 11: Verify Implementation

- [ ] **prisma.ts** has AsyncLocalStorage import
- [ ] **prisma.ts** has middleware with `client.$use()`
- [ ] **tenantContext.ts** has `withTenantContext` function
- [ ] **tenantContext.ts** has `withBackgroundTenantContext` function
- [ ] Middleware uses `$executeRawUnsafe` with `set_config`
- [ ] Middleware uses `true` parameter (transaction-local)
- [ ] Development logs are conditional (`if (process.env.NODE_ENV === 'development')`)

---

## ✅ Sign-Off Checklist

**Before marking Phase 2 complete:**

### Implementation
- [x] AsyncLocalStorage added to prisma.ts
- [x] Prisma middleware implemented
- [x] `withTenantContext` wrapper created
- [x] `withBackgroundTenantContext` helper created
- [x] Documentation complete

### Testing
- [ ] Dev server starts without errors
- [ ] Middleware logs appear in development
- [ ] BerkoTNF tenant works (82 players visible)
- [ ] Poo Wanderers tenant works (1 player visible)
- [ ] No cross-tenant data leaks
- [ ] Auth flow still works (login succeeds)
- [ ] RLS context set correctly in database
- [ ] Performance is acceptable
- [ ] Error handling works correctly

### Documentation
- [x] `PHASE2_PRISMA_MIDDLEWARE.md` created
- [x] `PHASE2_EXAMPLE_ROUTE_UPDATE.md` created
- [x] `PHASE2_TESTING_CHECKLIST.md` created
- [x] `PHASE_6_IMPLEMENTATION_STATUS.md` updated

---

## 🚀 When Tests Pass

**Phase 2 is complete when:**

1. All quick verification tests pass ✅
2. All detailed verification tests pass ✅
3. Both tenants work correctly ✅
4. Performance is acceptable ✅
5. Auth flow still works ✅

**Next steps:**

1. Optionally update 5-10 API routes to use new pattern
2. Test updated routes thoroughly
3. Proceed to Phase 3 (Integration Tests)
4. Deploy to production after all phases

---

## 🔄 If Tests Fail

### Common Issues

**Issue 1: Middleware not running**
- Check imports in prisma.ts
- Verify `client.$use()` is called
- Check logs for initialization message

**Issue 2: Queries return 0 rows**
- Verify `withTenantContext` wrapper is used
- Check logs for middleware execution
- Verify tenant ID is valid UUID

**Issue 3: Performance issues**
- Check middleware isn't being called multiple times per query
- Verify transaction-local setting (`true` parameter)
- Monitor query logs in development

**Issue 4: Auth broken**
- Verify `/api/auth/link-by-phone` uses service role (NOT middleware)
- Check cross-tenant lookup still works
- Verify phone normalization logic unchanged

---

## 📝 Test Results Template

```
Phase 2 Testing Results
Date: _________________
Tester: _________________

Quick Verification:
[ ] Dev server starts: PASS / FAIL
[ ] Middleware logs: PASS / FAIL
[ ] Both tenants work: PASS / FAIL

Detailed Verification:
[ ] RLS context in DB: PASS / FAIL
[ ] Cross-tenant isolation: PASS / FAIL
[ ] Middleware without context: PASS / FAIL
[ ] Auth flow works: PASS / FAIL
[ ] Performance acceptable: PASS / FAIL

Error Scenarios:
[ ] No session fails gracefully: PASS / FAIL
[ ] Invalid tenant fails gracefully: PASS / FAIL

Overall Status: PASS / FAIL

Notes:
_______________________________________
_______________________________________
_______________________________________
```

---

**Status:** Phase 2 testing checklist complete ✅  
**Next:** Run these tests, fix any issues, proceed to Phase 3

