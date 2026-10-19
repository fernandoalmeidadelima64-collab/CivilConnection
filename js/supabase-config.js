/* ==========================================================================
   Civil Connection — Configuração pública do Supabase
   ==========================================================================
   Preencha os dois campos abaixo com os dados do projeto Supabase:

   1. supabaseUrl: URL do projeto, no formato https://SEU-PROJETO.supabase.co
   2. supabaseAnonKey: chave pública "anon" ou "publishable" do projeto.

   IMPORTANTE:
   - Nunca coloque a chave "service_role" ou qualquer segredo privado neste
     arquivo. Tudo o que está aqui é público no navegador.
   - A chave anon/publishable é protegida pelas políticas de Row Level Security
     (RLS) do Supabase. Não desative o RLS para "fazer funcionar".
   - Este arquivo pode ser editado diretamente no repositório ou substituído no
     processo de deploy. Veja docs/CONFIGURACAO.md e docs/storage-documentos.sql para instruções completas.
   ========================================================================== */

window.CIVIL_CONNECTION_CONFIG = window.CIVIL_CONNECTION_CONFIG || {
    supabaseUrl: 'https://your-project.supabase.co',
    supabaseAnonKey: 'your-anon-key',
    // Bucket público do Supabase Storage usado pelos anexos das obras.
    // Crie o bucket com as políticas de docs/storage-documentos.sql.
    bucketDocumentos: 'documentos-obra'
};
