/* Formulários de contato.

   O site é estático (GitHub Pages) e não tem servidor próprio. Um formulário
   pode terminar de dois jeitos:

   • data-salvar="1"  → manda o lead para a planilha (endpoint configurado no
     painel, em assets/leads-config.js) e ele aparece em /admin/.
   • sem data-salvar  → abre o WhatsApp com a mensagem já montada.

   Se o envio para a planilha falhar — endpoint fora do ar, sem internet,
   configuração errada — caímos no WhatsApp em vez de perder o lead.

   Arquivo externo porque a CSP do site bloqueia script inline. */
(function () {
  var FONE = "551133756566";

  function linha(rotulo, valor) {
    return valor && valor.trim() ? rotulo + ": " + valor.trim() + "\n" : "";
  }

  function aviso(el, texto, tipo) {
    if (!el) return;
    el.textContent = texto;
    el.className = "lf-msg" + (tipo ? " " + tipo : "");
  }

  function abrirWhatsApp(dados, assunto) {
    var texto =
      "Olá! Quero falar sobre " + assunto + ".\n\n" +
      linha("Nome", dados.nome) +
      linha("E-mail", dados.email) +
      linha("Telefone", dados.telefone) +
      linha("Empresa", dados.empresa) +
      linha("Mensagem", dados.mensagem);

    window.open(
      "https://api.whatsapp.com/send/?phone=" + FONE +
      "&text=" + encodeURIComponent(texto.trim()) +
      "&type=phone_number&app_absent=0",
      "_blank", "noopener"
    );
  }

  /* text/plain de propósito: com application/json o navegador manda um
     OPTIONS de preflight antes, e o Apps Script não responde a OPTIONS. */
  function salvar(url, dados) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(dados),
      redirect: "follow"
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (resposta) {
      if (!resposta || !resposta.ok) {
        throw new Error(resposta && resposta.erro ? resposta.erro : "resposta inválida");
      }
      return resposta;
    });
  }

  /* De onde a pessoa veio, gravado por reveal.js na primeira página da
     sessão. Vira uma linha só na planilha, para caber na tabela. */
  function comoChegou() {
    try {
      var o = JSON.parse(sessionStorage.getItem("mknod_origem") || "{}");
      var partes = [];
      if (o.utm_source) {
        partes.push(o.utm_source + (o.utm_medium ? "/" + o.utm_medium : "") +
                    (o.utm_campaign ? " (" + o.utm_campaign + ")" : ""));
      }
      if (o.pago) partes.push(o.pago.trim());
      if (o.referrer) {
        try { partes.push(new URL(o.referrer).hostname); }
        catch (e) { partes.push(o.referrer); }
      }
      if (!partes.length) partes.push("direto");
      if (o.entrada) partes.push("entrou em " + o.entrada);
      return partes.join(" · ");
    } catch (e) { return ""; }
  }

  document.addEventListener("submit", function (e) {
    var form = e.target.closest(".lead-form");
    if (!form) return;
    e.preventDefault();

    var val = function (nome) {
      var el = form.querySelector('[name="' + nome + '"]');
      return el ? el.value.trim() : "";
    };

    var msg = form.querySelector(".lf-msg");

    // honeypot: bot preencheu o campo invisível → engole o envio em silêncio
    // (limpa a mensagem para não deixar um "recebemos" antigo na tela)
    if (val("site") !== "") { aviso(msg, ""); return; }

    if (!val("nome")) {
      aviso(msg, "Escreva o seu nome.", "erro");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val("email"))) {
      aviso(msg, "Confira o e-mail digitado.", "erro");
      return;
    }

    var assunto = form.dataset.assunto || "o meu cenário de TI";
    var dados = {
      origem: form.dataset.origem || "site",
      chegou_por: comoChegou(),
      nome: val("nome"),
      email: val("email"),
      telefone: val("telefone"),
      empresa: val("empresa"),
      mensagem: val("mensagem"),
      site: ""
    };

    var url = window.MKNOD_LEADS_URL || "";

    if (!form.dataset.salvar || !url) {
      aviso(msg, "Abrindo o WhatsApp com a sua mensagem…", "ok");
      abrirWhatsApp(dados, assunto);
      return;
    }

    var botao = form.querySelector('button[type="submit"]');
    if (botao) botao.disabled = true;
    aviso(msg, "Enviando…");

    salvar(url, dados).then(function () {
      form.reset();
      aviso(msg, "Recebemos a sua mensagem. Respondemos em até um dia útil.", "ok");
    }).catch(function () {
      aviso(msg, "Não conseguimos enviar por aqui. Abrindo o WhatsApp…", "ok");
      abrirWhatsApp(dados, assunto);
    }).then(function () {
      if (botao) botao.disabled = false;
    });
  });
})();
