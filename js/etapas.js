/* ==========================================================================
   Civil Connection — Etapas, tarefas, diário, documentos, equipe e histórico
   ==========================================================================
   Módulo da página de detalhes da obra. Todas as gravações vão para o
   Supabase; nenhuma informação é simulada. Cada seção exibe estado de
   carregamento, vazio ou erro de forma independente.
   ========================================================================== */

let currentObraId = null;
let currentTab = 'etapas';
let etapasCarregadas = [];
let profissionaisCarregados = [];
let etapaIdParaTarefa = null;

const ABAS_OBRA = ['etapas', 'diario', 'equipe', 'historico'];

function inicializarDetalhesObra(obraId) {
    currentObraId = obraId;
    setupTabNavigation();
    configurarFormulariosEstaticos();
    const abaInicial = new URLSearchParams(window.location.search).get('aba');
    switchObraTab(ABAS_OBRA.includes(abaInicial) ? abaInicial : 'etapas');
    carregarTodasAsSecoes();
}

function atualizarDataDiarioPadrao() {
    const campoData = document.getElementById('diario-data');
    if (campoData) campoData.value = window.ccUI.paraInputData(new Date());
}
function configurarFormulariosEstaticos() {
    const formEtapa = document.getElementById('form-nova-etapa');
    if (formEtapa && formEtapa.dataset.ccConfigurado !== 'true') {
        formEtapa.dataset.ccConfigurado = 'true';
        formEtapa.addEventListener('submit', cadastrarNovaEtapa);
    }
    // Observa abertura do modal de diário para sempre sugerir a data de hoje
    const modalDiario = document.getElementById('modal-novo-diario');
    if (modalDiario && !modalDiario.dataset.ccDataObservada) {
        modalDiario.dataset.ccDataObservada = 'true';
        const observer = new MutationObserver(() => {
            if (!modalDiario.classList.contains('hidden')) atualizarDataDiarioPadrao();
        });
        observer.observe(modalDiario, { attributes: true, attributeFilter: ['class'] });
    }

    const formDiario = document.getElementById('form-novo-diario');
    if (formDiario && formDiario.dataset.ccConfigurado !== 'true') {
        formDiario.dataset.ccConfigurado = 'true';
        formDiario.addEventListener('submit', cadastrarNovoDiarioSubmit);
    }

    const formAnexo = document.getElementById('form-novo-anexo');
    if (formAnexo && formAnexo.dataset.ccConfigurado !== 'true') {
        formAnexo.dataset.ccConfigurado = 'true';
        formAnexo.addEventListener('submit', anexarFotoDocumentoSubmit);
    }
}

function carregarTodasAsSecoes() {
    if (!currentObraId) return;
    carregarEtapasObra(currentObraId);
    carregarDiarioEAnexos(currentObraId);
    carregarEquipeObra(currentObraId);
    carregarHistoricoObra(currentObraId);
}

function setupTabNavigation() {
    ABAS_OBRA.forEach((nome) => {
        const botao = document.getElementById(`tab-btn-${nome}`);
        if (!botao || botao.dataset.ccAbaPronta === 'true') return;
        botao.dataset.ccAbaPronta = 'true';
        botao.addEventListener('click', () => switchObraTab(nome));
    });
}

function switchObraTab(tabName) {
    if (!ABAS_OBRA.includes(tabName)) return;
    currentTab = tabName;

    ABAS_OBRA.forEach((nome) => {
        const botao = document.getElementById(`tab-btn-${nome}`);
        const painel = document.getElementById(`tab-content-${nome}`);
        const ativo = nome === tabName;

        if (botao) {
            botao.className = ativo
                ? 'py-3 px-space-md font-label-md text-label-md text-status-em-andamento border-b-2 border-status-em-andamento font-semibold'
                : 'py-3 px-space-md font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors';
            botao.setAttribute('aria-selected', ativo ? 'true' : 'false');
            botao.setAttribute('tabindex', ativo ? '0' : '-1');
            botao.setAttribute('role', 'tab');
            botao.setAttribute('aria-controls', `tab-content-${nome}`);
        }
        if (painel) {
            painel.classList.toggle('hidden', !ativo);
            painel.setAttribute('role', 'tabpanel');
            painel.setAttribute('aria-labelledby', `tab-btn-${nome}`);
        }
    });

    if (window.history && window.history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.set('aba', tabName);
        window.history.replaceState({}, '', url);
    }
}

// ---- Etapas e tarefas -------------------------------------------------------
async function obterProfissionaisDaObra() {
    if (profissionaisCarregados.length) return profissionaisCarregados;
    try {
        profissionaisCarregados = await window.dbService.getProfissionais();
    } catch (erro) {
        console.error('Não foi possível carregar os profissionais:', erro);
        profissionaisCarregados = [];
    }
    return profissionaisCarregados;
}

async function carregarEtapasObra(obraId) {
    const container = document.getElementById('lista-etapas-obra');
    if (!container) return;

    container.setAttribute('aria-busy', 'true');
    container.innerHTML = window.ccUI.estadoCarregando('Carregando etapas e atividades...');

    try {
        const [resultadoEtapas, resultadoTarefas] = await Promise.allSettled([
            window.dbService.getEtapasByObra(obraId),
            window.dbService.getTarefasByObra(obraId)
        ]);
        if (resultadoEtapas.status === 'rejected') throw resultadoEtapas.reason;
        const etapas = resultadoEtapas.value;
        const tarefas = resultadoTarefas.status === 'fulfilled' ? resultadoTarefas.value : [];
        if (resultadoTarefas.status === 'rejected') {
            console.warn('Falha ao carregar tarefas, exibindo etapas sem detalhamento de atividades:', resultadoTarefas.reason);
        }
        const profissionais = await obterProfissionaisDaObra();

        etapasCarregadas = etapas || [];

        if (!etapasCarregadas.length) {
            container.innerHTML = window.ccUI.estadoVazio({
                icone: 'view_timeline',
                titulo: 'Nenhuma etapa cadastrada',
                mensagem: 'Cadastre a primeira etapa do cronograma para acompanhar o avanço físico da obra.',
                acoes: [{
                    rotulo: 'Cadastrar etapa',
                    onclick: "document.getElementById('modal-nova-etapa').classList.remove('hidden'); document.getElementById('nome-etapa').focus();",
                    classe: 'cc-btn cc-btn--primario'
                }]
            });
            return;
        }

        container.innerHTML = etapasCarregadas.map((etapa) => {
            const tarefasEtapa = (tarefas || []).filter((tarefa) => tarefa.etapa_id === etapa.id);
            return renderEtapaCardCompleto(etapa, tarefasEtapa, profissionais);
        }).join('');
    } catch (erro) {
        console.error('Erro ao carregar etapas:', erro);
        container.innerHTML = window.ccUI.estadoErro({
            titulo: 'Não foi possível carregar as etapas',
            mensagem: window.ccUI.mensagemErroDados(erro),
            acoes: [{ rotulo: 'Tentar novamente', onclick: 'carregarEtapasObra(currentObraId)', classe: 'cc-btn cc-btn--secundario' }]
        });
    } finally {
        container.setAttribute('aria-busy', 'false');
    }
}

function renderEtapaCardCompleto(etapa, tarefasEtapa, profissionais) {
    const statusConfig = {
        pendente: { label: 'Pendente', classe: 'bg-surface-subtle text-status-planejamento' },
        em_andamento: { label: 'Em andamento', classe: 'bg-secondary-fixed text-status-em-andamento' },
        concluida: { label: 'Concluída', classe: 'bg-green-100 text-status-concluida' }
    };
    const st = statusConfig[etapa.status] || statusConfig.pendente;
    const progresso = Math.min(100, Math.max(0, Number(etapa.progresso) || 0));
    const nomeEtapa = window.ccUI.escapeHtml(etapa.nome);
    const concluidas = tarefasEtapa.filter((tarefa) => tarefa.status === 'concluida').length;

    return `
        <article class="bg-surface-card p-space-lg rounded-xl border border-border-subtle flex flex-col gap-space-md shadow-sm cc-etapa" data-cc-etapa-id="${window.ccUI.escapeHtml(etapa.id)}">
            <header class="flex flex-col md:flex-row md:items-start justify-between gap-space-md border-b border-border-subtle pb-space-sm">
                <div class="flex items-start gap-space-sm min-w-0">
                    <span class="material-symbols-outlined text-[24px] text-status-em-andamento mt-0.5" aria-hidden="true">view_timeline</span>
                    <div class="flex flex-col min-w-0">
                        <h3 class="font-title-md text-title-md text-on-surface font-bold cc-quebra">${nomeEtapa}</h3>
                        <p class="font-body-sm text-body-sm text-on-surface-variant cc-quebra">${window.ccUI.escapeHtml(etapa.descricao || 'Sem escopo detalhado.')}</p>
                        <span class="inline-flex items-center gap-1 mt-1 font-caption text-caption text-on-surface-variant">
                            <span class="material-symbols-outlined text-[14px]" aria-hidden="true">assignment</span>
                            ${concluidas} de ${tarefasEtapa.length} atividade(s) concluída(s)
                        </span>
                    </div>
                </div>

                <div class="cc-etapa__controles flex flex-col sm:flex-row sm:items-end gap-space-md shrink-0">
                    <div class="flex flex-col gap-1 sm:w-44">
                        <label class="font-caption text-caption text-on-surface-variant" for="etapa-progresso-${window.ccUI.escapeHtml(etapa.id)}">
                            Avanço da etapa: <strong class="text-on-surface" data-cc-progresso-texto>${progresso}%</strong>
                        </label>
                        <input type="range" min="0" max="100" step="5" value="${progresso}" id="etapa-progresso-${window.ccUI.escapeHtml(etapa.id)}"
                               class="w-full accent-status-em-andamento cursor-pointer cc-range" style="min-height: 44px;"
                               oninput="this.closest('.cc-etapa').querySelector('[data-cc-progresso-texto]').textContent = this.value + '%'"
                               onchange="atualizarProgressoEtapa('${window.ccUI.escapeHtml(etapa.id)}', this.value, this)"
                               aria-label="Progresso da etapa ${nomeEtapa}" />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label class="font-caption text-caption text-on-surface-variant" for="etapa-status-${window.ccUI.escapeHtml(etapa.id)}">Status</label>
                        <select id="etapa-status-${window.ccUI.escapeHtml(etapa.id)}" onchange="atualizarStatusEtapa('${window.ccUI.escapeHtml(etapa.id)}', this.value)"
                                class="h-11 px-2.5 rounded-lg bg-surface-subtle font-label-md text-label-md text-on-surface font-semibold focus:outline-none ${st.classe}">
                            <option value="pendente" ${etapa.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                            <option value="em_andamento" ${etapa.status === 'em_andamento' ? 'selected' : ''}>Em andamento</option>
                            <option value="concluida" ${etapa.status === 'concluida' ? 'selected' : ''}>Concluída</option>
                        </select>
                    </div>

                    <div class="flex items-center gap-space-xs">
                        <button type="button" onclick="abrirModalNovaTarefa('${window.ccUI.escapeHtml(etapa.id)}')"
                                class="inline-flex items-center justify-center gap-1 min-h-11 px-space-sm py-2 rounded-lg bg-surface-subtle hover:bg-surface-container font-label-sm text-label-sm text-on-surface transition-colors"
                                aria-label="Cadastrar atividade na etapa ${nomeEtapa}">
                            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">add_task</span>
                            <span>Atividade</span>
                        </button>
                        <button type="button" onclick="deletarEtapa('${window.ccUI.escapeHtml(etapa.id)}')"
                                class="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-error hover:bg-error-container/20 transition-colors"
                                aria-label="Excluir etapa ${nomeEtapa}">
                            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
                        </button>
                    </div>
                </div>
            </header>

            <div class="flex flex-col gap-space-xs">
                ${tarefasEtapa.length === 0
                    ? '<p class="font-caption text-caption text-on-surface-variant italic py-1">Nenhuma atividade individual vinculada a esta etapa ainda.</p>'
                    : tarefasEtapa.map((tarefa) => renderTarefaRow(tarefa, profissionais)).join('')}
            </div>
        </article>
    `;
}

function renderTarefaRow(tarefa, profissionais) {
    const statusTarefaMap = {
        pendente: { label: 'Pendente', classe: 'bg-surface-subtle text-status-planejamento' },
        em_andamento: { label: 'Em andamento', classe: 'bg-orange-100 text-status-em-andamento' },
        concluida: { label: 'Concluída', classe: 'bg-green-100 text-status-concluida' },
        atrasada: { label: 'Atrasada', classe: 'bg-red-100 text-error font-bold' },
        bloqueada: { label: 'Bloqueada', classe: 'bg-yellow-100 text-amber-800 font-bold' }
    };
    const st = statusTarefaMap[tarefa.status] || statusTarefaMap.pendente;
    const responsavel = profissionais.find((profissional) => profissional.id === tarefa.responsavel_id);
    const nomeResp = responsavel ? responsavel.nome : (tarefa.profissionais && tarefa.profissionais.nome) || 'Não atribuído';
    const progresso = Math.min(100, Math.max(0, Number(tarefa.progresso) || 0));
    const nomeTarefa = window.ccUI.escapeHtml(tarefa.nome);
    const idSeguro = window.ccUI.escapeHtml(tarefa.id);

    return `
        <div class="p-space-sm rounded-lg bg-surface-subtle/60 border border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-space-sm cc-tarefa" data-cc-tarefa-id="${idSeguro}">
            <div class="flex flex-col flex-1 min-w-0 gap-1">
                <div class="flex flex-wrap items-center gap-space-sm">
                    <span class="font-title-md text-title-md text-on-surface font-semibold cc-quebra">${nomeTarefa}</span>
                    <span class="px-2 py-0.5 rounded-full font-caption text-caption ${st.classe}">${st.label}</span>
                </div>
                ${tarefa.descricao ? `<p class="font-body-sm text-body-sm text-on-surface-variant cc-quebra">${window.ccUI.escapeHtml(tarefa.descricao)}</p>` : ''}
                <div class="flex flex-wrap items-center gap-x-space-md gap-y-1 font-caption text-caption text-on-surface-variant">
                    <span>Responsável: <strong class="text-on-surface">${window.ccUI.escapeHtml(nomeResp)}</strong></span>
                    ${tarefa.data_fim_prevista ? `<span>Previsão: ${window.ccUI.escapeHtml(window.ccUI.formatarData(tarefa.data_fim_prevista))}</span>` : ''}
                    ${tarefa.justificativa_atraso ? `<span class="text-error font-semibold">Atraso: ${window.ccUI.escapeHtml(tarefa.justificativa_atraso)}</span>` : ''}
                </div>
            </div>

            <div class="cc-tarefa__controles flex items-center gap-space-sm shrink-0">
                <div class="flex flex-col gap-1 w-full sm:w-32">
                    <label class="font-caption text-caption text-on-surface-variant" for="tarefa-progresso-${idSeguro}">
                        Progresso: <strong data-cc-progresso-texto>${progresso}%</strong>
                    </label>
                    <input type="range" min="0" max="100" step="5" value="${progresso}" id="tarefa-progresso-${idSeguro}"
                           class="w-full accent-status-em-andamento cursor-pointer cc-range" style="min-height: 44px;"
                           oninput="this.closest('.cc-tarefa').querySelector('[data-cc-progresso-texto]').textContent = this.value + '%'"
                           onchange="atualizarProgressoTarefa('${idSeguro}', this.value, this)"
                           aria-label="Progresso da atividade ${nomeTarefa}" />
                </div>
                <select onchange="atualizarStatusTarefa('${idSeguro}', this.value)"
                        class="h-11 px-2 rounded-lg bg-surface-card border border-border-subtle font-caption text-caption text-on-surface focus:outline-none"
                        aria-label="Status da atividade ${nomeTarefa}">
                    <option value="pendente" ${tarefa.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="em_andamento" ${tarefa.status === 'em_andamento' ? 'selected' : ''}>Em andamento</option>
                    <option value="concluida" ${tarefa.status === 'concluida' ? 'selected' : ''}>Concluída</option>
                    <option value="atrasada" ${tarefa.status === 'atrasada' ? 'selected' : ''}>Atrasada</option>
                    <option value="bloqueada" ${tarefa.status === 'bloqueada' ? 'selected' : ''}>Bloqueada</option>
                </select>
                <button type="button" onclick="deletarTarefa('${idSeguro}')"
                        class="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-error hover:bg-error-container/20"
                        aria-label="Excluir atividade ${nomeTarefa}">
                    <span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
                </button>
            </div>
        </div>
    `;
}

async function recarregarSecaoEtapas() {
    if (!currentObraId) return;
    await carregarEtapasObra(currentObraId);
    if (typeof carregarDetalhesObra === 'function') carregarDetalhesObra();
}

async function atualizarProgressoEtapa(etapaId, novoProgresso, elemento) {
    const progresso = Number(novoProgresso);
    let status = 'em_andamento';
    if (progresso === 0) status = 'pendente';
    if (progresso === 100) status = 'concluida';

    if (elemento) elemento.disabled = true;
    try {
        await window.dbService.updateEtapa(etapaId, { progresso, status });
        window.ccUI.mostrarAviso('Progresso da etapa atualizado.', 'sucesso');
        await recarregarSecaoEtapas();
    } catch (erro) {
        console.error('Erro ao atualizar progresso da etapa:', erro);
        window.ccUI.mostrarAviso(window.ccUI.mensagemErroDados(erro), 'erro');
        await carregarEtapasObra(currentObraId);
    } finally {
        if (elemento) elemento.disabled = false;
    }
}

async function atualizarStatusEtapa(etapaId, novoStatus) {
    const progresso = novoStatus === 'concluida' ? 100 : (novoStatus === 'pendente' ? 0 : 50);
    try {
        await window.dbService.updateEtapa(etapaId, { status: novoStatus, progresso });
        window.ccUI.mostrarAviso('Status da etapa atualizado.', 'sucesso');
        await recarregarSecaoEtapas();
    } catch (erro) {
        console.error('Erro ao atualizar status da etapa:', erro);
        window.ccUI.mostrarAviso(window.ccUI.mensagemErroDados(erro), 'erro');
        await carregarEtapasObra(currentObraId);
    }
}

async function atualizarProgressoTarefa(tarefaId, novoProgresso, elemento) {
    const progresso = Number(novoProgresso);
    let status = 'em_andamento';
    if (progresso === 0) status = 'pendente';
    if (progresso === 100) status = 'concluida';

    if (elemento) elemento.disabled = true;
    try {
        await window.dbService.updateTarefa(tarefaId, { progresso, status });
        window.ccUI.mostrarAviso('Progresso da atividade atualizado.', 'sucesso');
        await recarregarSecaoEtapas();
    } catch (erro) {
        console.error('Erro ao atualizar atividade:', erro);
        window.ccUI.mostrarAviso(window.ccUI.mensagemErroDados(erro), 'erro');
        await carregarEtapasObra(currentObraId);
    } finally {
        if (elemento) elemento.disabled = false;
    }
}

async function atualizarStatusTarefa(tarefaId, novoStatus) {
    const progresso = novoStatus === 'concluida' ? 100 : (novoStatus === 'pendente' ? 0 : 50);
    try {
        await window.dbService.updateTarefa(tarefaId, { status: novoStatus, progresso });
        window.ccUI.mostrarAviso('Status da atividade atualizado.', 'sucesso');
        await recarregarSecaoEtapas();
    } catch (erro) {
        console.error('Erro ao atualizar status da atividade:', erro);
        window.ccUI.mostrarAviso(window.ccUI.mensagemErroDados(erro), 'erro');
        await carregarEtapasObra(currentObraId);
    }
}

async function deletarTarefa(tarefaId) {
    const confirmado = await window.ccUI.confirmarAcao({
        titulo: 'Excluir atividade',
        mensagem: 'Deseja remover esta atividade do cronograma? Esta ação não pode ser desfeita.',
        textoConfirmar: 'Excluir atividade',
        textoCancelar: 'Cancelar'
    });
    if (!confirmado) return;

    try {
        await window.dbService.deleteTarefa(tarefaId);
        window.ccUI.mostrarAviso('Atividade removida.', 'sucesso');
        await recarregarSecaoEtapas();
    } catch (erro) {
        console.error('Erro ao remover atividade:', erro);
        window.ccUI.mostrarAviso(window.ccUI.mensagemErroDados(erro), 'erro');
    }
}

async function deletarEtapa(etapaId) {
    const confirmado = await window.ccUI.confirmarAcao({
        titulo: 'Excluir etapa',
        mensagem: 'Deseja remover esta etapa do cronograma? As atividades vinculadas deixarão de aparecer na obra.',
        textoConfirmar: 'Excluir etapa',
        textoCancelar: 'Cancelar'
    });
    if (!confirmado) return;

    try {
        await window.dbService.deleteEtapa(etapaId);
        window.ccUI.mostrarAviso('Etapa removida.', 'sucesso');
        await recarregarSecaoEtapas();
    } catch (erro) {
        console.error('Erro ao remover etapa:', erro);
        window.ccUI.mostrarAviso(window.ccUI.mensagemErroDados(erro), 'erro');
    }
}

function feedbackNovaEtapa(mensagem, tipo) {
    const el = document.getElementById('etapa-feedback');
    if (!el) {
        window.ccUI.mostrarAviso(mensagem, tipo || 'erro');
        return;
    }
    el.textContent = mensagem;
    el.className = `p-2.5 rounded-lg font-label-sm text-label-sm text-center ${tipo === 'sucesso' ? 'bg-status-concluida/10 text-status-concluida' : 'bg-error-container text-on-error-container'}`;
    el.setAttribute('role', tipo === 'sucesso' ? 'status' : 'alert');
    el.classList.remove('hidden');
}

async function cadastrarNovaEtapa(evento) {
    if (evento) evento.preventDefault();
    const obraId = currentObraId || new URLSearchParams(window.location.search).get('obra_id');
    const nome = (document.getElementById('nome-etapa')?.value || '').trim();
    const descricao = (document.getElementById('descricao-etapa')?.value || '').trim();
    const progresso = Number(document.getElementById('progresso-etapa')?.value || 0);
    const status = document.getElementById('status-etapa')?.value || 'pendente';

    if (!obraId) return feedbackNovaEtapa('Obra não identificada. Recarregue a página.', 'erro');
    if (!nome) return feedbackNovaEtapa('Informe o nome da etapa.', 'erro');
    if (Number.isNaN(progresso) || progresso < 0 || progresso > 100) {
        return feedbackNovaEtapa('O progresso deve estar entre 0% e 100%.', 'erro');
    }

    const form = document.getElementById('form-nova-etapa');
    const botao = form ? form.querySelector('button[type="submit"]') : null;
    try {
        if (botao) { botao.disabled = true; botao.setAttribute('aria-busy', 'true'); }
        await window.dbService.saveEtapa({ obra_id: obraId, nome, descricao, progresso, status });
        form?.reset();
        document.getElementById('modal-nova-etapa')?.classList.add('hidden');
        window.ccUI.mostrarAviso('Etapa cadastrada com sucesso.', 'sucesso');
        await recarregarSecaoEtapas();
    } catch (erro) {
        console.error('Erro ao cadastrar etapa:', erro);
        feedbackNovaEtapa(window.ccUI.mensagemErroDados(erro), 'erro');
    } finally {
        if (botao) { botao.disabled = false; botao.removeAttribute('aria-busy'); }
    }
}

async function abrirModalNovaTarefa(etapaId) {
    etapaIdParaTarefa = etapaId;
    let modal = document.getElementById('modal-nova-tarefa');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-nova-tarefa';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm hidden';
        modal.innerHTML = `
            <div class="bg-surface-card rounded-xl shadow-xl w-full max-w-lg p-space-lg mx-4 flex flex-col gap-space-md cc-modal__painel">
                <div class="flex items-center justify-between gap-2">
                    <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold">Cadastrar atividade</h3>
                    <button type="button" data-cc-fechar class="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg hover:bg-surface-subtle text-on-surface-variant" aria-label="Fechar">
                        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
                    </button>
                </div>
                <div id="tarefa-feedback" class="hidden p-2.5 rounded-lg font-label-sm text-label-sm text-center" role="alert" aria-live="polite"></div>
                <form class="flex flex-col gap-space-md" id="form-nova-tarefa" novalidate>
                    <input type="hidden" id="tarefa-etapa-id" />
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface" for="nome-tarefa">Nome da atividade *</label>
                        <input type="text" id="nome-tarefa" required maxlength="160" class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface" for="responsavel-tarefa">Responsável técnico</label>
                            <select id="responsavel-tarefa" class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none">
                                <option value="">Sem responsável definido</option>
                            </select>
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface" for="status-tarefa">Status</label>
                            <select id="status-tarefa" class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none">
                                <option value="pendente">Pendente</option>
                                <option value="em_andamento">Em andamento</option>
                                <option value="concluida">Concluída</option>
                                <option value="atrasada">Atrasada</option>
                                <option value="bloqueada">Bloqueada</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface" for="data-fim-tarefa">Previsão de término</label>
                            <input type="date" id="data-fim-tarefa" class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface" for="progresso-tarefa">Progresso (%)</label>
                            <input type="number" id="progresso-tarefa" min="0" max="100" step="5" value="0" class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                        </div>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface" for="justificativa-tarefa">Observações / justificativa de atraso</label>
                        <input type="text" id="justificativa-tarefa" maxlength="200" placeholder="Ex.: chuva intensa no canteiro" class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                    </div>
                    <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-space-sm pt-space-xs">
                        <button type="button" data-cc-fechar class="min-h-11 px-space-md py-2 rounded-lg bg-surface-subtle text-on-surface font-label-md text-label-md">Cancelar</button>
                        <button type="submit" class="min-h-11 px-space-md py-2 rounded-lg bg-status-em-andamento text-on-primary font-label-md text-label-md shadow-sm">Salvar atividade</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelectorAll('[data-cc-fechar]').forEach((botao) => {
            botao.addEventListener('click', () => modal.classList.add('hidden'));
        });
        modal.querySelector('#form-nova-tarefa').addEventListener('submit', salvarNovaTarefaSubmit);
    }

    document.getElementById('tarefa-etapa-id').value = etapaId;
    document.getElementById('form-nova-tarefa').reset();
    document.getElementById('tarefa-etapa-id').value = etapaId;

    const feedback = document.getElementById('tarefa-feedback');
    if (feedback) { feedback.textContent = ''; feedback.classList.add('hidden'); }

    const selectResp = document.getElementById('responsavel-tarefa');
    if (selectResp) {
        selectResp.innerHTML = '<option value="">Sem responsável definido</option>';
        try {
            const profissionais = await obterProfissionaisDaObra();
            profissionais.forEach((profissional) => {
                const opcao = document.createElement('option');
                opcao.value = profissional.id;
                opcao.textContent = `${profissional.nome} — ${profissional.especialidade}`;
                selectResp.appendChild(opcao);
            });
        } catch (erro) {
            console.error('Erro ao carregar responsáveis:', erro);
        }
    }

    modal.classList.remove('hidden');
    const campoNome = document.getElementById('nome-tarefa');
    if (campoNome) window.setTimeout(() => campoNome.focus({ preventScroll: true }), 60);
}

function feedbackNovaTarefa(mensagem, tipo) {
    const el = document.getElementById('tarefa-feedback');
    if (!el) return window.ccUI.mostrarAviso(mensagem, tipo || 'erro');
    el.textContent = mensagem;
    el.className = `p-2.5 rounded-lg font-label-sm text-label-sm text-center ${tipo === 'sucesso' ? 'bg-status-concluida/10 text-status-concluida' : 'bg-error-container text-on-error-container'}`;
    el.setAttribute('role', tipo === 'sucesso' ? 'status' : 'alert');
    el.classList.remove('hidden');
}

async function salvarNovaTarefaSubmit(evento) {
    evento.preventDefault();
    const etapaId = document.getElementById('tarefa-etapa-id')?.value;
    const nome = (document.getElementById('nome-tarefa')?.value || '').trim();
    const responsavelId = document.getElementById('responsavel-tarefa')?.value || null;
    const status = document.getElementById('status-tarefa')?.value || 'pendente';
    const dataFim = document.getElementById('data-fim-tarefa')?.value || null;
    const progresso = Number(document.getElementById('progresso-tarefa')?.value || 0);
    const justificativa = (document.getElementById('justificativa-tarefa')?.value || '').trim();

    if (!etapaId || !nome) return feedbackNovaTarefa('Informe o nome da atividade.', 'erro');
    if (Number.isNaN(progresso) || progresso < 0 || progresso > 100) {
        return feedbackNovaTarefa('O progresso deve estar entre 0% e 100%.', 'erro');
    }

    const botao = document.querySelector('#form-nova-tarefa button[type="submit"]');
    try {
        if (botao) { botao.disabled = true; botao.setAttribute('aria-busy', 'true'); }
        await window.dbService.saveTarefa({
            etapa_id: etapaId,
            obra_id: currentObraId,
            nome,
            responsavel_id: responsavelId,
            status,
            data_fim_prevista: dataFim,
            progresso,
            justificativa_atraso: justificativa
        });
        document.getElementById('modal-nova-tarefa')?.classList.add('hidden');
        window.ccUI.mostrarAviso('Atividade cadastrada com sucesso.', 'sucesso');
        await recarregarSecaoEtapas();
    } catch (erro) {
        console.error('Erro ao salvar atividade:', erro);
        feedbackNovaTarefa(window.ccUI.mensagemErroDados(erro), 'erro');
    } finally {
        if (botao) { botao.disabled = false; botao.removeAttribute('aria-busy'); }
    }
}

// ---- Diário, documentos e anexos -------------------------------------------
async function carregarDiarioEAnexos(obraId) {
    const containerDiario = document.getElementById('lista-diario-obra');
    const containerDocs = document.getElementById('lista-documentos-obra');
    if (!containerDiario && !containerDocs) return;

    if (containerDiario) {
        containerDiario.setAttribute('aria-busy', 'true');
        containerDiario.innerHTML = window.ccUI.estadoCarregando('Carregando diário de obra...');
    }
    if (containerDocs) {
        containerDocs.setAttribute('aria-busy', 'true');
        containerDocs.innerHTML = window.ccUI.estadoCarregando('Carregando documentos...');
    }

    const [resultadoDiario, resultadoDocs] = await Promise.allSettled([
        window.dbService.getDiarioByObra(obraId),
        window.dbService.getDocumentosByObra(obraId)
    ]);

    if (containerDiario) {
        if (resultadoDiario.status === 'rejected') {
            const erro = resultadoDiario.reason;
            console.error('Erro ao carregar diário:', erro);
            containerDiario.innerHTML = window.ccUI.estadoErro({
                titulo: 'Não foi possível carregar o diário',
                mensagem: window.ccUI.mensagemErroDados(erro),
                acoes: [{ rotulo: 'Tentar novamente', onclick: 'carregarDiarioEAnexos(currentObraId)', classe: 'cc-btn cc-btn--secundario' }]
            });
        } else if (!resultadoDiario.value.length) {
            containerDiario.innerHTML = window.ccUI.estadoVazio({
                icone: 'edit_calendar',
                titulo: 'Nenhum registro no diário',
                mensagem: 'Registre as ocorrências do dia para manter o histórico do canteiro.',
                acoes: [{
                    rotulo: 'Novo registro',
                    onclick: "document.getElementById('modal-novo-diario').classList.remove('hidden'); document.getElementById('diario-resumo').focus();",
                    classe: 'cc-btn cc-btn--primario'
                }]
            });
        } else {
            containerDiario.innerHTML = resultadoDiario.value.map(renderDiarioCard).join('');
        }
        containerDiario.setAttribute('aria-busy', 'false');
    }

    if (containerDocs) {
        if (resultadoDocs.status === 'rejected') {
            const erro = resultadoDocs.reason;
            console.error('Erro ao carregar documentos:', erro);
            containerDocs.innerHTML = window.ccUI.estadoErro({
                titulo: 'Não foi possível carregar os anexos',
                mensagem: window.ccUI.mensagemErroDados(erro),
                acoes: [{ rotulo: 'Tentar novamente', onclick: 'carregarDiarioEAnexos(currentObraId)', classe: 'cc-btn cc-btn--secundario' }]
            });
        } else if (!resultadoDocs.value.length) {
            containerDocs.innerHTML = window.ccUI.estadoVazio({
                icone: 'description',
                titulo: 'Nenhum documento anexado',
                mensagem: 'Envie fotografias, plantas ou relatórios para centralizar os arquivos da obra.',
                acoes: [{
                    rotulo: 'Anexar arquivo',
                    onclick: "document.getElementById('modal-novo-anexo').classList.remove('hidden'); document.getElementById('anexo-titulo').focus();",
                    classe: 'cc-btn cc-btn--primario'
                }]
            });
        } else {
            containerDocs.innerHTML = resultadoDocs.value.map(renderDocumentoCard).join('');
        }
        containerDocs.setAttribute('aria-busy', 'false');
    }
}

function renderDiarioCard(registro) {
    const data = window.ccUI.formatarData(registro.data);
    const autor = registro.usuarios && registro.usuarios.nome ? registro.usuarios.nome : 'Usuário autenticado';
    return `
        <article class="bg-surface-card p-space-md rounded-xl border border-border-subtle flex flex-col gap-space-xs shadow-sm cc-diario">
            <header class="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-space-xs">
                <div class="flex items-center gap-space-sm">
                    <span class="material-symbols-outlined text-status-em-andamento text-[20px]" aria-hidden="true">edit_calendar</span>
                    <h4 class="font-title-md text-title-md text-on-surface font-bold">${window.ccUI.escapeHtml(data)}</h4>
                </div>
                <span class="px-2.5 py-1 rounded-full bg-surface-subtle font-caption text-caption text-on-surface font-semibold">
                    Clima: ${window.ccUI.escapeHtml(registro.clima || 'Não informado')}
                </span>
            </header>
            <p class="font-body-md text-body-md text-on-surface mt-1 cc-quebra">${window.ccUI.escapeHtml(registro.resumo_dia || 'Sem anotações.')}</p>
            ${registro.observacoes_tecnicas ? `<p class="font-body-sm text-body-sm text-on-surface-variant cc-quebra">${window.ccUI.escapeHtml(registro.observacoes_tecnicas)}</p>` : ''}
            <span class="font-caption text-caption text-on-surface-variant">Registrado por: ${window.ccUI.escapeHtml(autor)}</span>
        </article>
    `;
}

function renderDocumentoCard(documento) {
    const placeholder = '../assets/images/placeholder-obra.svg';
    const url = typeof window.getDocumentoUrl === 'function'
        ? window.getDocumentoUrl(documento.url_arquivo)
        : (documento.url_arquivo && /^https?:\/\//i.test(documento.url_arquivo) ? documento.url_arquivo : null);
    const ehImagem = documento.tipo === 'imagem';
    const imagem = typeof window.getObraImagemUrl === 'function'
        ? window.getObraImagemUrl(documento.url_arquivo, placeholder)
        : placeholder;
    const titulo = window.ccUI.escapeHtml(documento.titulo);
    const data = window.ccUI.formatarData(documento.criado_em);

    return `
        <article class="bg-surface-card rounded-xl border border-border-subtle overflow-hidden flex flex-col shadow-sm cc-documento">
            ${ehImagem ? `
                <button type="button" class="h-36 w-full overflow-hidden bg-surface-subtle relative group block"
                        onclick="abrirLightboxVisualizador('${window.ccUI.escapeHtml(imagem)}', '${titulo.replace(/'/g, '&#39;')}')"
                        aria-label="Ampliar imagem ${titulo}">
                    <img src="${window.ccUI.escapeHtml(imagem)}" alt="" loading="lazy"
                         onerror="this.onerror=null; this.src='${placeholder}';"
                         class="w-full h-full object-cover text-transparent text-[0px] bg-surface-subtle group-hover:scale-105 transition-transform duration-300" />
                    <span class="absolute inset-0 bg-primary/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-on-primary">
                        <span class="material-symbols-outlined text-3xl" aria-hidden="true">zoom_in</span>
                    </span>
                </button>
            ` : `
                <div class="h-36 w-full bg-surface-subtle flex flex-col items-center justify-center text-primary p-4 gap-1">
                    <span class="material-symbols-outlined text-4xl" aria-hidden="true">description</span>
                    <span class="font-caption text-caption text-center break-words line-clamp-2">${titulo}</span>
                </div>
            `}
            <div class="p-space-sm flex flex-col gap-space-xs flex-1 justify-between">
                <div class="flex flex-col">
                    <span class="font-label-sm text-label-sm text-on-surface font-semibold cc-quebra">${titulo}</span>
                    <span class="font-caption text-caption text-on-surface-variant">${window.ccUI.escapeHtml(data)}${documento.tamanho_bytes ? ` · ${window.ccUI.formatarBytes(documento.tamanho_bytes)}` : ''}</span>
                </div>
                <div class="flex items-center gap-space-xs pt-space-xs">
                    <a href="${window.ccUI.escapeHtml(url)}" target="_blank" rel="noopener noreferrer"
                       class="flex-1 inline-flex items-center justify-center gap-1 min-h-11 rounded-lg bg-surface-subtle hover:bg-surface-container font-label-sm text-label-sm text-on-surface">
                        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">visibility</span>
                        Abrir
                    </a>
                    <button type="button" onclick="baixarDocumento('${window.ccUI.escapeHtml(url)}', '${titulo.replace(/'/g, '&#39;')}')"
                            class="flex-1 inline-flex items-center justify-center gap-1 min-h-11 rounded-lg bg-surface-subtle hover:bg-surface-container font-label-sm text-label-sm text-on-surface"
                            aria-label="Baixar ${titulo}">
                        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">download</span>
                        Baixar
                    </button>
                </div>
            </div>
        </article>
    `;
}

async function baixarDocumento(url, titulo) {
    const endereco = typeof window.getDocumentoUrl === 'function' ? window.getDocumentoUrl(url) : url;
    if (!endereco) {
        window.ccUI.mostrarAviso('Este anexo não possui um endereço válido para download.', 'erro');
        return;
    }

    try {
        const resposta = await fetch(endereco, { mode: 'cors', credentials: 'omit' });
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        const blob = await resposta.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = titulo || 'documento';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
        window.ccUI.mostrarAviso('Download iniciado.', 'sucesso');
    } catch (erro) {
        console.warn('Download direto bloqueado pelo servidor de origem, abrindo em nova aba:', erro);
        window.open(endereco, '_blank', 'noopener');
        window.ccUI.mostrarAviso('O arquivo foi aberto em uma nova aba. Use a opção de salvar do navegador.', 'aviso');
    }
}

async function cadastrarNovoDiarioSubmit(evento) {
    evento.preventDefault();
    const data = document.getElementById('diario-data')?.value || null;
    const clima = document.getElementById('diario-clima')?.value || 'Ensolarado';
    const resumo = (document.getElementById('diario-resumo')?.value || '').trim();

    if (!currentObraId) return window.ccUI.mostrarAviso('Obra não identificada. Recarregue a página.', 'erro');
    if (!resumo) return window.ccUI.mostrarAviso('Descreva as atividades do dia.', 'erro');

    const botao = document.querySelector('#form-novo-diario button[type="submit"]');
    try {
        if (botao) { botao.disabled = true; botao.setAttribute('aria-busy', 'true'); }
        await window.dbService.saveDiarioEntry({
            obra_id: currentObraId,
            data: data || new Date().toISOString().split('T')[0],
            clima,
            resumo_dia: resumo
        });
        document.getElementById('form-novo-diario')?.reset();
        document.getElementById('modal-novo-diario')?.classList.add('hidden');
        window.ccUI.mostrarAviso('Registro do diário salvo.', 'sucesso');
        await carregarDiarioEAnexos(currentObraId);
    } catch (erro) {
        console.error('Erro ao salvar diário:', erro);
        window.ccUI.mostrarAviso(window.ccUI.mensagemErroDados(erro), 'erro');
    } finally {
        if (botao) { botao.disabled = false; botao.removeAttribute('aria-busy'); }
    }
}

async function anexarFotoDocumentoSubmit(evento) {
    evento.preventDefault();
    const titulo = (document.getElementById('anexo-titulo')?.value || '').trim();
    const tipo = document.getElementById('anexo-tipo')?.value || 'imagem';
    const urlDigitada = (document.getElementById('anexo-url')?.value || '').trim();
    const arquivo = document.getElementById('anexo-arquivo')?.files?.[0] || null;

    if (!currentObraId) return window.ccUI.mostrarAviso('Obra não identificada. Recarregue a página.', 'erro');
    if (!titulo) return window.ccUI.mostrarAviso('Informe o título do anexo.', 'erro');
    if (!arquivo && !urlDigitada) {
        return window.ccUI.mostrarAviso('Selecione um arquivo ou informe a URL pública do documento.', 'erro');
    }

    const botao = document.querySelector('#form-novo-anexo button[type="submit"]');
    const feedback = document.getElementById('anexo-feedback');
    const exibirFeedback = (mensagem, classe) => {
        if (!feedback) return;
        feedback.textContent = mensagem;
        feedback.className = `p-2.5 rounded-lg font-label-sm text-label-sm text-center ${classe}`;
        feedback.classList.remove('hidden');
    };

    try {
        if (botao) { botao.disabled = true; botao.setAttribute('aria-busy', 'true'); }

        let url = urlDigitada;
        let tamanho = 0;

        if (arquivo) {
            exibirFeedback('Enviando arquivo para o Supabase Storage...', 'bg-surface-subtle text-on-surface-variant');
            const enviado = await window.dbService.uploadDocumento(currentObraId, arquivo);
            url = enviado.url;
            tamanho = enviado.tamanho;
        }

        await window.dbService.saveDocumento({
            obra_id: currentObraId,
            titulo,
            tipo,
            url_arquivo: url,
            tamanho_bytes: tamanho
        });

        document.getElementById('form-novo-anexo')?.reset();
        document.getElementById('modal-novo-anexo')?.classList.add('hidden');
        if (feedback) feedback.classList.add('hidden');
        window.ccUI.mostrarAviso('Anexo registrado com sucesso.', 'sucesso');
        await carregarDiarioEAnexos(currentObraId);
    } catch (erro) {
        console.error('Erro ao anexar arquivo:', erro);
        const mensagem = window.ccUI.mensagemErroDados(erro);
        if (feedback) exibirFeedback(mensagem, 'bg-error-container text-on-error-container');
        else window.ccUI.mostrarAviso(mensagem, 'erro');
    } finally {
        if (botao) { botao.disabled = false; botao.removeAttribute('aria-busy'); }
    }
}

function abrirLightboxVisualizador(url, titulo) {
    let lightbox = document.getElementById('lightbox-galeria');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'lightbox-galeria';
        lightbox.className = 'fixed inset-0 z-[60] flex flex-col items-center justify-center bg-primary/90 backdrop-blur-md p-4 hidden';
        lightbox.setAttribute('role', 'dialog');
        lightbox.setAttribute('aria-modal', 'true');
        lightbox.setAttribute('aria-label', 'Visualizador de imagem');
        lightbox.innerHTML = `
            <button type="button" id="lightbox-fechar" class="absolute top-4 right-4 inline-flex items-center justify-center min-h-11 min-w-11 text-on-primary hover:opacity-80 rounded-lg" aria-label="Fechar visualizador">
                <span class="material-symbols-outlined text-3xl" aria-hidden="true">close</span>
            </button>
            <img id="lightbox-img" alt="" class="max-w-full max-h-[75vh] rounded-lg shadow-2xl object-contain mb-4 text-transparent text-[0px]" />
            <span id="lightbox-title" class="text-on-primary font-title-md text-title-md text-center px-2"></span>
        `;
        document.body.appendChild(lightbox);
        const fechar = () => {
            lightbox.classList.add('hidden');
            document.body.style.overflow = '';
        };
        lightbox.querySelector('#lightbox-fechar').addEventListener('click', fechar);
        lightbox.addEventListener('click', (evento) => {
            if (evento.target === lightbox) fechar();
        });
        document.addEventListener('keydown', (evento) => {
            if (evento.key === 'Escape' && !lightbox.classList.contains('hidden')) fechar();
        });
    }

    const placeholder = '../assets/images/placeholder-obra.svg';
    const enderecoLimpo = typeof window.getObraImagemUrl === 'function'
        ? window.getObraImagemUrl(url, placeholder)
        : (url || placeholder);

    const imagem = document.getElementById('lightbox-img');
    imagem.src = enderecoLimpo;
    imagem.alt = `Visualização ampliada de ${titulo || 'documento'}`;
    document.getElementById('lightbox-title').textContent = titulo || 'Visualização do documento';
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => document.getElementById('lightbox-fechar')?.focus(), 50);
}

// ---- Equipe técnica ---------------------------------------------------------
async function carregarEquipeObra(obraId) {
    const container = document.getElementById('lista-equipe-obra');
    if (!container) return;

    container.setAttribute('aria-busy', 'true');
    container.innerHTML = window.ccUI.estadoCarregando('Carregando equipe da obra...');

    try {
        const equipe = await window.dbService.getObraProfissionais(obraId);

        if (!equipe.length) {
            container.innerHTML = window.ccUI.estadoVazio({
                icone: 'group',
                titulo: 'Nenhum profissional vinculado',
                mensagem: 'Vincule profissionais e fornecedores para registrar as responsabilidades técnicas da obra.',
                acoes: [{ rotulo: 'Vincular profissional', onclick: 'abrirModalAssociarProfissional()', classe: 'cc-btn cc-btn--primario' }]
            });
            return;
        }

        container.innerHTML = equipe.map((item) => {
            const profissional = item.profissionais || {};
            const nome = profissional.nome || 'Profissional não localizado';
            return `
                <div class="bg-surface-card p-space-md rounded-xl border border-border-subtle flex items-center justify-between gap-space-sm shadow-sm">
                    <div class="flex items-center gap-space-md min-w-0">
                        <div class="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold shrink-0" aria-hidden="true">
                            ${window.ccUI.escapeHtml(nome.charAt(0).toUpperCase())}
                        </div>
                        <div class="flex flex-col min-w-0">
                            <span class="font-title-md text-title-md text-on-surface font-bold cc-quebra">${window.ccUI.escapeHtml(nome)}</span>
                            <span class="font-caption text-caption text-status-em-andamento font-semibold cc-quebra">${window.ccUI.escapeHtml(item.funcao || 'Função não informada')}</span>
                            <span class="font-caption text-caption text-on-surface-variant cc-quebra">${window.ccUI.escapeHtml(item.responsabilidade || profissional.especialidade || 'Escopo não informado')}</span>
                        </div>
                    </div>
                    <button type="button" onclick="removerProfissionalEquipe('${window.ccUI.escapeHtml(item.id)}')"
                            class="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-error hover:bg-error-container/20 shrink-0"
                            aria-label="Remover ${window.ccUI.escapeHtml(nome)} da equipe">
                        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">person_remove</span>
                    </button>
                </div>
            `;
        }).join('');
    } catch (erro) {
        console.error('Erro ao carregar equipe:', erro);
        container.innerHTML = window.ccUI.estadoErro({
            titulo: 'Não foi possível carregar a equipe',
            mensagem: window.ccUI.mensagemErroDados(erro),
            acoes: [{ rotulo: 'Tentar novamente', onclick: 'carregarEquipeObra(currentObraId)', classe: 'cc-btn cc-btn--secundario' }]
        });
    } finally {
        container.setAttribute('aria-busy', 'false');
    }
}

async function abrirModalAssociarProfissional() {
    let modal = document.getElementById('modal-associar-prof');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-associar-prof';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm hidden';
        modal.innerHTML = `
            <div class="bg-surface-card rounded-xl shadow-xl w-full max-w-md p-space-lg mx-4 flex flex-col gap-space-md cc-modal__painel">
                <div class="flex items-center justify-between gap-2">
                    <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold">Vincular profissional à obra</h3>
                    <button type="button" data-cc-fechar class="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg hover:bg-surface-subtle text-on-surface-variant" aria-label="Fechar">
                        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
                    </button>
                </div>
                <div id="equipe-feedback" class="hidden p-2.5 rounded-lg font-label-sm text-label-sm text-center" role="alert" aria-live="polite"></div>
                <form class="flex flex-col gap-space-md" id="form-associar-profissional" novalidate>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface" for="select-prof-equipe">Profissional / fornecedor *</label>
                        <select id="select-prof-equipe" required class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none">
                            <option value="">Carregando...</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface" for="funcao-prof-equipe">Função na obra *</label>
                        <input type="text" id="funcao-prof-equipe" required maxlength="120" placeholder="Ex.: engenheiro calculista responsável" class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface" for="resp-prof-equipe">Escopo de atuação</label>
                        <input type="text" id="resp-prof-equipe" maxlength="160" placeholder="Ex.: fiscalização de armação e lajes" class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                    </div>
                    <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-space-sm pt-space-xs">
                        <button type="button" data-cc-fechar class="min-h-11 px-space-md py-2 rounded-lg bg-surface-subtle text-on-surface font-label-md text-label-md">Cancelar</button>
                        <button type="submit" class="min-h-11 px-space-md py-2 rounded-lg bg-status-em-andamento text-on-primary font-label-md text-label-md shadow-sm">Confirmar vínculo</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelectorAll('[data-cc-fechar]').forEach((botao) => {
            botao.addEventListener('click', () => modal.classList.add('hidden'));
        });
        modal.querySelector('#form-associar-profissional').addEventListener('submit', associarProfissionalSubmit);
    }

    const select = document.getElementById('select-prof-equipe');
    if (select) {
        select.innerHTML = '<option value="">Carregando profissionais...</option>';
        try {
            const profissionais = await window.dbService.getProfissionais();
            profissionaisCarregados = profissionais;
            if (!profissionais.length) {
                select.innerHTML = '<option value="">Nenhum profissional cadastrado</option>';
            } else {
                select.innerHTML = '<option value="">Selecione...</option>' + profissionais
                    .map((profissional) => `<option value="${window.ccUI.escapeHtml(profissional.id)}">${window.ccUI.escapeHtml(profissional.nome)} — ${window.ccUI.escapeHtml(profissional.especialidade)}</option>`)
                    .join('');
            }
        } catch (erro) {
            console.error('Erro ao carregar profissionais:', erro);
            select.innerHTML = '<option value="">Não foi possível carregar os profissionais</option>';
            window.ccUI.mostrarAviso(window.ccUI.mensagemErroDados(erro), 'erro');
        }
    }

    document.getElementById('form-associar-profissional')?.reset();
    modal.classList.remove('hidden');
    window.setTimeout(() => document.getElementById('select-prof-equipe')?.focus({ preventScroll: true }), 60);
}

async function associarProfissionalSubmit(evento) {
    evento.preventDefault();
    const profissionalId = document.getElementById('select-prof-equipe')?.value;
    const funcao = (document.getElementById('funcao-prof-equipe')?.value || '').trim();
    const responsabilidade = (document.getElementById('resp-prof-equipe')?.value || '').trim();
    const feedback = document.getElementById('equipe-feedback');

    const exibir = (mensagem, classe) => {
        if (!feedback) return window.ccUI.mostrarAviso(mensagem, 'erro');
        feedback.textContent = mensagem;
        feedback.className = `p-2.5 rounded-lg font-label-sm text-label-sm text-center ${classe}`;
        feedback.classList.remove('hidden');
    };

    if (!currentObraId || !profissionalId) return exibir('Selecione o profissional a vincular.', 'bg-error-container text-on-error-container');
    if (!funcao) return exibir('Informe a função do profissional na obra.', 'bg-error-container text-on-error-container');

    const botao = document.querySelector('#form-associar-profissional button[type="submit"]');
    try {
        if (botao) { botao.disabled = true; botao.setAttribute('aria-busy', 'true'); }
        await window.dbService.associarProfissionalObra({
            obra_id: currentObraId,
            profissional_id: profissionalId,
            funcao,
            responsabilidade
        });
        document.getElementById('modal-associar-prof')?.classList.add('hidden');
        window.ccUI.mostrarAviso('Profissional vinculado à obra.', 'sucesso');
        await carregarEquipeObra(currentObraId);
    } catch (erro) {
        console.error('Erro ao vincular profissional:', erro);
        exibir(window.ccUI.mensagemErroDados(erro), 'bg-error-container text-on-error-container');
    } finally {
        if (botao) { botao.disabled = false; botao.removeAttribute('aria-busy'); }
    }
}

async function removerProfissionalEquipe(id) {
    const confirmado = await window.ccUI.confirmarAcao({
        titulo: 'Desvincular profissional',
        mensagem: 'Deseja desassociar este profissional da obra? As atividades já atribuídas permanecem no histórico.',
        textoConfirmar: 'Desvincular',
        textoCancelar: 'Cancelar'
    });
    if (!confirmado) return;

    try {
        await window.dbService.desassociarProfissionalObra(id);
        window.ccUI.mostrarAviso('Profissional desvinculado da obra.', 'sucesso');
        await carregarEquipeObra(currentObraId);
    } catch (erro) {
        console.error('Erro ao desvincular profissional:', erro);
        window.ccUI.mostrarAviso(window.ccUI.mensagemErroDados(erro), 'erro');
    }
}

// ---- Histórico e auditoria --------------------------------------------------
async function carregarHistoricoObra(obraId) {
    const container = document.getElementById('lista-historico-obra');
    if (!container) return;

    container.setAttribute('aria-busy', 'true');
    container.innerHTML = window.ccUI.estadoCarregando('Carregando histórico da obra...');

    try {
        const historico = await window.dbService.getHistoricoByObra(obraId);

        if (!historico.length) {
            container.innerHTML = window.ccUI.estadoVazio({
                icone: 'history',
                titulo: 'Nenhum evento registrado',
                mensagem: 'As alterações de etapas, equipe, diário e documentos aparecerão aqui automaticamente.'
            });
            return;
        }

        container.innerHTML = historico.map((evento) => {
            const autor = evento.usuarios && evento.usuarios.nome ? evento.usuarios.nome : 'Sistema';
            return `
                <div class="p-space-md bg-surface-card rounded-xl border border-border-subtle flex items-start gap-space-md shadow-sm">
                    <div class="w-8 h-8 rounded-full bg-surface-subtle flex items-center justify-center shrink-0 text-primary mt-0.5" aria-hidden="true">
                        <span class="material-symbols-outlined text-[18px]">history</span>
                    </div>
                    <div class="flex flex-col flex-1 min-w-0">
                        <p class="font-body-md text-body-md text-on-surface font-semibold cc-quebra">${window.ccUI.escapeHtml(evento.descricao)}</p>
                        <div class="flex flex-wrap items-center gap-x-space-md gap-y-1 font-caption text-caption text-on-surface-variant mt-1">
                            <span>${window.ccUI.escapeHtml(window.ccUI.formatarDataHora(evento.criado_em))}</span>
                            <span>Por: ${window.ccUI.escapeHtml(autor)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (erro) {
        console.error('Erro ao carregar histórico:', erro);
        container.innerHTML = window.ccUI.estadoErro({
            titulo: 'Não foi possível carregar o histórico',
            mensagem: window.ccUI.mensagemErroDados(erro),
            acoes: [{ rotulo: 'Tentar novamente', onclick: 'carregarHistoricoObra(currentObraId)', classe: 'cc-btn cc-btn--secundario' }]
        });
    } finally {
        container.setAttribute('aria-busy', 'false');
    }
}
