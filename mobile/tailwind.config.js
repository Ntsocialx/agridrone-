/** @type {import('tailwindcss').Config} */
const plugin = require("tailwindcss/plugin");

// Palette taken from HelloChoice's calculator form: teal primary, white forms on a
// light grey page, thin grey borders, with pink/yellow accents used only for meaning.
module.exports = {
  content: ["./src/app/**/*.{js,jsx,ts,tsx}", "./src/components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // "class" lets Expo apply app.json's light-only setting on web without NativeWind throwing.
  darkMode: "class",
  // Inter ships one font file per weight, so weights map to font families (see plugin below).
  corePlugins: { fontWeight: false },
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: "#1dafa1", // buttons, selected states
          ink: "#0e7c72", // teal text and links (readable on white)
          light: "#7fe0d6", // teal text on dark photos
          soft: "#e6f6f4", // tinted panels
        },
        ink: "#22262a", // body text and titles
        muted: "#66737f", // secondary text
        page: "#fafafa", // screen background
        paper: "#ffffff", // cards, forms, inputs
        field: "#f3f5f7", // read-only inputs, subtle fills
        line: "#e0e6eb", // borders and dividers
        pink: "#ec4899", // alerts and the unread badge
        sun: "#eab308", // compliance hold and rating stars
        danger: "#d64545", // errors
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "10px",
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        ".font-normal": { fontFamily: "Inter_400Regular" },
        ".font-medium": { fontFamily: "Inter_500Medium" },
        ".font-semibold": { fontFamily: "Inter_600SemiBold" },
        ".font-bold": { fontFamily: "Inter_700Bold" },
      });
    }),
  ],
};
