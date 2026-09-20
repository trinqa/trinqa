/* hero section motion — see README.md for the contract.
 *
 * The staged entrance (header, headline, lead, CTAs) and the ambient
 * background drift are pure CSS in hero.css, gated behind `.tq-motion` so
 * they can never hide content this script fails to reach.
 *
 * The one thing that has to happen in JS: `header` also carries the site's
 * own hide-on-scroll behaviour (`trinqa-header-hide`, an inline style block
 * in index.html) driven by a `transition` on the same `transform`/`opacity`
 * properties our entrance `animation` uses. Once the one-time entrance
 * finishes we clear it explicitly, so the header goes back to being
 * governed purely by that existing transition instead of two mechanisms
 * quietly competing for the same properties.
 */
(function () {
  'use strict';

  if (!document.documentElement.classList.contains('tq-motion')) return;

  var header = document.querySelector('header');
  if (!header) return;

  function clearEntrance(event) {
    if (event.target !== header || event.animationName !== 'tq-hero-rise') return;
    header.style.animation = 'none';
    header.removeEventListener('animationend', clearEntrance);
  }

  header.addEventListener('animationend', clearEntrance);
})();
