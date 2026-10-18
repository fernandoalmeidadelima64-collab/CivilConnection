/* ============================================================
   Civil Conection — Módulo de Obras & Detalhes (CC-01, CC-02, CC-03)
   ============================================================ */

let obraIdParaExcluir = null;
let obraAtualDetalhes = null;

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
        const obras = await dbService.getObras({ busca, cidade, status, includeDeleted: false });

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
    const fotoCapa = o.foto_capa_url || 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=800&q=80';

    return `
        <div class="bg-surface-card rounded-xl shadow-sm border border-border-subtle hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
            <div class="relative h-40 w-full bg-surface-subtle overflow-hidden">
                <img src="${fotoCapa}" alt="${o.nome}" class="w-full h-full object-cover" />
                <div class="absolute top-3 right-3">
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-caption text-caption font-semibold shadow-sm ${st.class}">
                        <span class="material-symbols-outlined text-[14px]">${st.icon}</span>
                        ${st.label}
                    </span>
                </div>
            </div>

            <div class="p-space-lg flex flex-col gap-space-sm flex-1 justify-between">
                <div class="flex flex-col gap-space-xs">
                    <span class="inline-flex items-center gap-1 font-caption text-caption text-on-surface-variant uppercase tracking-wider">
                        <span class="material-symbols-outlined text-[14px]">location_on</span>
                        ${o.cidade}
                    </span>
                    <h3 class="font-title-md text-title-md text-on-surface font-bold tracking-tight">${o.nome}</h3>
                    <p class="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 my-1">
                        ${o.descricao || 'Canteiro de obras cadastrado com acompanhamento técnico de progresso.'}
                    </p>
                </div>

                <div class="flex flex-col gap-1 pt-space-xs">
                    <div class="flex items-center justify-between font-label-sm text-label-sm">
                        <span class="text-on-surface-variant">Progresso Geral</span>
                        <span class="font-bold text-on-surface">${progresso}%</span>
                    </div>
                    <div class="w-full h-2.5 rounded-full bg-surface-subtle overflow-hidden">
                        <div class="h-full bg-status-em-andamento transition-all duration-500" style="width: ${progresso}%"></div>
                    </div>
                </div>

                <div class="mt-space-sm pt-space-xs border-t border-border-subtle flex items-center justify-between gap-space-sm">
                    <button type="button" onclick="solicitarExclusaoObra('${o.id}', '${o.nome.replace(/'/g, "\\'")}')" class="inline-flex items-center gap-1 p-2 rounded-lg text-error hover:bg-error-container/20 transition-colors" title="Excluir Obra">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>

                    <a href="obra-detalhes.html?obra_id=${o.id}" class="inline-flex items-center gap-space-xs py-2 px-space-md rounded-lg bg-surface-subtle hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors">
                        <span>Gerenciar Detalhes</span>
                        <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </a>
                </div>
            </div>
        </div>
    `;
}

// CC-02 — Detalhes da Obra Completo
async function carregarDetalhesObra() {
    const params = new URLSearchParams(window.location.search);
    const obraId = params.get('obra_id');
    const container = document.getElementById('detalhes-obra-container');
    if (!obraId || !container) return;

    container.innerHTML = `
        <div class="bg-surface-card p-12 rounded-xl text-center border border-border-subtle text-on-surface-variant">
            <span class="material-symbols-outlined text-4xl animate-spin mb-2">progress_activity</span>
            <p class="font-body-md text-body-md">Carregando detalhes do canteiro no Supabase...</p>
        </div>
    `;

    try {
        const obra = await dbService.getObraById(obraId);
        if (!obra) {
            container.innerHTML = `
                <div class="bg-surface-card p-12 rounded-xl text-center border border-border-subtle flex flex-col items-center">
                    <span class="material-symbols-outlined text-5xl text-error mb-2">warning</span>
                    <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold">Obra não encontrada ou excluída</h3>
                    <p class="font-body-md text-body-md text-on-surface-variant mt-1 mb-4">A construção solicitada não existe ou foi removida do sistema.</p>
                    <a href="obras.html" class="px-space-md py-2 rounded-lg bg-status-em-andamento text-on-primary font-label-md text-label-md">Voltar para Obras</a>
                </div>
            `;
            return;
        }

        obraAtualDetalhes = obra;
        const progresso = Math.min(100, Math.max(0, Number(obra.progresso) || 0));
        const statusConfig = {
            'planejamento': { label: 'Planejamento', class: 'bg-surface-subtle text-status-planejamento', icon: 'pending_actions' },
            'em_andamento': { label: 'Em Andamento', class: 'bg-secondary-fixed text-status-em-andamento', icon: 'engineering' },
            'pausada': { label: 'Pausada', class: 'bg-yellow-100 text-status-pausada', icon: 'pause_circle' },
            'concluida': { label: 'Concluída', class: 'bg-green-100 text-status-concluida', icon: 'task_alt' }
        };
        const st = statusConfig[obra.status] || statusConfig['planejamento'];
        const fotoCapa = obra.foto_capa_url || 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=800&q=80';

        container.innerHTML = `
            <div class="bg-surface-card rounded-xl shadow-sm border border-border-subtle overflow-hidden flex flex-col gap-space-lg mb-space-lg">
                <div class="relative h-56 w-full bg-surface-subtle overflow-hidden">
                    <img src="${fotoCapa}" alt="${obra.nome}" class="w-full h-full object-cover" />
                    <div class="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/30 to-transparent flex items-end p-space-xl">
                        <div class="flex flex-col sm:flex-row sm:items-end justify-between w-full gap-space-md text-on-primary">
                            <div class="flex flex-col">
                                <span class="inline-flex items-center gap-1 font-caption text-caption text-inverse-on-surface uppercase tracking-wider">
                                    <span class="material-symbols-outlined text-[16px]">location_on</span>
                                    ${obra.cidade}
                                </span>
                                <h1 class="font-headline-lg text-headline-lg font-bold">${obra.nome}</h1>
                            </div>
                            <span class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-label-md text-label-md font-semibold ${st.class}">
                                <span class="material-symbols-outlined text-[16px]">${st.icon}</span>
                                ${st.label}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="p-space-xl flex flex-col gap-space-lg">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-space-md bg-surface-subtle/80 p-space-md rounded-xl border border-border-subtle">
                        <div class="flex flex-col">
                            <span class="font-caption text-caption text-on-surface-variant uppercase font-semibold">Cliente / Empreendedor</span>
                            <span class="font-title-md text-title-md text-on-surface font-bold mt-0.5">${obra.usuarios ? obra.usuarios.nome : 'Cliente Cadastrado'}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="font-caption text-caption text-on-surface-variant uppercase font-semibold">Responsável Técnico</span>
                            <span class="font-title-md text-title-md text-on-surface font-bold mt-0.5">${obra.profissionais ? obra.profissionais.nome : 'Não atribuído'}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="font-caption text-caption text-on-surface-variant uppercase font-semibold">Data de Início</span>
                            <span class="font-title-md text-title-md text-on-surface font-bold mt-0.5">${obra.data_inicio ? new Date(obra.data_inicio).toLocaleDateString('pt-BR') : 'Não informada'}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="font-caption text-caption text-on-surface-variant uppercase font-semibold">Previsão Conclusão</span>
                            <span class="font-title-md text-title-md text-on-surface font-bold mt-0.5">${obra.data_previsao_fim ? new Date(obra.data_previsao_fim).toLocaleDateString('pt-BR') : 'A definir'}</span>
                        </div>
                    </div>

                    <p class="font-body-md text-body-md text-on-surface-variant">${obra.descricao || 'Sem descrição cadastrada para este empreendimento.'}</p>

                    <!-- Barra de Progresso do Canteiro -->
                    <div class="flex flex-col gap-1.5">
                        <div class="flex items-center justify-between font-label-md text-label-md">
                            <span class="text-on-surface-variant font-semibold">Progresso Físico Geral da Obra</span>
                            <span class="font-bold text-status-em-andamento font-display text-headline-sm">${progresso}%</span>
                        </div>
                        <div class="w-full h-3 rounded-full bg-surface-subtle overflow-hidden">
                            <div class="h-full bg-status-em-andamento transition-all duration-500" style="width: ${progresso}%"></div>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center justify-between gap-space-md pt-space-xs border-t border-border-subtle">
                        <div class="flex items-center gap-space-sm">
                            <button type="button" onclick="abrirModalEditarObra()" class="inline-flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-surface-subtle hover:bg-surface-container font-label-md text-label-md text-on-surface transition-colors">
                                <span class="material-symbols-outlined text-[18px]">edit</span>
                                <span>Editar Obra</span>
                            </button>
                            <button type="button" onclick="solicitarExclusaoObra('${obra.id}', '${obra.nome.replace(/'/g, "\\'")}')" class="inline-flex items-center gap-1.5 px-space-md py-2 rounded-lg text-error hover:bg-error-container/20 font-label-md text-label-md transition-colors">
                                <span class="material-symbols-outlined text-[18px]">delete</span>
                                <span>Excluir Obra</span>
                            </button>
                        </div>

                        <a href="agenda.html?obra_id=${obra.id}" class="inline-flex items-center gap-1.5 px-space-lg py-2.5 rounded-lg bg-status-em-andamento text-on-primary font-label-md text-label-md shadow-sm hover:bg-secondary transition-colors">
                            <span class="material-symbols-outlined text-[18px]">calendar_month</span>
                            <span>Agendar Visita / Inspeção</span>
                        </a>
                    </div>
                </div>
            </div>
        `;

        if (typeof inicializarDetalhesObra === 'function') {
            inicializarDetalhesObra(obraId);
        }
    } catch (e) {
        console.error(e);
    }
}

// CC-02 — Modal Editar Obra
async function abrirModalEditarObra() {
    if (!obraAtualDetalhes) return;

    let modal = document.getElementById('modal-editar-obra');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-editar-obra';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm hidden';
        modal.innerHTML = `
            <div class="bg-surface-card rounded-xl shadow-xl w-full max-w-lg p-space-lg mx-4 flex flex-col gap-space-md">
                <div class="flex items-center justify-between">
                    <h3 class="font-headline-sm text-headline-sm text-on-surface">Editar Informações da Obra</h3>
                    <button type="button" onclick="document.getElementById('modal-editar-obra').classList.add('hidden')" class="p-1 rounded-lg hover:bg-surface-subtle text-on-surface-variant">
                        <span class="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
                <form class="flex flex-col gap-space-md" onsubmit="salvarEdicaoObraSubmit(event)">
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface">Nome da Obra *</label>
                        <input type="text" id="edit-nome-obra" required class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                    </div>
                    <div class="grid grid-cols-2 gap-space-sm">
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface">Cidade *</label>
                            <input type="text" id="edit-cidade-obra" required class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface">Status</label>
                            <select id="edit-status-obra" class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none">
                                <option value="planejamento">Planejamento</option>
                                <option value="em_andamento">Em Andamento</option>
                                <option value="pausada">Pausada</option>
                                <option value="concluida">Concluída</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-space-sm">
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface">Data Início</label>
                            <input type="date" id="edit-data-inicio" class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface">Previsão Término</label>
                            <input type="date" id="edit-data-fim" class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                        </div>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface">Responsável Técnico</label>
                        <select id="edit-responsavel-obra" class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none">
                            <option value="">Carregando...</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface">URL Foto de Capa</label>
                        <input type="url" id="edit-foto-capa" placeholder="https://..." class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface">Descrição</label>
                        <textarea id="edit-descricao-obra" rows="3" class="p-3 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none"></textarea>
                    </div>
                    <div class="flex items-center justify-end gap-space-sm pt-space-xs">
                        <button type="button" onclick="document.getElementById('modal-editar-obra').classList.add('hidden')" class="px-space-md py-2 rounded-lg bg-surface-subtle text-on-surface font-label-md text-label-md">Cancelar</button>
                        <button type="submit" class="px-space-md py-2 rounded-lg bg-status-em-andamento text-on-primary font-label-md text-label-md shadow-sm">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }

    document.getElementById('edit-nome-obra').value = obraAtualDetalhes.nome || '';
    document.getElementById('edit-cidade-obra').value = obraAtualDetalhes.cidade || '';
    document.getElementById('edit-status-obra').value = obraAtualDetalhes.status || 'planejamento';
    document.getElementById('edit-data-inicio').value = obraAtualDetalhes.data_inicio || '';
    document.getElementById('edit-data-fim').value = obraAtualDetalhes.data_previsao_fim || '';
    document.getElementById('edit-foto-capa').value = obraAtualDetalhes.foto_capa_url || '';
    document.getElementById('edit-descricao-obra').value = obraAtualDetalhes.descricao || '';

    const selectResp = document.getElementById('edit-responsavel-obra');
    const profs = await dbService.getProfissionais();
    if (selectResp && profs) {
        selectResp.innerHTML = '<option value="">Sem responsável definido</option>' +
            profs.map(p => `<option value="${p.id}" ${p.id === obraAtualDetalhes.responsavel_id ? 'selected' : ''}>${p.nome} (${p.especialidade})</option>`).join('');
    }

    modal.classList.remove('hidden');
}

async function salvarEdicaoObraSubmit(e) {
    e.preventDefault();
    if (!obraAtualDetalhes) return;

    const nome = document.getElementById('edit-nome-obra')?.value.trim();
    const cidade = document.getElementById('edit-cidade-obra')?.value.trim();
    const status = document.getElementById('edit-status-obra')?.value;
    const data_inicio = document.getElementById('edit-data-inicio')?.value || null;
    const data_previsao_fim = document.getElementById('edit-data-fim')?.value || null;
    const responsavel_id = document.getElementById('edit-responsavel-obra')?.value || null;
    const foto_capa_url = document.getElementById('edit-foto-capa')?.value.trim();
    const descricao = document.getElementById('edit-descricao-obra')?.value.trim();

    if (!nome || !cidade) return;

    try {
        await dbService.updateObra(obraAtualDetalhes.id, {
            nome,
            cidade,
            status,
            data_inicio,
            data_previsao_fim,
            responsavel_id,
            foto_capa_url,
            descricao
        });

        document.getElementById('modal-editar-obra')?.classList.add('hidden');
        carregarDetalhesObra();
    } catch (err) {
        console.error(err);
        alert('Erro ao atualizar informações da obra.');
    }
}

// CC-01 — Modal e Lógica de Exclusão de Obra
function solicitarExclusaoObra(id, nome) {
    obraIdParaExcluir = id;
    let modal = document.getElementById('modal-confirmar-exclusao-obra');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-confirmar-exclusao-obra';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm hidden';
        modal.innerHTML = `
            <div class="bg-surface-card rounded-xl shadow-xl w-full max-w-md p-space-lg mx-4 flex flex-col gap-space-md">
                <div class="flex items-center justify-between">
                    <h3 class="font-headline-sm text-headline-sm text-error font-bold flex items-center gap-2">
                        <span class="material-symbols-outlined text-2xl">warning</span>
                        Excluir Obra
                    </h3>
                    <button type="button" onclick="fecharModalExclusaoObra()" class="p-1 rounded-lg hover:bg-surface-subtle text-on-surface-variant">
                        <span class="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
                <div class="flex flex-col gap-space-sm">
                    <p class="font-body-md text-body-md text-on-surface">
                        Tem certeza que deseja excluir a obra <strong id="nome-obra-excluir-txt" class="text-primary font-bold"></strong>?
                    </p>
                    <p class="font-body-sm text-body-sm text-on-surface-variant">
                        Esta operação realizará a remoção lógica no banco Supabase e ocultará os registros dos relatórios e indicadores ativos.
                    </p>
                </div>
                <div class="flex items-center justify-end gap-space-sm pt-space-xs border-t border-border-subtle">
                    <button type="button" onclick="fecharModalExclusaoObra()" class="px-space-md py-2 rounded-lg bg-surface-subtle text-on-surface font-label-md text-label-md">Cancelar</button>
                    <button type="button" onclick="executarExclusaoObra()" id="btn-confirmar-exclusao" class="px-space-md py-2 rounded-lg bg-error text-on-error font-label-md text-label-md shadow-sm hover:opacity-90 transition-opacity">Confirmar Exclusão</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const txtNome = document.getElementById('nome-obra-excluir-txt');
    if (txtNome) txtNome.textContent = nome;
    modal.classList.remove('hidden');
}

function fecharModalExclusaoObra() {
    const modal = document.getElementById('modal-confirmar-exclusao-obra');
    if (modal) modal.classList.add('hidden');
    obraIdParaExcluir = null;
}

async function executarExclusaoObra() {
    if (!obraIdParaExcluir) return;
    const btn = document.getElementById('btn-confirmar-exclusao');

    try {
        if (btn) btn.disabled = true;
        await dbService.deleteObra(obraIdParaExcluir);
        fecharModalExclusaoObra();

        if (window.location.pathname.includes('obra-detalhes.html')) {
            window.location.href = 'obras.html';
        } else {
            carregarObras();
        }
    } catch (err) {
        console.error(err);
        alert(err.message || 'Falha ao excluir a obra.');
    } finally {
        if (btn) btn.disabled = false;
    }
}

function setupFormCadastroObra(form) {
    dbService.getProfissionais().then(profs => {
        const selectResp = document.getElementById('responsavel-obra');
        if (selectResp && profs) {
            selectResp.innerHTML = '<option value="">Sem responsável definido</option>' +
                profs.map(p => `<option value="${p.id}">${p.nome} (${p.especialidade})</option>`).join('');
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('nome-obra')?.value.trim();
        const cidade = document.getElementById('cidade-obra')?.value.trim();
        const status = document.getElementById('status-obra')?.value || 'planejamento';
        const progresso = document.getElementById('progresso-obra')?.value || 0;
        const descricao = document.getElementById('descricao-obra')?.value.trim();
        const data_inicio = document.getElementById('data-inicio-obra')?.value || null;
        const data_previsao_fim = document.getElementById('data-fim-obra')?.value || null;
        const responsavel_id = document.getElementById('responsavel-obra')?.value || null;
        const foto_capa_url = document.getElementById('foto-capa-obra')?.value.trim() || '';

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
                descricao,
                data_inicio,
                data_previsao_fim,
                responsavel_id,
                foto_capa_url
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
