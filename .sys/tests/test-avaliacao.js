// Script de teste para simular fluxo de avaliação
// Simula o processamento de mensagens para testar o case "avaliacao"

const { Client } = require('whatsapp-web.js');

// Mock do estado e funções
let estados = new Map();
let stateData = new Map();

function setState(jid, state, data = {}) {
  estados.set(jid, state);
  if (data) stateData.set(jid, data);
}

function clearState(jid) {
  estados.delete(jid);
  stateData.delete(jid);
}

async function sendMessage(jid, msg) {
  console.log(`[SEND] ${jid}: ${msg.replace(/\n/g, ' | ')}`);
}

async function enviarFeedbackSuporte(jid, tipo, conteudo) {
  try {
    const suporteJid = ["5513996817481@c.us"]; // mock
    if (!suporteJid[0]) return;
    const agora = new Date().toLocaleString('pt-BR');
    await sendMessage(suporteJid[0],
      `📝 *FEEDBACK RECEBIDO*\n\n` +
      `👤 *Cliente:* ${jid.split('@')[0]}\n` +
      `📌 *Tipo:* ${tipo}\n` +
      `⏰ *Horário:* ${agora}\n\n` +
      `Mensagem:\n${conteudo}`
    );
  } catch (error) {
    console.error(`[ERRO] Falha ao enviar feedback: ${error.message}`);
  }
}

async function showMainMenu(jid) {
  setState(jid, "menu_principal");
  await sendMessage(jid,
    `=================================\n` +
    `> *ACADEMIA SEVEN7FIT - MENU PRINCIPAL* 🏋️\n` +
    `=================================\n\n` +
    `*ESCOLHA UMA OPCAO:*\n\n` +
    `1 - 🏃 Modalidades / Valores / Horarios\n` +
    `2 - 🎫 Pass (Wellhub / TotalPass)\n` +
    `3 - 🗣️ Atendimento\n` +
    `4 - ℹ️ Informacoes\n` +
    `5 - 📝 Feedback\n\n` +
    `Digite o número da opção ou escreva *menu* a ""qualquer momento" para voltar a esse menu\n\n` +
    `_*Seus dados são temporários e não são armazenados permanentemente*_`
  );
}

async function showFeedback(jid) {
  setState(jid, "feedback");
  await sendMessage(jid,
    `> *FEEDBACK* 📝\n\n` +
    `Ajude-nos a melhorar! Escolha uma opção:\n\n` +
    `1 - ⭐ Avaliação do atendimento\n` +
    `2 - 💡 Sugestão de melhorias\n` +
    `3 - ⚠️ Reportar problema técnico\n` +
    `4 - 🙏 Elogios e agradecimentos\n\n` +
    `*Digite 1-4 ou 0 para voltar*`
  );
}

// Simulação do case "avaliacao"
async function processAvaliacao(jid, texto) {
  const estrelas = parseInt(texto);
  if (estrelas >= 1 && estrelas <= 5) {
    await sendMessage(jid, `✅ *Obrigado pela avaliação* de ${estrelas} estrela(s)! Sua opinião nos ajuda a melhorar.`);
    await enviarFeedbackSuporte(jid, "Avaliação", `⭐ ${estrelas} estrelas`);
    clearState(jid);
    await showMainMenu(jid);
  } else if (texto === "0") {
    await showFeedback(jid);
  } else {
    await sendMessage(jid, "Digite um número de 1 a 5 ou 0 para voltar.");
  }
}

// Testes
async function runTests() {
  const jid = "5513999999999@c.us";

  console.log("=== TESTE 1: Avaliação válida (3 estrelas) ===");
  setState(jid, "avaliacao");
  await processAvaliacao(jid, "3");

  console.log("\n=== TESTE 2: Avaliação inválida (6) ===");
  setState(jid, "avaliacao");
  await processAvaliacao(jid, "6");

  console.log("\n=== TESTE 3: Voltar (0) ===");
  setState(jid, "avaliacao");
  await processAvaliacao(jid, "0");

  console.log("\n=== TESTE 4: Texto inválido (abc) ===");
  setState(jid, "avaliacao");
  await processAvaliacao(jid, "abc");

  console.log("\n=== TESTE 5: Avaliação válida (1 estrela) ===");
  setState(jid, "avaliacao");
  await processAvaliacao(jid, "1");

  console.log("\nTestes concluídos!");
}

runTests().catch(console.error);