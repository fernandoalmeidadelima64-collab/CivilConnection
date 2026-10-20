/* ==========================================================================
   Civil Connection — Cliente Supabase e camada de acesso a dados
   ==========================================================================
   Regras importantes desta camada:
   - Todo dado de negócio vem exclusivamente do Supabase configurado.
   - Não existe seed, demonstração ou fallback para localStorage.
   - Falhas de consulta/escrita são propagadas como ErroIntegracao, para que a
     interface diferencie "banco vazio" de "erro de conexão/permissão".
   - A chave usada deve ser sempre a anon/publishable. Chaves de service role
     são recusadas explicitamente.
   ========================================================================== */

const CONFIG_GLOBAL = (typeof window !== 'undefined' && window.CIVIL_CONNECTION_CONFIG) || {};

const PLACEHOLDER_URL = 'https://your-project.supabase.co';
const PLACEHOLDER_KEY = 'your-anon-key';
const BUCKET_DOCUMENTOS = String(CONFIG_GLOBAL.bucketDocumentos || 'documentos-obra').trim();
const LIMITE_ANEXO_BYTES = 20 * 1024 * 1024;

let supabaseClient = null;
let _inicializacaoTentada = false;
let _erroInicializacao = null;
let _configuracaoAtual = { configurado: false, erro: null, url: '', chave: '' };
let _usuarioAtual = null;
let _usuarioCarregado = false;
let _usuarioPromessa = null;

class ErroIntegracao extends Error {
    constructor(mensagem, detalhes) {
        super(mensagem);
        this.name = 'ErroIntegracao';
        this.tipo = 'integracao';
        this.codigo = detalhes && detalhes.codigo ? detalhes.codigo : null;
        this.detalhe = detalhes && detalhes.detalhe ? detalhes.detalhe : null;
        this.operacao = detalhes && detalhes.operacao ? detalhes.operacao : null;
    }
}

function obterConfiguracaoSupabase() {
    const urlGlobal = CONFIG_GLOBAL.supabaseUrl || CONFIG_GLOBAL.url || '';
    const chaveGlobal = CONFIG_GLOBAL.supabaseAnonKey || CONFIG_GLOBAL.anonKey || CONFIG_GLOBAL.supabaseKey || '';

    let url = String(urlGlobal || '').trim();
    let chave = String(chaveGlobal || '').trim();

    // Compatibilidade com o mecanismo antigo de configuração local. Serve
    // apenas para desenvolvimento; em produção prefira js/supabase-config.js.
    if (!url) {
        try {
            url = String(localStorage.getItem('civil_supabase_url') || '').trim();
        } catch (erro) {
            url = '';
        }
    }
    if (!chave) {
        try {
            chave = String(localStorage.getItem('civil_supabase_key') || '').trim();
        } catch (erro) {
            chave = '';
        }
    }

    if (!url || !chave || url === PLACEHOLDER_URL || chave === PLACEHOLDER_KEY) {
        return {
            configurado: false,
            erro: 'A conexão com o Supabase ainda não foi configurada. Preencha a URL do projeto e a chave anon (publishable) em js/supabase-config.js.',
            url: ''
        };
    }

    let parsed;
    try {
        parsed = new URL(url);
    } catch (erro) {
        return { configurado: false, erro: 'A URL do Supabase informada é inválida. Revise js/supabase-config.js.', url: '' };
    }

    const hostLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && hostLocal)) {
        return { configurado: false, erro: 'A URL do Supabase deve usar HTTPS (exceto em desenvolvimento local).', url: '' };
    }

    if (/service[_-]?role|sb_secret_/i.test(chave)) {
        return {
            configurado: false,
            erro: 'A chave informada parece ser uma chave privada (service role). Use somente a chave anon/publishable no frontend.',
            url: ''
        };
    }

    // Chaves JWT antigas carregam a role no payload. Recusamos service_role
    // mesmo que o nome da variável não deixe isso explícito.
    const partes = chave.split('.');
    if (partes.length === 3) {
        try {
            const payload = JSON.parse(atob(partes[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (payload && payload.role && String(payload.role) !== 'anon' && String(payload.role) !== 'authenticated') {
                return {
                    configurado: false,
                    erro: 'A chave configurada não é uma chave pública (anon/publishable) do Supabase.',
                    url: ''
                };
            }
        } catch (erro) {
            // Se não for possível ler o payload, seguimos: a chave será
            // validada pelo próprio Supabase na primeira requisição.
        }
    }

    return { configurado: true, erro: null, url: parsed.origin, chave };
}

/**
 * Remove resíduos das versões anteriores, que gravavam dados de demonstração e
 * uma sessão falsa no localStorage. Nada de negócio é lido dessas chaves.
 */
function limparDadosLegados() {
    try {
        const remover = [];
        for (let i = 0; i < localStorage.length; i += 1) {
            const chave = localStorage.key(i);
            if (chave && (chave === 'civil_current_user' || chave.indexOf('civil_db_') === 0)) {
                remover.push(chave);
            }
        }
        remover.forEach((chave) => localStorage.removeItem(chave));
    } catch (erro) {
        console.warn('Não foi possível limpar os dados locais legados.', erro);
    }
}

function initSupabase() {
    if (_inicializacaoTentada) return supabaseClient;
    _inicializacaoTentada = true;

    _configuracaoAtual = obterConfiguracaoSupabase();
    limparDadosLegados();

    if (!_configuracaoAtual.configurado) {
        _erroInicializacao = _configuracaoAtual.erro;
        return null;
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        _erroInicializacao = 'A biblioteca do Supabase não foi carregada. Verifique se assets/vendor/supabase-js.min.js está disponível e recarregue a página.';
        return null;
    }

    try {
        supabaseClient = window.supabase.createClient(_configuracaoAtual.url, _configuracaoAtual.chave, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });

        if (supabaseClient && supabaseClient.auth && typeof supabaseClient.auth.onAuthStateChange === 'function') {
            supabaseClient.auth.onAuthStateChange((evento) => {
                if (evento === 'SIGNED_OUT' || evento === 'SIGNED_IN' || evento === 'USER_UPDATED') {
                    invalidarUsuarioAtual();
                }
            });
        }
        return supabaseClient;
    } catch (erro) {
        _erroInicializacao = 'Não foi possível inicializar o cliente Supabase. Confira a URL e a chave pública configuradas.';
        console.error('Falha ao inicializar o Supabase:', erro);
        return null;
    }
}

function invalidarUsuarioAtual() {
    _usuarioAtual = null;
    _usuarioCarregado = false;
    _usuarioPromessa = null;
}

function clientSupabase() {
    if (supabaseClient) return supabaseClient;
    if (!_inicializacaoTentada) initSupabase();
    if (supabaseClient) return supabaseClient;
    const config = _configuracaoAtual.configurado ? null : obterConfiguracaoSupabase();
    throw new ErroIntegracao(
        _erroInicializacao || (config && config.erro) || 'A conexão com o Supabase não está disponível.',
        { operacao: 'conectar ao banco de dados' }
    );
}

function detalheTecnico(erro) {
    if (!erro) return '';
    return [erro.code, erro.status, erro.message, erro.details, erro.hint].filter(Boolean).join(' | ');
}

function traduzirErroSupabase(erro, operacao, contexto) {
    const mensagemOriginal = String((erro && erro.message) || '');
    const codigo = erro && erro.code;

    let mensagem = 'Não foi possível ' + (operacao || 'concluir a operação') + '. Tente novamente.';

    if (codigo === 'PGRST301' || (erro && erro.status === 401) || /jwt expired|invalid jwt/i.test(mensagemOriginal)) {
        mensagem = 'Sua sessão expirou. Entre novamente para continuar.';
    } else if (codigo === '42501' || /row-level security|permission denied/i.test(mensagemOriginal)) {
        mensagem = 'Você não tem permissão para ' + (operacao || 'acessar este registro') + '. Verifique as políticas de acesso do Supabase.';
    } else if (codigo === '23505') {
        mensagem = 'Já existe um registro com estes dados. Revise as informações e tente novamente.';
    } else if (codigo === '23503') {
        mensagem = 'O registro relacionado não existe mais. Atualize a página e tente novamente.';
    } else if (codigo === '23514') {
        mensagem = 'Os dados informados não atendem às regras do banco. Revise os campos e tente novamente.';
    } else if (codigo === 'PGRST116') {
        mensagem = 'O registro solicitado não foi encontrado.';
    } else if (/failed to fetch|networkerror|load failed|network request failed/i.test(mensagemOriginal)) {
        mensagem = 'Não foi possível conectar ao Supabase. Verifique sua internet e a configuração do projeto.';
    }

    if ((codigo === '42501' || /row-level security|permission denied/i.test(mensagemOriginal))
        && contexto && contexto.tabela === 'public.obras' && operacao === 'cadastrar a obra') {
        mensagem = 'Não foi possível registrar quem cadastrou a obra. Verifique a política RLS do campo criado_por.';
    }

    const diagnostico = {
        operacao: operacao || 'acessar o Supabase',
        tabela: (contexto && contexto.tabela) || 'não informada',
        codigo: codigo || 'não informado',
        status: (erro && erro.status) || 'não informado',
        mensagem: mensagemOriginal || 'sem mensagem',
        detalhes: (erro && erro.details) || '',
        dicaSupabase: (erro && erro.hint) || ''
    };
    console.groupCollapsed(`[Supabase] Falha em ${diagnostico.operacao} (${diagnostico.tabela})`);
    console.error('Diagnóstico retornado pelo Supabase:', diagnostico);
    if (codigo === '42501' || /row-level security|permission denied/i.test(mensagemOriginal)) {
        console.warn('Verifique a política RLS da tabela e confirme se o UUID enviado corresponde a auth.uid().');
    }
    console.groupEnd();
    return new ErroIntegracao(mensagem, { codigo, detalhe: detalheTecnico(erro), operacao });
}

function erroDeSessao(erro) {
    if (!erro) return false;
    const nome = String(erro.name || '');
    const msg = String(erro.message || '');
    return nome === 'AuthSessionMissingError'
        || /auth session missing|session missing|jwt expired|invalid jwt|refresh token not found/i.test(msg)
        || erro.status === 401;
}

function exigirUsuarioId(usuario) {
    if (!usuario || !usuario.id) {
        throw new ErroIntegracao('Faça login para continuar.', { operacao: 'identificar o usuário autenticado' });
    }
    return usuario.id;
}

function normalizarBusca(busca) {
    return String(busca || '')
        .replace(/[(),]/g, ' ')
        .trim();
}

function normalizarUrlHttp(valor, campo) {
    const bruto = String(valor || '').trim();
    if (!bruto) return '';
    let parsed;
    try {
        parsed = new URL(bruto);
    } catch (erro) {
        throw new ErroIntegracao(`Informe uma URL válida para ${campo || 'o arquivo'}.`, { operacao: 'validar a URL' });
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new ErroIntegracao('A URL deve começar com https:// ou http://.', { operacao: 'validar a URL' });
    }
    return parsed.href;
}

function respostaDeEscrita(resultado, operacao, tabela) {
    if (resultado && resultado.error) {
        throw traduzirErroSupabase(resultado.error, operacao, { tabela });
    }
    const linhas = Array.isArray(resultado && resultado.data) ? resultado.data : [];
    if (!linhas.length) {
        throw new ErroIntegracao(
            'A operação não foi aplicada. Verifique suas permissões de acesso ou se o registro ainda existe.',
            { operacao }
        );
    }
    return linhas[0];
}

/**
 * Registra o histórico sem transformar uma falha de auditoria em falha da
 * operação principal. O usuário é avisado por um toast (evento civil:aviso).
 */
async function registrarHistoricoSeguro(payload) {
    try {
        await dbService.addHistoricoEntry(payload);
        return true;
    } catch (erro) {
        console.error('Falha ao registrar histórico de auditoria:', erro);
        try {
            window.dispatchEvent(new CustomEvent('civil:aviso', {
                detail: {
                    tipo: 'aviso',
                    mensagem: 'O registro foi salvo, mas o histórico de auditoria não pôde ser atualizado. Consulte o console para detalhes.'
                }
            }));
        } catch (e) {
            // Eventos são opcionais em ambientes de teste.
        }
        return false;
    }
}

function metadadosDoUsuario(user) {
    const meta = (user && user.user_metadata) || {};
    return {
        id: user.id,
        nome: meta.nome || String(user.email || '').split('@')[0] || 'Usuário',
        email: user.email || '',
        tipo_usuario: meta.tipo_usuario || 'cliente',
        foto_perfil_url: meta.foto_perfil_url || '',
        criado_em: user.created_at || new Date().toISOString()
    };
}

async function buscarUsuarioAtual() {
    const client = clientSupabase();
    const resultado = await client.auth.getUser();

    if (resultado && resultado.error) {
        if (erroDeSessao(resultado.error)) {
            return null;
        }
        throw traduzirErroSupabase(resultado.error, 'verificar sua sessão');
    }

    const user = resultado && resultado.data ? resultado.data.user : null;
    if (!user) return null;

    const perfil = await client.from('usuarios').select('*').eq('id', user.id).maybeSingle();
    if (perfil && perfil.error) {
        throw traduzirErroSupabase(perfil.error, 'carregar seu perfil');
    }
    return perfil && perfil.data ? perfil.data : metadadosDoUsuario(user);
}

async function obterUsuarioAtual(opcoes) {
    const forcar = !!(opcoes && opcoes.forcar);
    if (forcar) invalidarUsuarioAtual();
    if (_usuarioCarregado) return _usuarioAtual;
    if (_usuarioPromessa) return _usuarioPromessa;

    _usuarioPromessa = buscarUsuarioAtual()
        .then((usuario) => {
            _usuarioAtual = usuario;
            _usuarioCarregado = true;
            return usuario;
        })
        .catch((erro) => {
            _usuarioPromessa = null;
            throw erro;
        })
        .finally(() => {
            _usuarioPromessa = null;
        });

    return _usuarioPromessa;
}

function mapaErroAutenticacao(erro) {
    const msg = String((erro && erro.message) || '');
    if (/invalid login credentials|invalid_credentials/i.test(msg)) {
        return 'E-mail ou senha incorretos.';
    }
    if (/email not confirmed|email_not_confirmed/i.test(msg)) {
        return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
    }
    if (/user already registered|already registered|email_exists/i.test(msg)) {
        return 'Este e-mail já está cadastrado. Tente entrar ou recuperar a senha.';
    }
    if (/password should be at least|weak password/i.test(msg)) {
        return 'A senha informada é muito fraca. Use pelo menos 6 caracteres.';
    }
    if (/rate limit|too many requests/i.test(msg)) {
        return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
    }
    if (/failed to fetch|networkerror/i.test(msg)) {
        return 'Não foi possível conectar ao serviço de autenticação. Verifique sua internet.';
    }
    return 'Não foi possível autenticar. Verifique os dados e tente novamente.';
}

const dbService = {
    isConfigured() {
        if (!_inicializacaoTentada) initSupabase();
        return !!_configuracaoAtual.configurado && !!supabaseClient;
    },

    getConfigError() {
        if (!_inicializacaoTentada) initSupabase();
        return _erroInicializacao || _configuracaoAtual.erro || null;
    },

    getConfigInfo() {
        if (!_inicializacaoTentada) initSupabase();
        return {
            configurado: !!_configuracaoAtual.configurado && !!supabaseClient,
            url: _configuracaoAtual.url || '',
            erro: _erroInicializacao || _configuracaoAtual.erro || null
        };
    },

    getCurrentUser(opcoes) {
        return obterUsuarioAtual(opcoes);
    },

    async updateUserProfile(dados) {
        const client = clientSupabase();
        const usuario = await obterUsuarioAtual();
        const id = exigirUsuarioId(usuario);

        const payload = {};
        if (dados.nome !== undefined) payload.nome = String(dados.nome).trim();
        if (dados.foto_perfil_url !== undefined) payload.foto_perfil_url = String(dados.foto_perfil_url || '');

        if (payload.nome !== undefined && !payload.nome) {
            throw new ErroIntegracao('O nome do usuário não pode ficar vazio.', { operacao: 'atualizar o perfil' });
        }

        const resultado = await client.from('usuarios').update(payload).eq('id', id).select();
        const atualizado = respostaDeEscrita(resultado, 'atualizar o perfil');

        try {
            await client.auth.updateUser({ data: payload });
        } catch (erro) {
            console.warn('Perfil salvo, mas os metadados de autenticação não foram atualizados.', erro);
        }

        _usuarioAtual = atualizado;
        _usuarioCarregado = true;
        return atualizado;
    },

    async registerUser({ nome, email, password, tipo_usuario }) {
        const client = clientSupabase();
        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: { data: { nome, tipo_usuario } }
        });
        if (error) {
            throw new ErroIntegracao(mapaErroAutenticacao(error), { codigo: error.code, detalhe: detalheTecnico(error), operacao: 'criar a conta' });
        }
        invalidarUsuarioAtual();
        return data;
    },

    async loginUser({ email, password }) {
        const client = clientSupabase();
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
            throw new ErroIntegracao(mapaErroAutenticacao(error), { codigo: error.code, detalhe: detalheTecnico(error), operacao: 'entrar na plataforma' });
        }
        invalidarUsuarioAtual();
        if (!data || !data.user) {
            throw new ErroIntegracao('Não foi possível concluir o login. Tente novamente.', { operacao: 'entrar na plataforma' });
        }

        let perfil;
        try {
            perfil = await obterUsuarioAtual({ forcar: true });
        } catch (erro) {
            perfil = metadadosDoUsuario(data.user);
            try {
                window.dispatchEvent(new CustomEvent('civil:aviso', {
                    detail: { tipo: 'aviso', mensagem: 'Login realizado, mas não foi possível carregar seu perfil. Alguns campos podem aparecer incompletos.' }
                }));
            } catch (e) {
                // Evento opcional.
            }
        }
        return { user: perfil, session: data.session };
    },

    async logoutUser() {
        if (!supabaseClient) {
            invalidarUsuarioAtual();
            return true;
        }
        const { error } = await supabaseClient.auth.signOut();
        invalidarUsuarioAtual();
        if (error) {
            throw traduzirErroSupabase(error, 'encerrar a sessão');
        }
        return true;
    },

    async resetPassword(email) {
        const client = clientSupabase();
        if (!email || !email.includes('@')) {
            throw new ErroIntegracao('Informe um e-mail válido para recuperar a senha.', { operacao: 'recuperar a senha' });
        }
        const emPaginas = window.location.pathname.includes('/pages/');
        const destino = new URL(emPaginas ? '../index.html' : 'index.html', window.location.href).href;
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: destino });
        if (error) {
            throw new ErroIntegracao(mapaErroAutenticacao(error), { codigo: error.code, detalhe: detalheTecnico(error), operacao: 'enviar o e-mail de recuperação' });
        }
        return true;
    },

    // ---- PROFISSIONAIS E FORNECEDORES ----
    async getProfissionais({ busca = '', especialidade = '', cidade = '', tipo_registro = '' } = {}) {
        const client = clientSupabase();
        let query = client.from('profissionais').select('*').order('nome', { ascending: true });

        const termo = normalizarBusca(busca);
        if (termo) {
            const padrao = termo.replace(/[%_]/g, '');
            query = query.or(`nome.ilike.%${padrao}%,especialidade.ilike.%${padrao}%`);
        }
        if (especialidade) query = query.eq('especialidade', especialidade);
        if (cidade) query = query.eq('cidade', cidade);
        if (tipo_registro) query = query.eq('tipo_registro', tipo_registro);

        const { data, error } = await query;
        if (error) throw traduzirErroSupabase(error, 'consultar profissionais');
        return Array.isArray(data) ? data : [];
    },

    async getProfissionalById(id) {
        const client = clientSupabase();
        const { data, error } = await client.from('profissionais').select('*').eq('id', id).maybeSingle();
        if (error) throw traduzirErroSupabase(error, 'consultar o profissional');
        return data || null;
    },

    async saveProfissional(profissional) {
        const client = clientSupabase();
        const usuario = await obterUsuarioAtual();
        const usuarioId = exigirUsuarioId(usuario);
        const payload = {
            usuario_id: usuarioId,
            nome: String(profissional.nome || '').trim(),
            especialidade: String(profissional.especialidade || '').trim(),
            cidade: String(profissional.cidade || '').trim(),
            descricao: String(profissional.descricao || '').trim(),
            avaliacao: Number(profissional.avaliacao) || 5,
            contato: String(profissional.contato || '').trim(),
            tipo_registro: profissional.tipo_registro === 'fornecedor' ? 'fornecedor' : 'profissional',
            cnpj_cpf: String(profissional.cnpj_cpf || '').trim(),
            email: String(profissional.email || '').trim()
        };

        if (!payload.nome) throw new ErroIntegracao('O nome é obrigatório.', { operacao: 'salvar o profissional' });
        if (!payload.especialidade) throw new ErroIntegracao('A especialidade é obrigatória.', { operacao: 'salvar o profissional' });
        if (!payload.cidade) throw new ErroIntegracao('A cidade é obrigatória.', { operacao: 'salvar o profissional' });
        if (payload.avaliacao < 0 || payload.avaliacao > 5) {
            throw new ErroIntegracao('A avaliação deve estar entre 0 e 5.', { operacao: 'salvar o profissional' });
        }

        console.debug('[Cadastro de profissional] Enviando INSERT ao Supabase.', {
            tabela: 'public.profissionais',
            sessaoEncontrada: true,
            usuarioVinculado: payload.usuario_id === usuarioId,
            tipoRegistro: payload.tipo_registro
        });
        const resultado = await client.from('profissionais').insert([payload]).select();
        return respostaDeEscrita(resultado, 'salvar o profissional', 'public.profissionais');
    },

    async updateProfissional(id, dados) {
        const client = clientSupabase();
        const resultado = await client.from('profissionais').update(dados).eq('id', id).select();
        return respostaDeEscrita(resultado, 'atualizar o profissional');
    },

    // ---- OBRAS ----
    async getObras({ busca = '', cidade = '', status = '', includeDeleted = false } = {}) {
        const client = clientSupabase();
        let query = client.from('obras')
            .select('*, cliente:usuarios!obras_cliente_id_fkey(nome), criador:usuarios!obras_criado_por_fkey(nome), profissionais(nome)')
            .order('criado_em', { ascending: false });

        if (!includeDeleted) query = query.is('deleted_at', null);
        const termo = normalizarBusca(busca);
        if (termo) {
            const padrao = termo.replace(/[%_]/g, '');
            query = query.or(`nome.ilike.%${padrao}%,descricao.ilike.%${padrao}%`);
        }
        if (cidade) query = query.eq('cidade', cidade);
        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) throw traduzirErroSupabase(error, 'consultar as obras', { tabela: 'public.obras' });
        return Array.isArray(data) ? data : [];
    },

    async getObraById(id) {
        const client = clientSupabase();
        const { data, error } = await client.from('obras')
            .select('*, cliente:usuarios!obras_cliente_id_fkey(nome), criador:usuarios!obras_criado_por_fkey(nome), profissionais(nome)')
            .eq('id', id)
            .maybeSingle();
        if (error) throw traduzirErroSupabase(error, 'consultar a obra', { tabela: 'public.obras' });
        if (!data || data.deleted_at) return null;
        return data;
    },

    async saveObra(obra) {
        const client = clientSupabase();
        const { data, error } = await client.auth.getUser();
        if (error) throw traduzirErroSupabase(error, 'verificar sua sessão');
        const user = data && data.user;
        if (!user || !user.id) {
            throw new ErroIntegracao('Você precisa estar logado para cadastrar uma obra.', { operacao: 'cadastrar a obra' });
        }
        const clienteId = user.id;

        const nome = String(obra.nome || '').trim();
        const cidade = String(obra.cidade || '').trim();
        const progresso = Number(obra.progresso) || 0;

        if (!nome) throw new ErroIntegracao('O nome da obra é obrigatório.', { operacao: 'cadastrar a obra' });
        if (!cidade) throw new ErroIntegracao('A cidade da obra é obrigatória.', { operacao: 'cadastrar a obra' });
        if (progresso < 0 || progresso > 100) {
            throw new ErroIntegracao('O progresso deve estar entre 0% e 100%.', { operacao: 'cadastrar a obra' });
        }

        const payload = {
            cliente_id: clienteId,
            nome,
            descricao: String(obra.descricao || '').trim(),
            cidade,
            status: obra.status || 'planejamento',
            progresso,
            foto_capa_url: normalizarUrlHttp(obra.foto_capa_url, 'a imagem de capa'),
            data_inicio: obra.data_inicio || null,
            data_previsao_fim: obra.data_previsao_fim || null,
            responsavel_id: obra.responsavel_id || null,
            deleted_at: null
        };

        console.debug('[Cadastro de obra] Enviando INSERT ao Supabase.', {
            tabela: 'public.obras',
            sessaoEncontrada: true,
            clienteVinculadoAoUsuarioAtual: payload.cliente_id === clienteId,
            criadoPorDefinidoPeloBanco: true,
            responsavelInformado: !!payload.responsavel_id
        });
        const resultado = await client.from('obras').insert([payload]).select();
        const novaObra = respostaDeEscrita(resultado, 'cadastrar a obra', 'public.obras');

        await registrarHistoricoSeguro({
            obra_id: novaObra.id,
            tipo: 'criacao',
            descricao: `Obra "${novaObra.nome}" cadastrada com sucesso.`
        });

        return novaObra;
    },

    async updateObra(obraId, dados) {
        const client = clientSupabase();
        const payload = { ...dados };

        if (payload.foto_capa_url !== undefined) {
            payload.foto_capa_url = normalizarUrlHttp(payload.foto_capa_url, 'a imagem de capa');
        }
        if (payload.nome !== undefined) {
            payload.nome = String(payload.nome).trim();
            if (!payload.nome) throw new ErroIntegracao('O nome da obra é obrigatório.', { operacao: 'atualizar a obra' });
        }
        if (payload.cidade !== undefined) {
            payload.cidade = String(payload.cidade).trim();
            if (!payload.cidade) throw new ErroIntegracao('A cidade da obra é obrigatória.', { operacao: 'atualizar a obra' });
        }
        if (payload.responsavel_id === '') payload.responsavel_id = null;
        if (payload.data_inicio === '') payload.data_inicio = null;
        if (payload.data_previsao_fim === '') payload.data_previsao_fim = null;

        const resultado = await client.from('obras').update(payload).eq('id', obraId).select();
        const atualizada = respostaDeEscrita(resultado, 'atualizar a obra');

        await registrarHistoricoSeguro({
            obra_id: obraId,
            tipo: 'edicao',
            descricao: 'Informações gerais da obra atualizadas.'
        });

        return atualizada;
    },

    async deleteObra(obraId) {
        const client = clientSupabase();
        const usuario = await obterUsuarioAtual();
        const obra = await this.getObraById(obraId);
        if (!obra) throw new ErroIntegracao('Obra não localizada ou já removida.', { operacao: 'excluir a obra' });

        const agora = new Date().toISOString();
        const resultado = await client.from('obras').update({ deleted_at: agora }).eq('id', obraId).select();
        respostaDeEscrita(resultado, 'excluir a obra');

        await registrarHistoricoSeguro({
            obra_id: obraId,
            tipo: 'exclusao',
            descricao: `Obra "${obra.nome}" foi removida do sistema por ${usuario ? usuario.nome : 'usuário autenticado'}.`
        });

        return true;
    },

    async updateObraProgresso(obraId, novoProgresso, novoStatus) {
        const client = clientSupabase();
        const payload = { progresso: novoProgresso };
        if (novoStatus) payload.status = novoStatus;
        const resultado = await client.from('obras').update(payload).eq('id', obraId).select();
        return respostaDeEscrita(resultado, 'atualizar o progresso da obra');
    },

    // ---- ETAPAS DA OBRA ----
    async getEtapasByObra(obraId) {
        const client = clientSupabase();
        const { data, error } = await client
            .from('etapas_obra')
            .select('*')
            .eq('obra_id', obraId)
            .is('deleted_at', null)
            .order('criado_em', { ascending: true });
        if (error) throw traduzirErroSupabase(error, 'consultar as etapas da obra');
        return Array.isArray(data) ? data : [];
    },

    async saveEtapa(etapa) {
        const client = clientSupabase();
        const progresso = Number(etapa.progresso) || 0;
        if (!etapa.obra_id) throw new ErroIntegracao('A obra da etapa é obrigatória.', { operacao: 'cadastrar a etapa' });
        if (!String(etapa.nome || '').trim()) throw new ErroIntegracao('O nome da etapa é obrigatório.', { operacao: 'cadastrar a etapa' });
        if (progresso < 0 || progresso > 100) throw new ErroIntegracao('O progresso da etapa deve estar entre 0% e 100%.', { operacao: 'cadastrar a etapa' });

        const payload = {
            obra_id: etapa.obra_id,
            nome: String(etapa.nome).trim(),
            descricao: String(etapa.descricao || '').trim(),
            status: etapa.status || 'pendente',
            progresso,
            data_inicio: etapa.data_inicio || null,
            data_previsao_fim: etapa.data_previsao_fim || null,
            deleted_at: null
        };

        const resultado = await client.from('etapas_obra').insert([payload]).select();
        const novaEtapa = respostaDeEscrita(resultado, 'cadastrar a etapa');

        await registrarHistoricoSeguro({
            obra_id: etapa.obra_id,
            tipo: 'etapa',
            descricao: `Nova etapa "${novaEtapa.nome}" cadastrada.`
        });
        await this.recalcularProgressoObra(etapa.obra_id);
        return novaEtapa;
    },

    async updateEtapa(etapaId, dados) {
        const client = clientSupabase();
        const resultado = await client.from('etapas_obra').update(dados).eq('id', etapaId).select();
        const atualizada = respostaDeEscrita(resultado, 'atualizar a etapa');
        if (atualizada.obra_id) await this.recalcularProgressoObra(atualizada.obra_id);
        return atualizada;
    },

    async deleteEtapa(etapaId) {
        const client = clientSupabase();
        const resultado = await client.from('etapas_obra').update({ deleted_at: new Date().toISOString() }).eq('id', etapaId).select();
        const removida = respostaDeEscrita(resultado, 'excluir a etapa');
        if (removida.obra_id) {
            await this.recalcularProgressoObra(removida.obra_id);
            await registrarHistoricoSeguro({
                obra_id: removida.obra_id,
                tipo: 'etapa',
                descricao: `Etapa "${removida.nome}" removida do cronograma.`
            });
        }
        return true;
    },

    // ---- TAREFAS DA ETAPA ----
    async getTarefasByObra(obraId) {
        const client = clientSupabase();
        const { data, error } = await client
            .from('tarefas_obra')
            .select('*, profissionais(nome)')
            .eq('obra_id', obraId)
            .order('criado_em', { ascending: true });
        if (error) throw traduzirErroSupabase(error, 'consultar as tarefas da obra');
        return Array.isArray(data) ? data : [];
    },

    async saveTarefa(tarefa) {
        const client = clientSupabase();
        const progresso = Number(tarefa.progresso) || 0;
        if (!tarefa.etapa_id || !tarefa.obra_id) throw new ErroIntegracao('Selecione a etapa da tarefa.', { operacao: 'cadastrar a tarefa' });
        if (!String(tarefa.nome || '').trim()) throw new ErroIntegracao('O nome da tarefa é obrigatório.', { operacao: 'cadastrar a tarefa' });
        if (progresso < 0 || progresso > 100) throw new ErroIntegracao('O progresso da tarefa deve estar entre 0% e 100%.', { operacao: 'cadastrar a tarefa' });

        const payload = {
            etapa_id: tarefa.etapa_id,
            obra_id: tarefa.obra_id,
            nome: String(tarefa.nome).trim(),
            descricao: String(tarefa.descricao || '').trim(),
            responsavel_id: tarefa.responsavel_id || null,
            data_inicio_prevista: tarefa.data_inicio_prevista || null,
            data_fim_prevista: tarefa.data_fim_prevista || null,
            data_inicio_real: tarefa.data_inicio_real || null,
            data_fim_real: tarefa.data_fim_real || null,
            status: tarefa.status || 'pendente',
            progresso,
            justificativa_atraso: String(tarefa.justificativa_atraso || '').trim(),
            observacoes_tecnicas: String(tarefa.observacoes_tecnicas || '').trim()
        };

        const resultado = await client.from('tarefas_obra').insert([payload]).select();
        const novaTarefa = respostaDeEscrita(resultado, 'cadastrar a tarefa');

        await registrarHistoricoSeguro({
            obra_id: tarefa.obra_id,
            tipo: 'tarefa',
            descricao: `Nova atividade "${novaTarefa.nome}" adicionada.`
        });
        await this.recalcularProgressoEtapaETarefas(tarefa.etapa_id, tarefa.obra_id);
        return novaTarefa;
    },

    async updateTarefa(tarefaId, dados) {
        const client = clientSupabase();
        const resultado = await client.from('tarefas_obra').update(dados).eq('id', tarefaId).select();
        const atualizada = respostaDeEscrita(resultado, 'atualizar a tarefa');
        if (atualizada.etapa_id && atualizada.obra_id) {
            await this.recalcularProgressoEtapaETarefas(atualizada.etapa_id, atualizada.obra_id);
        }
        return atualizada;
    },

    async deleteTarefa(tarefaId) {
        const client = clientSupabase();
        const resultado = await client.from('tarefas_obra').delete().eq('id', tarefaId).select();
        const removida = respostaDeEscrita(resultado, 'excluir a tarefa');
        if (removida.etapa_id && removida.obra_id) {
            await this.recalcularProgressoEtapaETarefas(removida.etapa_id, removida.obra_id);
            await registrarHistoricoSeguro({
                obra_id: removida.obra_id,
                tipo: 'tarefa',
                descricao: `Atividade "${removida.nome}" removida do cronograma.`
            });
        }
        return true;
    },

    async recalcularProgressoEtapaETarefas(etapaId, obraId) {
        const tarefas = await this.getTarefasByObra(obraId);
        const tarefasEtapa = tarefas.filter((tarefa) => tarefa.etapa_id === etapaId);

        if (!tarefasEtapa.length) {
            await this.recalcularProgressoObra(obraId);
            return null;
        }

        const soma = tarefasEtapa.reduce((total, tarefa) => total + (Number(tarefa.progresso) || 0), 0);
        const media = Math.round(soma / tarefasEtapa.length);
        let status = 'em_andamento';
        if (media === 0) status = 'pendente';
        if (media === 100) status = 'concluida';

        return this.updateEtapa(etapaId, { progresso: media, status });
    },

    async recalcularProgressoObra(obraId) {
        const etapas = await this.getEtapasByObra(obraId);
        if (!etapas.length) return null;

        const total = etapas.reduce((soma, etapa) => soma + (Number(etapa.progresso) || 0), 0);
        const media = Math.round(total / etapas.length);

        let status = 'em_andamento';
        if (media === 0) status = 'planejamento';
        else if (media === 100) status = 'concluida';

        return this.updateObraProgresso(obraId, media, status);
    },

    // ---- AGENDAMENTOS ----
    async getAgendamentos({ obra_id = '', responsavel_id = '', status = '', busca = '' } = {}) {
        const client = clientSupabase();
        let query = client
            .from('agendamentos')
            .select('*, obras(nome), profissionais(nome)')
            .order('inicio', { ascending: true });

        if (obra_id) query = query.eq('obra_id', obra_id);
        if (responsavel_id) query = query.eq('responsavel_id', responsavel_id);
        if (status) query = query.eq('status', status);
        const termo = normalizarBusca(busca);
        if (termo) query = query.ilike('titulo', `%${termo.replace(/[%_]/g, '')}%`);

        const { data, error } = await query;
        if (error) throw traduzirErroSupabase(error, 'consultar a agenda');
        return Array.isArray(data) ? data : [];
    },

    async checkAgendamentoConflito({ inicio, fim, responsavel_id, ignoreId = null }) {
        const inicioDt = new Date(inicio);
        const fimDt = new Date(fim);

        if (Number.isNaN(inicioDt.getTime()) || Number.isNaN(fimDt.getTime())) {
            throw new ErroIntegracao('Informe data e hora válidas para o compromisso.', { operacao: 'validar o agendamento' });
        }
        if (fimDt <= inicioDt) {
            throw new ErroIntegracao('O horário de término deve ser posterior ao horário de início.', { operacao: 'validar o agendamento' });
        }

        // Sem responsável definido não há agenda individual para conflitar.
        if (!responsavel_id) return false;

        const agendamentos = await this.getAgendamentos({ responsavel_id });
        const conflito = agendamentos.find((agendamento) => {
            if (ignoreId && agendamento.id === ignoreId) return false;
            if (agendamento.status === 'cancelado') return false;
            const aInicio = new Date(agendamento.inicio);
            const aFim = new Date(agendamento.fim);
            return inicioDt < aFim && fimDt > aInicio;
        });

        if (conflito) {
            throw new ErroIntegracao(
                `Conflito de agenda: o profissional já possui o compromisso "${conflito.titulo}" neste horário. Escolha outro horário ou responsável.`,
                { operacao: 'verificar conflitos de agenda' }
            );
        }
        return false;
    },

    async saveAgendamento(agendamento) {
        const client = clientSupabase();
        const usuario = await obterUsuarioAtual();
        const usuarioId = exigirUsuarioId(usuario);

        const titulo = String(agendamento.titulo || '').trim();
        if (!titulo) throw new ErroIntegracao('O título do compromisso é obrigatório.', { operacao: 'salvar o agendamento' });
        if (!agendamento.obra_id) throw new ErroIntegracao('Selecione a obra do compromisso.', { operacao: 'salvar o agendamento' });
        if (!agendamento.inicio || !agendamento.fim) throw new ErroIntegracao('Informe o início e o término do compromisso.', { operacao: 'salvar o agendamento' });

        await this.checkAgendamentoConflito({
            inicio: agendamento.inicio,
            fim: agendamento.fim,
            responsavel_id: agendamento.responsavel_id,
            ignoreId: agendamento.id || null
        });

        const payload = {
            obra_id: agendamento.obra_id,
            titulo,
            tipo: agendamento.tipo || 'visita_tecnica',
            inicio: agendamento.inicio,
            fim: agendamento.fim,
            responsavel_id: agendamento.responsavel_id || null,
            status: agendamento.status || 'agendado',
            observacoes: String(agendamento.observacoes || '').trim(),
            criado_por: usuarioId
        };

        let salvo;
        if (agendamento.id) {
            const resultado = await client.from('agendamentos').update(payload).eq('id', agendamento.id).select();
            salvo = respostaDeEscrita(resultado, 'atualizar o compromisso');
        } else {
            const resultado = await client.from('agendamentos').insert([payload]).select();
            salvo = respostaDeEscrita(resultado, 'cadastrar o compromisso');
        }

        await registrarHistoricoSeguro({
            obra_id: salvo.obra_id,
            tipo: 'agendamento',
            descricao: `Compromisso "${salvo.titulo}" agendado para ${new Date(salvo.inicio).toLocaleString('pt-BR')}.`
        });

        return salvo;
    },

    async updateAgendamentoStatus(id, status) {
        const client = clientSupabase();
        const resultado = await client.from('agendamentos').update({ status }).eq('id', id).select();
        return respostaDeEscrita(resultado, 'atualizar o status do compromisso');
    },

    // ---- ASSOCIAÇÃO OBRA & PROFISSIONAIS ----
    async getObraProfissionais(obraId) {
        const client = clientSupabase();
        const { data, error } = await client
            .from('obra_profissionais')
            .select('*, profissionais(*)')
            .eq('obra_id', obraId)
            .order('criado_em', { ascending: true });
        if (error) throw traduzirErroSupabase(error, 'consultar a equipe da obra');
        return Array.isArray(data) ? data : [];
    },

    async associarProfissionalObra({ obra_id, profissional_id, funcao, responsabilidade }) {
        const client = clientSupabase();
        if (!obra_id || !profissional_id) throw new ErroIntegracao('Selecione o profissional a vincular.', { operacao: 'vincular o profissional' });
        if (!String(funcao || '').trim()) throw new ErroIntegracao('Informe a função do profissional na obra.', { operacao: 'vincular o profissional' });

        const payload = {
            obra_id,
            profissional_id,
            funcao: String(funcao).trim(),
            responsabilidade: String(responsabilidade || '').trim()
        };

        const resultado = await client.from('obra_profissionais').upsert([payload], { onConflict: 'obra_id,profissional_id' }).select();
        const associacao = respostaDeEscrita(resultado, 'vincular o profissional à obra');

        await registrarHistoricoSeguro({
            obra_id,
            tipo: 'equipe',
            descricao: 'Equipe técnica da obra atualizada.'
        });

        return associacao;
    },

    async desassociarProfissionalObra(id) {
        const client = clientSupabase();
        const resultado = await client.from('obra_profissionais').delete().eq('id', id).select();
        return respostaDeEscrita(resultado, 'desvincular o profissional da obra');
    },

    // ---- DIÁRIO, DOCUMENTOS E HISTÓRICO ----
    async getDiarioByObra(obraId) {
        const client = clientSupabase();
        const { data, error } = await client
            .from('diario_obra')
            .select('*, usuarios(nome)')
            .eq('obra_id', obraId)
            .order('data', { ascending: false });
        if (error) throw traduzirErroSupabase(error, 'consultar o diário da obra');
        return Array.isArray(data) ? data : [];
    },

    async saveDiarioEntry(diario) {
        const client = clientSupabase();
        const usuario = await obterUsuarioAtual();
        const usuarioId = exigirUsuarioId(usuario);

        if (!diario.obra_id) throw new ErroIntegracao('A obra do registro é obrigatória.', { operacao: 'salvar o diário' });
        if (!String(diario.resumo_dia || '').trim()) throw new ErroIntegracao('O resumo das atividades é obrigatório.', { operacao: 'salvar o diário' });

        const payload = {
            obra_id: diario.obra_id,
            usuario_id: usuarioId,
            data: diario.data || new Date().toISOString().split('T')[0],
            clima: diario.clima || 'Ensolarado',
            resumo_dia: String(diario.resumo_dia).trim(),
            observacoes_tecnicas: String(diario.observacoes_tecnicas || '').trim()
        };

        const resultado = await client.from('diario_obra').insert([payload]).select();
        const novo = respostaDeEscrita(resultado, 'salvar o registro do diário');

        await registrarHistoricoSeguro({
            obra_id: diario.obra_id,
            tipo: 'diario',
            descricao: `Registro diário cadastrado para o dia ${new Date(novo.data).toLocaleDateString('pt-BR')}.`
        });

        return novo;
    },

    async getDocumentosByObra(obraId) {
        const client = clientSupabase();
        const { data, error } = await client
            .from('documentos_obra')
            .select('*')
            .eq('obra_id', obraId)
            .order('criado_em', { ascending: false });
        if (error) throw traduzirErroSupabase(error, 'consultar os documentos da obra');
        return Array.isArray(data) ? data : [];
    },

    async saveDocumento(documento) {
        const client = clientSupabase();
        const usuario = await obterUsuarioAtual();
        const usuarioId = exigirUsuarioId(usuario);

        const titulo = String(documento.titulo || '').trim();
        if (!titulo) throw new ErroIntegracao('O título do anexo é obrigatório.', { operacao: 'salvar o anexo' });
        const url = normalizarUrlHttp(documento.url_arquivo, 'o arquivo do anexo');
        if (!url) throw new ErroIntegracao('Informe a URL pública do arquivo.', { operacao: 'salvar o anexo' });

        const payload = {
            obra_id: documento.obra_id,
            diario_id: documento.diario_id || null,
            titulo,
            tipo: documento.tipo === 'documento' ? 'documento' : 'imagem',
            url_arquivo: url,
            tamanho_bytes: Number(documento.tamanho_bytes) || 0,
            criado_por: usuarioId
        };

        const resultado = await client.from('documentos_obra').insert([payload]).select();
        const novo = respostaDeEscrita(resultado, 'salvar o anexo');

        await registrarHistoricoSeguro({
            obra_id: documento.obra_id,
            tipo: 'documento',
            descricao: `Anexo "${novo.titulo}" adicionado à obra.`
        });

        return novo;
    },

    async uploadDocumento(obraId, arquivo) {
        const client = clientSupabase();
        if (!obraId) throw new ErroIntegracao('A obra do anexo é obrigatória.', { operacao: 'enviar o anexo' });
        if (!arquivo || !arquivo.size) {
            throw new ErroIntegracao('Selecione um arquivo para enviar.', { operacao: 'enviar o anexo' });
        }
        if (arquivo.size > LIMITE_ANEXO_BYTES) {
            throw new ErroIntegracao('O arquivo excede o limite de 20 MB permitido para anexos.', { operacao: 'enviar o anexo' });
        }

        const nomeSeguro = String(arquivo.name || 'arquivo')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9._-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(-80) || 'arquivo';

        const caminho = `${obraId}/${Date.now()}-${nomeSeguro}`;
        const { error } = await client.storage.from(BUCKET_DOCUMENTOS).upload(caminho, arquivo, {
            cacheControl: '3600',
            contentType: arquivo.type || 'application/octet-stream',
            upsert: false
        });

        if (error) {
            const detalhe = String(error.message || '');
            if ((error.statusCode === '404' || /bucket.*not.*found|not found/i.test(detalhe)) && !error.message.includes('row-level security')) {
                throw new ErroIntegracao(
                    `O bucket "${BUCKET_DOCUMENTOS}" do Supabase Storage não está disponível. Crie o bucket público e as políticas descritas em docs/storage-documentos.sql ou cadastre o anexo informando uma URL.`,
                    { codigo: error.statusCode || null, detalhe, operacao: 'enviar o anexo' }
                );
            }
            throw traduzirErroSupabase(error, 'enviar o anexo');
        }

        const { data } = client.storage.from(BUCKET_DOCUMENTOS).getPublicUrl(caminho);
        if (!data || !data.publicUrl) {
            throw new ErroIntegracao('O arquivo foi enviado, mas não foi possível obter o endereço público.', { operacao: 'enviar o anexo' });
        }

        return { url: data.publicUrl, caminho, tamanho: Number(arquivo.size) || 0, nome: arquivo.name };
    },

    async getHistoricoByObra(obraId) {
        const client = clientSupabase();
        const { data, error } = await client
            .from('historico_obra')
            .select('*, usuarios(nome)')
            .eq('obra_id', obraId)
            .order('criado_em', { ascending: false });
        if (error) throw traduzirErroSupabase(error, 'consultar o histórico da obra');
        return Array.isArray(data) ? data : [];
    },

    async getHistoricoRecente(limite = 10) {
        const client = clientSupabase();
        const quantidade = Math.max(1, Math.min(100, Number(limite) || 10));
        const { data, error } = await client
            .from('historico_obra')
            .select('*, usuarios(nome), obras(nome)')
            .order('criado_em', { ascending: false })
            .limit(quantidade);
        if (error) throw traduzirErroSupabase(error, 'consultar o histórico geral');
        return Array.isArray(data) ? data : [];
    },

    async addHistoricoEntry({ obra_id, tipo, descricao, alteracoes_json = null }) {
        const client = clientSupabase();
        const usuario = await obterUsuarioAtual();
        const payload = {
            obra_id,
            usuario_id: usuario ? usuario.id : null,
            tipo,
            descricao,
            alteracoes_json
        };
        const resultado = await client.from('historico_obra').insert([payload]).select();
        return respostaDeEscrita(resultado, 'registrar o histórico da obra');
    },

    // ---- DASHBOARD ----
    async getDashboardMetrics() {
        const client = clientSupabase();
        const [profissionais, resultadoObras, resultadoObrasRecentes, agendamentos, historicoGeral] = await Promise.all([
            this.getProfissionais(),
            client.from('obras')
                .select('id, status, progresso, data_previsao_fim')
                .is('deleted_at', null),
            client.from('obras')
                .select('id, nome, cidade, progresso, foto_capa_url, criado_em')
                .is('deleted_at', null)
                .order('criado_em', { ascending: false })
                .limit(5),
            this.getAgendamentos(),
            this.getHistoricoRecente(6)
        ]);

        if (resultadoObras.error) {
            throw traduzirErroSupabase(resultadoObras.error, 'consultar as obras do dashboard', { tabela: 'public.obras' });
        }
        if (resultadoObrasRecentes.error) {
            throw traduzirErroSupabase(resultadoObrasRecentes.error, 'consultar as obras recentes do dashboard', { tabela: 'public.obras' });
        }

        const obras = Array.isArray(resultadoObras.data) ? resultadoObras.data : [];
        const obrasRecentes = Array.isArray(resultadoObrasRecentes.data) ? resultadoObrasRecentes.data : [];

        const totalProfissionais = profissionais.length;
        const totalObras = obras.length;
        const obrasEmAndamento = obras.filter((obra) => obra.status === 'em_andamento').length;
        const obrasConcluidas = obras.filter((obra) => obra.status === 'concluida').length;

        const hoje = new Date().toISOString().split('T')[0];
        const obrasAtrasadas = obras.filter((obra) =>
            obra.status !== 'concluida' &&
            obra.data_previsao_fim &&
            obra.data_previsao_fim < hoje
        ).length;

        const somaProgresso = obras.reduce((total, obra) => total + (Number(obra.progresso) || 0), 0);
        const progressoMedio = totalObras > 0 ? Math.round(somaProgresso / totalObras) : 0;

        const agora = new Date();
        const proximosAgendamentos = agendamentos
            .filter((agendamento) => {
                const inicio = new Date(agendamento.inicio);
                return !Number.isNaN(inicio.getTime()) && inicio >= agora && agendamento.status !== 'cancelado';
            })
            .slice(0, 5);

        return {
            totalProfissionais,
            totalObras,
            obrasEmAndamento,
            obrasConcluidas,
            obrasAtrasadas,
            progressoMedio,
            proximosAgendamentos,
            historicoGeral,
            obrasRecentes
        };
    }
};

// Utilitário compartilhado para imagens de capa e miniaturas.
function getObraImagemUrl(url, relativePrefix = 'assets/images/placeholder-obra.svg') {
    const placeholder = relativePrefix;
    if (!url) return placeholder;

    let limpa = String(url).trim();
    limpa = limpa
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');

    if (!limpa || (!/^https?:\/\//i.test(limpa) && !/^data:image\//i.test(limpa))) {
        return placeholder;
    }
    return limpa;
}

// Utilitário para documentos: aceita links http(s) e recusa protocolos ativos.
function getDocumentoUrl(url) {
    const limpa = String(url || '').trim();
    if (!limpa || !/^https?:\/\//i.test(limpa)) return null;
    return limpa;
}

window.dbService = dbService;
window.getObraImagemUrl = getObraImagemUrl;
window.getDocumentoUrl = getDocumentoUrl;
window.ErroIntegracao = ErroIntegracao;

document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
    try {
        window.dispatchEvent(new CustomEvent('civil:supabase-pronto', {
            detail: dbService.getConfigInfo()
        }));
    } catch (erro) {
        // Evento opcional.
    }
});
