# 🍕 Bot WhatsApp - Sistema Inteligente de Automação

Um projeto de automação de atendimento para WhatsApp pensado para negócios que precisam responder clientes rapidamente, reduzir filas e manter o atendimento humano quando necessário. O sistema resolve o problema de atendimento inconsistente, altos tempos de espera e quedas de disponibilidade ao combinar bot automatizado, fila inteligente e failover entre duas tecnologias.

> O bot consegue atender clientes 24/7, priorizar pedidos e dúvidas urgentes, notificar atendentes em tempo real e continuar funcionando mesmo se uma das integrações falhar.

---

## 🧩 Problema que o sistema resolve

Muitas empresas perdem clientes porque o atendimento é lento, manual e pouco escalável. Em pizzerias, restaurantes, e-commerce e serviços de suporte, mensagens acumulam, o cliente abandona o chat e a operação fica dependente de uma pessoa para responder tudo.

Este projeto elimina esse gargalo com atendimento automatizado, fila ordenada por prioridade, resposta rápida e transferência inteligente para humanos quando a situação exige.

---

## 🔄 Fluxo do sistema

```text
Cliente no WhatsApp
        │
        ▼
   Bot 1 (whatsapp-web.js)
        │
        ├── funciona normalmente
        │
        └── falha / timeout / desconexão
                    │
                    ▼
             Bot 2 (Baileys)
                    │
                    ├── assume o atendimento
                    └── mantém fila e estado
                              │
                              ▼
                    Fila inteligente
                      - prioridade
                      - tempo de espera
                      - atendimento humano
                              │
                              ▼
                 Transferência para atendente real
                              │
                              ▼
                  KPIs, histórico e relatórios
```

### Componentes principais
- Bot 1: fluxo principal e integração com WhatsApp Web
- Bot 2: failover automático para continuidade do atendimento
- Fila inteligente: prioriza casos urgentes e mantém ordem FIFO dentro da prioridade
- Atendente humano: recebe o cliente quando necessário ou solicitado
- Monitoramento: KPIs, histórico de atendimentos e logs

---

## ✨ Principais funcionalidades

### Sistema de atendimento
- Menus interativos com navegação em fluxo estruturado
- Fila por prioridade e tempo de espera
- Atendimento humano com transferência eficiente
- Auto-liberação após timeout configurável
- Histórico completo de interações

### Inteligência operacional
- KPIs em tempo real para serviços, comprovantes, check-ins e tempo médio
- Relatórios úteis para gestão e tomada de decisão
- Validação de horários de funcionamento e regras de exclusão
- Persistência de dados para recuperação após reinício

### Segurança e controle
- Blacklist para números problemáticos
- Rate limiting para reduzir spam e bloqueios
- Logs detalhados com mascaramento de dados sensíveis
- Modo admin para comandos exclusivos de gestão

### Resiliência
- Reconexão automática
- Failover entre bots para manter serviço online
- Backoff exponencial para evitar sobrecarga em falhas repetidas
- Recuperação de estado após reinicialização

---

## 🚀 Como rodar

### Requisitos

```text
✓ Node.js 14+
✓ npm
✓ Google Chrome instalado no caminho padrão
✓ Conexão estável com a internet
✓ Conta WhatsApp ativa
```

### Instalação

```bash
git clone https://github.com/MiguelQuatro/bot-whatsapp.git
cd bot-whatsapp
npm install
```

### Configuração básica

Abra `.sys/bot-simple.js` e configure os contatos do suporte, admins e atendentes:

```javascript
const CONTATO_SUPORTE = new Set(["559XXXXXXXX@c.us"]);
const ADMIN_JIDS = new Set(["559XXXXXXXX@c.us"]);
const ATENDENTE_ATUAL = new Set(["559XXXXXXXX@c.us"]);

const HORARIO_EXPEDIENTE = {
  inicioSemana: 18,
  fimSemana: 23,
  inicioSabado: 17,
  fimSabado: 24
};
```

### Iniciar

```bash
npm start
```

Ou execute os scripts em `Botões/` para ligar o sistema.

### Autenticação

- Um QR Code será exibido no terminal
- Abra o WhatsApp e vá em `Configurações > Dispositivos vinculados > Vincular um aparelho`
- Escaneie o código
- O bot ficará pronto para atender

---

## 🏗️ Decisões técnicas

### Por que dois bots?

O projeto usa dois mecanismos de integração para reduzir riscos de indisponibilidade. O bot principal garante uma experiência sólida em produção, enquanto o backup atua como failover caso a conexão principal falhe ou o cliente fique instável. Isso aumenta a resiliência do atendimento sem exigir reinício manual.

### Por que backoff exponencial?

Em cenários de reconexão, tentativas consecutivas imediatas podem saturar a conexão, gerar bloqueios e piorar a falha. O backoff exponencial aumenta gradualmente o tempo entre tentativas, reduzindo pressão sobre o serviço e aumentando a chance de estabilidade.

### Por que fila inteligente?

Mensagens de clientes não devem ser tratadas como uma lista genérica. O sistema organiza a fila por urgência, tipo de solicitação e tempo de espera, garantindo que clientes com problema crítico ou atendimento prioritário não sejam ignorados.

### Por que transferência para humano?

Automação resolve grande parte do volume, mas situações delicadas exigem atendimento real. Quando o cliente exige ajuda humana, o bot encaminha de forma organizada e registra o contexto para manter continuidade.

---

## 📸 Demonstração

Abaixo está um espaço para mostrar a experiência do usuário em execução. Adicione prints ou um GIF real na pasta `docs/` e ajuste os caminhos abaixo.

```markdown
![Menu principal do bot](docs/assets/menu-principal.png)
![Fluxo de atendimento em execução](docs/assets/atendimento.gif)
![Dashboard de KPIs](docs/assets/kpi-status.png)
```

Exemplo de comportamento esperado:
- cliente entra no menu
- escolhe opção de atendimento
- bot valida horário
- coloca na fila
- notifica atendente
- segue para atendimento ou fallback

---

## 📊 Dashboard de métricas

Ao consultar `kpi status`, o sistema expõe um resumo como este:

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

## 🗂️ Arquitetura do projeto

```text
bot-whatsapp/
│
├── .sys/
│   ├── bot-simple.js
│   ├── package.json
│   ├── qrcode.png
│   ├── bot.log
│   └── Dados Persistidos/
│       ├── kpis.json
│       ├── fila.json
│       ├── blacklist.json
│       └── historico_atendimentos.json
│
├── Botões/
│   ├── LIGAR-1.bat
│   └── LIGAR-2.bat
│
├── ATUALIZAR.bat
├── .gitignore
├── README.md
└── LICENSE
```

---

## 🎛️ Painel de controle (comandos admin)

```bash
liberar                 # Libera o cliente mais antigo em atendimento
liberar 13999887766     # Libera cliente específico
pausar 13999887766      # Pausa o bot para um cliente
fila status             # Lista todos os clientes aguardando
fila                    # Mostra a posição do cliente
kpi status              # Exibe métricas e KPIs
kpi limpar              # Reseta os KPIs
historico               # Últimos atendimentos
bloquear 13999887766    # Bloqueia um contato
blacklist               # Lista contatos bloqueados
limite on               # Ativa limite de mensagens por hora
limite off              # Desativa o limite
status                  # Exibe situação atual do sistema
comandos                # Lista os comandos disponíveis
silencioso              # Reduz logs no terminal
normal                  # Restaura logs normais
desligar                # Encerra o bot com segurança
```

---

## 🛡️ Recursos de segurança

### Proteção de dados
- Logs com mascaramento dos últimos dígitos
- `LOG_MENSAGENS = false` em produção
- Limpeza automática de dados expirados

### Rate limiting
- Cooldown de 3 segundos entre respostas
- Limite configurável por hora
- Exceções para admin e suporte

### Validação
- Normalização automática de JID
- Ignora mensagens de grupos
- Blacklist manual

---

## 🐛 Troubleshooting

### "No LID for user"
**Causa:** formato de JID inválido  
**Solução:** execute a limpeza e reinicie o bot.

```bash
LIMPAR_PASTAS.bat
npm start
```

### Bot não reconecta
**Causa:** limite de reconexões atingido  
**Solução:** use o backup Baileys.

```bash
cd Botões
LIGAR-2.bat
```

### Terminal poluído com logs
```bash
silencioso
```

### WhatsApp bloqueou o cliente
**Causa:** muitas mensagens em sequência  
**Solução:** use rate limiting ou aumente o cooldown.

```bash
limite on
```

---

## 📦 Tecnologias utilizadas

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| **Node.js** | 14+ | Runtime |
| **whatsapp-web.js** | 1.23.0 | Integração principal |
| **baileys** | 7.0.0-rc.9 | Backup e failover |
| **puppeteer** | 24.38.0 | Automação do navegador |
| **qrcode** | 1.5.4 | Geração do QR Code |

---

## 💡 Boas práticas

### Em desenvolvimento
```javascript
enableTestMode();
getTestMessages();
```

### Em produção
```javascript
const LOG_MENSAGENS = false;
```

### Backup regular
```bash
cp .sys/kpis.json ./backup/kpis.json
cp .sys/historico_atendimentos.json ./backup/historico_atendimentos.json
cp .sys/fila.json ./backup/fila.json
```

---

## 🔄 Roadmap

### V1.1
- [ ] Dashboard web em tempo real
- [ ] Integração com banco de dados
- [ ] Exportação de relatórios em PDF/Excel
- [ ] Suporte a múltiplos atendentes simultâneos

### V1.2
- [ ] Análise de sentimento de feedback
- [ ] Gateway de pagamento
- [ ] Agendamento automático de atendimentos
- [ ] API REST para integrações externas

### V2.0
- [ ] App mobile para administração
- [ ] Machine learning para recomendações
- [ ] Múltiplas contas WhatsApp
- [ ] Integração com CRM

---

## 📞 Suporte e contribuições

### Encontrou um bug?
Abra uma issue descrevendo:
- problema
- passos para reproduzir
- versão do Node.js
- screenshots ou logs que ajudem a diagnosticar

### Quer contribuir?
1. Faça o fork do projeto
2. Crie uma branch para sua feature
3. Commit com sua alteração
4. Push para o fork
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Consulte o arquivo `LICENSE` para mais detalhes.

---

## 👨‍💻 Autor

**Miguel Quatro**

- GitHub: [@MiguelQuatro](https://github.com/MiguelQuatro)
- Contato: disponível no perfil do autor para dúvidas de implementação

---

## ⭐ Gostou?

Se este projeto foi útil para você, considere deixar uma estrela no repositório para apoiar o projeto e incentivar novas melhorias.

---

**Desenvolvido com cuidado para automação profissional no WhatsApp**

*Última atualização: 2026*
