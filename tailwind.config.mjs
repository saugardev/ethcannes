import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-ibm-plex-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: 'rgb(var(--background))',
        foreground: 'rgb(var(--foreground))',
        'card-background': 'rgb(var(--card-background))',
        'text-primary': 'rgb(var(--text-primary))',
        'text-secondary': 'rgb(var(--text-secondary))',
        accent: 'rgb(var(--accent))',
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: ["light", "dark"], // You can customize themes here
    darkTheme: "dark", // name of one of the included themes for dark mode
    base: true, // applies background color and foreground color for root element by default
    styled: true, // include daisyUI colors and design decisions for all components
    utils: true, // adds responsive and modifier utility classes
    prefix: "", // prefix for daisyUI classnames (components, modifiers and responsive class names. Not colors)
    logs: true, // Shows info about daisyUI version and used config in the console when building your CSS
    themeRoot: ":root", // The element that receives theme color CSS variables
  },
} 