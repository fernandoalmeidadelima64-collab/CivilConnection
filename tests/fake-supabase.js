/* ==========================================================================
   Civil Connection — Simulador local do Supabase (somente para testes)
   ==========================================================================
   Este arquivo NÃO é carregado pela aplicação em produção. Os testes de
   interface o injetam no lugar de assets/vendor/supabase-js.min.js para
   exercitar as telas sem tocar em um projeto Supabase real.

   Ele imita apenas o subconjunto da API usado pelo site:
   from().select/insert/update/delete/upsert, auth e storage.
   ========================================================================== */

(function () {
    'use strict';

    const CHAVE_SESSAO = 'cc_teste_sessao';
    const CHAVE_BANCO = 'cc_teste_banco';
    const agora = new Date();
    const emDias = (dias, hora, minuto) => {
        const data = new Date(agora);
        data.setDate(data.getDate() + dias);
        data.setHours(hora || 9, minuto || 0, 0, 0);
        return data.toISOString();
    };

    const usuarioTeste = {
        id: '11111111-1111-4111-8111-111111111111',
        nome: 'Ana Souza',
        email: 'ana.souza@exemplo.com.br',
        tipo_usuario: 'administrador',
        foto_perfil_url: '',
        criado_em: emDias(-120, 8, 0)
    };

    function criarBanco() {
        return {
            usuarios: [{ ...usuarioTeste }],
            profissionais: [
                {
                    id: '22222222-2222-4222-8222-222222222201',
                    usuario_id: null,
                    nome: 'Carlos Mendes',
                    especialidade: 'Engenheiro Civil',
                    cidade: 'Campinas',
                    descricao: 'Responsável por estruturas de concreto armado.',
                    avaliacao: 4.8,
                    contato: '(19) 99999-1010',
                    tipo_registro: 'profissional',
                    cnpj_cpf: '123.456.789-00',
                    email: 'carlos@exemplo.com.br',
                    criado_em: emDias(-90, 9, 0)
                },
                {
                    id: '22222222-2222-4222-8222-222222222202',
                    usuario_id: null,
                    nome: 'Construtora Horizonte',
                    especialidade: 'Estruturas Metálicas e Materiais',
                    cidade: 'São Paulo',
                    descricao: 'Fornecimento de perfis metálicos e lajes pré-moldadas.',
                    avaliacao: 4.5,
                    contato: '(11) 3333-2020',
                    tipo_registro: 'fornecedor',
                    cnpj_cpf: '12.345.678/0001-90',
                    email: 'contato@horizonte.com.br',
                    criado_em: emDias(-60, 10, 0)
                },
                {
                    id: '22222222-2222-4222-8222-222222222203',
                    usuario_id: null,
                    nome: 'Marina Alves',
                    especialidade: 'Arquitetura e Interiores',
                    cidade: 'Santos',
                    descricao: 'Projetos arquitetônicos e compatibilização.',
                    avaliacao: 5,
                    contato: '(13) 98888-3030',
                    tipo_registro: 'profissional',
                    cnpj_cpf: '',
                    email: 'marina@exemplo.com.br',
                    criado_em: emDias(-30, 11, 0)
                }
            ],
            obras: [
                {
                    id: '33333333-3333-4333-8333-333333333301',
                    cliente_id: usuarioTeste.id,
                    criado_por: usuarioTeste.id,
                    nome: 'Residencial Aurora',
                    descricao: 'Edifício residencial de 8 pavimentos com laje protendida.',
                    cidade: 'Campinas',
                    status: 'em_andamento',
                    progresso: 45,
                    foto_capa_url: '',
                    data_inicio: '2026-01-15',
                    data_previsao_fim: '2026-12-20',
                    responsavel_id: '22222222-2222-4222-8222-222222222201',
                    deleted_at: null,
                    criado_em: emDias(-45, 9, 0)
                },
                {
                    id: '33333333-3333-4333-8333-333333333302',
                    cliente_id: usuarioTeste.id,
                    criado_por: null,
                    nome: 'Galpão Logístico Norte',
                    descricao: 'Galpão industrial em estrutura metálica.',
                    cidade: 'São Paulo',
                    status: 'planejamento',
                    progresso: 0,
                    foto_capa_url: '',
                    data_inicio: null,
                    data_previsao_fim: '2027-03-30',
                    responsavel_id: '22222222-2222-4222-8222-222222222202',
                    deleted_at: null,
                    criado_em: emDias(-20, 9, 0)
                },
                {
                    id: '33333333-3333-4333-8333-333333333303',
                    cliente_id: usuarioTeste.id,
                    criado_por: usuarioTeste.id,
                    nome: 'Reforma Casa Praia',
                    descricao: 'Reforma completa de residência unifamiliar.',
                    cidade: 'Santos',
                    status: 'concluida',
                    progresso: 100,
                    foto_capa_url: '',
                    data_inicio: '2025-03-01',
                    data_previsao_fim: '2025-11-30',
                    responsavel_id: '22222222-2222-4222-8222-222222222203',
                    deleted_at: null,
                    criado_em: emDias(-200, 9, 0)
                },
                {
                    id: '33333333-3333-4333-8333-333333333304',
                    cliente_id: usuarioTeste.id,
                    nome: 'Obra removida (não deve aparecer)',
                    descricao: 'Registro com exclusão lógica.',
                    cidade: 'Campinas',
                    status: 'pausada',
                    progresso: 10,
                    deleted_at: emDias(-5, 12, 0),
                    criado_em: emDias(-80, 9, 0)
                }
            ],
            etapas_obra: [
                {
                    id: '44444444-4444-4444-8444-444444444401',
                    obra_id: '33333333-3333-4333-8333-333333333301',
                    nome: 'Fundação',
                    descricao: 'Estacas e blocos de coroamento.',
                    status: 'concluida',
                    progresso: 100,
                    deleted_at: null,
                    criado_em: emDias(-40, 9, 0)
                },
                {
                    id: '44444444-4444-4444-8444-444444444402',
                    obra_id: '33333333-3333-4333-8333-333333333301',
                    nome: 'Estrutura',
                    descricao: 'Pilares, vigas e lajes.',
                    status: 'em_andamento',
                    progresso: 40,
                    deleted_at: null,
                    criado_em: emDias(-30, 9, 0)
                },
                {
                    id: '44444444-4444-4444-8444-444444444403',
                    obra_id: '33333333-3333-4333-8333-333333333303',
                    nome: 'Acabamento',
                    descricao: 'Pintura e revestimentos.',
                    status: 'concluida',
                    progresso: 100,
                    deleted_at: null,
                    criado_em: emDias(-100, 9, 0)
                }
            ],
            tarefas_obra: [
                {
                    id: '55555555-5555-4555-8555-555555555501',
                    etapa_id: '44444444-4444-4444-8444-444444444402',
                    obra_id: '33333333-3333-4333-8333-333333333301',
                    nome: 'Concretagem do 3º pavimento',
                    descricao: 'Laje do 3º pavimento com concreto usinado.',
                    responsavel_id: '22222222-2222-4222-8222-222222222201',
                    data_fim_prevista: '2026-11-05',
                    status: 'em_andamento',
                    progresso: 50,
                    justificativa_atraso: '',
                    criado_em: emDias(-10, 9, 0)
                },
                {
                    id: '55555555-5555-4555-8555-555555555502',
                    etapa_id: '44444444-4444-4444-8444-444444444402',
                    obra_id: '33333333-3333-4333-8333-333333333301',
                    nome: 'Montagem de escoramento',
                    descricao: '',
                    responsavel_id: null,
                    data_fim_prevista: '2026-10-30',
                    status: 'pendente',
                    progresso: 0,
                    justificativa_atraso: '',
                    criado_em: emDias(-12, 9, 0)
                }
            ],
            obra_profissionais: [
                {
                    id: '66666666-6666-4666-8666-666666666601',
                    obra_id: '33333333-3333-4333-8333-333333333301',
                    profissional_id: '22222222-2222-4222-8222-222222222201',
                    funcao: 'Engenheiro responsável pela execução',
                    responsabilidade: 'Acompanhamento diário do canteiro',
                    criado_em: emDias(-40, 9, 0)
                }
            ],
            agendamentos: [
                {
                    id: '77777777-7777-4777-8777-777777777701',
                    obra_id: '33333333-3333-4333-8333-333333333301',
                    titulo: 'Vistoria da laje do 3º pavimento',
                    tipo: 'inspecao',
                    inicio: emDias(2, 9, 0),
                    fim: emDias(2, 10, 0),
                    responsavel_id: '22222222-2222-4222-8222-222222222201',
                    status: 'agendado',
                    observacoes: 'Levar checklist de fôrmas.',
                    criado_por: usuarioTeste.id,
                    criado_em: emDias(-2, 9, 0)
                },
                {
                    id: '77777777-7777-4777-8777-777777777702',
                    obra_id: '33333333-3333-4333-8333-333333333302',
                    titulo: 'Reunião de alinhamento com fornecedor',
                    tipo: 'reuniao',
                    inicio: emDias(5, 14, 0),
                    fim: emDias(5, 15, 30),
                    responsavel_id: null,
                    status: 'confirmado',
                    observacoes: '',
                    criado_por: usuarioTeste.id,
                    criado_em: emDias(-1, 9, 0)
                },
                {
                    id: '77777777-7777-4777-8777-777777777703',
                    obra_id: '33333333-3333-4333-8333-333333333301',
                    titulo: 'Compromisso cancelado',
                    tipo: 'visita_tecnica',
                    inicio: emDias(-3, 9, 0),
                    fim: emDias(-3, 10, 0),
                    responsavel_id: null,
                    status: 'cancelado',
                    observacoes: '',
                    criado_por: usuarioTeste.id,
                    criado_em: emDias(-8, 9, 0)
                }
            ],
            diario_obra: [
                {
                    id: '88888888-8888-4888-8888-888888888801',
                    obra_id: '33333333-3333-4333-8333-333333333301',
                    usuario_id: usuarioTeste.id,
                    data: emDias(-1, 9, 0).slice(0, 10),
                    clima: 'Ensolarado',
                    resumo_dia: 'Concretagem da laje do 2º pavimento concluída.',
                    observacoes_tecnicas: 'Cura úmida iniciada às 16h.',
                    criado_em: emDias(-1, 17, 0)
                }
            ],
            documentos_obra: [
                {
                    id: '99999999-9999-4999-8999-999999999901',
                    obra_id: '33333333-3333-4333-8333-333333333301',
                    diario_id: null,
                    titulo: 'Planta estrutural',
                    tipo: 'documento',
                    url_arquivo: 'https://exemplo.test/planta.pdf',
                    tamanho_bytes: 345678,
                    criado_por: usuarioTeste.id,
                    criado_em: emDias(-9, 9, 0)
                },
                {
                    id: '99999999-9999-4999-8999-999999999902',
                    obra_id: '33333333-3333-4333-8333-333333333301',
                    diario_id: null,
                    titulo: 'Registro fotográfico da concretagem',
                    tipo: 'imagem',
                    url_arquivo: 'https://exemplo.test/concretagem.jpg',
                    tamanho_bytes: 120000,
                    criado_por: usuarioTeste.id,
                    criado_em: emDias(-1, 18, 0)
                }
            ],
            historico_obra: [
                {
                    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
                    obra_id: '33333333-3333-4333-8333-333333333301',
                    usuario_id: usuarioTeste.id,
                    tipo: 'criacao',
                    descricao: 'Obra "Residencial Aurora" cadastrada com sucesso.',
                    criado_em: emDias(-45, 9, 30)
                },
                {
                    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
                    obra_id: '33333333-3333-4333-8333-333333333301',
                    usuario_id: usuarioTeste.id,
                    tipo: 'etapa',
                    descricao: 'Nova etapa "Fundação" cadastrada.',
                    criado_em: emDias(-40, 10, 0)
                }
            ]
        };
    }

    // O banco simulado é mantido em sessionStorage para sobreviver à
    // navegação entre páginas durante o teste.
    function carregarBanco() {
        try {
            const salvo = sessionStorage.getItem(CHAVE_BANCO);
            if (salvo) return JSON.parse(salvo);
        } catch (erro) {
            // Ignora conteúdo inválido e recria a base.
        }
        return criarBanco();
    }

    function salvarBanco() {
        try {
            sessionStorage.setItem(CHAVE_BANCO, JSON.stringify(banco));
        } catch (erro) {
            // Sem persistência disponível, o teste continua em memória.
        }
    }

    let banco = carregarBanco();
    let usuarioLogado = sessionStorage.getItem(CHAVE_SESSAO) === 'ativa' ? { ...usuarioTeste } : null;

    window.__CC_TESTE_LIMPAR = () => {
        banco = criarBanco();
        usuarioLogado = null;
        sessionStorage.removeItem(CHAVE_SESSAO);
        sessionStorage.removeItem(CHAVE_BANCO);
    };

    window.__CC_TESTE_BANCO = () => banco;

    const RELACOES = {
            obras: { cliente: 'cliente_id', criador: 'criado_por', profissionais: 'responsavel_id' },
        agendamentos: { obras: 'obra_id', profissionais: 'responsavel_id' },
        diario_obra: { usuarios: 'usuario_id' },
        historico_obra: { usuarios: 'usuario_id', obras: 'obra_id' },
        tarefas_obra: { profissionais: 'responsavel_id' },
        obra_profissionais: { profissionais: 'profissional_id' }
    };

    function clone(valor) {
        return valor === undefined ? undefined : JSON.parse(JSON.stringify(valor));
    }

    function enriquecer(tabela, registro) {
        if (!registro) return registro;
        const relacoes = RELACOES[tabela] || {};
        const saida = { ...registro };
        Object.keys(relacoes).forEach((nome) => {
            const chave = relacoes[nome];
            const valor = registro[chave];
            const base = nome === 'profissionais'
                ? banco.profissionais
                : (nome === 'cliente' || nome === 'criador' ? banco.usuarios : banco[nome]);
            const encontrado = (base || []).find((item) => item.id === valor);
            saida[nome] = encontrado ? { nome: encontrado.nome, especialidade: encontrado.especialidade } : null;
        });
        if (tabela === 'obra_profissionais') {
            const profissional = banco.profissionais.find((item) => item.id === registro.profissional_id);
            saida.profissionais = profissional ? clone(profissional) : null;
        }
        return saida;
    }

    function valorComparavel(valor) {
        return valor instanceof Date ? valor.toISOString() : valor;
    }

    function aplicarOr(registro, expressao) {
        const partes = String(expressao || '').split(',').filter(Boolean);
        return partes.some((parte) => {
            const [campo, operador, ...resto] = parte.split('.');
            const alvo = String(registro[campo] === null || registro[campo] === undefined ? '' : registro[campo]).toLowerCase();
            const texto = resto.join('.').replace(/%/g, '').toLowerCase();
            if (operador === 'ilike') return alvo.includes(texto);
            if (operador === 'eq') return alvo === texto;
            return false;
        });
    }

    function consulta(tabela) {
        const estado = {
            filtros: [],
            ou: null,
            ordem: null,
            limite: null,
            operacao: 'select',
            valores: null,
            unico: null,
            onConflict: null
        };

        const api = {
            select() {
                return api;
            },
            insert(valores) {
                estado.operacao = 'insert';
                estado.valores = Array.isArray(valores) ? valores : [valores];
                return api;
            },
            update(valores) {
                estado.operacao = 'update';
                estado.valores = valores;
                return api;
            },
            delete() {
                estado.operacao = 'delete';
                return api;
            },
            upsert(valores, opcoes) {
                estado.operacao = 'upsert';
                estado.valores = Array.isArray(valores) ? valores : [valores];
                estado.onConflict = (opcoes && opcoes.onConflict) || 'id';
                return api;
            },
            eq(campo, valor) {
                estado.filtros.push([campo, 'eq', valor]);
                return api;
            },
            is(campo, valor) {
                estado.filtros.push([campo, 'is', valor]);
                return api;
            },
            ilike(campo, valor) {
                estado.filtros.push([campo, 'ilike', valor]);
                return api;
            },
            or(expressao) {
                estado.ou = expressao;
                return api;
            },
            order(campo, opcoes) {
                estado.ordem = { campo, ascendente: !opcoes || opcoes.ascending !== false };
                return api;
            },
            limit(quantidade) {
                estado.limite = quantidade;
                return api;
            },
            maybeSingle() {
                estado.unico = 'maybe';
                return api;
            },
            single() {
                estado.unico = 'single';
                return api;
            },
            then(resolver, rejeitar) {
                return Promise.resolve(executar()).then(resolver, rejeitar);
            }
        };

        function filtrar() {
            let linhas = (banco[tabela] || []).filter((registro) => estado.filtros.every(([campo, operador, valor]) => {
                if (operador === 'eq') return registro[campo] === valor || String(registro[campo]) === String(valor);
                if (operador === 'is') return valor === null ? registro[campo] === null || registro[campo] === undefined : registro[campo] === valor;
                if (operador === 'ilike') {
                    return String(registro[campo] || '').toLowerCase().includes(String(valor || '').replace(/%/g, '').toLowerCase());
                }
                return true;
            }));
            if (estado.ou) linhas = linhas.filter((registro) => aplicarOr(registro, estado.ou));
            if (estado.ordem) {
                const { campo, ascendente } = estado.ordem;
                linhas = linhas.slice().sort((a, b) => {
                    const va = valorComparavel(a[campo]);
                    const vb = valorComparavel(b[campo]);
                    if (va === vb) return 0;
                    return (va > vb ? 1 : -1) * (ascendente ? 1 : -1);
                });
            }
            if (estado.limite) linhas = linhas.slice(0, estado.limite);
            return linhas.map((registro) => enriquecer(tabela, clone(registro)));
        }

        function resposta(linhas) {
            if (estado.unico === 'maybe') return { data: linhas[0] || null, error: null };
            if (estado.unico === 'single') return { data: linhas[0] || null, error: null };
            return { data: linhas, error: null };
        }

        function executar() {
            const falhas = window.__CC_TESTE_FALHAS || {};
            if (falhas[tabela]) {
                return { data: null, error: { message: `Falha simulada em ${tabela}`, code: 'TESTE', details: '' } };
            }

            if (estado.operacao === 'select') {
                return resposta(filtrar());
            }

            if (!Array.isArray(banco[tabela])) banco[tabela] = [];

            if (estado.operacao === 'insert') {
                const inseridos = estado.valores.map((valores) => {
                    const registro = { ...valores };
                    if (tabela === 'obras' && !Object.prototype.hasOwnProperty.call(registro, 'criado_por')) {
                        registro.criado_por = usuarioLogado ? usuarioLogado.id : null;
                    }
                    if (!registro.id) registro.id = crypto.randomUUID();
                    if (!registro.criado_em) registro.criado_em = new Date().toISOString();
                    banco[tabela].push(registro);
                    return registro;
                });
                salvarBanco();
                return { data: inseridos.map((registro) => enriquecer(tabela, clone(registro))), error: null };
            }

            if (estado.operacao === 'upsert') {
                const campos = String(estado.onConflict).split(',').map((campo) => campo.trim());
                const salvos = estado.valores.map((valores) => {
                    const existente = banco[tabela].find((registro) => campos.every((campo) => registro[campo] === valores[campo]));
                    if (existente) {
                        Object.assign(existente, valores);
                        return existente;
                    }
                    const registro = { ...valores };
                    if (!registro.id) registro.id = crypto.randomUUID();
                    if (!registro.criado_em) registro.criado_em = new Date().toISOString();
                    banco[tabela].push(registro);
                    return registro;
                });
                salvarBanco();
                return { data: salvos.map((registro) => enriquecer(tabela, clone(registro))), error: null };
            }

            if (estado.operacao === 'update') {
                const alvos = [];
                banco[tabela].forEach((registro) => {
                    const combina = estado.filtros.every(([campo, operador, valor]) => {
                        if (operador === 'eq') return registro[campo] === valor || String(registro[campo]) === String(valor);
                        if (operador === 'is') return valor === null ? registro[campo] === null || registro[campo] === undefined : registro[campo] === valor;
                        return true;
                    });
                    if (combina) {
                        Object.assign(registro, estado.valores, { atualizado_em: new Date().toISOString() });
                        alvos.push(registro);
                    }
                });
                salvarBanco();
                return { data: alvos.map((registro) => enriquecer(tabela, clone(registro))), error: null };
            }

            if (estado.operacao === 'delete') {
                const removidos = [];
                banco[tabela] = banco[tabela].filter((registro) => {
                    const combina = estado.filtros.every(([campo, operador, valor]) => (
                        operador === 'eq'
                            ? registro[campo] === valor || String(registro[campo]) === String(valor)
                            : true
                    ));
                    if (combina) removidos.push(registro);
                    return !combina;
                });
                salvarBanco();
                return { data: removidos.map((registro) => enriquecer(tabela, clone(registro))), error: null };
            }

            return { data: [], error: null };
        }

        return api;
    }

    function respostaDeSessao() {
        if (!usuarioLogado) {
            return { data: { user: null }, error: { name: 'AuthSessionMissingError', message: 'Auth session missing!' } };
        }
        return {
            data: {
                user: {
                    id: usuarioLogado.id,
                    email: usuarioLogado.email,
                    created_at: usuarioLogado.criado_em,
                    user_metadata: {
                        nome: usuarioLogado.nome,
                        tipo_usuario: usuarioLogado.tipo_usuario,
                        foto_perfil_url: usuarioLogado.foto_perfil_url
                    }
                }
            },
            error: null
        };
    }

    const autenticacao = {
        async getUser() {
            return respostaDeSessao();
        },
        async signInWithPassword({ email, password }) {
            if (password === 'senha-errada') {
                return { data: { user: null, session: null }, error: { message: 'Invalid login credentials', code: 'invalid_credentials' } };
            }
            usuarioLogado = { ...usuarioTeste, email };
            sessionStorage.setItem(CHAVE_SESSAO, 'ativa');
            return { data: { user: { id: usuarioLogado.id, email }, session: { access_token: 'teste' } }, error: null };
        },
        async signUp({ email, password, options }) {
            if (/existente/i.test(email)) {
                return { data: { user: null, session: null }, error: { message: 'User already registered', code: 'user_already_exists' } };
            }
            if (String(password || '').length < 6) {
                return { data: { user: null, session: null }, error: { message: 'Password should be at least 6 characters' } };
            }
            const meta = (options && options.data) || {};
            usuarioLogado = {
                ...usuarioTeste,
                nome: meta.nome || 'Novo usuário',
                email,
                tipo_usuario: meta.tipo_usuario || 'cliente'
            };
            sessionStorage.setItem(CHAVE_SESSAO, 'ativa');
            return { data: { user: { id: usuarioLogado.id, email }, session: { access_token: 'teste' } }, error: null };
        },
        async signOut() {
            usuarioLogado = null;
            sessionStorage.removeItem(CHAVE_SESSAO);
            return { error: null };
        },
        async resetPasswordForEmail() {
            return { error: null };
        },
        async updateUser({ data }) {
            if (usuarioLogado) {
                if (data && data.nome) usuarioLogado.nome = data.nome;
                if (data && data.foto_perfil_url !== undefined) usuarioLogado.foto_perfil_url = data.foto_perfil_url;
                const perfil = banco.usuarios.find((item) => item.id === usuarioLogado.id);
                if (perfil) Object.assign(perfil, data);
                salvarBanco();
            }
            return { data: {}, error: null };
        },
        onAuthStateChange() {
            return { data: { subscription: { unsubscribe() {} } } };
        }
    };

    const armazenamento = {
        from() {
            return {
                async upload(caminho, arquivo) {
                    if (window.__CC_TESTE_FALHA_STORAGE) {
                        return { data: null, error: { message: 'Bucket not found', statusCode: '404' } };
                    }
                    return { data: { path: caminho, fullPath: caminho }, error: null };
                },
                getPublicUrl(caminho) {
                    return { data: { publicUrl: `https://exemplo.test/storage/${caminho}` } };
                }
            };
        }
    };

    window.supabase = {
        createClient() {
            return {
                from: consulta,
                auth: autenticacao,
                storage: armazenamento
            };
        }
    };
})();
