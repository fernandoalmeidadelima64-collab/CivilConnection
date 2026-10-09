/* ============================================================
   Civil Conection — Supabase Client & DB Service Wrapper
   Conexão direta do Frontend com Supabase PostgreSQL
   ============================================================ */

const DEFAULT_SUPABASE_URL = 'https://znnctmfnubammvgipozs.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_yZ0atX4BhKlWbvLNipY3lg_XEm4ceFd';

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
    if (window.supabase && window.supabase.createClient && creds.url && creds.key) {
        try {
            supabaseClient = window.supabase.createClient(creds.url, creds.key);
            console.log('Supabase JS conectado com sucesso ao projeto:', creds.url);
        } catch (e) {
            console.warn('Erro ao inicializar Supabase JS:', e);
        }
    }
}

function getLocalData(key) {
    const data = localStorage.getItem('civil_db_' + key);
    return data ? JSON.parse(data) : null;
}

function setLocalData(key, value) {
    localStorage.setItem('civil_db_' + key, JSON.stringify(value));
}

function seedInitialData() {
    if (!getLocalData('usuarios')) {
        setLocalData('usuarios', []);
    }

    if (!getLocalData('profissionais')) {
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
                criado_em: new Date().toISOString()
            }
        ]);
    }

    if (!getLocalData('obras')) {
        setLocalData('obras', [
            {
                id: 'o-1',
                cliente_id: 'u-1',
                nome: 'Residencial Horizon',
                descricao: 'Construção de edifício residencial de alto padrão com 12 pavimentos.',
                cidade: 'São Paulo',
                status: 'em_andamento',
                progresso: 65,
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
                criado_em: new Date().toISOString()
            }
        ]);
    }

    if (!getLocalData('etapas_obra')) {
        setLocalData('etapas_obra', [
            { id: 'e-1', obra_id: 'o-1', nome: 'Projetos e Aprovações', descricao: 'Projetos arquitetônicos e licenças', status: 'concluida', progresso: 100 },
            { id: 'e-2', obra_id: 'o-1', nome: 'Fundação e Terraplenagem', descricao: 'Estacas escavadas e blocos de coroamento', status: 'concluida', progresso: 100 },
            { id: 'e-3', obra_id: 'o-1', nome: 'Estrutura de Concreto', descricao: 'Pilares, vigas e lajes protendidas', status: 'em_andamento', progresso: 80 },
            { id: 'e-4', obra_id: 'o-1', nome: 'Instalações Hidráulicas e Elétricas', descricao: 'Tubulação, caixas e fiação', status: 'em_andamento', progresso: 40 },
            { id: 'e-5', obra_id: 'o-1', nome: 'Acabamento e Pintura', descricao: 'Pisos, revestimentos e pintura final', status: 'pendente', progresso: 0 },

            { id: 'e-6', obra_id: 'o-2', nome: 'Projetos Executivos', descricao: 'Compatibilização BIM', status: 'concluida', progresso: 100 },
            { id: 'e-7', obra_id: 'o-2', nome: 'Fundação Profunda', descricao: 'Estalamento de estacas hélice contínua', status: 'em_andamento', progresso: 50 },
            { id: 'e-8', obra_id: 'o-2', nome: 'Superestrutura', descricao: 'Montagem de pré-moldados', status: 'pendente', progresso: 0 },

            { id: 'e-9', obra_id: 'o-3', nome: 'Demolição e Limpeza', descricao: 'Remoção do piso antigo', status: 'concluida', progresso: 100 },
            { id: 'e-10', obra_id: 'o-3', nome: 'Piso Industrial de Alta Resistência', descricao: 'Lançamento e polimento de concreto', status: 'concluida', progresso: 100 }
        ]);
    }
}

seedInitialData();

const dbService = {
    async getCurrentUser() {
        if (supabaseClient) {
            try {
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (user) {
                    const { data } = await supabaseClient.from('usuarios').select('*').eq('id', user.id).single();
                    if (data) return data;
                    return {
                        id: user.id,
                        nome: user.user_metadata?.nome || user.user_metadata?.full_name || user.email.split('@')[0],
                        email: user.email,
                        tipo_usuario: user.user_metadata?.tipo_usuario || 'cliente'
                    };
                }
            } catch (e) {
                console.warn('Erro ao consultar usuário atual no Supabase Auth:', e);
            }
        }
        const session = localStorage.getItem('civil_current_user');
        return session ? JSON.parse(session) : null;
    },

    async registerUser({ nome, email, password, tipo_usuario }) {
        if (supabaseClient) {
            const normalizedType = (tipo_usuario || 'cliente').toLowerCase();
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        nome,
                        full_name: nome,
                        tipo_usuario: normalizedType
                    }
                }
            });
            if (error) throw error;
            return data;
        }

        const usuarios = getLocalData('usuarios') || [];
        if (usuarios.some(u => u.email === email)) {
            throw new Error('E-mail já cadastrado no sistema.');
        }
        const newUser = {
            id: 'u-' + Date.now(),
            nome,
            email,
            tipo_usuario: tipo_usuario || 'cliente',
            criado_em: new Date().toISOString()
        };
        usuarios.push(newUser);
        setLocalData('usuarios', usuarios);
        localStorage.setItem('civil_current_user', JSON.stringify(newUser));
        return { user: newUser };
    },

    async loginUser({ email, password }) {
        if (supabaseClient) {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            return data;
        }

        const usuarios = getLocalData('usuarios') || [];
        let user = usuarios.find(u => u.email === email);
        if (!user) {
            user = {
                id: 'u-' + Date.now(),
                nome: email.split('@')[0],
                email,
                tipo_usuario: 'cliente',
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
                console.warn('Erro ao encerrar sessão no Supabase:', e);
            }
        }
        localStorage.removeItem('civil_current_user');
    },

    async getProfissionais({ busca = '', especialidade = '', cidade = '' } = {}) {
        if (supabaseClient) {
            let query = supabaseClient.from('profissionais').select('*');
            if (busca) query = query.ilike('nome', `%${busca}%`);
            if (especialidade) query = query.eq('especialidade', especialidade);
            if (cidade) query = query.eq('cidade', cidade);
            const { data, error } = await query;
            if (!error && data) return data;
        }

        let lista = getLocalData('profissionais') || [];
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
        return lista;
    },

    async getProfissionalById(id) {
        if (supabaseClient) {
            const { data } = await supabaseClient.from('profissionais').select('*').eq('id', id).single();
            if (data) return data;
        }
        const lista = getLocalData('profissionais') || [];
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
            avaliacao: profData.avaliacao || 5.0,
            contato: profData.contato || ''
        };

        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('profissionais').insert([payload]).select();
            if (error) throw error;
            return data[0];
        }

        const lista = getLocalData('profissionais') || [];
        const newProf = { id: 'p-' + Date.now(), ...payload, criado_em: new Date().toISOString() };
        lista.unshift(newProf);
        setLocalData('profissionais', lista);
        return newProf;
    },

    async getObras({ busca = '', cidade = '', status = '' } = {}) {
        if (supabaseClient) {
            let query = supabaseClient.from('obras').select('*, usuarios(nome)');
            if (busca) query = query.ilike('nome', `%${busca}%`);
            if (cidade) query = query.eq('cidade', cidade);
            if (status) query = query.eq('status', status);
            const { data, error } = await query;
            if (!error && data) return data;
        }

        let lista = getLocalData('obras') || [];
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
            const { data } = await supabaseClient.from('obras').select('*, usuarios(nome)').eq('id', id).single();
            if (data) return data;
        }
        const lista = getLocalData('obras') || [];
        return lista.find(o => o.id === id) || null;
    },

    async saveObra(obraData) {
        const user = await this.getCurrentUser();
        const payload = {
            cliente_id: user ? user.id : 'u-1',
            nome: obraData.nome,
            descricao: obraData.descricao || '',
            cidade: obraData.cidade,
            status: obraData.status || 'planejamento',
            progresso: Number(obraData.progresso) || 0
        };

        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('obras').insert([payload]).select();
            if (error) throw error;
            return data[0];
        }

        const lista = getLocalData('obras') || [];
        const newObra = { id: 'o-' + Date.now(), ...payload, criado_em: new Date().toISOString() };
        lista.unshift(newObra);
        setLocalData('obras', lista);
        return newObra;
    },

    async updateObraProgresso(obraId, novoProgresso, novoStatus) {
        if (supabaseClient) {
            await supabaseClient.from('obras').update({ progresso: novoProgresso, status: novoStatus }).eq('id', obraId);
            return;
        }

        const lista = getLocalData('obras') || [];
        const obra = lista.find(o => o.id === obraId);
        if (obra) {
            obra.progresso = novoProgresso;
            if (novoStatus) obra.status = novoStatus;
            setLocalData('obras', lista);
        }
    },

    async getEtapasByObra(obraId) {
        if (supabaseClient) {
            const { data } = await supabaseClient.from('etapas_obra').select('*').eq('obra_id', obraId);
            if (data) return data;
        }

        const lista = getLocalData('etapas_obra') || [];
        return lista.filter(e => e.obra_id === obraId);
    },

    async saveEtapa(etapaData) {
        const payload = {
            obra_id: etapaData.obra_id,
            nome: etapaData.nome,
            descricao: etapaData.descricao || '',
            status: etapaData.status || 'pendente',
            progresso: Number(etapaData.progresso) || 0
        };

        let newEtapa;
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('etapas_obra').insert([payload]).select();
            if (error) throw error;
            newEtapa = data[0];
        } else {
            const lista = getLocalData('etapas_obra') || [];
            newEtapa = { id: 'e-' + Date.now(), ...payload, criado_em: new Date().toISOString() };
            lista.push(newEtapa);
            setLocalData('etapas_obra', lista);
        }

        await this.recalcularProgressoObra(etapaData.obra_id);
        return newEtapa;
    },

    async updateEtapa(etapaId, updateData) {
        let obraId = null;
        if (supabaseClient) {
            const { data } = await supabaseClient.from('etapas_obra').update(updateData).eq('id', etapaId).select();
            if (data && data[0]) obraId = data[0].obra_id;
        } else {
            const lista = getLocalData('etapas_obra') || [];
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

    async getDashboardMetrics() {
        const profissionais = await this.getProfissionais();
        const obras = await this.getObras();

        const totalProfissionais = profissionais.length;
        const totalObras = obras.length;
        const obrasEmAndamento = obras.filter(o => o.status === 'em_andamento').length;
        const obrasConcluidas = obras.filter(o => o.status === 'concluida').length;

        const somaProgresso = obras.reduce((acc, curr) => acc + (Number(curr.progresso) || 0), 0);
        const progressoMedio = totalObras > 0 ? Math.round(somaProgresso / totalObras) : 0;

        return {
            totalProfissionais,
            totalObras,
            obrasEmAndamento,
            obrasConcluidas,
            progressoMedio,
            obrasRecentes: obras.slice(0, 5)
        };
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
});
