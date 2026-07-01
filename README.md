# 🍕 Bot WhatsApp - Sistema Inteligente de Automação

Um projeto completo de **automação de atendimento no WhatsApp** desenvolvido para pequenas e médias empresas. Combina menus interativos, sistema de fila inteligente, análise de KPIs e gerenciamento robusto de clientes para oferecer uma experiência profissional e escalável.

> **Ideal para:** Pizzarias, restaurantes, e-commerce, serviços de delivery e qualquer negócio que necessite atendimento 24/7 automatizado com suporte a atendentes humanos.

---

## ✨ Por que usar este Bot?

- 🎯 **Atendimento Profissional** - Menus estruturados e fluxos otimizados
- ⚡ **Escalável** - Gerencie múltiplos clientes simultaneamente
- 📊 **Data-Driven** - Acompanhe métricas e tome decisões baseadas em dados
- 🔗 **Integração Humana** - Transfira para atendentes reais quando necessário
- 🛡️ **Confiável** - Reconexão automática e persistência de dados
- 💰 **Gratuito** - Código aberto sob licença MIT

---

## 🎯 Características Principais

### Sistema de Atendimento
- **Menus Interativos** - Navegação intuitiva com submenus e fluxos personalizáveis
- **Fila de Prioridades** - Ordena atendimentos por tipo e tempo de espera
- **Atendimento Humano** - Integração seamless com atendentes reais
- **Auto-liberação** - Timeout automático após 30 minutos
- **Histórico Completo** - Registro de todos os atendimentos

### Análise e Inteligência
- **KPIs em Tempo Real** - Acompanhe atendimentos iniciados, comprovantes, check-ins
- **Métricas de Performance** - Tempo médio de atendimento, horário de pico
- **Relatórios Automáticos** - Gere dados para análise gerencial
- **Persistência de Dados** - Recupere dados mesmo após reinicializações

### Segurança e Controle
- **Blacklist Inteligente** - Bloqueie números problemáticos
- **Rate Limiting** - Proteção contra spam e bloqueios do WhatsApp
- **Logs Detalhados** - Rastreabilidade completa com dados sensíveis mascarados
- **Modo Admin** - Comandos exclusivos para gerentes

---

## 🚀 Início Rápido

### Requisitos

```
✓ Node.js 14+ com npm
✓ Google Chrome (instalado no caminho padrão)
✓ Conexão à internet estável
✓ Conta WhatsApp ativa
```

### Passos de Instalação

**1. Clone o repositório**
```bash
git clone https://github.com/MiguelQuatro/bot-whatsapp.git
cd bot-whatsapp
```

**2. Instale as dependências**
```bash
npm install
```

**3. Configure suas credenciais**

Abra `.sys/bot-simple.js` e configure:

```javascript
// Suas credenciais WhatsApp
const CONTATO_SUPORTE = new Set(["559XXXXXXXX@c.us"]);    // Seu número
const ADMIN_JIDS = new Set(["559XXXXXXXX@c.us"]);         // Número do admin
const ATENDENTE_ATUAL = new Set(["559XXXXXXXX@c.us"]);    // Atendentes

// Horários de funcionamento
const HORARIO_EXPEDIENTE = {
  inicioSemana: 18,       // 18h segunda a sexta
  fimSemana: 23,          // 23h segunda a sexta
  inicioSabado: 17,       // 17h sábado
  fimSabado: 24           // 00h sábado
};
```

**4. Inicie o Bot**
```bash
npm start
```
ou
Botão Ligar(1/2) dentro da Pasta do Projeto

**5. Autentique no WhatsApp**

- Um **QR Code** será exibido no terminal
- Abra WhatsApp > **Configurações** > **Aparelhos vinculados** > **Vincular um aparelho**
- Escaneie o código
- ✅ Bot está pronto!

---

## 📱 Experiência do Cliente

### Menu Principal
```
🍕 PIZZARIA EXEMPLO - MENU PRINCIPAL

Escolha uma opção:

1 - 🍕 Cardápio / Sabores / Preços
2 - 🎉 Promoções / Combos
3 - 🗣️ Falar com Atendente
4 - ℹ️ Informações
5 - 📝 Feedback

Digite 1-5 ou *menu* para voltar
```

### Fluxo de Atendimento

```
Cliente inicia conversa
         ↓
    Menu Principal
         ↓
Escolhe: Falar com Atendente
         ↓
Sistema valida horário
         ↓
Solicita nome (se necessário)
         ↓
Entra na fila com prioridade
         ↓
Atendente notificado
         ↓
Conectado ao atendente real
         ↓
Comando "liberar" → Atendimento finalizado com KPIs
```

---

## 🎛️ Painel de Controle (Comandos Admin)

### Gerenciamento de Atendimento
```bash
liberar                 # Libera o cliente mais antigo em atendimento
liberar 13999887766     # Libera cliente específico
pausar 13999887766      # Pausa o bot para um cliente (bot fica silencioso)
fila status             # Lista todos os clientes aguardando
fila                    # Mostra sua posição (para clientes na fila)
```

### Análise e Relatórios
```bash
kpi status              # Exibe relatório completo:
                        # - Atendimentos iniciados
                        # - Comprovantes recebidos
                        # - Check-ins de pass
                        # - Tempo médio de atendimento
                        # - Horário de pico

kpi limpar              # Reseta todos os KPIs
historico               # Últimos 5 atendimentos com duração
```

### Gerenciamento de Contatos
```bash
bloquear 13999887766    # Adiciona à blacklist
desbloquear 13999887766 # Remove da blacklist
blacklist               # Lista todos os números bloqueados
```

### Configurações do Sistema
```bash
limite on               # Ativa limite de mensagens por hora
limite off              # Desativa limite
limite status           # Mostra se está ativo
expediente on           # Força aceitar atendimentos 24/7
expediente off          # Volta a respeitar horário
silencioso              # Reduz logs no terminal (mais limpo)
normal                  # Restaura logs normais
status                  # Exibe situação atual completa
comandos                # Lista todos os comandos
desligar                # Encerra o bot de forma segura
```

---

## 📊 Dashboard de Métricas

Quando você digita `kpi status`, recebe um relatório como este:

```
👥 Atendimentos iniciados: 45
💰 Comprovantes recebidos: 12
🟠 Check-ins de Pass: 8
🔔 Atendimentos solicitados: 25
✅ Clientes liberados: 30
💬 Total de mensagens: 1.250
⏱️ Tempo médio de atendimento: 12 minutos
⏰ Horário de pico: 20:00 (89 mensagens)
```

Estes dados ajudam a:
- Identificar horários críticos
- Planejar melhor a equipe
- Medir satisfação do cliente
- Otimizar processos

---

## 🗂️ Arquitetura do Projeto

```
bot-whatsapp/
│
├── .sys/
│   ├── bot-simple.js                    # Core do bot (1.700+ linhas)
│   ├── package.json                     # Dependências
│   ├── qrcode.png                       # QR Code gerado
│   ├── bot.log                          # Logs de operação
│   │
│   └── Dados Persistidos:
│       ├── kpis.json                    # Métricas acumuladas
│       ├── fila.json                    # Fila ativa
│       ├── blacklist.json               # Contatos bloqueados
│       └── historico_atendimentos.json  # Registro histórico
│
├── Botões/                              # Scripts de inicialização
│   ├── LIGAR-1.bat                     # Bot WhatsApp-Web
│   └── LIGAR-2.bat                     # Bot Baileys (backup)
│
├── ATUALIZAR.bat                        # Script de atualização
├── .gitignore
└── README.md                            # Documentação
```

---

## ⚙️ Configurações Recomendadas

### Para Pizzaria / Restaurante
```javascript
const HORARIO_EXPEDIENTE = {
  inicioSemana: 11,       // 11h segunda a sexta
  fimSemana: 23,          // 23h segunda a sexta
  inicioSabado: 11,       // 11h sábado
  fimSabado: 24           // 00h sábado
};

const LIMITE_MENSAGENS_POR_HORA = 50;  // Generoso para vendas
const TIMEOUT_ATENDIMENTO = 30 * 60 * 1000;  // 30 min é ok
```

### Para Suporte / Service
```javascript
const HORARIO_EXPEDIENTE = {
  inicioSemana: 9,        // 9h segunda a sexta
  fimSemana: 18,          // 18h segunda a sexta
  inicioSabado: 0,        // Fechado sábado
  fimSabado: 0
};

const LIMITE_MENSAGENS_POR_HORA = 30;  // Mais restritivo
const TIMEOUT_ATENDIMENTO = 45 * 60 * 1000;  // 45 min para suporte
```

### Para E-commerce
```javascript
const HORARIO_EXPEDIENTE = {
  inicioSemana: 0,        // 24/7 segunda a sexta
  fimSemana: 24,
  inicioSabado: 0,        // 24/7 sábado
  fimSabado: 24
};

const LIMITE_MENSAGENS_POR_HORA = 100; // Alto volume esperado
```

---

## 🔄 Sistema de Prioridades

A fila é inteligente e ordena por **tipo de solicitação**:

| Tipo | Prioridade | Exemplo |
|------|-----------|---------|
| 🏦 Comprovante | **0 (Alta)** | Cliente precisa comprovar pagamento |
| 💳 Pagamento | **0 (Alta)** | Problemas com transação |
| 🎟️ Pass/Check-in | **1 (Média)** | Validação de ingresso |
| 📞 Atendimento | **2 (Baixa)** | Dúvidas gerais |

Dentro de cada prioridade, a ordem é **FIFO** (quem chegou primeiro é atendido primeiro).

---

## 🛡️ Recursos de Segurança

### Proteção de Dados
- ✅ **Mascaramento** - Logs mostram apenas 4 últimos dígitos (ex: `****7766`)
- ✅ **Produção Safe** - `LOG_MENSAGENS = false` em produção
- ✅ **Limpeza Automática** - Dados expirados removidos a cada 5 minutos

### Rate Limiting
- ✅ **Cooldown entre Respostas** - 3 segundos padrão evita bloqueios
- ✅ **Limite por Hora** - Máximo 30 mensagens/hora (configurável)
- ✅ **Proteção Inteligente** - Admin/suporte não sofrem limitações

### Validação
- ✅ **Normalização de JID** - Converte automaticamente formatos
- ✅ **Verificação de Grupo** - Ignora mensagens de grupos
- ✅ **Blocklist** - Números podem ser bloqueados manualmente

---

## 🐛 Troubleshooting

### "No LID for user" Error
**Causa:** Formato de JID inválido  
**Solução:** Bot tenta 3 fallbacks automáticos. Se persistir:
```bash
# Execute o script de limpeza
LIMPAR_PASTAS.bat
# Reinicie o bot
npm start
```

### Bot não reconecta após desconexão
**Causa:** Limite de 5 reconexões atingido  
**Solução:** Use bot Baileys como backup:
```bash
# Na pasta Botões/
LIGAR-2.bat
```

### Terminal poluído com logs
**Solução:** Use modo silencioso
```bash
# No chat com admin
silencioso
# Logs continuam em .sys/bot.log
```

### Cliente bloqueado por WhatsApp
**Causa:** Muitas mensagens muito rápido  
**Solução:** Aumente cooldown ou ative limite
```bash
# No terminal
limite on
```

---

## 📦 Tecnologias Utilizadas

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| **Node.js** | 14+ | Runtime |
| **whatsapp-web.js** | 1.23.0 | Integração WhatsApp |
| **baileys** | 7.0.0-rc.9 | Backup (API alternativa) |
| **puppeteer** | 24.38.0 | Automação navegador |
| **qrcode** | 1.5.4 | Geração QR Code |

---

## 💡 Boas Práticas

### Em Desenvolvimento
```javascript
// Use o teste mode
enableTestMode();
getTestMessages(); // Valida respostas sem enviar
```

### Em Produção
```javascript
// Desative logs de mensagens
const LOG_MENSAGENS = false;

// Ative limite de mensagens
// (já está ativo por padrão)
```

### Backup Regular
```bash
# Faça backup destes arquivos
- .sys/kpis.json
- .sys/historico_atendimentos.json
- .sys/fila.json
```

### Monitoramento
```bash
# Verifique status regularmente
status

# Gere relatórios
kpi status
historico
fila status
```

---

## 🚨 Maintenance

### Logs muito grandes?
- Bot rotaciona automaticamente em 200MB
- Históricos são mantidos com timestamp
- Limpar manualmente: delete `.sys/bot.log`

### Memória crescendo?
- Não há vazamento conhecido
- Limpeza automática a cada 5 minutos
- Se persistir, reinicie o bot

### Fila travada?
- Nunca travou, mas se acontecer:
```bash
liberar            # Libera cliente
fila status        # Verifica fila
desligar           # Reinicia limpo
npm start
```

---

## 🎓 Aprendendo com o Código

Este projeto é excelente para aprender:

- **Arquitetura Node.js** - Estrutura profissional de bot
- **Automação WhatsApp** - Integração com whatsapp-web.js
- **State Management** - Gerenciamento robusto de estado
- **Rate Limiting** - Proteção contra spam
- **Data Persistence** - Salvamento e recuperação de dados
- **Error Handling** - Tratamento profissional de erros

---

## 🔮 Roadmap

### V1.1 (Próximo)
- [ ] Dashboard web em tempo real
- [ ] Integração com banco de dados
- [ ] Exportar relatórios em PDF/Excel
- [ ] Suporte a múltiplos atendentes simultâneos

### V1.2
- [ ] Análise de sentimento de feedback
- [ ] Integração com gateway de pagamento
- [ ] Agendamento automático de atendimentos
- [ ] API REST para sistemas externos

### V2.0
- [ ] Aplicativo mobile de admin
- [ ] Machine Learning para recomendações
- [ ] Suporte a múltiplas contas WhatsApp
- [ ] Integração com CRM

---

## 📞 Suporte e Contribuições

### Encontrou um Bug?
Por favor, [abra uma issue](https://github.com/MiguelQuatro/bot-whatsapp/issues) com:
- Descrição clara do problema
- Passos para reproduzir
- Versão do Node.js
- Screenshot/log se possível

### Quer Contribuir?
1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

---

## 👨‍💻 Autor

**Miguel Quatro**

- 🐙 GitHub: [@MiguelQuatro](https://github.com/MiguelQuatro)
- 📧 Entre em contato para dúvidas sobre implementação

---

## ⭐ Gostou?

Se este projeto foi útil para você, considere deixar uma ⭐ no repositório! Isso ajuda a manter o projeto ativo e motiva novas features.

---

**Desenvolvido com ❤️ para automação profissional no WhatsApp**

*Última atualização: 2026*
