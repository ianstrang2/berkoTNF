/**
 * PlayerPath UI Standards Plugin
 * 
 * This plugin creates utility classes for common UI patterns that follow our design standards.
 * It helps ensure consistency across the application by providing premade component classes.
 */

const plugin = require('tailwindcss/plugin');

module.exports = plugin(function({ addComponents, theme }) {
  const cardShadow = '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)';
  const elevatedShadow = '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)';
  const toastShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
  
  addComponents({
    // Form elements
    '.form-input': {
      '@apply w-full rounded-md border-neutral-300 shadow-sm focus:ring-primary-500 focus:border-primary-500': {}
    },
    '.form-select': {
      '@apply w-full rounded-md border-neutral-300 shadow-sm focus:ring-primary-500 focus:border-primary-500': {}
    },
    '.form-textarea': {
      '@apply w-full rounded-md border-neutral-300 shadow-sm focus:ring-primary-500 focus:border-primary-500': {}
    },
    
    // Cards
    '.card': {
      '@apply bg-white rounded-lg p-6': {},
      'box-shadow': cardShadow
    },
    '.card-compact': {
      '@apply bg-white rounded-lg p-4': {},
      'box-shadow': cardShadow
    },
    '.card-outline': {
      '@apply bg-white rounded-lg border border-neutral-200 p-6': {}
    },
    
    // Alert components
    '.alert-success': {
      '@apply bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded': {}
    },
    '.alert-error': {
      '@apply bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded': {}
    },
    '.alert-warning': {
      '@apply bg-warning-50 border border-warning-200 text-warning-700 px-4 py-3 rounded': {}
    },
    '.alert-info': {
      '@apply bg-info-50 border border-info-200 text-info-700 px-4 py-3 rounded': {}
    },
    
    // Toast notifications
    '.toast': {
      '@apply fixed bottom-4 right-4 px-4 py-2 rounded-lg z-50': {},
      'box-shadow': toastShadow
    },
    '.toast-success': {
      '@apply bg-success-600 text-white': {}
    },
    '.toast-error': {
      '@apply bg-error-600 text-white': {}
    },
    
    // Modal base
    '.modal-backdrop': {
      '@apply fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50': {}
    },
    '.modal-container': {
      '@apply bg-white p-6 rounded-lg max-w-md w-full': {},
      'box-shadow': elevatedShadow
    },
  });
}); 