# 🏗️ Civil Conection — Plano de Tarefas

> Plano de desenvolvimento baseado na [SPEC do projeto](./SPEC_Civil_Conection.md).
> Projeto acadêmico ETEC — Frontend (HTML/CSS/JS) + Supabase.

---

## 📊 Resumo

| Fase | Foco | Tarefas |
|---|---|---|
| 1 | Setup | 4 |
| 2 | Banco de Dados | 3 |
| 3 | Autenticação | 4 |
| 4 | Módulo Profissionais | 4 |
| 5 | Módulo Obras | 4 |
| 6 | Módulo Etapas | 3 |
| 7 | Dashboard | 2 |
| 8 | Validação & Testes | 3 |
| 9 | Entrega | 4 |
| | **Total** | **31** |

---

## Fase 1 — Setup do Projeto 🔧

- [ ] **1.1** Criar conta no [Supabase](https://supabase.com) e criar o projeto `CivilConnection`
- [ ] **1.2** Criar repositório no GitHub (`CivilConection`) e clonar para a máquina
- [ ] **1.3** Criar a estrutura de pastas conforme a SPEC:

```text
CivilConection/
├── index.html
├── pages/
├── css/
├── js/
├── assets/
└── README.md
```

- [ ] **1.4** Criar o primeiro commit com a estrutura inicial (`chore: estrutura inicial do projeto`)

---

## Fase 2 — Banco de Dados (Supabase/PostgreSQL) 🗄️

- [ ] **2.1** Executar o script SQL do esquema (`civil_conection_schema_FINAL.sql`) no **SQL Editor** do Supabase
- [ ] **2.2** Conferir no **Table Editor** se as tabelas foram criadas: `usuarios`, `profissionais`, `obras`, `etapas_obra`
- [ ] **2.3** Validar o trigger de cadastro: criar um usuário em *Authentication → Users* e confirmar que o perfil aparece automaticamente em `usuarios`

---

## Fase 3 — Conexão e Autenticação 🔐

- [ ] **3.1** Instalar o Supabase JS no projeto (via CDN ou arquivo local)
- [ ] **3.2** Criar `js/supabase.js` com a inicialização do cliente (usar apenas a **anon key** — nunca a service role key)
- [ ] **3.3** Implementar a tela de **cadastro** (`pages/cadastro.html`): nome, e-mail, senha, tipo de usuário
- [ ] **3.4** Implementar a tela de **login** (`pages/login.html`) + logout e proteção de rotas (redirecionar se não autenticado)

---

## Fase 4 — Módulo Profissionais 👷

- [ ] **4.1** Tela de **listagem de profissionais** (`pages/profissionais.html`): buscar dados reais do Supabase e exibir em cards
- [ ] **4.2** Implementar **pesquisa e filtros**: por nome, especialidade e cidade (usar `.ilike()` / `.eq()` do Supabase JS)
- [ ] **4.3** Tela de **detalhes do profissional**: descrição, cidade, avaliação e contato
- [ ] **4.4** Tela de **cadastro de profissional** (vinculado ao usuário logado) com validação: nome e especialidade obrigatórios

---

## Fase 5 — Módulo Obras 🏢

- [ ] **5.1** Tela de **listagem de obras** (`pages/obras.html`): exibir nome, cidade, status e barra de progresso
- [ ] **5.2** Implementar **pesquisa e filtros**: por nome, cidade e status
- [ ] **5.3** Tela de **detalhes da obra**: descrição, cliente responsável, status, progresso e lista de etapas
- [ ] **5.4** Tela de **cadastro de obra** com validação: nome obrigatório, cliente = usuário logado, status válido, progresso entre 0 e 100

---

## Fase 6 — Módulo Etapas da Obra 📋

- [ ] **6.1** Tela/painel de **etapas da obra**: listar etapas associadas à obra com nome, status e progresso
- [ ] **6.2** **Cadastrar etapa** vinculada a uma obra existente (validar: nome obrigatório, progresso 0–100)
- [ ] **6.3** **Atualizar progresso/status** de uma etapa e recalcular o progresso geral da obra

---

## Fase 7 — Dashboard 📈

- [ ] **7.1** Criar o dashboard com indicadores reais do Supabase (sem números fixos):
  - Total de profissionais
  - Total de obras
  - Obras em andamento
  - Obras concluídas
  - Progresso médio das obras
- [ ] **7.2** Exibir gráfico/lista de obras com barra de progresso visual

---

## Fase 8 — Validação, Segurança e Testes ✅

- [ ] **8.1** Validar todos os formulários antes de enviar ao Supabase (mensagens de erro simples em **PT-BR**)
- [ ] **8.2** Conferir se **nenhuma credencial privada** está no código (apenas anon key; nada de senhas ou service role key)
- [ ] **8.3** Testar o fluxo completo: cadastro → login → cadastrar profissional → cadastrar obra → adicionar etapas → consultar com filtros

---

## Fase 9 — Entrega 🚀

- [ ] **9.1** Revisar se toda a interface está em **Português do Brasil**
- [ ] **9.2** Escrever o **README.md**: descrição do projeto, tecnologias, como rodar, estrutura de pastas e prints das telas
- [ ] **9.3** Fazer commits organizados por fase (ex.: `feat: módulo de obras`, `fix: validação do formulário de etapas`)
- [ ] **9.4** Verificar os **critérios de conclusão** da SPEC e fazer a entrega/apresentação

---

## 📌 Checklist Final (Critérios da SPEC)

- [ ] Frontend implementado e design preservado
- [ ] Supabase conectado corretamente
- [ ] Dados armazenados no PostgreSQL do Supabase
- [ ] Profissionais cadastrados e consultáveis
- [ ] Obras cadastradas e consultáveis
- [ ] Etapas associadas às obras
- [ ] Pesquisa e filtros funcionando
- [ ] Progresso das obras visualizável
- [ ] Frontend usando dados reais (sem mocks)
- [ ] Interface 100% em PT-BR
- [ ] Projeto versionado no Git/GitHub
- [ ] Sem Java, Spring Boot ou backend próprio

---

> **Diretriz principal:** *Frontend funcional + Supabase + integração dos dados + design preservado + código simples e fácil de explicar.*
