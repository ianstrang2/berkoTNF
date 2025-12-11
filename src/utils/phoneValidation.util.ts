/**
 * Phone Validation Utilities
 * 
 * Handles UK phone number validation and formatting
 */

export const formatPhoneNumber = (value: string): string => {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, '');
  
  // If starts with 0, replace with 44
  if (numbers.startsWith('0')) {
    return '+44' + numbers.slice(1);
  }
  
  // If starts with 44, add +
  if (numbers.startsWith('44')) {
    return '+' + numbers;
  }
  
  // If just numbers, assume UK
  if (numbers.length === 10) {
    return '+44' + numbers;
  }
  
  return value;
};

export const isValidUKPhone = (phone: string): boolean => {
  const numbers = phone.replace(/\D/g, '');
  
  // UK mobile numbers: must start with 07 and be exactly 11 digits
  if (numbers.startsWith('0')) {
    return numbers.startsWith('07') && numbers.length === 11;
  }
  
  // If formatted with +44, check it's 447 + 9 digits (13 chars total)
  const formatted = formatPhoneNumber(phone);
  if (formatted.startsWith('+44')) {
    return formatted.startsWith('+447') && formatted.length === 13;
  }
  
  return false;
};

/**
 * Transform Supabase/Twilio errors into user-friendly messages
 */
export const getPhoneErrorMessage = (error: any): string => {
  if (!error) return 'An unexpected error occurred';
  
  const errorMessage = error.message || error.error_description || String(error);
  const errorLower = errorMessage.toLowerCase();
  
  // Twilio invalid phone number errors
  if (errorLower.includes('not a valid phone number') || 
      errorLower.includes('invalid phone') ||
      errorLower.includes('21211')) { // Twilio error code for invalid phone
    return 'Please enter a valid UK mobile number (e.g., 07123 456789)';
  }
  
  // Rate limiting
  if (errorLower.includes('rate limit') || 
      errorLower.includes('too many requests') ||
      errorLower.includes('429')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  
  // OTP verification failures
  if (errorLower.includes('invalid otp') || 
      errorLower.includes('token expired') ||
      errorLower.includes('verification code')) {
    return 'Invalid or expired code. Please request a new one.';
  }
  
  // Phone already in use (rare, but possible)
  if (errorLower.includes('already registered') || 
      errorLower.includes('already exists')) {
    return 'This phone number is already registered. Please try logging in instead.';
  }
  
  // SMS delivery failures
  if (errorLower.includes('sms') || 
      errorLower.includes('unable to send')) {
    return 'Unable to send SMS. Please check your phone number and try again.';
  }
  
  // Generic fallback - hide technical details
  return 'Unable to send verification code. Please check your phone number and try again.';
};


