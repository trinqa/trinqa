/* team-footer section motion — see README.md for the contract. */
(function () {
  'use strict';

  // No engine (reduced motion, or no IntersectionObserver) means nothing
  // here should run: the page must stay in its finished, fully-visible state.
  if (!window.tqMotion) return;

  tqMotion.ready(function () {
    // #who-we-are: heading -> pull quote -> member card, in that order.
    // The carousel itself (`trinqa-team-carousel`, inline in index.html) owns
    // `.swiper-slide` position/opacity/transform directly; we never select
    // `.swiper-slide` or `.swiper-wrapper` so there is nothing to fight.
    // Both slides' quotes/cards are revealed together — harmless, since the
    // inactive slide is already hidden by the carousel's own inline styles.
    tqMotion.reveal('#who-we-are h2', { type: 'up' });
    tqMotion.reveal('#who-we-are blockquote > div:first-child', { type: 'up', delay: 120 });
    tqMotion.reveal('#who-we-are img.absolute', { type: 'scale', delay: 200, stagger: 60 });
    tqMotion.reveal('#who-we-are figcaption', { type: 'up', delay: 240 });

    // footer: one restrained fade-in as the row enters the viewport. This is
    // the last thing on the page, so no stagger, no rise — just presence.
    tqMotion.reveal('footer', { type: 'fade' });

    // Tag the social links so team-footer.css can add the hover underline;
    // the anchors themselves are untouched (href, text, existing classes).
    var links = document.querySelectorAll('footer a[href]');
    for (var i = 0; i < links.length; i++) {
      links[i].classList.add('tq-footer-link');
    }
  });
})();
