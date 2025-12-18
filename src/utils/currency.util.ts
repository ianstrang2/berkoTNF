/**
 * Currency Formatting Utilities
 * 
 * All money values stored in database as INTEGER MINOR UNITS (cents/pence).
 * Conversion to display format happens only at display layer.
 * 
 * @see docs/SPEC_Globalisation.md - Phase 0
 */

const DEFAULT_CURRENCY = 'GBP';
const DEFAULT_LOCALE = 'en-GB';

/**
 * Format minor units to display currency
 * 
 * @param amountMinorUnits - Amount in minor units (e.g., 500 = £5.00)
 * @param currency - ISO 4217 currency code (e.g., 'GBP', 'EUR', 'USD')
 * @param locale - BCP 47 locale for formatting (e.g., 'en-GB')
 * @returns Formatted currency string (e.g., '£5.00')
 * 
 * @example
 * formatCurrency(500, 'GBP') // Returns '£5.00'
 * formatCurrency(1299, 'USD', 'en-US') // Returns '$12.99'
 */
export function formatCurrency(
  amountMinorUnits: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE
): string {
  const amountMajorUnits = amountMinorUnits / 100;
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amountMajorUnits);
}

/**
 * Format currency without decimals (for whole amounts like match fees)
 * 
 * @example
 * formatCurrencyWhole(500, 'GBP') // Returns '£5'
 */
export function formatCurrencyWhole(
  amountMinorUnits: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE
): string {
  const amountMajorUnits = amountMinorUnits / 100;
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountMajorUnits);
}

/**
 * Convert major units to minor units for storage
 * 
 * @param amountMajorUnits - Amount in major units (e.g., 5.00)
 * @returns Amount in minor units (e.g., 500)
 * 
 * @example
 * toMinorUnits(5.00) // Returns 500
 * toMinorUnits(12.99) // Returns 1299
 */
export function toMinorUnits(amountMajorUnits: number): number {
  return Math.round(amountMajorUnits * 100);
}

/**
 * Convert minor units to major units for display/calculations
 * 
 * @param amountMinorUnits - Amount in minor units (e.g., 500)
 * @returns Amount in major units (e.g., 5.00)
 * 
 * @example
 * toMajorUnits(500) // Returns 5
 * toMajorUnits(1299) // Returns 12.99
 */
export function toMajorUnits(amountMinorUnits: number): number {
  return amountMinorUnits / 100;
}

/**
 * Get currency symbol
 * 
 * @example
 * getCurrencySymbol('GBP') // Returns '£'
 * getCurrencySymbol('USD', 'en-US') // Returns '$'
 * getCurrencySymbol('EUR', 'de-DE') // Returns '€'
 */
export function getCurrencySymbol(
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE
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
 * 
 * @example
 * const { format, symbol } = useTenantCurrencyFormatter(tenant.currency, tenant.locale);
 * return <span>{format(matchFee)}</span>; // "£5.00"
 */
export function useTenantCurrencyFormatter(
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE
) {
  return {
    format: (amountMinorUnits: number) => 
      formatCurrency(amountMinorUnits, currency, locale),
    formatWhole: (amountMinorUnits: number) => 
      formatCurrencyWhole(amountMinorUnits, currency, locale),
    symbol: getCurrencySymbol(currency, locale),
    toMinor: toMinorUnits,
    toMajor: toMajorUnits,
  };
}

// Export defaults
export { DEFAULT_CURRENCY, DEFAULT_LOCALE };

