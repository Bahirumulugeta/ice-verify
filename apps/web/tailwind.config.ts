import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: 'rgb(11 61 74 / <alpha-value>)',
          muted: 'rgb(26 85 102 / <alpha-value>)',
          subtle: 'rgb(90 122 133 / <alpha-value>)',
        },
        ice: {
          DEFAULT: 'rgb(79 176 198 / <alpha-value>)',
          light: 'rgb(126 201 217 / <alpha-value>)',
          dark: 'rgb(45 143 166 / <alpha-value>)',
        },
        atmosphere: {
          DEFAULT: 'rgb(247 245 240 / <alpha-value>)',
          warm: 'rgb(240 235 227 / <alpha-value>)',
          cool: 'rgb(232 242 245 / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(250 249 246 / <alpha-value>)',
          raised: 'rgb(255 255 255 / <alpha-value>)',
          border: 'rgba(11, 61, 74, 0.1)',
        },
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 24px -4px rgba(11, 61, 74, 0.08)',
        glow: '0 0 0 1px rgba(79, 176, 198, 0.2), 0 8px 32px -8px rgba(79, 176, 198, 0.25)',
      },
      backgroundImage: {
        'hero-gradient':
          'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(79, 176, 198, 0.18) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(11, 61, 74, 0.06) 0%, transparent 50%)',
        'mesh-pattern':
          'linear-gradient(135deg, rgba(79, 176, 198, 0.04) 25%, transparent 25%), linear-gradient(225deg, rgba(79, 176, 198, 0.04) 25%, transparent 25%), linear-gradient(45deg, rgba(79, 176, 198, 0.04) 25%, transparent 25%), linear-gradient(315deg, rgba(79, 176, 198, 0.04) 25%, transparent 25%)',
      },
    },
  },
  plugins: [],
};

export default config;
