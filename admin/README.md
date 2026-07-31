# Painel MKNod

Duas coisas em `mknod.com.br/admin/`: publicar posts no blog e ver os leads
que chegaram pelo site.

O painel é uma página estática do próprio site. Ele conversa direto com a API
do GitHub — lê o repositório para listar os posts e faz um commit para
publicar — e com a planilha do Google, para ler os leads. O GitHub Pages
republica sozinho em cerca de 1 minuto.

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

## Leads

O site não tem servidor: o GitHub Pages só entrega arquivos, não recebe nada.
Quem recebe o formulário é uma **planilha do Google** sua, com um script
pequeno atrás. O painel lê essa planilha e mostra os leads na aba **Leads**.

```
formulário de contato  →  planilha do Google  →  aba Leads do painel
                                ↓
                       aviso por e-mail a cada lead
```

Os formulários das páginas de serviço e o de cartórios continuam abrindo o
**WhatsApp** com a mensagem já montada. Só o da página de contato salva na
planilha. Para mudar isso, basta acrescentar `data-salvar="1"` ao `<form>` da
página desejada.

### Montar a planilha (uma vez só)

1. Crie uma planilha em <https://sheets.new> e dê um nome, tipo
   *Leads do site*.
2. Menu **Extensões → Apps Script**. Abre uma aba nova de código.
3. Apague o que estiver lá e cole todo o conteúdo de
   [`planilha-leads.gs`](planilha-leads.gs) (arquivo desta pasta).
4. No topo do código, troque duas coisas:
   - `CHAVE_LEITURA` — uma frase que só você saiba, sem espaços e sem acentos.
     É a senha para ver os leads no painel.
   - `AVISAR_EMAIL` — quem recebe o aviso de lead novo. Deixe `""` para não
     receber nenhum.
5. Salve (ícone de disquete) e clique em **Implantar → Nova implantação**.
6. Na engrenagem ao lado de *Selecionar tipo*, escolha **App da Web**.
7. Preencha:
   - **Executar como**: Eu (seu e-mail)
   - **Quem pode acessar**: **Qualquer pessoa**
8. **Implantar**. O Google vai pedir autorização uma vez — aceite. Na tela de
   aviso, clique em *Avançado* → *Acessar (não seguro)*: o "não seguro" é
   porque o script é seu e não passou por revisão do Google.
9. Copie o **URL do app da Web**. Termina em `/exec`.

> **Quem pode acessar: Qualquer pessoa** é obrigatório — é o visitante do site,
> deslogado, que envia o formulário. Isso deixa qualquer um *enviar* dados,
> mas não *ler*: a leitura exige a `CHAVE_LEITURA`.

### Ligar no painel

1. Abra <https://mknod.com.br/admin/>, aba **Leads** → **Configurar**.
2. Cole o URL que termina em `/exec` e a frase da `CHAVE_LEITURA`.
3. **Salvar e testar**. O painel testa a conexão antes de gravar; se der certo,
   ele faz um commit em `assets/leads-config.js` e o formulário de contato
   passa a salvar na planilha em cerca de 1 minuto.

O URL fica no repositório (é público, como qualquer endereço que o site chama).
A chave de leitura fica **só no seu navegador** e some quando você clica em
Sair.

### No dia a dia

- **Atualizar** busca de novo na planilha.
- **Exportar CSV** baixa tudo, já com ponto-e-vírgula e acentuação certa para
  abrir no Excel.
- O número vermelho na aba conta quantos chegaram desde a sua última visita.
- A planilha também é sua: dá para filtrar, comentar e usar como quiser.

### Se algo falhar

- **O formulário caiu no WhatsApp sozinho** — é o comportamento previsto quando
  a planilha não responde. Nenhum lead se perde por isso.
- **"Não consegui falar com a planilha"** — quase sempre é a implantação em
  *Somente eu* em vez de *Qualquer pessoa*. Refaça o passo 7.
- **Mudou o código do script?** Precisa de **Implantar → Gerenciar
  implantações → editar → Nova versão**, senão o Google continua servindo a
  versão antiga.
