// ================================
// INICIALIZADOR DO BOT
// ================================
// Este é o ÚNICO arquivo que deve ser usado para iniciar o bot
// O bot agora usa whatsapp-web.js ao invés de baileys (chatbot.js)

require('./bot-simple.js');

process.on('unhandledRejection', (reason, promise) => {
  // Ignorar erros de Puppeteer de contexto destruído
  if (reason && reason.message && reason.message.includes('Execution context was destroyed')) {
    console.log('⚠️ [PUPPETEER] Contexto destruído (navegação detectada)');
    return; // Não logar como erro
  }
  console.error('❌ Erro não tratado:', reason);
});

// Também tratar promessas que rejeitam sem await
process.on('unhandledRejection', (err) => {
  if (err && typeof err === 'object' && err.message) {
    if (err.message.includes('Execution context') || err.message.includes('Navigation')) {
      return; // Silenciar erros de navegação do Puppeteer
    }
  }
});