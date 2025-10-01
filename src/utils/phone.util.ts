/**
 * Phone Number Utilities
 * 
 * Handles phone number normalization, validation, and formatting
 * for UK phone numbers in E.164 format
 */

/**
 * Normalize UK phone numbers to E.164 format
 * Supports: 07XXX XXXXXX → +447XXX XXXXXX
 * Future: Expand for international with libphonenumber-js
 * 
 * @param phone - Phone number in various formats
 * @returns Phone number in E.164 format (+447XXXXXXXXX)
 * @throws Error if phone number is invalid
 */
export function normalizeToE164(phone: string): string {
  if (!phone) {
    throw new Error('Phone number is required');
  }

  // Remove all non-digit and non-plus characters
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Already in E.164 format
  if (cleaned.startsWith('+44')) {
    if (/^\+44[1-9]\d{9}$/.test(cleaned)) {
      return cleaned;
    }
    throw new Error('Invalid UK phone number format. Expected +44 followed by 10 digits');
  }
  
  // UK mobile number starting with 07
  if (cleaned.startsWith('07')) {
    const normalized = '+44' + cleaned.substring(1);
    if (/^\+44[1-9]\d{9}$/.test(normalized)) {
      return normalized;
    }
    throw new Error('Invalid UK mobile number format');
  }
  
  // UK mobile number without leading 0
  if (cleaned.startsWith('7') && cleaned.length === 10) {
    const normalized = '+44' + cleaned;
    if (/^\+44[1-9]\d{9}$/.test(normalized)) {
      return normalized;
    }
  }
  
  throw new Error('Invalid UK phone number format. Use 07XXX XXXXXX or +44 format');
}

/**
 * Validate UK phone number format
 * 
 * @param phone - Phone number to validate
 * @returns true if valid UK phone number
 */
export function isValidUKPhone(phone: string): boolean {
  try {
    const e164 = normalizeToE164(phone);
    return /^\+44[1-9]\d{9}$/.test(e164);
  } catch {
    return false;
  }
}

/**
 * Format phone number for display
 * 
 * @param phone - Phone number in E.164 format
 * @param mask - Whether to mask middle digits for privacy
 * @returns Formatted phone number for display
 */
export function formatPhone(phone: string, mask: boolean = false): string {
  if (!phone) return '';
  
  // Ensure it's in E.164 format first
  let e164Phone: string;
  try {
    e164Phone = normalizeToE164(phone);
  } catch {
    // If normalization fails, return original
    return phone;
  }
  
  if (mask) {
    // Mask middle digits: +44 7*** ***789
    const countryCode = e164Phone.slice(0, 3); // +44
    const firstDigit = e164Phone[3]; // 7
    const lastDigits = e164Phone.slice(-3); // last 3 digits
    return `${countryCode} ${firstDigit}*** ***${lastDigits}`;
  }
  
  // Format for display: +44 7123 456789
  // Extract parts: +44 7123 456789
  const countryCode = e164Phone.slice(0, 3); // +44
  const part1 = e164Phone.slice(3, 7); // 7123
  const part2 = e164Phone.slice(7); // 456789
  
  return `${countryCode} ${part1} ${part2}`;
}

/**
 * Mask phone number for privacy (always masks)
 * 
 * @param phone - Phone number to mask
 * @returns Masked phone number
 */
export function maskPhone(phone: string): string {
  return formatPhone(phone, true);
}

/**
 * Check if two phone numbers are the same (after normalization)
 * 
 * @param phone1 - First phone number
 * @param phone2 - Second phone number  
 * @returns true if phone numbers match
 */
export function phoneNumbersMatch(phone1: string, phone2: string): boolean {
  try {
    const normalized1 = normalizeToE164(phone1);
    const normalized2 = normalizeToE164(phone2);
    return normalized1 === normalized2;
  } catch {
    return false;
  }
}

