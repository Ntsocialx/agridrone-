/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/app/**/*.{js,jsx,ts,tsx}", "./src/components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        forest: {
          950: "#06261c",
          900: "#0a3326",
          800: "#124635",
          700: "#1d5c45",
        },
        lime: {
          DEFAULT: "#b8f13e",
          soft: "#e8f9bd",
        },
        cream: "#f7f5ed",
        paper: "#fffef9",
        muted: "#64706a",
        danger: "#c84b42",
      },
      borderRadius: {
        'sm': '12px',
        'md': '18px',
        'lg': '26px',
      },
    },
  },
  plugins: [],
};
