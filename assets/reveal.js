(function () {
  document.documentElement.classList.add('js');

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('nav-menu');

  if (toggle && menu) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      menu.classList.toggle('is-open', open);
    };

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    // close after picking a destination
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    // reset state when resizing up to the desktop layout
    var mq = window.matchMedia('(min-width: 1024px)');
    var onChange = function (e) { if (e.matches) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  /* ---------- Scroll reveal ---------- */
  var els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  // ?static=1 renders everything visible at once (used for full-page captures)
  var staticMode = window.location.search.indexOf('static=1') !== -1;
  if (staticMode || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach(function (el) { el.classList.add('in-view'); });
    return;
  }

  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('in-view'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  els.forEach(function (el) { io.observe(el); });
})();

/* ---------- origem da visita ----------
   O site é multipágina: quando a pessoa chega ao formulário, o
   document.referrer já é a página anterior do próprio site e a origem
   real se perdeu. Por isso guardamos na primeira página da sessão.
   sessionStorage: some quando a aba fecha, não persegue ninguém. */
(function () {
  var CHAVE = "mknod_origem";
  try {
    if (sessionStorage.getItem(CHAVE)) return;

    var p = new URLSearchParams(location.search);
    var externo = document.referrer &&
                  document.referrer.indexOf(location.origin) !== 0
                  ? document.referrer : "";

    var origem = {
      referrer: externo,
      entrada: location.pathname,
      utm_source: p.get("utm_source") || "",
      utm_medium: p.get("utm_medium") || "",
      utm_campaign: p.get("utm_campaign") || "",
      // não guardamos o valor do clique pago, só que ele existia
      pago: (p.has("gclid") ? "google-ads " : "") + (p.has("fbclid") ? "meta-ads" : "")
    };
    sessionStorage.setItem(CHAVE, JSON.stringify(origem));
  } catch (e) {
    // navegador com storage bloqueado: seguimos sem origem
  }
})();
