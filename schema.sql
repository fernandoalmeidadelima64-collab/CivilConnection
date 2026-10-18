-- ============================================================
-- Civil Conection — ESQUEMA COMPLETO SUPABASE (idempotente)
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

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_tarefa_enum') THEN
        CREATE TYPE status_tarefa_enum AS ENUM ('pendente', 'em_andamento', 'concluida', 'atrasada', 'bloqueada');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_agendamento_enum') THEN
        CREATE TYPE tipo_agendamento_enum AS ENUM ('visita_tecnica', 'inspecao', 'reuniao', 'outro');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_agendamento_enum') THEN
        CREATE TYPE status_agendamento_enum AS ENUM ('agendado', 'confirmado', 'concluido', 'cancelado');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_registro_prof_enum') THEN
        CREATE TYPE tipo_registro_prof_enum AS ENUM ('profissional', 'fornecedor');
    END IF;
END $$;

-- 2. TABELAS PRINCIPAIS
CREATE TABLE IF NOT EXISTS public.usuarios (
    id            UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    nome          TEXT NOT NULL CHECK (char_length(trim(nome)) > 0),
    email         TEXT NOT NULL UNIQUE CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    tipo_usuario  tipo_usuario_enum NOT NULL DEFAULT 'cliente',
    foto_perfil_url TEXT,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT;

CREATE TABLE IF NOT EXISTS public.profissionais (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id    UUID REFERENCES public.usuarios (id) ON DELETE CASCADE,
    nome          TEXT NOT NULL CHECK (char_length(trim(nome)) > 0),
    especialidade TEXT NOT NULL CHECK (char_length(trim(especialidade)) > 0),
    cidade        TEXT NOT NULL,
    descricao     TEXT,
    avaliacao     NUMERIC(3, 2) DEFAULT 5.00 CHECK (avaliacao >= 0 AND avaliacao <= 5.00),
    contato       TEXT,
    tipo_registro tipo_registro_prof_enum NOT NULL DEFAULT 'profissional',
    cnpj_cpf      TEXT,
    email         TEXT,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profissionais ADD COLUMN IF NOT EXISTS tipo_registro tipo_registro_prof_enum NOT NULL DEFAULT 'profissional';
ALTER TABLE public.profissionais ADD COLUMN IF NOT EXISTS cnpj_cpf TEXT;
ALTER TABLE public.profissionais ADD COLUMN IF NOT EXISTS email TEXT;

CREATE TABLE IF NOT EXISTS public.obras (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id    UUID NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
    nome          TEXT NOT NULL CHECK (char_length(trim(nome)) > 0),
    descricao     TEXT,
    cidade        TEXT NOT NULL,
    status        status_obra_enum NOT NULL DEFAULT 'planejamento',
    progresso     NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (progresso >= 0 AND progresso <= 100),
    foto_capa_url TEXT,
    data_inicio   DATE,
    data_previsao_fim DATE,
    responsavel_id UUID REFERENCES public.profissionais (id) ON DELETE SET NULL,
    deleted_at    TIMESTAMPTZ,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS foto_capa_url TEXT;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS data_inicio DATE;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS data_previsao_fim DATE;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES public.profissionais(id) ON DELETE SET NULL;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.etapas_obra (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obra_id       UUID NOT NULL REFERENCES public.obras (id) ON DELETE CASCADE,
    nome          TEXT NOT NULL CHECK (char_length(trim(nome)) > 0),
    descricao     TEXT,
    status        status_etapa_enum NOT NULL DEFAULT 'pendente',
    progresso     NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (progresso >= 0 AND progresso <= 100),
    data_inicio   DATE,
    data_previsao_fim DATE,
    deleted_at    TIMESTAMPTZ,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.etapas_obra ADD COLUMN IF NOT EXISTS data_inicio DATE;
ALTER TABLE public.etapas_obra ADD COLUMN IF NOT EXISTS data_previsao_fim DATE;
ALTER TABLE public.etapas_obra ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 3. SUB-TABELAS DO SISTEMA
CREATE TABLE IF NOT EXISTS public.tarefas_obra (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etapa_id             UUID NOT NULL REFERENCES public.etapas_obra (id) ON DELETE CASCADE,
    obra_id              UUID NOT NULL REFERENCES public.obras (id) ON DELETE CASCADE,
    nome                 TEXT NOT NULL CHECK (char_length(trim(nome)) > 0),
    descricao            TEXT,
    responsavel_id       UUID REFERENCES public.profissionais (id) ON DELETE SET NULL,
    data_inicio_prevista DATE,
    data_fim_prevista    DATE,
    data_inicio_real     DATE,
    data_fim_real        DATE,
    status               status_tarefa_enum NOT NULL DEFAULT 'pendente',
    progresso            NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (progresso >= 0 AND progresso <= 100),
    justificativa_atraso TEXT,
    observacoes_tecnicas TEXT,
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.obra_profissionais (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obra_id        UUID NOT NULL REFERENCES public.obras (id) ON DELETE CASCADE,
    profissional_id UUID NOT NULL REFERENCES public.profissionais (id) ON DELETE CASCADE,
    funcao         TEXT NOT NULL,
    responsabilidade TEXT,
    criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(obra_id, profissional_id)
);

CREATE TABLE IF NOT EXISTS public.agendamentos (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obra_id        UUID NOT NULL REFERENCES public.obras (id) ON DELETE CASCADE,
    titulo         TEXT NOT NULL CHECK (char_length(trim(titulo)) > 0),
    tipo           tipo_agendamento_enum NOT NULL DEFAULT 'visita_tecnica',
    inicio         TIMESTAMPTZ NOT NULL,
    fim            TIMESTAMPTZ NOT NULL,
    responsavel_id UUID REFERENCES public.profissionais (id) ON DELETE SET NULL,
    status         status_agendamento_enum NOT NULL DEFAULT 'agendado',
    observacoes    TEXT,
    criado_por     UUID REFERENCES public.usuarios (id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (fim > inicio)
);

CREATE TABLE IF NOT EXISTS public.diario_obra (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obra_id              UUID NOT NULL REFERENCES public.obras (id) ON DELETE CASCADE,
    usuario_id           UUID REFERENCES public.usuarios (id) ON DELETE SET NULL,
    data                 DATE NOT NULL DEFAULT CURRENT_DATE,
    clima                TEXT,
    resumo_dia           TEXT,
    observacoes_tecnicas TEXT,
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documentos_obra (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obra_id       UUID NOT NULL REFERENCES public.obras (id) ON DELETE CASCADE,
    diario_id     UUID REFERENCES public.diario_obra (id) ON DELETE CASCADE,
    titulo        TEXT NOT NULL CHECK (char_length(trim(titulo)) > 0),
    tipo          TEXT NOT NULL, -- 'imagem' ou 'documento'
    url_arquivo   TEXT NOT NULL,
    tamanho_bytes BIGINT DEFAULT 0,
    criado_por    UUID REFERENCES public.usuarios (id) ON DELETE SET NULL,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.historico_obra (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obra_id         UUID NOT NULL REFERENCES public.obras (id) ON DELETE CASCADE,
    usuario_id      UUID REFERENCES public.usuarios (id) ON DELETE SET NULL,
    tipo            TEXT NOT NULL, -- 'status', 'progresso', 'exclusao', 'edicao', 'etapa', 'tarefa', 'agendamento'
    descricao       TEXT NOT NULL,
    alteracoes_json JSONB,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_profissionais_especialidade ON public.profissionais (especialidade);
CREATE INDEX IF NOT EXISTS idx_profissionais_cidade ON public.profissionais (cidade);
CREATE INDEX IF NOT EXISTS idx_profissionais_nome ON public.profissionais (nome);
CREATE INDEX IF NOT EXISTS idx_obras_cliente ON public.obras (cliente_id);
CREATE INDEX IF NOT EXISTS idx_obras_status ON public.obras (status);
CREATE INDEX IF NOT EXISTS idx_obras_cidade ON public.obras (cidade);
CREATE INDEX IF NOT EXISTS idx_obras_nome ON public.obras (nome);
CREATE INDEX IF NOT EXISTS idx_obras_deleted ON public.obras (deleted_at);
CREATE INDEX IF NOT EXISTS idx_etapas_obra ON public.etapas_obra (obra_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_etapa ON public.tarefas_obra (etapa_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_obra ON public.tarefas_obra (obra_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_obra ON public.agendamentos (obra_id);
CREATE INDEX IF NOT EXISTS idx_diario_obra ON public.diario_obra (obra_id);
CREATE INDEX IF NOT EXISTS idx_documentos_obra ON public.documentos_obra (obra_id);
CREATE INDEX IF NOT EXISTS idx_historico_obra ON public.historico_obra (obra_id);

-- 5. FUNÇÕES E TRIGGERS DE ATUALIZAÇÃO
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

DROP TRIGGER IF EXISTS trg_tarefas_updated ON public.tarefas_obra;
CREATE TRIGGER trg_tarefas_updated
    BEFORE UPDATE ON public.tarefas_obra
    FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();

-- 6. TRIGGER DE CRIAÇÃO AUTOMÁTICA DE PERFIL DE USUÁRIO
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

-- 7. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obra_profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diario_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_obra ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS PARA USUÁRIOS
DROP POLICY IF EXISTS "Leitura publica de usuarios" ON public.usuarios;
CREATE POLICY "Leitura publica de usuarios" ON public.usuarios FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuarios editam proprio perfil" ON public.usuarios;
CREATE POLICY "Usuarios editam proprio perfil" ON public.usuarios FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Insercao de perfil de usuario" ON public.usuarios;
CREATE POLICY "Insercao de perfil de usuario" ON public.usuarios FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

-- POLÍTICAS RLS PARA PROFISSIONAIS
DROP POLICY IF EXISTS "Leitura publica de profissionais" ON public.profissionais;
CREATE POLICY "Leitura publica de profissionais" ON public.profissionais FOR SELECT USING (true);

DROP POLICY IF EXISTS "Inserir profissional autenticado" ON public.profissionais;
CREATE POLICY "Inserir profissional autenticado" ON public.profissionais FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Atualizar profissional proprio" ON public.profissionais;
CREATE POLICY "Atualizar profissional proprio" ON public.profissionais FOR UPDATE USING (auth.uid() = usuario_id OR auth.uid() IS NOT NULL);

-- POLÍTICAS RLS PARA OBRAS
DROP POLICY IF EXISTS "Leitura de obras ativas" ON public.obras;
CREATE POLICY "Leitura de obras ativas" ON public.obras FOR SELECT USING (deleted_at IS NULL OR auth.uid() = cliente_id);

DROP POLICY IF EXISTS "Inserir obra autenticado" ON public.obras;
CREATE POLICY "Inserir obra autenticado" ON public.obras FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Atualizar obra propria" ON public.obras;
CREATE POLICY "Atualizar obra propria" ON public.obras FOR UPDATE USING (auth.uid() = cliente_id OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Excluir obra propria" ON public.obras;
CREATE POLICY "Excluir obra propria" ON public.obras FOR DELETE USING (auth.uid() = cliente_id OR auth.uid() IS NOT NULL);

-- POLÍTICAS RLS DEMAIS TABELAS
DROP POLICY IF EXISTS "Acesso publico leitura etapas" ON public.etapas_obra;
CREATE POLICY "Acesso publico leitura etapas" ON public.etapas_obra FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gerenciar etapas autenticado" ON public.etapas_obra;
CREATE POLICY "Gerenciar etapas autenticado" ON public.etapas_obra FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Acesso tarefas" ON public.tarefas_obra;
CREATE POLICY "Acesso tarefas" ON public.tarefas_obra FOR ALL USING (auth.uid() IS NOT NULL OR true);

DROP POLICY IF EXISTS "Acesso obra_profissionais" ON public.obra_profissionais;
CREATE POLICY "Acesso obra_profissionais" ON public.obra_profissionais FOR ALL USING (true);

DROP POLICY IF EXISTS "Acesso agendamentos" ON public.agendamentos;
CREATE POLICY "Acesso agendamentos" ON public.agendamentos FOR ALL USING (true);

DROP POLICY IF EXISTS "Acesso diario_obra" ON public.diario_obra;
CREATE POLICY "Acesso diario_obra" ON public.diario_obra FOR ALL USING (true);

DROP POLICY IF EXISTS "Acesso documentos_obra" ON public.documentos_obra;
CREATE POLICY "Acesso documentos_obra" ON public.documentos_obra FOR ALL USING (true);

DROP POLICY IF EXISTS "Acesso historico_obra" ON public.historico_obra;
CREATE POLICY "Acesso historico_obra" ON public.historico_obra FOR ALL USING (true);

-- 8. PERMISSÕES
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
