const path = require("path");

const toPosixPath = (p) => p.split(path.sep).join("/");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    toPosixPath(path.join(__dirname, "app/**/*.{js,ts,jsx,tsx,mdx}")),
    toPosixPath(path.join(__dirname, "components/**/*.{js,ts,jsx,tsx,mdx}")),
  ],
  theme: {
    extend: {
      // Colors and fonts sampled directly from alyssanobriga.com's computed styles.
      colors: {
        navy: "#051C46", // heading color
        gold: "#B6A28C", // italic accent / eyebrow label color
        teal: "#0ABAB5", // primary CTA color
        cream: "#FBF8F4",
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-montserrat)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
