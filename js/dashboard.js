/* ==========================================================================
   Civil Connection — Dashboard executivo
   ==========================================================================
   Os indicadores são calculados exclusivamente a partir das consultas reais
   ao Supabase. Não há números fixos nem dados de demonstração.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('dash-obras-recentes');
    if (container) carregarDashboardMetrics();
});

function definirValorMetrica(id, valor) {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
}

function garantirFeedbackDashboard() {
    const main = document.querySelector('main');
    if (!main) return null;
    let feedback = document.getElementById('dash-feedback');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.id = 'dash-feedback';
        feedback.className = 'w-full';
        const primeiro = main.querySelector('.flex.flex-col.w-full');
        if (primeiro) primeiro.prepend(feedback);
        else main.prepend(feedback);
    }
    return feedback;
}

async function carregarDashboardMetrics() {
    const containerRecentes = document.getElementById('dash-obras-recentes');
    const containerAgendamentos = document.getElementById('dash-proximos-agendamentos');
    const feedback = garantirFeedbackDashboard();
    const secaoMetricas = document.getElementById('dash-total-obras')?.closest('section');
    if (secaoMetricas) secaoMetricas.setAttribute('aria-busy', 'true');

    if (feedback) feedback.replaceChildren();

    if (!window.dbService || typeof window.dbService.isConfigured !== 'function' || !window.dbService.isConfigured()) {
        if (containerRecentes) {
            containerRecentes.innerHTML = window.ccUI.estadoVazio({
                icone: 'settings',
                titulo: 'Conexão com o Supabase não configurada',
                mensagem: 'Preencha a URL do projeto e a chave anon em js/supabase-config.js para carregar os indicadores.'
            });
        }
        if (containerAgendamentos) {
            containerAgendamentos.innerHTML = window.ccUI.estadoVazio({
                icone: 'calendar_month',
                titulo: 'Agenda indisponível',
                mensagem: 'Os compromissos aparecerão após a configuração da conexão com o banco de dados.'
            });
        }
        if (secaoMetricas) secaoMetricas.setAttribute('aria-busy', 'false');
        return;
    }

    definirValorMetrica('dash-total-profissionais', '—');
    definirValorMetrica('dash-total-obras', '—');
    definirValorMetrica('dash-obras-andamento', '—');
    definirValorMetrica('dash-obras-concluidas', '—');
    definirValorMetrica('dash-progresso-medio', '—');

    if (containerRecentes) {
        containerRecentes.innerHTML = window.ccUI.estadoCarregando('Carregando obras recentes...');
    }
    if (containerAgendamentos) {
        containerAgendamentos.innerHTML = window.ccUI.estadoCarregando('Carregando próximos compromissos...');
    }

    try {
        const metrics = await window.dbService.getDashboardMetrics();

        definirValorMetrica('dash-total-profissionais', String(metrics.totalProfissionais));
        definirValorMetrica('dash-total-obras', String(metrics.totalObras));
        definirValorMetrica('dash-obras-andamento', String(metrics.obrasEmAndamento));
        definirValorMetrica('dash-obras-concluidas', String(metrics.obrasConcluidas));
        definirValorMetrica('dash-progresso-medio', `${metrics.progressoMedio}%`);

        if (containerRecentes) {
            if (!metrics.obrasRecentes || !metrics.obrasRecentes.length) {
                containerRecentes.innerHTML = window.ccUI.estadoVazio({
                    icone: 'apartment',
                    titulo: 'Nenhuma obra cadastrada',
                    mensagem: 'Cadastre a primeira obra para acompanhar o progresso e os indicadores do canteiro.',
                    acoes: [{ rotulo: 'Cadastrar obra', onclick: "window.location.href='pages/cadastro-obra.html'", classe: 'cc-btn cc-btn--primario' }]
                });
            } else {
                containerRecentes.innerHTML = metrics.obrasRecentes.map(renderDashboardObraRow).join('');
            }
        }

        if (containerAgendamentos) {
            if (!metrics.proximosAgendamentos || !metrics.proximosAgendamentos.length) {
                containerAgendamentos.innerHTML = window.ccUI.estadoVazio({
                    icone: 'event_busy',
                    titulo: 'Nenhum compromisso próximo',
                    mensagem: 'Não há visitas, inspeções ou reuniões agendadas para os próximos dias.',
                    acoes: [{ rotulo: 'Abrir agenda', onclick: "window.location.href='pages/agenda.html'", classe: 'cc-btn cc-btn--secundario' }]
                });
            } else {
                containerAgendamentos.innerHTML = metrics.proximosAgendamentos.map(renderDashboardAgendamentoRow).join('');
            }
        }
    } catch (erro) {
        console.error('Erro ao carregar métricas do dashboard:', erro);
        definirValorMetrica('dash-total-profissionais', '—');
        definirValorMetrica('dash-total-obras', '—');
        definirValorMetrica('dash-obras-andamento', '—');
        definirValorMetrica('dash-obras-concluidas', '—');
        definirValorMetrica('dash-progresso-medio', '—');

        if (containerRecentes) {
            containerRecentes.innerHTML = window.ccUI.estadoErro({
                titulo: 'Não foi possível carregar as obras',
                mensagem: window.ccUI.mensagemErroDados(erro),
                acoes: [{ rotulo: 'Tentar novamente', onclick: 'carregarDashboardMetrics()', classe: 'cc-btn cc-btn--secundario' }]
            });
        }
        if (containerAgendamentos) {
            containerAgendamentos.innerHTML = window.ccUI.estadoErro({
                titulo: 'Não foi possível carregar a agenda',
                mensagem: window.ccUI.mensagemErroDados(erro)
            });
        }
        if (feedback && window.dbService && !window.dbService.isConfigured()) {
            // O aviso detalhado de configuração é exibido pela camada mobile.
            feedback.replaceChildren();
        }
    } finally {
        if (secaoMetricas) secaoMetricas.setAttribute('aria-busy', 'false');
    }
}

function renderDashboardObraRow(obra) {
    const progresso = Math.min(100, Math.max(0, Number(obra.progresso) || 0));
    const placeholder = 'assets/images/placeholder-obra.svg';
    const foto = typeof window.getObraImagemUrl === 'function'
        ? window.getObraImagemUrl(obra.foto_capa_url, placeholder)
        : '';
    const midia = foto && foto !== placeholder
        ? `<img src="${window.ccUI.escapeHtml(foto)}" alt="Imagem da obra ${window.ccUI.escapeHtml(obra.nome)}" loading="lazy" onerror="this.onerror=null; this.src='${placeholder}'; this.className='w-full h-full object-cover';" class="w-full h-full object-cover" />`
        : '<span class="material-symbols-outlined text-status-em-andamento text-[22px]" aria-hidden="true">apartment</span>';

    return `
        <div class="p-space-md bg-surface-card rounded-xl border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-space-md shadow-sm hover:shadow transition-shadow cc-dashboard-obra">
            <div class="flex items-center gap-space-md min-w-0">
                <div class="w-12 h-12 rounded-lg bg-surface-subtle overflow-hidden shrink-0 flex items-center justify-center">
                    ${midia}
                </div>
                <div class="flex flex-col min-w-0">
                    <span class="font-title-md text-title-md text-on-surface font-bold cc-quebra">${window.ccUI.escapeHtml(obra.nome)}</span>
                    <span class="font-caption text-caption text-on-surface-variant">${window.ccUI.escapeHtml(obra.cidade || 'Cidade não informada')}</span>
                </div>
            </div>

            <div class="cc-dashboard-obra__acoes flex items-center gap-space-lg self-end sm:self-auto">
                <div class="flex flex-col items-end w-32 cc-dashboard-obra__progresso">
                    <span class="font-caption text-caption text-on-surface-variant mb-1">Avanço: <strong class="text-on-surface">${progresso}%</strong></span>
                    <div class="w-full h-2 rounded-full bg-surface-subtle overflow-hidden" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progresso}" aria-label="Progresso da obra">
                        <div class="h-full bg-status-em-andamento" style="width: ${progresso}%"></div>
                    </div>
                </div>

                <a href="pages/obra-detalhes.html?obra_id=${encodeURIComponent(obra.id)}"
                   class="p-2 rounded-lg bg-surface-subtle hover:bg-surface-container text-on-surface transition-colors inline-flex items-center gap-1"
                   aria-label="Ver detalhes da obra ${window.ccUI.escapeHtml(obra.nome)}">
                    <span class="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
                </a>
            </div>
        </div>
    `;
}

function renderDashboardAgendamentoRow(agendamento) {
    const inicio = new Date(agendamento.inicio);
    const dataValida = !Number.isNaN(inicio.getTime());
    const dia = dataValida ? inicio.toLocaleDateString('pt-BR', { day: '2-digit' }) : '--';
    const mes = dataValida ? inicio.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') : '';
    const hora = dataValida ? inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const nomeObra = agendamento.obras && agendamento.obras.nome ? agendamento.obras.nome : 'Obra não informada';

    return `
        <div class="p-space-sm bg-surface-card rounded-xl border border-border-subtle flex items-center justify-between gap-2 shadow-sm">
            <div class="flex items-center gap-space-sm min-w-0">
                <div class="w-10 h-10 rounded-lg bg-status-em-andamento/10 text-status-em-andamento flex items-center justify-center font-bold text-caption text-center flex-col shrink-0" aria-hidden="true">
                    <span class="text-[10px] uppercase leading-none">${window.ccUI.escapeHtml(mes)}</span>
                    <span class="text-sm leading-none font-bold">${window.ccUI.escapeHtml(dia)}</span>
                </div>
                <div class="flex flex-col min-w-0">
                    <span class="font-label-md text-label-md text-on-surface font-semibold cc-quebra">${window.ccUI.escapeHtml(agendamento.titulo)}</span>
                    <span class="font-caption text-caption text-on-surface-variant cc-quebra">${window.ccUI.escapeHtml(hora)} — ${window.ccUI.escapeHtml(nomeObra)}</span>
                </div>
            </div>
            <a href="pages/agenda.html" class="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-subtle transition-colors"
               aria-label="Abrir compromisso na agenda">
                <span class="material-symbols-outlined text-[18px]" aria-hidden="true">event</span>
            </a>
        </div>
    `;
}
