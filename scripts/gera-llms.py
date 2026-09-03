# -*- coding: utf-8 -*-
"""Gera o llms.txt a partir das próprias páginas.

   A lição do relatório da Typic: arquivo escrito à mão envelhece e passa
   a descrever uma empresa que não existe mais. Aqui ele sai do title, da
   description e do H1 de cada página — se o site muda, é só rodar de novo.

   Uso: python3 /tmp/gera_llms.py
"""
import re, glob, os, datetime

SITE = "https://mknod.com.br"

def meta(f):
    h = open(f, encoding='utf-8').read()
    t = re.search(r'<title>([^<]*)</title>', h)
    d = re.search(r'<meta name="description" content="([^"]*)"', h)
    h1 = re.search(r'<h1[^>]*>([\s\S]*?)</h1>', h)
    data = re.search(r'<time datetime="([^"]*)"', h)
    return {
      'titulo': (t.group(1) if t else '').replace(' | MKNod','').strip(),
      'desc': (d.group(1) if d else '').strip(),
      'h1': re.sub(r'<[^>]+>','',h1.group(1)).strip() if h1 else '',
      'data': data.group(1) if data else '',
    }

def url(f):
    u = SITE + '/' + f.replace('/index.html','/')
    return SITE + '/' if u.endswith('/index.html') else u

SERVICOS = ['ti','comunicacao','redes','nuvem','seguranca','dados','cartorios']

L = []
L.append("# MKNod — TI para pequenas e médias empresas em São Paulo")
L.append("")
L.append("> Empresa de TI de São Paulo, com 22 anos de mercado, que cuida da operação")
L.append("> digital de pequenas e médias empresas: suporte, comunicação, redes, nuvem,")
L.append("> cibersegurança e proteção de dados. Também é especializada na adequação de")
L.append("> cartórios ao Provimento CNJ 213/2026.")
L.append("")
L.append("Atendimento remoto e presencial, de segunda a sexta, das 8h às 18h.")
L.append("Contato: (11) 3375-6566 | contato@mknod.com.br")
L.append("Endereço: Av. Corifeu de Azevedo Marques, 788, sala 4, Butantã, São Paulo - SP, 05582-000")
L.append("Os artigos do blog são assinados por Fernando Nitzsche, CEO e fundador da MKNod.")
L.append("")
L.append("## Serviços")
L.append("")
for s in SERVICOS:
    f = f'servicos/{s}.html'
    m = meta(f)
    L.append(f"- [{m['titulo']}]({url(f)}): {m['desc']}")
L.append("")
L.append("## Páginas principais")
L.append("")
for f in ['index.html','servicos/index.html','sobre.html','contato.html','blog/index.html']:
    m = meta(f)
    L.append(f"- [{m['titulo']}]({url(f)}): {m['desc']}")
L.append("")
L.append("## Artigos")
L.append("")
posts = []
for f in sorted(glob.glob('blog/*.html')):
    if f.endswith('index.html'): continue
    m = meta(f)
    posts.append((m['data'] or '0000-00-00', f, m))
# Curadoria, não despejo: os dez mais recentes com descrição; o resto
# entra em Optional só com o título. Listar tudo com descrição estourava
# os 10 KB que a spec recomenda, e o sitemap já cobre a lista completa.
recentes = sorted(posts, reverse=True)
for _, f, m in recentes[:10]:
    L.append(f"- [{m['h1'] or m['titulo']}]({url(f)}): {m['desc']}")
L.append("")
L.append("## Optional")
L.append("")
L.append("- [Painel do Cliente](https://desk.mknod.com.br/): abertura e acompanhamento de chamados por quem já é cliente.")
for _, f, m in recentes[10:]:
    L.append(f"- [{m['h1'] or m['titulo']}]({url(f)})")
L.append("")
L.append(f"<!-- gerado em {datetime.date.today().isoformat()} por scripts/gera-llms.py -->")

texto = "\n".join(L) + "\n"
open('llms.txt','w',encoding='utf-8').write(texto)
print(f"llms.txt gerado: {len(texto)} bytes, {len(posts)} artigos")
if len(texto) > 10000:
    print("  !! acima de 10 KB — a spec recomenda ficar abaixo")
