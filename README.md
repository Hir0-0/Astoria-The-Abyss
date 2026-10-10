# Astoria: Abyssal Echoes — protótipo web

Protótipo estático em HTML, CSS e JavaScript ES Modules, com motor por turnos inspirado na arquitetura técnica do GDD.

## Executar localmente

Não abra o `index.html` por duplo clique: os módulos ES podem ser bloqueados pelo navegador em `file://`. Na pasta do projeto, execute:

```bash
python -m http.server 8000
```

Acesse `http://localhost:8000` no navegador. O projeto não precisa de build nem de dependências externas.

## Controles

- **Mover:** setas, botões direcionais na HUD ou teclado numérico (`1`–`9`, com `5` para esperar).
- **Escadas:** fique sobre `>` ou `<` e use os botões **Descer/Subir**, as teclas `<`/`>` ou `PageUp`/`PageDown`.
- **Ações:** `G` pegar/colher, `E` comer, `D` descartar uma pilha, `C` criar, `B` construir posto, `R` descansar, `T` fast travel, `I` inventário, `.` esperar e `Esc` cancelar menus.
- Em menus de criação, viagem ou descarte, selecione uma opção pelo número.

O limite de peso impede movimento, escadas e fast travel. Use `D` para abrir o menu de descarte; os itens descartados ficam no chão do andar atual.

## Correções incluídas nesta versão

- Janela de mensagens com altura limitada, rolagem interna e histórico máximo de 80 linhas.
- Botões visíveis para subir/descer mapas e controles direcionais clicáveis; atalhos alternativos para escadas.
- Distribuição de biomas alinhada aos cinco setores de 20 andares (10 andares por bioma), corrigindo o deslocamento nas fronteiras 10/20/30 etc.
- Uso da paleta de cada bioma no canvas e tonalidade alterada conforme a degradação do ecossistema.
- Descarte de pilhas para sair do estado de sobrecarga sem ficar preso no mapa.
- Fast travel disponível a partir da cidade e retorno correto ao destino; ações bem-sucedidas de construção e descanso avançam o turno.
- Equipamento não acumula bônus ao ser equipado várias vezes; descartar equipamento remove seus bônus e o Clone preserva/restaura o equipamento na recuperação.
- Mensagem de falta de oxigênio apenas na transição para oxigênio zero, evitando spam no log.
- Cidades menores centralizadas na área de jogo, HUD de fome/peso com rótulos e mensagens inseridas como texto simples.

## Testes

O projeto inclui um teste rápido sem dependências externas:

```bash
npm test
```

Ele verifica a conectividade e as escadas dos 100 andares, as transições de subida/descida, a distribuição de biomas, peso/descarte, fast travel, bases, equipamento, Clone, oxigênio e render do HUD/canvas.

## Escopo ainda não implementado do GDD

Esta é uma correção do protótipo existente, não a implementação integral de todos os sistemas descritos no mapa técnico. O salvamento persistente (`save.js` com IndexedDB/localStorage), armadilhas/altares/lojas, busca de segredos e shadowcasting completo continuam pendentes. A leitura de teclado permanece integrada em `main.js`, em vez de separada em `input.js`.
