/**
 * Date Formatting Utilities
 * 
 * Converts UTC timestamps to tenant-local display.
 * All dates in database are UTC - conversion happens only at display layer.
 * 
 * @see docs/SPEC_Globalisation.md - Phase 0
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
 * 
 * @example
 * formatForTenant('2025-01-15T14:30:00Z', { timezone: 'Europe/London' })
 * // Returns "15 Jan 2025"
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
 * 
 * @example
 * formatMatchTime('2025-01-15T19:30:00Z', 'Europe/London')
 * // Returns "Wednesday, 15 January 2025 at 19:30"
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
 * 
 * @example
 * formatTimeOnly('2025-01-15T19:30:00Z', 'Europe/London')
 * // Returns "19:30"
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
 * 
 * @example
 * formatRelative(new Date(Date.now() + 3600000))
 * // Returns "in 1 hour"
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
 * Format date for short display (used in tables, lists)
 * 
 * @example
 * formatShortDate('2025-01-15T19:30:00Z')
 * // Returns "15/01/2025"
 */
export function formatShortDate(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE,
  locale: string = DEFAULT_LOCALE
): string {
  return formatForTenant(date, {
    timezone,
    locale,
    dateStyle: 'short',
  });
}

/**
 * React hook for tenant-aware date formatting
 * Use with tenant context to automatically apply tenant's timezone/locale
 * 
 * @example
 * const { format, formatTime } = useTenantDateFormatter(tenant.timezone, tenant.locale);
 * return <span>{format(match.match_date)}</span>;
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
    formatShort: (date: Date | string) => formatShortDate(date, timezone, locale),
  };
}

// Export defaults for use in components that don't have tenant context
export { DEFAULT_TIMEZONE, DEFAULT_LOCALE };

