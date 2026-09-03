/* Carregador do Google Tag Manager.

   Estava inline no <head> de cada página, e a CSP do site é
   script-src 'self' — script inline é bloqueado. Resultado: o GTM nunca
   chegou a rodar em mknod.com.br. Não havia dataLayer, o gtm.js nunca
   era baixado, e os eventos que assets/site.js empurra caíam no vazio.

   Em arquivo próprio ele passa pelo 'self' sem precisar de hash na CSP —
   e hash quebraria a cada byte alterado no snippet. */
(function (w, d, s, l, i) {
  w[l] = w[l] || [];
  w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  var f = d.getElementsByTagName(s)[0],
      j = d.createElement(s),
      dl = l != "dataLayer" ? "&l=" + l : "";
  j.async = true;
  j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
  f.parentNode.insertBefore(j, f);
})(window, document, "script", "dataLayer", "GTM-KMQZXBJN");
