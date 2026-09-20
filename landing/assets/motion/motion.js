/*
 * Trinqa motion engine.
 *
 * Section modules describe what should animate; this file decides when.
 * It only ever toggles a class, so a module that fails still leaves readable,
 * fully laid-out content behind.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Without IntersectionObserver there is nothing to drive the reveals, so the
  // page stays in its finished state rather than hiding content forever.
  if (reduced || typeof IntersectionObserver === 'undefined') {
    root.classList.add('tq-motion-off');
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('tq-in');
        observer.unobserve(entry.target);
      });
    },
    // Fire slightly before the element is fully on screen; a reveal that starts
    // at the exact edge reads as late on a long scroll.
    { rootMargin: '0px 0px -12% 0px', threshold: 0.01 }
  );

  /**
   * Prepare elements for reveal.
   * @param {string|Element|NodeList|Array} target  selector or element(s)
   * @param {{type?: string, stagger?: number, delay?: number, root?: Element}} [options]
   *        type    — reveal flavour: "up" (default), "fade", "left", "right", "scale"
   *        stagger — ms added per element, on top of `delay`
   *        delay   — ms before the first element
   *        root    — element to query within, defaults to the document
   * @returns {Element[]} the elements now under observation
   */
  function reveal(target, options) {
    var opts = options || {};
    var scope = opts.root || document;
    var nodes;

    if (typeof target === 'string') nodes = scope.querySelectorAll(target);
    else if (target instanceof Element) nodes = [target];
    else nodes = target || [];

    var list = Array.prototype.slice.call(nodes);
    var step = typeof opts.stagger === 'number' ? opts.stagger : 0;
    var base = typeof opts.delay === 'number' ? opts.delay : 0;

    list.forEach(function (el, i) {
      if (el.hasAttribute('data-tq-reveal')) return; // already registered
      el.setAttribute('data-tq-reveal', opts.type || 'up');
      var delay = base + step * i;
      if (delay) el.style.setProperty('--tq-delay', delay + 'ms');
      observer.observe(el);
    });

    return list;
  }

  /** Run `fn` once the DOM is ready, or immediately if it already is. */
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  /**
   * Read the scroll progress of an element through the viewport.
   * @returns {number} 0 when the element's top hits the bottom of the screen,
   *                   1 when its bottom leaves the top.
   */
  function progress(el) {
    var rect = el.getBoundingClientRect();
    var span = window.innerHeight + rect.height;
    var seen = window.innerHeight - rect.top;
    return Math.min(1, Math.max(0, seen / span));
  }

  /** rAF-throttled scroll subscription shared by every module. */
  var scrollFns = [];
  var ticking = false;

  function onScroll(fn) {
    scrollFns.push(fn);
    if (scrollFns.length === 1) {
      window.addEventListener(
        'scroll',
        function () {
          if (ticking) return;
          ticking = true;
          window.requestAnimationFrame(function () {
            ticking = false;
            for (var i = 0; i < scrollFns.length; i++) scrollFns[i]();
          });
        },
        { passive: true }
      );
    }
    fn();
  }

  root.classList.add('tq-motion');

  window.tqMotion = {
    reveal: reveal,
    ready: ready,
    progress: progress,
    onScroll: onScroll,
    reduced: false
  };
})();
