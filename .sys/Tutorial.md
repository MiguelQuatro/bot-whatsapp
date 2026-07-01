# Tutorial de Instalação e Uso do Bot Pizzaria Exemplo

Este tutorial descreve o setup do bot Pizzaria Exemplo e substitui os arquivos antigos de deploy.

## 1. Instalação do ambiente

1. Configure o número como conta comercial no WhatsApp.
2. Baixe e instale o Node.js 20.20 (recomendado LTS).
3. Clone ou copie o repositório do bot:
   - `git clone https://github.com/SEU_USUARIO/bot-whatsapp-main.git`
   - `cd bot-whatsapp-main`
4. Instale dependências do projeto:
   - `npm install`
5. Instale PM2 (opcional, se for usar como serviço):
   - `npm install -g pm2`
   - `pm2 --version` (verifique que está instalado)

## 2. Preparar pasta de controle

1. Crie uma pasta na Área de Trabalho chamada `Controle bot`.
2. Dentro dela, crie dois arquivos `.bat`:

### 2.1 Iniciar Bot.bat
```bat
@echo off
title 7fit Bot - Iniciando...
cd /d %~dp0
echo Iniciando o bot...
pm2 start bot-simple.js --name tachou-bot
echo Bot iniciado! Pressione qualquer tecla para sair...
pause >nul
```

### 2.2 Desligar Bot.bat
```bat
@echo off
title 7fit Bot - Desligando...
cd /d %~dp0
echo Desligando o bot...
pm2 stop tachou-bot
pm2 delete tachou-bot
echo Bot desligado! Pressione qualquer tecla para sair...
pause >nul
```

3. Opcional: ajuste os ícones dos arquivos `.bat` (modo verde/vermelho) para identificação.

## 3. Uso básico do bot (fluxos de interação)

1. Inicie o bot com `Iniciar Bot.bat`.
2. No WhatsApp (a partir do número do bot):
   - Envie mensagens e siga o menu principal.

### Menu principal (estado `menu_principal`)
- 1 - Cardápio / Preços / Horários
- 2 - Promoções / Cupons
- 3 - Pedidos / Combos / Bebidas
- 4 - Atendente
- 5 - Informações
- 6 - Feedback
- `menu` - Volta sempre para o menu principal

### Exemplo de caminho completo
1 → 1 → 1 → sim → 1 → (envia `Maria Oliveira - Pizza Portuguesa`) → enviar comprovante (mídia)

### Subfluxos
- Dentro de 1: escolha `Modalidades`, `Valores` ou `Horários` e use 0 para voltar.
- O estado `pagamentos` aceita `Nome - Modalidade` ou (se modalidade já definida) apenas `Nome`.
- Estado `pagamentos_pix` aguarda comprovante de pagamento (mídia).
- Estado `pass` aceita 1/2/0 e notifica o suporte.
- Estado `pacotes_planos` aceita 1..9 para planos/pacotes e 0 para voltar.

## 4. Atualização do bot via Git

No seu computador de desenvolvimento:
- `git add .`
- `git commit -m "Atualização: nova mensagem"`
- `git push`

No PC de produção (pizzaria):
- `cd C:\Users\OFFICE\Desktop\bot-whatsapp-main`
- `git pull`
- `npm install`
- `pm2 restart tachou-bot`

Se precisar reiniciar completo:
- `pm2 stop tachou-bot`
- `pm2 delete tachou-bot`
- `pm2 start bot-simple.js --name tachou-bot`

## 5. Funcionalidades e requisitos do bot

### Funcionalidades principais
- Menu via WhatsApp para navegação guiada (1..6 + menu + 0).
- Exibição de modalidades, valores e horários.
- Registro de intenção de pagamento e coleta de dados (nome + modalidade).
- Recepção de comprovante via imagem para completar fluxo de pagamento.
- Notificação de atendente (`CONTATO_SUPORTE`) ao pedir atendimento, Pass ou comprovante.
  - Agora `CONTATO_SUPORTE` suporta múltiplos contatos.
- Suporte para Pacotes e Planos com seleção específica (1..9).
- Comandos de serviço:
  - `menu`: retorna ao menu principal em qualquer status.
  - `limite on/off/status` (admin) para controle de limite de envios (múltiplos admins em `ADMIN_JIDS`).

### Requisitos mínimos
- Windows (para scripts `.bat` e PM2 função sem servidor). Pode funcionar em Linux com adaptações de shell.
- Node.js 20.20 instalado.
- `npm install` do projeto concluído.
- `pm2` instalado global: `npm install -g pm2`.
- Arquivo principal: `bot-simple.js` (ou renomear e ajustar scripts PM2).
- WhatsApp Web autenticado via `whatsapp-web.js` (scans do QR code e sessão salva em `.wwebjs_auth`).
- Endereços configurados em `bot-simple.js`:
  - `CONTATO_SUPORTE` (contato de suporte do bot)
  - `ADMIN_JID` (para comandos de administração)

### Estados de interação
- `menu_principal`: inicial, escolha de 1..6.
- `modalidades_horarios_valores`: submenu contendo 1-modalidades, 2-valores, 3-horários.
- `modalidades`: lista de atividades; em fluxo *first* avança para valores, caso contrário confirma modalidade.
- `valores`: permite escolher mensal, diária, planos ou pacotes.
- `horarios`: pergunta se quer ver horários (sim/não).
- `confirmacao_horarios`: confirma pra seguir ao pagamento.
- `pagamentos`: recebe dados do usuário (nome e modalidade/plano).
- `pagamentos_pix`: espera envio de comprovante em mídia.
- `pass`: passa para Wellhub/TotalPass e notifica atendente.
- `pacotes_planos`: seleção de pacotes e planos.

### Como usar (passo a passo rápido)
1. Inicie o bot com `Iniciar Bot.bat`.
2. No WhatsApp, envie `menu` para ver menu.
3. Escolha `1` (Modalidades/Horários/Valores).
4. Em cada submenu, siga a navegação por números e `0` para voltar.
5. Ao definir modalidade e opção, acesse pagamento e forneça `Nome - Modalidade`.
6. Envie comprovante em imagem para concluir.
7. Se precisar de atendimento humano, escolha `4` no menu principal.

## 6. Observações finais
- O bot tem timeout de inatividade de 2 minutos; depois retorna para modo `inativo` e, com qualquer mensagem, manda o menu novamente.
- O fluxo é resiliente: `menu` sempre reinicia o processo.
- Se quiser adaptar o bot para novos menus, edite o `switch (estado)` em `bot-simple.js`.

## 7. Valores sugeridos de implementação e manutenção
### Setup inicial (instalação + customização leve)
- R$ 1.500 a R$ 3.500: implementação em local + teste QR + validação de fluxo
- R$ 3.500 a R$ 7.500: integração com ERP/CRM, ajustes de políticas e customização de mensagens

### Retainer mensal (suporte e manutenção)
- R$ 300 a R$ 800/mês: manutenção leve, atualização de dependências, gestão de sessão e backups
- R$ 800 a R$ 1.500/mês: suporte com pequenas melhorias, monitoramento de logs e atendimento rápido
- R$ 1.500 a R$ 3.000/mês: suporte avançado 24/7, adição de recursos contínua e garantia de downtime mínima

### Sugestão para projeto local
- Projeto inicial: R$ 2.000
- Manutenção inicial: R$ 500/mês

> Dica: combine este modelo com relatório mensal de KPIs (`kpi status`) e checklist de 48h (testes de reconexão, backup e revisão de chatflow).
