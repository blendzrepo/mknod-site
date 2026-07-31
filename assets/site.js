/* CTA tracking - one delegated listener for the whole page.
   Lives in an external file because the site CSP blocks inline scripts. */
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-cta]');
  if (!el) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'cta_click',
    cta_service: el.dataset.ctaService,
    cta_position: el.dataset.cta,
    cta_channel: el.dataset.ctaChannel
  });
});
