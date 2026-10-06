/* ============================================================
   Civil Conection — Módulo Dashboard Executivo
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

    try {
        const metrics = await dbService.getDashboardMetrics();

        if (elTotalProfissionais) elTotalProfissionais.textContent = metrics.totalProfissionais;
        if (elTotalObras) elTotalObras.textContent = metrics.totalObras;
        if (elObrasAndamento) elObrasAndamento.textContent = metrics.obrasEmAndamento;
        if (elObrasConcluidas) elObrasConcluidas.textContent = metrics.obrasConcluidas;
        if (elProgressoMedio) elProgressoMedio.textContent = `${metrics.progressoMedio}%`;

        if (containerRecentes && metrics.obrasRecentes) {
            if (metrics.obrasRecentes.length === 0) {
                containerRecentes.innerHTML = `
                    <div class="py-6 text-center text-on-surface-variant font-body-sm">
                        Nenhuma obra cadastrada até o momento.
                    </div>
                `;
            } else {
                containerRecentes.innerHTML = metrics.obrasRecentes.map(o => renderDashboardObraRow(o)).join('');
            }
        }
    } catch (err) {
        console.error('Erro ao carregar métricas do dashboard:', err);
    }
}

function renderDashboardObraRow(o) {
    const prog = Math.min(100, Math.max(0, Number(o.progresso) || 0));

    return `
        <div class="p-space-md bg-surface-card rounded-xl border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-space-md shadow-sm">
            <div class="flex flex-col">
                <span class="font-title-md text-title-md text-on-surface font-semibold">${o.nome}</span>
                <span class="font-caption text-caption text-on-surface-variant">${o.cidade}</span>
            </div>

            <div class="flex items-center gap-space-lg">
                <div class="flex flex-col items-end w-36">
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
