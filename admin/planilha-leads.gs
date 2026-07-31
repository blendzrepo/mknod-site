/* MKNod — recebe os leads do site e guarda numa planilha.

   Este arquivo não faz parte do site. Ele é para você colar dentro da sua
   planilha do Google, em Extensões → Apps Script. O passo a passo completo
   está no README.md desta pasta.

   Depois de publicado, ele faz duas coisas:
     • recebe o formulário do site e grava uma linha na planilha (doPost)
     • devolve os leads para o painel, se souber a chave (doGet)
*/

/* ============================================================
   AS DUAS COISAS QUE VOCÊ PRECISA MEXER

   1) Troque a frase abaixo por outra que só você saiba. Ela é a senha
      para ler os leads no painel — sem ela, ninguém vê nada.
      Use letras, números e hífens. Sem espaços e sem acentos.
   ============================================================ */

var CHAVE_LEITURA = "mude-esta-frase-agora";

/* 2) E-mail que recebe o aviso a cada lead novo.
      Deixe "" (vazio) se não quiser receber aviso nenhum. */

var AVISAR_EMAIL = "contato@mknod.com.br";

/* ============================================================
   Daqui para baixo não precisa mexer em nada.
   ============================================================ */

var ABA = "Leads";
var COLUNAS = ["Data", "Origem", "Nome", "E-mail", "Telefone", "Empresa", "Mensagem"];

function aba_() {
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = planilha.getSheetByName(ABA);
  if (!aba) aba = planilha.insertSheet(ABA);
  if (aba.getLastRow() === 0) {
    aba.appendRow(COLUNAS);
    aba.getRange(1, 1, 1, COLUNAS.length).setFontWeight("bold");
    aba.setFrozenRows(1);
  }
  return aba;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function texto_(valor, limite) {
  return String(valor == null ? "" : valor).trim().slice(0, limite);
}

/* ---------- recebe o formulário do site ---------- */

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);

    /* Honeypot: o campo "site" é invisível no formulário. Gente não
       preenche; robô preenche. Respondemos ok para o robô não insistir,
       mas não gravamos nada. */
    if (texto_(d.site, 200)) return json_({ ok: true });

    var nome = texto_(d.nome, 120);
    var email = texto_(d.email, 160);
    if (!nome || !email) return json_({ ok: false, erro: "Nome e e-mail são obrigatórios." });

    var linha = [
      new Date(),
      texto_(d.origem, 80),
      nome,
      email,
      texto_(d.telefone, 40),
      texto_(d.empresa, 120),
      texto_(d.mensagem, 4000)
    ];
    aba_().appendRow(linha);

    if (AVISAR_EMAIL) avisar_(linha);
    return json_({ ok: true });

  } catch (err) {
    return json_({ ok: false, erro: String(err) });
  }
}

/* O aviso é secundário: se o e-mail falhar (cota do dia estourada, por
   exemplo), o lead já está gravado e não queremos devolver erro ao site. */
function avisar_(linha) {
  try {
    var corpo = "";
    for (var i = 1; i < COLUNAS.length; i++) {
      if (linha[i]) corpo += COLUNAS[i] + ": " + linha[i] + "\n";
    }
    corpo += "\nRecebido em " + Utilities.formatDate(
      linha[0], Session.getScriptTimeZone(), "dd/MM/yyyy 'às' HH:mm");
    corpo += "\nVer todos: https://mknod.com.br/admin/";

    MailApp.sendEmail(AVISAR_EMAIL, "Novo lead no site — " + linha[2], corpo);
  } catch (err) {
    // silêncio de propósito
  }
}

/* ---------- devolve os leads para o painel ---------- */

function doGet(e) {
  var chave = e && e.parameter ? e.parameter.chave : "";
  if (chave !== CHAVE_LEITURA) {
    return json_({ ok: false, erro: "Chave de leitura incorreta." });
  }

  var valores = aba_().getDataRange().getValues();
  valores.shift(); // cabeçalho

  var leads = valores.map(function (l) {
    return {
      data: l[0] instanceof Date ? l[0].toISOString() : String(l[0]),
      origem: String(l[1] || ""),
      nome: String(l[2] || ""),
      email: String(l[3] || ""),
      telefone: String(l[4] || ""),
      empresa: String(l[5] || ""),
      mensagem: String(l[6] || "")
    };
  }).reverse(); // mais novo primeiro

  return json_({ ok: true, total: leads.length, leads: leads });
}
