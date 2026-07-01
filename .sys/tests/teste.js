console.log('Teste do Node.js');
try {
  const { Client } = require('whatsapp-web.js');
  console.log('✅ whatsapp-web.js carregado');
} catch (e) {
  console.error('❌ Erro ao carregar whatsapp-web.js:', e.message);
}

try {
  const qrcode = require('qrcode-terminal');
  console.log('✅ qrcode-terminal carregado');
} catch (e) {
  console.error('❌ Erro ao carregar qrcode-terminal:', e.message);
}

console.log('Teste concluído');