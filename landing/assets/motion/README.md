# Landing motion layer

The public landing (`landing/index.html`) is a static Next.js export. Its RSC payload
fails to parse, so **React never hydrates** and nothing shipped by the framework runs:
no framer-motion, no React event handlers. Every interaction on the live page is plain
CSS plus hand-written scripts.

This directory is the motion layer for that reality.

## Files

| File | Owner | What it does |
|------|-------|--------------|
| `motion.css` | foundation | Tokens, reveal states, reduced-motion and no-JS fallbacks |
| `motion.js` | foundation | IntersectionObserver engine, exposes `window.tqMotion` |
| `hero.css` / `hero.js` | hero section | `#hero`, header and nav |
| `how.css` / `how.js` | how-it-works | `#how-it-works`, the five cards |
| `rails.css` / `rails.js` | rails | `#tq-partners` row and `#trial-week` |
| `faq-contact.css` / `faq-contact.js` | faq + contact | `#faqs`, `#contact` |
| `team-footer.css` / `team-footer.js` | team + chrome | `#who-we-are`, `footer` |

`index.html` loads all of them; module files must never edit `index.html`.

## Rules

1. **Never hide content that JS cannot reveal.** Hidden states live behind
   `.tq-motion`, a class `motion.js` adds only when it can run. A module that
   hides something on its own must gate it the same way.
2. **Respect `prefers-reduced-motion`.** The engine bails out entirely; a module
   that adds its own animation must also wrap it in the media query.
3. **Animate `opacity` and `transform` only.** Anything that changes layout
   costs Cumulative Layout Shift on a page that is mostly above-the-fold text.
4. **No dependencies, no CDN.** Vanilla JS, no build step, files are served as-is.
5. **Budget:** keep each module under 8 KB of CSS and 8 KB of JS.
6. **Prefix everything** with `tq-` so it cannot collide with the Tailwind classes
   already in the markup.
7. The page already carries hand-injected blocks (`trinqa-faq-motion`,
   `trinqa-team-carousel`, `trinqa-header-hide`, `trinqa-waitlist-css`, …).
   Read them before animating the same element, and do not fight them.

## Engine API

```js
tqMotion.ready(fn)                     // DOM-ready callback
tqMotion.reveal(target, options)       // register elements for scroll reveal
tqMotion.onScroll(fn)                  // rAF-throttled scroll subscription
tqMotion.progress(el)                  // 0..1 as the element crosses the viewport
```

`reveal()` options: `type` (`"up"` default, `"fade"`, `"left"`, `"right"`, `"scale"`),
`stagger` (ms per element), `delay` (ms before the first), `root` (scope element).

```js
tqMotion.ready(function () {
  tqMotion.reveal('#how-it-works article', { stagger: 80 });
});
```

## DOM map

Selectors verified against the current export.

| Section | Useful hooks |
|---------|--------------|
| header / nav | `header.fixed` (pointer-events-none wrapper), `header nav` |
| `#hero` | `#hero h1`, `#hero p`, the CTA anchors, `#tq-partners` (partner logos, 4 × `img`) |
| `#how-it-works` | `#services`, `#services h2`, 5 × `article`, each with `h3` and an `img.absolute` illustration |
| `#who-we-are` | `#testimonials`, `h2`, 2 × carousel `button`, member cards with `img.absolute` and `h3` |
| `#trial-week` | single centred `h2`, supporting copy |
| `#faqs` | 10 × `button[aria-controls^="faq-answer"]`, `#faq-answer-N` regions, `.faq-chevron` |
| `#contact` | `h2`, `#trinqa-close-art`, the waitlist form (see `trinqa-waitlist-css`) |
| `footer` | social anchors in a single flex row |

Design tokens the site already uses: easing `cubic-bezier(0.7, 0, 0, 1)`, base duration
500 ms, light surface `#efefef` / dark `#0a0a0a`, muted text `#707070`.
