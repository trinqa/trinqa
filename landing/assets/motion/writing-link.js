/**
 * Adds the engineering writing to the footer link row.
 *
 * The page is a static export, so there is no build step to add a nav entry through;
 * this clones the classes of the links already there so the new one cannot drift from
 * their styling.
 */
(function () {
  var LINKS = [{ href: '/writing/jev-a-vote-not-a-veto/', label: 'Writing' }];

  function setup() {
    var row = document.querySelector('footer .tq-footer-link');
    if (!row || !row.parentNode) return;
    var container = row.parentNode;

    LINKS.forEach(function (link) {
      if (container.querySelector('a[href="' + link.href + '"]')) return;
      var a = document.createElement('a');
      a.className = row.className;
      a.href = link.href;
      a.textContent = link.label;
      container.insertBefore(a, container.firstChild);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
