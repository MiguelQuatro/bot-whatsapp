# Bot WhatsApp - atendimento, fila e check-in

Sistema de automação para WhatsApp pensado para negócios que precisam responder clientes rapidamente, manter uma fila organizada e reduzir atendimento manual sem perder qualidade no relacionamento.

Este projeto foi desenhado para cenários como academias, clínicas, consultórios, serviços recorrentes e operação de atendimento com fila, confirmação de dados e liberação de acesso. A estrutura suporta menu interativo, atendimento humano quando necessário, registros de KPIs e recuperação em caso de falha do canal principal.

> O objetivo não é apenas mandar mensagens automáticas: é organizar o atendimento, reduzir filas, preservar contexto e deixar a operação mais previsível.

---

## Problema que o sistema resolve

Muitas operações perdem clientes por causa de resposta lenta, fila desorganizada e ausência de acompanhamento em canais de conversa. Em ambientes com demanda recorrente, como academia, check-in, comprovantes e atendimento humano, isso gera atrito e queda de conversão.

Este bot resolve esse gargalo com:
- menu estruturado para navegação simples no WhatsApp
- fila por prioridade e tempo de espera
- transição para atendente humano quando necessário
- registro de KPI e histórico para gestão
- controle de bloqueios, logs e regras de segurança

---

## Fluxo do sistema

```text
Cliente no WhatsApp
        │
        ▼
   Bot principal (whatsapp-web.js)
        │
        ├── funciona normalmente
        └── falha / timeout / desconexão
                    │
                    ▼
             Bot de redundância (Baileys)
                    │
                    ├── assume o atendimento
                    ├── mantém fila e contexto
                    └── notifica atendente humano
                              │
                              ▼
                 Fila inteligente + regras de negócio
                              │
                              ▼
                 Cliente recebe resposta / liberação / próxima ação
                              │
                              ▼
                    KPIs, histórico e monitoramento
```

### Componentes principais
- Bot principal: fluxo principal e integração com WhatsApp Web
- Bot de backup: fallback para manutenção da operação
- Fila organizada: prioriza urgência, tempo de espera e contexto
- Atendente humano: recebe casos sensíveis ou pendentes
- Monitoramento: KPIs, histórico e logs estruturados

---

## Principais funcionalidades

### Atendimento e operação
- Menus interativos com navegação em fluxo estruturado
- Fila por prioridade e tempo de espera
- Atendimento humano com transferência eficiente
- Auto-liberação após timeout configurável
- Histórico completo de interações e eventos

### Gestão e acompanhamento
- KPIs em tempo real de atendimentos, check-ins e geração de comprovantes
- Relatórios para avaliação de desempenho e pico de demanda
- Validação de expediente e regras de exclusão
- Persistência de dados para recuperação após reinício

### Segurança e controle
- Blacklist para números problemáticos
- Rate limiting para reduzir spam e excesso de mensagens
- Logs com mascaramento de dados sensíveis
- Modo admin para comandos específicos de operação

### Resiliência
- Reconexão automática
- Failover entre bots para manter serviço online
- Backoff exponencial para evitar sobrecarga em falhas repetidas
- Recuperação de estado após reinicialização

---

## Como rodar

### Requisitos

```text
✓ Node.js 18+ (recomendado: 20+)
✓ npm
✓ Google Chrome instalado no caminho padrão
✓ Conexão estável com a internet
✓ Conta WhatsApp ativa
```

> Baileys e Puppeteer mais recentes costumam exigir versões mais recentes do Node. Para evitar incompatibilidades, o recomendado é usar Node 18 ou 20.

### Instalação

```bash
git clone https://github.com/MiguelQuatro/bot-whatsapp.git
cd bot-whatsapp
npm install
```

### Configuração básica

Use variáveis de ambiente ou um arquivo de exemplo em vez de editar números diretamente no código do bot. Exemplo:

```env
ADMIN_JIDS=5511900000001@c.us
SUPORTE_JIDS=5511900000001@c.us
ATENDENTE_JIDS=5511900000001@c.us
```

Se o projeto for executado localmente, mantenha dados reais fora do repositório e nunca publique arquivos de sessão ou QR code com conta vinculada.

### Iniciar

```bash
npm start
```

Ou use os scripts da pasta `Botões` para iniciar o sistema.

### Autenticação

- Um QR Code será exibido no terminal
- Abra o WhatsApp e vá em `Configurações > Dispositivos vinculados > Vincular um aparelho`
- Escaneie o código
- O bot ficará pronto para atender

---

## Decisões técnicas

### Por que dois bots?

O projeto usa dois mecanismos de integração para reduzir riscos de indisponibilidade. O bot principal garante uma experiência sólida em produção, enquanto o backup atua como failover caso a conexão principal falhe ou o ambiente fique instável.

### Por que backoff exponencial?

Em cenários de reconexão, tentativas consecutivas imediatas podem saturar a conexão, gerar bloqueios e piorar a falha. O backoff exponencial aumenta gradualmente o tempo entre tentativas, reduzindo sobrecarga e melhorando a estabilidade.

### Por que fila inteligente?

Mensagens de clientes não devem ser tratadas como uma lista genérica. O sistema organiza a fila por urgência, tipo de solicitação e tempo de espera, garantindo que casos mais relevantes sejam atendidos com prioridade.

### Por que transferência para humano?

Automação resolve grande parte do volume, mas situações delicadas exigem atendimento real. Quando o cliente exige ajuda humana, o bot encaminha de forma organizada e preserva o contexto para que o atendente continue no ponto certo.

---

## Demonstracao

Abaixo está um exemplo ilustrativo de como a experiência pode aparecer em operação. Os exemplares visuais reais serão adicionados conforme o projeto evoluir.

```text
[Menu principal do bot]
┌──────────────────────────────┐
│   Atendimento WhatsApp       │
│                              │
│  1. Cardápio / Check-in      │
│  2. Comprovantes            │
│  3. Falar com atendente     │
│  4. Informações             │
│  5. Feedback                │
└──────────────────────────────┘
```

Exemplo de comportamento esperado:
- cliente entra no menu
- escolhe opção de serviço ou atendimento
- bot valida regras de negócio
- coloca usuário em fila ou libera fluxo
- notifica atendente quando necessário
- registra atividade em KPI e histórico

---

## Dashboard de métricas

Ao consultar o KPI, o sistema pode expor um resumo como este. Os valores abaixo são apenas ilustrativos e não representam dados reais de produção.

```text
👥 Atendimentos iniciados: 45
💰 Comprovantes recebidos: 12
🟠 Check-ins de Pass: 8
🔔 Atendimentos solicitados: 25
✅ Clientes liberados: 30
💬 Total de mensagens: 1.250
⏱️ Tempo médio de atendimento: 12 minutos
⏰ Horário de pico: 20:00 (89 mensagens)
```

Esses dados ajudam a:
- identificar horários críticos
- medir tempo de resposta
- acompanhar produtividade
- melhorar o processo de atendimento

---

## Arquitetura do projeto

```text
bot-whatsapp/
│
├── .sys/
│   ├── bot-simple.js
│   ├── chatbot.js
│   ├── package.json
│   ├── Tutorial.md
│   ├── bot.log
│   ├── qrcode.png
│   ├── kpis.json
│   ├── fila.json
│   ├── blacklist.json
│   └── historico_atendimentos.json
│
├── Botões/
│   ├── LIGAR-1.bat
│   └── LIGAR-2.bat
│
├── ATUALIZAR.bat
├── .gitignore
├── README.md
├── LICENSE
└── package.json
```

---

## Painel de controle (comandos admin)

```bash
liberar
liberar 13999887766
pausar 13999887766
fila status
fila
kpi status
kpi limpar
historico
bloquear 13999887766
blacklist
limite on
limite off
status
comandos
silencioso
normal
desligar
```

---

## Segurança e LGPD

Este projeto lida com mensagens, atendimentos e, em alguns cenários, dados de clientes. Por isso, vale seguir boas práticas:

- mantenha arquivos de sessão, QR Code e logs fora do repositório
- não publique `.env` com números reais ou tokens
- nunca commite histórico de atendimento com dados pessoais sem mascaramento
- use arquivos de configuração locais e mantenha os valores sensíveis fora do versionamento
- revise o `.gitignore` antes de publicar o projeto

Arquivos que devem permanecer locais ou protegidos:
- `.sys/bot.log`
- `.sys/kpis.json`
- `.sys/historico_atendimentos.json`
- `.sys/blacklist.json`
- `.sys/qrcode.png`
- `.wwebjs_auth/`
- `.wwebjs_cache/`
- sessões do WhatsApp / autenticação do cliente

Se algum arquivo sensível já foi enviado ao GitHub, o ideal é:
1. remover do histórico do repositório
2. invalidar a sessão atual
3. gerar nova autenticação
4. revisar o projeto em busca de dados residuais

---

## Troubleshooting

### Bot não inicia ou a sessão fica travada

- reinicie o bot
- remova a pasta de sessão local, se necessário
- verifique se há conflito no Chrome/WhatsApp Web

```bash
npm start
```

### Bot não reconecta

- confirme a conexão com a internet
- verifique logs em `.sys/bot.log`
- teste o backup Baileys pela pasta `Botões`

### Terminal poluído com logs

```bash
silencioso
```

### WhatsApp bloqueou ou gerou falhas de envio

- reduza frequência de mensagens
- ative o rate limiting
- revise o limite de mensagens por hora

```bash
limite on
```

---

## Tecnologias utilizadas

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| **Node.js** | 18+ | Runtime |
| **whatsapp-web.js** | 1.23.0 | Integração principal |
| **baileys** | 7.0.0-rc.9 | Backup e failover |
| **puppeteer** | 24.38.0 | Automação do navegador |
| **qrcode** | 1.5.4 | Geração do QR Code |

---

## Roadmap

### Próximos passos realistas
- [ ] Dashboard web simples para acompanhamento em tempo real
- [ ] Integração com banco de dados para persistência mais robusta
- [ ] Exportação de relatórios em CSV/PDF
- [ ] Melhorias na fila e regras de priorização

### Evoluções futuras possíveis
- [ ] API REST para integrações externas
- [ ] Múltiplos atendentes operando em paralelo
- [ ] Relatórios por horário, tipo de atendimento e produtividade

---

## Suporte e contribuições

Se você encontrou um problema, abra uma issue com:
- descrição do problema
- passos para reproduzir
- versão do Node.js
- logs relevantes, quando possível

Contribuições são bem-vindas por meio de fork e pull request.

---

## Licença

Este projeto está sob a licença MIT. Consulte o arquivo `LICENSE` para mais detalhes.

---

## Autor

**Miguel Quatro**

- GitHub: [@MiguelQuatro](https://github.com/MiguelQuatro)

---

## Resumo

Este projeto combina automação, fila, atendimento humano e monitoramento para criar uma operação de WhatsApp mais previsível e escalável. A parte técnica já é sólida; o que faz diferença agora é deixar a documentação mais precisa, segura e alinhada ao problema real que a solução resolve.
