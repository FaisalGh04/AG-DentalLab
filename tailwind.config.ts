import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "sans-serif"],
      },
      colors: {
        // Brand palette
        brand: {
          DEFAULT: "#275F4D",
          50: "#F3F8F5",
          100: "#E4F0EA",
          200: "#C9E0D4",
          300: "#9FC6B3",
          400: "#6DA68E",
          500: "#47856D",
          600: "#2F6D58",
          700: "#275F4D",
          800: "#1E493D",
          900: "#17382F",
          950: "#0B211C",
        },
        // Gold — accent only, used sparingly for luxury highlights.
        gold: {
          DEFAULT: "#A98643",
          50: "#FBF7EF",
          100: "#F3E9D3",
          200: "#E7D2A6",
          300: "#D8B876",
          400: "#C39E53",
          500: "#A98643",
          600: "#8C6C35",
          700: "#6E552B",
          800: "#544021",
          900: "#3B2D17",
        },
        ink: "#121816",
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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(18,24,22,0.04), 0 14px 34px rgba(39,95,77,0.07)",
        glow: "0 0 0 1px rgba(39,95,77,0.13), 0 26px 80px -32px rgba(39,95,77,0.48)",
        card: "0 1px 2px rgba(18,24,22,0.05), 0 18px 56px -30px rgba(39,95,77,0.28)",
        "inner-glow": "inset 0 1px 0 rgba(255,255,255,0.82), inset 0 -1px 0 rgba(39,95,77,0.06)",
        gold: "0 0 0 1px rgba(169,134,67,0.22), 0 24px 70px -30px rgba(169,134,67,0.5)",
        "gold-soft": "0 10px 40px -18px rgba(169,134,67,0.4)",
        lift: "0 2px 4px rgba(18,24,22,0.04), 0 30px 80px -34px rgba(39,95,77,0.42)",
      },
      backgroundImage: {
        "grid-brand":
          "radial-gradient(circle at 1px 1px, rgba(39,95,77,0.10) 1px, transparent 0)",
        "brand-gradient":
          "linear-gradient(135deg, #17382F 0%, #275F4D 54%, #7BB79D 100%)",
        "gold-gradient":
          "linear-gradient(135deg, #8C6C35 0%, #C39E53 46%, #E7D2A6 100%)",
        "surface-sheen":
          "radial-gradient(circle at 18% 0%, rgba(123,183,157,0.22), transparent 30%), radial-gradient(circle at 82% 8%, rgba(39,95,77,0.16), transparent 34%)",
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
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.8" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "spin-reverse": {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" },
        },
        "aurora-1": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "33%": { transform: "translate3d(6%,-4%,0) scale(1.12)" },
          "66%": { transform: "translate3d(-5%,5%,0) scale(0.95)" },
        },
        "aurora-2": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "33%": { transform: "translate3d(-7%,5%,0) scale(1.08)" },
          "66%": { transform: "translate3d(5%,-6%,0) scale(1.15)" },
        },
        "gold-sheen": {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s infinite",
        float: "float 6s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.4,0,0.2,1) infinite",
        "spin-slow": "spin-slow 26s linear infinite",
        "spin-reverse": "spin-reverse 34s linear infinite",
        "aurora-1": "aurora-1 22s ease-in-out infinite",
        "aurora-2": "aurora-2 28s ease-in-out infinite",
        "gold-sheen": "gold-sheen 6s linear infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
