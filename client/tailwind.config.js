import forms from "@tailwindcss/forms";

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Merriweather", "ui-serif", "Georgia", "serif"],
        body: ["Source Sans 3", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: [forms]
};
