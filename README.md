# Bot WhatsApp — automação de atendimento e fila

Sistema de automação para WhatsApp pensado para negócios que precisam atender clientes com rapidez, organizar filas e reduzir esforço manual sem perder contexto e qualidade na conversa.

Este projeto foi desenvolvido para operar em cenários como academias, consultórios, serviços recorrentes e atendimento com prioridade, check-in, comprovantes e troca com atendente humano.

## Problema

Muitas operações perdem clientes por conta de resposta lenta, fila desorganizada e ausência de acompanhamento em canais de conversa. Quando o atendimento depende de pessoas em tempo real, o processo fica instável, sujeito a atrasos e difícil de escalar.

Este bot resolve esse gargalo com automação de atendimento, fila inteligente, regras de negócio e fallback para atendimento humano quando necessário.

## Funcionalidades

- Menu interativo para WhatsApp com navegação em fluxo estruturado
- Fila por prioridade e tempo de espera
- Atendimento humano com transferência organizada
- Controle de expediente, regras de bloqueio e blacklist
- KPIs e histórico de atendimentos
- Recuperação de contexto após reinicialização
- Redundância com backup Baileys para maior disponibilidade

## Tecnologias

- Node.js 20.20+
- whatsapp-web.js
- Baileys
- Puppeteer
- qrcode / qrcode-terminal
- Persistência local em arquivos JSON

## Como rodar

1. Clone o repositório:
   ```bash
   git clone https://github.com/MiguelQuatro/bot-whatsapp.git
   cd bot-whatsapp
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Copie o arquivo de exemplo de configuração:
   ```bash
   cp .env.example .env
   ```

4. Edite o arquivo `.env` com os valores do ambiente e os números de suporte/admin/atendente, se necessário.

5. Inicie o bot:
   ```bash
   npm start
   ```

6. Escaneie o QR Code exibido no terminal e o bot ficará pronto para atender.

## Configuração e ambiente

Este projeto ainda usa configuração local em `.sys/bot-simple.js` para alguns valores operacionais, mas o ideal é manter dados sensíveis em variáveis de ambiente e fora do versionamento.

Arquivo de exemplo:

```env
NODE_ENV=development
ADMIN_JIDS=5511900000001@c.us
SUPORTE_JIDS=5511900000001@c.us
ATENDENTE_JIDS=5511900000001@c.us
```

## Banco de dados / persistência

Este MVP não usa banco relacional em SQL. A persistência é local e feita em arquivos JSON dentro da pasta `.sys`.

Arquivos principais:
- `.sys/kpis.json` — métricas e contadores
- `.sys/fila.json` — fila de espera
- `.sys/blacklist.json` — contatos bloqueados
- `.sys/historico_atendimentos.json` — histórico de atendimentos
- `.sys/bot.log` — logs do sistema

Isso facilita execução local e manutenção simples, porém exige atenção para não publicar dados reais de clientes ou sessão do WhatsApp.

## Estrutura de pastas

```text
bot-whatsapp/
├── .sys/
│   ├── bot-simple.js
│   ├── chatbot.js
│   ├── package.json
│   ├── bot.log
│   ├── kpis.json
│   ├── fila.json
│   ├── blacklist.json
│   ├── historico_atendimentos.json
│   └── Tutorial.md
├── Botões/
│   ├── LIGAR-1.bat
│   └── LIGAR-2.bat
├── .gitignore
├── .env.example
├── README.md
├── package.json
├── ATUALIZAR.bat
├── LICENSE
└── .wwebjs_auth/   # gerado localmente, não versionar
```

## Segurança

Este projeto lida com mensagens de clientes e pode armazenar dados operacionais sensíveis. Por isso, algumas práticas são recomendadas:

- nunca versionar `.env` com números reais ou chaves
- manter `.wwebjs_auth/`, `.wwebjs_cache/`, QR Code e logs fora do repositório
- não publicar histórico com dados pessoais sem mascaramento
- usar `.env` ou arquivo de configuração local em vez de hardcode de números e credenciais

O `.gitignore` já cobre arquivos sensíveis como:
- `.wwebjs_auth/`
- `.wwebjs_cache/`
- `.env`
- `*.log`
- `qrcode.png`
- `kpis.json`
- `blacklist.json`
- `historico_atendimentos.json`
- `fila.json`

## Demonstração

A interface do sistema funciona por mensagens e menus no WhatsApp. Como este projeto é um MVP de automação em ambiente local, os prints/GIF devem ser adicionados com dados mascarados e sem exposição de cliente real.

Exemplo de uso:
- cliente entra no menu
- escolhe opção de atendimento
- bot valida regras de negócio
- coloca o cliente em fila ou encaminha para humano
- grava histórico e KPIs

Usuário de teste (exemplo fictício):
- Login: `admin@demo.local`
- Senha: `demo123`

> Os dados acima são apenas ilustrativos para ambiente local e não devem ser usados em produção.

## Roadmap

- [ ] Dashboard web simples para acompanhamento em tempo real
- [ ] Persistência em banco de dados para operação mais robusta
- [ ] Exportação de relatórios em CSV/PDF
- [ ] Melhorias na fila e priorização por tipo de atendimento

## Decisões técnicas

### Por que usar dois bots?

Para reduzir riscos de indisponibilidade: o bot principal cuida do fluxo normal e o backup entra quando há falha, timeout ou desconexão.

### Por que fila inteligente?

Mensagens não devem ser tratadas como uma lista genérica. A fila organiza urgência, tempo de espera e contexto para evitar atrasos e priorizar atendimentos mais sensíveis.

### Por que persistir em arquivos locais?

Para manter o projeto simples, levável e fácil de executar em ambiente local, sem depender de infraestrutura adicional para o MVP.

## Autor

Miguel Quatro

- GitHub: https://github.com/MiguelQuatro
- LinkedIn: [adicionar perfil]

## Licença

Este projeto está sob a licença MIT.

---

Resumo: o projeto já tem boa parte do conteúdo técnico necessário. O que falta é deixar a documentação mais clara para quem abrir o repositório pela primeira vez: problema, o que o sistema faz, tecnologias, como rodar, segurança e demonstração.
