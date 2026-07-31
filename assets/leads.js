/* Formulários de contato → WhatsApp.
   O site é estático (GitHub Pages), não há servidor para receber POST.
   Em vez de perder o lead, o formulário monta a mensagem já preenchida
   e abre a conversa no WhatsApp, que é onde a MKNod já atende.

   Arquivo externo porque a CSP do site bloqueia script inline. */
(function () {
  var FONE = "551133756566";

  function linha(rotulo, valor) {
    return valor && valor.trim() ? rotulo + ": " + valor.trim() + "\n" : "";
  }

  document.addEventListener("submit", function (e) {
    var form = e.target.closest(".lead-form");
    if (!form) return;
    e.preventDefault();

    var val = function (nome) {
      var el = form.querySelector('[name="' + nome + '"]');
      return el ? el.value : "";
    };

    var msg = form.querySelector(".lf-msg");

    // honeypot: bot preencheu o campo invisível → não faz nada
    if (val("site").trim() !== "") return;

    var email = val("email").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      if (msg) {
        msg.textContent = "Confira o e-mail digitado.";
        msg.className = "lf-msg erro";
      }
      return;
    }

    var assunto = form.dataset.assunto || "o meu cenário de TI";
    var texto =
      "Olá! Quero falar sobre " + assunto + ".\n\n" +
      linha("Nome", val("nome")) +
      linha("E-mail", email) +
      linha("Telefone", val("telefone")) +
      linha("Empresa", val("empresa")) +
      linha("Mensagem", val("mensagem"));

    var url =
      "https://api.whatsapp.com/send/?phone=" + FONE +
      "&text=" + encodeURIComponent(texto.trim()) +
      "&type=phone_number&app_absent=0";

    if (msg) {
      msg.textContent = "Abrindo o WhatsApp com a sua mensagem…";
      msg.className = "lf-msg ok";
    }
    window.open(url, "_blank", "noopener");
  });
})();
