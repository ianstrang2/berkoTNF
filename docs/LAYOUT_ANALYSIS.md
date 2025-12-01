# Layout Structure Analysis

**Date:** December 1, 2025  
**Problem:** Cycling between nesting issues and missing white backgrounds

---

## Component Hierarchy

```
AppSetup (root)
├─ StandardSettings
│  └─ CompactAppConfig
│     └─ Card components (white bg) ✅
│
└─ AdvancedSettings
   ├─ Points → CompactAppConfig → Card components (white bg) ✅
   ├─ Stats → CompactAppConfig → Card components (white bg) ✅
   ├─ Balancing → BalanceAlgorithmSetup / PerformanceBalanceSetup
   └─ Templates → TeamTemplates
```

---

## Current State Investigation

Need to check:
1. Does BalanceAlgorithmSetup have its own white bg?
2. Does PerformanceBalanceSetup have its own white bg?
3. Does TeamTemplates have its own white bg?

---

## Decision Matrix

**Option A: Each component provides own white card**
- CompactAppConfig: ✅ Has Card components
- BalanceAlgorithmSetup: ? Check
- PerformanceBalanceSetup: ? Check
- TeamTemplates: ? Check
- AppSetup: NO wrapper

**Option B: AppSetup provides one wrapper for all**
- AppSetup: White card wrapper
- CompactAppConfig: Remove Card, just render items
- Others: No cards
- Problem: Double nesting with CompactAppConfig's existing Cards

**Option C: AdvancedSettings conditionally wraps**
- Points/Stats: No wrapper (CompactAppConfig has cards)
- Balancing: Wrapper if components don't have cards
- Templates: Wrapper if component doesn't have card

---

## Solution

The cleanest approach is **Option C** - conditional wrapping in AdvancedSettings based on what each component provides.

