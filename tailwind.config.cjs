/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        "navy-deep": "#001033",
        "navy-mid": "#001a5c",
        "navy-bright": "#0d2680",
        "brand-blue": "#1138c4",
        "brand-bright": "#2156e8",
        "brand-glow": "#3a7bff",
        gold: "#f5c842",
        "gold-light": "#fde98a",
        "gold-deep": "#c9962a"
      },
      fontFamily: {
        sans: ["Montserrat", "system-ui", "-apple-system", "Segoe UI", "sans-serif"]
      },
      /* Each step has a comfortable min (governs the ~700px preview) and a
         generous max (governs the 2160px 4K TV) so the hierarchy stays gentle
         at both ends — display is never absurdly huge, labels never tiny. */
      fontSize: {
        display: ["clamp(2.4rem, 5.4vw, 8rem)", { lineHeight: "1.06", letterSpacing: "-0.02em", fontWeight: "900" }],
        "display-xl": ["clamp(3rem, 7vw, 10rem)", { lineHeight: "1.02", letterSpacing: "-0.025em", fontWeight: "900" }],
        h1: ["clamp(2rem, 4.2vw, 6rem)", { lineHeight: "1.1", letterSpacing: "-0.015em", fontWeight: "700" }],
        h2: ["clamp(1.6rem, 3.2vw, 4.2rem)", { lineHeight: "1.18", fontWeight: "600" }],
        body: ["clamp(1.2rem, 2.4vw, 3rem)", { lineHeight: "1.4", fontWeight: "400" }],
        label: ["clamp(1.1rem, 2.2vw, 2.7rem)", { lineHeight: "1.25", fontWeight: "600", letterSpacing: "0.02em" }],
        caption: ["clamp(1rem, 1.9vw, 2.3rem)", { lineHeight: "1.35", fontWeight: "500", letterSpacing: "0.04em" }],
        eyebrow: ["clamp(0.92rem, 1.6vw, 1.95rem)", { lineHeight: "1.2", fontWeight: "700", letterSpacing: "0.26em" }]
      },
      boxShadow: {
        glass: "0 8px 40px rgba(0, 16, 51, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
        "glass-lg": "0 16px 64px rgba(0, 16, 51, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.14)",
        "gold-glow": "0 12px 40px rgba(245, 200, 66, 0.35), 0 0 0 1px rgba(245, 200, 66, 0.4)",
        "gold-glow-lg": "0 24px 60px rgba(245, 200, 66, 0.45), 0 0 0 1px rgba(245, 200, 66, 0.55)"
      },
      backdropBlur: {
        xs: "4px",
        glass: "24px"
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "spring-strong": "cubic-bezier(0.68, -0.4, 0.27, 1.45)",
        "out-soft": "cubic-bezier(0.22, 1, 0.36, 1)"
      },
      animation: {
        shimmer: "shimmer 5s ease-in-out infinite",
        "logo-shimmer": "logoShimmer 6s ease-in-out infinite",
        "fade-in-up": "fadeInUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "slide-up": "slideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-soft": "pulseSoft 2.6s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2.8s ease-in-out infinite",
        breathe: "breathe 8s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        shake: "shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both",
        "bounce-pop": "bouncePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "spin-slow": "spinSlow 14s linear infinite"
      },
      keyframes: {
        bouncePop: {
          "0%": { transform: "scale(1)" },
          "30%": { transform: "scale(1.2)" },
          "55%": { transform: "scale(0.9)" },
          "78%": { transform: "scale(1.07)" },
          "100%": { transform: "scale(1)" }
        },
        spinSlow: {
          to: { transform: "rotate(360deg)" }
        },
        shimmer: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" }
        },
        logoShimmer: {
          "0%, 100%": { filter: "drop-shadow(0 0 18px rgba(58, 123, 255, 0.18)) brightness(1)" },
          "50%": { filter: "drop-shadow(0 0 36px rgba(58, 123, 255, 0.45)) brightness(1.08)" }
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(30px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(40px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.85", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.04)" }
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(245, 200, 66, 0.55), 0 12px 40px rgba(245, 200, 66, 0.32)" },
          "50%": { boxShadow: "0 0 0 18px rgba(245, 200, 66, 0), 0 18px 56px rgba(245, 200, 66, 0.55)" }
        },
        breathe: {
          "0%, 100%": { opacity: "0.5", transform: "translate(-50%, -50%) scale(1)" },
          "50%": { opacity: "0.85", transform: "translate(-50%, -50%) scale(1.08)" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" }
        },
        shake: {
          "10%, 90%": { transform: "translateX(-2px)" },
          "20%, 80%": { transform: "translateX(4px)" },
          "30%, 50%, 70%": { transform: "translateX(-8px)" },
          "40%, 60%": { transform: "translateX(8px)" }
        }
      }
    }
  },
  plugins: []
};
