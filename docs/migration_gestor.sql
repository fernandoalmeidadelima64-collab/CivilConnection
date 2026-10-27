-- ============================================================
-- Civil Connection — MIGRACAO SQL: PERFIL GESTOR
-- Adiciona o perfil 'gestor' ao enum tipo_usuario_enum e
-- atualiza as funcoes de autorizacao e politicas RLS no Supabase.
-- ============================================================

-- 1. ADICIONAR O VALOR 'gestor' AO ENUM tipo_usuario_enum
ALTER TYPE public.tipo_usuario_enum ADD VALUE IF NOT EXISTS 'gestor';

-- 2. ATUALIZAR FUNCAO DE PROTECAO CONTRA AUTO-ELEVACAO DE PERFIL
CREATE OR REPLACE FUNCTION public.proteger_tipo_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Um usuario pode editar seu perfil, mas nao pode se auto-promover a gestor ou administrador.
    -- Operadores autorizados (service role) e administradores/gestores existentes podem alterar papeis.
    IF (SELECT auth.uid()) = OLD.id
       AND NEW.tipo_usuario IS DISTINCT FROM OLD.tipo_usuario
       AND NOT EXISTS (
           SELECT 1 FROM public.usuarios u
           WHERE u.id = (SELECT auth.uid())
             AND u.tipo_usuario IN ('administrador'::public.tipo_usuario_enum, 'gestor'::public.tipo_usuario_enum)
       ) THEN
        RAISE EXCEPTION 'Somente um administrador ou gestor pode alterar o perfil de acesso.'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

-- 3. ATUALIZAR TRIGGER handle_new_user PARA NUNCA PERMITIR GESTOR NO CADASTRO PUBLICO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_nome TEXT;
    v_tipo TEXT;
BEGIN
    v_nome := NULLIF(trim(NEW.raw_user_meta_data ->> 'nome'), '');
    IF v_nome IS NULL THEN
        v_nome := split_part(COALESCE(NEW.email, ''), '@', 1);
    END IF;
    IF v_nome IS NULL OR v_nome = '' THEN
        v_nome := 'Usuário';
    END IF;

    -- Cadastro publico permite exclusivamente 'cliente' ou 'profissional'.
    -- Perfil de gestor ou administrador deve ser atribuido via provisionamento administrativo.
    v_tipo := NEW.raw_user_meta_data ->> 'tipo_usuario';
    IF v_tipo NOT IN ('cliente', 'profissional') OR v_tipo IS NULL THEN
        v_tipo := 'cliente';
    END IF;

    INSERT INTO public.usuarios (id, nome, email, tipo_usuario)
    VALUES (NEW.id, v_nome, NEW.email, v_tipo::public.tipo_usuario_enum)
    ON CONFLICT (id) DO UPDATE
    SET nome = EXCLUDED.nome,
        email = EXCLUDED.email,
        tipo_usuario = EXCLUDED.tipo_usuario;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 4. ATUALIZAR HELPER DE AUTORIZACAO
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = (SELECT auth.uid())
      AND u.tipo_usuario IN ('administrador'::tipo_usuario_enum, 'gestor'::tipo_usuario_enum)
) $$;

-- 5. EXEMA DE PROMOÇÃO DE UM USUÁRIO A GESTOR (EXECUTAR NO SQL EDITOR DO SUPABASE):
-- UPDATE public.usuarios SET tipo_usuario = 'gestor' WHERE email = 'seu_email_gestor@empresa.com.br';
