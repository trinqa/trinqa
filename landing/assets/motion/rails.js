/* rails section motion — see README.md for the contract. */
(function () {
  'use strict';

  // No tqMotion means motion.js bailed (reduced-motion or no
  // IntersectionObserver) or never ran (no JS) — leave the DOM untouched.
  if (typeof window === 'undefined' || !window.tqMotion) return;

  window.tqMotion.ready(function () {
    // #tq-partners: four ramp-provider logos stagger in as the hero row
    // comes into view. The hover lift itself is pure CSS (rails.css); no
    // continuous drift/marquee — with only four logos a loop would look
    // thin and buys nothing but a perpetual animation cost.
    window.tqMotion.reveal('#tq-partners img', { type: 'up', stagger: 70 });

    // #trial-week: heading leads, then the supporting copy (staggered line
    // by line), then the CTA arrives last.
    window.tqMotion.reveal('#trial-week h2', { type: 'up' });
    window.tqMotion.reveal('#trial-week p', { type: 'up', stagger: 60, delay: 140 });
    window.tqMotion.reveal('#trial-week a', { type: 'up', delay: 280 });
  });
})();
