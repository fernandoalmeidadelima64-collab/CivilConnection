/* ==========================================================================
   Civil Connection — Configuração pública do Supabase
   ==========================================================================
   Projeto: CivilConnection (ref znnctmfnubammvgipozs, sa-east-1)

   - supabaseUrl: URL pública do projeto.
   - supabaseAnonKey: chave "publishable" (pública). Ela é protegida pelas
     políticas de Row Level Security (RLS) do banco — nunca use aqui a chave
     "service_role"/secret, que ignora o RLS.
   - bucketDocumentos: bucket público de anexos (docs/storage-documentos.sql,
     aplicado no projeto em 2026-10-19).

   Veja docs/CONFIGURACAO.md para o passo a passo completo.
   ========================================================================== */

window.CIVIL_CONNECTION_CONFIG = window.CIVIL_CONNECTION_CONFIG || {
    supabaseUrl: 'https://znnctmfnubammvgipozs.supabase.co',
    supabaseAnonKey: 'sb_publishable_yZ0atX4BhKlWbvLNipY3lg_XEm4ceFd',
    // Bucket público do Supabase Storage usado pelos anexos das obras.
    bucketDocumentos: 'documentos-obra'
};
