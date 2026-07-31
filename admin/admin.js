/* Painel do blog — 100% no navegador.
   Lê e escreve no repositório pela API do GitHub, sem servidor nenhum.
   O token do usuário é a autenticação: a página é pública, mas sem token
   não faz nada. Guardado em sessionStorage (some ao fechar a aba) ou em
   localStorage, se a pessoa marcar "continuar conectado". */
(function () {
  "use strict";

  var REPO = "blendzrepo/mknod-site";
  var BRANCH = "main";
  var SITE = "https://mknod.com.br";
  var API = "https://api.github.com";
  var CHAVE = "mknod_gh_token";
  // post existente usado para copiar menu, rodapé e card lateral
  var TEMPLATE = "blog/golpe-no-pix-virus-desvia-seus-pagamentos-de-pessoas-e-empresas.html";

  var token = null;
  var editando = null;

  var $ = function (id) { return document.getElementById(id); };

  /* ============ GitHub ============ */

  function gh(caminho, opcoes) {
    opcoes = opcoes || {};
    return fetch(API + caminho, {
      method: opcoes.method || "GET",
      headers: {
        Authorization: "Bearer " + token,
        Accept: opcoes.raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      },
      body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
      cache: "no-store"
    }).then(function (r) {
      if (r.status === 404 && opcoes.permite404) return null;
      if (!r.ok) {
        return r.text().then(function (t) {
          throw new Error("GitHub " + r.status + ": " + t.slice(0, 200));
        });
      }
      return opcoes.raw ? r.text() : r.json();
    });
  }

  function lerArquivo(caminho) {
    return gh("/repos/" + REPO + "/contents/" + encodeURIComponent(caminho) +
              "?ref=" + BRANCH, { raw: true, permite404: true });
  }

  function listarBlog() {
    return gh("/repos/" + REPO + "/contents/blog?ref=" + BRANCH, { permite404: true })
      .then(function (itens) { return itens || []; });
  }

  /* Um commit com vários arquivos: blob → tree → commit → move a ref.
     A Contents API faria um commit por arquivo, disparando vários rebuilds. */
  function commitar(mudancas, mensagem) {
    var base = "/repos/" + REPO + "/git/";
    var headSha, treeSha;

    return gh(base + "ref/heads/" + BRANCH)
      .then(function (ref) {
        headSha = ref.object.sha;
        return gh(base + "commits/" + headSha);
      })
      .then(function (commit) {
        treeSha = commit.tree.sha;
        return Promise.all(mudancas.map(function (m) {
          if (m.remover) {
            return { path: m.path, mode: "100644", type: "blob", sha: null };
          }
          return gh(base + "blobs", {
            method: "POST",
            body: { content: m.content, encoding: m.base64 ? "base64" : "utf-8" }
          }).then(function (b) {
            return { path: m.path, mode: "100644", type: "blob", sha: b.sha };
          });
        }));
      })
      .then(function (tree) {
        return gh(base + "trees", {
          method: "POST",
          body: { base_tree: treeSha, tree: tree }
        });
      })
      .then(function (nova) {
        return gh(base + "commits", {
          method: "POST",
          body: { message: mensagem, tree: nova.sha, parents: [headSha] }
        });
      })
      .then(function (commit) {
        return gh(base + "refs/heads/" + BRANCH, {
          method: "PATCH",
          body: { sha: commit.sha }
        }).then(function () { return commit; });
      });
  }

  /* ============ markdown ============ */

  function esc(s) {
    return String(s)
      .split("&").join("&amp;")
      .split("<").join("&lt;")
      .split(">").join("&gt;")
      .split('"').join("&quot;");
  }

  /* Escapar HTML não basta: [x](javascript:...) viraria href executável. */
  function urlSegura(bruta) {
    var u = String(bruta).trim();
    if (!u) return null;
    var m = u.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
    if (m && ["http", "https", "mailto", "tel"].indexOf(m[1].toLowerCase()) === -1) return null;
    return u;
  }

  function inline(s) {
    return s
      .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, function (m, alt, src, cap) {
        var u = urlSegura(src);
        if (!u) return alt;
        return '<figure><img src="' + u + '" alt="' + alt + '" loading="lazy" class="rounded-lg w-full">' +
               (cap ? "<figcaption>" + cap + "</figcaption>" : "") + "</figure>";
      })
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, txt, href) {
        var u = urlSegura(href);
        if (!u) return txt;
        return '<a href="' + u + '"' +
               (/^https?:/i.test(u) ? ' target="_blank" rel="noopener noreferrer"' : "") +
               ">" + txt + "</a>";
      })
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  function markdown(md) {
    var linhas = esc(md.replace(/\r\n/g, "\n")).split("\n");
    var out = [], lista = null, cita = false, codigo = false, par = [];

    function fechaLista() { if (lista) { out.push("</" + lista + ">"); lista = null; } }
    function fechaCita() { if (cita) { out.push("</blockquote>"); cita = false; } }
    function soltaPar() { if (par.length) { out.push("<p>" + inline(par.join(" ")) + "</p>"); par = []; } }
    function soltaTudo() { soltaPar(); fechaLista(); fechaCita(); }

    linhas.forEach(function (bruta) {
      var l = bruta.replace(/\s+$/, "");
      if (l.indexOf("```") === 0) {
        soltaTudo();
        out.push(codigo ? "</code></pre>" : "<pre><code>");
        codigo = !codigo;
        return;
      }
      if (codigo) { out.push(bruta); return; }
      if (!l.trim()) { soltaTudo(); return; }

      var h3 = l.match(/^###\s+(.*)/), h2 = l.match(/^##\s+(.*)/),
          li = l.match(/^[-*]\s+(.*)/), oli = l.match(/^\d+\.\s+(.*)/),
          bq = l.match(/^&gt;\s?(.*)/);

      if (h3) { soltaTudo(); out.push("<h3><strong>" + inline(h3[1]) + "</strong></h3>"); }
      else if (h2) { soltaTudo(); out.push("<h2><strong>" + inline(h2[1]) + "</strong></h2>"); }
      else if (/^---+$/.test(l.trim())) { soltaTudo(); out.push("<hr>"); }
      else if (li) {
        soltaPar(); fechaCita();
        if (lista !== "ul") { fechaLista(); out.push("<ul>"); lista = "ul"; }
        out.push("<li><p>" + inline(li[1]) + "</p></li>");
      } else if (oli) {
        soltaPar(); fechaCita();
        if (lista !== "ol") { fechaLista(); out.push("<ol>"); lista = "ol"; }
        out.push("<li><p>" + inline(oli[1]) + "</p></li>");
      } else if (bq) {
        soltaPar(); fechaLista();
        if (!cita) { out.push("<blockquote>"); cita = true; }
        out.push("<p>" + inline(bq[1]) + "</p>");
      } else { fechaLista(); fechaCita(); par.push(l.trim()); }
    });
    soltaTudo();
    if (codigo) out.push("</code></pre>");
    return out.join("\n");
  }

  function slugify(s) {
    return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "").slice(0, 80);
  }

  function primeiroParagrafo(md, max) {
    max = max || 155;
    var blocos = md.replace(/\r\n/g, "\n").split("\n\n");
    for (var i = 0; i < blocos.length; i++) {
      var t = blocos[i].replace(/^#+\s+/gm, "")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/[*`>_-]/g, "").replace(/\s+/g, " ").trim();
      if (t.length > 60) {
        return t.length <= max ? t : t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
      }
    }
    return "";
  }

  /* ============ geração do HTML do post ============ */

  var MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  function dataBonita(iso) {
    var p = iso.split("-");
    return Number(p[2]) + " " + MESES[Number(p[1]) - 1] + " " + p[0];
  }

  var chromeCache = null;
  function carregarChrome() {
    if (chromeCache) return Promise.resolve(chromeCache);
    return lerArquivo(TEMPLATE).then(function (tpl) {
      if (!tpl) throw new Error("Não achei o post usado como modelo no repositório.");
      var nav = tpl.match(/<nav class="site-nav"[\s\S]*?<\/nav>/);
      var rodape = tpl.match(/<footer[\s\S]*?<\/footer>/);
      var lateral = tpl.match(/<aside class="post-aside[\s\S]*?<\/aside>/);
      if (!nav || !rodape || !lateral) throw new Error("Não consegui ler o modelo do post.");
      chromeCache = { nav: nav[0], rodape: rodape[0], lateral: lateral[0] };
      return chromeCache;
    });
  }

  function montarPost(dados, relacionados, chrome) {
    var url = SITE + "/blog/" + dados.slug + ".html";
    var img = SITE + "/" + dados.capa;
    var corpo = markdown(dados.markdown);
    var titulo = dados.titulo.length > 60 ? dados.titulo.slice(0, 57) + "…" : dados.titulo;

    var ld = [{
      "@context": "https://schema.org", "@type": "BlogPosting",
      headline: dados.titulo.slice(0, 110), description: dados.descricao,
      image: [img], datePublished: dados.data, dateModified: dados.data,
      inLanguage: "pt-BR",
      author: { "@type": "Organization", name: "MKNod", url: SITE + "/" },
      publisher: { "@id": SITE + "/#organization" },
      isPartOf: { "@id": SITE + "/blog/#blog" },
      mainEntityOfPage: { "@type": "WebPage", "@id": url }, url: url
    }, {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: SITE + "/" },
        { "@type": "ListItem", position: 2, name: "Blog", item: SITE + "/blog/" },
        { "@type": "ListItem", position: 3, name: dados.titulo.slice(0, 60), item: url }
      ]
    }].map(function (o) {
      return '  <script type="application/ld+json">\n  ' + JSON.stringify(o) + "\n  <\/script>";
    }).join("\n");

    var cards = relacionados.map(function (r) {
      return '    <article class="card">\n' +
        '      <a href="' + r.slug + '.html" class="block group no-underline">\n' +
        '        <img src="../' + r.capa + '" alt="' + esc(r.alt || r.titulo) + '">\n' +
        '        <h3 class="mt-2 text-xl md:text-2xl after:text-transparent after:content-[\'→\'] after:ml-1 after:transition-all group-hover:after:ml-4 group-hover:after:text-red-600">\n' +
        '          <span class="link">' + esc(r.titulo) + "</span>\n" +
        "        </h3>\n      </a>\n    </article>";
    }).join("\n");

    return '<!DOCTYPE html>\n<html lang="pt-BR">\n\n<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'  <meta http-equiv="X-UA-Compatible" content="IE=edge">\n' +
'  <meta name="description" content="' + esc(dados.descricao) + '">\n' +
'  <!-- Content Security Policy for GitHub Pages -->\n' +
'  <meta http-equiv="Content-Security-Policy"\n  content="\n' +
"    default-src 'self';\n    script-src 'self' https://www.googletagmanager.com;\n" +
"    style-src 'self';\n    img-src 'self' data:;\n" +
"    connect-src 'self' https://www.googletagmanager.com;\n" +
"    frame-src https://www.googletagmanager.com;\n    base-uri 'self';\n    form-action 'self';\n  \">\n" +
'  <link rel="icon" href="../assets/favicon.png" type="image/png">\n' +
'  <link rel="stylesheet" href="../assets/style.css?v=4">\n' +
'  <link rel="stylesheet" href="../assets/site.css?v=4">\n' +
'  <script src="../assets/reveal.js?v=4" defer><\/script>\n' +
"  <title>" + esc(titulo) + "</title>\n" +
"  <!-- Google Tag Manager -->\n" +
"  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':\n" +
"  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],\n" +
"  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=\n" +
"  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);\n" +
"  })(window,document,'script','dataLayer','GTM-KMQZXBJN');<\/script>\n" +
"  <!-- End Google Tag Manager -->\n" +
"  <!-- SEO -->\n" +
'  <link rel="canonical" href="' + url + '">\n' +
'  <meta property="og:site_name" content="MKNod">\n' +
'  <meta property="og:locale" content="pt_BR">\n' +
'  <meta property="og:type" content="article">\n' +
'  <meta property="og:url" content="' + url + '">\n' +
'  <meta property="og:title" content="' + esc(dados.titulo) + '">\n' +
'  <meta property="og:description" content="' + esc(dados.descricao) + '">\n' +
'  <meta property="og:image" content="' + img + '">\n' +
'  <meta property="article:published_time" content="' + dados.data + '">\n' +
'  <meta name="twitter:card" content="summary_large_image">\n' +
'  <meta name="twitter:title" content="' + esc(dados.titulo) + '">\n' +
'  <meta name="twitter:description" content="' + esc(dados.descricao) + '">\n' +
'  <meta name="twitter:image" content="' + img + '">\n' +
ld + "\n  <!-- /SEO -->\n</head>\n\n" +
'<body class="text-[#101325] bg-white">\n' +
"<!-- Google Tag Manager (noscript) -->\n" +
'<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KMQZXBJN"\n' +
'  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n' +
"  <!-- End Google Tag Manager (noscript) -->\n\n" +
chrome.nav + "\n\n" +
'  <header class="post-hero tech-bg">\n    <div class="wrap">\n' +
'      <span class="post-meta"><time datetime="' + dados.data + '">' + dataBonita(dados.data) + "</time></span>\n" +
"      <h1>" + esc(dados.titulo) + "</h1>\n    </div>\n  </header>\n\n" +
'  <div class="post-cover">\n' +
'    <img src="../' + dados.capa + '" alt="' + esc(dados.alt) + '" width="1200" height="630">\n' +
"  </div>\n\n" +
'  <main id="post" class="post-layout">\n      <article class="prose lg:prose-xl">\n\n' +
'        <section class="mt-8">\n\n' + corpo + "\n\n        </section>\n\n      </article>\n" +
chrome.lateral + "\n  </main>\n\n" +
'  <div class="bg-slate-100 py-12 -mb-16 border border-t-slate-200">\n' +
'    <h2 class="text-center text-lg uppercase text-slate-500">Posts relacionados</h2>\n' +
'<section id="posts" class="mt-10">\n' +
'  <div class="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">\n\n' +
cards + "\n\n  </div>\n</section>\n  </div>\n" +
chrome.rodape + "\n</body>\n\n</html>\n";
  }

  function cardListagem(d) {
    return '        <a class="blog-card reveal" href="' + d.slug + '.html">\n' +
      '          <img src="../' + d.capa + '" alt="' + esc(d.alt) + '" loading="lazy" width="600" height="400">\n' +
      '          <div class="bc-body">\n' +
      '            <span class="post-meta"><time datetime="' + d.data + '">' + dataBonita(d.data) + "</time></span>\n" +
      "            <h3>" + esc(d.titulo) + "</h3>\n" +
      '            <span class="link-arrow">Ler post</span>\n' +
      "          </div>\n        </a>";
  }

  function inserirNaListagem(html, card, slug) {
    var limpo = html.replace(
      new RegExp('\\s*<a class="blog-card[^"]*" href="' + slug + '\\.html">[\\s\\S]*?</a>'), "");
    var marca = '<div class="blog-grid">';
    var i = limpo.indexOf(marca);
    if (i === -1) throw new Error("Não achei a grade de posts em blog/index.html");
    return limpo.slice(0, i + marca.length) + "\n" + card + limpo.slice(i + marca.length);
  }

  function addSitemap(xml, slug, data) {
    if (xml.indexOf("/blog/" + slug + ".html") !== -1) return xml;
    var entrada = "  <url>\n    <loc>" + SITE + "/blog/" + slug + ".html</loc>\n" +
      "    <lastmod>" + data + "</lastmod>\n    <changefreq>yearly</changefreq>\n" +
      "    <priority>0.5</priority>\n  </url>\n";
    var ancora = "<loc>" + SITE + "/blog/</loc>";
    var i = xml.indexOf(ancora);
    if (i === -1) return xml.replace("</urlset>", entrada + "</urlset>");
    var fim = xml.indexOf("</url>", i) + "</url>\n".length;
    return xml.slice(0, fim) + entrada + xml.slice(fim);
  }

  /* ============ imagem ============ */

  function prepararCapa(file) {
    return createImageBitmap(file).then(function (bmp) {
      var MAX = 1200;
      var k = Math.min(1, MAX / bmp.width);
      var c = document.createElement("canvas");
      c.width = Math.round(bmp.width * k);
      c.height = Math.round(bmp.height * k);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      return new Promise(function (ok, erro) {
        c.toBlob(function (b) { b ? ok(b) : erro(new Error("falha ao converter")); }, "image/webp", 0.85);
      });
    }).then(function (blob) {
      return blob.arrayBuffer();
    }).then(function (buf) {
      var bytes = new Uint8Array(buf), bin = "";
      for (var i = 0; i < bytes.length; i += 8192) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
      }
      return btoa(bin);
    });
  }

  /* ============ UI ============ */

  function aviso(el, texto, tipo) {
    el.textContent = texto;
    el.className = "msg" + (tipo ? " " + tipo : "");
  }

  function entrar(t, lembrar) {
    token = t;
    if (lembrar) localStorage.setItem(CHAVE, t);
    else sessionStorage.setItem(CHAVE, t);
    aviso($("msg-token"), "");
    $("token").value = "";
    $("tela-token").hidden = true;
    $("tela-painel").hidden = false;
    carregarPosts();
  }

  function sair() {
    token = null;
    sessionStorage.removeItem(CHAVE);
    localStorage.removeItem(CHAVE);
    location.reload();
  }

  function carregarPosts() {
    var status = $("posts-status"), lista = $("lista-posts");
    status.textContent = "Carregando…";
    lista.innerHTML = "";

    listarBlog().then(function (itens) {
      var posts = itens.filter(function (f) {
        return f.type === "file" && /\.html$/.test(f.name) && f.name !== "index.html";
      });
      if (!posts.length) { status.textContent = "Nenhum post."; return; }
      status.textContent = posts.length + " posts";

      posts.forEach(function (p) {
        var slug = p.name.replace(/\.html$/, "");
        var li = document.createElement("li");

        var div = document.createElement("div");
        var a = document.createElement("a");
        a.href = SITE + "/blog/" + p.name;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = slug;
        div.appendChild(a);
        li.appendChild(div);

        var acoes = document.createElement("div");
        acoes.className = "li-acoes";
        var del = document.createElement("button");
        del.type = "button";
        del.className = "perigo";
        del.textContent = "remover";
        del.addEventListener("click", function () { removerPost(slug); });
        acoes.appendChild(del);
        li.appendChild(acoes);

        lista.appendChild(li);
      });
    }).catch(function (e) {
      status.textContent = e.message;
    });
  }

  function coletar() {
    var titulo = $("f-titulo").value.trim();
    return {
      titulo: titulo,
      slug: slugify($("f-slug").value.trim() || titulo),
      descricao: $("f-desc").value.trim() || primeiroParagrafo($("f-md").value, 155),
      markdown: $("f-md").value.trim(),
      alt: $("f-alt").value.trim() || titulo,
      data: $("f-data").value
    };
  }

  function relacionadosDe(itens, slug) {
    return itens.filter(function (f) {
      return f.type === "file" && /\.html$/.test(f.name) &&
             f.name !== "index.html" && f.name !== slug + ".html";
    }).slice(0, 3).map(function (f) {
      var s = f.name.replace(/\.html$/, "");
      return { slug: s, titulo: s.replace(/-/g, " "), capa: "assets/ogimage.jpg", alt: "" };
    });
  }

  function publicar(e) {
    e.preventDefault();
    var msg = $("msg-form"), btn = $("btn-publicar");
    var d = coletar();
    if (!d.titulo || !d.markdown) { aviso(msg, "Preencha título e conteúdo.", "erro"); return; }

    btn.disabled = true;
    aviso(msg, "Publicando…");

    var arquivos = [];
    var capaFile = $("f-capa").files[0];

    var passoCapa = capaFile
      ? prepararCapa(capaFile).then(function (b64) {
          d.capa = "assets/blog/" + d.slug + ".webp";
          arquivos.push({ path: d.capa, content: b64, base64: true });
        })
      : lerArquivo("blog/" + d.slug + ".html").then(function (existente) {
          var m = existente && existente.match(/<div class="post-cover">\s*<img src="\.\.\/([^"]+)"/);
          if (!m) throw new Error("Escolha uma imagem de capa.");
          d.capa = m[1];
        });

    passoCapa
      .then(function () { return Promise.all([carregarChrome(), listarBlog()]); })
      .then(function (r) {
        var chrome = r[0], itens = r[1];
        arquivos.push({
          path: "blog/" + d.slug + ".html",
          content: montarPost(d, relacionadosDe(itens, d.slug), chrome)
        });
        return Promise.all([lerArquivo("blog/index.html"), lerArquivo("sitemap.xml")]);
      })
      .then(function (r) {
        if (r[0]) {
          arquivos.push({ path: "blog/index.html", content: inserirNaListagem(r[0], cardListagem(d), d.slug) });
        }
        if (r[1]) {
          arquivos.push({ path: "sitemap.xml", content: addSitemap(r[1], d.slug, d.data) });
        }
        return commitar(arquivos, 'Blog: publica "' + d.titulo + '"');
      })
      .then(function () {
        aviso(msg, "Publicado. Em cerca de 1 minuto aparece em " +
                   SITE + "/blog/" + d.slug + ".html", "ok");
        $("form-post").reset();
        $("capa-preview").hidden = true;
        $("f-data").value = hoje();
        $("cont-desc").textContent = "0";
        $("preview-url").textContent = "";
        carregarPosts();
      })
      .catch(function (err) { aviso(msg, err.message, "erro"); })
      .finally(function () { btn.disabled = false; });
  }

  function removerPost(slug) {
    if (!confirm('Remover o post "' + slug + '"? Isso apaga a página do site.')) return;
    var msg = $("msg-form");
    aviso(msg, "Removendo…");

    var arquivos = [{ path: "blog/" + slug + ".html", remover: true }];
    Promise.all([lerArquivo("blog/index.html"), lerArquivo("sitemap.xml")])
      .then(function (r) {
        if (r[0]) {
          arquivos.push({
            path: "blog/index.html",
            content: r[0].replace(
              new RegExp('\\s*<a class="blog-card[^"]*" href="' + slug + '\\.html">[\\s\\S]*?</a>'), "")
          });
        }
        if (r[1]) {
          arquivos.push({
            path: "sitemap.xml",
            content: r[1].replace(
              new RegExp("  <url>\\s*<loc>[^<]*/blog/" + slug + "\\.html</loc>[\\s\\S]*?</url>\\n"), "")
          });
        }
        return commitar(arquivos, 'Blog: remove "' + slug + '"');
      })
      .then(function () {
        aviso(msg, "Removido. O site atualiza em cerca de 1 minuto.", "ok");
        carregarPosts();
      })
      .catch(function (e) { aviso(msg, e.message, "erro"); });
  }

  function previa() {
    var msg = $("msg-form");
    var d = coletar();
    if (!d.markdown) { aviso(msg, "Escreva o conteúdo primeiro.", "erro"); return; }
    d.capa = d.capa || "assets/ogimage.jpg";
    aviso(msg, "Gerando prévia…");

    carregarChrome().then(function (chrome) {
      var html = montarPost(d, [], chrome);
      var url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      window.open(url, "_blank", "noopener");
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      aviso(msg, "");
    }).catch(function (e) { aviso(msg, e.message, "erro"); });
  }

  function hoje() { return new Date().toISOString().slice(0, 10); }

  /* ============ start ============ */

  document.addEventListener("DOMContentLoaded", function () {
    $("f-data").value = hoje();

    $("form-token").addEventListener("submit", function (e) {
      e.preventDefault();
      var t = $("token").value.trim();
      var msg = $("msg-token");
      if (!t) return;
      aviso(msg, "Verificando…");
      token = t;
      // valida o token e o acesso ao repositório antes de abrir o painel
      gh("/repos/" + REPO).then(function (r) {
        if (!r.permissions || !r.permissions.push) {
          throw new Error("Este token não tem permissão de escrita no repositório.");
        }
        $("quem").textContent = REPO;
        entrar(t, $("lembrar").checked);
      }).catch(function (e) {
        token = null;
        aviso(msg, e.message.indexOf("401") !== -1
          ? "Token inválido ou expirado."
          : e.message, "erro");
      });
    });

    $("btn-sair").addEventListener("click", sair);
    $("form-post").addEventListener("submit", publicar);
    $("btn-previa").addEventListener("click", previa);

    $("f-desc").addEventListener("input", function () {
      $("cont-desc").textContent = this.value.length;
    });
    $("f-titulo").addEventListener("input", function () {
      if (!$("f-slug").value.trim()) {
        $("preview-url").textContent = SITE + "/blog/" + slugify(this.value) + ".html";
      }
    });
    $("f-slug").addEventListener("input", function () {
      $("preview-url").textContent = this.value.trim()
        ? SITE + "/blog/" + slugify(this.value) + ".html" : "";
    });
    $("f-capa").addEventListener("change", function () {
      var img = $("capa-preview");
      if (this.files[0]) {
        img.src = URL.createObjectURL(this.files[0]);
        img.hidden = false;
      } else { img.hidden = true; }
    });

    // já entrou antes neste navegador?
    var salvo = sessionStorage.getItem(CHAVE) || localStorage.getItem(CHAVE);
    if (salvo) {
      token = salvo;
      gh("/repos/" + REPO).then(function () {
        $("quem").textContent = REPO;
        entrar(salvo, !!localStorage.getItem(CHAVE));
      }).catch(function () {
        token = null;
        sessionStorage.removeItem(CHAVE);
        localStorage.removeItem(CHAVE);
      });
    }
  });
})();
