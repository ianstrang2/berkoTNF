# PlayerPath Design System

This document outlines the design system for the PlayerPath application, ensuring consistent styling and user experience across all components.

## Table of Contents
1. [Colors](#colors)
2. [Typography](#typography)
3. [Spacing](#spacing)
4. [Components](#components)
   - [Buttons](#buttons)
   - [Cards](#cards)
   - [Tables](#tables)
   - [Tabs](#tabs)
5. [Layouts](#layouts)
6. [Mobile Adaptations](#mobile-adaptations)
7. [Naming Conventions](#naming-conventions)

## Colors

### Primary Colors
- **Primary**: Green - Used for primary buttons, links, and key UI elements
  ```
  primary-50: #E8F5E9
  primary-100: #C8E6C9
  primary-200: #A5D6A7
  primary-300: #81C784
  primary-400: #66BB6A
  primary-500: #4CAF50 (base)
  primary-600: #43A047
  primary-700: #388E3C
  primary-800: #2E7D32
  primary-900: #1B5E20
  ```

### Secondary Colors
- **Secondary**: Gray/Blue - Used for secondary UI elements
  ```
  secondary-50: #ECEFF1
  secondary-100: #CFD8DC
  secondary-200: #B0BEC5
  secondary-300: #90A4AE
  secondary-400: #78909C
  secondary-500: #607D8B (base)
  secondary-600: #546E7A
  secondary-700: #455A64
  secondary-800: #37474F
  secondary-900: #263238
  ```

### Neutral Colors
- **Neutral**: Grayscale - Used for text, backgrounds, and borders
  ```
  neutral-50: #FAFAFA
  neutral-100: #F5F5F5
  neutral-200: #EEEEEE
  neutral-300: #E0E0E0
  neutral-400: #BDBDBD
  neutral-500: #9E9E9E
  neutral-600: #757575
  neutral-700: #616161
  neutral-800: #424242
  neutral-900: #212121
  ```

### Semantic Colors
- **Success**: `success-500` (`#4CAF50`) - Positive actions and success states
- **Warning**: `warning-500` (`#FF9800`) - Caution states and warnings
- **Error**: `error-500` (`#F44336`) - Error states and critical actions
- **Info**: `info-500` (`#2196F3`) - Informational messages and states

## Typography

### Font Family
- System font stack (Tailwind's default sans-serif)

### Text Sizes
- **Headings**:
  - Page Title: `text-4xl font-bold` (36px)
  - Section Heading: `text-2xl font-bold` (24px)
  - Card Title: `text-xl font-semibold` (20px)
  - Subtitle: `text-lg font-medium` (18px)
  
- **Body Text**:
  - Regular: `text-base` (16px)
  - Small: `text-sm` (14px)
  - Extra Small: `text-xs` (12px)

### Font Weights
- **Bold**: `font-bold` (700) - Used for page titles and important text
- **Semibold**: `font-semibold` (600) - Used for section headings
- **Medium**: `font-medium` (500) - Used for emphasized text
- **Regular**: `font-normal` (400) - Used for body text

## Spacing

### Container Padding
- Page container: `px-4 py-6`
- Card padding: `p-6`
- Table cell padding: `px-3 py-2`
- Mobile padding adjustments: `px-4 sm:px-6 lg:px-8`

### Margins
- Between sections: `mb-6` or `my-6` (1.5rem, 24px)
- Between elements: `mb-4` (1rem, 16px)
- Between related elements: `mb-2` (0.5rem, 8px)
- Gap in grids: `gap-6` between cards, `gap-4` between form elements

## Components

### Buttons

Four variants are available:
- **Primary**: Used for primary actions
- **Secondary**: Used for secondary actions
- **Outline**: Used for tertiary actions
- **Danger**: Used for destructive actions

```jsx
import Button from '@/components/ui/Button';

// Primary button
<Button variant="primary" onClick={handleClick}>
  Save Changes
</Button>

// Secondary button
<Button variant="secondary" onClick={handleCancel}>
  Cancel
</Button>

// Outline button
<Button variant="outline" onClick={handleReset}>
  Reset
</Button>

// Danger button
<Button variant="danger" onClick={handleDelete}>
  Delete
</Button>

// With icon
<Button 
  variant="primary" 
  icon={<svg>...</svg>}
  iconPosition="left"
>
  Back to Dashboard
</Button>
```

#### Button Sizes
- **Small**: `size="sm"` - Compact buttons
- **Medium**: `size="md"` (default) - Standard buttons
- **Large**: `size="lg"` - Call to action buttons

### Cards

```jsx
import Card from '@/components/ui/Card';

// Basic card
<Card>
  <p>Card content goes here</p>
</Card>

// Card with title
<Card title="Card Title">
  <p>Card content goes here</p>
</Card>

// Card with title and icon
<Card 
  title="Latest Stats" 
  icon={<svg className="w-6 h-6">...</svg>}
>
  <p>Card content goes here</p>
</Card>

// Card with footer
<Card 
  title="User Information"
  footer={<Button variant="primary">Save</Button>}
>
  <p>Card content goes here</p>
</Card>
```

#### Card Variants
- **Default**: `variant="default"` - Card with shadow
- **Bordered**: `variant="bordered"` - Card with border
- **Flush**: `variant="flush"` - Card without shadow or border

### Tables

```jsx
import { Table, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/Table';

<Table responsive striped>
  <TableHead>
    <TableRow>
      <TableCell isHeader>Name</TableCell>
      <TableCell isHeader>Position</TableCell>
      <TableCell isHeader align="right">Goals</TableCell>
    </TableRow>
  </TableHead>
  <TableBody>
    <TableRow>
      <TableCell>Player One</TableCell>
      <TableCell>Forward</TableCell>
      <TableCell align="right">12</TableCell>
    </TableRow>
    {/* More rows */}
  </TableBody>
</Table>
```

#### Table Options
- **responsive**: Makes the table horizontally scrollable on mobile
- **striped**: Adds alternating row colors
- **bordered**: Adds outer border to the table
- **compact**: Reduces padding in table cells

### Tabs

```jsx
import { Tabs, Tab } from '@/components/ui/Tabs';

<Tabs defaultTab={0} onChange={handleTabChange}>
  <Tab label="Overall">
    <p>Overall content goes here</p>
  </Tab>
  <Tab label="Statistics">
    <p>Statistics content goes here</p>
  </Tab>
  <Tab label="History">
    <p>History content goes here</p>
  </Tab>
</Tabs>
```

#### Tab Variants
- **Underline**: `variant="underline"` (default) - Tabs with underline indicator
- **Pills**: `variant="pills"` - Pill-shaped tabs
- **Cards**: `variant="cards"` - Tabs that look like cards

## Layouts

### Dashboard Layout
Used for the main app view with multiple card options:

```jsx
<main className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
  <div className="py-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary-600 mb-8">
          Dashboard Title
        </h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card components */}
      </div>
    </div>
  </div>
</main>
```

### Content Page Layout
Used for detail views and forms:

```jsx
<div className="py-6">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <Button 
      variant="primary" 
      icon={<svg>...</svg>}
      onClick={goBack}
    >
      Back
    </Button>
    <div className="mt-6">
      {/* Page content */}
    </div>
  </div>
</div>
```

## Mobile Adaptations

### Responsive Breakpoints
- **Small (sm)**: 640px - Small tablets and large phones
- **Medium (md)**: 768px - Tablets and small laptops
- **Large (lg)**: 1024px - Laptops and desktops
- **Extra large (xl)**: 1280px - Large desktop screens

### Mobile-First Guidelines
1. **Tables**: Wrap tables in `<div className="overflow-x-auto">` for horizontal scrolling
2. **Grid Layouts**: Use `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for responsive grids
3. **Text Size**: Adjust text sizes for mobile: `text-base sm:text-lg md:text-xl`
4. **Padding/Margins**: Use responsive utilities: `px-4 sm:px-6 lg:px-8`
5. **Stack Elements**: Elements that appear side-by-side on desktop should stack on mobile
6. **Hidden Elements**: Use `hidden md:block` to hide non-critical elements on mobile

## Naming Conventions

### CSS Class Naming
- Follow Tailwind's utility-first approach
- Use semantic class names for custom components
- Prefix custom classes with `pp-` (PlayerPath)

### Component Props
- Use camelCase for prop names: `onClick`, `defaultValue`
- Use boolean props without values for flags: `disabled`, `required`
- Use consistent naming patterns:
  - Events: `onClick`, `onChange`, `onSubmit`
  - Variants: `variant="primary"`
  - Sizes: `size="md"` 