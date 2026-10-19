-- Corrige o cadastro de obras por contas autenticadas, inclusive profissionais.
-- Execute uma vez no SQL Editor do Supabase do projeto CivilConnection.
-- O usuário só pode criar obras vinculadas ao próprio UUID; o RLS permanece ativo.

ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON public.obras TO authenticated;
GRANT SELECT, INSERT ON public.profissionais TO authenticated;

DROP POLICY IF EXISTS "profissionais_select_autenticado" ON public.profissionais;
CREATE POLICY "profissionais_select_autenticado"
    ON public.profissionais
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "profissionais_insert_autenticado" ON public.profissionais;
CREATE POLICY "profissionais_insert_autenticado"
    ON public.profissionais
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = usuario_id);

DROP POLICY IF EXISTS "obras_insert_autenticado" ON public.obras;
CREATE POLICY "obras_insert_autenticado"
    ON public.obras
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = cliente_id);

DROP POLICY IF EXISTS "obras_select" ON public.obras;
CREATE POLICY "obras_select"
    ON public.obras
    FOR SELECT
    TO authenticated
    USING (private.pode_ver_obra(id));

-- Sanidade: estas políticas devem aparecer em pg_policies.
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('obras', 'profissionais')
ORDER BY policyname;
