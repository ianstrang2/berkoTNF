'use client';

/**
 * Share Utility
 * 
 * Provides cross-platform sharing functionality:
 * - Capacitor Share plugin (iOS/Android native)
 * - Web Share API (mobile browsers)
 * - Manual fallbacks (WhatsApp, SMS, Email, Clipboard)
 */

export interface ShareOptions {
  text: string;
  title?: string;
  subject?: string; // Email subject
}

export type ShareMethod = 'native' | 'whatsapp' | 'sms' | 'email' | 'copy';

/**
 * Check if running in Capacitor native environment
 */
export const isCapacitorNative = (): boolean => {
  if (typeof window === 'undefined') return false;
  const win = window as any;
  return win.Capacitor?.isNativePlatform?.() ?? false;
};

/**
 * Check if Web Share API is available
 */
export const canUseWebShare = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return 'share' in navigator && typeof navigator.share === 'function';
};

/**
 * Share using Capacitor Share plugin (native iOS/Android)
 */
export const shareWithCapacitor = async (options: ShareOptions): Promise<boolean> => {
  try {
    // Dynamically import Capacitor Share to avoid SSR issues
    const { Share } = await import('@capacitor/share');
    
    await Share.share({
      title: options.title,
      text: options.text,
      dialogTitle: options.title || 'Share',
    });
    
    return true;
  } catch (error) {
    // User cancelled or share failed
    console.log('Capacitor share cancelled or failed:', error);
    return false;
  }
};

/**
 * Share using Web Share API
 */
export const shareWithWebShare = async (options: ShareOptions): Promise<boolean> => {
  if (!canUseWebShare()) return false;
  
  try {
    await navigator.share({
      title: options.title,
      text: options.text,
    });
    return true;
  } catch (error) {
    // User cancelled or share failed
    console.log('Web share cancelled or failed:', error);
    return false;
  }
};

/**
 * Open WhatsApp with prefilled text
 */
export const shareToWhatsApp = (text: string): void => {
  const encodedText = encodeURIComponent(text);
  const url = `https://api.whatsapp.com/send?text=${encodedText}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Open SMS with prefilled text
 * Note: iOS uses &body=, Android uses ?body=
 */
export const shareToSMS = (text: string): void => {
  const encodedText = encodeURIComponent(text);
  // Use sms:?body= format which works on most devices
  // Some devices may need sms:&body= but ?body= is more universally supported
  const url = `sms:?body=${encodedText}`;
  window.location.href = url;
};

/**
 * Open email client with prefilled subject and body
 */
export const shareToEmail = (text: string, subject?: string): void => {
  const encodedBody = encodeURIComponent(text);
  const encodedSubject = encodeURIComponent(subject || 'Shared from Capo');
  const url = `mailto:?subject=${encodedSubject}&body=${encodedBody}`;
  window.location.href = url;
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const result = document.execCommand('copy');
    document.body.removeChild(textArea);
    return result;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Unified share function - tries best available method
 * Returns true if share was initiated (not necessarily completed)
 */
export const shareText = async (options: ShareOptions, method?: ShareMethod): Promise<boolean> => {
  // If a specific method is requested, use it
  if (method) {
    switch (method) {
      case 'native':
        if (isCapacitorNative()) {
          return shareWithCapacitor(options);
        } else if (canUseWebShare()) {
          return shareWithWebShare(options);
        }
        return false;
      case 'whatsapp':
        shareToWhatsApp(options.text);
        return true;
      case 'sms':
        shareToSMS(options.text);
        return true;
      case 'email':
        shareToEmail(options.text, options.subject || options.title);
        return true;
      case 'copy':
        return copyToClipboard(options.text);
    }
  }
  
  // Auto-detect best method
  if (isCapacitorNative()) {
    return shareWithCapacitor(options);
  }
  
  if (canUseWebShare()) {
    return shareWithWebShare(options);
  }
  
  // Fall back to clipboard
  return copyToClipboard(options.text);
};

/**
 * Get available share methods based on current platform
 */
export const getAvailableShareMethods = (): ShareMethod[] => {
  const methods: ShareMethod[] = [];
  
  // Native share is always available as an option on mobile
  if (isCapacitorNative() || canUseWebShare()) {
    methods.push('native');
  }
  
  // These are always available (they open URLs/links)
  methods.push('whatsapp', 'sms', 'email', 'copy');
  
  return methods;
};


