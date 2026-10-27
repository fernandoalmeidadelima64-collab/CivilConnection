/* ==========================================================================
   Civil Connection — Painel do Gestor
   ==========================================================================
   Carrega métricas administrativas, lista de usuários cadastrados e o
   status consolidado das obras do sistema. Exige perfil gestor ou administrador.
   ========================================================================== */

(function () {
    'use strict';

    let gestorDados = null;

    async function verificarPermissao() {
        if (!window.dbService || !window.dbService.isConfigured()) return false;
        try {
            const usuario = await window.dbService.getCurrentUser();
            if (!usuario || (usuario.tipo_usuario !== 'gestor' && usuario.tipo_usuario !== 'administrador')) {
                return false;
            }
            return true;
        } catch (erro) {
            return false;
        }
    }

    function renderizarAcessoNegado() {
        const container = document.getElementById('gestor-container');
        if (!container) return;
        container.innerHTML = `
            <div class="bg-surface-card rounded-xl p-space-xl text-center shadow-md my-space-xl border border-border-subtle max-w-2xl mx-auto flex flex-col items-center gap-space-md">
                <span class="material-symbols-outlined text-error text-5xl" aria-hidden="true">lock</span>
                <h1 class="font-headline-md text-headline-md text-on-surface font-bold">Acesso Restrito ao Gestor</h1>
                <p class="font-body-md text-body-md text-on-surface-variant">
                    Seu perfil atual não possui privilégios de gestor ou administrador da plataforma.
                </p>
                <a href="../index.html" class="inline-flex items-center gap-space-xs px-space-lg py-2.5 rounded-lg bg-status-em-andamento text-on-primary font-label-md text-label-md shadow-sm hover:bg-secondary transition-all">
                    <span class="material-symbols-outlined text-[18px]">arrow_back</span>
                    <span>Voltar à Visão Geral</span>
                </a>
            </div>
        `;
    }

    function atualizarMetricas(metricas) {
        const elUsuarios = document.getElementById('gestor-metric-usuarios');
        const elClientes = document.getElementById('gestor-metric-clientes');
        const elProfissionais = document.getElementById('gestor-metric-profissionais');
        const elObras = document.getElementById('gestor-metric-obras');
        const elAtivas = document.getElementById('gestor-metric-ativas');
        const elProgresso = document.getElementById('gestor-metric-progresso');

        if (elUsuarios) elUsuarios.textContent = metricas.totalUsuarios || 0;
        if (elClientes) elClientes.textContent = metricas.totalClientes || 0;
        if (elProfissionais) elProfissionais.textContent = metricas.totalProfissionaisCadastrados || 0;
        if (elObras) elObras.textContent = metricas.totalObras || 0;
        if (elAtivas) elAtivas.textContent = metricas.obrasEmAndamento || 0;
        if (elProgresso) elProgresso.textContent = `${metricas.progressoMedio || 0}%`;
    }

    function formatarBadgeRole(tipo) {
        const mapa = {
            cliente: { rotulo: 'Cliente', classe: 'bg-surface-subtle text-on-surface-variant' },
            profissional: { rotulo: 'Profissional', classe: 'bg-primary-container/10 text-primary font-semibold' },
            gestor: { rotulo: 'Gestor', classe: 'bg-status-em-andamento/15 text-status-em-andamento font-bold' },
            administrador: { rotulo: 'Administrador', classe: 'bg-status-concluida/15 text-status-concluida font-bold' }
        };
        const cfg = mapa[tipo] || { rotulo: tipo || 'Usuário', classe: 'bg-surface-subtle text-on-surface' };
        return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-caption font-caption ${cfg.classe}">${window.ccUI.escapeHtml(cfg.rotulo)}</span>`;
    }

    function formatarBadgeStatusObra(status) {
        const mapa = {
            planejamento: { rotulo: 'Planejamento', classe: 'bg-status-planejamento/15 text-status-planejamento' },
            em_andamento: { rotulo: 'Em andamento', classe: 'bg-status-em-andamento/15 text-status-em-andamento font-semibold' },
            pausada: { rotulo: 'Pausada', classe: 'bg-status-pausada/15 text-status-pausada font-semibold' },
            concluida: { rotulo: 'Concluída', classe: 'bg-status-concluida/15 text-status-concluida font-semibold' }
        };
        const cfg = mapa[status] || { rotulo: status || 'Indefinido', classe: 'bg-surface-subtle text-on-surface' };
        return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-caption font-caption ${cfg.classe}">${window.ccUI.escapeHtml(cfg.rotulo)}</span>`;
    }

    function renderizarTabelaUsuarios(usuarios) {
        const container = document.getElementById('gestor-tabela-usuarios-container');
        if (!container) return;

        if (!usuarios || !usuarios.length) {
            container.innerHTML = window.ccUI.estadoVazio({
                icone: 'group_off',
                titulo: 'Nenhum usuário localizado',
                mensagem: 'Não há registros correspondentes aos filtros selecionados.'
            });
            return;
        }

        let html = `
            <div class="overflow-x-auto w-full">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b border-border-subtle bg-surface-subtle/50 text-caption font-caption text-on-surface-variant uppercase tracking-wider">
                            <th class="p-space-md">Nome</th>
                            <th class="p-space-md">E-mail</th>
                            <th class="p-space-md">Perfil</th>
                            <th class="p-space-md">Cadastrado em</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border-subtle font-body-sm text-body-sm text-on-surface">
        `;

        usuarios.forEach((u) => {
            html += `
                <tr class="hover:bg-surface-subtle/30 transition-colors">
                    <td class="p-space-md font-semibold text-on-surface flex items-center gap-2">
                        <span class="material-symbols-outlined text-on-surface-variant text-[18px]">account_circle</span>
                        <span>${window.ccUI.escapeHtml(u.nome)}</span>
                    </td>
                    <td class="p-space-md text-on-surface-variant">${window.ccUI.escapeHtml(u.email)}</td>
                    <td class="p-space-md">${formatarBadgeRole(u.tipo_usuario)}</td>
                    <td class="p-space-md text-on-surface-variant">${window.ccUI.formatarData(u.criado_em)}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
        container.innerHTML = html;
    }

    function renderizarTabelaObras(obras) {
        const container = document.getElementById('gestor-tabela-obras-container');
        if (!container) return;

        if (!obras || !obras.length) {
            container.innerHTML = window.ccUI.estadoVazio({
                icone: 'foundation',
                titulo: 'Nenhuma obra localizada',
                mensagem: 'Não há canteiros que correspondam aos filtros informados.'
            });
            return;
        }

        let html = `
            <div class="overflow-x-auto w-full">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b border-border-subtle bg-surface-subtle/50 text-caption font-caption text-on-surface-variant uppercase tracking-wider">
                            <th class="p-space-md">Nome da Obra</th>
                            <th class="p-space-md">Cidade</th>
                            <th class="p-space-md">Cliente</th>
                            <th class="p-space-md">Status</th>
                            <th class="p-space-md">Progresso</th>
                            <th class="p-space-md text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border-subtle font-body-sm text-body-sm text-on-surface">
        `;

        obras.forEach((o) => {
            const clienteNome = o.cliente ? o.cliente.nome : (o.criador ? o.criador.nome : 'Não informado');
            const progresso = Number(o.progresso) || 0;
            html += `
                <tr class="hover:bg-surface-subtle/30 transition-colors">
                    <td class="p-space-md font-semibold text-on-surface">${window.ccUI.escapeHtml(o.nome)}</td>
                    <td class="p-space-md text-on-surface-variant">${window.ccUI.escapeHtml(o.cidade)}</td>
                    <td class="p-space-md text-on-surface-variant">${window.ccUI.escapeHtml(clienteNome)}</td>
                    <td class="p-space-md">${formatarBadgeStatusObra(o.status)}</td>
                    <td class="p-space-md">
                        <div class="flex items-center gap-2">
                            <div class="w-24 bg-surface-subtle h-2 rounded-full overflow-hidden">
                                <div class="bg-status-em-andamento h-full rounded-full" style="width: ${progresso}%;"></div>
                            </div>
                            <span class="font-label-sm text-label-sm">${progresso}%</span>
                        </div>
                    </td>
                    <td class="p-space-md text-right">
                        <a href="obra-detalhes.html?id=${o.id}" class="inline-flex items-center gap-1 text-status-em-andamento hover:text-secondary font-label-sm text-label-sm font-semibold">
                            <span>Detalhes</span>
                            <span class="material-symbols-outlined text-[16px]">chevron_right</span>
                        </a>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
        container.innerHTML = html;
    }

    function aplicarFiltrosUsuarios() {
        if (!gestorDados || !gestorDados.usuarios) return;
        const termo = (document.getElementById('gestor-busca-usuario')?.value || '').toLowerCase().trim();
        const tipo = document.getElementById('gestor-filtro-tipo-usuario')?.value || '';

        const filtrados = gestorDados.usuarios.filter((u) => {
            const combinaTexto = !termo || u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo);
            const combinaTipo = !tipo || u.tipo_usuario === tipo;
            return combinaTexto && combinaTipo;
        });

        renderizarTabelaUsuarios(filtrados);
    }

    function aplicarFiltrosObras() {
        if (!gestorDados || !gestorDados.obras) return;
        const termo = (document.getElementById('gestor-busca-obra')?.value || '').toLowerCase().trim();
        const status = document.getElementById('gestor-filtro-status-obra')?.value || '';

        const filtradas = gestorDados.obras.filter((o) => {
            const combinaTexto = !termo || o.nome.toLowerCase().includes(termo) || o.cidade.toLowerCase().includes(termo);
            const combinaStatus = !status || o.status === status;
            return combinaTexto && combinaStatus;
        });

        renderizarTabelaObras(filtradas);
    }

    async function carregarPainelGestor() {
        const autorizado = await verificarPermissao();
        if (!autorizado) {
            renderizarAcessoNegado();
            return;
        }

        try {
            gestorDados = await window.dbService.getGestorDashboardMetrics();
            atualizarMetricas(gestorDados);
            renderizarTabelaUsuarios(gestorDados.usuarios);
            renderizarTabelaObras(gestorDados.obras);

            document.getElementById('gestor-busca-usuario')?.addEventListener('input', aplicarFiltrosUsuarios);
            document.getElementById('gestor-filtro-tipo-usuario')?.addEventListener('change', aplicarFiltrosUsuarios);
            document.getElementById('gestor-busca-obra')?.addEventListener('input', aplicarFiltrosObras);
            document.getElementById('gestor-filtro-status-obra')?.addEventListener('change', aplicarFiltrosObras);
        } catch (erro) {
            console.error('Falha ao carregar métricas do gestor:', erro);
            const container = document.getElementById('gestor-container');
            if (container) {
                container.innerHTML = window.ccUI.estadoErro({
                    titulo: 'Erro ao carregar o painel do gestor',
                    mensagem: window.ccUI.mensagemErroDados(erro)
                });
            }
        }
    }

    document.addEventListener('DOMContentLoaded', carregarPainelGestor);
})();
