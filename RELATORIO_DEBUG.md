# Astoria Web — relatório de depuração

## Diagnóstico

### 1. Janela de mensagens crescia junto com o conteúdo

O `#log` tinha `flex: 1` e `overflow-y: auto`, mas o painel pai não possuía uma altura definida. Assim, o layout podia crescer em vez de limitar a área e rolar o conteúdo. O log já limitava parcialmente seu array de mensagens, mas isso não impedia o painel de aumentar visualmente.

**Correção:** área de jogo com proporção e dimensões limitadas, painel HUD com altura definida em desktop, `min-height: 0` no log, rolagem interna, quebra de linhas longas e limite de 80 mensagens. A versão mobile mantém o log em uma janela fixa abaixo dos controles.

### 2. Troca de mapa difícil de descobrir e sujeita a bloqueio

A troca dependia apenas de digitar `<`/`>` exatamente enquanto o jogador estivesse sobre a escada. Não havia botões visíveis e o personagem começa na cidade, longe da escada de descida. Também era possível ficar preso por sobrepeso: o movimento era bloqueado quando a carga chegava ao limite, mas não existia uma ação para descartar itens.

**Correção:** botões de subir/descer que habilitam apenas sobre a escada correspondente; atalhos alternativos `PageUp`/`PageDown`; botões direcionais clicáveis; ação `D` para descartar uma pilha inteira; bloqueio de escadas e fast travel sob sobrecarga com mensagem que explica como resolver.

### 3. Fronteiras de bioma deslocadas

O índice do bioma usava `floorNumber / 20` e `floorNumber % 20` diretamente. Isso fazia o primeiro bioma acabar no andar 9, e o próximo setor começar indevidamente no andar 20.

**Correção:** cálculo com `floorNumber - 1`, alinhando os intervalos do GDD: andares 1–10, 11–20, 21–30 etc., totalizando 5 setores de 20 andares e 10 biomas.

### 4. Inconsistências adicionais

- Construção de posto e descanso não avançavam o turno, ao contrário do loop por turnos descrito no GDD.
- O fast travel podia ser aberto na cidade, mas só aceitava a partida se o personagem estivesse em cama/base.
- Equipar o mesmo item repetidamente acumulava bônus de dano; descartar um item equipado não removia seu bônus; morrer mantinha os bônus apesar de perder o inventário.
- Ao chegar a zero de oxigênio, uma mensagem repetia em todos os turnos submersos.
- A paleta do bioma estava definida nos dados, mas não era usada na renderização; mapas pequenos apareciam encostados no canto do canvas.
- As mensagens eram inseridas via `innerHTML`, desnecessário para conteúdo textual de jogo.

**Correção:** ações válidas de base/descanso avançam o turno; fast travel funciona da cidade e retorna ao destino; bônus de equipamento são recalculados a partir dos slots, removidos ao descartar/perder o item e restaurados ao recuperar o Clone; aviso de oxigênio aparece apenas na transição para zero; render usa a paleta do bioma e a tonalidade de degradação; mapas pequenos são centralizados; log usa `textContent`.

## Validação realizada

- `node --check` em todos os arquivos JS e no teste automatizado.
- `npm test`: passou.
- Verificadas as 20 fronteiras de bioma, conectividade dos 101 mapas (cidade + 100 andares) e 200 transições de escada.
- Teste de estresse adicional: 300 gerações procedurais com escadas conectadas.
- Validados por teste os casos de sobrepeso/descarte, fast travel, construção, descanso, bônus de equipamento, recuperação do Clone, oxigênio e renderização do canvas/HUD.

**Limite da validação:** não foi possível fazer uma sessão interativa real pelo navegador neste ambiente porque o Chrome do ambiente bloqueou `localhost` e `file://` por política. O motor e a função de renderização foram exercitados por testes Node, mas a aparência final deve ser conferida no navegador local.

## Pendências em relação ao mapa técnico do GDD

Esta entrega corrige o protótipo existente, sem fingir que todos os sistemas planejados já estão prontos. Continuam pendentes: persistência `save.js` com IndexedDB/localStorage; armadilhas, altares e lojas; busca de segredos; shadowcasting completo; tabelas de spawn realmente reponderadas conforme a degradação; e efeitos completos de fome/sanidade. O processamento de teclas continua em `main.js` em vez de um módulo separado `input.js`.
