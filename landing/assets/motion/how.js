/* how section motion — see README.md for the contract. */
(function () {
  'use strict';

  if (!window.tqMotion) return;

  var reducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  tqMotion.ready(function () {
    var section = document.getElementById('services');
    if (!section) return;

    var cards = section.querySelectorAll('article');
    if (!cards.length) return;

    // Header reveals first, subtitle right after, then the five cards
    // follow in a stagger.
    // The subtitle shares its "text-dark-muted" class with every card's
    // body copy, so it's targeted structurally (h2's next sibling) instead
    // of by class, to avoid also catching — and double-animating — the
    // copy already covered by the card-level reveal below.
    tqMotion.reveal('#services h2', { type: 'up' });
    tqMotion.reveal('#services h2 + div', { type: 'fade', delay: 100 });
    tqMotion.reveal(cards, { type: 'up', stagger: 90, delay: 180 });

    if (reducedMotion) return;

    // Slight parallax on each card's illustration wrapper as the section
    // scrolls. The wrapper (not the <img>) is animated because the image
    // itself is pinned with `transform: none !important` upstream.
    var MAX_SHIFT = 8; // total px of travel, +/-4px around center
    var wrappers = [];
    for (var i = 0; i < cards.length; i++) {
      var wrap = cards[i].querySelector(':scope > .relative.my-auto');
      if (wrap) wrappers.push({ card: cards[i], wrap: wrap });
    }
    if (!wrappers.length) return;

    tqMotion.onScroll(function () {
      var offsets = new Array(wrappers.length);
      for (var i = 0; i < wrappers.length; i++) {
        offsets[i] = (tqMotion.progress(wrappers[i].card) - 0.5) * MAX_SHIFT;
      }
      for (var j = 0; j < wrappers.length; j++) {
        wrappers[j].wrap.style.transform = 'translate3d(0, ' + offsets[j].toFixed(2) + 'px, 0)';
      }
    });
  });
})();
