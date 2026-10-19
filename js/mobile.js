/* ==========================================================================
   Civil Connection — Navegação e comportamento mobile
   ==========================================================================
   Injetado em todas as páginas. Responsabilidades:
   - barra superior, gaveta de navegação e barra inferior (somente no app);
   - foco, teclado, leitor de tela e bloqueio de rolagem da gaveta;
   - aviso de configuração ausente do Supabase;
   - melhoria progressiva de modais, abas, rótulos e alvos de toque.
   Nenhum dado de negócio é criado ou alterado aqui.
   ========================================================================== */

(function () {
    'use strict';

    const emPaginas = window.location.pathname.includes('/pages/');
    const arquivoAtual = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const raizIndex = emPaginas ? '../index.html' : 'index.html';
    const prefixo = emPaginas ? '' : 'pages/';
    const ehLogin = arquivoAtual === 'login.html' || !!document.getElementById('auth-form');
    const temShell = !!document.querySelector('body > aside');

    const DESTINOS = [
        { id: 'visao', rotulo: 'Visão Geral', icone: 'grid_view', href: raizIndex },
        { id: 'obras', rotulo: 'Obras', icone: 'foundation', href: `${prefixo}obras.html` },
        { id: 'agenda', rotulo: 'Agenda', icone: 'calendar_month', href: `${prefixo}agenda.html` },
        { id: 'profissionais', rotulo: 'Profissionais', icone: 'badge', href: `${prefixo}profissionais.html` },
        { id: 'relatorios', rotulo: 'Relatórios', icone: 'description', href: `${prefixo}relatorios.html` }
    ];

    const ACOES_RAPIDAS = [
        { rotulo: 'Nova obra', icone: 'add_circle', href: `${prefixo}cadastro-obra.html` },
        { rotulo: 'Novo profissional / fornecedor', icone: 'person_add', href: `${prefixo}cadastro-profissional.html` }
    ];

    let drawer = null;
    let botaoMenu = null;
    let painelDrawer = null;
    let focoAntesDrawer = null;
    let observadorModais = null;
    let observadorConteudo = null;
    let ultimoFocoModal = null;

    function paginaAtiva() {
        if (arquivoAtual === 'index.html' || arquivoAtual === '') return 'visao';
        if (['obras.html', 'obra-detalhes.html', 'cadastro-obra.html'].includes(arquivoAtual)) return 'obras';
        if (['agenda.html'].includes(arquivoAtual)) return 'agenda';
        if (['profissionais.html', 'cadastro-profissional.html'].includes(arquivoAtual)) return 'profissionais';
        if (['relatorios.html'].includes(arquivoAtual)) return 'relatorios';
        return 'visao';
    }

    function icone(nome, classe) {
        return `<span class="material-symbols-outlined ${classe || ''}" aria-hidden="true">${nome}</span>`;
    }

    function linkNav(destino, atual, classeExtra) {
        const ativo = destino.id === atual;
        return `
            <a class="${classeExtra || 'cc-drawer__link'}" href="${destino.href}"
               ${ativo ? 'aria-current="page"' : ''} data-cc-destino="${destino.id}">
                ${icone(destino.icone)}
                <span>${destino.rotulo}</span>
            </a>
        `;
    }

    function criarNavegacao() {
        if (!temShell || ehLogin) return;

        document.body.classList.add('cc-app');
        const shell = document.querySelector('.pl-64');
        if (shell) shell.classList.add('cc-shell');
        const main = document.querySelector('main');
        if (main) main.classList.add('cc-main');

        const atual = paginaAtiva();
        const rotuloAtual = (DESTINOS.find((destino) => destino.id === atual) || DESTINOS[0]).rotulo;

        // Barra superior.
        const topbar = document.createElement('header');
        topbar.className = 'cc-topbar';
        topbar.setAttribute('data-cc-topbar', '');
        topbar.innerHTML = `
            <button type="button" class="cc-topbar__botao" id="cc-botao-menu"
                    aria-label="Abrir menu de navegação" aria-expanded="false" aria-controls="cc-menu-drawer">
                ${icone('menu')}
            </button>
            <a class="cc-topbar__marca" href="${raizIndex}" aria-label="Civil Connection — ir para a visão geral">
                <img src="${emPaginas ? '../' : ''}assets/images/civil_connection_logo.png" alt="" />
                <span>
                    <strong>Civil Connection</strong>
                    <small>${rotuloAtual}</small>
                </span>
            </a>
            <a class="cc-topbar__botao cc-topbar__botao--primario" href="${prefixo}cadastro-obra.html"
               aria-label="Cadastrar nova obra" title="Cadastrar nova obra">
                ${icone('add')}
            </a>
        `;
        document.body.appendChild(topbar);
        botaoMenu = topbar.querySelector('#cc-botao-menu');

        // Gaveta.
        drawer = document.createElement('div');
        drawer.id = 'cc-menu-drawer';
        drawer.className = 'cc-drawer';
        drawer.setAttribute('data-aberto', 'false');
        drawer.setAttribute('aria-hidden', 'true');
        drawer.innerHTML = `
            <button type="button" class="cc-drawer__fundo" tabindex="-1" aria-label="Fechar menu" data-cc-fechar-drawer></button>
            <div class="cc-drawer__painel" role="dialog" aria-modal="true" aria-labelledby="cc-drawer-titulo" tabindex="-1">
                <h2 id="cc-drawer-titulo" class="cc-sr-only">Menu de navegação</h2>
                <div class="cc-drawer__cabecalho">
                    <img src="${emPaginas ? '../' : ''}assets/images/civil_connection_logo.png" alt="" />
                    <div>
                        <strong>Civil Connection</strong>
                        <span>Gestão integrada</span>
                    </div>
                    <button type="button" class="cc-drawer__fechar" aria-label="Fechar menu" data-cc-fechar-drawer>
                        ${icone('close')}
                    </button>
                </div>

                <div class="cc-drawer__secao">
                    <span class="cc-drawer__rotulo">Navegação</span>
                    <nav class="cc-drawer__links" aria-label="Navegação principal">
                        ${DESTINOS.map((destino) => linkNav(destino, atual)).join('')}
                    </nav>
                </div>

                <div class="cc-drawer__secao">
                    <span class="cc-drawer__rotulo">Cadastros</span>
                    <div class="cc-drawer__links">
                        ${ACOES_RAPIDAS.map((acao) => `
                            <a class="cc-drawer__link" href="${acao.href}">
                                ${icone(acao.icone)}
                                <span>${acao.rotulo}</span>
                            </a>
                        `).join('')}
                    </div>
                </div>

                <div class="cc-drawer__rodape">
                    <span class="cc-drawer__rotulo">Conta</span>
                    <div class="cc-drawer__usuario">
                        <button type="button" class="cc-drawer__avatar" id="cc-drawer-avatar"
                                aria-label="Alterar foto de perfil" title="Alterar foto de perfil">
                            <span aria-hidden="true">?</span>
                        </button>
                        <div class="cc-drawer__usuario-texto">
                            <strong id="cc-drawer-nome">Carregando…</strong>
                            <span id="cc-drawer-papel">Verificando sessão</span>
                        </div>
                        <button type="button" class="cc-drawer__link" id="cc-drawer-foto"
                                style="width:44px; min-height:44px; justify-content:center; padding:0;"
                                aria-label="Alterar foto de perfil" title="Alterar foto de perfil">
                            ${icone('photo_camera')}
                        </button>
                    </div>
                    <button type="button" class="cc-drawer__sair" id="cc-drawer-sair">
                        ${icone('logout')}
                        <span>Sair da conta</span>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(drawer);
        painelDrawer = drawer.querySelector('.cc-drawer__painel');

        // Barra inferior.
        const bottomnav = document.createElement('nav');
        bottomnav.className = 'cc-bottomnav';
        bottomnav.setAttribute('aria-label', 'Navegação rápida');
        bottomnav.innerHTML = DESTINOS.map((destino) => {
            const ativo = destino.id === atual;
            return `
                <a href="${destino.href}" ${ativo ? 'aria-current="page"' : ''} data-cc-destino="${destino.id}">
                    ${icone(destino.icone)}
                    <span>${destino.rotulo}</span>
                </a>
            `;
        }).join('');
        document.body.appendChild(bottomnav);

        // Eventos da gaveta.
        botaoMenu.addEventListener('click', abrirDrawer);
        drawer.querySelectorAll('[data-cc-fechar-drawer]').forEach((el) => {
            el.addEventListener('click', () => fecharDrawer());
        });
        drawer.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => fecharDrawer({ restaurarFoco: false }));
        });

        const botaoFoto = drawer.querySelector('#cc-drawer-foto');
        const avatar = drawer.querySelector('#cc-drawer-avatar');
        [botaoFoto, avatar].forEach((botao) => {
            if (!botao) return;
            botao.addEventListener('click', () => {
                fecharDrawer({ restaurarFoco: false });
                window.setTimeout(() => {
                    if (typeof window.abrirModalFotoPerfil === 'function') {
                        window.abrirModalFotoPerfil();
                    } else {
                        window.ccUI.mostrarAviso('A edição de foto de perfil não está disponível nesta página.', 'aviso');
                    }
                }, 180);
            });
        });

        const sair = drawer.querySelector('#cc-drawer-sair');
        if (sair) {
            sair.addEventListener('click', async () => {
                fecharDrawer({ restaurarFoco: false });
                if (typeof window.handleLogout === 'function') {
                    window.handleLogout();
                    return;
                }
                try {
                    await window.dbService.logoutUser();
                    window.location.href = emPaginas ? 'login.html' : 'pages/login.html';
                } catch (erro) {
                    window.ccUI.mostrarAviso(window.ccUI.mensagemErroDados(erro), 'erro');
                }
            });
        }

        document.addEventListener('keydown', teclasDrawer);
        const mediaDesktop = window.matchMedia('(min-width: 1024px)');
        const aoMudarMedia = (evento) => {
            if (evento.matches) fecharDrawer({ restaurarFoco: false });
        };
        if (typeof mediaDesktop.addEventListener === 'function') {
            mediaDesktop.addEventListener('change', aoMudarMedia);
        } else if (typeof mediaDesktop.addListener === 'function') {
            mediaDesktop.addListener(aoMudarMedia);
        }

        atualizarUsuario(null);
    }

    function abrirDrawer() {
        if (!drawer) return;
        focoAntesDrawer = document.activeElement;
        drawer.setAttribute('data-aberto', 'true');
        drawer.setAttribute('aria-hidden', 'false');
        if (botaoMenu) botaoMenu.setAttribute('aria-expanded', 'true');
        document.body.classList.add('cc-drawer-aberto');
        // inert é ideal para acessibilidade, mas nem todos os navegadores suportam; fallback para aria-hidden
        document.querySelectorAll('.cc-topbar, .cc-bottomnav, main').forEach((el) => {
            if ('inert' in el) el.inert = true;
            else el.setAttribute('aria-hidden', 'true');
            // Também tenta o atributo para compatibilidade
            try { el.setAttribute('inert', ''); } catch (e) {}
        });
        const fechar = drawer.querySelector('.cc-drawer__fechar');
        if (fechar) fechar.focus({ preventScroll: true });
        else if (painelDrawer) painelDrawer.focus({ preventScroll: true });
    }

    function fecharDrawer(opcoes) {
        if (!drawer) return;
        const cfg = opcoes || {};
        const estavaAberto = drawer.getAttribute('data-aberto') === 'true';
        drawer.setAttribute('data-aberto', 'false');
        drawer.setAttribute('aria-hidden', 'true');
        if (botaoMenu) botaoMenu.setAttribute('aria-expanded', 'false');
        if (!document.querySelector('.cc-modal:not(.hidden)') && !document.querySelector('#lightbox-galeria:not(.hidden)')) {
            document.body.classList.remove('cc-drawer-aberto');
        }
        document.querySelectorAll('.cc-topbar, .cc-bottomnav, main').forEach((el) => {
            if ('inert' in el) el.inert = false;
            el.removeAttribute('inert');
            el.removeAttribute('aria-hidden');
        });
        if (estavaAberto && cfg.restaurarFoco !== false && botaoMenu && document.contains(botaoMenu)) {
            try { botaoMenu.focus({ preventScroll: true }); } catch (e) { botaoMenu.focus(); }
        }
        focoAntesDrawer = null;
    }

    function teclasDrawer(evento) {
        if (!drawer || drawer.getAttribute('data-aberto') !== 'true') return;
        if (evento.key === 'Escape') {
            evento.preventDefault();
            fecharDrawer();
            return;
        }
        if (evento.key !== 'Tab' || !painelDrawer) return;

        const focaveis = Array.from(painelDrawer.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
            .filter((el) => el.offsetParent !== null);
        if (!focaveis.length) return;
        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];

        if (evento.shiftKey && document.activeElement === primeiro) {
            evento.preventDefault();
            ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
            evento.preventDefault();
            primeiro.focus();
        }
    }

    function rotuloPapel(usuario) {
        if (!usuario) return 'Sessão não identificada';
        const mapa = {
            administrador: 'Administrador',
            profissional: 'Profissional técnico',
            cliente: 'Cliente'
        };
        return mapa[usuario.tipo_usuario] || 'Usuário';
    }

    function atualizarUsuario(usuario) {
        const nomeEl = document.getElementById('cc-drawer-nome');
        const papelEl = document.getElementById('cc-drawer-papel');
        const avatar = document.getElementById('cc-drawer-avatar');
        if (!nomeEl || !papelEl) return;

        const nome = (usuario && usuario.nome) ? String(usuario.nome) : 'Usuário';
        nomeEl.textContent = nome;
        papelEl.textContent = rotuloPapel(usuario);

        if (avatar) {
            avatar.replaceChildren();
            const foto = usuario && usuario.foto_perfil_url;
            if (foto && /^(https?:\/\/|data:image\/)/i.test(String(foto))) {
                const img = document.createElement('img');
                img.src = foto;
                img.alt = '';
                img.loading = 'lazy';
                img.addEventListener('error', () => {
                    avatar.replaceChildren(document.createTextNode((nome.charAt(0) || 'U').toUpperCase()));
                });
                avatar.appendChild(img);
            } else {
                avatar.appendChild(document.createTextNode((nome.charAt(0) || 'U').toUpperCase()));
            }
        }
    }

    async function carregarUsuarioDrawer() {
        if (!window.dbService || ehLogin) return;
        try {
            if (!window.dbService.isConfigured()) {
                atualizarUsuario(null);
                return;
            }
            const usuario = await window.dbService.getCurrentUser();
            atualizarUsuario(usuario);
        } catch (erro) {
            atualizarUsuario(null);
        }
    }

    function exibirAlertaConfiguracao(info) {
        if (!info || info.configurado) {
            const existente = document.getElementById('cc-config-alerta');
            if (existente) existente.remove();
            return;
        }

        let alerta = document.getElementById('cc-config-alerta');
        if (!alerta) {
            alerta = document.createElement('div');
            alerta.id = 'cc-config-alerta';
            alerta.className = 'cc-config-alerta';
            alerta.setAttribute('role', 'alert');
        }

        alerta.replaceChildren();
        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = 'settings';

        const texto = document.createElement('div');
        const titulo = document.createElement('strong');
        titulo.textContent = 'Conexão com o Supabase não configurada';
        const descricao = document.createElement('span');
        descricao.textContent = info.erro || 'Preencha js/supabase-config.js com a URL e a chave anon do projeto.';
        const acoes = document.createElement('div');
        acoes.className = 'cc-config-alerta__acoes';
        const recarregar = document.createElement('button');
        recarregar.type = 'button';
        recarregar.textContent = 'Recarregar página';
        recarregar.addEventListener('click', () => window.location.reload());
        acoes.appendChild(recarregar);

        texto.appendChild(titulo);
        texto.appendChild(descricao);
        texto.appendChild(acoes);
        alerta.appendChild(icon);
        alerta.appendChild(texto);

        const main = document.querySelector('main');
        if (main) {
            const existente = main.querySelector('#cc-config-alerta');
            if (existente) existente.remove();
            main.prepend(alerta);
        } else {
            document.body.prepend(alerta);
        }
    }

    function verificarConfiguracao() {
        if (!window.dbService) return;
        try {
            exibirAlertaConfiguracao(window.dbService.getConfigInfo());
        } catch (erro) {
            exibirAlertaConfiguracao({ configurado: false, erro: 'Não foi possível verificar a configuração do Supabase.' });
        }
    }

    function marcarPagina() {
        const main = document.querySelector('main');
        if (main && !main.id) main.id = 'conteudo-principal';

        if (ehLogin) document.body.classList.add('cc-auth');

        document.body.classList.add('cc-page-' + (arquivoAtual.replace('.html', '') || 'raiz'));

        // Cabeçalho de página.
        const h1 = document.querySelector('main h1');
        if (h1) {
            let bloco = h1.parentElement;
            for (let i = 0; i < 4 && bloco && bloco !== main; i += 1) {
                if (bloco.classList.contains('justify-between') &&
                    (bloco.classList.contains('md:flex-row') || bloco.classList.contains('sm:flex-row'))) {
                    bloco.classList.add('cc-page-header');
                    break;
                }
                bloco = bloco.parentElement;
            }
        }

        // Filtros: os três seletores de filtro também fazem parte da barra,
        // mesmo quando a busca tem outro id ou está ausente.
        ['busca-obra', 'busca-agenda', 'busca-profissional', 'filtro-cidade-obra', 'filtro-obra-agenda', 'filtro-especialidade'].forEach((id) => {
            const campo = document.getElementById(id);
            const barra = campo && campo.closest('.bg-surface-card');
            if (barra) barra.classList.add('cc-filter-bar');
            const acoes = campo && campo.closest('.bg-surface-card') &&
                campo.closest('.bg-surface-card').querySelector('.flex.items-center.gap-space-sm');
            if (acoes) acoes.classList.add('cc-filter-actions');
            if (campo) {
                campo.setAttribute('type', 'search');
                campo.setAttribute('autocomplete', 'off');
            }
        });

        // Grids de cards.
        ['lista-obras', 'lista-profissionais', 'lista-agendamentos'].forEach((id) => {
            const grid = document.getElementById(id);
            if (grid) grid.classList.add('cc-card-grid');
        });

        // Indicadores do dashboard.
        const metrica = document.getElementById('dash-total-obras');
        const secaoMetricas = metrica && metrica.closest('section');
        if (secaoMetricas) secaoMetricas.classList.add('cc-metric-grid');

        // Abas da obra.
        const primeiraAba = document.getElementById('tab-btn-etapas');
        const tablist = primeiraAba && primeiraAba.parentElement;
        if (tablist) {
            tablist.classList.add('cc-tabs');
            tablist.setAttribute('role', 'tablist');
            tablist.setAttribute('aria-label', 'Seções da obra');
            ['etapas', 'diario', 'equipe', 'historico'].forEach((nome) => {
                const botao = document.getElementById('tab-btn-' + nome);
                const painel = document.getElementById('tab-content-' + nome);
                if (botao) {
                    botao.setAttribute('role', 'tab');
                    botao.setAttribute('aria-controls', 'tab-content-' + nome);
                    const visivel = !painel || !painel.classList.contains('hidden');
                    botao.setAttribute('aria-selected', visivel ? 'true' : 'false');
                    botao.setAttribute('tabindex', visivel ? '0' : '-1');
                }
                if (painel) {
                    painel.setAttribute('role', 'tabpanel');
                    if (botao) painel.setAttribute('aria-labelledby', 'tab-btn-' + nome);
                    painel.setAttribute('tabindex', '0');
                }
            });

            tablist.addEventListener('keydown', (evento) => {
                const abas = Array.from(tablist.querySelectorAll('[role="tab"]'));
                const atual = abas.indexOf(document.activeElement);
                if (atual === -1) return;
                let destino = null;
                if (evento.key === 'ArrowRight') destino = abas[(atual + 1) % abas.length];
                if (evento.key === 'ArrowLeft') destino = abas[(atual - 1 + abas.length) % abas.length];
                if (evento.key === 'Home') destino = abas[0];
                if (evento.key === 'End') destino = abas[abas.length - 1];
                if (!destino) return;
                evento.preventDefault();
                destino.focus();
                destino.click();
            });
        }

        // Formulários: grades, ações e rótulos.
        document.querySelectorAll('form').forEach((form) => {
            form.classList.add('cc-form');
            form.querySelectorAll('.grid-cols-2').forEach((grid) => grid.classList.add('cc-form-grid'));
            const submit = form.querySelector('button[type="submit"]');
            if (submit) {
                const linha = submit.parentElement;
                if (linha && linha !== form) linha.classList.add('cc-form-acoes');
            }
            form.querySelectorAll('input, select, textarea').forEach((campo) => {
                if (!campo.id) return;
                if (campo.required) campo.setAttribute('aria-required', 'true');
                if (campo.tagName === 'SELECT' && !campo.getAttribute('aria-label')) {
                    const rotulos = {
                        'tipo-registro-prof': 'Tipo de registro',
                        'especialidade-prof': 'Especialidade',
                        'filtro-cidade-obra': 'Filtrar obras por cidade',
                        'filtro-status-obra': 'Filtrar obras por status',
                        'filtro-obra-agenda': 'Filtrar agenda por obra',
                        'filtro-status-agenda': 'Filtrar agenda por status',
                        'filtro-tipo-registro': 'Filtrar por tipo de registro',
                        'filtro-especialidade': 'Filtrar por especialidade',
                        'filtro-cidade': 'Filtrar por cidade'
                    };
                    if (rotulos[campo.id]) campo.setAttribute('aria-label', rotulos[campo.id]);
                }
                if (!campo.getAttribute('aria-label') && campo.type !== 'hidden' && campo.type !== 'checkbox' && campo.type !== 'radio') {
                    const seletor = window.CSS && typeof window.CSS.escape === 'function'
                        ? `label[for="${window.CSS.escape(campo.id)}"]`
                        : `label[for="${campo.id}"]`;
                    const label = form.querySelector(seletor) ||
                        (campo.closest('.flex.flex-col') && campo.closest('.flex.flex-col').querySelector('label'));
                    if (label && !label.htmlFor) label.htmlFor = campo.id;
                }
            });
        });

        // Campos de busca e filtros que ficam fora de <form>.
        const rotulosAvulsos = {
            'busca-obra': 'Buscar obras por nome ou descrição',
            'busca-agenda': 'Buscar compromissos por título',
            'busca-profissional': 'Buscar profissionais por nome ou especialidade',
            'filtro-cidade-obra': 'Filtrar obras por cidade',
            'filtro-status-obra': 'Filtrar obras por status',
            'filtro-obra-agenda': 'Filtrar agenda por obra',
            'filtro-status-agenda': 'Filtrar agenda por status',
            'filtro-tipo-registro': 'Filtrar por tipo de registro',
            'filtro-especialidade': 'Filtrar por especialidade',
            'filtro-cidade': 'Filtrar por cidade'
        };
        Object.keys(rotulosAvulsos).forEach((id) => {
            const campo = document.getElementById(id);
            if (campo && !campo.getAttribute('aria-label')) campo.setAttribute('aria-label', rotulosAvulsos[id]);
        });

        const buscaGlobal = document.querySelector('header input[placeholder*="Buscar obras"]');
        if (buscaGlobal && !buscaGlobal.getAttribute('aria-label')) {
            buscaGlobal.setAttribute('aria-label', 'Buscar obras, etapas e fornecedores');
            buscaGlobal.setAttribute('type', 'search');
        }
    }

    function aprimorarIcones(raiz) {
        const escopo = raiz || document;
        escopo.querySelectorAll('.material-symbols-outlined').forEach((el) => {
            if (!el.hasAttribute('aria-hidden')) el.setAttribute('aria-hidden', 'true');
        });

        escopo.querySelectorAll('button, a, [role="button"]').forEach((el) => {
            const nomeAtual = el.getAttribute('aria-label') || el.getAttribute('title');
            if (nomeAtual) {
                if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', nomeAtual);
                return;
            }
            const textoVisivel = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (textoVisivel) return;

            const onclick = String(el.getAttribute('onclick') || '');
            let rotulo = '';
            if (/solicitarExclusaoObra/.test(onclick)) rotulo = 'Excluir obra';
            else if (/deletarTarefa/.test(onclick)) rotulo = 'Excluir tarefa';
            else if (/removerProfissionalEquipe/.test(onclick)) rotulo = 'Remover profissional da equipe';
            else if (/fecharModal|classList\.add\('hidden'\)/.test(onclick)) rotulo = 'Fechar';
            else if (/abrirLightbox/.test(onclick)) rotulo = 'Ampliar imagem';
            else if (/exportarRelatorioCSV/.test(onclick)) rotulo = 'Exportar relatório em CSV';
            else if (/imprimirRelatorioPDF/.test(onclick)) rotulo = 'Imprimir ou salvar em PDF';
            if (rotulo) el.setAttribute('aria-label', rotulo);
        });
    }

    function ehModal(modal) {
        if (!(modal instanceof HTMLElement)) return false;
        if (!modal.id && !modal.classList.contains('cc-modal')) {
            // Modais dinâmicos sempre usam a combinação fixed + inset-0 + z-50.
            const classes = modal.className || '';
            if (!(classes.includes('fixed') && classes.includes('inset-0') && classes.includes('z-50'))) return false;
        }
        return !modal.classList.contains('cc-drawer') &&
            !modal.classList.contains('cc-toasts') &&
            !modal.classList.contains('cc-topbar') &&
            !modal.classList.contains('cc-bottomnav');
    }

    const modaisPreparados = new WeakSet();

    function prepararModal(modal) {
        if (!ehModal(modal) || modaisPreparados.has(modal)) return;
        modaisPreparados.add(modal);

        if (modal.getAttribute('role') === 'alertdialog') return; // gerenciado por ccUI.confirmarAcao

        const ehLightbox = modal.id === 'lightbox-galeria';
        if (!ehLightbox) modal.classList.add('cc-modal');

        const painel = ehLightbox ? modal : modal.firstElementChild;
        if (painel && !ehLightbox && !painel.classList.contains('cc-modal__painel')) {
            painel.classList.add('cc-modal__painel');
        }

        if (!modal.hasAttribute('role')) modal.setAttribute('role', 'dialog');
        if (!ehLightbox) modal.setAttribute('aria-modal', 'true');

        const titulo = painel && painel.querySelector('h1, h2, h3');
        if (titulo) {
            if (!titulo.id) titulo.id = `${modal.id || 'cc-modal'}-titulo`;
            modal.setAttribute('aria-labelledby', titulo.id);
        } else if (ehLightbox) {
            const tituloLightbox = document.getElementById('lightbox-title');
            if (tituloLightbox) modal.setAttribute('aria-labelledby', 'lightbox-title');
        }

        // Rótulos de botões apenas com ícone.
        if (painel) {
            painel.querySelectorAll('button').forEach((botao) => {
                if (!botao.getAttribute('aria-label')) {
                    const text = (botao.textContent || '').trim();
                    const temIcone = !!botao.querySelector('.material-symbols-outlined');
                    if (temIcone && (!text || text === 'close')) botao.setAttribute('aria-label', text === 'close' ? 'Fechar' : 'Fechar');
                }
            });
        }

        let aberto = false;
        let focoAnterior = null;

        const aoTeclar = (evento) => {
            if (!aberto) return;
            if (evento.key === 'Escape') {
                evento.preventDefault();
                modal.classList.add('hidden');
                return;
            }
            if (evento.key !== 'Tab') return;
            const focaveis = Array.from(modal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
                .filter((el) => el.offsetParent !== null);
            if (!focaveis.length) return;
            const primeiro = focaveis[0];
            const ultimo = focaveis[focaveis.length - 1];
            if (evento.shiftKey && document.activeElement === primeiro) {
                evento.preventDefault();
                ultimo.focus();
            } else if (!evento.shiftKey && document.activeElement === ultimo) {
                evento.preventDefault();
                primeiro.focus();
            }
        };

        const abrir = () => {
            aberto = true;
            focoAnterior = document.activeElement;
            modal.setAttribute('aria-hidden', 'false');
            modal.style.display = '';
            document.body.classList.add('cc-modal-aberto');
            document.addEventListener('keydown', aoTeclar);
            const alvo = modal.querySelector('input:not([type="hidden"]):not([disabled]), textarea, select, button:not([disabled]), [href]');
            if (alvo) {
                window.setTimeout(() => alvo.focus({ preventScroll: true }), 30);
            }
        };

        const fechar = () => {
            if (!aberto) return;
            aberto = false;
            modal.setAttribute('aria-hidden', 'true');
            document.removeEventListener('keydown', aoTeclar);
            if (!document.querySelectorAll('.cc-modal:not(.hidden), #lightbox-galeria:not(.hidden)').length) {
                document.body.classList.remove('cc-modal-aberto');
            }
            if (focoAnterior && typeof focoAnterior.focus === 'function' && document.contains(focoAnterior)) {
                focoAnterior.focus({ preventScroll: true });
            }
            focoAnterior = null;
        };

        const atualizarEstado = () => {
            const estaAberto = !modal.classList.contains('hidden') && modal.getAttribute('aria-hidden') !== 'true';
            if (estaAberto && !aberto) abrir();
            if (!estaAberto && aberto) fechar();
        };

        modal.addEventListener('click', (evento) => {
            if (evento.target === modal) modal.classList.add('hidden');
        });
        modal.addEventListener('transitionend', atualizarEstado);

        const observador = new MutationObserver(atualizarEstado);
        observador.observe(modal, { attributes: true, attributeFilter: ['class', 'style'] });
        atualizarEstado();
    }

    function prepararTodosOsModais() {
        document.querySelectorAll('.fixed.inset-0.z-50, body > .cc-modal, #lightbox-galeria, body > div[id^="modal-"]').forEach(prepararModal);
    }

    function observarConteudo() {
        if (observadorConteudo) return;
        let agendado = false;
        observadorConteudo = new MutationObserver(() => {
            if (agendado) return;
            agendado = true;
            window.requestAnimationFrame(() => {
                agendado = false;
                prepararTodosOsModais();
                aprimorarIcones(document);
            });
        });
        observadorConteudo.observe(document.body, { childList: true, subtree: true });
    }

    function criarPularConteudo() {
        if (document.querySelector('.cc-pular-conteudo')) return;
        const main = document.querySelector('main');
        if (!main) return;
        if (!main.id) main.id = 'conteudo-principal';
        const link = document.createElement('a');
        link.className = 'cc-pular-conteudo';
        link.href = '#' + main.id;
        link.textContent = 'Pular para o conteúdo principal';
        link.addEventListener('click', () => {
            main.setAttribute('tabindex', '-1');
            main.focus({ preventScroll: true });
        });
        document.body.prepend(link);
    }

    function atualizarAbaAtiva() {
        // Chamado após switchObraTab (etapas.js) para manter os atributos ARIA.
        ['etapas', 'diario', 'equipe', 'historico'].forEach((nome) => {
            const botao = document.getElementById('tab-btn-' + nome);
            const painel = document.getElementById('tab-content-' + nome);
            if (!botao || !painel) return;
            const visivel = !painel.classList.contains('hidden');
            botao.setAttribute('aria-selected', visivel ? 'true' : 'false');
            botao.setAttribute('tabindex', visivel ? '0' : '-1');
        });
    }

    function iniciar() {
        criarPularConteudo();
        marcarPagina();
        criarNavegacao();
        aprimorarIcones(document);
        prepararTodosOsModais();
        observarConteudo();

        verificarConfiguracao();
        window.addEventListener('civil:supabase-pronto', (evento) => {
            exibirAlertaConfiguracao(evento.detail);
            carregarUsuarioDrawer();
        });
        window.addEventListener('civil:usuario', (evento) => {
            atualizarUsuario(evento.detail);
        });
        window.addEventListener('civil:aviso', (evento) => {
            const detalhe = evento.detail || {};
            if (window.ccUI) window.ccUI.mostrarAviso(detalhe.mensagem || '', detalhe.tipo || 'aviso');
        });

        // Fallback caso o evento de Supabase já tenha ocorrido.
        verificarConfiguracao();
        carregarUsuarioDrawer();

        // Abas: sincroniza ARIA depois de cada troca.
        document.addEventListener('click', (evento) => {
            const alvo = evento.target instanceof Element ? evento.target.closest('[id^="tab-btn-"]') : null;
            if (alvo) window.setTimeout(atualizarAbaAtiva, 0);
        });

        // Formulários longos: leva o campo focado para uma área visível acima do teclado.
        document.addEventListener('focusin', (evento) => {
            const alvo = evento.target;
            if (!(alvo instanceof HTMLElement)) return;
            if (!alvo.matches('input, select, textarea')) return;
            if (window.matchMedia('(max-width: 1023.98px)').matches) {
                window.setTimeout(() => {
                    const rect = alvo.getBoundingClientRect();
                    if (rect.bottom > window.innerHeight - 120) {
                        alvo.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    }
                }, 250);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', iniciar);
})();
