## Memory Game – Next.js + Tailwind + shadcn-style UI

This is a rebuilt version of the original Christmas memory game as a **Next.js (Pages Router)** app using **Tailwind CSS** and a small **shadcn-style Button component**, optimized to run inside an iframe.

### Tech stack

- **Next.js** (Pages Router)
- **React**
- **Tailwind CSS**
- **Custom shadcn-style `Button` component** in `components/ui/button.tsx`
- **canvas-confetti** for win animations

### Getting started

- **Install dependencies**

```bash
npm install
```

- **Run the dev server**

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser.

### Embedding in an iframe

The main game lives at the root route `/`. To embed it in another site:

```html
<iframe
  src="https://your-domain.com/?embed=1"
  width="420"
  height="720"
  style="border:0;overflow:hidden;"
  scrolling="no"
></iframe>
```

- The `?embed=1` query keeps the UI chrome minimal and works well in constrained iframe sizes.

### Notes

- The original Google Sheets + Google Forms integration for attempts and voucher assignment is preserved and runs client-side.
- Audio effects use the Web Audio API and are activated on user interaction (first click).


