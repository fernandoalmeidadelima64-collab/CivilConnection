/* ==========================================================================
   Civil Connection — Obras, detalhes e exclusão lógica
   ==========================================================================
   Todas as operações usam o Supabase configurado. A exclusão é lógica
   (deleted_at), preservando o histórico e os dados relacionados.
   ========================================================================== */

let obraIdParaExcluir = null;
let obraAtualDetalhes = null;
let obrasCarregadas = [];
let debounceTimerObra;

document.addEventListener('DOMContentLoaded', () => {
    const containerObras = document.getElementById('lista-obras');
    if (containerObras) {
        const buscaDaUrl = new URLSearchParams(window.location.search).get('busca');
        const campoBusca = document.getElementById('busca-obra');
        if (buscaDaUrl && campoBusca) {
            campoBusca.value = buscaDaUrl;
            document.getElementById('total-obras-count')?.setAttribute('data-cc-busca', buscaDaUrl);
        }
        carregarObras();
        setupFiltrosObras();
    }

    const formObra = document.getElementById('form-cadastro-obra');
    if (formObra) setupFormCadastroObra(formObra);

    const containerObraDetalhes = document.getElementById('detalhes-obra-container');
    if (containerObraDetalhes) carregarDetalhesObra();
});

function setupFiltrosObras() {
    const inputBusca = document.getElementById('busca-obra');
    const selectCidade = document.getElementById('filtro-cidade-obra');
    const selectStatus = document.getElementById('filtro-status-obra');

    const triggerBusca = () => {
        window.clearTimeout(debounceTimerObra);
        debounceTimerObra = window.setTimeout(carregarObras, 300);
    };

    if (inputBusca) inputBusca.addEventListener('input', triggerBusca);
    if (selectCidade) selectCidade.addEventListener('change', triggerBusca);
    if (selectStatus) selectStatus.addEventListener('change', triggerBusca);
}

function limparFiltrosObras() {
    const busca = document.getElementById('busca-obra');
    const cidade = document.getElementById('filtro-cidade-obra');
    const status = document.getElementById('filtro-status-obra');
    if (busca) busca.value = '';
    if (cidade) cidade.value = '';
    if (status) status.value = '';
    carregarObras();
}

function atualizarOpcoesCidadeObras(obras) {
    const select = document.getElementById('filtro-cidade-obra');
    if (!select) return;
    const atual = select.value;
    const cidades = Array.from(new Set((obras || []).map((obra) => String(obra.cidade || '').trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    select.replaceChildren();
    const vazio = document.createElement('option');
    vazio.value = '';
    vazio.textContent = 'Todas as cidades';
    select.appendChild(vazio);

    cidades.forEach((cidade) => {
        const opcao = document.createElement('option');
        opcao.value = cidade;
        opcao.textContent = cidade;
        select.appendChild(opcao);
    });

    if (cidades.includes(atual)) select.value = atual;
}

async function carregarObras() {
    const container = document.getElementById('lista-obras');
    const totalCountEl = document.getElementById('total-obras-count');
    if (!container) return;

    const busca = (document.getElementById('busca-obra')?.value || '').trim();
    const cidade = document.getElementById('filtro-cidade-obra')?.value || '';
    const status = document.getElementById('filtro-status-obra')?.value || '';

    container.setAttribute('aria-busy', 'true');
    container.innerHTML = `<div class="col-span-full">${window.ccUI.estadoCarregando('Carregando canteiros de obras do Supabase...')}</div>`;
    if (totalCountEl) totalCountEl.textContent = 'Carregando...';

    try {
        const obras = await window.dbService.getObras({ busca, cidade, status, includeDeleted: false });
        obrasCarregadas = obras || [];

        if (totalCountEl) {
            totalCountEl.textContent = window.ccUI.pluralizar(obrasCarregadas.length, 'obra', 'obras');
        }

        if (!busca && !cidade && !status) atualizarOpcoesCidadeObras(obrasCarregadas);

        if (!obrasCarregadas.length) {
            const temFiltro = !!(busca || cidade || status);
            container.innerHTML = `<div class="col-span-full">${window.ccUI.estadoVazio({
                icone: 'apartment',
                titulo: temFiltro ? 'Nenhuma obra encontrada com esses filtros' : 'Nenhuma obra cadastrada',
                mensagem: temFiltro
                    ? 'Ajuste a busca, a cidade ou o status para encontrar o canteiro desejado.'
                    : 'Cadastre a primeira obra para começar a acompanhar etapas, equipe e diário de canteiro.',
                acoes: temFiltro
                    ? [{ rotulo: 'Limpar filtros', onclick: 'limparFiltrosObras()', classe: 'cc-btn cc-btn--secundario' }]
                    : [{ rotulo: 'Cadastrar obra', onclick: "window.location.href='cadastro-obra.html'", classe: 'cc-btn cc-btn--primario' }]
            })}</div>`;
            return;
        }

        container.innerHTML = obrasCarregadas.map(renderCardObra).join('');
    } catch (erro) {
        console.error('Erro ao carregar obras:', erro);
        if (totalCountEl) totalCountEl.textContent = 'Indisponível';
        container.innerHTML = `<div class="col-span-full">${window.ccUI.estadoErro({
            titulo: 'Não foi possível carregar as obras',
            mensagem: window.ccUI.mensagemErroDados(erro),
            acoes: [{ rotulo: 'Tentar novamente', onclick: 'carregarObras()', classe: 'cc-btn cc-btn--secundario' }]
        })}</div>`;
    } finally {
        container.setAttribute('aria-busy', 'false');
    }
}

function renderCardObra(obra) {
    const statusConfig = {
        planejamento: { label: 'Planejamento', classe: 'bg-surface-subtle text-status-planejamento', icon: 'pending_actions' },
        em_andamento: { label: 'Em andamento', classe: 'bg-secondary-fixed text-status-em-andamento', icon: 'engineering' },
        pausada: { label: 'Pausada', classe: 'bg-yellow-100 text-status-pausada', icon: 'pause_circle' },
        concluida: { label: 'Concluída', classe: 'bg-green-100 text-status-concluida', icon: 'task_alt' }
    };
    const st = statusConfig[obra.status] || statusConfig.planejamento;
    const progresso = Math.min(100, Math.max(0, Number(obra.progresso) || 0));
    const placeholder = '../assets/images/placeholder-obra.svg';
    const foto = typeof window.getObraImagemUrl === 'function'
        ? window.getObraImagemUrl(obra.foto_capa_url, '')
        : '';
    const nome = window.ccUI.escapeHtml(obra.nome);
    const cidade = window.ccUI.escapeHtml(obra.cidade || 'Cidade não informada');
    const descricao = window.ccUI.escapeHtml(obra.descricao || 'Canteiro de obras cadastrado com acompanhamento técnico de progresso.');

    const criador = window.ccUI.escapeHtml(obra.criador && obra.criador.nome ? obra.criador.nome : 'Não informado');

    return `
        <article class="bg-surface-card rounded-xl shadow-sm border border-border-subtle hover:shadow-md transition-all flex flex-col justify-between overflow-hidden" data-cc-obra-id="${window.ccUI.escapeHtml(obra.id)}">
            <div class="relative h-40 w-full bg-surface-subtle overflow-hidden cc-card-obra__midia">
                ${foto
                    ? `<img src="${window.ccUI.escapeHtml(foto)}" alt="Imagem de capa da obra ${nome}" loading="lazy"
                             onerror="this.onerror=null; this.src='${placeholder}';"
                             class="w-full h-full object-cover bg-surface-subtle" />`
                    : `<img src="${placeholder}" alt="Obra sem foto de capa cadastrada" loading="lazy"
                             class="w-full h-full object-cover" />`}
                <div class="absolute top-3 right-3">
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-caption text-caption font-semibold shadow-sm ${st.classe}">
                        <span class="material-symbols-outlined text-[14px]" aria-hidden="true">${st.icon}</span>
                        ${st.label}
                    </span>
                </div>
            </div>

            <div class="p-space-lg flex flex-col gap-space-sm flex-1 justify-between cc-card-obra__conteudo">
                <div class="flex flex-col gap-space-xs min-w-0">
                    <span class="inline-flex items-center gap-1 font-caption text-caption text-on-surface-variant uppercase tracking-wider">
                        <span class="material-symbols-outlined text-[14px]" aria-hidden="true">place</span>
                        ${cidade}
                    </span>
                    <h3 class="font-title-md text-title-md text-on-surface font-bold tracking-tight cc-quebra">${nome}</h3>
                    <p class="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 my-1 cc-quebra">${descricao}</p>
                    <p class="font-caption text-caption text-on-surface-variant cc-quebra">Cadastrado por: ${criador}</p>
                </div>

                <div class="flex flex-col gap-1 pt-space-xs">
                    <div class="flex items-center justify-between font-label-sm text-label-sm">
                        <span class="text-on-surface-variant">Progresso geral</span>
                        <span class="font-bold text-on-surface">${progresso}%</span>
                    </div>
                    <div class="w-full h-2.5 rounded-full bg-surface-subtle overflow-hidden" role="progressbar"
                         aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progresso}" aria-label="Progresso geral da obra ${nome}">
                        <div class="h-full bg-status-em-andamento transition-all duration-500" style="width: ${progresso}%"></div>
                    </div>
                </div>

                <div class="mt-space-sm pt-space-xs border-t border-border-subtle flex items-center justify-end gap-space-xs cc-card-obra__acoes">
                    <button type="button" onclick="solicitarExclusaoObra('${window.ccUI.escapeHtml(obra.id)}')"
                            class="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-error hover:bg-error-container/20 transition-colors shrink-0"
                            title="Excluir obra" aria-label="Excluir obra ${nome}">
                        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
                    </button>

                    <a href="obra-detalhes.html?obra_id=${encodeURIComponent(obra.id)}"
                       class="inline-flex flex-1 sm:flex-none items-center justify-center gap-space-xs min-h-11 py-2 px-space-md rounded-lg bg-surface-subtle hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors">
                        <span>Gerenciar detalhes</span>
                        <span class="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
                    </a>
                </div>
            </div>
        </article>
    `;
}

function estadoDetalhesObra(mensagem, tipo, acoes) {
    if (tipo === 'erro') {
        return window.ccUI.estadoErro({ mensagem, acoes });
    }
    return window.ccUI.estadoVazio({
        icone: 'apartment',
        titulo: 'Obra não encontrada',
        mensagem,
        acoes: acoes || [{ rotulo: 'Voltar para Obras', onclick: "window.location.href='obras.html'", classe: 'cc-btn cc-btn--primario' }]
    });
}

async function carregarDetalhesObra() {
    const parametros = new URLSearchParams(window.location.search);
    const obraId = parametros.get('obra_id');
    const container = document.getElementById('detalhes-obra-container');
    if (!container) return;
    if (!obraId) {
        container.innerHTML = estadoDetalhesObra('Selecione uma obra na listagem para visualizar os detalhes.');
        return;
    }

    container.setAttribute('aria-busy', 'true');
    container.innerHTML = window.ccUI.estadoCarregando('Carregando detalhes do canteiro...');

    try {
        const obra = await window.dbService.getObraById(obraId);
        if (!obra) {
            container.innerHTML = estadoDetalhesObra('A construção solicitada não existe ou foi removida do sistema.');
            return;
        }

        obraAtualDetalhes = obra;
        const progresso = Math.min(100, Math.max(0, Number(obra.progresso) || 0));
        const statusConfig = {
            planejamento: { label: 'Planejamento', classe: 'bg-surface-subtle text-status-planejamento', icon: 'pending_actions' },
            em_andamento: { label: 'Em andamento', classe: 'bg-secondary-fixed text-status-em-andamento', icon: 'engineering' },
            pausada: { label: 'Pausada', classe: 'bg-yellow-100 text-status-pausada', icon: 'pause_circle' },
            concluida: { label: 'Concluída', classe: 'bg-green-100 text-status-concluida', icon: 'task_alt' }
        };
        const st = statusConfig[obra.status] || statusConfig.planejamento;
        const placeholder = '../assets/images/placeholder-obra.svg';
        const foto = typeof window.getObraImagemUrl === 'function'
            ? window.getObraImagemUrl(obra.foto_capa_url, '')
            : '';
        const nome = window.ccUI.escapeHtml(obra.nome);
        const cidade = window.ccUI.escapeHtml(obra.cidade || 'Cidade não informada');
        const cliente = window.ccUI.escapeHtml(obra.cliente && obra.cliente.nome ? obra.cliente.nome : 'Cliente cadastrado');
        const criador = window.ccUI.escapeHtml(obra.criador && obra.criador.nome ? obra.criador.nome : 'Não informado');
        const responsavel = window.ccUI.escapeHtml(obra.profissionais && obra.profissionais.nome ? obra.profissionais.nome : 'Não atribuído');
        const inicio = obra.data_inicio ? window.ccUI.formatarData(obra.data_inicio) : 'Não informada';
        const previsao = obra.data_previsao_fim ? window.ccUI.formatarData(obra.data_previsao_fim) : 'A definir';
        const descricao = window.ccUI.escapeHtml(obra.descricao || 'Sem descrição cadastrada para este empreendimento.');

        container.innerHTML = `
            <article class="bg-surface-card rounded-xl shadow-sm border border-border-subtle overflow-hidden flex flex-col gap-space-lg mb-space-lg">
                <div class="relative h-56 w-full bg-surface-subtle overflow-hidden cc-detalhe-hero">
                    ${foto
                        ? `<img src="${window.ccUI.escapeHtml(foto)}" alt="Imagem de capa da obra ${nome}" loading="lazy"
                                 onerror="this.onerror=null; this.src='${placeholder}';"
                                 class="w-full h-full object-cover bg-surface-subtle" />`
                        : '<div class="w-full h-full bg-gradient-to-br from-primary via-primary-container to-primary-fixed-dim flex items-center justify-center"><span class="material-symbols-outlined text-on-primary text-[72px] opacity-30" aria-hidden="true">apartment</span></div>'}
                    <div class="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/35 to-transparent flex items-end p-space-xl cc-detalhe-hero__conteudo">
                        <div class="flex flex-col sm:flex-row sm:items-end justify-between w-full gap-space-md text-on-primary">
                            <div class="flex flex-col min-w-0">
                                <span class="inline-flex items-center gap-1 font-caption text-caption text-inverse-on-surface uppercase tracking-wider">
                                    <span class="material-symbols-outlined text-[16px]" aria-hidden="true">place</span>
                                    ${cidade}
                                </span>
                                <h1 class="font-headline-lg text-headline-lg font-bold cc-quebra">${nome}</h1>
                            </div>
                            <span class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-label-md text-label-md font-semibold self-start ${st.classe}">
                                <span class="material-symbols-outlined text-[16px]" aria-hidden="true">${st.icon}</span>
                                ${st.label}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="p-space-xl flex flex-col gap-space-lg cc-detalhe-conteudo">
                    <dl class="grid grid-cols-2 md:grid-cols-4 gap-space-md bg-surface-subtle/80 p-space-md rounded-xl border border-border-subtle cc-detalhe-meta">
                        <div class="flex flex-col min-w-0">
                            <dt class="font-caption text-caption text-on-surface-variant uppercase font-semibold">Cliente / Empreendedor</dt>
                            <dd class="font-title-md text-title-md text-on-surface font-bold mt-0.5 cc-quebra">${cliente}</dd>
                        </div>
                        <div class="flex flex-col min-w-0">
                            <dt class="font-caption text-caption text-on-surface-variant uppercase font-semibold">Cadastrado por</dt>
                            <dd class="font-title-md text-title-md text-on-surface font-bold mt-0.5 cc-quebra">${criador}</dd>
                        </div>
                        <div class="flex flex-col min-w-0">
                            <dt class="font-caption text-caption text-on-surface-variant uppercase font-semibold">Responsável técnico</dt>
                            <dd class="font-title-md text-title-md text-on-surface font-bold mt-0.5 cc-quebra">${responsavel}</dd>
                        </div>
                        <div class="flex flex-col min-w-0">
                            <dt class="font-caption text-caption text-on-surface-variant uppercase font-semibold">Data de início</dt>
                            <dd class="font-title-md text-title-md text-on-surface font-bold mt-0.5">${window.ccUI.escapeHtml(inicio)}</dd>
                        </div>
                        <div class="flex flex-col min-w-0">
                            <dt class="font-caption text-caption text-on-surface-variant uppercase font-semibold">Previsão de conclusão</dt>
                            <dd class="font-title-md text-title-md text-on-surface font-bold mt-0.5">${window.ccUI.escapeHtml(previsao)}</dd>
                        </div>
                    </dl>

                    <p class="font-body-md text-body-md text-on-surface-variant cc-quebra">${descricao}</p>

                    <div class="flex flex-col gap-1.5">
                        <div class="flex items-center justify-between font-label-md text-label-md">
                            <span class="text-on-surface-variant font-semibold">Progresso físico geral da obra</span>
                            <span class="font-bold text-status-em-andamento font-display text-headline-sm">${progresso}%</span>
                        </div>
                        <div class="w-full h-3 rounded-full bg-surface-subtle overflow-hidden" role="progressbar"
                             aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progresso}" aria-label="Progresso físico geral da obra">
                            <div class="h-full bg-status-em-andamento transition-all duration-500" style="width: ${progresso}%"></div>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center justify-between gap-space-md pt-space-xs border-t border-border-subtle cc-detalhe-acoes">
                        <div class="flex flex-wrap items-center gap-space-sm">
                            <button type="button" onclick="abrirModalEditarObra()"
                                    class="inline-flex items-center justify-center gap-1.5 px-space-md py-2 rounded-lg bg-surface-subtle hover:bg-surface-container font-label-md text-label-md text-on-surface transition-colors">
                                <span class="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span>
                                <span>Editar obra</span>
                            </button>
                            <button type="button" onclick="solicitarExclusaoObra('${window.ccUI.escapeHtml(obra.id)}')"
                                    class="inline-flex items-center justify-center gap-1.5 px-space-md py-2 rounded-lg text-error hover:bg-error-container/20 font-label-md text-label-md transition-colors">
                                <span class="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
                                <span>Excluir obra</span>
                            </button>
                        </div>

                        <a href="agenda.html?obra_id=${encodeURIComponent(obra.id)}"
                           class="inline-flex items-center justify-center gap-1.5 px-space-lg py-2.5 rounded-lg bg-status-em-andamento text-on-primary font-label-md text-label-md shadow-sm hover:bg-secondary transition-colors">
                            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">calendar_month</span>
                            <span>Agendar visita / inspeção</span>
                        </a>
                    </div>
                </div>
            </article>
        `;

        if (typeof window.inicializarDetalhesObra === 'function') {
            window.inicializarDetalhesObra(obraId);
        }
    } catch (erro) {
        console.error('Erro ao carregar detalhes da obra:', erro);
        container.innerHTML = estadoDetalhesObra(window.ccUI.mensagemErroDados(erro), 'erro', [
            { rotulo: 'Tentar novamente', onclick: 'carregarDetalhesObra()', classe: 'cc-btn cc-btn--secundario' },
            { rotulo: 'Voltar para Obras', onclick: "window.location.href='obras.html'", classe: 'cc-btn cc-btn--secundario' }
        ]);
    } finally {
        container.setAttribute('aria-busy', 'false');
    }
}

async function abrirModalEditarObra() {
    if (!obraAtualDetalhes) return;

    let modal = document.getElementById('modal-editar-obra');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-editar-obra';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm hidden';
        modal.innerHTML = `
            <div class="bg-surface-card rounded-xl shadow-xl w-full max-w-lg p-space-lg mx-4 flex flex-col gap-space-md">
                <div class="flex items-center justify-between gap-2">
                    <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold">Editar informações da obra</h3>
                    <button type="button" data-cc-fechar-edicao class="p-2 rounded-lg hover:bg-surface-subtle text-on-surface-variant" aria-label="Fechar">
                        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
                    </button>
                </div>
                <div id="edicao-obra-feedback" class="hidden p-3 rounded-lg text-body-sm font-label-sm text-center" role="alert" aria-live="polite"></div>
                <form class="flex flex-col gap-space-md" id="form-editar-obra" novalidate>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface" for="edit-nome-obra">Nome da obra *</label>
                        <input type="text" id="edit-nome-obra" required class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                    </div>
                    <div class="grid grid-cols-2 gap-space-sm">
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface" for="edit-cidade-obra">Cidade *</label>
                            <input type="text" id="edit-cidade-obra" required class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface" for="edit-status-obra">Status</label>
                            <select id="edit-status-obra" class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none">
                                <option value="planejamento">Planejamento</option>
                                <option value="em_andamento">Em andamento</option>
                                <option value="pausada">Pausada</option>
                                <option value="concluida">Concluída</option>
                            </select>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-space-sm">
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface" for="edit-data-inicio">Data de início</label>
                            <input type="date" id="edit-data-inicio" class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface" for="edit-data-fim">Previsão de término</label>
                            <input type="date" id="edit-data-fim" class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                        </div>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface" for="edit-responsavel-obra">Responsável técnico</label>
                        <select id="edit-responsavel-obra" class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none">
                            <option value="">Sem responsável definido</option>
                        </select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface" for="edit-foto-capa">URL da foto de capa</label>
                        <input type="url" id="edit-foto-capa" placeholder="https://..." class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface" for="edit-descricao-obra">Descrição</label>
                        <textarea id="edit-descricao-obra" rows="3" class="p-3 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none"></textarea>
                    </div>
                    <div class="flex items-center justify-end gap-space-sm pt-space-xs">
                        <button type="button" data-cc-fechar-edicao class="px-space-md py-2 rounded-lg bg-surface-subtle text-on-surface font-label-md text-label-md">Cancelar</button>
                        <button type="submit" class="px-space-md py-2 rounded-lg bg-status-em-andamento text-on-primary font-label-md text-label-md shadow-sm">Salvar alterações</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelectorAll('[data-cc-fechar-edicao]').forEach((botao) => {
            botao.addEventListener('click', () => modal.classList.add('hidden'));
        });
        const form = modal.querySelector('#form-editar-obra');
        if (form) form.addEventListener('submit', salvarEdicaoObraSubmit);
    }

    document.getElementById('edit-nome-obra').value = obraAtualDetalhes.nome || '';
    document.getElementById('edit-cidade-obra').value = obraAtualDetalhes.cidade || '';
    document.getElementById('edit-status-obra').value = obraAtualDetalhes.status || 'planejamento';
    document.getElementById('edit-data-inicio').value = obraAtualDetalhes.data_inicio || '';
    document.getElementById('edit-data-fim').value = obraAtualDetalhes.data_previsao_fim || '';
    document.getElementById('edit-foto-capa').value = obraAtualDetalhes.foto_capa_url || '';
    document.getElementById('edit-descricao-obra').value = obraAtualDetalhes.descricao || '';

    const feedback = document.getElementById('edicao-obra-feedback');
    if (feedback) {
        feedback.classList.add('hidden');
        feedback.textContent = '';
    }

    const selectResp = document.getElementById('edit-responsavel-obra');
    if (selectResp) {
        selectResp.innerHTML = '<option value="">Sem responsável definido</option>';
        try {
            const profs = await window.dbService.getProfissionais();
            profs.forEach((profissional) => {
                const opcao = document.createElement('option');
                opcao.value = profissional.id;
                opcao.textContent = `${profissional.nome} (${profissional.especialidade})`;
                if (profissional.id === obraAtualDetalhes.responsavel_id) opcao.selected = true;
                selectResp.appendChild(opcao);
            });
        } catch (erro) {
            console.error('Erro ao carregar responsáveis:', erro);
            const opcao = document.createElement('option');
            opcao.value = '';
            opcao.textContent = 'Não foi possível carregar os profissionais';
            selectResp.appendChild(opcao);
            window.ccUI.mostrarAviso('Não foi possível carregar a lista de responsáveis técnicos.', 'aviso');
        }
    }

    modal.classList.remove('hidden');
    const primeiroCampo = document.getElementById('edit-nome-obra');
    if (primeiroCampo) window.setTimeout(() => primeiroCampo.focus({ preventScroll: true }), 40);
}

function mostrarFeedbackEdicao(mensagem, tipo) {
    const feedback = document.getElementById('edicao-obra-feedback');
    if (!feedback) {
        window.ccUI.mostrarAviso(mensagem, tipo === 'sucesso' ? 'sucesso' : 'erro');
        return;
    }
    feedback.textContent = mensagem;
    feedback.className = `p-3 rounded-lg text-body-sm font-label-sm text-center ${tipo === 'sucesso' ? 'bg-status-concluida/10 text-status-concluida' : 'bg-error-container text-on-error-container'}`;
    feedback.setAttribute('role', tipo === 'sucesso' ? 'status' : 'alert');
    feedback.classList.remove('hidden');
}

async function salvarEdicaoObraSubmit(evento) {
    evento.preventDefault();
    if (!obraAtualDetalhes) return;

    const nome = (document.getElementById('edit-nome-obra')?.value || '').trim();
    const cidade = (document.getElementById('edit-cidade-obra')?.value || '').trim();
    const status = document.getElementById('edit-status-obra')?.value || 'planejamento';
    const dataInicio = document.getElementById('edit-data-inicio')?.value || null;
    const dataFim = document.getElementById('edit-data-fim')?.value || null;
    const responsavelId = document.getElementById('edit-responsavel-obra')?.value || null;
    const foto = (document.getElementById('edit-foto-capa')?.value || '').trim();
    const descricao = (document.getElementById('edit-descricao-obra')?.value || '').trim();

    if (!nome) return mostrarFeedbackEdicao('O nome da obra é obrigatório.', 'erro');
    if (!cidade) return mostrarFeedbackEdicao('A cidade da obra é obrigatória.', 'erro');
    if (dataInicio && dataFim && dataFim < dataInicio) {
        return mostrarFeedbackEdicao('A previsão de término deve ser posterior à data de início.', 'erro');
    }

    const botao = document.querySelector('#form-editar-obra button[type="submit"]');
    try {
        if (botao) botao.disabled = true;
        await window.dbService.updateObra(obraAtualDetalhes.id, {
            nome,
            cidade,
            status,
            data_inicio: dataInicio,
            data_previsao_fim: dataFim,
            responsavel_id: responsavelId,
            foto_capa_url: foto,
            descricao
        });
        window.ccUI.mostrarAviso('Obra atualizada com sucesso.', 'sucesso');
        document.getElementById('modal-editar-obra')?.classList.add('hidden');
        carregarDetalhesObra();
    } catch (erro) {
        console.error('Erro ao atualizar obra:', erro);
        mostrarFeedbackEdicao(window.ccUI.mensagemErroDados(erro), 'erro');
    } finally {
        if (botao) botao.disabled = false;
    }
}

async function solicitarExclusaoObra(id) {
    obraIdParaExcluir = id;
    const obra = (obraAtualDetalhes && obraAtualDetalhes.id === id)
        ? obraAtualDetalhes
        : obrasCarregadas.find((item) => item.id === id);
    const nome = obra ? obra.nome : 'esta obra';

    const confirmado = await window.ccUI.confirmarAcao({
        titulo: 'Excluir obra',
        mensagem: `Tem certeza que deseja excluir a obra "${nome}"? A remoção é lógica: os dados ficam preservados no banco, mas a obra deixa de aparecer nos indicadores e relatórios ativos.`,
        textoConfirmar: 'Excluir obra',
        textoCancelar: 'Cancelar'
    });

    if (!confirmado) {
        obraIdParaExcluir = null;
        return;
    }
    await executarExclusaoObra();
}

function fecharModalExclusaoObra() {
    obraIdParaExcluir = null;
}

async function executarExclusaoObra() {
    if (!obraIdParaExcluir) return;
    try {
        await window.dbService.deleteObra(obraIdParaExcluir);
        window.ccUI.mostrarAviso('Obra excluída com sucesso.', 'sucesso');
        obraIdParaExcluir = null;

        if (window.location.pathname.includes('obra-detalhes.html')) {
            window.location.href = 'obras.html';
        } else {
            carregarObras();
        }
    } catch (erro) {
        console.error('Erro ao excluir obra:', erro);
        window.ccUI.mostrarAviso(window.ccUI.mensagemErroDados(erro), 'erro');
    }
}

function showObraError(mensagem) {
    let el = document.getElementById('obra-feedback-msg');
    if (!el) {
        el = document.createElement('div');
        el.id = 'obra-feedback-msg';
        el.setAttribute('role', 'alert');
        el.setAttribute('aria-live', 'polite');
        const form = document.getElementById('form-cadastro-obra');
        if (form) form.prepend(el);
    }
    el.className = 'p-3 rounded-lg bg-error-container text-on-error-container font-label-sm text-label-sm text-center mb-4';
    el.textContent = mensagem;
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function showObraSuccess(mensagem) {
    let el = document.getElementById('obra-feedback-msg');
    if (!el) {
        el = document.createElement('div');
        el.id = 'obra-feedback-msg';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        const form = document.getElementById('form-cadastro-obra');
        if (form) form.prepend(el);
    }
    el.className = 'p-3 rounded-lg bg-status-concluida/10 text-status-concluida font-label-sm text-label-sm text-center mb-4';
    el.textContent = mensagem;
}

function setupFormCadastroObra(form) {
    const selectResp = document.getElementById('responsavel-obra');
    if (selectResp) {
        window.dbService.getProfissionais()
            .then((profs) => {
                selectResp.innerHTML = '<option value="">Sem responsável definido</option>';
                profs.forEach((profissional) => {
                    const opcao = document.createElement('option');
                    opcao.value = profissional.id;
                    opcao.textContent = `${profissional.nome} (${profissional.especialidade})`;
                    selectResp.appendChild(opcao);
                });
            })
            .catch((erro) => {
                console.error('Erro ao carregar responsáveis:', erro);
                selectResp.innerHTML = '<option value="">Não foi possível carregar os profissionais</option>';
                window.ccUI.mostrarAviso('Não foi possível carregar a lista de responsáveis técnicos. Você pode cadastrar a obra sem responsável.', 'aviso');
            });
    }

    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();

        const nome = (document.getElementById('nome-obra')?.value || '').trim();
        const cidade = (document.getElementById('cidade-obra')?.value || '').trim();
        const status = document.getElementById('status-obra')?.value || 'planejamento';
        const progresso = document.getElementById('progresso-obra')?.value || 0;
        const descricao = (document.getElementById('descricao-obra')?.value || '').trim();
        const dataInicio = document.getElementById('data-inicio-obra')?.value || null;
        const dataFim = document.getElementById('data-fim-obra')?.value || null;
        const responsavelId = document.getElementById('responsavel-obra')?.value || null;
        const foto = (document.getElementById('foto-capa-obra')?.value || '').trim();

        if (!nome) return showObraError('O nome da obra é obrigatório.');
        if (!cidade) return showObraError('A cidade do empreendimento é obrigatória.');
        if (Number(progresso) < 0 || Number(progresso) > 100) {
            return showObraError('O progresso deve estar entre 0% e 100%.');
        }
        if (dataInicio && dataFim && dataFim < dataInicio) {
            return showObraError('A previsão de conclusão deve ser posterior à data de início.');
        }

        const botao = form.querySelector('button[type="submit"]');
        try {
            if (botao) {
                botao.disabled = true;
                botao.setAttribute('aria-busy', 'true');
            }
            await window.dbService.saveObra({
                nome,
                cidade,
                status,
                progresso,
                descricao,
                data_inicio: dataInicio,
                data_previsao_fim: dataFim,
                responsavel_id: responsavelId,
                foto_capa_url: foto
            });

            showObraSuccess('Obra cadastrada com sucesso! Redirecionando...');
            window.setTimeout(() => {
                window.location.href = 'obras.html';
            }, 900);
        } catch (erro) {
            console.error('Erro ao cadastrar obra:', erro);
            showObraError(window.ccUI.mensagemErroDados(erro));
        } finally {
            if (botao) {
                botao.disabled = false;
                botao.removeAttribute('aria-busy');
            }
        }
    });
}
