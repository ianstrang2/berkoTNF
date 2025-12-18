/**
 * International Phone Number Utilities
 * 
 * Uses libphonenumber-js for proper international validation.
 * Falls back to default country from tenant context.
 * 
 * @see docs/SPEC_Globalisation.md - Phase 0
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
 * 
 * @example
 * normalizeToE164('07123456789', 'GB') // Returns '+447123456789'
 * normalizeToE164('+1 555 123 4567', 'US') // Returns '+15551234567'
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

