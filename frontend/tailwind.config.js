/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Accent scale, remapped to the Tropical punch teal. 300/400 are the
        // darker readable teals for TEXT on cream; 500/600 are the palette teal.
        brand: {
          50: '#E6F6F5',
          100: '#CDEDEC',
          200: '#9ADAD8',
          300: '#047676',
          400: '#047676',
          500: '#069494',
          600: '#057A7A',
          700: '#046666',
          800: '#055F5F',
          900: '#0A2F2F',
        },
        // The app was built dark-first with `slate-*` utilities everywhere
        // (950 = page, 900 = card, 100 = main text...). Rather than rewrite
        // ~25 files, the slate scale is re-pointed at the LIGHT theme: low
        // numbers are now ink (text), high numbers are cream/white surfaces.
        slate: {
          50: '#0A2F2F',
          100: '#0A2F2F',
          200: '#0A2F2F',
          300: '#1F4545',
          400: '#3F5856',
          500: '#5F7371',
          600: '#8FA09D',
          700: '#D9CCB0',
          800: '#EADFC8',
          900: '#FFFFFF',
          950: '#FFF8EC',
        },
        // "Tropical punch" — used by the public marketing landing only.
        punch: {
          orange: '#FF8243',
          pink: '#FFC0CB',
          yellow: '#FCE883',
          teal: '#069494',
          // Same teal, darkened until white text on it passes WCAG AA (5.4:1).
          tealdark: '#057A7A',
          ink: '#0A2F2F',
          cream: '#FFF8EC',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0) rotate(var(--r, 0deg))' },
          '50%': { transform: 'translateY(-10px) rotate(var(--r, 0deg))' },
        },
      },
      animation: {
        marquee: 'marquee 28s linear infinite',
        floaty: 'floaty 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
