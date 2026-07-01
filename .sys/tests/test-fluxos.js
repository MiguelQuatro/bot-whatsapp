// ================================
// TESTES DE FLUXOS PRINCIPAIS
// ================================

const { Client, LocalAuth } = require('whatsapp-web.js');
const {
  showMainMenu,
  showModalidadesHorariosValores,
  showValores,
  showValoresMensais,
  showValoresDiaria,
  showModalidades,
  showPlanos,
  showPacotes,
  setState,
  stateData,
} = require('../bot-simple.js');

const jid = "5513999999999@c.us"; // JID de teste

let testResults = [];

async function runTest(testName, testFn) {
  try {
    console.log(`\n🧪 [TESTE] ${testName}`);
    await testFn();
    testResults.push({ name: testName, status: "✅ PASSOU" });
    console.log(`✅ ${testName} passou!`);
  } catch (error) {
    testResults.push({ name: testName, status: `❌ FALHOU: ${error.message}` });
    console.error(`❌ ${testName} falhou!`, error.message);
  }
}

async function runAllTests() {
  console.log("=".repeat(60));
  console.log("🚀 INICIANDO TESTES DE FLUXOS");
  console.log("=".repeat(60));

  // TESTE 1: Fluxo Valores → Diários → Opção 5 (Fit Dance)
  await runTest("Fluxo: 1 → Valores → Diária → 5 (Fit Dance)", async () => {
    setState(jid, "valores", { flow: null });
    const state1 = stateData.get(jid);
    if (state1.estado !== "valores") throw new Error("Estado não é 'valores'");
    
    setState(jid, "valores_diarios", { flow: null, modalidade: null });
    const state2 = stateData.get(jid);
    if (state2.estado !== "valores_diarios") throw new Error("Estado não é 'valores_diarios'");
    
    // Simular entrada "5" sem modalidade pré-selecionada
    // Isso deveria validar a opção 1-9
    console.log("   └─ Simulando entrada '5' em valores_diarios");
  });

  // TESTE 2: Fluxo Valores → Mensal → Opção 3 (Funcional Kids)
  await runTest("Fluxo: Valores → Mensal → 3 (Funcional Kids)", async () => {
    setState(jid, "valores", { flow: null });
    setState(jid, "valores_mensais", { flow: null, modalidade: null });
    
    const state = stateData.get(jid);
    if (state.estado !== "valores_mensais") throw new Error("Estado não é 'valores_mensais'");
    console.log("   └─ Opção 3 deveria ser aceita (Funcional Kids)");
  });

  // TESTE 3: Fluxo de Modalidades diretamente
  await runTest("Fluxo: Modalidades → 1-9", async () => {
    setState(jid, "modalidades", { flow: null });
    
    const state = stateData.get(jid);
    if (state.estado !== "modalidades") throw new Error("Estado não é 'modalidades'");
    console.log("   └─ Opções 1-9 deveriam ser aceitas");
  });

  // TESTE 4: Fluxo Planos
  await runTest("Fluxo: Planos → 1-5", async () => {
    setState(jid, "planos", { flow: null });
    
    const state = stateData.get(jid);
    if (state.estado !== "planos") throw new Error("Estado não é 'planos'");
    console.log("   └─ Opções 1-5 deveriam ser aceitas");
  });

  // TESTE 5: Fluxo Pacotes
  await runTest("Fluxo: Pacotes → 1-3", async () => {
    setState(jid, "pacotes", { flow: null });
    
    const state = stateData.get(jid);
    if (state.estado !== "pacotes") throw new Error("Estado não é 'pacotes'");
    console.log("   └─ Opções 1-3 deveriam ser aceitas");
  });

  // TESTE 6: Horários menu
  await runTest("Fluxo: Horários → 1-3", async () => {
    setState(jid, "horarios", { modalidade: "Fit Dance", valor: "diaria", flow: null });
    
    const state = stateData.get(jid);
    if (state.estado !== "horarios") throw new Error("Estado não é 'horarios'");
    console.log("   └─ Opções 1-3 deveriam ser aceitas");
  });

  // TESTE 7: Feedback
  await runTest("Fluxo: Feedback → 1-4", async () => {
    setState(jid, "feedback", {});
    
    const state = stateData.get(jid);
    if (state.estado !== "feedback") throw new Error("Estado não é 'feedback'");
    console.log("   └─ Opções 1-4 deveriam ser aceitas");
  });

  // TESTE 8: Avaliação (1-5 estrelas)
  await runTest("Fluxo: Avaliação → 1-5", async () => {
    setState(jid, "avaliacao", {});
    
    const state = stateData.get(jid);
    if (state.estado !== "avaliacao") throw new Error("Estado não é 'avaliacao'");
    console.log("   └─ Opções 1-5 deveriam ser aceitas");
  });

  // TESTE 9: Menu Principal
  await runTest("Fluxo: Menu Principal → 1-5", async () => {
    setState(jid, "menu_principal", {});
    
    const state = stateData.get(jid);
    if (state.estado !== "menu_principal") throw new Error("Estado não é 'menu_principal'");
    console.log("   └─ Opções 1-5 deveriam ser aceitas");
  });

  // TESTE 10: Pass
  await runTest("Fluxo: Pass → 1-2", async () => {
    setState(jid, "pass", {});
    
    const state = stateData.get(jid);
    if (state.estado !== "pass") throw new Error("Estado não é 'pass'");
    console.log("   └─ Opções 1-2 deveriam ser aceitas");
  });

  console.log("\n" + "=".repeat(60));
  console.log("📊 RESUMO DOS TESTES");
  console.log("=".repeat(60));
  
  testResults.forEach((result) => {
    console.log(`${result.status} — ${result.name}`);
  });

  const passedCount = testResults.filter(r => r.status.includes("✅")).length;
  const totalCount = testResults.length;
  
  console.log(`\n✅ ${passedCount}/${totalCount} testes passaram`);
}

// Executar testes
runAllTests().catch(console.error);
