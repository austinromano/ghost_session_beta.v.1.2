import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ghost: {
          bg: '#1A1A2E',
          surface: '#16213E',
          'surface-light': '#1E2A4A',
          'surface-hover': '#253355',
          border: '#2A2A4A',
          green: '#00FFC8',
          cyan: '#00E5FF',
          purple: '#8B5CF6',
          'online-green': '#00E676',
          'warning-amber': '#FFB74D',
          'error-red': '#FF5252',
          'host-gold': '#FFD700',
          'text-primary': '#EEEEF5',
          'text-secondary': '#8888A0',
          'text-muted': '#555570',
          'audio-track': '#42A5F5',
          'midi-track': '#8B5CF6',
          'drum-track': '#FF6B6B',
          'loop-track': '#4ECDC4',
          'waveform-bg': '#0D1117',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
