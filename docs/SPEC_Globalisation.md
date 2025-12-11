# Globalisation Specification

**Version:** 1.0.0  
**Last Updated:** December 2025  
**Status:** Phase 0 Ready for Implementation  
**Dependencies:** None (foundational spec)

---

## Overview

This specification defines the architectural decisions and implementation steps required to launch Capo as a **globally available app** from day one, while focusing marketing on the UK initially.

**Philosophy:** Global by default, UK focused.
- Accept signups from any country Stripe supports (46+)
- Store data in international-ready formats
- Focus marketing spend on UK (known market)
- Support English only initially

---

## Table of Contents

1. [Current State Audit](#1-current-state-audit)
2. [Phase 0: Global Foundations (Now)](#2-phase-0-global-foundations-now)
3. [Phase 1: RSVP Integration](#3-phase-1-rsvp-integration)
4. [Phase 2: Payments Integration](#4-phase-2-payments-integration)
5. [Future: Full i18n](#5-future-full-i18n)
6. [Implementation Checklist](#6-implementation-checklist)

---

## 1) Current State Audit

### ✅ Already Global-Ready

| Item | Status | Notes |
|------|--------|-------|
| **UTC Timestamps** | ✅ Done | All `TIMESTAMPTZ(6)` columns store UTC |
| **Multi-tenant architecture** | ✅ Done | Full tenant isolation implemented |
| **Phone auth via Supabase** | ✅ Done | Supabase handles international SMS |
| **E.164 phone storage** | ✅ Done | Phones stored as `+447XXXXXXXXX` |
| **Stripe Connect ready** | ✅ Done | Standard accounts work in 46+ countries |

### ⚠️ Needs Phase 0 Work

| Item | Current State | Required Change |
|------|---------------|-----------------|
| **Timezone on tenants** | ❌ Missing | Add `timezone` column |
| **Currency on tenants** | ❌ Missing | Add `currency` column |
| **Locale on tenants** | ❌ Missing | Add `locale` column |
| **Phone validation** | UK-only (`+44` hardcoded) | Add `libphonenumber-js` for international |
| **Date formatting** | `en-GB` hardcoded | Centralize with tenant timezone |
| **Hardcoded currency symbols** | `£` sprinkled in UI | Use `formatCurrency()` utility |
| **Terms of Service** | May reference UK | Make language global |

### 📍 Phone Number Handling - Current Issues

**Problem 1: Duplicated inline `normalizePhone` functions**

Found in 4 API routes with copy-pasted UK-only logic:
- `src/app/api/join/link-player/route.ts` (lines 60-80)
- `src/app/api/auth/check-phone/route.ts` (lines 72-78)
- `src/app/api/join/request-access/route.ts` (lines 68-74)
- `src/app/api/auth/link-by-phone/route.ts` (lines 43-49)

**Problem 2: UK-hardcoded logic**

Current implementation in `src/utils/phone.util.ts`:
```typescript
// ❌ CURRENT: Hardcodes +44 UK country code
if (cleaned.startsWith('07')) {
  const normalized = '+44' + cleaned.substring(1);
  // ...
}
```

**Solution:** Replace with `libphonenumber-js` and tenant-based default country.

---

## 2) Phase 0: Global Foundations (Now)

**Timeline:** 2-3 days  
**Prerequisite for:** RSVP, Payments

### 2.1 Database Migration

Add global-ready columns to `tenants` table:

```sql
-- Migration: Add globalisation fields to tenants
-- Run in Supabase SQL Editor

ALTER TABLE tenants
  ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Europe/London',
  ADD COLUMN currency TEXT NOT NULL DEFAULT 'GBP',
  ADD COLUMN locale TEXT NOT NULL DEFAULT 'en-GB',
  ADD COLUMN country TEXT NOT NULL DEFAULT 'GB';

-- Add comment for documentation
COMMENT ON COLUMN tenants.timezone IS 
  'IANA timezone identifier (e.g., Europe/London, America/New_York). Used for display only - all timestamps stored in UTC.';

COMMENT ON COLUMN tenants.currency IS 
  'ISO 4217 currency code (e.g., GBP, EUR, USD). Used for payment display and Stripe integration.';

COMMENT ON COLUMN tenants.locale IS 
  'BCP 47 locale tag (e.g., en-GB, en-US, fr-FR). Used for date/number formatting.';

COMMENT ON COLUMN tenants.country IS 
  'ISO 3166-1 alpha-2 country code (e.g., GB, US, DE). Used as default for phone validation.';

-- Index for potential future country-based queries
CREATE INDEX IF NOT EXISTS idx_tenants_country ON tenants(country);
```

**Update Prisma schema** (`prisma/schema.prisma`):

```prisma
model tenants {
  tenant_id   String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  slug        String   @unique @db.VarChar(50)
  name        String   @db.VarChar(255)
  club_code   String   @unique @db.VarChar(5)
  created_at  DateTime? @default(now()) @db.Timestamptz(6)
  updated_at  DateTime? @default(now()) @db.Timestamptz(6)
  is_active   Boolean? @default(true)
  settings    Json?    @default("{}")
  
  // Globalisation fields (Phase 0)
  timezone    String   @default("Europe/London")  // IANA timezone
  currency    String   @default("GBP")            // ISO 4217
  locale      String   @default("en-GB")          // BCP 47
  country     String   @default("GB")             // ISO 3166-1 alpha-2
  
  // ... relations unchanged
}
```

### 2.2 Phone Validation - International Support

**Install libphonenumber-js:**

```bash
npm install libphonenumber-js
```

**Create new utility:** `src/utils/phoneInternational.util.ts`

```typescript
/**
 * International Phone Number Utilities
 * 
 * Uses libphonenumber-js for proper international validation.
 * Falls back to default country from tenant context.
 */

import { 
  parsePhoneNumber, 
  isValidPhoneNumber, 
  CountryCode,
  PhoneNumber 
} from 'libphonenumber-js';

/**
 * Normalize phone number to E.164 format
 * 
 * @param phone - Phone number in local or international format
 * @param defaultCountry - ISO 3166-1 alpha-2 country code (e.g., 'GB', 'US')
 * @returns Phone number in E.164 format (+447123456789)
 * @throws Error if phone number is invalid
 */
export function normalizeToE164(
  phone: string, 
  defaultCountry: CountryCode = 'GB'
): string {
  if (!phone) {
    throw new Error('Phone number is required');
  }

  try {
    const phoneNumber = parsePhoneNumber(phone, defaultCountry);
    
    if (!phoneNumber || !phoneNumber.isValid()) {
      throw new Error(`Invalid phone number for country ${defaultCountry}`);
    }
    
    return phoneNumber.format('E.164');
  } catch (error) {
    throw new Error(
      `Invalid phone number. Please enter a valid number for ${defaultCountry}.`
    );
  }
}

/**
 * Validate phone number for a specific country
 * 
 * @param phone - Phone number to validate
 * @param defaultCountry - ISO 3166-1 alpha-2 country code
 * @returns true if valid phone number
 */
export function isValidPhone(
  phone: string, 
  defaultCountry: CountryCode = 'GB'
): boolean {
  try {
    return isValidPhoneNumber(phone, defaultCountry);
  } catch {
    return false;
  }
}

/**
 * Format phone number for display
 * 
 * @param phone - Phone number in E.164 format
 * @param format - 'NATIONAL' (07123 456789) or 'INTERNATIONAL' (+44 7123 456789)
 * @param mask - Whether to mask middle digits for privacy
 * @returns Formatted phone number
 */
export function formatPhoneDisplay(
  phone: string,
  format: 'NATIONAL' | 'INTERNATIONAL' = 'INTERNATIONAL',
  mask: boolean = false
): string {
  if (!phone) return '';
  
  try {
    const phoneNumber = parsePhoneNumber(phone);
    if (!phoneNumber) return phone;
    
    const formatted = phoneNumber.format(format);
    
    if (mask) {
      // Mask middle digits: +44 7*** ***789
      const digits = phone.replace(/\D/g, '');
      const lastThree = digits.slice(-3);
      const countryCode = phoneNumber.countryCallingCode;
      return `+${countryCode} ***${lastThree}`;
    }
    
    return formatted;
  } catch {
    return phone;
  }
}

/**
 * Mask phone number for privacy
 */
export function maskPhone(phone: string): string {
  return formatPhoneDisplay(phone, 'INTERNATIONAL', true);
}

/**
 * Check if two phone numbers are the same (after normalization)
 */
export function phoneNumbersMatch(
  phone1: string, 
  phone2: string, 
  defaultCountry: CountryCode = 'GB'
): boolean {
  try {
    const normalized1 = normalizeToE164(phone1, defaultCountry);
    const normalized2 = normalizeToE164(phone2, defaultCountry);
    return normalized1 === normalized2;
  } catch {
    return false;
  }
}

/**
 * Get country code from phone number
 */
export function getCountryFromPhone(phone: string): CountryCode | undefined {
  try {
    const phoneNumber = parsePhoneNumber(phone);
    return phoneNumber?.country;
  } catch {
    return undefined;
  }
}

// Re-export CountryCode type for convenience
export type { CountryCode };
```

**Update API routes to use centralized utility:**

Replace inline `normalizePhone` functions in all 4 routes with:

```typescript
import { normalizeToE164 } from '@/utils/phoneInternational.util';

// Get tenant country for default (when available)
const tenantCountry = tenant?.country || 'GB';
const normalizedPhone = normalizeToE164(phone, tenantCountry);
```

### 2.3 Date/Time Formatting Utility

**Create utility:** `src/utils/dateFormat.util.ts`

```typescript
/**
 * Date Formatting Utilities
 * 
 * Converts UTC timestamps to tenant-local display.
 * All dates in database are UTC - conversion happens only at display layer.
 */

type DateFormatStyle = 'full' | 'long' | 'medium' | 'short';

interface FormatOptions {
  timezone?: string;      // IANA timezone (e.g., 'Europe/London')
  locale?: string;        // BCP 47 locale (e.g., 'en-GB')
  dateStyle?: DateFormatStyle;
  timeStyle?: DateFormatStyle;
  includeTime?: boolean;
}

const DEFAULT_TIMEZONE = 'Europe/London';
const DEFAULT_LOCALE = 'en-GB';

// IMPORTANT: Always use fallback when accessing tenant timezone
// const tz = tenant?.timezone || DEFAULT_TIMEZONE;
// This prevents undefined timezone from breaking Intl.DateTimeFormat

/**
 * Format a UTC date for display in tenant's local timezone
 * 
 * @param date - Date object or ISO string (UTC)
 * @param options - Formatting options
 * @returns Formatted date string in tenant's local time
 */
export function formatForTenant(
  date: Date | string | null | undefined,
  options: FormatOptions = {}
): string {
  if (!date) return '';
  
  const {
    timezone = DEFAULT_TIMEZONE,
    locale = DEFAULT_LOCALE,
    dateStyle = 'medium',
    timeStyle,
    includeTime = false,
  } = options;

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(d.getTime())) {
      console.warn('Invalid date provided to formatForTenant:', date);
      return '';
    }

    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      dateStyle,
    };

    if (includeTime && timeStyle) {
      formatOptions.timeStyle = timeStyle;
    }

    return new Intl.DateTimeFormat(locale, formatOptions).format(d);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Format date with explicit format (for match kickoff times, etc.)
 */
export function formatMatchTime(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE,
  locale: string = DEFAULT_LOCALE
): string {
  return formatForTenant(date, {
    timezone,
    locale,
    dateStyle: 'full',
    timeStyle: 'short',
    includeTime: true,
  });
}

/**
 * Format time only (for tier window opens, etc.)
 */
export function formatTimeOnly(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE,
  locale: string = DEFAULT_LOCALE
): string {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '';
  }
}

/**
 * Get relative time (e.g., "in 2 hours", "3 days ago")
 */
export function formatRelative(
  date: Date | string,
  locale: string = DEFAULT_LOCALE
): string {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffSeconds = Math.round(diffMs / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (Math.abs(diffSeconds) < 60) {
      return rtf.format(diffSeconds, 'second');
    } else if (Math.abs(diffMinutes) < 60) {
      return rtf.format(diffMinutes, 'minute');
    } else if (Math.abs(diffHours) < 24) {
      return rtf.format(diffHours, 'hour');
    } else {
      return rtf.format(diffDays, 'day');
    }
  } catch {
    return '';
  }
}

/**
 * React hook for tenant-aware date formatting
 * Use with tenant context to automatically apply tenant's timezone/locale
 */
export function useTenantDateFormatter(
  timezone: string = DEFAULT_TIMEZONE,
  locale: string = DEFAULT_LOCALE
) {
  return {
    format: (date: Date | string, options?: Omit<FormatOptions, 'timezone' | 'locale'>) =>
      formatForTenant(date, { timezone, locale, ...options }),
    formatTime: (date: Date | string) => formatTimeOnly(date, timezone, locale),
    formatMatch: (date: Date | string) => formatMatchTime(date, timezone, locale),
    formatRelative: (date: Date | string) => formatRelative(date, locale),
  };
}
```

### 2.4 Currency Formatting Utility

**Create utility:** `src/utils/currency.util.ts`

```typescript
/**
 * Currency Formatting Utilities
 * 
 * All money values stored in database as INTEGER MINOR UNITS (cents/pence).
 * Conversion to display format happens only at display layer.
 */

/**
 * Format minor units to display currency
 * 
 * @param amountMinorUnits - Amount in minor units (e.g., 500 = £5.00)
 * @param currency - ISO 4217 currency code (e.g., 'GBP', 'EUR', 'USD')
 * @param locale - BCP 47 locale for formatting (e.g., 'en-GB')
 * @returns Formatted currency string (e.g., '£5.00')
 */
export function formatCurrency(
  amountMinorUnits: number,
  currency: string = 'GBP',
  locale: string = 'en-GB'
): string {
  const amountMajorUnits = amountMinorUnits / 100;
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amountMajorUnits);
}

/**
 * Convert major units to minor units for storage
 * 
 * @param amountMajorUnits - Amount in major units (e.g., 5.00)
 * @returns Amount in minor units (e.g., 500)
 */
export function toMinorUnits(amountMajorUnits: number): number {
  return Math.round(amountMajorUnits * 100);
}

/**
 * Convert minor units to major units for display/calculations
 * 
 * @param amountMinorUnits - Amount in minor units (e.g., 500)
 * @returns Amount in major units (e.g., 5.00)
 */
export function toMajorUnits(amountMinorUnits: number): number {
  return amountMinorUnits / 100;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(
  currency: string = 'GBP',
  locale: string = 'en-GB'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  })
    .formatToParts(0)
    .find(part => part.type === 'currency')?.value || currency;
}

/**
 * React hook for tenant-aware currency formatting
 */
export function useTenantCurrencyFormatter(
  currency: string = 'GBP',
  locale: string = 'en-GB'
) {
  return {
    format: (amountMinorUnits: number) => 
      formatCurrency(amountMinorUnits, currency, locale),
    symbol: getCurrencySymbol(currency, locale),
    toMinor: toMinorUnits,
    toMajor: toMajorUnits,
  };
}
```

### 2.5 Terms of Service Updates

Review and update legal copy to be global-friendly:

**Changes required:**

| Current | Change To |
|---------|-----------|
| "This service is available in the United Kingdom" | "This service is available worldwide" |
| "subject to UK law" | "subject to the laws of your jurisdiction" |
| "VAT included" | "Taxes may apply based on your location" |
| References to "£" only | "Local currency equivalent" or show actual currency |

**Files to update:**
- `src/app/terms/page.tsx`
- `src/app/privacy/page.tsx`
- Any marketing copy with geographic references

---

## 3) Phase 1: RSVP Integration

**Timeline:** Part of RSVP implementation (5-6 weeks)  
**See:** `SPEC_RSVP.md` for full RSVP specification

### 3.1 RSVP-Specific Global Requirements

The RSVP spec already includes `match_timezone` field in Section 3.2:

```sql
ALTER TABLE upcoming_matches
  ADD COLUMN match_timezone TEXT NOT NULL DEFAULT 'Europe/London';
```

**Integration with Phase 0:**
- Use tenant's `timezone` as default for new matches
- Allow override per-match if venue is in different timezone
- Display tier windows in match timezone, not UTC

### 3.2 Phone Validation in RSVP

RSVP uses phone for:
- Player authentication
- Waitlist offer notifications (push + SMS fallback)
- Contact admin for manual adds

**Use international phone validation:**
```typescript
// In RSVP booking endpoint
import { normalizeToE164 } from '@/utils/phoneInternational.util';

const tenantCountry = match.tenant?.country || 'GB';
const normalizedPhone = normalizeToE164(phone, tenantCountry);
```

---

## 4) Phase 2: Payments Integration

**Timeline:** After RSVP (3-4 weeks)  
**See:** `Billing_Plan.md` for full payments specification

### 4.1 Currency Storage Rules

**MANDATORY:** All money stored in INTEGER MINOR UNITS.

```sql
-- ✅ CORRECT: Store 500 for £5.00
price_cents INTEGER NOT NULL

-- ❌ WRONG: Never store decimals for money
price DECIMAL(10,2)  -- DON'T DO THIS
```

**Why integer minor units:**
- No floating point precision errors
- Clean arithmetic (500 + 50 = 550, not 5.00 + 0.50 = 5.4999999)
- Stripe uses minor units
- Easy currency conversion (multiply, round, done)

### 4.2 Multi-Currency Considerations

**Phase 2 scope:** Support tenant's configured currency only.

```typescript
// Payment creation
const paymentIntent = await stripe.paymentIntents.create({
  amount: matchFeeMinorUnits, // Already in minor units
  currency: tenant.currency.toLowerCase(), // 'gbp', 'eur', etc.
  // ...
});
```

**IMPORTANT: Store currency per payment record, not just on tenant:**

```sql
-- In payments table (see Billing_Plan.md)
currency TEXT NOT NULL  -- ISO 4217 code at time of payment
```

**Why:** If a tenant changes their default currency from GBP to EUR in the future, historical payment records must preserve the original currency. Never derive historical payment currency from current tenant settings.

**Future:** Dynamic currency conversion for cross-border payments.

### 4.3 Stripe Connect Global Support

Stripe Connect Standard supports 46+ countries. Key markets:

| Region | Countries |
|--------|-----------|
| Europe | UK, Germany, France, Spain, Italy, Netherlands, Belgium, Ireland, etc. |
| Americas | US, Canada, Mexico, Brazil |
| Asia Pacific | Australia, Japan, Singapore, Hong Kong |

**No code changes needed** - Stripe handles:
- Local KYC requirements
- Bank account validation
- Payout scheduling
- Tax form generation

---

## 5) Future: Full i18n

**Timeline:** When first non-English-speaking club signs up  
**Approach:** Infrastructure now, translations later

### 5.1 Recommended Setup (If Doing Now)

**Option A: next-intl (Recommended)**

```bash
npm install next-intl
```

**Minimal setup:**
```
src/
├── messages/
│   └── en.json        # All strings in English
├── i18n.ts            # Configuration
```

```typescript
// src/i18n.ts
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  // For now, always return English
  // Later: detect from tenant.locale or user preference
  return {
    locale: 'en',
    messages: (await import(`./messages/en.json`)).default,
  };
});
```

### 5.2 String Extraction Strategy

**If setting up i18n now:**
1. ✅ Use for all **new RSVP strings**
2. ✅ Use for all **push notification templates**
3. ✅ Use for all **email templates**
4. ❌ Don't touch existing dashboard/stats components

**If deferring i18n:**
1. Keep strings hardcoded
2. When needed, use regex to extract to JSON
3. ~2-3 days of work for full extraction

### 5.3 Translation Workflow (Future)

1. Export `en.json` to translation service
2. Receive `fr.json`, `de.json`, etc.
3. Add language selector to player settings
4. Store preference in `players.locale` (not implemented)

### 5.4 Push Notification Quiet Hours (Future)

Prevent push notifications from firing at 3am for non-UK users:

```sql
-- Future: Add to players table
ALTER TABLE players 
  ADD COLUMN quiet_hours JSON DEFAULT '{"start":"22:00","end":"07:00"}';
```

This allows players to set "do not disturb" windows in their local timezone. Implementation should:
- Check player's quiet hours before sending push
- Queue notifications for delivery after quiet hours end
- Respect timezone from tenant (or player-level if added later)

### 5.5 Linting for Currency Symbols (Optional)

Add ESLint rule to prevent hardcoded currency symbols:

```javascript
// .eslintrc.js (optional, for enforcement)
{
  "no-restricted-syntax": [
    "warn",
    {
      "selector": "Literal[value=/£/]",
      "message": "Use formatCurrency() instead of hardcoding £"
    }
  ]
}
```

This catches accidental `£5.00` strings in JSX and reminds developers to use the formatting utility.

---

## 6) Implementation Checklist

### Phase 0: Now (Pre-RSVP)

**Database:**
- [ ] Add `timezone`, `currency`, `locale`, `country` to tenants table
- [ ] Update Prisma schema
- [ ] Run `npx prisma generate`

**Phone Validation:**
- [ ] Install `libphonenumber-js`
- [ ] Create `phoneInternational.util.ts`
- [ ] Update `link-player/route.ts` to use centralized utility
- [ ] Update `check-phone/route.ts` to use centralized utility
- [ ] Update `request-access/route.ts` to use centralized utility
- [ ] Update `link-by-phone/route.ts` to use centralized utility
- [ ] Update frontend `phoneValidation.util.ts` to support international

**Utilities:**
- [ ] Create `dateFormat.util.ts`
- [ ] Create `currency.util.ts`

**Legal:**
- [ ] Review terms of service for UK-specific language
- [ ] Review privacy policy for geographic restrictions
- [ ] Update any marketing copy

**Code Audit:**
- [ ] Find and replace `toLocaleString()` calls with tenant-based formatting
- [ ] Find and replace hardcoded `£` symbols with `formatCurrency()`
- [ ] Ensure all date formatting uses `formatForTenant()` utility

### Phase 1: RSVP

- [ ] Use tenant timezone for match display
- [ ] Use international phone validation in booking endpoints
- [ ] Format tier window times in tenant timezone

### Phase 2: Payments

- [ ] Store all amounts in minor units
- [ ] Use tenant currency for Stripe payments
- [ ] Display prices with tenant currency formatting

### Future: i18n

- [ ] Set up next-intl (optional, can defer)
- [ ] Create `messages/en.json` structure
- [ ] Extract strings from new components only

---

## Key Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Dec 2025 | Global by default, UK focused | 10x market opportunity, minimal extra work |
| Dec 2025 | Use `libphonenumber-js` | Industry standard, handles all countries |
| Dec 2025 | Store money in minor units | Prevents float errors, matches Stripe |
| Dec 2025 | Defer full i18n | English sufficient for launch, extract later if needed |
| Dec 2025 | Tenant-level timezone/currency | Clubs operate in single timezone typically |

---

**End of Globalisation Specification v1.0.0**

