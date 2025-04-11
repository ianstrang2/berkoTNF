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
        slate: {
          500: '#67748e'
        },
      },
      fontFamily: {
        sans: ['Open Sans', 'Inter', 'system-ui', 'sans-serif'],
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
        '2.7': '0.675rem',
      },
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',    // 2px
        DEFAULT: '0.25rem',  // 4px
        'md': '0.375rem',    // 6px
        'lg': '0.5rem',      // 8px - Button radius
        'xl': '0.75rem',     // 12px
        '2xl': '1rem',       // 16px
        '3xl': '1.5rem',     // 24px
        '4xl': '2rem',       // 32px
        'full': '9999px',
        'circle': '50%',
        'blur': '40px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', 
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'card-base': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        'elevated-base': '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
        // Soft UI shadows
        'soft-xxs': '0 1px 5px 1px #ddd',
        'soft-xs': '0 3px 5px -1px rgba(0,0,0,.09),0 2px 3px -1px rgba(0,0,0,.07)',
        'soft-sm': '0 .25rem .375rem -.0625rem hsla(0,0%,8%,.12),0 .125rem .25rem -.0625rem hsla(0,0%,8%,.07)',
        'soft-md': '0 4px 7px -1px rgba(0,0,0,.11),0 2px 4px -1px rgba(0,0,0,.07)',
        'soft-lg': '0 2px 12px 0 rgba(0,0,0,.16)',
        'soft-xl': '0 20px 27px 0 rgba(0,0,0,.05)',
        'soft-dark-xl': '0 2px 2px 0 rgba(0,0,0,.14),0 3px 1px -2px rgba(0,0,0,.2),0 1px 5px 0 rgba(0,0,0,.12)',
        'soft-2xl': '0 .3125rem .625rem 0 rgba(0,0,0,.12)',
        'soft-3xl': '0 8px 26px -4px hsla(0,0%,8%,.15),0 8px 9px -5px hsla(0,0%,8%,.06)',
        'soft-primary-outline': '0 0 0 2px #e9aede',
        'blur': 'inset 0 0 1px 1px hsla(0,0%,100%,.9),0 20px 27px 0 rgba(0,0,0,.05)',
        'dark-blur': 'inset 0 0 1px 1px hsla(0,0%,100%,.4),0 20px 27px 0 rgba(0,0,0,.05)',
      },
      // Animation keyframes
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'fade-in-down': {
          '0%': {
            opacity: '0',
            transform: 'translateY(-20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'fade-in-left': {
          '0%': {
            opacity: '0',
            transform: 'translateX(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        'fade-in-right': {
          '0%': {
            opacity: '0',
            transform: 'translateX(-20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        'scale-in': {
          '0%': {
            opacity: '0',
            transform: 'scale(0.95)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
        'scale-out': {
          '0%': {
            opacity: '1',
            transform: 'scale(1)',
          },
          '100%': {
            opacity: '0',
            transform: 'scale(0.95)',
          },
        },
      },
      // Animation utilities
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.3s ease-in',
        'fade-in-up': 'fade-in-up 0.4s ease-out',
        'fade-in-down': 'fade-in-down 0.4s ease-out',
        'fade-in-left': 'fade-in-left 0.4s ease-out',
        'fade-in-right': 'fade-in-right 0.4s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'scale-out': 'scale-out 0.3s ease-in',
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
          default: 'bg-white shadow rounded-xl',
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
      blur: {
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '30px',
        '3xl': '64px',
      },
      // Soft UI utility classes
      backgroundImage: {
        'gradient-to-t': 'linear-gradient(to top, var(--tw-gradient-stops))',
        'gradient-to-tr': 'linear-gradient(to top right, var(--tw-gradient-stops))',
        'gradient-to-r': 'linear-gradient(to right, var(--tw-gradient-stops))',
        'gradient-to-br': 'linear-gradient(to bottom right, var(--tw-gradient-stops))',
        'gradient-to-b': 'linear-gradient(to bottom, var(--tw-gradient-stops))',
        'gradient-to-bl': 'linear-gradient(to bottom left, var(--tw-gradient-stops))',
        'gradient-to-l': 'linear-gradient(to left, var(--tw-gradient-stops))',
        'gradient-to-tl': 'linear-gradient(to top left, var(--tw-gradient-stops))',
      },
      transitionTimingFunction: {
        'bounce': 'cubic-bezier(0.34, 1.61, 0.7, 1.3)',
        'soft': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'soft-in': 'cubic-bezier(0.42, 0, 1, 1)',
        'soft-in-out': 'cubic-bezier(0.42, 0, 0.58, 1)',
        'soft-out': 'cubic-bezier(0, 0, 0.58, 1)',
      },
    },
  },
  plugins: [
    require('./src/plugins/tailwind-standards.js'),
    function({ addUtilities }) {
      const newUtilities = {
        '.transform3d': {
          transform: 'perspective(999px) rotateX(0deg) translateZ(0)',
        },
        '.transform3d-hover': {
          transform: 'perspective(999px) rotateX(7deg) translate3d(0,-4px,5px)',
        },
        '.transform-dropdown': {
          transform: 'perspective(999px) rotateX(-10deg) translateZ(0) translate3d(0,37px,0)',
        },
        '.transform-dropdown-show': {
          transform: 'perspective(999px) rotateX(0deg) translateZ(0) translate3d(0,37px,5px)',
        },
        '.transform-dropdown-nested': {
          transform: 'perspective(999px) rotateX(0deg) translateZ(0) translateZ(5px)',
        },
        '.translate-z': {
          transform: 'translateZ(var(--tw-translate-z))',
        },
        '.bg-gradient': {
          backgroundImage: 'linear-gradient(var(--tw-gradient-angle), var(--tw-gradient-stops))',
        },
      }
      addUtilities(newUtilities)
    }
  ],
} 