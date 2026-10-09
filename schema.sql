-- ============================================================
-- Civil Conection — ESQUEMA E TRIGGER DE AUTH (idempotente)
-- Projeto acadômico ETEC — Supabase/PostgreSQL
-- ============================================================

-- 1. TIPOS ENUM (criação idempotente)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_usuario_enum') THEN
        CREATE TYPE tipo_usuario_enum AS ENUM ('cliente', 'profissional', 'administrador');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_obra_enum') THEN
        CREATE TYPE status_obra_enum AS ENUM ('planejamento', 'em_andamento', 'pausada', 'concluida');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_etapa_enum') THEN
        CREATE TYPE status_etapa_enum AS ENUM ('pendente', 'em_andamento', 'concluida');
    END IF;
END $$;

-- 2. TABELAS
CREATE TABLE IF NOT EXISTS public.usuarios (
    id            UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    nome          TEXT NOT NULL CHECK (char_length(trim(nome)) > 0),
    email         TEXT NOT NULL UNIQUE CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    tipo_usuario  tipo_usuario_enum NOT NULL DEFAULT 'cliente',
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profissionais (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id    UUID REFERENCES public.usuarios (id) ON DELETE CASCADE,
    nome          TEXT NOT NULL CHECK (char_length(trim(nome)) > 0),
    especialidade TEXT NOT NULL CHECK (char_length(trim(especialidade)) > 0),
    cidade        TEXT NOT NULL,
    descricao     TEXT,
    avaliacao     NUMERIC(3, 2) DEFAULT 5.00 CHECK (avaliacao >= 0 AND avaliacao <= 5.00),
    contato       TEXT,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.obras (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id    UUID NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
    nome          TEXT NOT NULL CHECK (char_length(trim(nome)) > 0),
    descricao     TEXT,
    cidade        TEXT NOT NULL,
    status        status_obra_enum NOT NULL DEFAULT 'planejamento',
    progresso     NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (progresso >= 0 AND progresso <= 100),
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.etapas_obra (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obra_id       UUID NOT NULL REFERENCES public.obras (id) ON DELETE CASCADE,
    nome          TEXT NOT NULL CHECK (char_length(trim(nome)) > 0),
    descricao     TEXT,
    status        status_etapa_enum NOT NULL DEFAULT 'pendente',
    progresso     NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (progresso >= 0 AND progresso <= 100),
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_profissionais_especialidade ON public.profissionais (especialidade);
CREATE INDEX IF NOT EXISTS idx_profissionais_cidade ON public.profissionais (cidade);
CREATE INDEX IF NOT EXISTS idx_profissionais_nome ON public.profissionais (nome);
CREATE INDEX IF NOT EXISTS idx_obras_cliente ON public.obras (cliente_id);
CREATE INDEX IF NOT EXISTS idx_obras_status ON public.obras (status);
CREATE INDEX IF NOT EXISTS idx_obras_cidade ON public.obras (cidade);
CREATE INDEX IF NOT EXISTS idx_obras_nome ON public.obras (nome);
CREATE INDEX IF NOT EXISTS idx_etapas_obra ON public.etapas_obra (obra_id);

-- 4. FUNÇÕES E TRIGGERS DE AUTOMAÇÃO DE PERFIL
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_nome TEXT;
    v_tipo_raw TEXT;
    v_tipo_enum tipo_usuario_enum;
BEGIN
    -- 1. Normalização do Nome
    v_nome := NULLIF(trim(COALESCE(
        NEW.raw_user_meta_data ->> 'nome',
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'name'
    )), '');

    IF v_nome IS NULL THEN
        v_nome := split_part(COALESCE(NEW.email, ''), '@', 1);
    END IF;

    IF v_nome IS NULL OR v_nome = '' THEN
        v_nome := 'Usuário';
    END IF;

    -- 2. Normalização do Tipo de Usuário
    v_tipo_raw := lower(trim(COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', 'cliente')));

    IF v_tipo_raw IN ('profissional', 'engenheiro', 'arquiteto', 'empreiteiro', 'mestre_obras', 'mestre de obras') THEN
        v_tipo_enum := 'profissional'::tipo_usuario_enum;
    ELSIF v_tipo_raw IN ('administrador', 'admin', 'gestor') THEN
        v_tipo_enum := 'administrador'::tipo_usuario_enum;
    ELSE
        v_tipo_enum := 'cliente'::tipo_usuario_enum;
    END IF;

    -- 3. Inserção Segura na Tabela public.usuarios com Tratamento de Exceções
    BEGIN
        INSERT INTO public.usuarios (id, nome, email, tipo_usuario)
        VALUES (NEW.id, v_nome, NEW.email, v_tipo_enum)
        ON CONFLICT (id) DO UPDATE
        SET nome = EXCLUDED.nome,
            email = EXCLUDED.email,
            tipo_usuario = EXCLUDED.tipo_usuario,
            atualizado_em = now();
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Falha ao criar perfil em public.usuarios para ID %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$$;

-- Alias para garantir compatibilidade com nome anterior se existia
CREATE OR REPLACE FUNCTION public.criar_perfil_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.handle_new_user();
END;
$$;

-- Recriação dos Triggers de Auth (Idempotente)
DROP TRIGGER IF EXISTS trg_auth_criar_perfil ON auth.users;
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;

CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Trigger de atualização de timestamp
CREATE OR REPLACE FUNCTION public.atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_updated ON public.usuarios;
CREATE TRIGGER trg_usuarios_updated BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();

DROP TRIGGER IF EXISTS trg_profissionais_updated ON public.profissionais;
CREATE TRIGGER trg_profissionais_updated BEFORE UPDATE ON public.profissionais FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();

DROP TRIGGER IF EXISTS trg_obras_updated ON public.obras;
CREATE TRIGGER trg_obras_updated BEFORE UPDATE ON public.obras FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();

DROP TRIGGER IF EXISTS trg_etapas_updated ON public.etapas_obra;
CREATE TRIGGER trg_etapas_updated BEFORE UPDATE ON public.etapas_obra FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();

-- 5. ROW LEVEL SECURITY (RLS) E POLICIES
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas_obra ENABLE ROW LEVEL SECURITY;

-- usuarios Policies
DROP POLICY IF EXISTS "usuarios_select_policy" ON public.usuarios;
CREATE POLICY "usuarios_select_policy" ON public.usuarios FOR SELECT USING (true);

DROP POLICY IF EXISTS "usuarios_insert_policy" ON public.usuarios;
CREATE POLICY "usuarios_insert_policy" ON public.usuarios FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "usuarios_update_policy" ON public.usuarios;
CREATE POLICY "usuarios_update_policy" ON public.usuarios FOR UPDATE USING (auth.uid() = id);

-- profissionais Policies
DROP POLICY IF EXISTS "profissionais_select_policy" ON public.profissionais;
CREATE POLICY "profissionais_select_policy" ON public.profissionais FOR SELECT USING (true);

DROP POLICY IF EXISTS "profissionais_insert_policy" ON public.profissionais;
CREATE POLICY "profissionais_insert_policy" ON public.profissionais FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "profissionais_update_policy" ON public.profissionais;
CREATE POLICY "profissionais_update_policy" ON public.profissionais FOR UPDATE USING (true);

-- obras Policies
DROP POLICY IF EXISTS "obras_select_policy" ON public.obras;
CREATE POLICY "obras_select_policy" ON public.obras FOR SELECT USING (true);

DROP POLICY IF EXISTS "obras_insert_policy" ON public.obras;
CREATE POLICY "obras_insert_policy" ON public.obras FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "obras_update_policy" ON public.obras;
CREATE POLICY "obras_update_policy" ON public.obras FOR UPDATE USING (true);

-- etapas_obra Policies
DROP POLICY IF EXISTS "etapas_select_policy" ON public.etapas_obra;
CREATE POLICY "etapas_select_policy" ON public.etapas_obra FOR SELECT USING (true);

DROP POLICY IF EXISTS "etapas_insert_policy" ON public.etapas_obra;
CREATE POLICY "etapas_insert_policy" ON public.etapas_obra FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "etapas_update_policy" ON public.etapas_obra;
CREATE POLICY "etapas_update_policy" ON public.etapas_obra FOR UPDATE USING (true);

-- 6. PERMISSÕES PARA CONEXÃO ANON E AUTHENTICATED
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.usuarios TO anon, authenticated;
GRANT SELECT ON public.profissionais TO anon, authenticated;
GRANT SELECT ON public.obras TO anon, authenticated;
GRANT SELECT ON public.etapas_obra TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.usuarios TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.profissionais TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.obras TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.etapas_obra TO authenticated, anon;
