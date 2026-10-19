-- ==========================================================================
-- Civil Connection — bucket público de anexos das obras
-- ==========================================================================
-- Execute este script no SQL Editor do Supabase para habilitar o envio de
-- arquivos pela tela de Diário/Anexos da obra.
--
-- Observações de segurança:
-- - O bucket é público apenas para LEITURA. Upload e remoção exigem usuário
--   autenticado.
-- - Não troque as políticas por "true" irrestrito: isso permitiria que
--   qualquer visitante anônimo gravasse arquivos no projeto.
-- - O caminho dos arquivos segue o padrão `<obra_id>/<timestamp>-<nome>`.
-- ==========================================================================

-- 1. Bucket -----------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'documentos-obra',
    'documentos-obra',
    true,
    20971520, -- 20 MB, mesmo limite validado em js/supabase.js
    array[
        'image/png', 'image/jpeg', 'image/webp', 'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- 2. Leitura pública (necessária para exibir fotos e abrir documentos) ------
drop policy if exists "Leitura pública dos anexos" on storage.objects;
create policy "Leitura pública dos anexos"
    on storage.objects for select
    using (bucket_id = 'documentos-obra');

-- 3. Envio apenas por usuários autenticados ---------------------------------
drop policy if exists "Envio autenticado de anexos" on storage.objects;
create policy "Envio autenticado de anexos"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'documentos-obra');

-- 4. Atualização e remoção pelo próprio autor do envio ----------------------
drop policy if exists "Atualização autenticada de anexos" on storage.objects;
create policy "Atualização autenticada de anexos"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'documentos-obra' and owner = auth.uid())
    with check (bucket_id = 'documentos-obra' and owner = auth.uid());

drop policy if exists "Remoção autenticada de anexos" on storage.objects;
create policy "Remoção autenticada de anexos"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'documentos-obra' and owner = auth.uid());
