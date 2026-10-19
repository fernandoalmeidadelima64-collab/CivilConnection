# Experiência mobile e acessibilidade

Este documento registra as decisões da camada responsiva do Civil Connection e
serve de referência para futuras alterações.

## 1. Estratégia

O layout desktop foi preservado (barra lateral fixa de 256 px e cabeçalho
superior). Abaixo de `1024px` entra a camada `css/mobile.css` + `js/mobile.js`:

| Elemento | Desktop (≥ 1024px) | Mobile (< 1024px) |
| --- | --- | --- |
| Navegação principal | barra lateral fixa | barra superior + gaveta + barra inferior |
| Indicador de página ativa | `aria-current="page"` na lateral | `aria-current="page"` na gaveta **e** na barra inferior |
| Conteúdo | `padding-left` de 256 px | largura total, respeitando `safe-area-inset` |
| Filtros | linha horizontal | coluna, campos com 44 px de altura |
| Cards | 2–3 colunas | 1 coluna (2 colunas entre 768 e 1279 px) |
| Formulários | 2 colunas | 1 coluna, campos com 16 px (evita zoom no iOS) |
| Modais | centralizados | painel inferior (bottom sheet) até 90 dvh, com rolagem interna |

Não há duplicação de telas: a mesma marcação é reorganizada por CSS e pelos
hooks aplicados em `js/mobile.js`.

## 2. Barra inferior e gaveta

- Barra inferior com cinco destinos: Visão geral, Obras, Agenda,
  Profissionais e Relatórios.
- A gaveta inclui os mesmos destinos, atalhos de cadastro, dados da conta e o
  botão "Sair da conta".
- Ao abrir, o foco vai para o botão de fechar; `Tab` fica preso dentro da
  gaveta; `Esc` fecha; ao fechar o foco retorna ao botão de menu; `main`,
  barra superior e barra inferior recebem `inert`.
- A gaveta fecha automaticamente ao cruzar o breakpoint de 1024 px.

## 3. Acessibilidade

- Alvos de toque mínimos de 44×44 px em botões, links de ação e navegação.
- `:focus-visible` com contorno de 3 px em todos os elementos interativos.
- Link "Pular para o conteúdo principal" aparece no primeiro `Tab`.
- Formulários: todo campo tem `<label for>`; quando o layout original não tinha
  rótulo, `js/mobile.js` associa o `label` mais próximo ou aplica `aria-label`
  em português.
- Modais: `role="dialog"`, `aria-modal="true"`, foco inicial, ciclo de foco e
  fechamento por `Esc` e clique no fundo.
- Abas da obra: `role="tablist"`/`tab`/`tabpanel`, `aria-selected`, navegação
  por setas, `Home` e `End`.
- Estados de dados: `aria-busy` nas regiões em carregamento, `role="status"`
  para vazio/sucesso e `role="alert"` para erro.
- `prefers-reduced-motion: reduce` zera animações e transições.
- Áreas seguras (`env(safe-area-inset-*)`) aplicadas em topo, base e laterais.
- Contraste: textos principais em `#131b2e` sobre `#ffffff`; textos auxiliares
  em `#44474c`; laranja de ação `#e8651b` sobre branco apenas para elementos
  grandes ou com reforço de ícone.

## 4. Formulários no celular

- Campos com `font-size: 16px` para impedir o zoom automático do iOS.
- Teclados adequados: `type="email"`, `type="tel"`, `type="url"`,
  `type="number"` e `inputmode` conforme o campo.
- O campo focado é rolado para a área visível acima do teclado virtual.
- Botões de ação ocupam a largura total e ficam ao final do formulário.
- Validações exibem mensagens em português dentro do próprio formulário
  (`role="alert"`), sem `alert()` do navegador.

## 5. Tabelas e listas

O projeto não usa `<table>` nas telas do produto; as listagens já eram cards.
Ainda assim, a camada mobile garante que qualquer tabela futura seja
apresentada como blocos empilhados por meio da classe `.cc-tabela-responsiva`.
Grids de cards são forçados a uma coluna até 767 px e a duas colunas entre 768
e 1279 px.

## 6. Arquivos e documentos

- Upload real para o bucket `documentos-obra` do Supabase Storage (limite de
  20 MB, tipos de imagem/PDF/Office validados no bucket).
- Alternativa por URL pública quando o bucket não estiver disponível.
- Visualização de imagens em lightbox acessível e download por `fetch` +
  `Blob` (com fallback de abertura em nova aba quando o servidor de origem não
  permite CORS).

## 7. Resoluções validadas

`320×568`, `360×800`, `375×812`, `390×844`, `430×932`, `768×1024`,
`1024×768` e `1440×900`. As capturas e a medição de transbordo horizontal
ficam em `tests/artifacts/` (`relatorio-medicoes.json`).
