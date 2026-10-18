/* ============================================================
   Civil Conection — Módulo de Etapas, Tarefas, Diário & Histórico
   (CC-02, CC-03, CC-06, CC-07, CC-08, CC-09)
   ============================================================ */

let currentObraId = null;
let currentTab = 'etapas';

async function inicializarDetalhesObra(obraId) {
    currentObraId = obraId;
    setupTabNavigation();
    await carregarEtapasObra(obraId);
    await carregarDiarioEAnexos(obraId);
    await carregarEquipeObra(obraId);
    await carregarHistoricoObra(obraId);
}

function switchObraTab(tabName) {
    currentTab = tabName;
    const tabs = ['etapas', 'diario', 'equipe', 'historico'];
    tabs.forEach(t => {
        const tabBtn = document.getElementById(`tab-btn-${t}`);
        const tabContent = document.getElementById(`tab-content-${t}`);

        if (t === tabName) {
            if (tabBtn) tabBtn.className = 'py-3 px-space-md font-label-md text-label-md text-status-em-andamento border-b-2 border-status-em-andamento font-semibold';
            if (tabContent) tabContent.classList.remove('hidden');
        } else {
            if (tabBtn) tabBtn.className = 'py-3 px-space-md font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors';
            if (tabContent) tabContent.classList.add('hidden');
        }
    });
}

function setupTabNavigation() {
    ['etapas', 'diario', 'equipe', 'historico'].forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        if (btn) {
            btn.addEventListener('click', () => switchObraTab(t));
        }
    });
}

// ---- CC-03 — ETAPAS E TAREFAS DE OBRA ----
async function carregarEtapasObra(obraId) {
    const container = document.getElementById('lista-etapas-obra');
    if (!container) return;

    try {
        const etapas = await dbService.getEtapasByObra(obraId);
        const tarefas = await dbService.getTarefasByObra(obraId);
        const profissionais = await dbService.getProfissionais();

        if (!etapas || etapas.length === 0) {
            container.innerHTML = `
                <div class="bg-surface-card p-8 rounded-xl text-center border border-border-subtle">
                    <span class="material-symbols-outlined text-4xl text-on-surface-variant mb-2">assignment_late</span>
                    <p class="font-body-md text-body-md text-on-surface-variant">Nenhuma etapa cadastrada nesta obra ainda.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = etapas.map(e => {
            const tarefasEtapa = tarefas.filter(t => t.etapa_id === e.id);
            return renderEtapaCardCompleto(e, tarefasEtapa, profissionais);
        }).join('');
    } catch (err) {
        console.error('Erro ao carregar etapas:', err);
        container.innerHTML = `<div class="p-4 rounded-xl bg-error-container text-error text-center">Erro ao carregar etapas do banco de dados.</div>`;
    }
}

function renderEtapaCardCompleto(e, tarefasEtapa, profissionais) {
    const statusConfig = {
        'pendente': { label: 'Pendente', class: 'bg-surface-subtle text-status-planejamento', icon: 'radio_button_unchecked' },
        'em_andamento': { label: 'Em Andamento', class: 'bg-secondary-fixed text-status-em-andamento', icon: 'sync' },
        'concluida': { label: 'Concluída', class: 'bg-green-100 text-status-concluida', icon: 'check_circle' }
    };

    const st = statusConfig[e.status] || statusConfig['pendente'];
    const prog = Math.min(100, Math.max(0, Number(e.progresso) || 0));

    return `
        <div class="bg-surface-card p-space-lg rounded-xl border border-border-subtle flex flex-col gap-space-md shadow-sm">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md border-b border-border-subtle pb-space-sm">
                <div class="flex items-start gap-space-sm">
                    <span class="material-symbols-outlined text-[24px] ${st.class.split(' ')[1]} mt-0.5">${st.icon}</span>
                    <div class="flex flex-col">
                        <h4 class="font-title-md text-title-md text-on-surface font-bold">${e.nome}</h4>
                        <p class="font-body-sm text-body-sm text-on-surface-variant">${e.descricao || 'Sem escopo detalhado.'}</p>
                    </div>
                </div>

                <div class="flex items-center gap-space-md self-end sm:self-auto">
                    <div class="flex flex-col items-end w-36">
                        <div class="flex justify-between w-full font-caption text-caption text-on-surface-variant mb-1">
                            <span>Avanço Etapa</span>
                            <span class="font-bold text-on-surface">${prog}%</span>
                        </div>
                        <input type="range" min="0" max="100" value="${prog}"
                               onchange="atualizarProgressoEtapa('${e.id}', this.value)"
                               class="w-full accent-status-em-andamento cursor-pointer" />
                    </div>

                    <select onchange="atualizarStatusEtapa('${e.id}', this.value)" class="h-9 px-2.5 rounded-lg bg-surface-subtle font-caption text-caption text-on-surface font-semibold focus:outline-none">
                        <option value="pendente" ${e.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="em_andamento" ${e.status === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
                        <option value="concluida" ${e.status === 'concluida' ? 'selected' : ''}>Concluída</option>
                    </select>

                    <button type="button" onclick="abrirModalNovaTarefa('${e.id}')" class="inline-flex items-center gap-1 py-1.5 px-space-sm rounded-lg bg-surface-subtle hover:bg-surface-container font-label-sm text-label-sm text-on-surface transition-colors" title="Cadastrar Atividade">
                        <span class="material-symbols-outlined text-[16px]">add_task</span>
                        <span>Nova Tarefa</span>
                    </button>
                </div>
            </div>

            <!-- Lista de Tarefas da Etapa -->
            <div class="flex flex-col gap-space-xs pl-space-md">
                ${tarefasEtapa.length === 0 ? `
                    <p class="font-caption text-caption text-on-surface-variant italic py-1">Nenhuma atividade individual vinculada a esta etapa ainda.</p>
                ` : tarefasEtapa.map(t => renderTarefaRow(t, profissionais)).join('')}
            </div>
        </div>
    `;
}

function renderTarefaRow(t, profissionais) {
    const statusTarefaMap = {
        'pendente': { label: 'Pendente', class: 'bg-surface-subtle text-status-planejamento' },
        'em_andamento': { label: 'Em Andamento', class: 'bg-orange-100 text-status-em-andamento' },
        'concluida': { label: 'Concluída', class: 'bg-green-100 text-status-concluida' },
        'atrasada': { label: 'Atrasada', class: 'bg-red-100 text-error font-bold' },
        'bloqueada': { label: 'Bloqueada', class: 'bg-yellow-100 text-amber-800 font-bold' }
    };

    const st = statusTarefaMap[t.status] || statusTarefaMap['pendente'];
    const respNome = t.profissionais ? t.profissionais.nome : 'Não atribuído';

    return `
        <div class="p-space-sm rounded-lg bg-surface-subtle/60 border border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
            <div class="flex flex-col flex-1">
                <div class="flex items-center gap-space-sm">
                    <span class="font-title-md text-title-md text-on-surface font-semibold">${t.nome}</span>
                    <span class="px-2 py-0.5 rounded-full font-caption text-caption ${st.class}">${st.label}</span>
                </div>
                ${t.descricao ? `<p class="font-body-sm text-body-sm text-on-surface-variant">${t.descricao}</p>` : ''}
                <div class="flex items-center gap-space-md font-caption text-caption text-on-surface-variant mt-1">
                    <span>Resp: <strong class="text-on-surface">${respNome}</strong></span>
                    ${t.data_fim_prevista ? `<span>Previsão: ${new Date(t.data_fim_prevista).toLocaleDateString('pt-BR')}</span>` : ''}
                    ${t.justificativa_atraso ? `<span class="text-error font-semibold">Atraso: ${t.justificativa_atraso}</span>` : ''}
                </div>
            </div>

            <div class="flex items-center gap-space-md shrink-0">
                <div class="flex flex-col items-end w-28">
                    <span class="font-caption text-caption text-on-surface-variant">Progresso: <strong>${t.progresso}%</strong></span>
                    <input type="range" min="0" max="100" value="${t.progresso}"
                           onchange="atualizarProgressoTarefa('${t.id}', this.value)"
                           class="w-full accent-status-em-andamento cursor-pointer" />
                </div>
                <button type="button" onclick="deletarTarefa('${t.id}')" class="p-1 rounded text-error hover:bg-error-container/20" title="Excluir Atividade">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
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
        if (currentObraId) {
            await carregarEtapasObra(currentObraId);
            if (typeof carregarDetalhesObra === 'function') carregarDetalhesObra();
        }
    } catch (err) {
        console.error('Erro ao atualizar progresso:', err);
    }
}

async function atualizarStatusEtapa(etapaId, novoStatus) {
    try {
        let prog = novoStatus === 'concluida' ? 100 : (novoStatus === 'pendente' ? 0 : 50);
        await dbService.updateEtapa(etapaId, { status: novoStatus, progresso: prog });
        if (currentObraId) {
            await carregarEtapasObra(currentObraId);
            if (typeof carregarDetalhesObra === 'function') carregarDetalhesObra();
        }
    } catch (err) {
        console.error('Erro ao atualizar status:', err);
    }
}

async function atualizarProgressoTarefa(tarefaId, novoProgresso) {
    try {
        const prog = Number(novoProgresso);
        let status = 'em_andamento';
        if (prog === 0) status = 'pendente';
        if (prog === 100) status = 'concluida';

        await dbService.updateTarefa(tarefaId, { progresso: prog, status });
        if (currentObraId) {
            await carregarEtapasObra(currentObraId);
            if (typeof carregarDetalhesObra === 'function') carregarDetalhesObra();
        }
    } catch (err) {
        console.error('Erro ao atualizar tarefa:', err);
    }
}

async function deletarTarefa(tarefaId) {
    if (!confirm('Deseja remover esta atividade?')) return;
    try {
        await dbService.deleteTarefa(tarefaId);
        if (currentObraId) {
            await carregarEtapasObra(currentObraId);
            if (typeof carregarDetalhesObra === 'function') carregarDetalhesObra();
        }
    } catch (err) {
        console.error(err);
    }
}

async function cadastrarNovaEtapa(e) {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    const obra_id = params.get('obra_id') || currentObraId;

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

        document.getElementById('form-nova-etapa')?.reset();
        const modal = document.getElementById('modal-nova-etapa');
        if (modal) modal.classList.add('hidden');

        if (typeof carregarDetalhesObra === 'function') carregarDetalhesObra();
        await carregarEtapasObra(obra_id);
    } catch (err) {
        console.error('Erro ao cadastrar etapa:', err);
    }
}

// Modal Cadastrar Tarefa
async function abrirModalNovaTarefa(etapaId) {
    let modal = document.getElementById('modal-nova-tarefa');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-nova-tarefa';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm hidden';
        modal.innerHTML = `
            <div class="bg-surface-card rounded-xl shadow-xl w-full max-w-lg p-space-lg mx-4 flex flex-col gap-space-md">
                <div class="flex items-center justify-between">
                    <h3 class="font-headline-sm text-headline-sm text-on-surface">Cadastrar Atividade / Tarefa</h3>
                    <button type="button" onclick="document.getElementById('modal-nova-tarefa').classList.add('hidden')" class="p-1 rounded-lg hover:bg-surface-subtle text-on-surface-variant">
                        <span class="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
                <form class="flex flex-col gap-space-md" onsubmit="salvarNovaTarefaSubmit(event)">
                    <input type="hidden" id="tarefa-etapa-id" />
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface">Nome da Atividade *</label>
                        <input type="text" id="nome-tarefa" required class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                    </div>
                    <div class="grid grid-cols-2 gap-space-sm">
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface">Responsável Técnico</label>
                            <select id="responsavel-tarefa" class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none">
                                <option value="">Carregando...</option>
                            </select>
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface">Status</label>
                            <select id="status-tarefa" class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none">
                                <option value="pendente">Pendente</option>
                                <option value="em_andamento">Em Andamento</option>
                                <option value="concluida">Concluída</option>
                                <option value="atrasada">Atrasada</option>
                                <option value="bloqueada">Bloqueada</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-space-sm">
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface">Previsão de Término</label>
                            <input type="date" id="data-fim-tarefa" class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface">Progresso (%)</label>
                            <input type="number" id="progresso-tarefa" min="0" max="100" value="0" class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                        </div>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface">Justificativa de Atraso / Obs</label>
                        <input type="text" id="justificativa-tarefa" placeholder="Ex: Chuva intensa no canteiro" class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                    </div>
                    <div class="flex items-center justify-end gap-space-sm pt-space-xs">
                        <button type="button" onclick="document.getElementById('modal-nova-tarefa').classList.add('hidden')" class="px-space-md py-2 rounded-lg bg-surface-subtle text-on-surface font-label-md text-label-md">Cancelar</button>
                        <button type="submit" class="px-space-md py-2 rounded-lg bg-status-em-andamento text-on-primary font-label-md text-label-md shadow-sm">Salvar Atividade</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }

    document.getElementById('tarefa-etapa-id').value = etapaId;
    const selectResp = document.getElementById('responsavel-tarefa');
    const profs = await dbService.getProfissionais();
    if (selectResp && profs) {
        selectResp.innerHTML = '<option value="">Sem responsável definido</option>' +
            profs.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
    }

    modal.classList.remove('hidden');
}

async function salvarNovaTarefaSubmit(e) {
    e.preventDefault();
    const etapa_id = document.getElementById('tarefa-etapa-id')?.value;
    const nome = document.getElementById('nome-tarefa')?.value.trim();
    const responsavel_id = document.getElementById('responsavel-tarefa')?.value || null;
    const status = document.getElementById('status-tarefa')?.value || 'pendente';
    const data_fim_prevista = document.getElementById('data-fim-tarefa')?.value || null;
    const progresso = document.getElementById('progresso-tarefa')?.value || 0;
    const justificativa_atraso = document.getElementById('justificativa-tarefa')?.value.trim();

    if (!etapa_id || !nome) return;

    try {
        await dbService.saveTarefa({
            etapa_id,
            obra_id: currentObraId,
            nome,
            responsavel_id,
            status,
            data_fim_prevista,
            progresso,
            justificativa_atraso
        });

        document.getElementById('modal-nova-tarefa')?.classList.add('hidden');
        if (currentObraId) {
            await carregarEtapasObra(currentObraId);
            if (typeof carregarDetalhesObra === 'function') carregarDetalhesObra();
        }
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar tarefa.');
    }
}

// ---- CC-07 — DIÁRIO DE OBRA E ANEXOS DE MÍDIA ----
async function carregarDiarioEAnexos(obraId) {
    const containerDiario = document.getElementById('lista-diario-obra');
    const containerDocs = document.getElementById('lista-documentos-obra');
    if (!containerDiario) return;

    try {
        const diários = await dbService.getDiarioByObra(obraId);
        const documentos = await dbService.getDocumentosByObra(obraId);

        if (!diários || diários.length === 0) {
            containerDiario.innerHTML = `<p class="font-body-md text-body-md text-on-surface-variant p-6 text-center bg-surface-card rounded-xl border border-border-subtle">Nenhum registro diário cadastrado até o momento.</p>`;
        } else {
            containerDiario.innerHTML = diários.map(d => `
                <div class="bg-surface-card p-space-md rounded-xl border border-border-subtle flex flex-col gap-space-xs shadow-sm">
                    <div class="flex items-center justify-between border-b border-border-subtle pb-space-xs">
                        <div class="flex items-center gap-space-sm">
                            <span class="material-symbols-outlined text-status-em-andamento text-[20px]">edit_calendar</span>
                            <span class="font-title-md text-title-md text-on-surface font-bold">${new Date(d.data).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <span class="px-2.5 py-1 rounded-full bg-surface-subtle font-caption text-caption text-on-surface font-semibold">Clima: ${d.clima || 'Ensolarado'}</span>
                    </div>
                    <p class="font-body-md text-body-md text-on-surface mt-1">${d.resumo_dia || d.observacoes_tecnicas || 'Sem anotações.'}</p>
                    <span class="font-caption text-caption text-on-surface-variant">Autor: ${d.usuarios ? d.usuarios.nome : 'Engenheiro de Canteiro'}</span>
                </div>
            `).join('');
        }

        if (containerDocs) {
            if (!documentos || documentos.length === 0) {
                containerDocs.innerHTML = `<p class="font-body-md text-body-md text-on-surface-variant p-6 text-center bg-surface-card rounded-xl border border-border-subtle">Nenhuma fotografia ou documento anexado.</p>`;
            } else {
                containerDocs.innerHTML = documentos.map(doc => `
                    <div class="bg-surface-card rounded-xl border border-border-subtle overflow-hidden flex flex-col shadow-sm group">
                        ${doc.tipo === 'imagem' ? `
                            <div class="h-36 w-full overflow-hidden bg-surface-subtle relative cursor-pointer" onclick="abrirLightboxVisualizador('${doc.url_arquivo}', '${doc.titulo}')">
                                <img src="${doc.url_arquivo}" alt="${doc.titulo}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                <div class="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-on-primary">
                                    <span class="material-symbols-outlined text-3xl">zoom_in</span>
                                </div>
                            </div>
                        ` : `
                            <div class="h-36 w-full bg-surface-subtle flex flex-col items-center justify-center text-primary p-4">
                                <span class="material-symbols-outlined text-4xl mb-1">description</span>
                                <span class="font-caption text-caption truncate max-w-full">${doc.titulo}</span>
                            </div>
                        `}
                        <div class="p-space-sm flex flex-col">
                            <span class="font-label-sm text-label-sm text-on-surface truncate font-semibold">${doc.titulo}</span>
                            <span class="font-caption text-caption text-on-surface-variant">${new Date(doc.criado_em).toLocaleDateString('pt-BR')}</span>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (err) {
        console.error(err);
    }
}

async function cadastrarNovoDiarioSubmit(e) {
    e.preventDefault();
    const data = document.getElementById('diario-data')?.value;
    const clima = document.getElementById('diario-clima')?.value;
    const resumo_dia = document.getElementById('diario-resumo')?.value.trim();

    if (!currentObraId) return;

    try {
        await dbService.saveDiarioEntry({
            obra_id: currentObraId,
            data,
            clima,
            resumo_dia
        });

        document.getElementById('form-novo-diario')?.reset();
        document.getElementById('modal-novo-diario')?.classList.add('hidden');
        await carregarDiarioEAnexos(currentObraId);
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar registro no Diário.');
    }
}

async function anexarFotoDocumentoSubmit(e) {
    e.preventDefault();
    const titulo = document.getElementById('anexo-titulo')?.value.trim();
    const tipo = document.getElementById('anexo-tipo')?.value || 'imagem';
    const url_arquivo = document.getElementById('anexo-url')?.value.trim();

    if (!currentObraId || !titulo || !url_arquivo) return;

    try {
        await dbService.saveDocumento({
            obra_id: currentObraId,
            titulo,
            tipo,
            url_arquivo
        });

        document.getElementById('form-novo-anexo')?.reset();
        document.getElementById('modal-novo-anexo')?.classList.add('hidden');
        await carregarDiarioEAnexos(currentObraId);
    } catch (err) {
        console.error(err);
        alert('Erro ao anexar arquivo.');
    }
}

// Lightbox Galeria Zoom
function abrirLightboxVisualizador(url, titulo) {
    let lightbox = document.getElementById('lightbox-galeria');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'lightbox-galeria';
        lightbox.className = 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary/90 backdrop-blur-md p-4 hidden';
        lightbox.innerHTML = `
            <button type="button" onclick="document.getElementById('lightbox-galeria').classList.add('hidden')" class="absolute top-4 right-4 text-on-primary hover:opacity-80 p-2">
                <span class="material-symbols-outlined text-3xl">close</span>
            </button>
            <img id="lightbox-img" class="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain mb-4" />
            <span id="lightbox-title" class="text-on-primary font-title-md text-title-md"></span>
        `;
        document.body.appendChild(lightbox);
    }
    document.getElementById('lightbox-img').src = url;
    document.getElementById('lightbox-title').textContent = titulo;
    lightbox.classList.remove('hidden');
}

// ---- CC-06 — EQUIPE TÉCNICA ENVOLVIDA ----
async function carregarEquipeObra(obraId) {
    const container = document.getElementById('lista-equipe-obra');
    if (!container) return;

    try {
        const equipe = await dbService.getObraProfissionais(obraId);

        if (!equipe || equipe.length === 0) {
            container.innerHTML = `<p class="font-body-md text-body-md text-on-surface-variant p-6 text-center bg-surface-card rounded-xl border border-border-subtle">Nenhum profissional ou fornecedor associado a esta obra ainda.</p>`;
            return;
        }

        container.innerHTML = equipe.map(item => {
            const prof = item.profissionais || { nome: 'Especialista', especialidade: 'Técnico' };
            return `
                <div class="bg-surface-card p-space-md rounded-xl border border-border-subtle flex items-center justify-between shadow-sm">
                    <div class="flex items-center gap-space-md">
                        <div class="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold">
                            ${prof.nome.charAt(0)}
                        </div>
                        <div class="flex flex-col">
                            <span class="font-title-md text-title-md text-on-surface font-bold">${prof.nome}</span>
                            <span class="font-caption text-caption text-status-em-andamento font-semibold">${item.funcao}</span>
                            <span class="font-caption text-caption text-on-surface-variant">${item.responsabilidade || prof.especialidade}</span>
                        </div>
                    </div>
                    <button type="button" onclick="removerProfissionalEquipe('${item.id}')" class="p-2 rounded-lg text-error hover:bg-error-container/20" title="Remover da Equipe">
                        <span class="material-symbols-outlined text-[18px]">person_remove</span>
                    </button>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
    }
}

async function abrirModalAssociarProfissional() {
    let modal = document.getElementById('modal-associar-prof');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-associar-prof';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm hidden';
        modal.innerHTML = `
            <div class="bg-surface-card rounded-xl shadow-xl w-full max-w-md p-space-lg mx-4 flex flex-col gap-space-md">
                <div class="flex items-center justify-between">
                    <h3 class="font-headline-sm text-headline-sm text-on-surface">Vincular Profissional à Obra</h3>
                    <button type="button" onclick="document.getElementById('modal-associar-prof').classList.add('hidden')" class="p-1 rounded-lg hover:bg-surface-subtle text-on-surface-variant">
                        <span class="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
                <form class="flex flex-col gap-space-md" onsubmit="associarProfissionalSubmit(event)">
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface">Selecione o Profissional / Fornecedor *</label>
                        <select id="select-prof-equipe" required class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none">
                            <option value="">Carregando...</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface">Função na Obra *</label>
                        <input type="text" id="funcao-prof-equipe" required placeholder="Ex: Engenheiro Calculista Responsável" class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface">Escopo de Atuação</label>
                        <input type="text" id="resp-prof-equipe" placeholder="Ex: Fiscalização de armação e lajes" class="h-10 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                    </div>
                    <div class="flex items-center justify-end gap-space-sm pt-space-xs">
                        <button type="button" onclick="document.getElementById('modal-associar-prof').classList.add('hidden')" class="px-space-md py-2 rounded-lg bg-surface-subtle text-on-surface font-label-md text-label-md">Cancelar</button>
                        <button type="submit" class="px-space-md py-2 rounded-lg bg-status-em-andamento text-on-primary font-label-md text-label-md shadow-sm">Confirmar Vínculo</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const select = document.getElementById('select-prof-equipe');
    const profs = await dbService.getProfissionais();
    if (select && profs) {
        select.innerHTML = '<option value="">Selecione...</option>' +
            profs.map(p => `<option value="${p.id}">${p.nome} — ${p.especialidade}</option>`).join('');
    }
    modal.classList.remove('hidden');
}

async function associarProfissionalSubmit(e) {
    e.preventDefault();
    const profissional_id = document.getElementById('select-prof-equipe')?.value;
    const funcao = document.getElementById('funcao-prof-equipe')?.value.trim();
    const responsabilidade = document.getElementById('resp-prof-equipe')?.value.trim();

    if (!currentObraId || !profissional_id || !funcao) return;

    try {
        await dbService.associarProfissionalObra({
            obra_id: currentObraId,
            profissional_id,
            funcao,
            responsabilidade
        });

        document.getElementById('modal-associar-prof')?.classList.add('hidden');
        await carregarEquipeObra(currentObraId);
    } catch (err) {
        console.error(err);
        alert('Erro ao vincular profissional.');
    }
}

async function removerProfissionalEquipe(id) {
    if (!confirm('Deseja desassociar este profissional da obra?')) return;
    try {
        await dbService.desassociarProfissionalObra(id);
        await carregarEquipeObra(currentObraId);
    } catch (err) {
        console.error(err);
    }
}

// ---- CC-08 — HISTÓRICO DE ALTERAÇÕES E AUDITORIA ----
async function carregarHistoricoObra(obraId) {
    const container = document.getElementById('lista-historico-obra');
    if (!container) return;

    try {
        const historico = await dbService.getHistoricoByObra(obraId);

        if (!historico || historico.length === 0) {
            container.innerHTML = `<p class="font-body-md text-body-md text-on-surface-variant p-6 text-center bg-surface-card rounded-xl border border-border-subtle">Nenhum evento registrado no histórico ainda.</p>`;
            return;
        }

        container.innerHTML = historico.map(h => `
            <div class="p-space-md bg-surface-card rounded-xl border border-border-subtle flex items-start gap-space-md shadow-sm">
                <div class="w-8 h-8 rounded-full bg-surface-subtle flex items-center justify-center shrink-0 text-primary mt-0.5">
                    <span class="material-symbols-outlined text-[18px]">history</span>
                </div>
                <div class="flex flex-col flex-1">
                    <p class="font-body-md text-body-md text-on-surface font-semibold">${h.descricao}</p>
                    <div class="flex items-center gap-space-md font-caption text-caption text-on-surface-variant mt-1">
                        <span>${new Date(h.criado_em).toLocaleString('pt-BR')}</span>
                        <span>Por: ${h.usuarios ? h.usuarios.nome : 'Sistema'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}
