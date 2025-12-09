// PerfectScrollbar initialization DISABLED
// Reason: Causes forced reflows on every React re-render, significantly
// impacting performance. Native scrollbars work well in modern browsers.
// If custom scrollbars are needed in the future, use a React-based solution
// that only initializes on specific components rather than globally.

(function () {
  // Intentionally disabled - see comment above
  // Original code initialized PerfectScrollbar on all overflow elements
  // which caused ~50-100ms forced reflows on page navigation
  console.log('[PerfectScrollbar] Disabled for performance - using native scrollbars');
})();
