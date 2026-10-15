-- ============================================================
-- Civil Conection — ESQUEMA FINAL SUPABASE (idempotente e corrigido)
-- Projeto acadômico ETEC — Supabase/PostgreSQL
-- ============================================================

-- 1. TIPOS ENUM
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

-- 4. FUNÇÕES E TRIGGERS DE ATUALIZAÇÃO
CREATE OR REPLACE FUNCTION public.atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_updated ON public.usuarios;
CREATE TRIGGER trg_usuarios_updated
    BEFORE UPDATE ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();

DROP TRIGGER IF EXISTS trg_profissionais_updated ON public.profissionais;
CREATE TRIGGER trg_profissionais_updated
    BEFORE UPDATE ON public.profissionais
    FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();

DROP TRIGGER IF EXISTS trg_obras_updated ON public.obras;
CREATE TRIGGER trg_obras_updated
    BEFORE UPDATE ON public.obras
    FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();

DROP TRIGGER IF EXISTS trg_etapas_updated ON public.etapas_obra;
CREATE TRIGGER trg_etapas_updated
    BEFORE UPDATE ON public.etapas_obra
    FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();

-- 5. TRIGGER DE CRIAÇÃO AUTOMÁTICA DE PERFIL DE USUÁRIO
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

    v_tipo := NEW.raw_user_meta_data ->> 'tipo_usuario';
    IF v_tipo NOT IN ('cliente', 'profissional', 'administrador') OR v_tipo IS NULL THEN
        v_tipo := 'cliente';
    END IF;

    INSERT INTO public.usuarios (id, nome, email, tipo_usuario)
    VALUES (NEW.id, v_nome, NEW.email, v_tipo::tipo_usuario_enum)
    ON CONFLICT (id) DO UPDATE
    SET nome = EXCLUDED.nome,
        email = EXCLUDED.email,
        tipo_usuario = EXCLUDED.tipo_usuario;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas_obra ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS PARA USUÁRIOS
DROP POLICY IF EXISTS "Leitura publica de usuarios" ON public.usuarios;
CREATE POLICY "Leitura publica de usuarios" ON public.usuarios
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuarios editam proprio perfil" ON public.usuarios;
CREATE POLICY "Usuarios editam proprio perfil" ON public.usuarios
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Insercao de perfil de usuario" ON public.usuarios;
CREATE POLICY "Insercao de perfil de usuario" ON public.usuarios
    FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

-- POLÍTICAS RLS PARA PROFISSIONAIS
DROP POLICY IF EXISTS "Leitura publica de profissionais" ON public.profissionais;
CREATE POLICY "Leitura publica de profissionais" ON public.profissionais
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Inserir profissional autenticado" ON public.profissionais;
CREATE POLICY "Inserir profissional autenticado" ON public.profissionais
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Atualizar profissional proprio" ON public.profissionais;
CREATE POLICY "Atualizar profissional proprio" ON public.profissionais
    FOR UPDATE USING (auth.uid() = usuario_id);

-- POLÍTICAS RLS PARA OBRAS
DROP POLICY IF EXISTS "Leitura publica de obras" ON public.obras;
CREATE POLICY "Leitura publica de obras" ON public.obras
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Inserir obra autenticado" ON public.obras;
CREATE POLICY "Inserir obra autenticado" ON public.obras
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Atualizar obra propria" ON public.obras;
CREATE POLICY "Atualizar obra propria" ON public.obras
    FOR UPDATE USING (auth.uid() = cliente_id);

-- POLÍTICAS RLS PARA ETAPAS_OBRA
DROP POLICY IF EXISTS "Leitura publica de etapas" ON public.etapas_obra;
CREATE POLICY "Leitura publica de etapas" ON public.etapas_obra
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gerenciar etapas autenticado" ON public.etapas_obra;
CREATE POLICY "Gerenciar etapas autenticado" ON public.etapas_obra
    FOR ALL USING (auth.uid() IS NOT NULL);

-- 7. PERMISSÕES
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.usuarios TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios TO authenticated;
GRANT SELECT ON public.profissionais TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profissionais TO authenticated;
GRANT SELECT ON public.obras TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obras TO authenticated;
GRANT SELECT ON public.etapas_obra TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etapas_obra TO authenticated;
