/* ==========================================================================
   Civil Connection — Profissionais e fornecedores
   ==========================================================================
   Cadastro e edição de profissionais/fornecedores com dados reais do
   Supabase. Não há avaliações, descrições ou contatos fictícios.
   ========================================================================== */

let debounceTimerProfissionais;
let profissionaisCarregados = [];
let profissionalEmEdicao = null;

document.addEventListener('DOMContentLoaded', () => {
    const containerProfissionais = document.getElementById('lista-profissionais');
    if (containerProfissionais) {
        carregarProfissionais();
        setupFiltrosProfissionais();
    }

    const formCadastro = document.getElementById('form-cadastro-profissional');
    if (formCadastro) setupFormCadastroProfissional(formCadastro);

    const containerDetalhes = document.getElementById('detalhes-profissional-container');
    if (containerDetalhes) carregarDetalhesProfissional();
});

function setupFiltrosProfissionais() {
    const campos = [
        document.getElementById('busca-profissional'),
        document.getElementById('filtro-especialidade'),
        document.getElementById('filtro-cidade'),
        document.getElementById('filtro-tipo-registro')
    ].filter(Boolean);

    const disparar = () => {
        window.clearTimeout(debounceTimerProfissionais);
        debounceTimerProfissionais = window.setTimeout(carregarProfissionais, 300);
    };

    campos.forEach((campo) => {
        campo.addEventListener(campo.tagName === 'INPUT' ? 'input' : 'change', disparar);
    });
}

/**
 * Reconstroi as opções de um filtro a partir dos registros retornados pelo
 * Supabase. Assim o filtro nunca oferece cidades ou especialidades que não
 * existem no banco.
 */
function atualizarOpcoesFiltro(id, valores, rotuloVazio) {
    const select = document.getElementById(id);
    if (!select) return;
    const atual = select.value;
    const unicos = Array.from(new Set(valores.map((valor) => String(valor || '').trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    select.replaceChildren();

    const vazio = document.createElement('option');
    vazio.value = '';
    vazio.textContent = rotuloVazio;
    select.appendChild(vazio);

    unicos.forEach((valor) => {
        const opcao = document.createElement('option');
        opcao.value = valor;
        opcao.textContent = valor;
        select.appendChild(opcao);
    });

    if (unicos.includes(atual)) select.value = atual;
}

async function carregarProfissionais() {
    const container = document.getElementById('lista-profissionais');
    const total = document.getElementById('total-profissionais-count');
    if (!container) return;

    const busca = (document.getElementById('busca-profissional')?.value || '').trim();
    const especialidade = document.getElementById('filtro-especialidade')?.value || '';
    const cidade = document.getElementById('filtro-cidade')?.value || '';
    const tipoRegistro = document.getElementById('filtro-tipo-registro')?.value || '';

    container.setAttribute('aria-busy', 'true');
    container.innerHTML = `<div class="col-span-full">${window.ccUI.estadoCarregando('Carregando profissionais e fornecedores do Supabase...')}</div>`;
    if (total) total.textContent = 'Carregando...';

    try {
        profissionaisCarregados = await window.dbService.getProfissionais({
            busca,
            especialidade,
            cidade,
            tipo_registro: tipoRegistro
        });

        if (total) total.textContent = window.ccUI.pluralizar(profissionaisCarregados.length, 'parceiro', 'parceiros');

        if (!busca && !especialidade && !cidade && !tipoRegistro) {
            atualizarOpcoesFiltro('filtro-especialidade', profissionaisCarregados.map((item) => item.especialidade), 'Todas as especialidades');
            atualizarOpcoesFiltro('filtro-cidade', profissionaisCarregados.map((item) => item.cidade), 'Todas as cidades');
        }

        if (!profissionaisCarregados.length) {
            const temFiltro = !!(busca || especialidade || cidade || tipoRegistro);
            container.innerHTML = `<div class="col-span-full">${window.ccUI.estadoVazio({
                icone: 'badge',
                titulo: temFiltro ? 'Nenhum parceiro com esses filtros' : 'Nenhum profissional cadastrado',
                mensagem: temFiltro
                    ? 'Ajuste a busca, a especialidade, a cidade ou o tipo de registro.'
                    : 'Cadastre engenheiros, arquitetos, mestres de obra e fornecedores para vinculá-los às obras.',
                acoes: temFiltro
                    ? [{ rotulo: 'Limpar filtros', onclick: 'limparFiltrosProfissionais()', classe: 'cc-btn cc-btn--secundario' }]
                    : [{ rotulo: 'Cadastrar profissional', onclick: "window.location.href='cadastro-profissional.html'", classe: 'cc-btn cc-btn--primario' }]
            })}</div>`;
            return;
        }

        container.innerHTML = profissionaisCarregados.map(renderCardProfissional).join('');
    } catch (erro) {
        console.error('Erro ao carregar profissionais:', erro);
        if (total) total.textContent = 'Indisponível';
        container.innerHTML = `<div class="col-span-full">${window.ccUI.estadoErro({
            titulo: 'Não foi possível carregar os profissionais',
            mensagem: window.ccUI.mensagemErroDados(erro),
            acoes: [{ rotulo: 'Tentar novamente', onclick: 'carregarProfissionais()', classe: 'cc-btn cc-btn--secundario' }]
        })}</div>`;
    } finally {
        container.setAttribute('aria-busy', 'false');
    }
}

function limparFiltrosProfissionais() {
    ['busca-profissional', 'filtro-especialidade', 'filtro-cidade', 'filtro-tipo-registro'].forEach((id) => {
        const campo = document.getElementById(id);
        if (campo) campo.value = '';
    });
    carregarProfissionais();
}

function renderCardProfissional(profissional) {
    const fornecedor = profissional.tipo_registro === 'fornecedor';
    const nome = window.ccUI.escapeHtml(profissional.nome || 'Registro sem nome');
    const especialidade = window.ccUI.escapeHtml(profissional.especialidade || 'Especialidade não informada');
    const cidade = window.ccUI.escapeHtml(profissional.cidade || 'Cidade não informada');
    const descricao = window.ccUI.escapeHtml(profissional.descricao || 'Sem descrição cadastrada.');

    return `
        <article class="bg-surface-card p-space-lg rounded-xl shadow-sm border border-border-subtle hover:shadow-md transition-all flex flex-col justify-between cc-profissional" data-cc-profissional-id="${window.ccUI.escapeHtml(profissional.id)}">
            <div class="flex flex-col gap-space-sm">
                <div class="flex items-start justify-between gap-space-xs">
                    <div class="flex items-center gap-space-sm min-w-0">
                        <div class="w-12 h-12 rounded-full ${fornecedor ? 'bg-secondary text-on-secondary' : 'bg-primary-container text-on-primary'} flex items-center justify-center font-title-md text-title-md shrink-0" aria-hidden="true">
                            ${window.ccUI.escapeHtml(String(profissional.nome || '?').charAt(0).toUpperCase())}
                        </div>
                        <div class="flex flex-col min-w-0">
                            <h3 class="font-title-md text-title-md text-on-surface font-bold tracking-tight cc-quebra">${nome}</h3>
                            <span class="inline-flex items-center gap-1 font-caption text-caption text-status-em-andamento font-semibold cc-quebra">
                                <span class="material-symbols-outlined text-[14px]" aria-hidden="true">${fornecedor ? 'store' : 'engineering'}</span>
                                ${especialidade}
                            </span>
                        </div>
                    </div>
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${fornecedor ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'} font-caption text-caption font-bold shrink-0">
                        ${fornecedor ? 'Fornecedor' : 'Profissional'}
                    </span>
                </div>

                <p class="font-body-sm text-body-sm text-on-surface-variant line-clamp-3 my-space-xs cc-quebra">${descricao}</p>

                <div class="flex flex-wrap items-center gap-x-space-md gap-y-2 text-on-surface-variant font-caption text-caption pt-space-xs border-t border-border-subtle">
                    <span class="flex items-center gap-1 min-w-0">
                        <span class="material-symbols-outlined text-[16px] shrink-0" aria-hidden="true">place</span>
                        <span class="cc-quebra">${cidade}</span>
                    </span>
                    ${profissional.contato ? `
                    <span class="flex items-center gap-1 min-w-0">
                        <span class="material-symbols-outlined text-[16px] shrink-0" aria-hidden="true">call</span>
                        <span class="cc-quebra">${window.ccUI.escapeHtml(profissional.contato)}</span>
                    </span>` : ''}
                    ${profissional.email ? `
                    <span class="flex items-center gap-1 min-w-0">
                        <span class="material-symbols-outlined text-[16px] shrink-0" aria-hidden="true">mail</span>
                        <span class="cc-quebra">${window.ccUI.escapeHtml(profissional.email)}</span>
                    </span>` : ''}
                    ${profissional.cnpj_cpf ? `
                    <span class="flex items-center gap-1 min-w-0">
                        <span class="material-symbols-outlined text-[16px] shrink-0" aria-hidden="true">badge</span>
                        <span class="cc-quebra">${window.ccUI.escapeHtml(profissional.cnpj_cpf)}</span>
                    </span>` : ''}
                </div>
            </div>

            <div class="mt-space-md pt-space-xs flex items-center justify-end gap-space-sm border-t border-border-subtle">
                <button type="button" onclick="abrirModalEditarProfissional('${window.ccUI.escapeHtml(profissional.id)}')"
                        class="inline-flex items-center justify-center gap-1 min-h-11 px-space-sm py-2 rounded-lg bg-surface-subtle hover:bg-surface-container font-label-sm text-label-sm text-on-surface">
                    <span class="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span>
                    <span>Editar cadastro</span>
                </button>
            </div>
        </article>
    `;
}

async function abrirModalEditarProfissional(id) {
    const profissional = profissionaisCarregados.find((item) => item.id === id);
    if (!profissional) {
        window.ccUI.mostrarAviso('Não foi possível localizar o cadastro selecionado.', 'erro');
        return;
    }
    profissionalEmEdicao = profissional;

    let modal = document.getElementById('modal-editar-profissional');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-editar-profissional';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm hidden';
        modal.innerHTML = `
            <div class="bg-surface-card rounded-xl shadow-xl w-full max-w-lg p-space-lg mx-4 flex flex-col gap-space-md cc-modal__painel max-h-[90dvh] overflow-y-auto">
                <div class="flex items-center justify-between gap-2">
                    <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold">Editar cadastro</h3>
                    <button type="button" data-cc-fechar class="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg hover:bg-surface-subtle text-on-surface-variant" aria-label="Fechar">
                        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
                    </button>
                </div>
                <div id="edicao-profissional-feedback" class="hidden p-2.5 rounded-lg font-label-sm text-label-sm text-center" role="alert" aria-live="polite"></div>
                <form class="flex flex-col gap-space-md" id="form-editar-profissional" novalidate>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface" for="edit-prof-nome">Nome / razão social *</label>
                        <input type="text" id="edit-prof-nome" required class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface" for="edit-prof-tipo">Tipo de registro *</label>
                            <select id="edit-prof-tipo" class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none">
                                <option value="profissional">Profissional</option>
                                <option value="fornecedor">Fornecedor</option>
                            </select>
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface" for="edit-prof-especialidade">Especialidade *</label>
                            <input type="text" id="edit-prof-especialidade" required class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface" for="edit-prof-cidade">Cidade de atuação *</label>
                            <input type="text" id="edit-prof-cidade" required class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface" for="edit-prof-contato">Contato</label>
                            <input type="text" id="edit-prof-contato" class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface" for="edit-prof-documento">CNPJ / CPF</label>
                            <input type="text" id="edit-prof-documento" class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="font-label-sm text-label-sm text-on-surface" for="edit-prof-email">E-mail</label>
                            <input type="email" id="edit-prof-email" class="h-11 px-3.5 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none" />
                        </div>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="font-label-sm text-label-sm text-on-surface" for="edit-prof-descricao">Descrição / escopo</label>
                        <textarea id="edit-prof-descricao" rows="3" class="p-3 rounded-lg bg-surface-subtle text-body-md text-on-surface focus:outline-none"></textarea>
                    </div>
                    <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-space-sm pt-space-xs">
                        <button type="button" data-cc-fechar class="min-h-11 px-space-md py-2 rounded-lg bg-surface-subtle text-on-surface font-label-md text-label-md">Cancelar</button>
                        <button type="submit" class="min-h-11 px-space-md py-2 rounded-lg bg-status-em-andamento text-on-primary font-label-md text-label-md shadow-sm">Salvar alterações</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelectorAll('[data-cc-fechar]').forEach((botao) => {
            botao.addEventListener('click', () => modal.classList.add('hidden'));
        });
        modal.querySelector('#form-editar-profissional').addEventListener('submit', salvarEdicaoProfissionalSubmit);
    }

    document.getElementById('edit-prof-nome').value = profissional.nome || '';
    document.getElementById('edit-prof-tipo').value = profissional.tipo_registro || 'profissional';
    document.getElementById('edit-prof-especialidade').value = profissional.especialidade || '';
    document.getElementById('edit-prof-cidade').value = profissional.cidade || '';
    document.getElementById('edit-prof-contato').value = profissional.contato || '';
    document.getElementById('edit-prof-documento').value = profissional.cnpj_cpf || '';
    document.getElementById('edit-prof-email').value = profissional.email || '';
    document.getElementById('edit-prof-descricao').value = profissional.descricao || '';

    const feedback = document.getElementById('edicao-profissional-feedback');
    if (feedback) { feedback.textContent = ''; feedback.classList.add('hidden'); }

    modal.classList.remove('hidden');
    window.setTimeout(() => document.getElementById('edit-prof-nome')?.focus({ preventScroll: true }), 60);
}

function exibirFeedbackEdicaoProfissional(mensagem, tipo) {
    const el = document.getElementById('edicao-profissional-feedback');
    if (!el) return window.ccUI.mostrarAviso(mensagem, tipo === 'sucesso' ? 'sucesso' : 'erro');
    el.textContent = mensagem;
    el.className = `p-2.5 rounded-lg font-label-sm text-label-sm text-center ${tipo === 'sucesso' ? 'bg-status-concluida/10 text-status-concluida' : 'bg-error-container text-on-error-container'}`;
    el.setAttribute('role', tipo === 'sucesso' ? 'status' : 'alert');
    el.classList.remove('hidden');
}

async function salvarEdicaoProfissionalSubmit(evento) {
    evento.preventDefault();
    if (!profissionalEmEdicao) return;

    const nome = (document.getElementById('edit-prof-nome')?.value || '').trim();
    const tipo = document.getElementById('edit-prof-tipo')?.value || 'profissional';
    const especialidade = (document.getElementById('edit-prof-especialidade')?.value || '').trim();
    const cidade = (document.getElementById('edit-prof-cidade')?.value || '').trim();
    const contato = (document.getElementById('edit-prof-contato')?.value || '').trim();
    const documento = (document.getElementById('edit-prof-documento')?.value || '').trim();
    const email = (document.getElementById('edit-prof-email')?.value || '').trim();
    const descricao = (document.getElementById('edit-prof-descricao')?.value || '').trim();

    if (!nome) return exibirFeedbackEdicaoProfissional('O nome é obrigatório.', 'erro');
    if (!especialidade) return exibirFeedbackEdicaoProfissional('A especialidade é obrigatória.', 'erro');
    if (!cidade) return exibirFeedbackEdicaoProfissional('A cidade é obrigatória.', 'erro');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return exibirFeedbackEdicaoProfissional('Informe um e-mail válido.', 'erro');
    }

    const botao = document.querySelector('#form-editar-profissional button[type="submit"]');
    try {
        if (botao) { botao.disabled = true; botao.setAttribute('aria-busy', 'true'); }
        await window.dbService.updateProfissional(profissionalEmEdicao.id, {
            nome,
            tipo_registro: tipo,
            especialidade,
            cidade,
            contato,
            cnpj_cpf: documento,
            email,
            descricao
        });
        document.getElementById('modal-editar-profissional')?.classList.add('hidden');
        window.ccUI.mostrarAviso('Cadastro atualizado com sucesso.', 'sucesso');
        profissionalEmEdicao = null;
        carregarProfissionais();
    } catch (erro) {
        console.error('Erro ao atualizar profissional:', erro);
        exibirFeedbackEdicaoProfissional(window.ccUI.mensagemErroDados(erro), 'erro');
    } finally {
        if (botao) { botao.disabled = false; botao.removeAttribute('aria-busy'); }
    }
}

function adicionarOpcaoEspecialidade(valor) {
    const select = document.getElementById('especialidade-prof');
    if (!select || !valor) return;
    const normalizado = String(valor).trim();
    if (!normalizado) return;
    const existe = Array.from(select.options).some((opcao) => opcao.value === normalizado);
    if (existe) return;
    const opcao = document.createElement('option');
    opcao.value = normalizado;
    opcao.textContent = normalizado;
    select.appendChild(opcao);
}

function configurarOutraEspecialidade() {
    const select = document.getElementById('especialidade-prof');
    if (!select || select.dataset.ccOutra === 'true') return;
    select.dataset.ccOutra = 'true';

    const opcaoOutra = document.createElement('option');
    opcaoOutra.value = '__outra__';
    opcaoOutra.textContent = 'Outra especialidade...';
    select.appendChild(opcaoOutra);

    let campo = document.getElementById('outra-especialidade-prof');
    if (!campo) {
        campo = document.createElement('input');
        campo.type = 'text';
        campo.id = 'outra-especialidade-prof';
        campo.maxLength = 120;
        campo.placeholder = 'Descreva a especialidade';
        campo.className = 'h-11 px-4 rounded-lg bg-surface-subtle font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-card';
        campo.setAttribute('aria-label', 'Outra especialidade');
        campo.hidden = true;
        select.insertAdjacentElement('afterend', campo);
    }

    select.addEventListener('change', () => {
        campo.hidden = select.value !== '__outra__';
        if (!campo.hidden) campo.focus();
    });
}

function setupFormCadastroProfissional(form) {
    configurarOutraEspecialidade();
    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();

        const nome = (document.getElementById('nome-prof')?.value || '').trim();
        const tipo_registro = document.getElementById('tipo-registro-prof')?.value || 'profissional';
        let especialidade = document.getElementById('especialidade-prof')?.value || '';
        if (especialidade === '__outra__') {
            especialidade = (document.getElementById('outra-especialidade-prof')?.value || '').trim();
        }
        const cidade = (document.getElementById('cidade-prof')?.value || '').trim();
        const contato = (document.getElementById('contato-prof')?.value || '').trim();
        const cnpj_cpf = (document.getElementById('cnpj-cpf-prof')?.value || '').trim();
        const email = (document.getElementById('email-prof')?.value || '').trim();
        const descricao = (document.getElementById('descricao-prof')?.value || '').trim();

        if (!nome) return showFormError('O nome é obrigatório.');
        if (!especialidade || especialidade === '__outra__') return showFormError('Selecione ou descreva uma especialidade válida.');
        adicionarOpcaoEspecialidade(especialidade);
        if (!cidade) return showFormError('A cidade de atuação é obrigatória.');
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showFormError('Informe um e-mail válido.');

        const botao = form.querySelector('button[type="submit"]');
        try {
            if (botao) { botao.disabled = true; botao.setAttribute('aria-busy', 'true'); }

            await window.dbService.saveProfissional({
                nome,
                tipo_registro,
                especialidade,
                cidade,
                contato,
                cnpj_cpf,
                email,
                descricao
            });

            showFormSuccess('Cadastro salvo com sucesso! Redirecionando...');
            window.setTimeout(() => { window.location.href = 'profissionais.html'; }, 1000);
        } catch (erro) {
            console.error('Erro ao salvar profissional:', erro);
            showFormError(window.ccUI.mensagemErroDados(erro));
        } finally {
            if (botao) { botao.disabled = false; botao.removeAttribute('aria-busy'); }
        }
    });
}

function garantirFeedbackFormulario() {
    let el = document.getElementById('form-feedback-msg');
    if (!el) {
        el = document.createElement('div');
        el.id = 'form-feedback-msg';
        el.setAttribute('role', 'alert');
        el.setAttribute('aria-live', 'polite');
        document.getElementById('form-cadastro-profissional')?.prepend(el);
    }
    return el;
}

function showFormError(mensagem) {
    const el = garantirFeedbackFormulario();
    if (!el) return;
    el.className = 'p-3 rounded-lg bg-error-container text-on-error-container font-label-sm text-label-sm text-center mb-4';
    el.textContent = mensagem;
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function showFormSuccess(mensagem) {
    const el = garantirFeedbackFormulario();
    if (!el) return;
    el.className = 'p-3 rounded-lg bg-status-concluida/10 text-status-concluida font-label-sm text-label-sm text-center mb-4';
    el.textContent = mensagem;
}

async function carregarDetalhesProfissional() {
    const container = document.getElementById('detalhes-profissional-container');
    if (!container) return;

    const id = new URLSearchParams(window.location.search).get('profissional_id');
    if (!id) {
        container.innerHTML = window.ccUI.estadoErro({
            titulo: 'Profissional não informado',
            mensagem: 'Abra esta página a partir da listagem de profissionais.',
            acoes: [{ rotulo: 'Voltar para Profissionais', onclick: "window.location.href='profissionais.html'", classe: 'cc-btn cc-btn--primario' }]
        });
        return;
    }

    container.setAttribute('aria-busy', 'true');
    container.innerHTML = window.ccUI.estadoCarregando('Carregando cadastro do profissional...');

    try {
        const profissional = await window.dbService.getProfissionalById(id);
        if (!profissional) {
            container.innerHTML = window.ccUI.estadoVazio({
                icone: 'badge',
                titulo: 'Profissional não encontrado',
                mensagem: 'O cadastro solicitado não existe ou foi removido.',
                acoes: [{ rotulo: 'Voltar para Profissionais', onclick: "window.location.href='profissionais.html'", classe: 'cc-btn cc-btn--primario' }]
            });
            return;
        }
        container.innerHTML = window.ccUI.estadoVazio({
            icone: 'badge',
            titulo: window.ccUI.escapeHtml(profissional.nome),
            mensagem: `${window.ccUI.escapeHtml(profissional.especialidade)} — ${window.ccUI.escapeHtml(profissional.cidade)}`
        });
    } catch (erro) {
        console.error('Erro ao carregar profissional:', erro);
        container.innerHTML = window.ccUI.estadoErro({
            mensagem: window.ccUI.mensagemErroDados(erro),
            acoes: [{ rotulo: 'Tentar novamente', onclick: 'carregarDetalhesProfissional()', classe: 'cc-btn cc-btn--secundario' }]
        });
    } finally {
        container.setAttribute('aria-busy', 'false');
    }
}
