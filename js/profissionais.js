/* ============================================================
   Civil Conection — Módulo de Profissionais
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Tela de Listagem de Profissionais
    const containerProfissionais = document.getElementById('lista-profissionais');
    if (containerProfissionais) {
        carregarProfissionais();
        setupFiltrosProfissionais();
    }

    // 2. Tela de Cadastro de Profissional
    const formCadastroProf = document.getElementById('form-cadastro-profissional');
    if (formCadastroProf) {
        setupFormCadastroProfissional(formCadastroProf);
    }

    // 3. Tela de Detalhes do Profissional
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

    const triggerBusca = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            carregarProfissionais();
        }, 300);
    };

    if (inputBusca) inputBusca.addEventListener('input', triggerBusca);
    if (selectEspecialidade) selectEspecialidade.addEventListener('change', triggerBusca);
    if (selectCidade) selectCidade.addEventListener('change', triggerBusca);
}

async function carregarProfissionais() {
    const container = document.getElementById('lista-profissionais');
    const totalCountEl = document.getElementById('total-profissionais-count');
    if (!container) return;

    const busca = document.getElementById('busca-profissional')?.value.trim() || '';
    const especialidade = document.getElementById('filtro-especialidade')?.value || '';
    const cidade = document.getElementById('filtro-cidade')?.value || '';

    container.innerHTML = `
        <div class="col-span-full py-12 flex flex-col items-center justify-center text-on-surface-variant">
            <span class="material-symbols-outlined text-4xl animate-spin mb-2">progress_activity</span>
            <p class="font-body-md text-body-md">Carregando especialistas do Supabase...</p>
        </div>
    `;

    try {
        const profissionais = await dbService.getProfissionais({ busca, especialidade, cidade });

        if (totalCountEl) {
            totalCountEl.textContent = `${profissionais.length} especialista${profissionais.length !== 1 ? 's' : ''}`;
        }

        if (!profissionais || profissionais.length === 0) {
            container.innerHTML = `
                <div class="col-span-full bg-surface-card p-8 rounded-xl text-center border border-border-subtle">
                    <span class="material-symbols-outlined text-4xl text-on-surface-variant mb-2">badge</span>
                    <h3 class="font-headline-sm text-headline-sm text-on-surface mb-1">Nenhum profissional encontrado</h3>
                    <p class="font-body-md text-body-md text-on-surface-variant">Tente ajustar seus termos de pesquisa ou filtros de cidade e especialidade.</p>
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

    return `
        <div class="bg-surface-card p-space-lg rounded-xl shadow-sm border border-border-subtle hover:shadow-md transition-all flex flex-col justify-between">
            <div class="flex flex-col gap-space-sm">
                <div class="flex items-start justify-between gap-space-xs">
                    <div class="flex items-center gap-space-sm">
                        <div class="w-12 h-12 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-title-md text-title-md shrink-0">
                            ${p.nome.charAt(0)}
                        </div>
                        <div class="flex flex-col">
                            <h3 class="font-title-md text-title-md text-on-surface tracking-tight">${p.nome}</h3>
                            <span class="inline-flex items-center gap-1 font-caption text-caption text-status-em-andamento font-semibold">
                                <span class="material-symbols-outlined text-[14px]">engineering</span>
                                ${p.especialidade}
                            </span>
                        </div>
                    </div>
                    <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface-subtle text-on-surface font-label-sm text-label-sm">
                        <span class="text-amber-500">${estrelasHTML}</span>
                        <span>${p.avaliacao || '5.0'}</span>
                    </span>
                </div>

                <p class="font-body-sm text-body-sm text-on-surface-variant line-clamp-3 my-space-xs">
                    ${p.descricao || 'Profissional técnico cadastrado na rede Civil Connection com ampla atuação no setor.'}
                </p>

                <div class="flex items-center gap-space-md text-on-surface-variant font-caption text-caption pt-space-xs border-t border-border-subtle">
                    <span class="flex items-center gap-1">
                        <span class="material-symbols-outlined text-[16px]">location_on</span>
                        ${p.cidade}
                    </span>
                    ${p.contato ? `
                    <span class="flex items-center gap-1">
                        <span class="material-symbols-outlined text-[16px]">call</span>
                        ${p.contato}
                    </span>` : ''}
                </div>
            </div>

            <div class="mt-space-md pt-space-xs">
                <a href="obra-detalhes.html?prof_id=${p.id}" class="w-full inline-flex items-center justify-center gap-space-xs py-2 px-space-md rounded-lg bg-surface-subtle hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors">
                    <span>Visualizar Perfil e Obras</span>
                    <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                </a>
            </div>
        </div>
    `;
}

function setupFormCadastroProfissional(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('nome-prof')?.value.trim();
        const especialidade = document.getElementById('especialidade-prof')?.value;
        const cidade = document.getElementById('cidade-prof')?.value.trim();
        const descricao = document.getElementById('descricao-prof')?.value.trim();
        const contato = document.getElementById('contato-prof')?.value.trim();

        if (!nome) {
            showFormError('O nome do profissional é obrigatório.');
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
                especialidade,
                cidade,
                descricao,
                contato
            });

            showFormSuccess('Profissional cadastrado com sucesso no Supabase!');
            setTimeout(() => {
                window.location.href = 'profissionais.html';
            }, 1200);
        } catch (err) {
            console.error(err);
            showFormError('Erro ao cadastrar profissional no Supabase.');
        }
    });
}

async function carregarDetalhesProfissional() {
    const params = new URLSearchParams(window.location.search);
    const profId = params.get('prof_id');
    const container = document.getElementById('detalhes-profissional-container');
    if (!profId || !container) return;

    try {
        const prof = await dbService.getProfissionalById(profId);
        if (!prof) {
            container.innerHTML = `<p class="p-6 text-center text-error">Profissional não localizado.</p>`;
            return;
        }

        container.innerHTML = `
            <div class="bg-surface-card p-space-xl rounded-xl shadow-sm border border-border-subtle flex flex-col gap-space-lg">
                <div class="flex items-center gap-space-md">
                    <div class="w-16 h-16 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-display text-headline-lg">
                        ${prof.nome.charAt(0)}
                    </div>
                    <div class="flex flex-col">
                        <h2 class="font-headline-md text-headline-md text-on-surface">${prof.nome}</h2>
                        <span class="font-label-md text-label-md text-status-em-andamento font-semibold">${prof.especialidade}</span>
                        <span class="font-caption text-caption text-on-surface-variant">${prof.cidade}</span>
                    </div>
                </div>
                <div class="flex flex-col gap-space-xs">
                    <h4 class="font-title-md text-title-md text-on-surface">Sobre o Profissional</h4>
                    <p class="font-body-md text-body-md text-on-surface-variant">${prof.descricao || 'Sem descrição cadastrada.'}</p>
                </div>
                ${prof.contato ? `
                <div class="flex items-center gap-space-sm bg-surface-subtle p-space-md rounded-lg">
                    <span class="material-symbols-outlined text-primary">call</span>
                    <span class="font-label-md text-label-md text-on-surface">Contato Direto: ${prof.contato}</span>
                </div>` : ''}
            </div>
        `;
    } catch (e) {
        console.error(e);
    }
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
