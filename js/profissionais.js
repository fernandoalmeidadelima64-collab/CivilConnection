/* ============================================================
   Civil Conection — Módulo de Profissionais e Fornecedores (CC-06)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const containerProfissionais = document.getElementById('lista-profissionais');
    if (containerProfissionais) {
        carregarProfissionais();
        setupFiltrosProfissionais();
    }

    const formCadastroProf = document.getElementById('form-cadastro-profissional');
    if (formCadastroProf) {
        setupFormCadastroProfissional(formCadastroProf);
    }

    const containerDetalhes = document.getElementById('detalhes-profissional-container');
    if (containerDetalhes) {
        carregarDetalhesProfissional();
    }
});

let debounceTimer;

function setupFiltrosProfissionais() {
    const inputBusca = document.getElementById('busca-profissional');
    const selectEspecialidade = document.getElementById('filtro-especialidade');
    const selectCidade = document.getElementById('filtro-cidade');
    const selectTipo = document.getElementById('filtro-tipo-registro');

    const triggerBusca = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            carregarProfissionais();
        }, 300);
    };

    if (inputBusca) inputBusca.addEventListener('input', triggerBusca);
    if (selectEspecialidade) selectEspecialidade.addEventListener('change', triggerBusca);
    if (selectCidade) selectCidade.addEventListener('change', triggerBusca);
    if (selectTipo) selectTipo.addEventListener('change', triggerBusca);
}

async function carregarProfissionais() {
    const container = document.getElementById('lista-profissionais');
    const totalCountEl = document.getElementById('total-profissionais-count');
    if (!container) return;

    const busca = document.getElementById('busca-profissional')?.value.trim() || '';
    const especialidade = document.getElementById('filtro-especialidade')?.value || '';
    const cidade = document.getElementById('filtro-cidade')?.value || '';
    const tipo_registro = document.getElementById('filtro-tipo-registro')?.value || '';

    container.innerHTML = `
        <div class="col-span-full py-12 flex flex-col items-center justify-center text-on-surface-variant">
            <span class="material-symbols-outlined text-4xl animate-spin mb-2">progress_activity</span>
            <p class="font-body-md text-body-md">Carregando especialistas do Supabase...</p>
        </div>
    `;

    try {
        const profissionais = await dbService.getProfissionais({ busca, especialidade, cidade, tipo_registro });

        if (totalCountEl) {
            totalCountEl.textContent = `${profissionais.length} parceiro${profissionais.length !== 1 ? 's' : ''}`;
        }

        if (!profissionais || profissionais.length === 0) {
            container.innerHTML = `
                <div class="col-span-full bg-surface-card p-8 rounded-xl text-center border border-border-subtle">
                    <span class="material-symbols-outlined text-4xl text-on-surface-variant mb-2">badge</span>
                    <h3 class="font-headline-sm text-headline-sm text-on-surface mb-1">Nenhum parceiro localizado</h3>
                    <p class="font-body-md text-body-md text-on-surface-variant">Tente ajustar seus termos de pesquisa ou filtros de categoria.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = profissionais.map(p => renderCardProfissional(p)).join('');
    } catch (err) {
        console.error('Erro ao carregar profissionais:', err);
        container.innerHTML = `
            <div class="col-span-full bg-error-container/20 p-6 rounded-xl text-center border border-error/20">
                <p class="font-body-md text-body-md text-error font-semibold">Falha ao conectar com o banco de dados Supabase.</p>
            </div>
        `;
    }
}

function renderCardProfissional(p) {
    const estrelas = Math.round(Number(p.avaliacao) || 5);
    const estrelasHTML = '★'.repeat(estrelas) + '☆'.repeat(5 - estrelas);
    const isFornecedor = p.tipo_registro === 'fornecedor';

    return `
        <div class="bg-surface-card p-space-lg rounded-xl shadow-sm border border-border-subtle hover:shadow-md transition-all flex flex-col justify-between">
            <div class="flex flex-col gap-space-sm">
                <div class="flex items-start justify-between gap-space-xs">
                    <div class="flex items-center gap-space-sm">
                        <div class="w-12 h-12 rounded-full ${isFornecedor ? 'bg-secondary text-on-secondary' : 'bg-primary-container text-on-primary'} flex items-center justify-center font-title-md text-title-md shrink-0">
                            ${p.nome.charAt(0)}
                        </div>
                        <div class="flex flex-col">
                            <div class="flex items-center gap-1.5">
                                <h3 class="font-title-md text-title-md text-on-surface font-bold tracking-tight">${p.nome}</h3>
                            </div>
                            <span class="inline-flex items-center gap-1 font-caption text-caption text-status-em-andamento font-semibold">
                                <span class="material-symbols-outlined text-[14px]">${isFornecedor ? 'store' : 'engineering'}</span>
                                ${p.especialidade}
                            </span>
                        </div>
                    </div>
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${isFornecedor ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'} font-caption text-caption font-bold">
                        ${isFornecedor ? 'Fornecedor' : 'Profissional'}
                    </span>
                </div>

                <p class="font-body-sm text-body-sm text-on-surface-variant line-clamp-3 my-space-xs">
                    ${p.descricao || 'Profissional ou fornecedor homologado no ecossistema Civil Connection.'}
                </p>

                <div class="flex flex-wrap items-center gap-space-md text-on-surface-variant font-caption text-caption pt-space-xs border-t border-border-subtle">
                    <span class="flex items-center gap-1">
                        <span class="material-symbols-outlined text-[16px]">location_on</span>
                        ${p.cidade}
                    </span>
                    ${p.contato ? `
                    <span class="flex items-center gap-1">
                        <span class="material-symbols-outlined text-[16px]">call</span>
                        ${p.contato}
                    </span>` : ''}
                    ${p.cnpj_cpf ? `
                    <span class="flex items-center gap-1">
                        <span class="material-symbols-outlined text-[16px]">badge</span>
                        ${p.cnpj_cpf}
                    </span>` : ''}
                </div>
            </div>

            <div class="mt-space-md pt-space-xs flex items-center justify-between">
                <span class="inline-flex items-center gap-1 text-amber-500 font-label-sm text-label-sm">
                    ${estrelasHTML} <strong class="text-on-surface ml-1">${p.avaliacao || '5.0'}</strong>
                </span>
            </div>
        </div>
    `;
}

function setupFormCadastroProfissional(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('nome-prof')?.value.trim();
        const tipo_registro = document.getElementById('tipo-registro-prof')?.value || 'profissional';
        const especialidade = document.getElementById('especialidade-prof')?.value;
        const cidade = document.getElementById('cidade-prof')?.value.trim();
        const contato = document.getElementById('contato-prof')?.value.trim();
        const cnpj_cpf = document.getElementById('cnpj-cpf-prof')?.value.trim();
        const email = document.getElementById('email-prof')?.value.trim();
        const descricao = document.getElementById('descricao-prof')?.value.trim();

        if (!nome) {
            showFormError('O nome é obrigatório.');
            return;
        }
        if (!especialidade) {
            showFormError('Selecione uma especialidade válida.');
            return;
        }
        if (!cidade) {
            showFormError('A cidade de atuação é obrigatória.');
            return;
        }

        try {
            const btnSubmit = form.querySelector('button[type="submit"]');
            if (btnSubmit) btnSubmit.disabled = true;

            await dbService.saveProfissional({
                nome,
                tipo_registro,
                especialidade,
                cidade,
                contato,
                cnpj_cpf,
                email,
                descricao
            });

            showFormSuccess('Registro salvo com sucesso!');
            setTimeout(() => {
                window.location.href = 'profissionais.html';
            }, 1200);
        } catch (err) {
            console.error(err);
            showFormError('Erro ao salvar cadastro.');
        }
    });
}

function showFormError(msg) {
    let el = document.getElementById('form-feedback-msg');
    if (!el) {
        el = document.createElement('div');
        el.id = 'form-feedback-msg';
        document.querySelector('form')?.prepend(el);
    }
    el.className = 'p-3 rounded-lg bg-error-container text-on-error-container font-label-sm text-label-sm text-center mb-4';
    el.textContent = msg;
}

function showFormSuccess(msg) {
    let el = document.getElementById('form-feedback-msg');
    if (!el) {
        el = document.createElement('div');
        el.id = 'form-feedback-msg';
        document.querySelector('form')?.prepend(el);
    }
    el.className = 'p-3 rounded-lg bg-status-concluida/10 text-status-concluida font-label-sm text-label-sm text-center mb-4';
    el.textContent = msg;
}
