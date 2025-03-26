# PlayerPath Styling Standards

This document outlines the styling standards for the PlayerPath application. All new components should follow these guidelines.

## Color System

We use the `neutral` color palette for grays throughout the application:

| Usage | Class | Example |
|-------|-------|---------|
| Text - Primary | `text-neutral-800` | Main headings, important text |
| Text - Secondary | `text-neutral-600` | Body text, descriptions |
| Text - Tertiary | `text-neutral-500` | Helper text, less important info |
| Backgrounds - Primary | `bg-white` | Cards, modals, primary backgrounds |
| Backgrounds - Secondary | `bg-neutral-50` | Page backgrounds, secondary containers |
| Borders - Primary | `border-neutral-300` | Form controls, dividers |
| Borders - Secondary | `border-neutral-200` | Cards, subtle separators |

## Shadow System

Shadows are used consistently across the application using utility classes:

| Usage | Utility Class | When to Use |
|-------|--------------|-------------|
| Form Elements | `shadow-sm` | Input fields, select dropdowns, buttons |
| Cards & Panels | `.card` or `.card-compact` | Content cards, info panels |
| Elevated Elements | `.modal-container` | Modals, dialogs, tooltips, dropdowns |
| Notifications | `.toast` | Toast notifications, alert banners |

## Component Guidelines

### Cards
```jsx
// Card examples - use the utility class
<div className="card">
  {/* Card content */}
</div>

// Or the compact version
<div className="card-compact">
  {/* Card content */}
</div>

// Or manual styling with Tailwind
<div className="bg-white rounded-lg p-4 shadow">
  {/* Card content */}
</div>
```

### Form Elements
```jsx
// Form element examples - use the utility class
<input 
  type="text"
  className="form-input"
/>

// Or manual styling
<input 
  type="text"
  className="w-full rounded-md border-neutral-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
/>
```

### Modals and Dialogs
```jsx
// Modal examples - use the utility classes
<div className="modal-backdrop">
  <div className="modal-container">
    {/* Modal content */}
  </div>
</div>

// Or manual styling
<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
  <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
    {/* Modal content */}
  </div>
</div>
```

### Toast Notifications
```jsx
// Toast notification examples - use the utility classes
<div className="toast toast-success">
  {/* Toast content */}
</div>

// Or manual styling
<div className="fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-md bg-success-600 text-white">
  {/* Toast content */}
</div>
```

## Primary Colors

Our brand colors are:

- Primary: Green (`bg-primary-500`, `text-primary-600`, etc.)
- Secondary: Gray (`bg-secondary-500`, `text-secondary-600`, etc.)
- Success: Green (`bg-success-500`, `text-success-600`, etc.)
- Error: Red (`bg-error-500`, `text-error-600`, etc.)
- Warning: Orange (`bg-warning-500`, `text-warning-600`, etc.)
- Info: Blue (`bg-info-500`, `text-info-600`, etc.)

## Best Practices

1. Always use the `neutral` color palette instead of `gray`
2. Use the provided utility classes whenever possible (`.card`, `.form-input`, `.toast`, etc.)
3. Form elements should use `shadow-sm` and `border-neutral-300`
4. Cards should use the `.card` or `.card-compact` class
5. Modals and tooltips should use the `.modal-container` class
6. Toast notifications should use the `.toast` class with a modifier like `.toast-success` 