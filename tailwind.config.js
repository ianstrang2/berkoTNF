/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E3F2FD',
          100: '#BBDEFB',
          200: '#90CAF9',
          300: '#64B5F6',
          400: '#42A5F5',
          500: '#2196F3',
          600: '#1E88E5',
          700: '#1976D2',
          800: '#1565C0',
          900: '#0D47A1',
        },
        secondary: {
          50: '#ECEFF1',
          100: '#CFD8DC',
          200: '#B0BEC5',
          300: '#90A4AE',
          400: '#78909C',
          500: '#607D8B',
          600: '#546E7A',
          700: '#455A64',
          800: '#37474F',
          900: '#263238',
        },
        success: {
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#4CAF50',
          600: '#43A047',
          700: '#388E3C',
          800: '#2E7D32',
          900: '#1B5E20',
        },
        warning: {
          50: '#FFF8E1',
          100: '#FFECB3',
          200: '#FFE082',
          300: '#FFD54F',
          400: '#FFCA28',
          500: '#FF9800',
          600: '#FB8C00',
          700: '#F57C00',
          800: '#EF6C00',
          900: '#E65100',
        },
        error: {
          50: '#FFEBEE',
          100: '#FFCDD2',
          200: '#EF9A9A',
          300: '#E57373',
          400: '#EF5350',
          500: '#F44336',
          600: '#E53935',
          700: '#D32F2F',
          800: '#C62828',
          900: '#B71C1C',
        },
        info: {
          50: '#E3F2FD',
          100: '#BBDEFB',
          500: '#2196F3',
          600: '#1E88E5',
          700: '#1976D2',
          800: '#1565C0',
          900: '#0D47A1',
        },
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#EEEEEE',
          300: '#E0E0E0',
          400: '#BDBDBD',
          500: '#9E9E9E',
          600: '#757575',
          700: '#616161',
          800: '#424242',
          900: '#212121',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Heading sizes
        '4xl': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '700' }], // 36px - Page Title
        '3xl': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '700' }], // 30px
        '2xl': ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],     // 24px - Section Heading
        'xl': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],  // 20px - Card Title
        'lg': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '500' }], // 18px - Subtitle
        // Body text
        'base': ['1rem', { lineHeight: '1.5rem' }],                       // 16px - Regular
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],                    // 14px - Small
        'xs': ['0.75rem', { lineHeight: '1rem' }],                        // 12px - Extra Small
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      spacing: {
        // Standard spacing scale is already good with Tailwind defaults,
        // but we'll add specific values for consistency
        'page': '1.5rem',    // 24px for page sections
        'card': '1.5rem',    // 24px for card padding
        'section': '1.5rem', // 24px between sections
        'element': '1rem',   // 16px between elements
        'related': '0.5rem', // 8px between related elements
        'grid': '1.5rem',    // 24px for grid gaps
        'form': '1rem',      // 16px for form element gaps
      },
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',    // 2px
        DEFAULT: '0.25rem',  // 4px
        'md': '0.375rem',    // 6px
        'lg': '0.5rem',      // 8px - Button radius
        'xl': '0.75rem',     // 12px
        '2xl': '1rem',       // 16px
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', 
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        'elevated': '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
      },
      // Component-specific theme extensions
      button: {
        // These aren't built-in Tailwind properties but can be used as a reference
        // for consistent component styling
        variants: {
          primary: 'bg-primary-500 hover:bg-primary-600 text-white',
          secondary: 'bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700',
          outline: 'border border-primary-500 text-primary-600 hover:bg-primary-50',
          danger: 'bg-error-500 hover:bg-error-600 text-white',
        },
        sizes: {
          sm: 'px-3 py-1.5 text-xs rounded',
          md: 'px-4 py-2 text-sm rounded-md',
          lg: 'px-5 py-2.5 text-base rounded-lg',
        },
      },
      card: {
        // Custom reference for card variants
        variants: {
          default: 'bg-white shadow-sm rounded-xl',
          bordered: 'bg-white border border-neutral-200 rounded-xl',
          flush: 'bg-white rounded-xl',
        },
      },
      table: {
        // Custom reference for table options
        options: {
          responsive: 'min-w-full divide-y divide-neutral-200 overflow-x-auto',
          striped: 'even:bg-neutral-50',
          bordered: 'border border-neutral-200',
          compact: 'px-3 py-1',
        },
      },
    },
  },
  plugins: [],
} 