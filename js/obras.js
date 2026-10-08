/* ============================================================
   Civil Conection — Módulo de Obras
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Listagem de Obras
    const containerObras = document.getElementById('lista-obras');
    if (containerObras) {
        carregarObras();
        setupFiltrosObras();
    }

    // 2. Cadastro de Obra
    const formObra = document.getElementById('form-cadastro-obra');
    if (formObra) {
        setupFormCadastroObra(formObra);
    }

    // 3. Detalhes da Obra
    const containerObraDetalhes = document.getElementById('detalhes-obra-container');
    if (containerObraDetalhes) {
        carregarDetalhesObra();
    }
});

let debounceTimerObra;

function setupFiltrosObras() {
    const inputBusca = document.getElementById('busca-obra');
    const selectCidade = document.getElementById('filtro-cidade-obra');
    const selectStatus = document.getElementById('filtro-status-obra');

    const triggerBusca = () => {
        clearTimeout(debounceTimerObra);
        debounceTimerObra = setTimeout(() => {
            carregarObras();
        }, 300);
    };

    if (inputBusca) inputBusca.addEventListener('input', triggerBusca);
    if (selectCidade) selectCidade.addEventListener('change', triggerBusca);
    if (selectStatus) selectStatus.addEventListener('change', triggerBusca);
}

async function carregarObras() {
    const container = document.getElementById('lista-obras');
    const totalCountEl = document.getElementById('total-obras-count');
    if (!container) return;

    const busca = document.getElementById('busca-obra')?.value.trim() || '';
    const cidade = document.getElementById('filtro-cidade-obra')?.value || '';
    const status = document.getElementById('filtro-status-obra')?.value || '';

    container.innerHTML = `
        <div class="col-span-full py-12 flex flex-col items-center justify-center text-on-surface-variant">
            <span class="material-symbols-outlined text-4xl animate-spin mb-2">progress_activity</span>
            <p class="font-body-md text-body-md">Carregando canteiros de obras do Supabase...</p>
        </div>
    `;

    try {
        const obras = await dbService.getObras({ busca, cidade, status });

        if (totalCountEl) {
            totalCountEl.textContent = `${obras.length} obra${obras.length !== 1 ? 's' : ''}`;
        }

        if (!obras || obras.length === 0) {
            container.innerHTML = `
                <div class="col-span-full bg-surface-card p-8 rounded-xl text-center border border-border-subtle">
                    <span class="material-symbols-outlined text-4xl text-on-surface-variant mb-2">apartment</span>
                    <h3 class="font-headline-sm text-headline-sm text-on-surface mb-1">Nenhuma obra localizada</h3>
                    <p class="font-body-md text-body-md text-on-surface-variant">Tente ajustar seus termos de pesquisa ou filtros de cidade e status.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = obras.map(o => renderCardObra(o)).join('');
    } catch (err) {
        console.error('Erro ao carregar obras:', err);
        container.innerHTML = `
            <div class="col-span-full bg-error-container/20 p-6 rounded-xl text-center border border-error/20">
                <p class="font-body-md text-body-md text-error font-semibold">Falha ao consultar canteiros no banco Supabase.</p>
            </div>
        `;
    }
}

function renderCardObra(o) {
    const statusConfig = {
        'planejamento': { label: 'Planejamento', class: 'bg-surface-subtle text-status-planejamento', icon: 'pending_actions' },
        'em_andamento': { label: 'Em Andamento', class: 'bg-secondary-fixed text-status-em-andamento', icon: 'engineering' },
        'pausada': { label: 'Pausada', class: 'bg-yellow-100 text-status-pausada', icon: 'pause_circle' },
        'concluida': { label: 'Concluída', class: 'bg-green-100 text-status-concluida', icon: 'task_alt' }
    };

    const st = statusConfig[o.status] || statusConfig['planejamento'];
    const progresso = Math.min(100, Math.max(0, Number(o.progresso) || 0));

    return `
        <div class="bg-surface-card p-space-lg rounded-xl shadow-sm border border-border-subtle hover:shadow-md transition-all flex flex-col justify-between">
            <div class="flex flex-col gap-space-sm">
                <div class="flex items-start justify-between gap-space-xs">
                    <div class="flex flex-col">
                        <span class="inline-flex items-center gap-1 font-caption text-caption text-on-surface-variant uppercase tracking-wider">
                            <span class="material-symbols-outlined text-[14px]">location_on</span>
                            ${o.cidade}
                        </span>
                        <h3 class="font-title-md text-title-md text-on-surface font-bold tracking-tight">${o.nome}</h3>
                    </div>
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-caption text-caption font-semibold ${st.class}">
                        <span class="material-symbols-outlined text-[14px]">${st.icon}</span>
                        ${st.label}
                    </span>
                </div>

                <p class="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 my-space-xs">
                    ${o.descricao || 'Canteiro de obras cadastrado com acompanhamento técnico de progresso.'}
                </p>

                <!-- Barra de Progresso Real -->
                <div class="flex flex-col gap-1 pt-space-xs">
                    <div class="flex items-center justify-between font-label-sm text-label-sm">
                        <span class="text-on-surface-variant">Progresso Geral</span>
                        <span class="font-bold text-on-surface">${progresso}%</span>
                    </div>
                    <div class="w-full h-2.5 rounded-full bg-surface-subtle overflow-hidden">
                        <div class="h-full bg-status-em-andamento transition-all duration-500" style="width: ${progresso}%"></div>
                    </div>
                </div>
            </div>

            <div class="mt-space-md pt-space-xs border-t border-border-subtle flex items-center justify-between">
                <span class="font-caption text-caption text-on-surface-variant">
                    Resp: ${o.usuarios ? o.usuarios.nome : 'Cliente'}
                </span>
                <a href="obra-detalhes.html?obra_id=${o.id}" class="inline-flex items-center gap-space-xs py-2 px-space-md rounded-lg bg-surface-subtle hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors">
                    <span>Ver Etapas</span>
                    <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                </a>
            </div>
        </div>
    `;
}

function setupFormCadastroObra(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('nome-obra')?.value.trim();
        const cidade = document.getElementById('cidade-obra')?.value.trim();
        const status = document.getElementById('status-obra')?.value || 'planejamento';
        const progresso = document.getElementById('progresso-obra')?.value || 0;
        const descricao = document.getElementById('descricao-obra')?.value.trim();

        if (!nome) {
            showObraError('O nome da obra é obrigatório.');
            return;
        }
        if (!cidade) {
            showObraError('A cidade do empreendimento é obrigatória.');
            return;
        }
        if (Number(progresso) < 0 || Number(progresso) > 100) {
            showObraError('O progresso deve estar entre 0% e 100%.');
            return;
        }

        try {
            const btnSubmit = form.querySelector('button[type="submit"]');
            if (btnSubmit) btnSubmit.disabled = true;

            await dbService.saveObra({
                nome,
                cidade,
                status,
                progresso,
                descricao
            });

            showObraSuccess('Obra cadastrada com sucesso!');
            setTimeout(() => {
                window.location.href = 'obras.html';
            }, 1200);
        } catch (err) {
            console.error(err);
            showObraError('Falha ao cadastrar a obra.');
        }
    });
}

async function carregarDetalhesObra() {
    const params = new URLSearchParams(window.location.search);
    const obraId = params.get('obra_id');
    const container = document.getElementById('detalhes-obra-container');
    if (!obraId || !container) return;

    try {
        const obra = await dbService.getObraById(obraId);
        if (!obra) {
            container.innerHTML = `<p class="p-6 text-center text-error">Obra não localizada.</p>`;
            return;
        }

        const progresso = Math.min(100, Math.max(0, Number(obra.progresso) || 0));

        container.innerHTML = `
            <div class="bg-surface-card p-space-xl rounded-xl shadow-sm border border-border-subtle flex flex-col gap-space-lg mb-space-xl">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
                    <div class="flex flex-col">
                        <span class="font-caption text-caption text-on-surface-variant uppercase tracking-wider">${obra.cidade}</span>
                        <h1 class="font-headline-lg text-headline-lg text-on-surface font-bold">${obra.nome}</h1>
                        <p class="font-body-md text-body-md text-on-surface-variant mt-1">${obra.descricao || 'Sem descrição cadastrada.'}</p>
                    </div>
                    <div class="flex flex-col items-end shrink-0">
                        <span class="font-caption text-caption text-on-surface-variant">Progresso Total</span>
                        <span class="font-display text-display text-status-em-andamento font-bold">${progresso}%</span>
                    </div>
                </div>

                <div class="w-full h-3 rounded-full bg-surface-subtle overflow-hidden">
                    <div class="h-full bg-status-em-andamento transition-all duration-500" style="width: ${progresso}%"></div>
                </div>
            </div>
        `;

        // Carregar etapas no modulo js/etapas.js
        if (typeof carregarEtapasObra === 'function') {
            carregarEtapasObra(obraId);
        }
    } catch (e) {
        console.error(e);
    }
}

function showObraError(msg) {
    let el = document.getElementById('obra-feedback-msg');
    if (!el) {
        el = document.createElement('div');
        el.id = 'obra-feedback-msg';
        document.querySelector('form')?.prepend(el);
    }
    el.className = 'p-3 rounded-lg bg-error-container text-on-error-container font-label-sm text-label-sm text-center mb-4';
    el.textContent = msg;
}

function showObraSuccess(msg) {
    let el = document.getElementById('obra-feedback-msg');
    if (!el) {
        el = document.createElement('div');
        el.id = 'obra-feedback-msg';
        document.querySelector('form')?.prepend(el);
    }
    el.className = 'p-3 rounded-lg bg-status-concluida/10 text-status-concluida font-label-sm text-label-sm text-center mb-4';
    el.textContent = msg;
}
