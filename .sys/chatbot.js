// ================================
// Importações e Configurações
// ================================
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Captura erros não tratados para evitar que o bot pare
process.on('uncaughtException', (err) => {
  console.error('\n❌ [ERRO NÃO CAPTURADO]:', err.message);
  console.error('🔄 Bot continua rodando...\n');
});
// Captura rejeições de promessas não tratadas para evitar que o bot pare
process.on('unhandledRejection', (reason) => {
  console.error('\n❌ [PROMISE REJEITADA]:', reason);
  console.error('🔄 Bot continua rodando...\n');
});
// Captura Ctrl+C para liberar clientes em atendimento humano sem fechar o bot
process.on('SIGINT', () => {
  console.log('\n🛑 Recebido Ctrl+C. Bot continua rodando. Digite comandos:');
  console.log('Exemplo: liberar 5513999999999');
  process.stdin.setRawMode(false);
  process.stdin.resume();
  process.stdin.on('data', async (data) => {
    const input = data.toString().trim();
    if (input.startsWith('liberar ')) {
      const numero = input.split(' ')[1];
      const jidLiberar = normalizarJid(numero);
      if (emAtendimentoHumano.has(jidLiberar)) {
        emAtendimentoHumano.delete(jidLiberar);
        kpis.clientesLiberados++;
        await sendMessage(jidLiberar, `✅ *Atendimento encerrado.*\nDigite *menu* para ver as opções.`);
        console.log(`✅ Cliente ${jidLiberar.split('@')[0]} liberado.`);
        console.log(`📋 Fila atual: ${filaSolicitacoes.length} cliente(s) aguardando.`);
        atendenteLivre = true;
        await processarFilaSolicitacoes();
      } else {
        console.log(`⚠️ ${jidLiberar.split('@')[0]} não está em atendimento.`);
      }
    } else if (input === 'exit') {
      console.log('Saindo...');
      process.exit(0);
    } else {
      console.log('Comando não reconhecido. Use "liberar <numero>" ou "exit".');
    }
  });
});

// ================================
// Variáveis e Configurações Globais
// ================================
const CONTATO_SUPORTE = new Set(["5513996817481@s.whatsapp.net"]);
const ADMIN_JIDS = new Set(["5513996817481@s.whatsapp.net", "5513991808686@s.whatsapp.net"]);
const AUTO_REPLY_COOLDOWN = 3000;
const STATE_TTL = 24 * 60 * 60 * 1000;
const INATIVIDADE_TTL = 2 * 60 * 1000;
const TIMEOUT_ATENDIMENTO = 30 * 60 * 1000; // 30 minutos - timeout para cliente em atendimento
//const CHAVE_PIX = "*CNPJ:* 12.345.678/0001-99 - *Academia* Seven7Fit";
const ATENDENTE_ATUAL = "5513996817481@s.whatsapp.net"; // 5513991009209 Número do atendente que receberá as notificações
const LOG_MENSAGENS = false;

let limiteMensagensAtivo = true;
const LIMITE_MENSAGENS_POR_HORA = 30;
const LIMITE_WINDOW_MS = 60 * 60 * 1000;
const messageTimestamps = new Map();

// ================================
// Variáveis de estado do bot
// ================================
const MODALIDADES_VALIDAS = [
  "portuguesa",
  "calabresa",
  "frango catupiry",
  "quatro queijos",
  "pepperoni",
  "marguerita",
  "chocolate",
  "romeu e julieta",
  "banana nevada"
];
const PRECO_MODALIDADES = {
  "portuguesa": "\nInteira: R$ 55,00 \n/ Meia: R$ 30,00",
  "calabresa": "\nInteira: R$ 45,00 \n/ Meia: R$ 25,00",
  "frango catupiry": "\nInteira: R$ 50,00 \n/ Meia: R$ 28,00",
  "quatro queijos": "\nInteira: R$ 52,00 \n/ Meia: R$ 29,00",
  "pepperoni": "\nInteira: R$ 58,00 \n/ Meia: R$ 32,00",
  "marguerita": "\nInteira: R$ 42,00 \n/ Meia: R$ 24,00",
  "chocolate": "\nInteira: R$ 48,00 \n/ Meia: R$ 27,00",
  "romeu e julieta": "\nInteira: R$ 46,00 \n/ Meia: R$ 26,00",
  "banana nevada": "\nInteira: R$ 44,00 \n/ Meia: R$ 25,00"
};

const ignoredContacts = new Set([]);
let sock = null;
let isConnected = false;

const estados = new Map();
const stateData = new Map();
const timers = new Map();
const inactivityTimers = new Map();
const timeoutAtendimentoTimers = new Map(); // Timer para auto-liberar cliente após 30min
const lastReply = new Map();
const emAtendimentoHumano = new Set();
const dataAtendimento = new Map(); // Armazena timestamp de quando cliente entrou em atendimento
const primeiroContato = new Set();

// ====================== FILA COM PRIORIDADES ======================
const filaSolicitacoes = [];
let atendenteLivre = true;
const prioridadeTipos = { comprovante: 0, pass: 1, atendimento: 2 };

// ================================
// KPIs
// ================================
const kpis = {
  atendimentosIniciados: 0,
  comprovantesRecebidos: 0,
  passCheckins: 0,
  atendimentosSolicitados: 0,
  clientesLiberados: 0,
  limitesAtingidos: 0,
  mensagensPorHora: new Map(),
};

function registrarMensagemKpi() {
  const hora = new Date().getHours();
  kpis.mensagensPorHora.set(hora, (kpis.mensagensPorHora.get(hora) || 0) + 1);
}

function getHorarioPico() {
  let maxHora = null, maxCount = 0;
  for (const [hora, count] of kpis.mensagensPorHora) {
    if (count > maxCount) { maxCount = count; maxHora = hora; }
  }
  return maxHora !== null ? `${maxHora}:00 (${maxCount} mensagens)` : "Sem dados ainda";
}



function gerarRelatorioKpi() {
  return (
    `📊 *KPIs DO BOT*\n\n` +
    `👥 Atendimentos iniciados: ${kpis.atendimentosIniciados}\n` +
    `💰 Comprovantes recebidos: ${kpis.comprovantesRecebidos}\n` +
    `🟠 Check-ins de Pass: ${kpis.passCheckins}\n` +
    `🔔 Atendimentos solicitados: ${kpis.atendimentosSolicitados}\n` +
    `✅ Clientes liberados: ${kpis.clientesLiberados}\n` +
    `⚠️ Limites atingidos: ${kpis.limitesAtingidos}\n` +
    `⏰ Horário de pico: ${getHorarioPico()}`
  );
}

function normalizarJid(jid) {
  if (!jid) return jid;
  if (jid.endsWith('@lid')) return jid;

  let numero;
  let sufixo;
  if (jid.includes('@')) {
    [numero, sufixo] = jid.split('@');
    numero = numero.replace(/\D/g, '');
  } else {
    numero = jid.replace(/\D/g, '');
  }

  if (numero.length === 12 && numero.startsWith('55')) {
    numero = `${numero.slice(0, 4)}9${numero.slice(4)}`;
  }
  if (numero.length === 11 && !numero.startsWith('55')) {
    numero = `55${numero}`;
  }
  if (!sufixo) {
    sufixo = 's.whatsapp.net';
  } else if (sufixo === 'c.us') {
    sufixo = 's.whatsapp.net';
  }

  return `${numero}@${sufixo}`;
}

function normalizarNumero(numero) {
  if (!numero) return numero;
  const n = numero.replace(/\D/g, '');
  if (n.length === 13 && n.startsWith('55')) return n;
  if (n.length === 12 && n.startsWith('55')) return `${n.slice(0, 4)}9${n.slice(4)}`;
  if (n.length === 11 && !n.startsWith('55')) return `55${n}`;
  return n;
}

// ================================
// AUXILIARES
// ================================
const delayHumano = () => new Promise(r => setTimeout(r, Math.random() * 3500 + 1500));

const canReply = (jid) => {
  const now = Date.now();
  const last = lastReply.get(jid) || 0;
  if (now - last < AUTO_REPLY_COOLDOWN) return false;
  lastReply.set(jid, now);
  return true;
};

const registroMensagem = (jid) => {
  const now = Date.now();
  const fila = (messageTimestamps.get(jid) || []).filter(ts => now - ts < LIMITE_WINDOW_MS);
  fila.push(now);
  messageTimestamps.set(jid, fila);
  return fila.length;
};

// Verifica se o número excedeu o limite e notifica o atendente
const verificarLimite = async (jid) => {
  if (!limiteMensagensAtivo) return false;
  const contador = registroMensagem(jid);
  if (contador > LIMITE_MENSAGENS_POR_HORA) {
    console.log(`[LIMITE] ${jid.split('@')[0]} excedeu ${contador} mensagens/hora`);
    kpis.limitesAtingidos++;
    try {
      await sendMessage(ATENDENTE_ATUAL,
        `⚠️ *LIMITE DE MENSAGENS ATINGIDO*\n\n` +
        `👤 Número: ${jid.split('@')[0]}\n` +
        `📊 Mensagens na última hora: ${contador}\n` +
        `🔕 Bot pausado para este número até renovar o limite (1 hora).`
      );
    } catch (e) { console.warn('[AVISO] Falha ao notificar limite:', e.message); }
    return true;
  }
  return false;
};

// ================================
// sendMessage — API Baileys
// ================================
async function sendMessage(jid, text) {
  try {
    await sock.sendMessage(jid, { text });
    console.log(`[ENVIADO] ${jid.split('@')[0]} → ${text.substring(0, 50)}...`);
  } catch (err) {
    console.error(`[ERRO ENVIO] ${jid}: ${err.message}`);
  }
}

// ================================
// setState com customInactivity
// ================================
function setState(jid, state, data = null, customInactivity = null) {
  clearTimeout(timers.get(jid));
  clearTimeout(inactivityTimers.get(jid));
  estados.set(jid, state);
  if (data !== null) {
    stateData.set(jid, data);
  } else if (state !== "pagamentos") {
    stateData.delete(jid);
  }
  console.log(`[ESTADO] ${jid.split('@')[0]} → ${state}`);
  timers.set(jid, setTimeout(() => {
    estados.delete(jid);
    stateData.delete(jid);
  }, STATE_TTL));
  // Timer de inatividade: 5 min durante pagamento, 2 min nos demais estados
  const inactivityTime = customInactivity || (state === "pagamentos" ? 8 * 60 * 1000 : INATIVIDADE_TTL);
  inactivityTimers.set(jid, setTimeout(async () => {
    if (estados.get(jid) !== "menu_principal") {
      estados.set(jid, "inativo");
      await sendMessage(jid, "⏰ Inatividade detectada. Digite qualquer coisa para retornar ao menu principal.");
    }
  }, inactivityTime));
}

function clearState(jid) {
  estados.delete(jid);
  stateData.delete(jid);
  clearTimeout(timers.get(jid));
  clearTimeout(inactivityTimers.get(jid));
  primeiroContato.delete(jid);
}

// ====================== FILA COM PRIORIDADES ======================
async function adicionarFilaSolicitacao(jid, tipoSolicitacao, mensagemBody) {
  const prioridade = prioridadeTipos[tipoSolicitacao] ?? 2;
  filaSolicitacoes.push({ jid, tipoSolicitacao, mensagemBody, prioridade, timestamp: Date.now() });
  filaSolicitacoes.sort((a, b) =>
    a.prioridade !== b.prioridade ? a.prioridade - b.prioridade : a.timestamp - b.timestamp
  );
  const posicao = filaSolicitacoes.findIndex(s => s.jid === jid) + 1;
  const total = filaSolicitacoes.length;
  if (!atendenteLivre || total > 1) {
    await sendMessage(jid,
      `⏳ *Você está na fila de atendimento*\n\n` +
      `📋 Posição: *${posicao}º*\n` +
      `👥 Total na fila: *${total}*\n\n` +
      `O atendente vai te chamar em breve.\nAguarde...`
    );
  }
  if (atendenteLivre) await processarFilaSolicitacoes();
}

async function processarFilaSolicitacoes() {
  if (filaSolicitacoes.length === 0 || !atendenteLivre) return;
  atendenteLivre = false;
  const { jid, tipoSolicitacao, mensagemBody } = filaSolicitacoes.shift();
  const userCtx = stateData.get(jid) || {};
  const agora = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const emojis = { comprovante: "💰", pass: "🟠", atendimento: "🔔", pagamento: "💳" };
  const titulos = {
    comprovante: "COMPROVANTE DE PAGAMENTO RECEBIDO",
    pass: "CHECK-IN DE PASS SOLICITADO",
    atendimento: "SOLICITAÇÃO DE ATENDIMENTO",
    pagamento: "PEDIDO DE PAGAMENTO RECEBIDO"
  };
  const emoji = emojis[tipoSolicitacao] || "🔔";
  const titulo = titulos[tipoSolicitacao] || "NOTIFICAÇÃO";
  try {
    await sendMessage(ATENDENTE_ATUAL,
      `${emoji} *${titulo}*\n\n` +
      `👤 *Cliente:* ${jid.split('@')[0]}\n` +
      `📛 *Nome:* ${userCtx.nome || "Não informado"}\n` +
      `📚 *Modalidade:* ${userCtx.modalidade || "Não informada"}\n` +
      `⏰ *Horário:* ${agora}\n` +
      `🔖 *Tipo:* ${tipoSolicitacao.toUpperCase()}\n\n` +
      `📌 *Mensagem original do cliente:*`
    );
    if (mensagemBody) await sendMessage(ATENDENTE_ATUAL, `📨 ${mensagemBody}`);
    console.log(`[NOTIF] Atendente notificado - Tipo: ${tipoSolicitacao} - Fila restante: ${filaSolicitacoes.length}`);
  } catch (err) {
    console.error(`[ERRO NOTIF] ${err.message}`);
    atendenteLivre = true;
    return;
  }
  await sendMessage(jid, `✅ *Você foi atendido!*\n\n🎯 O atendente recebeu sua solicitação.\nAguarde a resposta.`);
  emAtendimentoHumano.add(jid);
  if (tipoSolicitacao === "comprovante" || tipoSolicitacao === "pagamento") kpis.comprovantesRecebidos++;
  else if (tipoSolicitacao === "pass") kpis.passCheckins++;
  else if (tipoSolicitacao === "atendimento") kpis.atendimentosSolicitados++;
}

async function transferirParaAtendente(jid, tipo, mensagemBody) {
  await adicionarFilaSolicitacao(jid, tipo, mensagemBody);
}

// ================================
// MENUS
// ================================
async function showMainMenu(jid) {
  setState(jid, "menu_principal");
  await sendMessage(jid,
    `> *PIZZARIA EXEMPLO - MENU PRINCIPAL* 🍕\n\n` +
    `*ESCOLHA UMA OPÇÃO:*\n\n` +
    `1 - 🍕 Cardápio / Sabores / Preços\n` +
    `2 - 🎉 Promoções / Combos\n` +
    `3 - 🛍️ Pedidos / Bebidas\n` +
    `4 - 🗣️ Falar com Atendente\n` +
    `5 - ℹ️ Informações\n` +
    `6 - 📝 Feedback\n\n` +
    `Digite um número ou escreva *menu* para voltar ao início`
  );
}

async function showCardapioPrecos(jid) {
  const ctx = stateData.get(jid) || {};
  const selecionado = ctx.modalidade ? `*Seleção atual:* ${ctx.modalidade}\n\n` : "";
  setState(jid, "cardapio_precos");
  await sendMessage(jid,
    `> *CARDÁPIO / PREÇOS / HORÁRIOS* 🍕\n\n` +
    `${selecionado}` +
    `Escolha uma das opções abaixo:\n\n` +
    `1 - Sabores\n` +
    `2 - Tamanhos e Preços\n` +
    `3 - Horários de Funcionamento\n\n` +
    `0 - Voltar ao Menu Principal\n\n` +
    `Digite *1-3* ou *0* para voltar`
  );
}

async function showCardapio(jid, flow = null) {
  setState(jid, "cardapio", { flow });
  await sendMessage(jid,
    `> *SABORES DISPONÍVEIS* 🍕\n\n` +
    `1 - Portuguesa\n` +
    `2 - Calabresa\n` +
    `3 - Frango c/ Catupiry\n` +
    `4 - Quatro Queijos\n` +
    `5 - Pepperoni\n` +
    `6 - Marguerita\n` +
    `7 - Chocolate\n` +
    `8 - Romeu e Julieta\n` +
    `9 - Banana Nevada\n\n` +
    `*Digite 1-9 ou 0 para voltar*`
  );
}

async function showValores(jid, flow = null) {
  const ctxAtual = stateData.get(jid) || {};
  const selecionado = ctxAtual.modalidade ? `*Pizza atual:* ${ctxAtual.modalidade}\n\n` : "";

  setState(jid, "valores", {
    flow: flow || ctxAtual.flow,
    modalidade: ctxAtual.modalidade
  });

  await sendMessage(jid,
    `> *TAMANHOS E PREÇOS*\n\n` +
    `${selecionado}` +
    `1 - Pizza Inteira\n` +
    `2 - Meia Pizza\n` +
    `3 - Combos\n` +
    `4 - Bebidas\n` +
    `0 - Voltar\n\n` +
    `*Digite 1-4 ou 0 para voltar*`
  );
}

async function showPrecoInteira(jid) {
  const ctx = stateData.get(jid) || {};
  const modalidadePreSelecionada = ctx.modalidade;

  setState(jid, "preco_inteira", {
    flow: ctx.flow,
    modalidade: modalidadePreSelecionada
  });

  if (modalidadePreSelecionada) {
    const preco = PRECO_MODALIDADES[modalidadePreSelecionada.toLowerCase()] || "Preço não disponível";
    await sendMessage(jid,
      `✅ *${modalidadePreSelecionada}* — Inteira\n\n` +
      `${preco}\n\n` +
      `*1 - Confirmar e seguir para horários*\n` +
      `*0 - Voltar*`
    );
  } else {
    await sendMessage(jid,
      `> *PREÇOS — PIZZA INTEIRA* 🍕\n\n` +
      `1 - Portuguesa      R$ 55,00\n` +
      `2 - Calabresa       R$ 45,00\n` +
      `3 - Frango Catupiry R$ 50,00\n` +
      `4 - Quatro Queijos  R$ 52,00\n` +
      `5 - Pepperoni       R$ 58,00\n` +
      `6 - Marguerita      R$ 42,00\n` +
      `7 - Chocolate       R$ 48,00\n` +
      `8 - Romeu e Julieta R$ 46,00\n` +
      `9 - Banana Nevada   R$ 44,00\n\n` +
      `*Digite 1-9 ou 0 para voltar*`
    );
  }
}

async function showPrecoMeia(jid) {
  const ctx = stateData.get(jid) || {};
  const modalidadePreSelecionada = ctx.modalidade;

  setState(jid, "preco_meia", {
    flow: ctx.flow,
    modalidade: modalidadePreSelecionada
  });

  if (modalidadePreSelecionada) {
    const preco = PRECO_MODALIDADES[modalidadePreSelecionada.toLowerCase()] || "Preço não disponível";
    await sendMessage(jid,
      `✅ *${modalidadePreSelecionada}* — Meia\n\n` +
      `${preco}\n\n` +
      `*1 - Confirmar e seguir para horários*\n` +
      `*0 - Voltar*`
    );
  } else {
    await sendMessage(jid,
      `> *PREÇOS — MEIA PIZZA* 🍕\n\n` +
      `1 - Portuguesa      R$ 30,00\n` +
      `2 - Calabresa       R$ 25,00\n` +
      `3 - Frango Catupiry R$ 28,00\n` +
      `4 - Quatro Queijos  R$ 29,00\n` +
      `5 - Pepperoni       R$ 32,00\n` +
      `6 - Marguerita      R$ 24,00\n` +
      `7 - Chocolate       R$ 27,00\n` +
      `8 - Romeu e Julieta R$ 26,00\n` +
      `9 - Banana Nevada   R$ 25,00\n\n` +
      `*Digite 1-9 ou 0 para voltar*`
    );
  }
}

async function showCombos(jid) {
  const ctx = stateData.get(jid) || {};
  setState(jid, "combos", { flow: ctx.flow, modalidade: ctx.modalidade });

  await sendMessage(jid,
    `> *COMBOS E PROMOÇÕES* 🎉\n\n` +
    `1 - Combo Família: 2 pizzas inteiras + 2 refris 2L = R$ 110,00\n` +
    `2 - Combo Casal: 1 pizza inteira + 1 refri 1L = R$ 60,00\n` +
    `3 - Combo Kids: 1 meia pizza + suco = R$ 35,00\n` +
    `4 - Segunda Dobrada: 2ª pizza com 30% OFF\n` +
    `5 - Fidelidade: 10ª pizza grátis\n\n` +
    `*Digite 1-5 ou 0 para voltar*`
  );
}

async function showBebidas(jid) {
  const ctx = stateData.get(jid) || {};
  setState(jid, "bebidas", { flow: ctx.flow, modalidade: ctx.modalidade });

  await sendMessage(jid,
    `> *BEBIDAS* 🥤\n\n` +
    `1 - Refrigerante 2L    R$ 12,00\n` +
    `2 - Refrigerante 1L    R$ 8,00\n` +
    `3 - Suco Natural       R$ 10,00\n\n` +
    `*Digite 1-3 ou 0 para voltar*`
  );
}

async function showHorarios(jid) {
  const ctx = stateData.get(jid) || {};
  const modalidade = ctx.modalidade || null;
  const selecionado = modalidade ? `*Sabor atual:* ${modalidade}\n\n` : "";

  setState(jid, "horarios", {
    modalidade,
    flow: ctx.flow || null
  });

  let menu =
    `> *HORÁRIOS DISPONÍVEIS* 🕒\n\n` +
    `${selecionado}` +
    `*Segunda a Sexta:* 18h00 às 23h00\n` +
    `*Sábado e Domingo:* 17h00 às 00h00\n\n` +
    `🛵 *Entrega:* até 5km sem taxa\n` +
    `📍 *Retirada no balcão:* disponível\n\n` +
    `*1 - Finalizar*\n` +
    `*0 - Voltar ao menu anterior*`;

  await sendMessage(jid, menu);
}

async function showPromocoes(jid) {
  setState(jid, "promocoes");
  await sendMessage(jid,
    `> *PROMOÇÕES* 🎉\n\n` +
    `1 - Cupom de desconto\n` +
    `2 - Programa fidelidade\n\n` +
    `0 - Voltar\n\n` +
    `*Digite 1, 2 ou 0 para voltar*`
  );
}

async function showInformacoes(jid) {
  setState(jid, "informacoes");
  await sendMessage(jid,
    `> *INFORMAÇÕES DA PIZZARIA EXEMPLO* ℹ️\n\n` +
    `📍 *Localização:*\n` +
    `Rua das Pizzas, 42\n` +
    `CEP: 00000-000 - São Paulo/SP\n\n` +
    `📞 *Contato:*\n` +
    `WhatsApp: (11) 90000-0001\n\n` +
    `🌐 *Redes Sociais:*\n` +
    `Instagram: @pizzaria_exemplo\n\n` +
    `🕒 *Horário de Funcionamento:*\n` +
    `Seg a Sex: 18h às 23h\n` +
    `Sáb e Dom: 17h às 00h\n\n` +
    `🛵 Entrega e retirada disponíveis\n\n` +
    `*1 - Falar com atendente*\n` +
    `*0 - Voltar ao menu principal*\n\n` +
    `*Digite 1 ou 0*`
  );
}

async function showFeedback(jid) {
  setState(jid, "feedback");
  await sendMessage(jid,
    `> *FEEDBACK - SUA OPINIÃO É IMPORTANTE* 📝\n\n` +
    `*Ajude-nos a melhorar! Escolha uma opção:*\n\n` +
    `1 - ⭐ Avaliar atendimento (1-5 estrelas)\n` +
    `2 - 💡 Sugerir melhorias\n` +
    `3 - ⚠ Reportar problema técnico\n` +
    `4 - 🙏 Elogios e agradecimentos\n\n` +
    `0 - Voltar ao menu principal\n\n` +
    `*Digite 1-4 ou 0 para voltar*`
  );
}

// ================================
// INICIALIZAÇÃO — Baileys
// ================================
async function startBot() {
  console.log("\n" + "=".repeat(50));
  console.log("🚀 INICIANDO BOT DA PIZZARIA EXEMPLO (BAILEYS)");
  console.log("=".repeat(50) + "\n");

  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState('.sys/.baileys_auth');

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: require('pino')({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.clear();
      console.log("\n" + "=".repeat(60));
      console.log("📱 QR CODE - ESCANEIE COM SEU WHATSAPP AGORA! 📱");
      console.log("=".repeat(60) + "\n");
      qrcode.generate(qr, { small: true });
      console.log("\n👆 Abra o WhatsApp > Configurações > Aparelhos vinculados\n");
    }

    if (connection === 'open') {
      console.log("\n" + "=".repeat(60));
      console.log("✅  BOT CONECTADO E ATIVO! (BAILEYS)");
      console.log(`⏰ Horário de início: ${new Date().toLocaleString('pt-BR')}`);
      console.log("=".repeat(60) + "\n");
      isConnected = true;
    }

    if (connection === 'close') {
      isConnected = false;
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("\n❌ CONEXÃO FECHADA");
      console.log(`⏰ Horário de queda: ${new Date().toLocaleString('pt-BR')}`);
      console.log(`Razão: ${lastDisconnect?.error?.message || 'desconhecida'}`);
      if (shouldReconnect) {
        console.log("🔄 Reconectando em 2 segundos...\n");
        setTimeout(() => startBot(), 2000);
      } else {
        console.log("🔴 Sessão encerrada (logout). Apague .sys/.baileys_auth e reinicie.\n");
      }
    }
  });

  // Terminal de testes
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', async (input) => {
    const cmd = input.trim().toLowerCase();
    if (!sock || !isConnected) { console.log('[AVISO] Bot não conectado.'); return; }
    try {
      if (cmd.startsWith("liberar ")) {
        const numero = cmd.split(" ")[1].replace(/\D/g, '') + "@s.whatsapp.net";
        if (emAtendimentoHumano.has(numero)) {
          emAtendimentoHumano.delete(numero);
          await sendMessage(numero, `✅ *Atendimento encerrado*\n\nDigite *menu* para voltar ao início.`);
          await sendMessage(ATENDENTE_ATUAL, `✅ Terminal: cliente ${numero.split('@')[0]} liberado.`);
          console.log(`[LIBERADO] ${numero} via terminal`);
          atendenteLivre = true;
          await processarFilaSolicitacoes();
        } else { console.log(`[AVISO] ${numero} não está em atendimento humano`); }
      } else if (cmd === "kpi status") {
        const r = gerarRelatorioKpi(); console.log(r);
        await sendMessage(ATENDENTE_ATUAL, `📊 KPI via terminal:\n${r}`);
      } else if (cmd === "limite on") { limiteMensagensAtivo = true; console.log('Limite ativado.'); }
      else if (cmd === "limite off") { limiteMensagensAtivo = false; console.log('Limite desativado.'); }
      else if (cmd === "limite status") { console.log(`Limite: ${limiteMensagensAtivo ? 'ativado' : 'desativado'}`); }
      else if (cmd.length > 0) { console.log(`[TERMINAL] Comando não reconhecido: ${cmd}`); }
    } catch (err) { console.error('[ERRO TERMINAL]', err.message); }
  });

  // ==================================
  // HANDLER DE MENSAGENS — Baileys
  // ==================================
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const message of messages) {
      try {
        if (!message.message) continue;
        if (message.key.fromMe) continue;

        const jid = normalizarJid(message.key.remoteJid);
        if (!jid || jid.endsWith('@g.us') || jid.includes('@broadcast')) continue;
        // ✅ FIX: Ignora JIDs inválidos (não @s.whatsapp.net) para evitar broadcasts ou mensagens estranhas
        if (!jid.endsWith('@s.whatsapp.net')) {
          console.log(`[IGNORADO] JID inválido: ${jid}`);
          continue;
        }
        if (ignoredContacts.has(jid)) continue;

        // Extrai o texto da mensagem (suporta texto normal e extended)
        const texto = (
          message.message?.conversation ||
          message.message?.extendedTextMessage?.text ||
          ''
        ).trim().toLowerCase();

        if (!texto) continue;

        if (LOG_MENSAGENS) {
          const isStaffLog = ADMIN_JIDS.has(jid) || CONTATO_SUPORTE.has(jid) || jid === ATENDENTE_ATUAL;
          if (!isStaffLog) console.log(`[RECEBIDO] ${jid.split('@')[0]} → "${texto}"`);
        }

        const isStaff = ADMIN_JIDS.has(jid) || CONTATO_SUPORTE.has(jid) || jid === ATENDENTE_ATUAL;

        // Se em atendimento humano — cliente: repassa; staff: só aceita comandos
        if (emAtendimentoHumano.has(jid) && !isStaff) {
          await sendMessage(ATENDENTE_ATUAL, `📨 *Cliente em atendimento enviou mensagem:*\n${jid.split('@')[0]}: ${texto}`);
          continue;
        }
        if (emAtendimentoHumano.has(jid) && isStaff) {
          if (!texto.startsWith('liberar') && !texto.startsWith('limite') && !texto.startsWith('kpi') && texto !== 'menu') {
            await sendMessage(jid, '🔒 Modo atendimento humano. Comandos: liberar [número], limite, kpi, menu.');
            continue;
          }
        }

        // Verificar limite
        if (await verificarLimite(jid)) {
          await sendMessage(jid, "⚠️ *Muitas mensagens enviadas!*\n\nO bot ficará pausado para você por 1 hora.\nSe precisar de ajuda urgente, entre em contato com a recepção.");
          continue;
        }

        // LIBERAR CLIENTE
        if (texto.startsWith("liberar")) {
          if (!isStaff) { await sendMessage(jid, "❌ Sem permissão."); continue; }
          const partes = texto.split(/\s+/);
          if (partes.length < 2) { await sendMessage(jid, "Uso: liberar 5513999999999"); continue; }
          const numeroLiberar = partes[1].replace(/\D/g, '') + "@s.whatsapp.net";
          if (emAtendimentoHumano.has(numeroLiberar)) {
            emAtendimentoHumano.delete(numeroLiberar);
            kpis.clientesLiberados++;
            await sendMessage(numeroLiberar, `✅ *Atendimento encerrado.*\nDigite *menu* para ver as opções.`);
            await sendMessage(jid, `✅ Cliente ${numeroLiberar.split('@')[0]} liberado.\n\n📋 Fila atual: ${filaSolicitacoes.length} cliente(s) aguardando.`);
            console.log(`[LIBERADO] ${numeroLiberar} por ${jid.split('@')[0]}`);
            atendenteLivre = true;
            await processarFilaSolicitacoes();
          } else {
            await sendMessage(jid, `⚠️ ${numeroLiberar.split('@')[0]} não está em atendimento.`);
          }
          continue;
        }

        if (!isStaff && !canReply(jid)) continue;
        if (!isStaff) await delayHumano();
        registrarMensagemKpi();

        let estado = estados.get(jid) || "menu_principal";

        if (estado === "inativo") { await showMainMenu(jid); continue; }
        if (texto === "menu") { await showMainMenu(jid); continue; }

        // COMANDOS STAFF
        if (isStaff) {
          if (texto === "limite on") { limiteMensagensAtivo = true; await sendMessage(jid, "✅ Limite ativado."); continue; }
          if (texto === "limite off") { limiteMensagensAtivo = false; await sendMessage(jid, "✅ Limite desativado."); continue; }
          if (texto === "limite status") { await sendMessage(jid, `🔎 Limite: ${limiteMensagensAtivo ? "ativado" : "desativado"}.`); continue; }
          if (texto === "kpi status") { await sendMessage(jid, gerarRelatorioKpi()); continue; }
        }

        // ==============================
        // FLUXO PRINCIPAL
        // ==============================
        switch (estado) {
          case "menu_principal": {
            switch (texto) {
              case "1": await showCardapioPrecos(jid); break;
              case "2": await showPromocoes(jid); break;
              case "3": await showBebidas(jid); break;
              case "4": await transferirParaAtendente(jid, "atendimento", texto); clearState(jid); break;
              case "5":
                await showInformacoes(jid);
                break;
              case "6":
                await showFeedback(jid);
                break;
              default:
                if (!primeiroContato.has(jid)) {
                  primeiroContato.add(jid);
                  kpis.atendimentosIniciados++;
                  await showMainMenu(jid);
                } else {
                  await sendMessage(jid, "Opção inválida. Digite 1 a 6 ou *menu*.");
                }
            }
            break;
          }

          case "informacoes": {
            await showMainMenu(jid);
            break;
          }

          case "feedback": {
            if (texto === "0") {
              await showMainMenu(jid);
            } else {
              await sendMessage(ATENDENTE_ATUAL, `📝 *FEEDBACK*\n\n👤 Cliente: ${jid.split('@')[0]}\n💬 ${texto}`);
              await sendMessage(jid, `✅ *Obrigado pelo feedback!*`);
              clearState(jid);
            }
            break;
          }

          case "cardapio_precos": {
            switch (texto) {
              case "1": await showCardapio(jid, "cardapio_first"); break;
              case "2": await showValores(jid, "valores_first"); break;
              case "3": await showHorarios(jid); break;
              case "0": await showMainMenu(jid); break;
              default: await sendMessage(jid, "Opção inválida. Digite 1, 2, 3 ou 0.");
            }
            break;
          }

          case "cardapio": {
            const sabores = {
              "1": "Portuguesa",
              "2": "Calabresa",
              "3": "Frango c/ Catupiry",
              "4": "Quatro Queijos",
              "5": "Pepperoni",
              "6": "Marguerita",
              "7": "Chocolate",
              "8": "Romeu e Julieta",
              "9": "Banana Nevada"
            };
            if (sabores[texto]) {
              const saborEscolhido = sabores[texto];
              const userCtx = stateData.get(jid) || {};
              const flow = userCtx.flow;
              if (flow === "cardapio_first" || flow === "valores_first") {
                setState(jid, "valores", { modalidade: saborEscolhido, flow });
                await sendMessage(jid, `✅ OK - ${saborEscolhido} selecionado!\n\n*TAMANHOS E PREÇOS*\n\n1 - Pizza Inteira\n2 - Meia Pizza\n3 - Combos\n4 - Bebidas\n\nDigite 1-4 ou 0 para voltar`);
              } else {
                const preco = PRECO_MODALIDADES[saborEscolhido.toLowerCase()] || "Preço não disponível";
                setState(jid, "modalidade_selecionada", { modalidade: saborEscolhido });
                await sendMessage(jid, `✅ OK - ${saborEscolhido} selecionado!\n💰 Preço estimado: ${preco}\n\nDigite 1 para confirmar e seguir para o pedido\nDigite 0 para voltar ao cardápio`);
              }
            } else if (texto === "0") {
              await showCardapioPrecos(jid);
            } else {
              await sendMessage(jid, "Opção inválida. Digite 1 a 9 ou 0.");
            }
            break;
          }

          case "valores": {
            const userCtx = stateData.get(jid) || {};
            const flow = userCtx.flow;
            const modalidade = userCtx.modalidade;
            switch (texto) {
              case "1": await showPrecoInteira(jid); break;
              case "2": await showPrecoMeia(jid); break;
              case "3": await showCombos(jid); break;
              case "4": await showBebidas(jid); break;
              case "0": await showCardapioPrecos(jid); break;
              default: await sendMessage(jid, "Digite 1, 2, 3, 4 ou 0.");
            }
            break;
          }

          case "modalidade_selecionada": {
            if (texto === "1") {
              const userCtx = stateData.get(jid) || {};
              const modalidade = userCtx.modalidade;
              if (!modalidade) { await sendMessage(jid, "Erro: sabor não encontrado. Digite *menu* e tente novamente."); break; }
              setState(jid, "pagamentos", { modalidade }, 8 * 60 * 1000);
              await sendMessage(jid, `*Pedido Registrado*\nSabor: ${modalidade}\nPor favor informe seu *nome completo* (ex: João Silva)`);
            } else if (texto === "0") {
              await showCardapio(jid);
            } else {
              await sendMessage(jid, "Digite 1 para confirmar ou 0 para voltar.");
            }
            break;
          }

          case "preco_inteira": {
            if (texto === "1") {
              const userCtx = stateData.get(jid) || {};
              const modalidade = userCtx.modalidade;
              setState(jid, "confirmacao_horarios", { modalidade, valor: "inteira", flow: userCtx.flow });
              await sendMessage(jid, `✅ Confirmado: ${modalidade} (inteira)\n\n> *HORÁRIOS DISPONÍVEIS*\n\nSegunda a Sexta: 18h00 às 23h00\nSábado e Domingo: 17h00 às 00h00\n\n1 - Seguir para pedido\n0 - Voltar ao menu`);
            } else if (texto === "0") {
              await showValores(jid, stateData.get(jid)?.flow);
            } else {
              await sendMessage(jid, "Digite 1 para confirmar ou 0 para voltar.");
            }
            break;
          }

          case "preco_meia": {
            if (texto === "1") {
              const userCtx = stateData.get(jid) || {};
              const modalidade = userCtx.modalidade;
              setState(jid, "confirmacao_horarios", { modalidade, valor: "meia", flow: userCtx.flow });
              await sendMessage(jid, `✅ Confirmado: ${modalidade} (meia)\n\n> *HORÁRIOS DISPONÍVEIS*\n\nSegunda a Sexta: 18h00 às 23h00\nSábado e Domingo: 17h00 às 00h00\n\n1 - Seguir para pedido\n0 - Voltar ao menu`);
            } else if (texto === "0") {
              await showValores(jid, stateData.get(jid)?.flow);
            } else {
              await sendMessage(jid, "Digite 1 para confirmar ou 0 para voltar.");
            }
            break;
          }

          case "combos": {
            if (texto === "0") {
              await showValores(jid, stateData.get(jid)?.flow);
            } else {
              await sendMessage(jid, "Digite 0 para voltar.");
            }
            break;
          }

          case "bebidas": {
            if (texto === "0") {
              await showValores(jid, stateData.get(jid)?.flow);
            } else {
              await sendMessage(jid, "Digite 0 para voltar.");
            }
            break;
          }

          case "promocoes": {
            if (texto === "0") {
              await showMainMenu(jid);
            } else {
              await sendMessage(jid, "Digite 0 para voltar.");
            }
            break;
          }

          case "horarios": {
            if (texto === "1") {
              const userCtxHorarios = stateData.get(jid) || {};
              setState(jid, "confirmacao_horarios", { modalidade: userCtxHorarios.modalidade, valor: userCtxHorarios.valor, flow: userCtxHorarios.flow });
              await sendMessage(jid, `> *HORÁRIOS DISPONÍVEIS*\n\nSegunda a Sexta: 18h00 às 23h00\nSábado e Domingo: 17h00 às 00h00\n\n🛵 *Entrega:* até 5km sem taxa\n📍 *Retirada no balcão:* disponível\n\n1 - Seguir para pedido\n0 - Voltar ao menu`);
            } else if (texto === "0") {
              await showCardapioPrecos(jid);
            } else {
              await sendMessage(jid, "⚠️ Opção inválida. Digite 1 ou 0.");
            }
            break;
          }

          case "confirmacao_horarios": {
            const userCtxConf = stateData.get(jid) || {};
            const modConf = userCtxConf.modalidade;
            const valConf = userCtxConf.valor;
            if (!modConf) {
              await sendMessage(jid, "❌ Erro: sabor não encontrado. Digite *menu* para voltar.");
              clearState(jid);
              break;
            }
            switch (texto) {
              case "1":
                setState(jid, "pagamentos", { modalidade: modConf, valor: valConf }, 8 * 60 * 1000);
                await sendMessage(jid, `*PEDIDO REGISTRADO*\n📚 Sabor: ${modConf}\n${valConf ? `💰 Tipo: ${valConf}\n` : ""}Por favor informe seu *nome completo* (ex: João Silva)`);
                break;
              case "0":
                await showMainMenu(jid);
                break;
              default:
                await sendMessage(jid, "⚠️ Digite 1 para seguir ao pedido ou 0 para voltar.");
            }
            break;
          }

          case "pagamentos": {
            const userCtxPag = stateData.get(jid) || {};
            const modArmazenada = userCtxPag.modalidade;
            if (modArmazenada) {
              const nome = texto.trim();
              if (!nome || nome.length < 3) { await sendMessage(jid, "❌ Informe um nome válido (mínimo 3 letras)."); break; }
              stateData.set(jid, { nome, modalidade: modArmazenada, valor: userCtxPag.valor });
              await sendMessage(jid,
                `*Pedido Registrado*\n\n👤 Nome: ${nome}\n📚 Sabor: ${modArmazenada}\n💰 Tipo: ${userCtxPag.valor || 'a confirmar'}\n\n✅ Seu pedido foi registrado!\nNosso atendente vai entrar em contato para confirmar o pedido.\n\nObrigado pela preferência!`
              );
              await transferirParaAtendente(jid, "pagamento", texto);
              clearState(jid);
            } else if (texto.includes("-")) {
              const partes = texto.split("-").map(s => s.trim());
              const nome = partes[0];
              const modalidade = partes.slice(1).join("-").trim();
              if (!nome || !modalidade) { await sendMessage(jid, "❌ Formato incorreto.\nExemplo: João Silva - Portuguesa"); break; }
              const modNorm = modalidade.toLowerCase();
              const modValida = MODALIDADES_VALIDAS.some(m => m === modNorm) || Object.keys(PRECO_MODALIDADES).some(k => k === modNorm);
              if (!modValida) { await sendMessage(jid, `❌ Sabor "${modalidade}" não reconhecido. Verifique a ortografia.`); break; }
              stateData.set(jid, { nome, modalidade });
              await sendMessage(jid,
                `*Pedido Registrado*\n\n👤 Nome: ${nome}\n📚 Sabor: ${modalidade}\n\n✅ Seu pedido foi registrado!\nNosso atendente vai entrar em contato.\n\nObrigado pela preferência!`
              );
              await transferirParaAtendente(jid, "pagamento", texto);
              clearState(jid);
            } else {
              await sendMessage(jid, `Para registrar o pedido, envie:\nSeu *nome completo*\n\nExemplo: *Maria Oliveira*`);
            }
            break;
          }

          case "confirmar_continuar": {
            switch (texto) {
              case "1":
                // Continuar: resetar timer com 8 minutos
                const currentState = estados.get(jid);
                const currentData = stateData.get(jid);
                setState(jid, currentState, currentData, 8 * 60 * 1000);
                await sendMessage(jid, "✅ Conversa continuada. Você tem mais 8 minutos.");
                break;
              case "2":
                await showMainMenu(jid);
                break;
              default:
                await sendMessage(jid, "Opção inválida. Digite 1 para continuar ou 2 para menu principal.");
            }
            break;
          }
          default: {
            await showMainMenu(jid);
            break;
          }
        }

      } catch (err) {
        console.error('[ERRO MENSAGEM]', err.message);
        if (err.stack) console.error(err.stack);
      }
    }
  });
}

startBot().catch(err => {
  console.error("❌ ERRO AO INICIAR BOT (BAILEYS):", err);
  process.exit(1);
});
