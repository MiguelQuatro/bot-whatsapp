// AVISO: Este arquivo é um script de testes locais AUTOMATIZADOS.
// Não faz parte do ambiente de produção. Remover ou ignorar antes do deploy.
const path = require('path');
const bot = require(path.join(__dirname, '..', 'bot-simple.js'));

async function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

(async () => {
  bot.enableTestMode();

  const user = '5513991234567@c.us';
  const admin = [...require(path.join(__dirname, '..', 'bot-simple.js')).ADMIN_JIDS || ['5513996817481@c.us']][0] || '5513996817481@c.us';

  console.log('--- Iniciando testes de fluxo ---');

  // 1) Acessar menu principal e navegar pelos menus via chamadas diretas
  await bot.showMainMenu(user);
  await sleep(10);

  // Modalidades -> selecionar Musculação -> mostrar valores mensais
  await bot.showModalidadesHorariosValores(user);
  await sleep(10);
  await bot.showModalidades(user);
  await sleep(10);
  // Simula seleção de "Musculação" setando o contexto e chamando menu de valores
  bot.stateData.set(user, { flow: 'modalidades_first', modalidade: 'Musculação' });
  await bot.showValoresMensais(user);
  await sleep(10);

  // Pass flow
  await bot.showPass(user);
  await sleep(10);
  // Simula escolha Wellhub
  await bot.transferirParaAtendente(user, 'pass', { body: 'Pass test' });
  await sleep(10);

  // 4) Simular atendimento humano e testar comando liberar
  const clienteAtendido = '5513999999999@c.us';
  // marca cliente como em atendimento
  const mod = require(path.join(__dirname, '..', 'bot-simple.js'));
  mod.emAtendimentoHumano.add(clienteAtendido);

  // Executa comando liberar pelo admin
  await mod.executarComando(`liberar ${clienteAtendido.split('@')[0]}`, admin);

  await sleep(50);

  // Mostra mensagens geradas
  const msgs = bot.getTestMessages();
  console.log('\n--- Mensagens capturadas durante o teste ---');
  msgs.forEach((m, i) => console.log(`${i + 1}. ${m.jid} -> ${m.text.replace(/\n/g, ' | ').slice(0, 200)}`));

  console.log('\n--- Fim dos testes ---');
  process.exit(0);
})();