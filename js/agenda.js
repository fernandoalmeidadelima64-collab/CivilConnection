/* ==========================================================================
   Civil Connection — Agenda técnica
   ==========================================================================
   Visitas, inspeções e reuniões. Os dados vêm do Supabase e qualquer falha
   é exibida ao usuário — nunca substituída por conteúdo de demonstração.
   ========================================================================== */

let agendaDebounceTimer;
let agendamentosCarregados = [];

document.addEventListener('DOMContentLoaded', () => {
    const containerAgenda = document.getElementById('lista-agendamentos');
    if (containerAgenda) {
        carregarAgenda();
        setupFiltrosAgenda();
    }
});

function setupFiltrosAgenda() {
    const inputBusca = document.getElementById('busca-agenda');
    const selectObra = document.getElementById('filtro-obra-agenda');
    const selectStatus = document.getElementById('filtro-status-agenda');

    const disparar = () => {
        window.clearTimeout(agendaDebounceTimer);
        agendaDebounceTimer = window.setTimeout(carregarAgenda, 300);
    };

    if (inputBusca) inputBusca.addEventListener('input', disparar);
    if (selectObra) selectObra.addEventListener('change', disparar);
    if (selectStatus) selectStatus.addEventListener('change', disparar);
}

async function preencherFiltroObrasAgenda(obraSelecionada) {
    const select = document.getElementById('filtro-obra-agenda');
    if (!select || select.dataset.ccPreenchido === 'true') return;

    try {
        const obras = await window.dbService.getObras();
        select.innerHTML = '<option value="">Todas as obras</option>' + obras
            .map((obra) => `<option value="${window.ccUI.escapeHtml(obra.id)}">${window.ccUI.escapeHtml(obra.nome)}</option>`)
            .join('');
        select.dataset.ccPreenchido = 'true';
        if (obraSelecionada) select.value = obraSelecionada;
    } catch (erro) {
        console.error('Erro ao carregar obras para o filtro:', erro);
        select.innerHTML = '<option value="">Não foi possível carregar as obras</option>';
    }
}

async function carregarAgenda() {
    const container = document.getElementById('lista-agendamentos');
    if (!container) return;

    const parametros = new URLSearchParams(window.location.search);
    const obraParametro = parametros.get('obra_id') || '';
    const busca = (document.getElementById('busca-agenda')?.value || '').trim();
    const obraId = document.getElementById('filtro-obra-agenda')?.value || obraParametro;
    const status = document.getElementById('filtro-status-agenda')?.value || '';

    await preencherFiltroObrasAgenda(obraParametro);

    container.setAttribute('aria-busy', 'true');
    container.innerHTML = `<div class="col-span-full">${window.ccUI.estadoCarregando('Carregando compromissos da agenda...')}</div>`;

    try {
        agendamentosCarregados = await window.dbService.getAgendamentos({ obra_id: obraId, status, busca });

        if (!agendamentosCarregados.length) {
            const temFiltro = !!(busca || obraId || status);
            container.innerHTML = `<div class="col-span-full">${window.ccUI.estadoVazio({
                icone: 'event_busy',
                titulo: temFiltro ? 'Nenhum compromisso com esses filtros' : 'Nenhum compromisso agendado',
                mensagem: temFiltro
                    ? 'Ajuste a busca, a obra ou o status para localizar o compromisso.'
                    : 'Agende visitas técnicas, inspeções e reuniões para acompanhar o canteiro.',
                acoes: temFiltro
                    ? [{ rotulo: 'Limpar filtros', onclick: 'limparFiltrosAgenda()', classe: 'cc-btn cc-btn--secundario' }]
                    : [{ rotulo: 'Novo compromisso', onclick: 'abrirModalNovoAgendamento()', classe: 'cc-btn cc-btn--primario' }]
            })}</div>`;
            return;
        }

        container.innerHTML = agendamentosCarregados.map(renderCardAgendamento).join('');
    } catch (erro) {
        console.error('Erro ao carregar agenda:', erro);
        container.innerHTML = `<div class="col-span-full">${window.ccUI.estadoErro({
            titulo: 'Não foi possível carregar a agenda',
            mensagem: window.ccUI.mensagemErroDados(erro),
            acoes: [{ rotulo: 'Tentar novamente', onclick: 'carregarAgenda()', classe: 'cc-btn cc-btn--secundario' }]
        })}</div>`;
    } finally {
        container.setAttribute('aria-busy', 'false');
    }
}

function limparFiltrosAgenda() {
    const busca = document.getElementById('busca-agenda');
    const obra = document.getElementById('filtro-obra-agenda');
    const status = document.getElementById('filtro-status-agenda');
    if (busca) busca.value = '';
    if (obra) obra.value = '';
    if (status) status.value = '';
    carregarAgenda();
}

function renderCardAgendamento(agendamento) {
    const statusConfig = {
        agendado: { label: 'Agendado', classe: 'bg-blue-100 text-blue-800' },
        confirmado: { label: 'Confirmado', classe: 'bg-green-100 text-status-concluida' },
        concluido: { label: 'Concluído', classe: 'bg-surface-subtle text-on-surface-variant' },
        cancelado: { label: 'Cancelado', classe: 'bg-red-100 text-error' }
    };
    const tipoConfig = {
        visita_tecnica: { label: 'Visita técnica', icone: 'engineering' },
        inspecao: { label: 'Inspeção / vistoria', icone: 'verified' },
        reuniao: { label: 'Reunião de alinhamento', icone: 'groups' },
        outro: { label: 'Outro compromisso', icone: 'event' }
    };
    const st = statusConfig[agendamento.status] || statusConfig.agendado;
    const tp = tipoConfig[agendamento.tipo] || tipoConfig.visita_tecnica;

    const inicio = new Date(agendamento.inicio);
    const fim = new Date(agendamento.fim);
    const inicioValido = !Number.isNaN(inicio.getTime());
    const fimValido = !Number.isNaN(fim.getTime());

    const dia = inicioValido ? inicio.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }) : 'Data inválida';
    const horaInicio = inicioValido ? window.ccUI.formatarHora(inicio) : '--:--';
    const horaFim = fimValido ? window.ccUI.formatarHora(fim) : '--:--';
    const obraNome = agendamento.obras && agendamento.obras.nome ? agendamento.obras.nome : 'Obra não informada';
    const responsavel = agendamento.profissionais && agendamento.profissionais.nome
        ? agendamento.profissionais.nome
        : 'Sem responsável definido';
    const titulo = window.ccUI.escapeHtml(agendamento.titulo);

    return `
        <article class="bg-surface-card p-space-lg rounded-xl shadow-sm border border-border-subtle flex flex-col justify-between gap-space-md cc-agendamento">
            <div class="flex flex-col gap-space-xs">
                <div class="flex flex-wrap items-start justify-between gap-space-xs">
                    <span class="inline-flex items-center gap-1 font-caption text-caption uppercase text-status-em-andamento font-bold tracking-wider">
                        <span class="material-symbols-outlined text-[16px]" aria-hidden="true">${tp.icone}</span>
                        ${tp.label}
                    </span>
                    <span class="px-2.5 py-1 rounded-full font-caption text-caption font-semibold ${st.classe}">
                        ${st.label}
                    </span>
                </div>

                <h3 class="font-title-md text-title-md text-on-surface font-bold cc-quebra">${titulo}</h3>

                <div class="flex items-center gap-space-sm bg-surface-subtle p-2.5 rounded-lg text-on-surface font-label-md text-label-md my-1">
                    <span class="material-symbols-outlined text-primary text-[18px] shrink-0" aria-hidden="true">schedule</span>
                    <span class="cc-quebra">${window.ccUI.escapeHtml(dia)} — ${horaInicio} às ${horaFim}</span>
                </div>

                <p class="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px] shrink-0" aria-hidden="true">apartment</span>
                    <span class="cc-quebra">Obra: <strong class="text-on-surface">${window.ccUI.escapeHtml(obraNome)}</strong></span>
                </p>

                <p class="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px] shrink-0" aria-hidden="true">badge</span>
                    <span class="cc-quebra">Responsável: <strong class="text-on-surface">${window.ccUI.escapeHtml(responsavel)}</strong></span>
                </p>

                ${agendamento.observacoes ? `<p class="font-body-sm text-body-sm text-on-surface-variant mt-1 border-t border-border-subtle pt-2 cc-quebra">${window.ccUI.escapeHtml(agendamento.observacoes)}</p>` : ''}
            </div>

            <div class="flex flex-wrap items-center justify-between pt-space-xs border-t border-border-subtle gap-space-sm">
                <div class="flex items-center gap-1">
                    ${agendamento.status !== 'cancelado' ? `
                        <button type="button" onclick="alterarStatusAgendamento('${window.ccUI.escapeHtml(agendamento.id)}', 'cancelado')"
                                class="min-h-11 px-2.5 rounded-lg text-error hover:bg-error-container/20 font-caption text-caption font-semibold">
                            Cancelar
                        </button>
                        <button type="button" onclick="alterarStatusAgendamento('${window.ccUI.escapeHtml(agendamento.id)}', 'confirmado')"
                                class="min-h-11 px-2.5 rounded-lg text-status-concluida hover:bg-green-100 font-caption text-caption font-semibold">
                            Confirmar
                        </button>
                    ` : '<span class="font-caption text-caption text-error font-semibold">Compromisso cancelado</span>'}
                </div>

                <button type="button" onclick="abrirModalNovoAgendamento('${window.ccUI.escapeHtml(agendamento.id)}')"
                        class="inline-flex items-center justify-center gap-1 min-h-11 px-space-sm py-2 rounded-lg bg-surface-subtle hover:bg-surface-container text-on-surface font-label-sm text-label-sm transition-colors">
                    <span class="material-symbols-outlined text-[16px]" aria-hidden="true">edit</span>
                    <span>Editar</span>
                </button>
            </div>
        </article>
    `;
}

async function alterarStatusAgendamento(id, status) {
    try {
        await window.dbService.updateAgendamentoStatus(id, status);
        window.ccUI.mostrarAviso(
            status === 'cancelado' ? 'Compromisso cancelado.' : 'Presença confirmada.',
            'sucesso'
        );
        carregarAgenda();
    } catch (erro) {
        console.error('Erro ao alterar status do compromisso:', erro);
        window.ccUI.mostrarAviso(window.ccUI.mensagemErroDados(erro), 'erro');
    }
}

function criarModalAgendamento() {
    const modal = document.createElement('div');
    modal.id = 'modal-novo-agendamento';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm hidden';
    modal.innerHTML = `
        <div class="bg-surface-card rounded-xl shadow-xl w-full max-w-lg p-space-lg mx-4 flex flex-col gap-space-md cc-modal__painel max-h-[90dvh] overflow-y-auto">
            <div class="flex items-center justify-between gap-2">
                <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold" id="titulo-modal-agendamento">Agendar novo compromisso</h3>
                <button type="button" data-cc-fechar class="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg hover:bg-surface-subtle text-on-surface-variant" aria-label="Fechar">
                    <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
                </button>
            </div>
            <form class="flex flex-col gap-space-md" id="form-novo-agendamento" novalidate>
                <input type="hidden" id="agendamento-id" />
                <div id="agendamento-feedback-msg" class="hidden p-3 rounded-lg text-body-sm font-label-sm text-center" role="alert" aria-live="polite"></div>

                <div class="flex flex-col gap-1.5">
                    <label class="font-label-sm text-label-sm text-on-surface" for="agendamento-titulo">Título do compromisso *</label>
                    <input type="text" id="agendamento-titulo" required maxlength="160" placeholder="Ex.: vistoria técnica da laje do 5º pavimento"
                           class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface" for="agendamento-obra">Obra *</label>
                        <select id="agendamento-obra" required class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none">
                            <option value="">Carregando...</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface" for="agendamento-tipo">Tipo *</label>
                        <select id="agendamento-tipo" required class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none">
                            <option value="visita_tecnica">Visita técnica</option>
                            <option value="inspecao">Inspeção / vistoria</option>
                            <option value="reuniao">Reunião</option>
                            <option value="outro">Outro</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface" for="agendamento-inicio">Início *</label>
                        <input type="datetime-local" id="agendamento-inicio" required class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface" for="agendamento-fim">Término *</label>
                        <input type="datetime-local" id="agendamento-fim" required class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface" for="agendamento-responsavel">Profissional responsável</label>
                        <select id="agendamento-responsavel" class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none">
                            <option value="">Carregando...</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface" for="agendamento-status">Status</label>
                        <select id="agendamento-status" class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none">
                            <option value="agendado">Agendado</option>
                            <option value="confirmado">Confirmado</option>
                            <option value="concluido">Concluído</option>
                            <option value="cancelado">Cancelado</option>
                        </select>
                    </div>
                </div>

                <div class="flex flex-col gap-1.5">
                    <label class="font-label-sm text-label-sm text-on-surface" for="agendamento-obs">Local / observações técnicas</label>
                    <textarea id="agendamento-obs" rows="3" maxlength="500"
                              class="p-3 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none"></textarea>
                </div>

                <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-space-sm pt-space-xs">
                    <button type="button" data-cc-fechar class="min-h-11 px-space-md py-2 rounded-lg bg-surface-subtle text-on-surface font-label-md text-label-md">Cancelar</button>
                    <button type="submit" id="btn-salvar-agendamento" class="min-h-11 px-space-md py-2 rounded-lg bg-status-em-andamento text-on-primary font-label-md text-label-md shadow-sm">Salvar compromisso</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-cc-fechar]').forEach((botao) => {
        botao.addEventListener('click', () => modal.classList.add('hidden'));
    });
    modal.querySelector('#form-novo-agendamento').addEventListener('submit', salvarAgendamentoSubmit);
    return modal;
}

async function abrirModalNovoAgendamento(agendamentoId = null) {
    let modal = document.getElementById('modal-novo-agendamento');
    if (!modal) modal = criarModalAgendamento();

    const selectObra = document.getElementById('agendamento-obra');
    const selectResp = document.getElementById('agendamento-responsavel');
    const msgEl = document.getElementById('agendamento-feedback-msg');
    if (msgEl) msgEl.classList.add('hidden');

    try {
        const [obras, profissionais] = await Promise.all([
            window.dbService.getObras(),
            window.dbService.getProfissionais()
        ]);

        if (selectObra) {
            selectObra.innerHTML = '<option value="">Selecione a obra...</option>' + obras
                .map((obra) => `<option value="${window.ccUI.escapeHtml(obra.id)}">${window.ccUI.escapeHtml(obra.nome)}</option>`)
                .join('');
            if (!obras.length) selectObra.innerHTML = '<option value="">Nenhuma obra cadastrada</option>';
        }

        if (selectResp) {
            selectResp.innerHTML = '<option value="">Sem responsável definido</option>' + profissionais
                .map((profissional) => `<option value="${window.ccUI.escapeHtml(profissional.id)}">${window.ccUI.escapeHtml(profissional.nome)} — ${window.ccUI.escapeHtml(profissional.especialidade)}</option>`)
                .join('');
        }
    } catch (erro) {
        console.error('Erro ao carregar dados do agendamento:', erro);
        if (selectObra) selectObra.innerHTML = '<option value="">Não foi possível carregar as obras</option>';
        if (selectResp) selectResp.innerHTML = '<option value="">Não foi possível carregar os profissionais</option>';
        window.ccUI.mostrarAviso(window.ccUI.mensagemErroDados(erro), 'erro');
    }

    const form = document.getElementById('form-novo-agendamento');
    if (form) form.reset();
    if (msgEl) { msgEl.textContent = ''; msgEl.classList.add('hidden'); }

    if (agendamentoId) {
        const agendamento = agendamentosCarregados.find((item) => item.id === agendamentoId);
        document.getElementById('titulo-modal-agendamento').textContent = 'Editar compromisso';
        document.getElementById('agendamento-id').value = agendamentoId;

        if (agendamento) {
            document.getElementById('agendamento-titulo').value = agendamento.titulo || '';
            document.getElementById('agendamento-obra').value = agendamento.obra_id || '';
            document.getElementById('agendamento-tipo').value = agendamento.tipo || 'visita_tecnica';
            document.getElementById('agendamento-inicio').value = window.ccUI.paraInputDatetimeLocal(agendamento.inicio);
            document.getElementById('agendamento-fim').value = window.ccUI.paraInputDatetimeLocal(agendamento.fim);
            document.getElementById('agendamento-responsavel').value = agendamento.responsavel_id || '';
            document.getElementById('agendamento-status').value = agendamento.status || 'agendado';
            document.getElementById('agendamento-obs').value = agendamento.observacoes || '';
        }
    } else {
        document.getElementById('titulo-modal-agendamento').textContent = 'Agendar novo compromisso';
        document.getElementById('agendamento-id').value = '';
        const amanha = new Date();
        amanha.setDate(amanha.getDate() + 1);
        amanha.setHours(9, 0, 0, 0);
        const amanhaFim = new Date(amanha);
        amanhaFim.setHours(10, 0, 0, 0);
        document.getElementById('agendamento-inicio').value = window.ccUI.paraInputDatetimeLocal(amanha);
        document.getElementById('agendamento-fim').value = window.ccUI.paraInputDatetimeLocal(amanhaFim);
    }

    const obraParametro = new URLSearchParams(window.location.search).get('obra_id');
    if (obraParametro && !agendamentoId && selectObra) selectObra.value = obraParametro;

    modal.classList.remove('hidden');
    window.setTimeout(() => document.getElementById('agendamento-titulo')?.focus({ preventScroll: true }), 60);
}

function exibirFeedbackAgendamento(mensagem, tipo) {
    const msgEl = document.getElementById('agendamento-feedback-msg');
    if (!msgEl) {
        window.ccUI.mostrarAviso(mensagem, tipo === 'sucesso' ? 'sucesso' : 'erro');
        return;
    }
    msgEl.textContent = mensagem;
    msgEl.className = `p-3 rounded-lg font-label-sm text-label-sm text-center mb-2 ${tipo === 'sucesso' ? 'bg-status-concluida/10 text-status-concluida' : 'bg-error-container text-on-error-container'}`;
    msgEl.setAttribute('role', tipo === 'sucesso' ? 'status' : 'alert');
    msgEl.classList.remove('hidden');
}

async function salvarAgendamentoSubmit(evento) {
    evento.preventDefault();
    const msgEl = document.getElementById('agendamento-feedback-msg');
    const botao = document.getElementById('btn-salvar-agendamento');
    if (msgEl) msgEl.classList.add('hidden');

    const id = document.getElementById('agendamento-id')?.value || null;
    const titulo = (document.getElementById('agendamento-titulo')?.value || '').trim();
    const obraId = document.getElementById('agendamento-obra')?.value || '';
    const tipo = document.getElementById('agendamento-tipo')?.value || 'visita_tecnica';
    const inicio = document.getElementById('agendamento-inicio')?.value || '';
    const fim = document.getElementById('agendamento-fim')?.value || '';
    const responsavelId = document.getElementById('agendamento-responsavel')?.value || null;
    const status = document.getElementById('agendamento-status')?.value || 'agendado';
    const observacoes = (document.getElementById('agendamento-obs')?.value || '').trim();

    if (!titulo || !obraId || !inicio || !fim) {
        return exibirFeedbackAgendamento('Preencha os campos obrigatórios: título, obra, início e término.', 'erro');
    }
    if (new Date(fim) <= new Date(inicio)) {
        return exibirFeedbackAgendamento('O término deve ser posterior ao início do compromisso.', 'erro');
    }

    try {
        if (botao) { botao.disabled = true; botao.setAttribute('aria-busy', 'true'); }

        await window.dbService.saveAgendamento({
            id,
            obra_id: obraId,
            titulo,
            tipo,
            inicio: new Date(inicio).toISOString(),
            fim: new Date(fim).toISOString(),
            responsavel_id: responsavelId,
            status,
            observacoes
        });

        document.getElementById('modal-novo-agendamento')?.classList.add('hidden');
        window.ccUI.mostrarAviso(id ? 'Compromisso atualizado.' : 'Compromisso agendado.', 'sucesso');
        carregarAgenda();
    } catch (erro) {
        console.error('Erro ao salvar agendamento:', erro);
        exibirFeedbackAgendamento(window.ccUI.mensagemErroDados(erro), 'erro');
    } finally {
        if (botao) { botao.disabled = false; botao.removeAttribute('aria-busy'); }
    }
}
