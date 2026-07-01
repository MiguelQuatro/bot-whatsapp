const path = require('path');
const bot = require(path.join(__dirname, '..', 'bot-simple.js'));

function makeMessage(from, body) {
  return {
    from,
    body,
    type: 'chat',
    fromMe: false,
    isGroupMsg: false
  };
}

function dumpMessages(title) {
  console.log(`\n--- ${title} ---`);
  const msgs = bot.getTestMessages();
  msgs.forEach((m, i) => console.log(`${i + 1}. ${m.jid} -> ${m.text.replace(/\n/g, ' | ').slice(0, 220)}`));
}

async function run() {
  bot.enableTestMode();
  bot.clearState('5513991234567@c.us');
  bot.clearState('5513999999999@c.us');

  const user = '5513991234567@c.us';
  const admin = '5513996817481@c.us';

  global.__BOT_TEST_MESSAGES = [];

  async function send(body) {
    await bot.handleIncoming(makeMessage(user, body));
  }

  async function sendAdmin(body) {
    await bot.handleIncoming(makeMessage(admin, body));
  }

  const scenarios = [];

  // 1. Menu principal: invalid -> menu -> main options
  scenarios.push({ name: 'Menu inválido e welcome', action: async () => {
    await send('9');
    await send('menu');
  }});

  // 2. Modalidades / valores / horários
  scenarios.push({ name: 'Fluxo de modalidades e valores', action: async () => {
    await send('1'); // modalides / valores / horarios
    await send('1'); // modalidades
    await send('1'); // musculacao
    await send('0'); // volta para valores
    await send('0'); // volta para modalid./horarios/valores
    await send('2'); // valores
    await send('1'); // mensais
    await send('0'); // volta para valores
    await send('2'); // diarios
    await send('0'); // volta para valores
    await send('3'); // planos
    await send('1'); // plano 1
    await send('0'); // volta para valores
    await send('4'); // pacotes
    await send('1'); // pacote 1
    await send('0'); // volta para valores
    await send('0'); // volta para modalid./horarios/valores
    await send('3'); // horarios
    await send('1'); // todos horarios
    await send('0'); // volta para horarios
    await send('2'); // falar com assistencia (sem modalidade)
    await send('Maria Silva');
    await send('Musculação');
  }});

  // 3. Pass flow
  scenarios.push({ name: 'Fluxo pass Wellhub e TotalPass', action: async () => {
    await send('menu');
    await send('2'); // pass menu
    await send('1'); // Wellhub
    await send('menu');
    await send('2'); // pass menu
    await send('2'); // TotalPass
  }});

  // 4. Informacoes flow
  scenarios.push({ name: 'Fluxo informacoes', action: async () => {
    await send('menu');
    await send('4');
    await send('1');
  }});

  // 5. Feedback flow completo
  scenarios.push({ name: 'Fluxo feedback completo', action: async () => {
    await send('menu');
    await send('5');
    await send('1');
    await send('4');
    await send('0');
    await send('2');
    await send('Gostaria de aulas mais tarde');
    await send('0');
    await send('3');
    await send('O bot não responde em alguns casos');
    await send('0');
    await send('4');
    await send('Muito bom o atendimento');
  }});

  // 6. Atendimento humano via confirmacao e fila
  scenarios.push({ name: 'Fluxo fila atendimento humano', action: async () => {
    await send('menu');
    await send('3'); // falar com atendente
    await send('1'); // confirmar fila
    await send('João Souza');
    // No estado coletar_nome_fila, deve ser adicionado à fila
    await send('menu');
  }});

  // 7. Inatividade state
  scenarios.push({ name: 'Fluxo inativo', action: async () => {
    bot.setState(user, 'inativo', { previousState: 'menu_principal' });
    await send('1');
    bot.setState(user, 'inativo', { previousState: 'menu_principal' });
    await send('0');
  }});

  // 8. Comandos staff e status
  scenarios.push({ name: 'Comandos staff e fila/status', action: async () => {
    await sendAdmin('fila status');
    await sendAdmin('kpi status');
    await sendAdmin('status');
    await sendAdmin('limite off');
    await sendAdmin('limite status');
    await sendAdmin('limite on');
    await sendAdmin('expediente on');
    await sendAdmin('expediente off');
    await sendAdmin('blacklist');
    await sendAdmin('comandos');
  }});

  // 9. Pausar e liberar atendimento humano
  scenarios.push({ name: 'Pausar e liberar atendimento humano', action: async () => {
    const clientJid = '5513999999999@c.us';
    bot.emAtendimentoHumano.add(clientJid);
    await sendAdmin(`pausar ${clientJid.split('@')[0]}`);
    await sendAdmin(`liberar ${clientJid.split('@')[0]}`);
  }});

  // 10. Coletar nome feedback e invalid name cases
  scenarios.push({ name: 'Coletar nome de feedback e nome inválido', action: async () => {
    await send('menu');
    await send('5');
    await send('Maria');
    await send('2');
    await send('0');
    bot.setState(user, 'coletar_nome_feedback');
    await send('Jo');
    await send('João Silva');
  }});

  // 11. Teste de estado de valores com fluxo de origem
  scenarios.push({ name: 'Valores e horários interligados', action: async () => {
    await send('menu');
    await send('1');
    await send('2');
    await send('1');
    await send('1');
    await send('0');
    await send('3');
    await send('0');
  }});

  let totalScenarios = 0;
  for (const scenario of scenarios) {
    totalScenarios += 1;
    try {
      console.log(`\n>>> Executando cenário ${totalScenarios}: ${scenario.name}`);
      await scenario.action();
      console.log(`✔ Cenário ${totalScenarios} concluído`);
    } catch (error) {
      console.error(`❌ Erro no cenário ${scenario.name}:`, error);
      process.exit(1);
    }
  }

  dumpMessages('Mensagens geradas');
  console.log(`\n✔ Todos os ${scenarios.length} cenários foram executados com sucesso.`);
  process.exit(0);
}

run().catch(error => {
  console.error('ERRO GLOBAL:', error);
  process.exit(1);
});