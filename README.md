# Civil Connection

Plataforma web de gestão de obras civis: acompanhamento de canteiros, etapas,
atividades, equipe técnica, agenda, diário de obra, documentos, relatórios e
histórico de auditoria.

- **Stack:** HTML estático + Tailwind compilado + JavaScript puro (ES2020) +
  Supabase (Auth, PostgREST e Storage).
- **Publicação:** GitHub Pages, com caminhos relativos (funciona em subpasta).
- **Idioma da interface:** português do Brasil.

## Como rodar localmente

```bash
python3 -m http.server 8000 --bind 0.0.0.0
# abra http://localhost:8000
```

Não há etapa de build: o CSS já está compilado em `css/app.css` e as
dependências estão versionadas em `assets/vendor/` e `assets/fonts/`.

## Configuração

1. Preencha `js/supabase-config.js` com a URL do projeto e a chave **anon /
   publishable** (nunca a `service_role`).
2. Execute `schema.sql` no SQL Editor do Supabase.
3. Para anexos, execute `docs/storage-documentos.sql` (cria o bucket público
   `documentos-obra` com upload restrito a usuários autenticados).

O cadastro público só permite perfis de cliente ou profissional. Contas de
administrador devem ser atribuídas por um operador confiável no Supabase; a
função de criação de perfil também valida isso no banco. Acesso SQL anônimo é
revogado para evitar exposição de dados de contato do diretório profissional.

Detalhes em [`docs/CONFIGURACAO.md`](docs/CONFIGURACAO.md).

Sem configuração válida o site **não** exibe dados de exemplo: ele leva o
usuário ao login e explica a pendência.

## Estrutura

```
index.html                 visão geral (dashboard)
pages/                     obras, detalhes da obra, agenda, profissionais,
                           cadastro de obra, cadastro de profissional,
                           relatórios e login
css/app.css                Tailwind compilado + fontes locais
css/mobile.css             camada responsiva/mobile e acessibilidade
js/supabase-config.js      configuração pública do Supabase
js/supabase.js             cliente e camada de dados (dbService)
js/ui.js                   utilitários de interface (ccUI)
js/auth.js                 autenticação, perfil e foto
js/mobile.js               navegação mobile e melhorias de acessibilidade
js/header.js               busca global do cabeçalho
js/dashboard.js            indicadores e listas da visão geral
js/obras.js                listagem, cadastro, edição e exclusão lógica
js/etapas.js               etapas, tarefas, diário, documentos, equipe, histórico
js/agenda.js               compromissos, status e conflito de agenda
js/profissionais.js        profissionais e fornecedores
js/relatorios.js           consolidação e exportação CSV/PDF
assets/vendor/             supabase-js 2.118.0 (licença incluída)
assets/fonts/              Inter, Sora e subconjunto do Material Symbols
docs/                      configuração e políticas do Storage
tests/                     simulador do Supabase, testes de interface e capturas
```

## Testes

```bash
# 1. sirva o site em http://127.0.0.1:8000
# 2. instale as dependências de teste
npm install @playwright/test@1.64.1

# 3. rode a suíte (injeta tests/fake-supabase.js, sem tocar em dados reais)
npx playwright test --config tests/interface/playwright.config.js
```

Os testes cobrem autenticação, navegação mobile, alvos de toque, acessibilidade,
todos os módulos, integridade dos dados e exportação de relatórios. Nenhum
projeto Supabase real é acessado.

Capturas de tela nas oito resoluções de validação:

```bash
node tests/capturas.js   # grava em tests/artifacts/
```

## Documentação complementar

- [`docs/CONFIGURACAO.md`](docs/CONFIGURACAO.md) — configuração do projeto,
  publicação e recuperação de senha.
- [`docs/EXPERIENCIA-MOBILE.md`](docs/EXPERIENCIA-MOBILE.md) — decisões de
  responsividade, navegação e acessibilidade.
- [`SPECS/SPEC_Civil_Conection.md`](SPECS/SPEC_Civil_Conection.md) — spec
  original do produto.
