# Civil Conection — Especificação do Sistema

## 1. Visão Geral

O **Civil Conection** é uma plataforma web acadêmica para o setor da construção civil, criada para conectar clientes, profissionais e obras.

O sistema permite:

* Cadastrar e consultar profissionais;
* Pesquisar e filtrar profissionais;
* Cadastrar e acompanhar obras;
* Organizar etapas das obras;
* Visualizar progresso e status;
* Consultar localização e contatos.

O projeto é acadêmico da **ETEC** e deve priorizar simplicidade, organização, funcionamento e facilidade de apresentação.

---

## 2. Stack Obrigatória

O projeto deve utilizar exclusivamente:

* **HTML**
* **CSS**
* **JavaScript**
* **Bibliotecas JavaScript quando necessárias**
* **Supabase**

  * PostgreSQL
  * Autenticação, quando necessária
  * Supabase JS
* **Git/GitHub** para versionamento

### Não utilizar

* Java
* Spring Boot
* Spring Web
* Spring Data JPA
* Hibernate
* Gradle
* Maven
* Backend próprio
* MySQL
* Banco de dados separado
* API REST própria em Java

A aplicação deve funcionar diretamente como uma aplicação web frontend conectada ao **Supabase**.

---

## 3. Arquitetura

```text
Usuário
   ↓
HTML + CSS + JavaScript
   ↓
Bibliotecas / Supabase JS
   ↓
Supabase
   ↓
PostgreSQL
```

O frontend será responsável pela interface e pela lógica da aplicação.

O **Supabase** será responsável pelo banco de dados e pelos recursos de backend disponibilizados pela plataforma.

Não criar um servidor ou backend separado.

---

## 4. Funcionalidades Principais

### 4.1 Usuários

Permitir:

* Cadastro;
* Login, se necessário;
* Identificação do tipo de usuário;
* Cliente;
* Profissional;
* Administrador.

Dados básicos:

* ID;
* Nome;
* E-mail;
* Tipo de usuário.

Senhas e informações sensíveis não devem ser armazenadas diretamente em tabelas comuns. Quando houver autenticação, utilizar o sistema de autenticação do Supabase.

---

### 4.2 Profissionais

Permitir:

* Cadastro;
* Listagem;
* Pesquisa;
* Filtros;
* Visualização de detalhes.

Dados:

* Nome;
* Profissão/especialidade;
* Cidade;
* Descrição;
* Avaliação;
* Informações de contato, quando apropriado.

Filtros principais:

* Especialidade;
* Cidade;
* Nome.

---

### 4.3 Obras

Permitir:

* Cadastro;
* Listagem;
* Pesquisa;
* Filtros;
* Visualização de detalhes;
* Acompanhamento do progresso.

Dados:

* Nome;
* Descrição;
* Cliente responsável;
* Cidade/localização;
* Status;
* Progresso.

Status possíveis:

* Planejamento;
* Em andamento;
* Pausada;
* Concluída.

---

### 4.4 Etapas da Obra

Cada obra poderá possuir várias etapas.

Exemplos:

* Planejamento;
* Fundação;
* Estrutura;
* Alvenaria;
* Instalações;
* Acabamento;
* Finalização.

Cada etapa deve possuir:

* ID;
* Obra relacionada;
* Nome;
* Descrição;
* Status;
* Progresso.

O progresso deve variar entre **0 e 100%**.

---

## 5. Banco de Dados

O banco será exclusivamente o **PostgreSQL do Supabase**.

Principais tabelas:

```text
usuarios
profissionais
obras
etapas_obra
```

Relacionamentos:

```text
usuarios 1 ---- 1 profissionais

usuarios 1 ---- N obras

obras 1 ---- N etapas_obra
```

### Regras

* Utilizar somente o banco do Supabase;
* Não criar outro banco;
* Não utilizar MySQL;
* Não apagar tabelas existentes sem necessidade;
* Não utilizar `DROP` ou `TRUNCATE` para inicialização;
* Preservar dados existentes;
* Evitar registros duplicados;
* Utilizar as políticas de segurança do Supabase quando necessário.

---

## 6. Comunicação com o Supabase

O JavaScript deverá utilizar o **Supabase JS** para consultar e alterar os dados.

Exemplo:

```javascript
const { data, error } = await supabase
    .from('profissionais')
    .select('*');
```

O frontend deve utilizar dados reais do Supabase sempre que a funcionalidade já estiver implementada.

Dados mockados devem ser utilizados somente para prototipação ou quando a funcionalidade ainda não estiver conectada ao banco.

---

## 7. Frontend

O frontend será desenvolvido utilizando:

```text
HTML
CSS
JavaScript
```



Principais telas:

* Página inicial;
* Login/cadastro;
* Profissionais;
* Detalhes do profissional;
* Obras;
* Detalhes da obra;
* Progresso da obra;
* Etapas;
* Cadastro de obra;
* Cadastro de profissional.

Toda a interface deve estar em **Português do Brasil**.

---

## 8. Dashboard

O dashboard poderá apresentar informações reais do Supabase, como:

* Total de profissionais;
* Total de obras;
* Obras em andamento;
* Obras concluídas;
* Progresso das obras.

Os indicadores não devem permanecer fixos quando os dados reais estiverem disponíveis.

---

## 9. Pesquisa e Filtros

### Profissionais

Pesquisar por:

* Nome;
* Especialidade;
* Cidade.

### Obras

Pesquisar por:

* Nome;
* Cidade;
* Status.

As pesquisas devem consultar os dados disponíveis no Supabase.

---

## 10. Validação

Validar os principais dados antes de enviar ao Supabase.

### Usuário

* Nome obrigatório;
* E-mail válido;
* Tipo de usuário válido.

### Profissional

* Nome obrigatório;
* Especialidade obrigatória;
* Cidade quando necessária.

### Obra

* Nome obrigatório;
* Cliente válido;
* Status válido;
* Progresso entre 0 e 100.

### Etapa

* Obra existente;
* Nome obrigatório;
* Progresso entre 0 e 100.

Erros devem ser apresentados de forma simples e em **PT-BR**.

---

## 11. Segurança

Nunca colocar no código público:

* Senhas;
* Service Role Key;
* Credenciais privadas;
* Secrets.

Utilizar somente as credenciais apropriadas para frontend e configurar corretamente as políticas do **Supabase/RLS**.

---

## 12. Organização do Projeto

Uma estrutura simples pode ser utilizada:

```text
CivilConection/
│
├── index.html
│
├── pages/
│   ├── login.html
│   ├── profissionais.html
│   ├── obras.html
│   └── ...
│
├── css/
│   ├── style.css
│   └── ...
│
├── js/
│   ├── supabase.js
│   ├── profissionais.js
│   ├── obras.js
│   └── ...
│
├── assets/
│   ├── images/
│   └── icons/
│
└── README.md
```

A estrutura pode ser adaptada ao frontend já existente, desde que permaneça simples e organizada.

---

## 13. Git/GitHub

O Git/GitHub será utilizado somente para:

* Versionamento;
* Armazenamento do código;
* Controle de alterações;
* Trabalho em equipe.

O GitHub não substitui o Supabase e não será utilizado como banco de dados.

---

## 14. MVP

### Profissionais

* Cadastro;
* Listagem;
* Pesquisa;
* Filtros;
* Especialidade;
* Cidade;
* Avaliação.

### Obras

* Cadastro;
* Listagem;
* Pesquisa;
* Filtros;
* Detalhes;
* Status;
* Progresso.

### Etapas

* Cadastro;
* Listagem;
* Status;
* Progresso;
* Associação com uma obra.

### Integração

* Frontend funcional;
* JavaScript funcional;
* Supabase conectado;
* PostgreSQL funcionando;
* Dados reais carregados;
* Git/GitHub configurado.

---

## 15. Não-Requisitos

O projeto não precisa possuir:

* Aplicativo mobile nativo;
* GPS em tempo real;
* Chat em tempo real;
* Sistema financeiro completo;
* Rede social;
* Inteligência artificial;
* Backend próprio;
* Java;
* Spring Boot;
* MySQL.

---

## 16. Critérios de Conclusão

O projeto será considerado funcional quando:

1. O frontend estiver implementado conforme o design definido.
2. O Supabase estiver conectado corretamente.
3. Os dados forem armazenados no PostgreSQL do Supabase.
4. Profissionais puderem ser cadastrados e consultados.
5. Obras puderem ser cadastradas e consultadas.
6. Etapas puderem ser associadas às obras.
7. Pesquisa e filtros funcionarem.
8. O progresso das obras puder ser visualizado.
9. O frontend utilizar dados reais do Supabase.
10. A interface estiver em PT-BR.
11. O design existente for preservado.
12. O projeto estiver versionado no Git/GitHub.
13. Não existir Java, Spring Boot ou backend próprio no projeto.

---

## 17. Diretriz Principal

O **Civil Conection** deve ser mantido como uma aplicação web simples e acadêmica.

A prioridade é:

> **Frontend funcional + Supabase + integração dos dados + design preservado + código simples e fácil de explicar.**

Não adicionar tecnologias ou camadas desnecessárias.
