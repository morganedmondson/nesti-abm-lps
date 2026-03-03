import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#2764EB',
          hover: '#1e56d1',
          active: '#1a4bb8',
          contrast: '#FFFFFF',
        },
        text: '#0E121B',
        surface: '#FFFFFF',
        background: '#F9FAFB',
        destructive: '#D32F2F',
        success: '#388E3C',
        alert: '#F57C00',
        border: '#E3E4E9',
        gray: {
          10: '#F7F7F7',
          20: '#F2F2F2',
          30: '#E3E4E9',
          40: '#C7C7C7',
          50: '#737373',
          60: '#636363',
          70: '#6A717F',
          80: '#1A1A1A',
        },
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
        '32': '128px',
      },
      fontSize: {
        'display': ['44px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '600' }],
        'h1': ['32px', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '600' }],
        'h2': ['24px', { lineHeight: '1.25', fontWeight: '500' }],
        'h3': ['18px', { lineHeight: '1.35', fontWeight: '500' }],
        'sub': ['16px', { lineHeight: '1.4', fontWeight: '500' }],
        'body': ['14px', { lineHeight: '1.45', fontWeight: '400' }],
        'small': ['13px', { lineHeight: '1.45', fontWeight: '400' }],
        'caption': ['11px', { lineHeight: '1.4', letterSpacing: '0.01em', fontWeight: '500' }],
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        soft: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px -2px rgba(0,0,0,0.06)',
        elevated: '0 2px 8px -2px rgba(0,0,0,0.08), 0 8px 20px -4px rgba(0,0,0,0.07)',
        glow: '0 0 0 1px rgba(39,100,235,0.08), 0 0 0 4px rgba(39,100,235,0.06)',
        input: '0 2px 6px -1px rgba(0,0,0,0.06), 0 8px 24px -4px rgba(0,0,0,0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}

export default config
