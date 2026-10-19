# Configuração do Civil Connection

Este documento descreve o que precisa ser feito para colocar o site em
funcionamento em um projeto Supabase real. Nenhuma credencial é fornecida pelo
repositório: a configuração é responsabilidade de quem faz o deploy.

## 1. Chaves públicas do projeto

Edite `js/supabase-config.js` e preencha:

```js
window.CIVIL_CONNECTION_CONFIG = {
    supabaseUrl: 'https://SEU-PROJETO.supabase.co',
    supabaseAnonKey: 'SUA_CHAVE_ANON_PUBLISHABLE',
    bucketDocumentos: 'documentos-obra'
};
```

Regras aplicadas pela camada `js/supabase.js`:

- apenas `https://` é aceito (exceto `localhost` em desenvolvimento);
- chaves com `service_role`, `sb_secret_...` ou JWT com `role` diferente de
  `anon`/`authenticated` são recusadas com mensagem em português;
- quando a configuração está ausente ou inválida, nenhuma tela exibe dados de
  exemplo: o usuário é levado ao login, que explica a pendência.

## 2. Banco de dados

1. Execute `schema.sql` no SQL Editor do Supabase.
2. Em **Authentication → Providers → Email**, mantenha o e-mail habilitado.
3. Se quiser cadastro imediato, desative a confirmação de e-mail. Com a
   confirmação ativa, o cadastro exibe um aviso pedindo a validação por e-mail.
4. As políticas de Row Level Security já vêm no `schema.sql`. Não desative o
   RLS para "resolver" erros de permissão.

## 3. Supabase Storage (anexos das obras)

O envio de arquivos usa o bucket público `documentos-obra`. As instruções de
criação e as políticas estão em `docs/storage-documentos.sql`.

Enquanto o bucket não existir, a tela de anexos mostra a mensagem:

> O bucket "documentos-obra" do Supabase Storage não está disponível...

e **não** grava nenhum registro em `documentos_obra`. Também é possível
cadastrar um anexo informando apenas uma URL pública (`http`/`https`).

## 4. Publicação no GitHub Pages

O site é estático e usa caminhos relativos, portanto funciona em subdiretórios
(`https://usuario.github.io/repositorio/`). Basta publicar a branch com os
arquivos na raiz do repositório.

Os recursos antes carregados por CDN agora estão versionados localmente:

- `assets/vendor/supabase-js.min.js` (Supabase JS 2.118.0);
- `assets/fonts/inter.woff2`, `assets/fonts/sora.woff2`;
- `assets/fonts/material-symbols.woff2` (subconjunto com os 60 ícones usados);
- `css/app.css` (Tailwind compilado) e `css/mobile.css`.

## 5. Recuperação de senha

O link de recuperação usa `resetPasswordForEmail` com `redirectTo` apontando
para `index.html`. Configure essa URL em **Authentication → URL Configuration**
para evitar bloqueio de redirecionamento.
