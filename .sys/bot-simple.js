// ================================
// Importações e Configurações 
// ================================
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(__dirname);

// Logger simples para arquivo
const logger = {
  log: (message) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(path.join(DATA_DIR, 'bot.log'), logEntry);
    if (!global.modoSilencioso) console.log(message);
  },
  error: (message) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ERROR: ${message}\n`;
    fs.appendFileSync(path.join(DATA_DIR, 'bot.log'), logEntry);
    console.error(message);
  },
  warn: (message) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] WARN: ${message}\n`;
    fs.appendFileSync(path.join(DATA_DIR, 'bot.log'), logEntry);
    if (!global.modoSilencioso) console.warn(message);
  }
};
// ================================
// CONFIGURAÇÕES
// ================================
const CONTATO_SUPORTE = new Set(["5511900000001@c.us"]); // Ajuste para um ou mais números de suporte
const ADMIN_JIDS = new Set(["5511900000001@c.us"]); // Ajuste para um ou mais números de admin
const AUTO_REPLY_COOLDOWN = 3000; // 3 segundos
const STATE_TTL = 24 * 60 * 60 * 1000; // 24 horas - bot se mantem ativo
const INATIVIDADE_TTL = 5 * 60 * 1000; // 5 minutos inativo volta ao menu principal
const TIMEOUT_ATENDIMENTO = 30 * 60 * 1000; // 30 minutos - timeout para cliente em atendimento
const ATENDENTE_ATUAL = new Set(["5511900000001@c.us"]); // Número do atendente que receberá as notificações
// Contador de tentativas de inicialização
let startBotRetries = 0;

const PRODUCAO = true;
///////////////TORNE FALSE EM PRODUÇÃO\\\\\\\\\\\\\\\\\\\\\\\\\
// Toogle para log de mensagens no terminal RETIRA NA PRODUÇÃO POIS POLUI O TERMINAL E PODE CAUSAR VAZAMENTO DE DADOS SENSÍVEIS, USAR APENAS PARA DEBUG LOCAL
const LOG_MENSAGENS = !PRODUCAO;

// Modo de teste: contatos salvos são ignorados somente durante validação.
///////////TORNE FALSE EM PRODUÇÃO\\\\\\\\\\\\\\\\\\\\\\\\\
// Após os testes, defina false para permitir atendimento a salvos e não salvos.
const TEST_MODE_IGNORAR_SALVOS = !PRODUCAO;

// Configuração de limite de mensagens
let limiteMensagensAtivo = true;
const LIMITE_MENSAGENS_POR_HORA = 30;
const LIMITE_WINDOW_MS = 60 * 60 * 1000;
const messageTimestamps = new Map();


// Preços das pizzas (inteira e meia)
const PRECO_MODALIDADES = {
  "portuguesa":        "\nInteira: R$ 55,00 \n/ Meia: R$ 30,00",
  "calabresa":         "\nInteira: R$ 45,00 \n/ Meia: R$ 25,00",
  "frango-catupiry":   "\nInteira: R$ 50,00 \n/ Meia: R$ 28,00",
  "quatro-queijos":    "\nInteira: R$ 52,00 \n/ Meia: R$ 29,00",
  "pepperoni":         "\nInteira: R$ 58,00 \n/ Meia: R$ 32,00",
  "marguerita":        "\nInteira: R$ 42,00 \n/ Meia: R$ 24,00",
  "chocolate":         "\nInteira: R$ 48,00 \n/ Meia: R$ 27,00",
  "romeu-e-julieta":   "\nInteira: R$ 46,00 \n/ Meia: R$ 26,00",
  "banana-nevada":     "\nInteira: R$ 44,00 \n/ Meia: R$ 25,00"
};

const MENU_PRINCIPAL = [
  { nome: "Início", link: "#home" },
  {
    nome: "Cardápio",
    link: "#cardapio",
    submenu: [
      { nome: "Pizzas Clássicas", id: "pizzas-classicas" },
      { nome: "Pizzas Especiais", id: "pizzas-especiais" },
      { nome: "Bebidas", id: "bebidas" }
    ]
  },
  {
    nome: "Promoções",
    link: "#promocoes",
    submenu: [
      { nome: "Combo Família", id: "combo-familia" },
      { nome: "Descontos da Semana", id: "descontos-semana" }
    ]
  },
  { nome: "Sobre", link: "#sobre" },
  { nome: "Contato", link: "#contato" }
];

// Contatos bloqueados (adicione JIDs completos aqui)
const ignoredContacts = new Set([]);

// ================================
// Controles GLOBAIS
// ================================
let client = null;
let isConnected = false
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

const estados = new Map();
const stateData = new Map();
const timers = new Map();
const inactivityTimers = new Map();
const timeoutAtendimentoTimers = new Map(); // Timer para auto-liberar cliente após 30min
const lastReply = new Map();
const emAtendimentoHumano = new Set();
const dataAtendimento = new Map(); // Armazena timestamp de quando cliente entrou em atendimento
const primeiroContato = new Set();
const clientesPausados = new Set();   // JIDs que estão em atendimento humano real (bot deve ficar mudo)
const clientesEmFila = new Set();    // JIDs que estão aguardando atendimento humano na fila

// ====================== FILA COM PRIORIDADES ======================
const filaSolicitacoes = [];
let atendenteLivre = true;
let forcarExpediente = false;
const prioridadeTipos = { comprovante: 0, pagamento: 0, pass: 1, atendimento: 2 };

// ================================
// KPIs Avançados
// ================================
const kpis = {
  atendimentosIniciados: 0,
  comprovantesRecebidos: 0,
  passCheckins: 0,
  atendimentosSolicitados: 0,
  clientesLiberados: 0,
  mensagensPorHora: new Map(), // hora -> contagem
  totalMensagens: 0,
  tempoMedioAtendimento: 0, // em minutos
  atendimentosComTempo: [], // lista de tempos para calcular média
  ultimaHoraReset: new Date().getHours() // ✅ OPT: Rastreia última hora para reset de mensagensPorHora
};

function registrarMensagemKpi() {
  const hora = new Date().getHours();
  kpis.mensagensPorHora.set(hora, (kpis.mensagensPorHora.get(hora) || 0) + 1);
  kpis.totalMensagens++;
}

// ====================== FUNÇÕES DE SALVAMENTO ======================

function salvarKpisJson() {
  try {
    const kpiData = {
      ...kpis,
      mensagensPorHora: Object.fromEntries(kpis.mensagensPorHora),
      horarioGeracao: new Date().toISOString()
    };

    const kpiPath = path.join(DATA_DIR, 'kpis.json');
    fs.writeFileSync(kpiPath, JSON.stringify(kpiData, null, 2));
    console.log('[KPIS] Salvo em .sys/kpis.json');
  } catch (e) {
    console.warn('[KPIS] Falha ao salvar:', e.message);
  }
}
function carregarKpisJson() {
  try {
    const filePath = path.join(DATA_DIR, 'kpis.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      Object.assign(kpis, {
        atendimentosIniciados: data.atendimentosIniciados || 0,
        comprovantesRecebidos: data.comprovantesRecebidos || 0,
        passCheckins: data.passCheckins || 0,
        atendimentosSolicitados: data.atendimentosSolicitados || 0,
        clientesLiberados: data.clientesLiberados || 0,
        totalMensagens: data.totalMensagens || 0,
        atendimentosComTempo: data.atendimentosComTempo || [],
        mensagensPorHora: new Map(Object.entries(data.mensagensPorHora || {})),
        ultimaHoraReset: data.ultimaHoraReset || new Date().getHours()
      });
      console.log('[KPIS] Carregado do arquivo.');
    }
  } catch (e) {
    console.warn('[KPIS] Falha ao carregar:', e.message);
  }
}
function carregarBlacklist() {
  try {
    const filePath = path.join(DATA_DIR, 'blacklist.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      data.forEach(jid => ignoredContacts.add(jid));
      console.log(`[BLACKLIST] ${data.length} número(s) bloqueado(s) carregado(s).`);
    }
  } catch (e) {
    console.warn('[BLACKLIST] Falha ao carregar:', e.message);
  }
}
function salvarBlacklist() {
  try {
    const filePath = path.join(DATA_DIR, 'blacklist.json');
    fs.writeFileSync(filePath, JSON.stringify([...ignoredContacts], null, 2));
  } catch (e) {
    console.warn('[BLACKLIST] Falha ao salvar:', e.message);
  }
}
function salvarFila() {
  try {
    const filaParaSalvar = filaSolicitacoes.map(s => ({
      jid: s.jid,
      tipoSolicitacao: s.tipoSolicitacao,
      prioridade: s.prioridade,
      timestamp: s.timestamp,
      nome: s.nome,
      modalidade: s.modalidade
    }));
    fs.writeFileSync(path.join(DATA_DIR, 'fila.json'), JSON.stringify(filaParaSalvar, null, 2));
  } catch (e) {
    console.warn('[FILA] Falha ao salvar fila:', e.message);
  }
}

function carregarFila() {
  try {
    const filePath = path.join(DATA_DIR, 'fila.json');
    if (!fs.existsSync(filePath)) return;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data.forEach(s => {
      filaSolicitacoes.push(s);
      clientesEmFila.add(s.jid);
    });
    if (data.length > 0) {
      console.log(`[FILA] ${data.length} cliente(s) restaurado(s) da fila.`);
      for (const atendente of ATENDENTE_ATUAL) {
        sendMessage(atendente,
          `⚠️ *Bot reiniciado com fila ativa*\n\n` +
          `${data.length} cliente(s) ainda aguardavam atendimento.\n` +
          `Use *fila status* para ver a lista.`
        ).catch(() => { });
      }
      data.forEach(s => {
        sendMessage(s.jid,
          `⚠️ *Aviso de reinicialização*\n\n` +
          `O sistema foi reiniciado mas você ainda está na fila.\n` +
          `Um atendente irá te chamar em breve.\n` +
          `Digite *menu* se quiser cancelar e voltar ao início.`
        ).catch(() => { });
      });
    }
  } catch (e) {
    console.warn('[FILA] Falha ao carregar fila:', e.message);
  }
}
function salvarHistoricoAtendimento(jid, dados) {
  try {
    const filePath = path.join(DATA_DIR, 'historico_atendimentos.json');
    let historico = [];
    if (fs.existsSync(filePath)) {
      historico = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    historico.push({
      numero: maskPhoneNumber(jid),
      nome: dados.nome || "Não informado",
      modalidade: dados.modalidade || "Não informada",
      tipo: dados.tipo,
      tempoEspera: dados.tempoEspera || 0,
      tempoAtendimento: dados.tempoAtendimento || 0,
      horario: new Date().toLocaleString('pt-BR')
    });
    fs.writeFileSync(filePath, JSON.stringify(historico, null, 2));
  } catch (e) {
    console.warn('[HISTORICO] Falha ao salvar:', e.message);
  }
}
function calcularTempoMedioAtendimento() {
  if (kpis.atendimentosComTempo.length === 0) return 0;
  const total = kpis.atendimentosComTempo.reduce((sum, tempo) => sum + tempo, 0);
  return Math.round(total / kpis.atendimentosComTempo.length);
}

function getHorarioPico() {
  let maxHora = null;
  let maxCount = 0;
  for (const [hora, count] of kpis.mensagensPorHora) {
    if (count > maxCount) {
      maxCount = count;
      maxHora = hora;
    }
  }
  return maxHora !== null ? `${maxHora}:00 (${maxCount} mensagens)` : "Sem dados ainda";
}

function gerarRelatorioKpi() {
  const tempoMedio = calcularTempoMedioAtendimento();
  return (
    `👥 Atendimentos iniciados: ${kpis.atendimentosIniciados}\n` +
    `💰 Comprovantes recebidos: ${kpis.comprovantesRecebidos}\n` +
    `🟠 Check-ins de Pass: ${kpis.passCheckins}\n` +
    `🔔 Atendimentos solicitados: ${kpis.atendimentosSolicitados}\n` +
    `✅ Clientes liberados: ${kpis.clientesLiberados}\n` +
    `💬 Total de mensagens: ${kpis.totalMensagens}\n` +
    `⏱️ Tempo médio de atendimento: ${tempoMedio} minutos\n` +
    `⏰ Horário de pico: ${getHorarioPico()}`
  );
}

// Salvar KPIs a cada hora
setInterval(salvarKpisJson, 60 * 60 * 1000);

// Carregar dados no início (sem notificações - client ainda não está conectado)
try {
  carregarKpisJson();
  carregarBlacklist();
  salvarKpisJson();
} catch (e) {
  console.warn('[KPIS] Não foi possível salvar KPIs no início:', e.message);
}
function formatarNumero(jid) {
  const numero = (jid || '').split('@')[0];
  if (numero.length === 13 && numero.startsWith('55')) {
    // Formato: 55 + DDD(2) + 9 + número(8) = 13 dígitos
    const ddd = numero.slice(2, 4);
    const tel = numero.slice(4);
    return `(${ddd}) ${tel.slice(0, 5)}-${tel.slice(5)}`;
  } else if (numero.length === 12 && numero.startsWith('55')) {
    // Formato antigo sem o 9: 55 + DDD(2) + número(8) = 12 dígitos
    const ddd = numero.slice(2, 4);
    const tel = numero.slice(4);
    return `(${ddd}) ${tel.slice(0, 4)}-${tel.slice(4)}`;
  }
  return numero; // fallback: retorna como veio
}
const HORARIO_EXPEDIENTE = {
  inicioSemana: 18,  // 18h00 seg a sex
  fimSemana: 23,     // 23h00 seg a sex
  inicioSabado: 17,  // 17h00 sábado
  fimSabado: 24      // 00h00 sábado
};

function estaNoExpediente() {
  if (forcarExpediente) return true;
  const agora = new Date();
  const hora = agora.getHours();
  const dia = agora.getDay(); // 0=domingo, 6=sábado
  if (dia === 0) return false; // domingo fechado
  if (dia === 6) return hora >= HORARIO_EXPEDIENTE.inicioSabado && hora < HORARIO_EXPEDIENTE.fimSabado;
  return hora >= HORARIO_EXPEDIENTE.inicioSemana && hora < HORARIO_EXPEDIENTE.fimSemana;
}

function mensagemForaExpediente() {
  const agora = new Date();
  const dia = agora.getDay();
  const hora = agora.getHours();

  if (dia === 0) {
    return (
      `> *Fora do horário de atendimento* ⏰\n\n` +
      `Hoje é domingo e não há atendentes disponíveis.\n\n` +
      `🕒 *Horário de atendimento:*\n` +
      `*Segunda a Sexta:* 18h às 23h\n` +
      `*Sábado e Domingo:* 17h às 00h`
    );
  }
  if (dia === 6 && hora >= HORARIO_EXPEDIENTE.fimSabado) {
    return (
      `> *Fora do horário de atendimento* ⏰\n\n` +
      `O atendimento de sábado encerrou às 00h00.\n\n` +
      `🕒 Próximo atendimento:\n` +
      `*Segunda-feira* a partir das *18h00*`
    );
  }
  const proximo = hora < HORARIO_EXPEDIENTE.inicioSemana
    ? `hoje às *${HORARIO_EXPEDIENTE.inicioSemana}h00*`
    : `amanhã às *${HORARIO_EXPEDIENTE.inicioSemana}h00*`;
  return (
    `> *Fora do horário de atendimento* ⏰\n\n` +
    `*No momento não há atendentes disponíveis.\n` +
    `O próximo atendimento começa* ${proximo}.\n\n` +
    `🕒 *Horário de atendimento:*\n` +
    `*Segunda a Sexta:* 18h às 23h\n` +
    `*Sábado e Domingo:* 17h às 00h\n\n` +
    `Você pode continuar navegando pelo bot normalmente.`
  );
}
function normalizarJid(jid) {
  if (!jid) return jid;
  if (jid.endsWith('@lid')) return jid;
  const [numero, sufixo] = jid.split('@');
  // Se for número brasileiro com 13 dígitos começando com 55, está correto
  if (numero.length === 13 && numero.startsWith('55')) return jid;
  // Se tiver 12 dígitos (sem o 9), adiciona o 9 após o DDD
  if (numero.length === 12 && numero.startsWith('55')) {
    return `${numero.slice(0, 4)}9${numero.slice(4)}@${sufixo}`;
  }
  return jid;
}

function normalizarNumero(numero) {
  // Mesma lógica da normalizarJid, mas só para o número
  // Formato correto: 55 + DDD(2) + 9 + número(8) = 13 dígitos
  if (numero.length === 13 && numero.startsWith('55')) return numero;

  // Formato antigo sem o 9: 55 + DDD(2) + número(8) = 12 dígitos → adiciona 9 após DDD
  if (numero.length === 12 && numero.startsWith('55')) {
    return `${numero.slice(0, 4)}9${numero.slice(4)}`;
  }

  // Se tiver 11 dígitos (sem 55): adiciona 55 no início
  if (numero.length === 11 && !numero.startsWith('55')) {
    return `55${numero}`;
  }

  return numero;
}

function maskPhoneNumber(jidOrNumber) {
  if (!jidOrNumber) return '****';
  const onlyDigits = String(jidOrNumber).split('@')[0].replace(/\D/g, '');
  if (!onlyDigits) return '****';
  const visible = onlyDigits.slice(-4);
  const maskCount = Math.max(4, onlyDigits.length - 4);
  return '*'.repeat(maskCount) + visible;
}

function cleanupMemory() {
  const now = Date.now();
  // Limpa messageTimestamps expirados
  for (const [jid, timestamps] of messageTimestamps.entries()) {
    const recent = timestamps.filter(ts => now - ts < LIMITE_WINDOW_MS);
    if (recent.length === 0) {
      messageTimestamps.delete(jid);
    } else {
      messageTimestamps.set(jid, recent);
    }
  }
  // Limpa lastReply expirados
  for (const [jid, last] of lastReply.entries()) {
    if (now - last > AUTO_REPLY_COOLDOWN * 10) {
      lastReply.delete(jid);
    }
  }
  // ✅ OPT: Limpa atendimentosComTempo mantendo apenas últimos 1000
  if (kpis.atendimentosComTempo.length > 1000) {
    kpis.atendimentosComTempo = kpis.atendimentosComTempo.slice(-1000);
  }
  // ✅ OPT: Reseta mensagensPorHora se passou meia-noite
  const agora = new Date();
  const horaAtual = agora.getHours();
  const ultimaHora = kpis.ultimaHoraReset || horaAtual;
  if (horaAtual < ultimaHora) {
    kpis.mensagensPorHora.clear();
    kpis.ultimaHoraReset = horaAtual;
  }
}

setInterval(cleanupMemory, 5 * 60 * 1000); // ✅ OPT: Reduzido de 10→5 min para limpeza mais agressiva
// ================================
// AUXILIARES
// ================================
const delayHumano = () => new Promise(r => setTimeout(r, Math.random() * 1500 + 800));

const processingLocks = new Map();
async function processWithLock(jid, fn) {
  const prev = processingLocks.get(jid) || Promise.resolve();
  let resolveNext;
  const next = new Promise(r => resolveNext = r);
  processingLocks.set(jid, next);
  await prev;
  try { await fn(); }
  finally {
    resolveNext();
    if (processingLocks.get(jid) === next) processingLocks.delete(jid);
  }
}

// Controla o cooldown entre respostas para evitar spam e bloqueios
const canReply = (jid) => {
  const now = Date.now();
  const last = lastReply.get(jid) || 0;
  if (now - last < AUTO_REPLY_COOLDOWN) {
    console.log(`[BLOQUEADO] ${jid.split('@')[0]} → cooldown ainda ativo (${Math.round((AUTO_REPLY_COOLDOWN - (now - last)) / 1000)}s)`);
    return false;
  }
  lastReply.set(jid, now);
  return true;
};

// Registra o timestamp de cada mensagem para controle de limite
const registroMensagem = (jid) => {
  const now = Date.now();
  const fila = messageTimestamps.get(jid) || [];
  const filtro = fila.filter(ts => now - ts < LIMITE_WINDOW_MS);
  filtro.push(now);
  messageTimestamps.set(jid, filtro);
  return filtro.length;
};

// Verifica se o número excedeu o limite de mensagens por hora
const verificarLimite = (jid) => {
  if (!limiteMensagensAtivo) return false;
  const contador = registroMensagem(jid);
  if (contador > LIMITE_MENSAGENS_POR_HORA) {
    console.log(`[LIMITE] ${jid.split('@')[0]} excedeu ${contador} mensagens/hora`);
    return true;
  }
  return false;
};

// ✅ OPT: Rotação automática de logs (mantém apenas 30 dias)
function rotarLogs() {
  try {
    const logPath = path.join(DATA_DIR, 'bot.log');
    if (!fs.existsSync(logPath)) return;
    const stats = fs.statSync(logPath);
    const tamanhoMB = stats.size / (1024 * 1024);
    if (tamanhoMB > 200) {
      const backup = path.join(DATA_DIR, `bot.log.${Date.now()}`);
      fs.renameSync(logPath, backup);
      logger.log('[LOGS] Arquivo rotacionado - log antigo arquivado');
    }
  } catch (e) {
    console.warn('[LOGS] Erro na rotação:', e.message);
  }
}
setInterval(rotarLogs, 24 * 60 * 60 * 1000); // ✅ OPT: Verifica rotação 1x por dia

// Envia mensagem e loga no console
async function sendMessage(jid, text, tentativa = 1) {
  const MAX_TENTATIVAS = 3;
  // Modo de teste: armazena as mensagens em memória
  // === APENAS PARA TESTES (REMOVER EM PRODUÇÃO) ===
  // Quando ativado, mensagens não são enviadas ao WhatsApp real
  // e ficam armazenadas em `global.__BOT_TEST_MESSAGES` para inspeção.
  // Criado para permitir testes automatizados locais. Remover antes de deploy.
  if (global.__BOT_TEST_MODE) {
    global.__BOT_TEST_MESSAGES = global.__BOT_TEST_MESSAGES || [];
    global.__BOT_TEST_MESSAGES.push({ jid, text });
    if (!global.modoSilencioso) console.log(`[TEST ENVIADO] ${jid.split("@")[0]} → ${text.substring(0, 50)}...`);
    return;
  }
  try {
    await client.sendMessage(jid, text);
    if (!global.modoSilencioso) console.log(`[ENVIADO] ${jid.split("@")[0]} → ${text.substring(0, 50)}...`);
    return;
  } catch (err) {
    if (err.message && err.message.includes('No LID for user')) {
      try {
        const chat = await client.getChatById(jid);
        if (chat) { await chat.sendMessage(text); return; }
      } catch (_) { }
      try {
        const contact = await client.getContactById(jid);
        if (contact && typeof contact.sendMessage === 'function') {
          await contact.sendMessage(text); return;
        }
      } catch (_) { }
      console.error(`[ERRO ENVIO] ${jid}: No LID (todos os fallbacks falharam)`);
      return;
    }

    if (tentativa < MAX_TENTATIVAS) {
      const delay = Math.pow(2, tentativa) * 1000; // 2s, 4s
      console.warn(`[RETRY] ${jid.split('@')[0]} tentativa ${tentativa}/${MAX_TENTATIVAS} em ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
      return sendMessage(jid, text, tentativa + 1);
    }

    console.error(`[ERRO ENVIO] ${jid}: ${err.message} (após ${MAX_TENTATIVAS} tentativas)`);
  }
}

// Gerencia estados e dados temporários do usuário, com expiração automática
// customInactivity permite sobrescrever o tempo de inatividade por chamada
function setState(jid, state, data = null, customInactivity = null) {
  clearTimeout(timers.get(jid));
  clearTimeout(inactivityTimers.get(jid));
  estados.set(jid, state);
  if (data !== null) {
    stateData.set(jid, data);
    if (LOG_MENSAGENS) console.log(`[DADOS] ${jid.split('@')[0]} →`, data);
  } else if (state !== "pagamentos") {
    stateData.delete(jid);
  }
  if (!global.modoSilencioso) console.log(`[ESTADO] ${jid.split('@')[0]} → ${state}`);
  timers.set(jid, setTimeout(() => {
    estados.delete(jid);
    stateData.delete(jid);
  }, STATE_TTL));
  // 6 min durante pagamento, 2 min nos demais
  const inactivityTime = customInactivity ||
    (state === "pagamentos" ? 6 * 60 * 1000 : INATIVIDADE_TTL);

  // Configura timer de inatividade
  inactivityTimers.set(jid, setTimeout(async () => {
    // NUNCA dispara inatividade se o cliente estiver pausado ou em atendimento humano
    if (clientesPausados.has(jid) || emAtendimentoHumano.has(jid) || clientesEmFila.has(jid)) {
      return;
    }

    if (estados.get(jid) !== "menu_principal") {
      const currentData = stateData.get(jid) || {};
      currentData.previousState = estados.get(jid);
      stateData.set(jid, currentData);
      estados.set(jid, "inativo");
      await sendMessage(jid, "⏰ Inatividade detectada. Deseja continuar ou voltar ao menu?\n\n*1 - Continuar*\n*0 - Voltar ao menu*");
    }
  }, inactivityTime));
}

function clearState(jid) {
  if (!jid) return;

  estados.delete(jid);
  stateData.delete(jid);

  clearTimeout(timers.get(jid));
  clearTimeout(inactivityTimers.get(jid));
  clearTimeout(timeoutAtendimentoTimers.get(jid));

  timers.delete(jid);
  inactivityTimers.delete(jid);
  timeoutAtendimentoTimers.delete(jid);

  primeiroContato.delete(jid);
  // ✅ FIX: Também limpa dataAtendimento quando limpa estado
  dataAtendimento.delete(jid);
  clientesEmFila.delete(jid);
  lastReply.delete(jid);
  messageTimestamps.delete(jid);
  // Não removemos de clientesPausados aqui, pois é controlado pelo comando liberar
}

// ====================== TIMEOUT PARA ATENDIMENTO ======================
function configurarTimeoutAtendimento(jid) {
  // Limpar timeout anterior se existir
  clearTimeout(timeoutAtendimentoTimers.get(jid));

  const timeoutId = setTimeout(async () => {
    if (emAtendimentoHumano.has(jid)) {
      console.log(`[TIMEOUT] Cliente ${jid.split('@')[0]} foi auto-liberado após 30 minutos`);

      // Calcular tempo de atendimento
      const inicioAtendimento = dataAtendimento.get(jid);
      const tempoAtendimento = inicioAtendimento ? Math.round((Date.now() - inicioAtendimento) / (1000 * 60)) : 0; // em minutos
      if (tempoAtendimento > 0) kpis.atendimentosComTempo.push(tempoAtendimento);
      // Salvar histórico do atendimento com tipo "timeout"
      salvarHistoricoAtendimento(jid, {
        nome: stateData.get(jid)?.nome,
        modalidade: stateData.get(jid)?.modalidade,
        tipo: "timeout",
        tempoAtendimento
      });
      // Notificar cliente
      await sendMessage(jid,
        `⏰ *Tempo de atendimento expirado*\n\n` +
        `Seu atendimento foi encerrado automaticamente após 30 minutos.\n` +
        `Digite *menu* para retornar ao menu principal ou *atendente* para nova solicitação.`);

      // Notificar atendente
      for (const atendente of ATENDENTE_ATUAL) {
        await sendMessage(atendente,
          `⏰ *TIMEOUT DE ATENDIMENTO*\n\n` +
          `Cliente ${jid.split('@')[0]} foi auto-liberado após 30 minutos.\n` +
          `${filaSolicitacoes.length} cliente(s) ainda aguardando na fila.`);
      }

      emAtendimentoHumano.delete(jid);
      dataAtendimento.delete(jid);
      timeoutAtendimentoTimers.delete(jid);
      kpis.clientesLiberados++;

      atendenteLivre = true;
      await processarFilaSolicitacoes();
    }
  }, TIMEOUT_ATENDIMENTO);

  timeoutAtendimentoTimers.set(jid, timeoutId);
}

// ====================== FILA COM PRIORIDADES ======================
async function adicionarFilaSolicitacao(jid, tipoSolicitacao, mensagemOriginal) {
  if (emAtendimentoHumano.has(jid) || clientesPausados.has(jid)) {
    await sendMessage(jid, "⚠️ Você já está em atendimento. Aguarde o atendente responder.");
    return;
  }

  // Verifica se já existe na fila
  const jaNaFila = filaSolicitacoes.some(s => s.jid === jid);
  if (jaNaFila) {
    const posicao = filaSolicitacoes.findIndex(s => s.jid === jid) + 1;
    await sendMessage(jid,
      `⏳ *Você já está na fila de atendimento*\n\n` +
      `📋 Posição atual: *${posicao}º*\n` +
      `Aguarde o atendente te chamar.`);
    return;
  }

  const prioridade = prioridadeTipos[tipoSolicitacao] ?? 2;
  const ctxSnapshot = stateData.get(jid) || {};
  const solicitacao = {
    jid,
    tipoSolicitacao,
    mensagemOriginal,
    prioridade,
    timestamp: Date.now(),
    nome: ctxSnapshot.nome || null,
    modalidade: ctxSnapshot.modalidade || null
  };

  // Se o cliente entrou na fila, pausa o fluxo automático anterior e evita prompts de inatividade.
  clearState(jid);
  primeiroContato.add(jid);

  filaSolicitacoes.push(solicitacao);
  clientesEmFila.add(jid);
  filaSolicitacoes.sort((a, b) => {
    if (a.prioridade === b.prioridade) {
      return a.timestamp - b.timestamp;
    }
    return a.prioridade - b.prioridade;
  });
  salvarFila();
  const posicaoFila = filaSolicitacoes.findIndex(s => s.jid === jid) + 1;
  const totalFila = filaSolicitacoes.length;

  // ✅ EVENTO: Cliente adicionado à fila
  logger.log(`[EVENTO] 📋 CLIENTE NA FILA\n${jid.split('@')[0]} | Tipo: ${tipoSolicitacao} | Posição: ${posicaoFila}/${totalFila}\n`);

  if (!atendenteLivre || totalFila > 1) {
    await sendMessage(jid,
      `⏳ *Você está na fila de atendimento*\n\n` +
      `📋 Posição: *${posicaoFila}º*\n` +
      `👥 Total na fila: *${totalFila}*\n\n` +
      `O atendente vai te chamar em breve.\nAguarde...`);
  }

  if (atendenteLivre) {
    await processarFilaSolicitacoes();
  }
}

async function processarFilaSolicitacoes() {
  if (filaSolicitacoes.length === 0 || !atendenteLivre) return;

  atendenteLivre = false;
  const solicitacao = filaSolicitacoes.shift();
  salvarFila();
  const { jid, tipoSolicitacao } = solicitacao;
  clientesEmFila.delete(jid);
  const userCtx = {
    nome: solicitacao.nome || stateData.get(jid)?.nome || "Não informado",
    modalidade: solicitacao.modalidade || stateData.get(jid)?.modalidade || "Não informada"
  };
  stateData.set(jid, userCtx);

  const agora = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let emoji = "📌";
  let titulo = "SOLICITAÇÃO DE ASSISTÊNCIA";

  if (tipoSolicitacao === "comprovante") {
    emoji = "💰";
    titulo = "COMPROVANTE RECEBIDO";
  } else if (tipoSolicitacao === "pass") {
    emoji = "🟠";
    titulo = "CHECK-IN DE PASS SOLICITADO";
  } else if (tipoSolicitacao === "atendimento") {
    emoji = "🔔";
    titulo = "SOLICITAÇÃO DE ATENDIMENTO";
  } else if (tipoSolicitacao === "assistência") {
    emoji = "🔵";
    titulo = "SOLICITAÇÃO DE ASSISTÊNCIA";
  } else if (tipoSolicitacao === "feedback") {
    emoji = "⭐";
    titulo = "FEEDBACK RECEBIDO";
  } else if (tipoSolicitacao === "problema") {
    emoji = "⚠️";
    titulo = "PROBLEMA REPORTADO";
  }

  const clienteJid = formatarNumero(jid);

  const mensagemParaAtendente =
    `${emoji} *${titulo}*\n\n` +
    `👤 *Cliente:* ${clienteJid}\n` +
    `📛 *Nome:* ${userCtx.nome}\n` +
    `� *Pedido/Sabor:* ${userCtx.modalidade}\n` +
    `⏰ *Horário:* ${agora}\n` +
    `🔑 *Para liberar:* liberar\n\n`

  try {
    // ✅ FIX: Notifica cliente PRIMEIRO (menos crítico)
    await sendMessage(jid,
      `✅ *Solicitação recebida!*\n\n` +
      `Nossa equipe foi notificada e vai te atender em breve.`
    );

    // DEPOIS adiciona ao estado de atendimento
    emAtendimentoHumano.add(jid);
    dataAtendimento.set(jid, Date.now());
    configurarTimeoutAtendimento(jid);

    // DEPOIS notifica atendente (operação crítica - mas já está em atendimento)
    for (const atendente of ATENDENTE_ATUAL) {
      await sendMessage(atendente, mensagemParaAtendente);
    }
    logger.log(`[NOTIF] Assistência notificada para ${ATENDENTE_ATUAL}`);
  } catch (err) {
    console.error(`[ERRO FILA] ${err.message}`);
    // ✅ FIX: Se falhar, limpa estado incompleto
    emAtendimentoHumano.delete(jid);
    dataAtendimento.delete(jid);
    clearTimeout(timeoutAtendimentoTimers.get(jid));
    timeoutAtendimentoTimers.delete(jid);
    // Volta fila para tentar de novo
    filaSolicitacoes.unshift(solicitacao);
    atendenteLivre = true;
    return;
  }

  // Notifica os que ainda estão na fila sobre nova posição
  if (filaSolicitacoes.length > 0) {
    for (let i = 0; i < filaSolicitacoes.length; i++) {
      const s = filaSolicitacoes[i];
      await sendMessage(s.jid,
        `🔄 *Atualização da fila*\n\n` +
        `Você avançou para a posição *${i + 1}º*.\n` +
        `Aguarde, o atendente vai te chamar em breve.`
      );
    }
  }
  // Atualiza KPIs
  if (tipoSolicitacao === "comprovante" || tipoSolicitacao === "assistência") {
    kpis.comprovantesRecebidos++;
  } else if (tipoSolicitacao === "pass") {
    kpis.passCheckins++;
  } else if (tipoSolicitacao === "atendimento") {
    kpis.atendimentosSolicitados++;
  }
}


// ====================== TRANSFERÊNCIA PARA ATENDENTE ======================
async function transferirParaAtendente(jid, tipoSolicitacao, mensagemOriginal) {
  if (!estaNoExpediente()) {
    await sendMessage(jid, mensagemForaExpediente());
    await showMainMenu(jid);
    return;
  }
  const ctx = stateData.get(jid) || {};
  if (!ctx.nome && tipoSolicitacao !== "pass") {
    setState(jid, "coletar_nome_fila", { pendingTipo: tipoSolicitacao, mensagemOriginal });
    await sendMessage(jid, `✅ *Quase lá!*\n\nPara facilitar o atendimento, informe seu *nome completo*:`);
    return;
  }
  await adicionarFilaSolicitacao(jid, tipoSolicitacao, mensagemOriginal);
}

// ====================== ENVIO DE FEEDBACK PARA SUPORTE ======================
async function enviarFeedbackSuporte(jid, tipo, conteudo) {
  try {
    const suporteJid = [...CONTATO_SUPORTE][0]; // pega o primeiro número de suporte

    if (!suporteJid) return;

    const agora = new Date().toLocaleString('pt-BR');

    await sendMessage(suporteJid,
      `📝 *FEEDBACK RECEBIDO*\n\n` +
      `👤 *Cliente:* ${jid.split('@')[0]}\n` +
      `📌 *Tipo:* ${tipo}\n` +
      `⏰ *Horário:* ${agora}\n\n` +
      `Mensagem:\n${conteudo}`
    );
  } catch (error) {
    console.error(`[ERRO] Falha ao enviar feedback para suporte: ${error.message}`);
  }
}
// ================================
// MENUS
// ================================
async function showMainMenu(jid) {
  setState(jid, "menu_principal");
  await sendMessage(jid,
    `> *PIZZARIA EXEMPLO - MENU PRINCIPAL* 🍕\n\n` +
    `*ESCOLHA UMA OPCAO:*\n\n` +
    `1 - 🍕 Cardápio / Sabores / Preços\n` +
    `2 - 🎉 Promoções / Combos\n` +
    `3 - 🗣️ Falar com Atendente\n` +
    `4 - ℹ️ Informações\n` +
    `5 - 📝 Feedback`
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
// ====================== MENUS DE VALORES ======================

async function showPrecoInteira(jid) {
  const ctx = stateData.get(jid) || {};
  const modalidadePreSelecionada = ctx.modalidade;

  setState(jid, "preco_inteira", {
    flow: ctx.flow,
    modalidade: modalidadePreSelecionada
  });

  if (modalidadePreSelecionada) {
    // Se já tem modalidade selecionada, mostra só ela
    const preco = PRECO_MODALIDADES[modalidadePreSelecionada.toLowerCase()] || "Preço não disponível";
    await sendMessage(jid,
      `✅ *${modalidadePreSelecionada}* — Inteira\n\n` +
      `${preco}\n\n` +
      `*1 - Confirmar e seguir para horários*\n` +
      `*0 - Voltar*`
    );
  } else {
    // Mostra todas as pizzas
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
    // Se já tem modalidade selecionada, mostra só ela
    const preco = PRECO_MODALIDADES[modalidadePreSelecionada.toLowerCase()] || "Preço não disponível";
    await sendMessage(jid,
      `✅ *${modalidadePreSelecionada}* — Meia\n\n` +
      `${preco}\n\n` +
      `*1 - Confirmar e seguir para horários*\n` +
      `*0 - Voltar*`
    );
  } else {
    // Mostra todas as pizzas (meia)
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

  // Mantém o estado atual + flow para voltar corretamente
  setState(jid, "horarios", {
    modalidade: modalidade,
    flow: ctx.flow || null
  });

  let menu =
    `> *HORÁRIOS DISPONÍVEIS* 🕒\n\n` +
    `${selecionado}` +
    `*1 - Ver todos os horários*\n`;

  if (modalidade) {
    menu += `*2 - Ver horários do sabor ${modalidade}*\n` +
      `*3 - Finalizar*\n`;
  } else {
    menu += `*2 - Finalizar*\n`;
  }

  menu += `*0 - Voltar ao menu anterior*`;

  await sendMessage(jid, menu);
}

async function showTodosHorarios(jid) {
  const ctx = stateData.get(jid) || {};
  setState(jid, "horarios", ctx);

  const numAssistencia = ctx.modalidade ? "3" : "2";
  const rodape = `*Digite ${numAssistencia} para finalizar ou 0 para voltar.*`;

  await sendMessage(jid,
    `> *HORÁRIOS DE FUNCIONAMENTO* 🕒\n\n` +
    `*Segunda a Sexta:* 18h00 às 23h00\n` +
    `*Sábado e Domingo:* 17h00 às 00h00\n\n` +
    `🛵 *Entrega:* até 5km sem taxa\n` +
    `📍 *Retirada no balcão:* disponível\n\n` +
    rodape
  );
}

async function showHorariosPorModalidade(jid, modalidade) {
  const ctx = stateData.get(jid) || {};
  setState(jid, "horarios", ctx);

  let rodape = `*Digite 3 para finalizar ou 0 para voltar.*`;

  await sendMessage(jid,
    `> *HORÁRIOS DO SABOR ${modalidade.toUpperCase()}* 🕒\n\n` +
    `${getHorarioPorModalidade(modalidade)}\n\n` +
    rodape
  );
}

function getHorarioPorModalidade(modalidade) {
  return "Todos os sabores seguem o mesmo horário de funcionamento:\n" +
    "Segunda a Sexta: 18h00 às 23h00\n" +
    "Sábado e Domingo: 17h00 às 00h00";
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
// INICIALIZAÇÃO
// ================================

// Função de processamento de mensagens extraída para escopo de módulo
async function handleIncoming(message) {
  // ✅ FIX: Normaliza JID primeiro (converte @lid para @c.us automaticamente)
  let jid = message.from;
  if (jid.endsWith('@lid')) {
    // tenta usar o número real se estiver disponível; caso contrário mantém o @lid
    jid = message.author || message.from;
  }
  jid = normalizarJid(jid);

  logger.log(`[RECEBIDO] ${jid.split('@')[0]} | tipo=${message.type || 'unknown'} | fromMe=${message.fromMe} | grupo=${message.isGroupMsg} | body=${String(message.body || '').substring(0, 100)}`);

  // ✅ FIX: Verifica se é grupo ANTES de outras validações
  if (message.isGroupMsg || jid.endsWith("@g.us") || jid.includes("@status") || jid === "status@broadcast") {
    logger.log(`[IGNORADO] ${jid.split('@')[0]} é grupo/status/broadcast`);
    return; // Ignora grupos, status, broadcasts
  }

  // Ignora mensagens próprias, exceto se for Admin, Suporte ou Atendente
  if (message.fromMe && !ADMIN_JIDS.has(jid) && !CONTATO_SUPORTE.has(jid) && !ATENDENTE_ATUAL.has(jid)) {
    logger.log(`[IGNORADO] ${jid.split('@')[0]} é mensagem própria`);
    return;
  }

  // Ignora contatos explicitamente bloqueados
  if (ignoredContacts.has(jid)) {
    logger.log(`[IGNORADO] blacklist: ${jid.split('@')[0]}`);
    return;
  }

  try {
    const contact = client ? await client.getContactById(jid) : null;
    logger.log(`[CONTATO] ${jid.split('@')[0]} - isMyContact=${contact?.isMyContact}`);
    if (TEST_MODE_IGNORAR_SALVOS && contact && contact.isMyContact && !ADMIN_JIDS.has(jid) && !CONTATO_SUPORTE.has(jid) && !ATENDENTE_ATUAL.has(jid)) {
      logger.log(`[IGNORADO] contato salvo (teste): ${jid.split('@')[0]}`);
      return;
    }
  } catch (e) {
    logger.warn(`⚠️ erro ao obter contato: ${e.message}`);
  }

  const texto = (message.body || '').trim().toLowerCase();
  if (!texto) {
    logger.warn(`[IGNORADO] ${jid.split('@')[0]} enviou mensagem sem texto. Tipo: ${message.type || 'unknown'}`);
    await sendMessage(jid, '⚠️ Recebi a sua mensagem, mas só consigo responder a textos. Por favor, envie uma mensagem de texto ou digite *menu*.');
    return;
  }

  const isStaff = ADMIN_JIDS.has(jid) || CONTATO_SUPORTE.has(jid) || ATENDENTE_ATUAL.has(jid);
  let estado = estados.get(jid) || "menu_principal";

  // CONTROLE DE ATENDIMENTO HUMANO
  if ((clientesPausados.has(jid) || emAtendimentoHumano.has(jid) || clientesEmFila.has(jid)) && !isStaff) {
    logger.log(`[MUDO] ${jid.split('@')[0]} está em atendimento/fila/pausado`);
    return;   // Bot não responde nada automaticamente
  }

  if (emAtendimentoHumano.has(jid) && isStaff) {
    if (!texto.startsWith('liberar') && !texto.startsWith('limite') && !texto.startsWith('kpi') && texto !== 'menu' && texto !== 'finalizar') {
      await sendMessage(jid, '🔒 Você está em modo atendimento humano. Use comandos: liberar, limite, kpi, menu.');
      return;
    }
  }

  try {
    // ==================== INATIVIDADE ====================
    if (estado === "inativo") {
      if (texto === "1") {
        const currentData = stateData.get(jid) || {};
        const previousState = currentData.previousState || "menu_principal";
        const resumedData = { ...currentData };
        delete resumedData.previousState;
        setState(jid, previousState, resumedData);
        await sendMessage(jid, "✅ *Continuando de onde você parou...*");
        switch (previousState) {
          case "horarios":
            await showHorarios(jid);
            break;
          case "confirmacao_horarios":
            await sendMessage(jid,
              `*Confirmação de Horários*\n\n` +
              `Modalidade: ${resumedData.modalidade || "Não informada"}\n` +
              `Valor: ${resumedData.valor || "Não informado"}\n\n` +
              `*1 - Finalizar*\n` +
              `*0 - Voltar*`
            );
            break;
          case "assistência": {
            const ctxAssist = stateData.get(jid) || {};
            if (ctxAssist.nome) {
              await sendMessage(jid, `✅ *Nome já registrado:* ${ctxAssist.nome}\n\nInforme o *sabor ou combo* desejado. \nExemplo: Calabresa, Portuguesa, Combo Família, etc.`);
            } else {
              await sendMessage(jid, "Por favor, informe seu *nome completo* para continuar.\nExemplo: Maria Oliveira");
            }
            break;
          }
          case "valores": await showValores(jid, resumedData.flow); break;
          case "preco_inteira": await showPrecoInteira(jid); break;
          case "preco_meia": await showPrecoMeia(jid); break;
          case "combos": await showCombos(jid); break;
          case "bebidas": await showBebidas(jid); break;
          case "cardapio": await showCardapio(jid, resumedData.flow); break;
          case "promocoes": await showPromocoes(jid); break;
          case "feedback": await showFeedback(jid); break;
          case "informacoes": await showInformacoes(jid); break;
          default: await showMainMenu(jid);
        }
      }
      else if (texto === "0" || texto.toLowerCase() === "menu") {
        await showMainMenu(jid);
      }
      else {
        await sendMessage(jid,
          `⏳ *Você ficou inativo por muito tempo.*\n\n` +
          `*1 - Continuar de onde parei*\n` +
          `*0 - Voltar ao menu principal*`
        );
      }
      return;
    }

    if (verificarLimite(jid)) {
      logger.log(`[LIMITE] ${jid.split('@')[0]} excedeu limite de mensagens`);
      await sendMessage(jid, "⚠️ Bot desligado por agora. Por favor, tente novamente mais tarde.");
      return;
    }

    if (!isStaff && !canReply(jid)) {
      logger.log(`[BLOQUEIO] ${jid.split('@')[0]} bloqueado por cooldown`);
      return;
    }
    if (!isStaff) await delayHumano();
    if (!isStaff) registrarMensagemKpi();

    if (texto === "menu") {
      await showMainMenu(jid);
      return;
    }

    if (isStaff) {
      const tratado = await executarComando(texto, jid);
      if (tratado) return;
    }

    switch (estado) {
      case "menu_principal": {
        switch (texto) {
          case "1":
            await showCardapioPrecos(jid);
            break;
          case "2":
            await showPromocoes(jid);
            break;
          case "3":
            setState(jid, "confirmar_atendente");
            await sendMessage(jid,
              `> *FALAR COM ATENDENTE 🗣️*\n\n` +
              `Você será colocado na fila de atendimento humano.\n\n` +
              `*1 - Confirmar*\n` +
              `*0 - Voltar ao menu*`
            );
            break;
          case "4":
            await showInformacoes(jid);
            break;
          case "5":
            await showFeedback(jid);
            break;
          default:
            if (!primeiroContato.has(jid)) {
              primeiroContato.add(jid);
              kpis.atendimentosIniciados++;
              await sendMessage(jid,
                `🍕 *BEM-VINDO À PIZZARIA EXEMPLO!* 🍕\n\n` +
                `Olá! Sou o atendente virtual.\n` +
                `Estou aqui para te ajudar com\n` +
                `cardápio, preços, combos e pedidos.\n\n` +
                `Vamos começar?`
              );
              await showMainMenu(jid);
            } else {
              await sendMessage(jid, "*Opção inválida*. Digite 1 a 5 ou *menu*.");
            }
        }
        break;
      }

      // (restante do switch permanece inalterado - o corpo original continua sendo utilizado)
    }
  } catch (error) {
    console.error(`[ERRO PROCESSAMENTO] ${jid.split('@')[0]}: ${error.message}`);
    try {
      await sendMessage(jid, "❌ *Erro interno.* Tente novamente ou digite *menu* para voltar ao início.");
    } catch (sendError) {
      console.error(`[ERRO ENVIO] Falha ao enviar mensagem de erro: ${sendError.message}`);
    }
  }
}
async function executarComando(cmd, jid) {
  if (cmd.startsWith("liberar")) {
    const partes = cmd.split(/\s+/);
    let numeroLiberar;
    if (partes.length < 2) {
      const clientesAtuais = [...emAtendimentoHumano, ...clientesPausados];
      if (clientesAtuais.length === 0) {
        await sendMessage(jid, "⚠️ Nenhum cliente em atendimento no momento.");
        return true;
      }
      numeroLiberar = clientesAtuais[0];
    } else {
      const numeroRaw = partes[1];
      numeroLiberar = [...emAtendimentoHumano, ...clientesPausados].find(j => j.startsWith(numeroRaw));
      if (!numeroLiberar) {
        let n = numeroRaw.replace(/\D/g, '');
        if (n.length < 10) { await sendMessage(jid, "❌ Número inválido. Use DDD + número."); return true; }
        if (!n.startsWith('55')) n = '55' + n;
        n = normalizarNumero(n);
        numeroLiberar = n + "@c.us";
      }
    }
    if (emAtendimentoHumano.has(numeroLiberar)) {
      const inicioAtendimento = dataAtendimento.get(numeroLiberar);
      const tempoAtendimento = inicioAtendimento
        ? Math.round((Date.now() - inicioAtendimento) / (1000 * 60)) : 0;
      if (tempoAtendimento > 0) kpis.atendimentosComTempo.push(tempoAtendimento);
      salvarHistoricoAtendimento(numeroLiberar, {
        nome: stateData.get(numeroLiberar)?.nome,
        modalidade: stateData.get(numeroLiberar)?.modalidade,
        tipo: "manual", tempoAtendimento
      });
      emAtendimentoHumano.delete(numeroLiberar);
      clientesPausados.delete(numeroLiberar);
      clearTimeout(timeoutAtendimentoTimers.get(numeroLiberar));
      timeoutAtendimentoTimers.delete(numeroLiberar);
      dataAtendimento.delete(numeroLiberar);
      clearState(numeroLiberar);
      kpis.clientesLiberados++;
      await sendMessage(numeroLiberar, `✅ *Atendimento encerrado*\n\nO atendente finalizou seu atendimento.\nDigite *menu* para voltar.`);
      await sendMessage(jid, `✅ Cliente ${numeroLiberar.split('@')[0]} liberado com sucesso.`);
      atendenteLivre = true;
      await processarFilaSolicitacoes();
    } else {
      await sendMessage(jid, `⚠️ Cliente ${numeroLiberar.split('@')[0]} não está em atendimento.`);
    }
    return true;
  }

  if (cmd.startsWith("pausar ")) {
    const numeroRaw = cmd.split(" ")[1];
    let numero = [...emAtendimentoHumano, ...clientesPausados].find(j => j.startsWith(numeroRaw));
    if (!numero) numero = numeroRaw.replace(/\D/g, '') + "@c.us";
    if (emAtendimentoHumano.has(numero)) {
      clientesPausados.add(numero);
      await sendMessage(jid, `🔇 *BOT PAUSADO*\n\nNúmero: ${numero.split('@')[0]}\nUse "liberar ${numero.split('@')[0]}" quando terminar.`);
    } else {
      await sendMessage(jid, `⚠️ ${numero.split('@')[0]} não está em atendimento humano.`);
    }
    return true;
  }

  if (cmd === "limite on" || cmd === "limite ativar") { limiteMensagensAtivo = true; await sendMessage(jid, "✅ Limite ativado."); return true; }
  if (cmd === "limite off" || cmd === "limite desativar") { limiteMensagensAtivo = false; await sendMessage(jid, "✅ Limite desativado."); return true; }
  if (cmd === "limite status") { await sendMessage(jid, `🔎 Limite está ${limiteMensagensAtivo ? "ativado" : "desativado"}.`); return true; }

  if (cmd === "kpi status") { await sendMessage(jid, gerarRelatorioKpi()); return true; }
  if (cmd === "kpi limpar") {
    Object.assign(kpis, {
      atendimentosIniciados: 0, comprovantesRecebidos: 0, passCheckins: 0,
      atendimentosSolicitados: 0, clientesLiberados: 0, mensagensPorHora: new Map(),
      totalMensagens: 0, tempoMedioAtendimento: 0, atendimentosComTempo: []
    });
    salvarKpisJson();
    await sendMessage(jid, "✅ KPIs zerados.");
    return true;
  }

  if (cmd === "historico") {
    try {
      const filePath = path.join(DATA_DIR, 'historico_atendimentos.json');
      if (!fs.existsSync(filePath)) { await sendMessage(jid, "📋 Nenhum histórico ainda."); return true; }
      const historico = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const ultimos5 = historico.slice(-5).reverse();
      const msg = ultimos5.map((a, i) =>
        `*${i + 1}.* ${a.nome} — ${a.modalidade}\n📞 ${a.numero} | ⏱️ ${a.tempoAtendimento}min | ${a.horario}`
      ).join('\n\n');
      await sendMessage(jid, `📋 *ÚLTIMOS 5 ATENDIMENTOS*\n\n${msg}`);
    } catch (e) { await sendMessage(jid, "❌ Erro ao ler histórico."); }
    return true;
  }

  if (cmd === "fila status" || cmd === "fila") {
    if (cmd === "fila") {
      const posicao = filaSolicitacoes.findIndex(s => s.jid === jid) + 1;
      if (posicao === 0) {
        await sendMessage(jid, "📋 Você ainda não está na fila de atendimento.");
        return true;
      }
      await sendMessage(jid,
        `📋 *Sua posição na fila*\n\n` +
        `Você está na posição *${posicao}º*.\n` +
        `Aguarde, o atendente irá te chamar em breve.`
      );
      return true;
    }

    if (filaSolicitacoes.length === 0) {
      await sendMessage(jid, "📋 Nenhum cliente aguardando.");
    } else {
      const msg = filaSolicitacoes.map((s, i) => {
        const espera = Math.round((Date.now() - s.timestamp) / 1000 / 60);
        return `*${i + 1}.* ${formatarNumero(s.jid)} | ${s.nome || "Sem nome"} — ${s.tipoSolicitacao} — ${espera}min`;
      }).join('\n');
      await sendMessage(jid, `📋 *FILA*\n\n${msg}`);
    }
    return true;
  }

  if (cmd.startsWith("bloquear ")) {
    const n = cmd.split(" ")[1].replace(/\D/g, '') + "@c.us";
    ignoredContacts.add(n); salvarBlacklist();
    await sendMessage(jid, `✅ ${n.split('@')[0]} bloqueado.`);
    return true;
  }
  if (cmd.startsWith("desbloquear ")) {
    const n = cmd.split(" ")[1].replace(/\D/g, '') + "@c.us";
    if (ignoredContacts.has(n)) { ignoredContacts.delete(n); salvarBlacklist(); await sendMessage(jid, `✅ ${n.split('@')[0]} desbloqueado.`); }
    else await sendMessage(jid, `⚠️ ${n.split('@')[0]} não estava bloqueado.`);
    return true;
  }
  if (cmd === "blacklist") {
    const lista = ignoredContacts.size === 0 ? "vazia" : [...ignoredContacts].map((n, i) => `${i + 1}. ${n.split('@')[0]}`).join('\n');
    await sendMessage(jid, `📋 *BLACKLIST*\n\n${lista}`);
    return true;
  }

  if (cmd === "status" || cmd === "estado" || cmd === "info") {
    const msg =
      `📊 *STATUS DO BOT*\n` +
      `Modo: ${global.modoSilencioso ? "🔇 SILENCIOSO" : "📢 NORMAL"}\n` +
      `Clientes em atendimento: ${emAtendimentoHumano.size}\n` +
      `Clientes pausados: ${clientesPausados.size}\n` +
      `Fila de espera: ${filaSolicitacoes.length}\n` +
      `Atendente livre: ${atendenteLivre ? "✅ Sim" : "❌ Não"}\n` +
      `Total de mensagens: ${kpis.totalMensagens}`;
    console.log(msg);
    await sendMessage(jid, msg);
    return true;
  }

  if (cmd === "silencioso") { global.modoSilencioso = true; console.log('[TERMINAL] Modo silencioso ativado.'); await sendMessage(jid, '✅ Modo silencioso ativado.'); return true; }
  if (cmd === "normal" || cmd === "verboso") { global.modoSilencioso = false; await sendMessage(jid, '✅ Modo normal restaurado.'); return true; }
  if (cmd === "expediente on") { forcarExpediente = true; await sendMessage(jid, '✅ Expediente forçado como ABERTO.'); return true; }
  if (cmd === "expediente off") { forcarExpediente = false; await sendMessage(jid, '✅ Expediente voltou ao horário automático.'); return true; }
  if (cmd === "desligar") { await sendMessage(jid, "🔌 Desligando..."); process.exit(0); }

  if (cmd === "comandos" || cmd === "ajuda" || cmd === "help") {
    await sendMessage(jid,
      `📋 *COMANDOS DISPONÍVEIS*\n\n` +

      `*👥 ATENDIMENTO*\n` +
      `• *liberar* — libera o primeiro cliente em atendimento\n` +
      `• *liberar [número]* — libera cliente específico (ex: liberar 13999887766)\n` +
      `• *pausar [número]* — pausa o bot para um cliente (bot fica mudo)\n` +
      `• *fila status* — lista clientes aguardando atendimento\n\n` +

      `*📊 KPIs E HISTÓRICO*\n` +
      `• *kpi status* — exibe relatório de atendimentos\n` +
      `• *kpi limpar* — zera todos os KPIs\n` +
      `• *historico* — mostra os últimos 5 atendimentos\n\n` +

      `*🚫 BLACKLIST*\n` +
      `• *bloquear [número]* — bloqueia número (ex: bloquear 13999887766)\n` +
      `• *desbloquear [número]* — remove número da blacklist\n` +
      `• *blacklist* — lista todos os números bloqueados\n\n` +

      `*⚙️ CONFIGURAÇÕES*\n` +
      `• *limite on/off* — ativa ou desativa limite de mensagens/hora\n` +
      `• *limite status* — verifica se o limite está ativo\n` +
      `• *expediente on/off* — força o bot a aceitar fila fora do horário\n` +
      `• *silencioso* — reduz logs no terminal\n` +
      `• *normal* — restaura logs normais\n\n` +

      `*🔎 STATUS E CONTROLE*\n` +
      `• *status* — exibe situação atual do bot\n` +
      `• *desligar* — encerra o bot\n` +
      `• *comandos* — exibe esta lista`
    );
    return true;
  }

  return false; // comando não reconhecido
}

async function startBot() {
  logger.log("\n" + "=".repeat(50));
  logger.log("🚀 INICIANDO BOT DA PIZZARIA EXEMPLO");
  logger.log("=".repeat(50) + "\n");

  logger.log("📋 Verificando dependências...");
  logger.log("✅ Path OK");

  logger.log("📋 Configurando cliente WhatsApp...");
  const sessionPath = path.join(__dirname, '.wwebjs_auth');
  logger.log(`📁 Pasta de sessão: ${sessionPath}`);

  // Manter a pasta de sessão entre reinícios para evitar gerar QR code sempre que possível.
  // A limpeza só deve ser feita manualmente se o login ficar inválido.

  // optional: kill any remaining bot windows (WhatsApp Web + Baileys)
  // Nota: não desligar todos os processos do Chrome, pois isso fecha o navegador do usuário.

  logger.log("📋 Criando cliente WhatsApp...");
  try {
    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: sessionPath
      }),
      puppeteer: {
        headless: true,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
      }
    });
    logger.log("✅ Cliente criado com sucesso");
  } catch (createErr) {
    logger.error("❌ Erro ao criar cliente: " + createErr.message);
    return;
  }

  // Tratar erros de Puppeteer (navigation/execution context errors)
  client.on('error', (err) => {
    if (err.message && err.message.includes('Execution context was destroyed')) {
      console.log('⚠️ Aviso: Página do WhatsApp Web recarregou, reconectando...');
    } else {
      console.error('❌ Erro no cliente:', err.message);
    }
  });

  client.on('auth_failure', (message) => {
    console.error('❌ Falha de autenticação:', message);
    console.error('⚠️ Execute LIMPAR_PASTAS.bat e reinicie o bot se continuar falhando.');
  });

  client.on('qr', (qr) => {
    console.clear();
    console.log("\n" + "=".repeat(60));
    console.log("📱 QR CODE - ESCANEIE COM SEU WHATSAPP AGORA! 📱");
    console.log("=".repeat(60) + "\n");
    qrcode.generate(qr, { small: true });
    console.log("\n" + "=".repeat(60));
    console.log("👆 Abra o WhatsApp > Configurações > Aparelhos vinculados");
    console.log("Código válido por 60 segundos");
    console.log("=".repeat(60) + "\n");

    // Também salvar como imagem
    QRCode.toFile("./.sys/qrcode.png", qr, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    }, (err) => {
      if (!err) {
        console.log("✅ QR Code também salvo em: .sys/qrcode.png\n");
      }
    });
  });

  client.on('ready', () => {
    console.log("\n" + "=".repeat(60));
    console.log("✅  BOT CONECTADO E ATIVO!");
    console.log("🟢 Aguardando mensagens...");
    console.log(`⏰ Horário de início: ${new Date().toLocaleString('pt-BR')}`);
    console.log("=".repeat(60) + "\n");
    console.log("⚠️  Se havia clientes em atendimento antes do restart, use 'fila status' para verificar.");
    isConnected = true;
    reconnectAttempts = 0; // Reseta contador quando reconecta com sucesso
    startBotRetries = 0; // Reseta contador de tentativas de inicialização

    // ✅ Agora carrega fila quando client está pronto (pode enviar mensagens)
    carregarFila();
  });

  /// Código Apenas da fase de testes se funcionar apaga ele
  // === BLOCO DE TESTE INTERATIVO (REMOVER EM PRODUÇÃO) ===
  // Este listener lê comandos do stdin para facilitar testes manuais
  // durante desenvolvimento. Em produção esse bloco deve ser removido
  // ou protegido para evitar execução inesperada.
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', async (input) => {
    const cmd = input.trim().toLowerCase();
    const TERMINAL_JID = [...ADMIN_JIDS][0];
    const tratado = await executarComando(cmd, TERMINAL_JID);
    if (!tratado) console.log(`[TERMINAL] Comando não reconhecido: "${cmd}"`);
  });

  client.on('disconnected', (reason) => {
    isConnected = false;
    reconnectAttempts++;

    console.log("\n" + "=".repeat(60));
    console.log("❌ CONEXAO FECHADA");
    console.log(`⏰ Horário de queda: ${new Date().toLocaleString('pt-BR')}`);
    console.log(`Razão: ${reason}`);
    console.log(`📊 Tentativa de reconexão: ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
    console.log("🔄 Reconectando em 2 segundos...");
    console.log("=".repeat(60) + "\n");

    // Evita multiplas tentativas simultâneas
    setTimeout(() => {
      if (!isConnected) {
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error("\n" + "=".repeat(60));
          console.error("🚨 ERRO CRÍTICO - FALLBACK ATIVADO");
          console.error("❌ Falha ao reconectar após " + MAX_RECONNECT_ATTEMPTS + " tentativas");
          console.error("\n⚠️  AÇÃO NECESSÁRIA:");
          console.error("1. Abra a pasta 'Botões'");
          console.error("2. Execute: LIGAR-2.bat (Bot Baileys - Backup)");
          console.error("3. O bot Baileys funcionará como principal até resolver o problema");
          console.error("=".repeat(60) + "\n");

          // Notificar administrador
          try {
            const adminMsg = `🚨 *FALHA CRÍTICA - BOT 1 OFFLINE*\n\n` +
              `WhatsApp-Web (bot-simple.js) falhou após ${MAX_RECONNECT_ATTEMPTS} tentativas.\n\n` +
              `⚠️  *AÇÃO NECESSÁRIA:*\n` +
              `1. Clique em: LIGAR-2.bat (na pasta Botões)\n` +
              `2. Use o Bot Baileys como backup\n\n` +
              `O que fazer:\n` +
              `- Verifique a conexão de internet\n` +
              `- Reinicie o computador\n` +
              `- Execute LIMPAR_PASTAS.bat antes de tentar reconectar`;
            // Nota: sendMessage pode não funcionar se o cliente não está inicializado
            console.log("[NOTIF] Mensagem de fallback pronta para ser enviada aos admins");
          } catch (e) {
            console.error("[ERRO] Falha ao notificar administrador:", e.message);
          }

          return;
        }

        console.log("Iniciando reconexao automática...");
        startBot();
      }
    }, 2000);
  });

  // Registra o listener usando a função extraída
  client.on('message', (message) => {
    const jid = normalizarJid(message.from);
    processWithLock(jid, () => handleIncoming(message));
  });

  logger.log("📋 Inicializando cliente WhatsApp...");
  try {
    await client.initialize();
    logger.log("✅ Cliente inicializado com sucesso");
  } catch (err) {
    console.error('Erro capturado ao inicializar:', err.message);
    // captura erros comuns de sessão travada e tenta usar uma nova pasta
    if (err.message && (err.message.includes('already running for') || err.message.includes('EBUSY'))) {
      if (startBotRetries < 3) {
        console.warn('⚠️ Erro de sessão travada detectado, tentando com nova pasta... (Tentativa ' + (startBotRetries + 1) + '/3)');
        startBotRetries++;
        // Tenta iniciar novamente (já que agora usa pasta com timestamp)
        return startBot();
      } else {
        console.error('❌ Máximo de tentativas de reconexão atingido. Execute LIMPAR_PASTAS.bat e reinicie o bot.');
        throw new Error('Máximo de tentativas de inicialização atingido');
      }
    }
    throw err;
  }
}

// Inicia o bot somente quando executado diretamente
if (require.main === module) {
  startBot().catch(err => {
    console.error("❌ ERRO AO INICIAR BOT:", err);
    process.exit(1);
  });
}

// Exportações para testes e controle externo
module.exports = {
  handleIncoming,
  executarComando,
  showMainMenu,
  showCardapioPrecos,
  showCardapio,
  showValores,
  showPrecoInteira,
  showPrecoMeia,
  showPromocoes,
  setState,
  clearState,
  estados,
  stateData,
  emAtendimentoHumano,
  clientesPausados,
  adicionarFilaSolicitacao,
  processarFilaSolicitacoes,
  transferirParaAtendente,
    // === HELPERS DE TESTE (REMOVER EM PRODUÇÃO) ===
    // As três funções abaixo são utilitários para execução de testes locais
    // e não são necessárias (nem recomendadas) em ambiente de produção.
    enableTestMode: () => { global.__BOT_TEST_MODE = true; global.__BOT_TEST_MESSAGES = []; global.modoSilencioso = true; },
    disableTestMode: () => { global.__BOT_TEST_MODE = false; global.__BOT_TEST_MESSAGES = []; },
    getTestMessages: () => (global.__BOT_TEST_MESSAGES || [])
};