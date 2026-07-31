# Painel do blog

Publica posts em `mknod.com.br/blog/` sem sair do navegador e sem servidor.

O painel é uma página estática do próprio site (`mknod.com.br/admin/`). Ele
conversa direto com a API do GitHub: lê o repositório para listar os posts e
faz um commit para publicar. O GitHub Pages republica sozinho em cerca de
1 minuto.

---

## Primeiro acesso: gerar o token

O painel é uma página pública, mas **sem token ele não faz nada**. O token é o
que autoriza escrever no repositório — é ele que faz o papel de senha.

1. Abra <https://github.com/settings/personal-access-tokens>
2. **Generate new token**
3. **Token name**: `painel-blog-mknod`
4. **Expiration**: 90 dias (ou o que preferir — depois é só gerar outro)
5. **Repository access** → *Only select repositories* → `mknod-site`
6. **Permissions** → *Repository permissions* → **Contents: Read and write**
   (só isso; não precisa de mais nada)
7. **Generate token**, copie o valor
8. Abra <https://mknod.com.br/admin/> e cole

O token fica guardado **só no seu navegador**. Por padrão some quando você
fecha a aba; marcando "continuar conectado", fica salvo naquele computador até
você clicar em Sair.

> Se o token vazar, revogue na mesma página do GitHub. Como ele só tem acesso
> de conteúdo a um repositório, o estrago possível é limitado ao site.

---

## Publicar um post

1. **Título** — vira o `<h1>` e o title da página.
2. **Endereço** — deixe vazio para gerar do título. É a URL final do post.
3. **Descrição** — o texto que aparece no Google. Se deixar vazio, o painel usa
   o primeiro parágrafo.
4. **Data** — a data de publicação exibida no post.
5. **Imagem de capa** — convertida para WebP e redimensionada no seu navegador
   antes de subir. Use algo em torno de 1200×630.
6. **Conteúdo** — markdown:

   ```
   ## Título de seção
   ### Subtítulo

   Texto normal com **negrito**, *itálico* e [link](https://exemplo.com).

   - item de lista
   - outro item

   1. lista numerada
   2. segundo item

   > citação

   ---
   ```

7. **Ver prévia** abre a página final numa aba, sem publicar nada.
8. **Publicar no site** faz um commit único com:
   - `blog/{endereço}.html` — a página do post
   - `blog/index.html` — o card na listagem
   - `sitemap.xml` — a URL nova
   - `assets/blog/{endereço}.webp` — a capa

É um commit só, de propósito: se fossem vários, o site iria ao ar pela metade
entre um e outro.

**Republicar**: use o mesmo endereço de um post existente. O painel substitui a
página e o card. Se não enviar capa nova, mantém a que já estava lá.

---

## O que o painel garante sozinho

- **SEO completo** em cada post: canonical, Open Graph, Twitter Card e os dados
  estruturados (`BlogPosting` e `BreadcrumbList`).
- **Menu e rodapé sempre atuais**: são copiados de um post que já existe no
  repositório, não estão fixos no código. Se o menu do site mudar, os próximos
  posts saem com o menu novo.
- **Sem risco de código malicioso**: o conteúdo é escapado antes de virar HTML,
  e links com `javascript:` ou `data:` são recusados.

---

## Limites

- **Publicar não é instantâneo**: depende do GitHub Pages reconstruir o site
  (~1 minuto).
- **Não existe rascunho**: publicar vai direto para o ar. Use a prévia antes.
- **Um post por vez**: se duas pessoas publicarem no mesmo minuto, a segunda
  pode receber erro de conflito. Basta publicar de novo.
- **Sem edição de posts antigos** pelo painel: para corrigir um post existente,
  republique com o mesmo endereço (o conteúdo precisa ser colado de novo).

---

## Formulários do site

As páginas de contato, as seis de serviço e a de cartórios têm formulário. Como
o site não tem servidor, ao enviar eles **abrem o WhatsApp com a mensagem já
montada** (nome, e-mail, telefone, empresa e o texto), identificando de qual
página veio.

Se um dia quiser receber os leads numa tela em vez do WhatsApp, existe um
painel completo já pronto em `admin/` na raiz do projeto (fora deste
repositório), que precisa ser hospedado na Vercel. O arquivo `README.md` de lá
explica o passo a passo.
