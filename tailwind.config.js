/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Add your custom brand colors here
        brand: {
          dark: '#211C84',
          medium: '#4D55CC',
          light: '#7A73D1',
          'very-light': '#B5A8D5', // Use quotes for keys with hyphens
        },
        // Appointment status colors
        // Appointment status colors - Note: 'booked' is defined twice, consolidating
        booked: {
          icon: 'rgb(19, 19, 18)',
          bg: 'rgb(13, 254, 28)',
          border: 'rgba(45, 220, 8, 0.86)', // Updated booked border color
          ring: 'rgba(71, 242, 23, 0.5)',
        },
        canceled: {
          icon: 'rgb(253, 226, 3)',
          bg: 'rgb(255, 0, 0)',
          border: 'rgb(232, 47, 47)', // Updated canceled border color
          ring: 'rgba(246, 108, 108, 0.5)',
        },
        // Removed duplicate 'booked' definition
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        pulse: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: .5 },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shake: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both', // Added shake animation definition
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
