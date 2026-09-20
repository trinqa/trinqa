/* faq-contact section motion — see README.md for the contract. */
(function () {
  'use strict';

  if (typeof window.tqMotion === 'undefined') return;

  tqMotion.ready(function () {
    // #faqs — heading first, then the ten question rows in a stagger as the
    // section enters view. The accordion itself (open/close height animation,
    // the chevron rotate) lives in the page's own inline scripts
    // (`ANSWERS=` / `trinqa-faq-motion`) and is left completely alone here.
    tqMotion.reveal('#faqs h2');
    tqMotion.reveal('#faqs button[aria-controls^="faq-answer"]', {
      stagger: 70,
      delay: 120
    });

    // #contact — heading, then the illustration, then the CTA row that opens
    // the waitlist modal. The modal (`trinqa-waitlist-overlay`) and its form
    // are owned by `trinqa-waitlist-js`: it is a position:fixed dialog hidden
    // via its own opacity/pointer-events toggle, so it is intentionally not
    // scroll-revealed here — doing so would fight that hidden state and could
    // flash the overlay open. Its input/submit only get static hover/focus
    // styling from faq-contact.css.
    tqMotion.reveal('#contact h2');
    tqMotion.reveal('#trinqa-close-art', { type: 'scale', delay: 120 });
    tqMotion.reveal('#contact h2 ~ div', { delay: 240 });
  });
})();
