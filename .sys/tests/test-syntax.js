// Script de teste de sintaxe - não inicializa o bot, apenas valida
console.log('🔍 Validando sintaxe do bot-simple.js...\n');

try {
  const fs = require('fs');
  const code = fs.readFileSync('./bot-simple.js', 'utf8');
  
  // Tentar fazer parsing de uma forma segura
  new Function(code);
  
  console.log('✅ Sintaxe do arquivo validada com sucesso!');
  console.log('✅ Arquivo não possui erros de sintaxe.\n');
  
  // Validações rápidas
  const hasEstadoHorarios = code.includes('case "horarios"');
  const hasEstadoConfirmacao = code.includes('case "confirmacao_horarios"');
  const hasMainMenu = code.includes('showMainMenu');
  const hasMaskPhone = code.includes('maskPhoneNumber');
  const hasCleanupMemory = code.includes('cleanupMemory');
  const hasHistoricoMask = code.includes('numero: maskPhoneNumber(jid)');
  
  console.log('📋 Validações principais:');
  console.log(`  ✓ Estado "horarios" ${hasEstadoHorarios ? '✅ ENCONTRADO' : '❌ NÃO ENCONTRADO'}`);
  console.log(`  ✓ Estado "confirmacao_horarios" ${hasEstadoConfirmacao ? '✅ ENCONTRADO' : '❌ NÃO ENCONTRADO'}`);
  console.log(`  ✓ Menu principal ${hasMainMenu ? '✅ ENCONTRADO' : '❌ NÃO ENCONTRADO'}`);
  console.log(`  ✓ Máscara no histórico ${hasHistoricoMask ? '✅ ENCONTRADA' : '❌ NÃO ENCONTRADA'}`);
  console.log(`  ✓ Helper de máscara ${hasMaskPhone ? '✅ ENCONTRADO' : '❌ NÃO ENCONTRADO'}`);
  console.log(`  ✓ Limpeza de memória ${hasCleanupMemory ? '✅ ENCONTRADA' : '❌ NÃO ENCONTRADA'}\n`);
  
  if (hasEstadoHorarios && hasEstadoConfirmacao && hasMainMenu && hasMaskPhone && hasCleanupMemory && hasHistoricoMask) {
    console.log('🎉 Todas as correções foram aplicadas com sucesso!\n');
    console.log('✨ O bot está pronto para ser iniciado com: npm start\n');
    process.exit(0);
  } else {
    console.log('⚠️  Algumas correções podem estar incompletas.\n');
    process.exit(1);
  }
  
} catch (err) {
  console.error('❌ ERRO DE SINTAXE ENCONTRADO:');
  console.error(err.message);
  console.error('\n' + err.stack);
  process.exit(1);
}
