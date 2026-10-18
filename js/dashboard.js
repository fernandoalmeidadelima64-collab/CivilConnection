/* ============================================================
   Civil Conection — Módulo Dashboard Executivo (CC-05)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    carregarDashboardMetrics();
});

async function carregarDashboardMetrics() {
    const elTotalProfissionais = document.getElementById('dash-total-profissionais');
    const elTotalObras = document.getElementById('dash-total-obras');
    const elObrasAndamento = document.getElementById('dash-obras-andamento');
    const elObrasConcluidas = document.getElementById('dash-obras-concluidas');
    const elProgressoMedio = document.getElementById('dash-progresso-medio');
    const containerRecentes = document.getElementById('dash-obras-recentes');
    const containerAgendamentos = document.getElementById('dash-proximos-agendamentos');

    try {
        const metrics = await dbService.getDashboardMetrics();

        if (elTotalProfissionais) elTotalProfissionais.textContent = metrics.totalProfissionais;
        if (elTotalObras) elTotalObras.textContent = metrics.totalObras;
        if (elObrasAndamento) elObrasAndamento.textContent = metrics.obrasEmAndamento;
        if (elObrasConcluidas) elObrasConcluidas.textContent = metrics.obrasConcluidas;
        if (elProgressoMedio) elProgressoMedio.textContent = `${metrics.progressoMedio}%`;

        // Obras Recentes
        if (containerRecentes && metrics.obrasRecentes) {
            if (metrics.obrasRecentes.length === 0) {
                containerRecentes.innerHTML = `
                    <div class="py-6 text-center text-on-surface-variant font-body-sm bg-surface-card rounded-xl border border-border-subtle p-6">
                        Nenhuma obra ativa cadastrada no momento.
                    </div>
                `;
            } else {
                containerRecentes.innerHTML = metrics.obrasRecentes.map(o => renderDashboardObraRow(o)).join('');
            }
        }

        // Próximos Agendamentos
        if (containerAgendamentos) {
            if (!metrics.proximosAgendamentos || metrics.proximosAgendamentos.length === 0) {
                containerAgendamentos.innerHTML = `
                    <div class="py-6 text-center text-on-surface-variant font-body-sm bg-surface-card rounded-xl border border-border-subtle p-6">
                        Nenhum compromisso agendado para os próximos dias.
                    </div>
                `;
            } else {
                containerAgendamentos.innerHTML = metrics.proximosAgendamentos.map(a => renderDashboardAgendamentoRow(a)).join('');
            }
        }
    } catch (err) {
        console.error('Erro ao carregar métricas do dashboard:', err);
    }
}

function renderDashboardObraRow(o) {
    const prog = Math.min(100, Math.max(0, Number(o.progresso) || 0));
    const foto = o.foto_capa_url || 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=800&q=80';

    return `
        <div class="p-space-md bg-surface-card rounded-xl border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-space-md shadow-sm hover:shadow transition-shadow">
            <div class="flex items-center gap-space-md">
                <div class="w-12 h-12 rounded-lg bg-surface-subtle overflow-hidden shrink-0">
                    <img src="${foto}" alt="${o.nome}" class="w-full h-full object-cover" />
                </div>
                <div class="flex flex-col">
                    <span class="font-title-md text-title-md text-on-surface font-bold">${o.nome}</span>
                    <span class="font-caption text-caption text-on-surface-variant">${o.cidade}</span>
                </div>
            </div>

            <div class="flex items-center gap-space-lg self-end sm:self-auto">
                <div class="flex flex-col items-end w-32">
                    <span class="font-caption text-caption text-on-surface-variant mb-1">Avanço: <strong class="text-on-surface">${prog}%</strong></span>
                    <div class="w-full h-2 rounded-full bg-surface-subtle overflow-hidden">
                        <div class="h-full bg-status-em-andamento" style="width: ${prog}%"></div>
                    </div>
                </div>

                <a href="pages/obra-detalhes.html?obra_id=${o.id}" class="p-2 rounded-lg bg-surface-subtle hover:bg-surface-container text-on-surface transition-colors" title="Ver Detalhes">
                    <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                </a>
            </div>
        </div>
    `;
}

function renderDashboardAgendamentoRow(a) {
    const dt = new Date(a.inicio);
    const dataStr = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    const horaStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return `
        <div class="p-space-sm bg-surface-card rounded-xl border border-border-subtle flex items-center justify-between shadow-sm">
            <div class="flex items-center gap-space-sm">
                <div class="w-10 h-10 rounded-lg bg-status-em-andamento/10 text-status-em-andamento flex items-center justify-center font-bold text-caption text-center flex-col shrink-0">
                    <span class="text-[11px] uppercase">${dataStr.split(' ')[1] || ''}</span>
                    <span class="text-sm leading-none font-bold">${dataStr.split(' ')[0]}</span>
                </div>
                <div class="flex flex-col">
                    <span class="font-label-md text-label-md text-on-surface font-semibold line-clamp-1">${a.titulo}</span>
                    <span class="font-caption text-caption text-on-surface-variant">${horaStr} — ${a.obras ? a.obras.nome : 'Obra'}</span>
                </div>
            </div>
            <a href="pages/agenda.html" class="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-subtle transition-colors">
                <span class="material-symbols-outlined text-[18px]">event</span>
            </a>
        </div>
    `;
}
