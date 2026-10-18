/* ============================================================
   Civil Conection — Módulo de Agendamento Online (CC-04)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const containerAgenda = document.getElementById('lista-agendamentos');
    if (containerAgenda) {
        carregarAgenda();
        setupFiltrosAgenda();
    }
});

let agendaDebounceTimer;

function setupFiltrosAgenda() {
    const inputBusca = document.getElementById('busca-agenda');
    const selectObra = document.getElementById('filtro-obra-agenda');
    const selectStatus = document.getElementById('filtro-status-agenda');

    const trigger = () => {
        clearTimeout(agendaDebounceTimer);
        agendaDebounceTimer = setTimeout(() => carregarAgenda(), 300);
    };

    if (inputBusca) inputBusca.addEventListener('input', trigger);
    if (selectObra) selectObra.addEventListener('change', trigger);
    if (selectStatus) selectStatus.addEventListener('change', trigger);
}

async function carregarAgenda() {
    const container = document.getElementById('lista-agendamentos');
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const paramObraId = params.get('obra_id');

    const busca = document.getElementById('busca-agenda')?.value.trim() || '';
    const obra_id = document.getElementById('filtro-obra-agenda')?.value || paramObraId || '';
    const status = document.getElementById('filtro-status-agenda')?.value || '';

    // Preencher select de obras se vazio
    const selectObra = document.getElementById('filtro-obra-agenda');
    if (selectObra && selectObra.options.length <= 1) {
        const obras = await dbService.getObras();
        selectObra.innerHTML = '<option value="">Todas as Obras</option>' +
            obras.map(o => `<option value="${o.id}" ${o.id === obra_id ? 'selected' : ''}>${o.nome}</option>`).join('');
    }

    container.innerHTML = `
        <div class="col-span-full py-12 flex flex-col items-center justify-center text-on-surface-variant">
            <span class="material-symbols-outlined text-4xl animate-spin mb-2">progress_activity</span>
            <p class="font-body-md text-body-md">Carregando compromissos da agenda...</p>
        </div>
    `;

    try {
        const agendamentos = await dbService.getAgendamentos({ obra_id, status, busca });

        if (!agendamentos || agendamentos.length === 0) {
            container.innerHTML = `
                <div class="col-span-full bg-surface-card p-8 rounded-xl text-center border border-border-subtle">
                    <span class="material-symbols-outlined text-4xl text-on-surface-variant mb-2">event_busy</span>
                    <h3 class="font-headline-sm text-headline-sm text-on-surface mb-1">Nenhum compromisso agendado</h3>
                    <p class="font-body-md text-body-md text-on-surface-variant">Nenhum agendamento localizado com os filtros selecionados.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = agendamentos.map(a => renderCardAgendamento(a)).join('');
    } catch (err) {
        console.error('Erro ao carregar agenda:', err);
    }
}

function renderCardAgendamento(a) {
    const statusConfig = {
        'agendado': { label: 'Agendado', class: 'bg-blue-100 text-blue-800' },
        'confirmado': { label: 'Confirmado', class: 'bg-green-100 text-status-concluida' },
        'concluido': { label: 'Concluído', class: 'bg-surface-subtle text-on-surface-variant' },
        'cancelado': { label: 'Cancelado', class: 'bg-red-100 text-error' }
    };

    const tipoConfig = {
        'visita_tecnica': { label: 'Visita Técnica', icon: 'engineering' },
        'inspecao': { label: 'Inspeção / Vistoria', icon: 'verified' },
        'reuniao': { label: 'Reunião de Alinhamento', icon: 'groups' },
        'outro': { label: 'Outro Compromisso', icon: 'event' }
    };

    const st = statusConfig[a.status] || statusConfig['agendado'];
    const tp = tipoConfig[a.tipo] || tipoConfig['visita_tecnica'];

    const dtInicio = new Date(a.inicio);
    const dtFim = new Date(a.fim);

    const dataFormatada = dtInicio.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
    const horaInicio = dtInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const horaFim = dtFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const obraNome = a.obras ? a.obras.nome : 'Obra Não Especificada';
    const profNome = a.profissionais ? a.profissionais.nome : 'Sem especialista vinculado';

    return `
        <div class="bg-surface-card p-space-lg rounded-xl shadow-sm border border-border-subtle flex flex-col justify-between gap-space-md">
            <div class="flex flex-col gap-space-xs">
                <div class="flex items-start justify-between gap-space-xs">
                    <span class="inline-flex items-center gap-1 font-caption text-caption uppercase text-status-em-andamento font-bold tracking-wider">
                        <span class="material-symbols-outlined text-[16px]">${tp.icon}</span>
                        ${tp.label}
                    </span>
                    <span class="px-2.5 py-1 rounded-full font-caption text-caption font-semibold ${st.class}">
                        ${st.label}
                    </span>
                </div>

                <h3 class="font-title-md text-title-md text-on-surface font-bold">${a.titulo}</h3>

                <div class="flex items-center gap-space-sm bg-surface-subtle p-2.5 rounded-lg text-on-surface font-label-md text-label-md my-1">
                    <span class="material-symbols-outlined text-primary text-[18px]">schedule</span>
                    <span>${dataFormatada} — ${horaInicio} às ${horaFim}</span>
                </div>

                <p class="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">apartment</span>
                    <span>Obra: <strong class="text-on-surface">${obraNome}</strong></span>
                </p>

                <p class="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">badge</span>
                    <span>Responsável: <strong class="text-on-surface">${profNome}</strong></span>
                </p>

                ${a.observacoes ? `<p class="font-body-sm text-body-sm text-on-surface-variant mt-1 border-t border-border-subtle pt-2">${a.observacoes}</p>` : ''}
            </div>

            <div class="flex items-center justify-between pt-space-xs border-t border-border-subtle gap-space-sm">
                <div class="flex items-center gap-1">
                    ${a.status !== 'cancelado' ? `
                        <button type="button" onclick="alterarStatusAgendamento('${a.id}', 'cancelado')" class="p-1.5 rounded-lg text-error hover:bg-error-container/20 font-caption text-caption font-semibold" title="Cancelar Compromisso">
                            Cancelar
                        </button>
                        <button type="button" onclick="alterarStatusAgendamento('${a.id}', 'confirmado')" class="p-1.5 rounded-lg text-status-concluida hover:bg-green-100 font-caption text-caption font-semibold" title="Confirmar Presença">
                            Confirmar
                        </button>
                    ` : '<span class="font-caption text-caption text-error font-semibold">Cancelado</span>'}
                </div>

                <button type="button" onclick="abrirModalNovoAgendamento('${a.id}')" class="inline-flex items-center gap-1 py-1.5 px-space-sm rounded-lg bg-surface-subtle hover:bg-surface-container text-on-surface font-label-sm text-label-sm transition-colors">
                    <span class="material-symbols-outlined text-[16px]">edit</span>
                    <span>Editar</span>
                </button>
            </div>
        </div>
    `;
}

async function alterarStatusAgendamento(id, status) {
    try {
        await dbService.updateAgendamentoStatus(id, status);
        carregarAgenda();
    } catch (err) {
        console.error(err);
    }
}

async function abrirModalNovoAgendamento(agendamentoId = null) {
    let modal = document.getElementById('modal-novo-agendamento');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-novo-agendamento';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm hidden';
        modal.innerHTML = `
            <div class="bg-surface-card rounded-xl shadow-xl w-full max-w-lg p-space-lg mx-4 flex flex-col gap-space-md">
                <div class="flex items-center justify-between">
                    <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold" id="titulo-modal-agendamento">Agendar Novo Compromisso</h3>
                    <button type="button" onclick="document.getElementById('modal-novo-agendamento').classList.add('hidden')" class="p-1 rounded-lg hover:bg-surface-subtle text-on-surface-variant">
                        <span class="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
                <form class="flex flex-col gap-space-md" onsubmit="salvarAgendamentoSubmit(event)">
                    <input type="hidden" id="agendamento-id" />
                    <div id="agendamento-feedback-msg" class="hidden p-3 rounded-lg text-body-sm font-label-sm text-center"></div>

                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface">Título do Compromisso *</label>
                        <input type="text" id="agendamento-titulo" required placeholder="Ex: Vistoria Técnica da Laje 5" class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                    </div>

                    <div class="grid grid-cols-2 gap-space-sm">
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface">Obra *</label>
                            <select id="agendamento-obra" required class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none">
                                <option value="">Carregando...</option>
                            </select>
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface">Tipo *</label>
                            <select id="agendamento-tipo" required class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none">
                                <option value="visita_tecnica">Visita Técnica</option>
                                <option value="inspecao">Inspeção / Vistoria</option>
                                <option value="reuniao">Reunião</option>
                                <option value="outro">Outro</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-space-sm">
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface">Início *</label>
                            <input type="datetime-local" id="agendamento-inicio" required class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface">Término *</label>
                            <input type="datetime-local" id="agendamento-fim" required class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-space-sm">
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface">Profissional Responsável</label>
                            <select id="agendamento-responsavel" class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none">
                                <option value="">Carregando...</option>
                            </select>
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface">Status</label>
                            <select id="agendamento-status" class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none">
                                <option value="agendado">Agendado</option>
                                <option value="confirmado">Confirmado</option>
                                <option value="concluido">Concluído</option>
                                <option value="cancelado">Cancelado</option>
                            </select>
                        </div>
                    </div>

                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface">Local / Observações Técnicas</label>
                        <textarea id="agendamento-obs" rows="3" class="p-3 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none"></textarea>
                    </div>

                    <div class="flex items-center justify-end gap-space-sm pt-space-xs">
                        <button type="button" onclick="document.getElementById('modal-novo-agendamento').classList.add('hidden')" class="px-space-md py-2 rounded-lg bg-surface-subtle text-on-surface font-label-md text-label-md">Cancelar</button>
                        <button type="submit" id="btn-salvar-agendamento" class="px-space-md py-2 rounded-lg bg-status-em-andamento text-on-primary font-label-md text-label-md shadow-sm">Salvar Compromisso</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const selectObra = document.getElementById('agendamento-obra');
    const selectResp = document.getElementById('agendamento-responsavel');
    const msgEl = document.getElementById('agendamento-feedback-msg');
    if (msgEl) msgEl.classList.add('hidden');

    const obras = await dbService.getObras();
    const profs = await dbService.getProfissionais();

    if (selectObra) {
        selectObra.innerHTML = '<option value="">Selecione a obra...</option>' +
            obras.map(o => `<option value="${o.id}">${o.nome}</option>`).join('');
    }

    if (selectResp) {
        selectResp.innerHTML = '<option value="">Sem responsável definido</option>' +
            profs.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
    }

    if (agendamentoId) {
        document.getElementById('titulo-modal-agendamento').textContent = 'Editar Compromisso';
        document.getElementById('agendamento-id').value = agendamentoId;

        const agendamentos = await dbService.getAgendamentos();
        const target = agendamentos.find(a => a.id === agendamentoId);
        if (target) {
            document.getElementById('agendamento-titulo').value = target.titulo || '';
            document.getElementById('agendamento-obra').value = target.obra_id || '';
            document.getElementById('agendamento-tipo').value = target.tipo || 'visita_tecnica';
            document.getElementById('agendamento-inicio').value = target.inicio ? new Date(target.inicio).toISOString().slice(0, 16) : '';
            document.getElementById('agendamento-fim').value = target.fim ? new Date(target.fim).toISOString().slice(0, 16) : '';
            document.getElementById('agendamento-responsavel').value = target.responsavel_id || '';
            document.getElementById('agendamento-status').value = target.status || 'agendado';
            document.getElementById('agendamento-obs').value = target.observacoes || '';
        }
    } else {
        document.getElementById('titulo-modal-agendamento').textContent = 'Agendar Novo Compromisso';
        document.getElementById('agendamento-id').value = '';
        document.getElementById('agendamento-titulo').value = '';
        document.getElementById('agendamento-obs').value = '';

        // Default: Amanhã às 09:00 e 10:00
        const amanha = new Date(); amanha.setDate(amanha.getDate() + 1); amanha.setHours(9, 0, 0, 0);
        const amanhaFim = new Date(amanha); amanhaFim.setHours(10, 0, 0, 0);
        document.getElementById('agendamento-inicio').value = amanha.toISOString().slice(0, 16);
        document.getElementById('agendamento-fim').value = amanhaFim.toISOString().slice(0, 16);
    }

    modal.classList.remove('hidden');
}

async function salvarAgendamentoSubmit(e) {
    e.preventDefault();
    const msgEl = document.getElementById('agendamento-feedback-msg');
    const btn = document.getElementById('btn-salvar-agendamento');

    if (msgEl) msgEl.classList.add('hidden');

    const id = document.getElementById('agendamento-id')?.value || null;
    const titulo = document.getElementById('agendamento-titulo')?.value.trim();
    const obra_id = document.getElementById('agendamento-obra')?.value;
    const tipo = document.getElementById('agendamento-tipo')?.value;
    const inicio = document.getElementById('agendamento-inicio')?.value;
    const fim = document.getElementById('agendamento-fim')?.value;
    const responsavel_id = document.getElementById('agendamento-responsavel')?.value || null;
    const status = document.getElementById('agendamento-status')?.value || 'agendado';
    const observacoes = document.getElementById('agendamento-obs')?.value.trim();

    if (!titulo || !obra_id || !inicio || !fim) {
        if (msgEl) {
            msgEl.textContent = 'Por favor preencha todos os campos obrigatórios (*).';
            msgEl.className = 'p-3 rounded-lg bg-error-container text-on-error-container font-label-sm text-label-sm text-center mb-2';
            msgEl.classList.remove('hidden');
        }
        return;
    }

    try {
        if (btn) btn.disabled = true;

        await dbService.saveAgendamento({
            id,
            obra_id,
            titulo,
            tipo,
            inicio: new Date(inicio).toISOString(),
            fim: new Date(fim).toISOString(),
            responsavel_id,
            status,
            observacoes
        });

        document.getElementById('modal-novo-agendamento')?.classList.add('hidden');
        carregarAgenda();
    } catch (err) {
        console.error(err);
        if (msgEl) {
            msgEl.textContent = err.message || 'Falha ao salvar agendamento.';
            msgEl.className = 'p-3 rounded-lg bg-error-container text-on-error-container font-label-sm text-label-sm text-center mb-2';
            msgEl.classList.remove('hidden');
        } else {
            alert(err.message);
        }
    } finally {
        if (btn) btn.disabled = false;
    }
}
