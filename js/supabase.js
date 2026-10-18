/* ============================================================
   Civil Conection — Supabase Client & DB Service Wrapper
   Suporte unificado a Supabase JS e LocalStorage Fallback
   ============================================================ */

const DEFAULT_SUPABASE_URL = 'https://your-project.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'your-anon-key';

function getSupabaseCredentials() {
    const customUrl = localStorage.getItem('civil_supabase_url');
    const customKey = localStorage.getItem('civil_supabase_key');
    return {
        url: customUrl || DEFAULT_SUPABASE_URL,
        key: customKey || DEFAULT_SUPABASE_ANON_KEY
    };
}

let supabaseClient = null;

function initSupabase() {
    const creds = getSupabaseCredentials();
    if (window.supabase && window.supabase.createClient && creds.url && creds.key && creds.url !== DEFAULT_SUPABASE_URL) {
        try {
            supabaseClient = window.supabase.createClient(creds.url, creds.key);
            console.log('Supabase JS conectado com sucesso:', creds.url);
        } catch (e) {
            console.warn('Erro ao inicializar Supabase JS:', e);
        }
    }
}

function getLocalData(key) {
    const data = localStorage.getItem('civil_db_' + key);
    return data ? JSON.parse(data) : [];
}

function setLocalData(key, value) {
    localStorage.setItem('civil_db_' + key, JSON.stringify(value));
}

// Seed Inicial Completo para testes e funcionamento imediato
function seedInitialData() {
    if (!localStorage.getItem('civil_db_usuarios')) {
        const adminUser = {
            id: 'u-1',
            nome: 'Eng. Lucas Silva',
            email: 'lucas@civilconection.com.br',
            tipo_usuario: 'administrador',
            foto_perfil_url: '',
            criado_em: new Date().toISOString()
        };
        setLocalData('usuarios', [adminUser]);
        localStorage.setItem('civil_current_user', JSON.stringify(adminUser));
    }

    if (!localStorage.getItem('civil_db_profissionais')) {
        setLocalData('profissionais', [
            {
                id: 'p-1',
                usuario_id: 'u-1',
                nome: 'Eng. Lucas Silva',
                especialidade: 'Engenheiro Calculista',
                cidade: 'São Paulo',
                descricao: 'Especialista em estruturas de concreto armado e metálicas com mais de 10 anos de experiência.',
                avaliacao: 4.9,
                contato: '(11) 98765-4321',
                tipo_registro: 'profissional',
                cnpj_cpf: '123.456.789-00',
                email: 'lucas@civilconection.com.br',
                criado_em: new Date().toISOString()
            },
            {
                id: 'p-2',
                usuario_id: 'u-2',
                nome: 'Arq. Mariana Costa',
                especialidade: 'Arquitetura e Interiores',
                cidade: 'Campinas',
                descricao: 'Projetos residenciais modernos, sustentabilidade e maquetes 3D avançadas.',
                avaliacao: 4.8,
                contato: '(19) 99123-4567',
                tipo_registro: 'profissional',
                cnpj_cpf: '987.654.321-11',
                email: 'mariana@arquiteto.com',
                criado_em: new Date().toISOString()
            },
            {
                id: 'p-3',
                usuario_id: 'u-3',
                nome: 'Carlos Oliveira',
                especialidade: 'Mestre de Obras / Pedreiro',
                cidade: 'Santos',
                descricao: 'Execução de fundações, alvenaria estrutural e gestão de equipes de canteiro.',
                avaliacao: 5.0,
                contato: '(13) 98888-7777',
                tipo_registro: 'profissional',
                cnpj_cpf: '456.789.123-22',
                email: 'carlos@mestre.com',
                criado_em: new Date().toISOString()
            },
            {
                id: 'p-4',
                usuario_id: null,
                nome: 'Construtora & Aço Brasil',
                especialidade: 'Estruturas Metálicas e Materiais',
                cidade: 'São Paulo',
                descricao: 'Fornecedor homologado de perfis metálicos, vigas H e pilares para construção pesada.',
                avaliacao: 4.7,
                contato: '(11) 3333-4444',
                tipo_registro: 'fornecedor',
                cnpj_cpf: '12.345.678/0001-99',
                email: 'vendas@acobrasil.com.br',
                criado_em: new Date().toISOString()
            }
        ]);
    }

    if (!localStorage.getItem('civil_db_obras')) {
        const d1 = new Date();
        const d2 = new Date(); d2.setMonth(d2.getMonth() + 6);
        const d3 = new Date(); d3.setMonth(d3.getMonth() + 12);
        const dPast = new Date(); dPast.setMonth(dPast.getMonth() - 2);

        setLocalData('obras', [
            {
                id: 'o-1',
                cliente_id: 'u-1',
                nome: 'Residencial Horizon',
                descricao: 'Construção de edifício residencial de alto padrão com 12 pavimentos.',
                cidade: 'São Paulo',
                status: 'em_andamento',
                progresso: 65,
                foto_capa_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=800&q=80',
                data_inicio: dPast.toISOString().split('T')[0],
                data_previsao_fim: d2.toISOString().split('T')[0],
                responsavel_id: 'p-1',
                deleted_at: null,
                criado_em: new Date().toISOString()
            },
            {
                id: 'o-2',
                cliente_id: 'u-1',
                nome: 'Comercial Alpha Tower',
                descricao: 'Edifício de escritórios e salas comerciais com certificação LEED.',
                cidade: 'Campinas',
                status: 'em_andamento',
                progresso: 30,
                foto_capa_url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80',
                data_inicio: d1.toISOString().split('T')[0],
                data_previsao_fim: d3.toISOString().split('T')[0],
                responsavel_id: 'p-2',
                deleted_at: null,
                criado_em: new Date().toISOString()
            },
            {
                id: 'o-3',
                cliente_id: 'u-1',
                nome: 'Reforma Galpão Logístico',
                descricao: 'Ampliação de piso industrial e estrutura metálica de cobertura.',
                cidade: 'Santos',
                status: 'concluida',
                progresso: 100,
                foto_capa_url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&q=80',
                data_inicio: dPast.toISOString().split('T')[0],
                data_previsao_fim: d1.toISOString().split('T')[0],
                responsavel_id: 'p-3',
                deleted_at: null,
                criado_em: new Date().toISOString()
            }
        ]);
    }

    if (!localStorage.getItem('civil_db_etapas_obra')) {
        setLocalData('etapas_obra', [
            { id: 'e-1', obra_id: 'o-1', nome: 'Projetos e Aprovações', descricao: 'Projetos arquitetônicos e licenças', status: 'concluida', progresso: 100, deleted_at: null },
            { id: 'e-2', obra_id: 'o-1', nome: 'Fundação e Terraplenagem', descricao: 'Estacas escavadas e blocos de coroamento', status: 'concluida', progresso: 100, deleted_at: null },
            { id: 'e-3', obra_id: 'o-1', nome: 'Estrutura de Concreto', descricao: 'Pilares, vigas e lajes protendidas', status: 'em_andamento', progresso: 80, deleted_at: null },
            { id: 'e-4', obra_id: 'o-1', nome: 'Instalações Hidráulicas e Elétricas', descricao: 'Tubulação, caixas e fiação', status: 'em_andamento', progresso: 40, deleted_at: null },
            { id: 'e-5', obra_id: 'o-1', nome: 'Acabamento e Pintura', descricao: 'Pisos, revestimentos e pintura final', status: 'pendente', progresso: 0, deleted_at: null },

            { id: 'e-6', obra_id: 'o-2', nome: 'Projetos Executivos', descricao: 'Compatibilização BIM', status: 'concluida', progresso: 100, deleted_at: null },
            { id: 'e-7', obra_id: 'o-2', nome: 'Fundação Profunda', descricao: 'Estalamento de estacas hélice contínua', status: 'em_andamento', progresso: 50, deleted_at: null },
            { id: 'e-8', obra_id: 'o-2', nome: 'Superestrutura', descricao: 'Montagem de pré-moldados', status: 'pendente', progresso: 0, deleted_at: null }
        ]);
    }

    if (!localStorage.getItem('civil_db_tarefas_obra')) {
        setLocalData('tarefas_obra', [
            { id: 't-1', etapa_id: 'e-3', obra_id: 'o-1', nome: 'Concretagem da Laje do 5º Pavimento', descricao: 'Inspecionar armação e lançar concreto FCK 35MPa', responsavel_id: 'p-1', status: 'em_andamento', progresso: 80, justificativa_atraso: '', observacoes_tecnicas: 'Cura úmida rigorosa de 7 dias.', criado_em: new Date().toISOString() },
            { id: 't-2', etapa_id: 'e-4', obra_id: 'o-1', nome: 'Passagem de Prumadas de Água Fria', descricao: 'Montagem das colunas de PVC no shaft principal', responsavel_id: 'p-3', status: 'em_andamento', progresso: 40, justificativa_atraso: '', observacoes_tecnicas: 'Realizar teste estático a 6bar.', criado_em: new Date().toISOString() }
        ]);
    }

    if (!localStorage.getItem('civil_db_agendamentos')) {
        const amanha = new Date(); amanha.setDate(amanha.getDate() + 1); amanha.setHours(9, 0, 0, 0);
        const amanhaFim = new Date(amanha); amanhaFim.setHours(11, 0, 0, 0);
        const proxSemana = new Date(); proxSemana.setDate(proxSemana.getDate() + 4); proxSemana.setHours(14, 0, 0, 0);
        const proxSemanaFim = new Date(proxSemana); proxSemanaFim.setHours(16, 0, 0, 0);

        setLocalData('agendamentos', [
            {
                id: 'a-1',
                obra_id: 'o-1',
                titulo: 'Vistoria Estrutural da Laje 5',
                tipo: 'inspecao',
                inicio: amanha.toISOString(),
                fim: amanhaFim.toISOString(),
                responsavel_id: 'p-1',
                status: 'confirmado',
                observacoes: 'Verificar cobrimento das armaduras antes da concretagem.',
                criado_por: 'u-1',
                created_at: new Date().toISOString()
            },
            {
                id: 'a-2',
                obra_id: 'o-2',
                titulo: 'Reunião com Aço Brasil (Fornecedor)',
                tipo: 'reuniao',
                inicio: proxSemana.toISOString(),
                fim: proxSemanaFim.toISOString(),
                responsavel_id: 'p-2',
                status: 'agendado',
                observacoes: 'Alinhamento das datas de entrega dos perfis de aço.',
                criado_por: 'u-1',
                created_at: new Date().toISOString()
            }
        ]);
    }

    if (!localStorage.getItem('civil_db_obra_profissionais')) {
        setLocalData('obra_profissionais', [
            { id: 'op-1', obra_id: 'o-1', profissional_id: 'p-1', funcao: 'Engenheiro Responsável Técnico', responsabilidade: 'Cálculo e fiscalização da estrutura', criado_em: new Date().toISOString() },
            { id: 'op-2', obra_id: 'o-1', profissional_id: 'p-3', funcao: 'Mestre de Obras', responsabilidade: 'Gestão de canteiro e equipes', criado_em: new Date().toISOString() },
            { id: 'op-3', obra_id: 'o-2', profissional_id: 'p-2', funcao: 'Arquiteta Coordenadora', responsabilidade: 'Projetos e acabamentos', criado_em: new Date().toISOString() }
        ]);
    }

    if (!localStorage.getItem('civil_db_diario_obra')) {
        setLocalData('diario_obra', [
            {
                id: 'd-1',
                obra_id: 'o-1',
                usuario_id: 'u-1',
                data: new Date().toISOString().split('T')[0],
                clima: 'Ensolarado',
                resumo_dia: 'Trabalho de armação do 6º pavimento e passagem de prumadas de água.',
                observacoes_tecnicas: 'Ensaios de abatimento (slump test) realizados com sucesso.',
                criado_em: new Date().toISOString()
            }
        ]);
    }

    if (!localStorage.getItem('civil_db_documentos_obra')) {
        setLocalData('documentos_obra', [
            {
                id: 'doc-1',
                obra_id: 'o-1',
                diario_id: 'd-1',
                titulo: 'Fotografia Canteiro Laje 5.jpg',
                tipo: 'imagem',
                url_arquivo: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=800&q=80',
                tamanho_bytes: 1240000,
                criado_por: 'u-1',
                criado_em: new Date().toISOString()
            }
        ]);
    }

    if (!localStorage.getItem('civil_db_historico_obra')) {
        setLocalData('historico_obra', [
            {
                id: 'h-1',
                obra_id: 'o-1',
                usuario_id: 'u-1',
                tipo: 'criacao',
                descricao: 'Obra cadastrada no sistema Civil Connection.',
                criado_em: new Date().toISOString()
            }
        ]);
    }
}

seedInitialData();

// Service Wrapper do Banco de Dados
const dbService = {
    // ---- USUÁRIOS E PERFIL ----
    async getCurrentUser() {
        if (supabaseClient) {
            try {
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (user) {
                    const { data, error } = await supabaseClient.from('usuarios').select('*').eq('id', user.id).maybeSingle();
                    if (data && !error) {
                        localStorage.setItem('civil_current_user', JSON.stringify(data));
                        return data;
                    }
                    const metadataUser = {
                        id: user.id,
                        nome: (user.user_metadata && user.user_metadata.nome) || user.email.split('@')[0],
                        email: user.email,
                        tipo_usuario: (user.user_metadata && user.user_metadata.tipo_usuario) || 'cliente',
                        foto_perfil_url: (user.user_metadata && user.user_metadata.foto_perfil_url) || '',
                        criado_em: user.created_at || new Date().toISOString()
                    };
                    localStorage.setItem('civil_current_user', JSON.stringify(metadataUser));
                    return metadataUser;
                }
            } catch (err) {
                console.warn('Erro ao obter usuário Supabase Auth:', err);
            }
        }
        const session = localStorage.getItem('civil_current_user');
        return session ? JSON.parse(session) : null;
    },

    async updateUserProfile({ nome, foto_perfil_url }) {
        const user = await this.getCurrentUser();
        if (!user) throw new Error('Usuário não autenticado.');

        const updateData = {};
        if (nome !== undefined) updateData.nome = nome;
        if (foto_perfil_url !== undefined) updateData.foto_perfil_url = foto_perfil_url;

        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('usuarios').update(updateData).eq('id', user.id).select();
            if (error) console.warn('Erro ao atualizar Supabase DB:', error);
            try {
                await supabaseClient.auth.updateUser({
                    data: updateData
                });
            } catch (e) {
                console.warn('Erro ao atualizar auth metadata:', e);
            }
        }

        const usuarios = getLocalData('usuarios');
        const index = usuarios.findIndex(u => u.id === user.id);
        if (index !== -1) {
            Object.assign(usuarios[index], updateData);
            setLocalData('usuarios', usuarios);
        }

        const updatedUser = { ...user, ...updateData };
        localStorage.setItem('civil_current_user', JSON.stringify(updatedUser));
        return updatedUser;
    },

    async registerUser({ nome, email, password, tipo_usuario }) {
        if (supabaseClient) {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: { nome, tipo_usuario }
                }
            });
            if (error) {
                if (error.message && error.message.includes('already registered')) {
                    throw new Error('E-mail já cadastrado no sistema.');
                }
                throw error;
            }

            if (data && data.user) {
                const userObj = {
                    id: data.user.id,
                    nome,
                    email,
                    tipo_usuario,
                    foto_perfil_url: '',
                    criado_em: data.user.created_at || new Date().toISOString()
                };
                localStorage.setItem('civil_current_user', JSON.stringify(userObj));
            }
            return data;
        }

        const usuarios = getLocalData('usuarios');
        if (usuarios.some(u => u.email === email)) {
            throw new Error('E-mail já cadastrado no sistema.');
        }
        const newUser = {
            id: 'u-' + Date.now(),
            nome,
            email,
            tipo_usuario,
            foto_perfil_url: '',
            criado_em: new Date().toISOString()
        };
        usuarios.push(newUser);
        setLocalData('usuarios', usuarios);
        localStorage.setItem('civil_current_user', JSON.stringify(newUser));
        return { user: newUser };
    },

    async loginUser({ email, password }) {
        if (supabaseClient) {
            const { data, error } = await supabaseClient.signInWithPassword({ email, password });
            if (error) {
                if (error.message && (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials'))) {
                    throw new Error('E-mail ou senha incorretos.');
                }
                throw error;
            }

            if (data && data.user) {
                const { data: dbUser } = await supabaseClient.from('usuarios').select('*').eq('id', data.user.id).maybeSingle();
                const userObj = dbUser || {
                    id: data.user.id,
                    nome: (data.user.user_metadata && data.user.user_metadata.nome) || email.split('@')[0],
                    email: data.user.email,
                    tipo_usuario: (data.user.user_metadata && data.user.user_metadata.tipo_usuario) || 'cliente',
                    foto_perfil_url: (data.user.user_metadata && data.user.user_metadata.foto_perfil_url) || '',
                    criado_em: data.user.created_at || new Date().toISOString()
                };
                localStorage.setItem('civil_current_user', JSON.stringify(userObj));
            }
            return data;
        }

        const usuarios = getLocalData('usuarios');
        let user = usuarios.find(u => u.email === email);
        if (!user) {
            user = {
                id: 'u-' + Date.now(),
                nome: email.split('@')[0],
                email,
                tipo_usuario: 'cliente',
                foto_perfil_url: '',
                criado_em: new Date().toISOString()
            };
            usuarios.push(user);
            setLocalData('usuarios', usuarios);
        }
        localStorage.setItem('civil_current_user', JSON.stringify(user));
        return { user };
    },

    async logoutUser() {
        if (supabaseClient) {
            try {
                await supabaseClient.auth.signOut();
            } catch (e) {
                console.warn('Erro ao deslogar do Supabase:', e);
            }
        }
        localStorage.removeItem('civil_current_user');
    },

    // ---- PROFISSIONAIS E FORNECEDORES ----
    async getProfissionais({ busca = '', especialidade = '', cidade = '', tipo_registro = '' } = {}) {
        if (supabaseClient) {
            let query = supabaseClient.from('profissionais').select('*');
            if (busca) query = query.ilike('nome', `%${busca}%`);
            if (especialidade) query = query.eq('especialidade', especialidade);
            if (cidade) query = query.eq('cidade', cidade);
            if (tipo_registro) query = query.eq('tipo_registro', tipo_registro);
            const { data, error } = await query;
            if (!error && data) return data;
        }

        let lista = getLocalData('profissionais');
        if (busca) {
            const b = busca.toLowerCase();
            lista = lista.filter(p => p.nome.toLowerCase().includes(b) || p.especialidade.toLowerCase().includes(b));
        }
        if (especialidade) {
            lista = lista.filter(p => p.especialidade === especialidade);
        }
        if (cidade) {
            lista = lista.filter(p => p.cidade === cidade);
        }
        if (tipo_registro) {
            lista = lista.filter(p => (p.tipo_registro || 'profissional') === tipo_registro);
        }
        return lista;
    },

    async getProfissionalById(id) {
        if (supabaseClient) {
            const { data } = await supabaseClient.from('profissionais').select('*').eq('id', id).maybeSingle();
            if (data) return data;
        }
        const lista = getLocalData('profissionais');
        return lista.find(p => p.id === id) || null;
    },

    async saveProfissional(profData) {
        const user = await this.getCurrentUser();
        const payload = {
            usuario_id: user ? user.id : null,
            nome: profData.nome,
            especialidade: profData.especialidade,
            cidade: profData.cidade,
            descricao: profData.descricao || '',
            avaliacao: Number(profData.avaliacao) || 5.0,
            contato: profData.contato || '',
            tipo_registro: profData.tipo_registro || 'profissional',
            cnpj_cpf: profData.cnpj_cpf || '',
            email: profData.email || ''
        };

        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('profissionais').insert([payload]).select();
            if (error) throw error;
            return data[0];
        }

        const lista = getLocalData('profissionais');
        const newProf = { id: 'p-' + Date.now(), ...payload, criado_em: new Date().toISOString() };
        lista.unshift(newProf);
        setLocalData('profissionais', lista);
        return newProf;
    },

    async updateProfissional(id, updateData) {
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('profissionais').update(updateData).eq('id', id).select();
            if (error) throw error;
            return data[0];
        }
        const lista = getLocalData('profissionais');
        const idx = lista.findIndex(p => p.id === id);
        if (idx !== -1) {
            Object.assign(lista[idx], updateData);
            setLocalData('profissionais', lista);
            return lista[idx];
        }
        return null;
    },

    // ---- OBRAS ----
    async getObras({ busca = '', cidade = '', status = '', includeDeleted = false } = {}) {
        if (supabaseClient) {
            let query = supabaseClient.from('obras').select('*, usuarios(nome), profissionais(nome)');
            if (!includeDeleted) query = query.is('deleted_at', null);
            if (busca) query = query.ilike('nome', `%${busca}%`);
            if (cidade) query = query.eq('cidade', cidade);
            if (status) query = query.eq('status', status);
            const { data, error } = await query;
            if (!error && data) return data;
        }

        let lista = getLocalData('obras');
        if (!includeDeleted) {
            lista = lista.filter(o => !o.deleted_at);
        }
        if (busca) {
            const b = busca.toLowerCase();
            lista = lista.filter(o => o.nome.toLowerCase().includes(b) || (o.descricao && o.descricao.toLowerCase().includes(b)));
        }
        if (cidade) {
            lista = lista.filter(o => o.cidade === cidade);
        }
        if (status) {
            lista = lista.filter(o => o.status === status);
        }
        return lista;
    },

    async getObraById(id) {
        if (supabaseClient) {
            const { data } = await supabaseClient.from('obras').select('*, usuarios(nome), profissionais(nome)').eq('id', id).maybeSingle();
            if (data && !data.deleted_at) return data;
        }
        const lista = getLocalData('obras');
        return lista.find(o => o.id === id && !o.deleted_at) || null;
    },

    async saveObra(obraData) {
        const user = await this.getCurrentUser();
        const payload = {
            cliente_id: user ? user.id : 'u-1',
            nome: obraData.nome,
            descricao: obraData.descricao || '',
            cidade: obraData.cidade,
            status: obraData.status || 'planejamento',
            progresso: Number(obraData.progresso) || 0,
            foto_capa_url: obraData.foto_capa_url || '',
            data_inicio: obraData.data_inicio || new Date().toISOString().split('T')[0],
            data_previsao_fim: obraData.data_previsao_fim || null,
            responsavel_id: obraData.responsavel_id || null,
            deleted_at: null
        };

        let newObra;
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('obras').insert([payload]).select();
            if (error) throw error;
            newObra = data[0];
        } else {
            const lista = getLocalData('obras');
            newObra = { id: 'o-' + Date.now(), ...payload, criado_em: new Date().toISOString() };
            lista.unshift(newObra);
            setLocalData('obras', lista);
        }

        await this.addHistoricoEntry({
            obra_id: newObra.id,
            tipo: 'criacao',
            descricao: `Obra "${newObra.nome}" cadastrada com sucesso.`
        });

        return newObra;
    },

    async updateObra(obraId, updateData) {
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('obras').update(updateData).eq('id', obraId).select();
            if (error) throw error;
            return data[0];
        }

        const lista = getLocalData('obras');
        const obra = lista.find(o => o.id === obraId);
        if (obra) {
            Object.assign(obra, updateData);
            setLocalData('obras', lista);
        }

        await this.addHistoricoEntry({
            obra_id: obraId,
            tipo: 'edicao',
            descricao: 'Informações gerais da obra atualizadas.'
        });

        return obra;
    },

    // CC-01 — Exclusão Lógica Segura de Obras
    async deleteObra(obraId) {
        const user = await this.getCurrentUser();
        const obra = await this.getObraById(obraId);
        if (!obra) throw new Error('Obra não localizada.');

        const now = new Date().toISOString();

        if (supabaseClient) {
            const { error } = await supabaseClient.from('obras').update({ deleted_at: now }).eq('id', obraId);
            if (error) throw error;
        } else {
            const lista = getLocalData('obras');
            const target = lista.find(o => o.id === obraId);
            if (target) {
                target.deleted_at = now;
                setLocalData('obras', lista);
            }
        }

        await this.addHistoricoEntry({
            obra_id: obraId,
            tipo: 'exclusao',
            descricao: `Obra "${obra.nome}" foi removida do sistema por ${user ? user.nome : 'Usuário'}.`
        });

        return true;
    },

    async updateObraProgresso(obraId, novoProgresso, novoStatus) {
        const updateData = { progresso: novoProgresso };
        if (novoStatus) updateData.status = novoStatus;

        if (supabaseClient) {
            await supabaseClient.from('obras').update(updateData).eq('id', obraId);
        } else {
            const lista = getLocalData('obras');
            const obra = lista.find(o => o.id === obraId);
            if (obra) {
                Object.assign(obra, updateData);
                setLocalData('obras', lista);
            }
        }
    },

    // ---- ETAPAS DA OBRA (CC-03) ----
    async getEtapasByObra(obraId) {
        if (supabaseClient) {
            const { data } = await supabaseClient.from('etapas_obra').select('*').eq('obra_id', obraId).is('deleted_at', null);
            if (data) return data;
        }

        const lista = getLocalData('etapas_obra');
        return lista.filter(e => e.obra_id === obraId && !e.deleted_at);
    },

    async saveEtapa(etapaData) {
        const payload = {
            obra_id: etapaData.obra_id,
            nome: etapaData.nome,
            descricao: etapaData.descricao || '',
            status: etapaData.status || 'pendente',
            progresso: Number(etapaData.progresso) || 0,
            data_inicio: etapaData.data_inicio || null,
            data_previsao_fim: etapaData.data_previsao_fim || null,
            deleted_at: null
        };

        let newEtapa;
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('etapas_obra').insert([payload]).select();
            if (error) throw error;
            newEtapa = data[0];
        } else {
            const lista = getLocalData('etapas_obra');
            newEtapa = { id: 'e-' + Date.now(), ...payload, criado_em: new Date().toISOString() };
            lista.push(newEtapa);
            setLocalData('etapas_obra', lista);
        }

        await this.addHistoricoEntry({
            obra_id: etapaData.obra_id,
            tipo: 'etapa',
            descricao: `Nova etapa "${newEtapa.nome}" cadastrada.`
        });

        await this.recalcularProgressoObra(etapaData.obra_id);
        return newEtapa;
    },

    async updateEtapa(etapaId, updateData) {
        let obraId = null;
        if (supabaseClient) {
            const { data } = await supabaseClient.from('etapas_obra').update(updateData).eq('id', etapaId).select();
            if (data && data[0]) obraId = data[0].obra_id;
        } else {
            const lista = getLocalData('etapas_obra');
            const etapa = lista.find(e => e.id === etapaId);
            if (etapa) {
                Object.assign(etapa, updateData);
                setLocalData('etapas_obra', lista);
                obraId = etapa.obra_id;
            }
        }

        if (obraId) {
            await this.recalcularProgressoObra(obraId);
        }
    },

    async deleteEtapa(etapaId) {
        let obraId = null;
        const now = new Date().toISOString();
        if (supabaseClient) {
            const { data } = await supabaseClient.from('etapas_obra').update({ deleted_at: now }).eq('id', etapaId).select();
            if (data && data[0]) obraId = data[0].obra_id;
        } else {
            const lista = getLocalData('etapas_obra');
            const etapa = lista.find(e => e.id === etapaId);
            if (etapa) {
                etapa.deleted_at = now;
                setLocalData('etapas_obra', lista);
                obraId = etapa.obra_id;
            }
        }

        if (obraId) {
            await this.recalcularProgressoObra(obraId);
        }
    },

    // ---- TAREFAS DA ETAPA (CC-03) ----
    async getTarefasByObra(obraId) {
        if (supabaseClient) {
            const { data } = await supabaseClient.from('tarefas_obra').select('*, profissionais(nome)').eq('obra_id', obraId);
            if (data) return data;
        }
        const lista = getLocalData('tarefas_obra');
        const profs = getLocalData('profissionais');
        return lista.filter(t => t.obra_id === obraId).map(t => ({
            ...t,
            profissionais: profs.find(p => p.id === t.responsavel_id) || null
        }));
    },

    async saveTarefa(tarefaData) {
        const payload = {
            etapa_id: tarefaData.etapa_id,
            obra_id: tarefaData.obra_id,
            nome: tarefaData.nome,
            descricao: tarefaData.descricao || '',
            responsavel_id: tarefaData.responsavel_id || null,
            data_inicio_prevista: tarefaData.data_inicio_prevista || null,
            data_fim_prevista: tarefaData.data_fim_prevista || null,
            data_inicio_real: tarefaData.data_inicio_real || null,
            data_fim_real: tarefaData.data_fim_real || null,
            status: tarefaData.status || 'pendente',
            progresso: Number(tarefaData.progresso) || 0,
            justificativa_atraso: tarefaData.justificativa_atraso || '',
            observacoes_tecnicas: tarefaData.observacoes_tecnicas || ''
        };

        let newTarefa;
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('tarefas_obra').insert([payload]).select();
            if (error) throw error;
            newTarefa = data[0];
        } else {
            const lista = getLocalData('tarefas_obra');
            newTarefa = { id: 't-' + Date.now(), ...payload, criado_em: new Date().toISOString() };
            lista.push(newTarefa);
            setLocalData('tarefas_obra', lista);
        }

        await this.addHistoricoEntry({
            obra_id: tarefaData.obra_id,
            tipo: 'tarefa',
            descricao: `Nova atividade "${newTarefa.nome}" adicionada.`
        });

        await this.recalcularProgressoEtapaETarefas(tarefaData.etapa_id, tarefaData.obra_id);
        return newTarefa;
    },

    async updateTarefa(tarefaId, updateData) {
        let etapaId = null;
        let obraId = null;

        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('tarefas_obra').update(updateData).eq('id', tarefaId).select();
            if (data && data[0]) {
                etapaId = data[0].etapa_id;
                obraId = data[0].obra_id;
            }
        } else {
            const lista = getLocalData('tarefas_obra');
            const t = lista.find(x => x.id === tarefaId);
            if (t) {
                Object.assign(t, updateData);
                setLocalData('tarefas_obra', lista);
                etapaId = t.etapa_id;
                obraId = t.obra_id;
            }
        }

        if (etapaId && obraId) {
            await this.recalcularProgressoEtapaETarefas(etapaId, obraId);
        }
    },

    async deleteTarefa(tarefaId) {
        let etapaId = null;
        let obraId = null;
        if (supabaseClient) {
            const { data } = await supabaseClient.from('tarefas_obra').delete().eq('id', tarefaId).select();
            if (data && data[0]) {
                etapaId = data[0].etapa_id;
                obraId = data[0].obra_id;
            }
        } else {
            const lista = getLocalData('tarefas_obra');
            const idx = lista.findIndex(x => x.id === tarefaId);
            if (idx !== -1) {
                etapaId = lista[idx].etapa_id;
                obraId = lista[idx].obra_id;
                lista.splice(idx, 1);
                setLocalData('tarefas_obra', lista);
            }
        }
        if (etapaId && obraId) {
            await this.recalcularProgressoEtapaETarefas(etapaId, obraId);
        }
    },

    async recalcularProgressoEtapaETarefas(etapaId, obraId) {
        const todasTarefas = await this.getTarefasByObra(obraId);
        const tarefasEtapa = todasTarefas.filter(t => t.etapa_id === etapaId);

        if (tarefasEtapa.length > 0) {
            const somaProg = tarefasEtapa.reduce((acc, curr) => acc + (Number(curr.progresso) || 0), 0);
            const mediaEtapa = Math.round(somaProg / tarefasEtapa.length);

            let statusEtapa = 'em_andamento';
            if (mediaEtapa === 0) statusEtapa = 'pendente';
            if (mediaEtapa === 100) statusEtapa = 'concluida';

            await this.updateEtapa(etapaId, { progresso: mediaEtapa, status: statusEtapa });
        } else {
            await this.recalcularProgressoObra(obraId);
        }
    },

    async recalcularProgressoObra(obraId) {
        const etapas = await this.getEtapasByObra(obraId);
        if (!etapas || etapas.length === 0) return;

        const totalProgresso = etapas.reduce((acc, curr) => acc + (Number(curr.progresso) || 0), 0);
        const media = Math.round(totalProgresso / etapas.length);

        let status = 'em_andamento';
        if (media === 0) status = 'planejamento';
        else if (media === 100) status = 'concluida';

        await this.updateObraProgresso(obraId, media, status);
    },

    // ---- AGENDAMENTOS ONLINE (CC-04) ----
    async getAgendamentos({ obra_id = '', responsavel_id = '', status = '', busca = '' } = {}) {
        if (supabaseClient) {
            let query = supabaseClient.from('agendamentos').select('*, obras(nome), profissionais(nome)');
            if (obra_id) query = query.eq('obra_id', obra_id);
            if (responsavel_id) query = query.eq('responsavel_id', responsavel_id);
            if (status) query = query.eq('status', status);
            if (busca) query = query.ilike('titulo', `%${busca}%`);
            const { data } = await query;
            if (data) return data;
        }

        let lista = getLocalData('agendamentos');
        const obras = getLocalData('obras');
        const profs = getLocalData('profissionais');

        lista = lista.map(a => ({
            ...a,
            obras: obras.find(o => o.id === a.obra_id) || null,
            profissionais: profs.find(p => p.id === a.responsavel_id) || null
        }));

        if (obra_id) lista = lista.filter(a => a.obra_id === obra_id);
        if (responsavel_id) lista = lista.filter(a => a.responsavel_id === responsavel_id);
        if (status) lista = lista.filter(a => a.status === status);
        if (busca) {
            const b = busca.toLowerCase();
            lista = lista.filter(a => a.titulo.toLowerCase().includes(b));
        }

        return lista.sort((a, b) => new Date(a.inicio) - new Date(b.inicio));
    },

    async checkAgendamentoConflito({ inicio, fim, responsavel_id, ignoreId = null }) {
        const inicioDt = new Date(inicio);
        const fimDt = new Date(fim);

        if (fimDt <= inicioDt) {
            throw new Error('O horário de término deve ser posterior ao horário de início.');
        }

        const agendamentos = await this.getAgendamentos({ responsavel_id });
        const conflito = agendamentos.find(a => {
            if (ignoreId && a.id === ignoreId) return false;
            if (a.status === 'cancelado') return false;

            const aInicio = new Date(a.inicio);
            const aFim = new Date(a.fim);

            // Sobreposição de horários
            return (inicioDt < aFim && fimDt > aInicio);
        });

        if (conflito) {
            throw new Error(`Conflito de agenda: O profissional já possui o compromisso "${conflito.titulo}" neste mesmo horário.`);
        }
        return false;
    },

    async saveAgendamento(agendamentoData) {
        const user = await this.getCurrentUser();

        await this.checkAgendamentoConflito({
            inicio: agendamentoData.inicio,
            fim: agendamentoData.fim,
            responsavel_id: agendamentoData.responsavel_id,
            ignoreId: agendamentoData.id || null
        });

        const payload = {
            obra_id: agendamentoData.obra_id,
            titulo: agendamentoData.titulo,
            tipo: agendamentoData.tipo || 'visita_tecnica',
            inicio: agendamentoData.inicio,
            fim: agendamentoData.fim,
            responsavel_id: agendamentoData.responsavel_id || null,
            status: agendamentoData.status || 'agendado',
            observacoes: agendamentoData.observacoes || '',
            criado_por: user ? user.id : null
        };

        let newAgendamento;
        if (supabaseClient) {
            if (agendamentoData.id) {
                const { data, error } = await supabaseClient.from('agendamentos').update(payload).eq('id', agendamentoData.id).select();
                if (error) throw error;
                newAgendamento = data[0];
            } else {
                const { data, error } = await supabaseClient.from('agendamentos').insert([payload]).select();
                if (error) throw error;
                newAgendamento = data[0];
            }
        } else {
            const lista = getLocalData('agendamentos');
            if (agendamentoData.id) {
                const idx = lista.findIndex(a => a.id === agendamentoData.id);
                if (idx !== -1) {
                    Object.assign(lista[idx], payload);
                    newAgendamento = lista[idx];
                }
            } else {
                newAgendamento = { id: 'a-' + Date.now(), ...payload, created_at: new Date().toISOString() };
                lista.push(newAgendamento);
            }
            setLocalData('agendamentos', lista);
        }

        await this.addHistoricoEntry({
            obra_id: agendamentoData.obra_id,
            tipo: 'agendamento',
            descricao: `Compromisso "${newAgendamento.titulo}" agendado para ${new Date(newAgendamento.inicio).toLocaleString('pt-BR')}.`
        });

        return newAgendamento;
    },

    async updateAgendamentoStatus(id, status) {
        if (supabaseClient) {
            await supabaseClient.from('agendamentos').update({ status }).eq('id', id);
        } else {
            const lista = getLocalData('agendamentos');
            const target = lista.find(a => a.id === id);
            if (target) {
                target.status = status;
                setLocalData('agendamentos', lista);
            }
        }
    },

    // ---- ASSOCIAÇÃO OBRA & PROFISSIONAIS (CC-06) ----
    async getObraProfissionais(obraId) {
        if (supabaseClient) {
            const { data } = await supabaseClient.from('obra_profissionais').select('*, profissionais(*)').eq('obra_id', obraId);
            if (data) return data;
        }

        const lista = getLocalData('obra_profissionais');
        const profs = getLocalData('profissionais');
        return lista.filter(op => op.obra_id === obraId).map(op => ({
            ...op,
            profissionais: profs.find(p => p.id === op.profissional_id) || null
        }));
    },

    async associarProfissionalObra({ obra_id, profissional_id, funcao, responsabilidade }) {
        const payload = { obra_id, profissional_id, funcao, responsabilidade: responsabilidade || '' };
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('obra_profissionais').insert([payload]).select();
            if (error) throw error;
            return data[0];
        }

        const lista = getLocalData('obra_profissionais');
        const exists = lista.find(op => op.obra_id === obra_id && op.profissional_id === profissional_id);
        if (exists) {
            Object.assign(exists, payload);
            setLocalData('obra_profissionais', lista);
            return exists;
        }
        const newAssoc = { id: 'op-' + Date.now(), ...payload, criado_em: new Date().toISOString() };
        lista.push(newAssoc);
        setLocalData('obra_profissionais', lista);
        return newAssoc;
    },

    async desassociarProfissionalObra(id) {
        if (supabaseClient) {
            await supabaseClient.from('obra_profissionais').delete().eq('id', id);
        } else {
            const lista = getLocalData('obra_profissionais');
            const idx = lista.findIndex(op => op.id === id);
            if (idx !== -1) {
                lista.splice(idx, 1);
                setLocalData('obra_profissionais', lista);
            }
        }
    },

    // ---- DIÁRIO DE OBRA, FOTOS E DOCUMENTOS (CC-07 & CC-09) ----
    async getDiarioByObra(obraId) {
        if (supabaseClient) {
            const { data } = await supabaseClient.from('diario_obra').select('*, usuarios(nome)').eq('obra_id', obraId).order('data', { ascending: false });
            if (data) return data;
        }
        const lista = getLocalData('diario_obra');
        const usuarios = getLocalData('usuarios');
        return lista.filter(d => d.obra_id === obraId).map(d => ({
            ...d,
            usuarios: usuarios.find(u => u.id === d.usuario_id) || null
        })).sort((a, b) => new Date(b.data) - new Date(a.data));
    },

    async saveDiarioEntry(diarioData) {
        const user = await this.getCurrentUser();
        const payload = {
            obra_id: diarioData.obra_id,
            usuario_id: user ? user.id : null,
            data: diarioData.data || new Date().toISOString().split('T')[0],
            clima: diarioData.clima || 'Ensolarado',
            resumo_dia: diarioData.resumo_dia || '',
            observacoes_tecnicas: diarioData.observacoes_tecnicas || ''
        };

        let newEntry;
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('diario_obra').insert([payload]).select();
            if (error) throw error;
            newEntry = data[0];
        } else {
            const lista = getLocalData('diario_obra');
            newEntry = { id: 'd-' + Date.now(), ...payload, criado_em: new Date().toISOString() };
            lista.unshift(newEntry);
            setLocalData('diario_obra', lista);
        }

        await this.addHistoricoEntry({
            obra_id: diarioData.obra_id,
            tipo: 'diario',
            descricao: `Registro diário cadastrado para o dia ${newEntry.data}.`
        });

        return newEntry;
    },

    async getDocumentosByObra(obraId) {
        if (supabaseClient) {
            const { data } = await supabaseClient.from('documentos_obra').select('*').eq('obra_id', obraId);
            if (data) return data;
        }
        const lista = getLocalData('documentos_obra');
        return lista.filter(doc => doc.obra_id === obraId);
    },

    async saveDocumento(docData) {
        const user = await this.getCurrentUser();
        const payload = {
            obra_id: docData.obra_id,
            diario_id: docData.diario_id || null,
            titulo: docData.titulo,
            tipo: docData.tipo || 'imagem',
            url_arquivo: docData.url_arquivo,
            tamanho_bytes: docData.tamanho_bytes || 0,
            criado_por: user ? user.id : null
        };

        let newDoc;
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('documentos_obra').insert([payload]).select();
            if (error) throw error;
            newDoc = data[0];
        } else {
            const lista = getLocalData('documentos_obra');
            newDoc = { id: 'doc-' + Date.now(), ...payload, criado_em: new Date().toISOString() };
            lista.unshift(newDoc);
            setLocalData('documentos_obra', lista);
        }

        return newDoc;
    },

    // ---- HISTÓRICO E AUDITORIA (CC-08) ----
    async getHistoricoByObra(obraId) {
        if (supabaseClient) {
            const { data } = await supabaseClient.from('historico_obra').select('*, usuarios(nome)').eq('obra_id', obraId).order('criado_em', { ascending: false });
            if (data) return data;
        }

        const lista = getLocalData('historico_obra');
        const usuarios = getLocalData('usuarios');
        return lista.filter(h => h.obra_id === obraId).map(h => ({
            ...h,
            usuarios: usuarios.find(u => u.id === h.usuario_id) || null
        })).sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
    },

    async addHistoricoEntry({ obra_id, tipo, descricao, alteracoes_json = null }) {
        const user = await this.getCurrentUser();
        const payload = {
            obra_id,
            usuario_id: user ? user.id : null,
            tipo,
            descricao,
            alteracoes_json
        };

        if (supabaseClient) {
            try {
                await supabaseClient.from('historico_obra').insert([payload]);
            } catch (e) {
                console.warn('Erro ao registrar histórico Supabase:', e);
            }
        } else {
            const lista = getLocalData('historico_obra');
            lista.unshift({ id: 'h-' + Date.now(), ...payload, criado_em: new Date().toISOString() });
            setLocalData('historico_obra', lista);
        }
    },

    // ---- DASHBOARD INDICADORES REAIS (CC-05) ----
    async getDashboardMetrics() {
        const profissionais = await this.getProfissionais();
        const obras = await this.getObras({ includeDeleted: false });
        const agendamentos = await this.getAgendamentos();

        const totalProfissionais = profissionais.length;
        const totalObras = obras.length;
        const obrasEmAndamento = obras.filter(o => o.status === 'em_andamento').length;
        const obrasConcluidas = obras.filter(o => o.status === 'concluida').length;

        // Obras Atrasadas: com data_previsao_fim < hoje e status != concluida
        const hojeStr = new Date().toISOString().split('T')[0];
        const obrasAtrasadas = obras.filter(o => o.status !== 'concluida' && o.data_previsao_fim && o.data_previsao_fim < hojeStr).length;

        const somaProgresso = obras.reduce((acc, curr) => acc + (Number(curr.progresso) || 0), 0);
        const progressoMedio = totalObras > 0 ? Math.round(somaProgresso / totalObras) : 0;

        // Próximos compromissos
        const agora = new Date();
        const proximosAgendamentos = agendamentos.filter(a => new Date(a.inicio) >= agora && a.status !== 'cancelado').slice(0, 5);

        // Atividades recentes de histórico
        const historicoGeral = getLocalData('historico_obra').slice(0, 6);

        return {
            totalProfissionais,
            totalObras,
            obrasEmAndamento,
            obrasConcluidas,
            obrasAtrasadas,
            progressoMedio,
            proximosAgendamentos,
            historicoGeral,
            obrasRecentes: obras.slice(0, 5)
        };
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
});
