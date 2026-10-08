/* ============================================================
   Civil Conection — Módulo de Etapas da Obra
   ============================================================ */

async function carregarEtapasObra(obraId) {
    const container = document.getElementById('lista-etapas-obra');
    if (!container) return;

    container.innerHTML = `
        <div class="py-8 text-center text-on-surface-variant">
            <span class="material-symbols-outlined text-3xl animate-spin mb-1">progress_activity</span>
            <p class="font-body-sm text-body-sm">Carregando cronograma de etapas do Supabase...</p>
        </div>
    `;

    try {
        const etapas = await dbService.getEtapasByObra(obraId);

        if (!etapas || etapas.length === 0) {
            container.innerHTML = `
                <div class="bg-surface-card p-6 rounded-xl text-center border border-border-subtle">
                    <p class="font-body-md text-body-md text-on-surface-variant">Nenhuma etapa cadastrada nesta obra ainda.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = etapas.map(e => renderEtapaRow(e)).join('');
    } catch (err) {
        console.error('Erro ao carregar etapas:', err);
        container.innerHTML = `
            <div class="bg-error-container/20 p-4 rounded-xl text-center text-error">
                Erro ao carregar etapas do banco de dados.
            </div>
        `;
    }
}

function renderEtapaRow(e) {
    const statusConfig = {
        'pendente': { label: 'Pendente', class: 'bg-surface-subtle text-status-planejamento', icon: 'radio_button_unchecked' },
        'em_andamento': { label: 'Em Andamento', class: 'bg-secondary-fixed text-status-em-andamento', icon: 'sync' },
        'concluida': { label: 'Concluída', class: 'bg-green-100 text-status-concluida', icon: 'check_circle' }
    };

    const st = statusConfig[e.status] || statusConfig['pendente'];
    const prog = Math.min(100, Math.max(0, Number(e.progresso) || 0));

    return `
        <div class="bg-surface-card p-space-md rounded-xl border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-space-md shadow-sm">
            <div class="flex items-start gap-space-sm">
                <span class="material-symbols-outlined text-[24px] ${st.class.split(' ')[1]} mt-0.5">${st.icon}</span>
                <div class="flex flex-col">
                    <h4 class="font-title-md text-title-md text-on-surface font-semibold">${e.nome}</h4>
                    <p class="font-body-sm text-body-sm text-on-surface-variant">${e.descricao || 'Sem descrição.'}</p>
                </div>
            </div>

            <div class="flex items-center gap-space-lg self-end sm:self-auto">
                <div class="flex flex-col items-end w-32">
                    <div class="flex justify-between w-full font-caption text-caption text-on-surface-variant mb-1">
                        <span>Progresso</span>
                        <span class="font-bold text-on-surface">${prog}%</span>
                    </div>
                    <input type="range" min="0" max="100" value="${prog}"
                           onchange="atualizarProgressoEtapa('${e.id}', this.value)"
                           class="w-full accent-status-em-andamento cursor-pointer" />
                </div>

                <select onchange="atualizarStatusEtapa('${e.id}', this.value)" class="h-9 px-2 rounded-lg bg-surface-subtle font-caption text-caption text-on-surface font-semibold focus:outline-none">
                    <option value="pendente" ${e.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="em_andamento" ${e.status === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
                    <option value="concluida" ${e.status === 'concluida' ? 'selected' : ''}>Concluída</option>
                </select>
            </div>
        </div>
    `;
}

async function atualizarProgressoEtapa(etapaId, novoProgresso) {
    try {
        const prog = Number(novoProgresso);
        let status = 'em_andamento';
        if (prog === 0) status = 'pendente';
        if (prog === 100) status = 'concluida';

        await dbService.updateEtapa(etapaId, { progresso: prog, status });

        // Recarregar tela de detalhes
        const params = new URLSearchParams(window.location.search);
        const obraId = params.get('obra_id');
        if (obraId && typeof carregarDetalhesObra === 'function') {
            carregarDetalhesObra();
        }
    } catch (err) {
        console.error('Erro ao atualizar progresso:', err);
    }
}

async function atualizarStatusEtapa(etapaId, novoStatus) {
    try {
        let prog = novoStatus === 'concluida' ? 100 : (novoStatus === 'pendente' ? 0 : 50);
        await dbService.updateEtapa(etapaId, { status: novoStatus, progresso: prog });

        const params = new URLSearchParams(window.location.search);
        const obraId = params.get('obra_id');
        if (obraId && typeof carregarDetalhesObra === 'function') {
            carregarDetalhesObra();
        }
    } catch (err) {
        console.error('Erro ao atualizar status:', err);
    }
}

async function cadastrarNovaEtapa(e) {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    const obra_id = params.get('obra_id');

    const nome = document.getElementById('nome-etapa')?.value.trim();
    const descricao = document.getElementById('descricao-etapa')?.value.trim();
    const progresso = document.getElementById('progresso-etapa')?.value || 0;
    const status = document.getElementById('status-etapa')?.value || 'pendente';

    if (!obra_id) return;
    if (!nome) {
        alert('Nome da etapa é obrigatório.');
        return;
    }

    try {
        await dbService.saveEtapa({
            obra_id,
            nome,
            descricao,
            progresso,
            status
        });

        // Limpar form e fechar modal se houver
        document.getElementById('form-nova-etapa')?.reset();
        const modal = document.getElementById('modal-nova-etapa');
        if (modal) modal.classList.add('hidden');

        if (typeof carregarDetalhesObra === 'function') {
            carregarDetalhesObra();
        }
    } catch (err) {
        console.error('Erro ao cadastrar etapa:', err);
    }
}
