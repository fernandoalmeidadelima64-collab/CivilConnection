/* ============================================================
   Civil Conection — Módulo de Relatórios e Exportação (CC-08)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    carregarRelatorios();
});

async function carregarRelatorios() {
    const containerObrasReport = document.getElementById('relatorio-obras-list');
    const containerAuditoria = document.getElementById('relatorio-auditoria-list');

    if (!containerObrasReport) return;

    containerObrasReport.innerHTML = `
        <div class="py-12 text-center text-on-surface-variant">
            <span class="material-symbols-outlined text-4xl animate-spin mb-2">progress_activity</span>
            <p class="font-body-md text-body-md">Gerando dados estatísticos e consolidados do Supabase...</p>
        </div>
    `;

    try {
        const obras = await dbService.getObras();
        const profs = await dbService.getProfissionais();

        if (!obras || obras.length === 0) {
            containerObrasReport.innerHTML = `<p class="p-8 text-center text-on-surface-variant bg-surface-card rounded-xl border border-border-subtle">Nenhum dado de obra disponível para consolidação.</p>`;
        } else {
            containerObrasReport.innerHTML = obras.map(o => renderRelatorioObraCard(o, profs)).join('');
        }

        if (containerAuditoria) {
            const historicoGeral = getLocalData('historico_obra');
            if (!historicoGeral || historicoGeral.length === 0) {
                containerAuditoria.innerHTML = `<p class="p-6 text-center text-on-surface-variant bg-surface-card rounded-xl border border-border-subtle">Sem registros de auditoria no histórico.</p>`;
            } else {
                containerAuditoria.innerHTML = historicoGeral.slice(0, 10).map(h => `
                    <div class="p-3 bg-surface-card rounded-lg border border-border-subtle flex items-center justify-between text-body-sm">
                        <span class="font-semibold text-on-surface">${h.descricao}</span>
                        <span class="font-caption text-caption text-on-surface-variant">${new Date(h.criado_em).toLocaleString('pt-BR')}</span>
                    </div>
                `).join('');
            }
        }
    } catch (err) {
        console.error('Erro ao gerar relatórios:', err);
    }
}

function renderRelatorioObraCard(o, profs) {
    const prog = Math.min(100, Math.max(0, Number(o.progresso) || 0));
    const resp = profs.find(p => p.id === o.responsavel_id)?.nome || 'Não definido';

    return `
        <div class="bg-surface-card p-space-lg rounded-xl border border-border-subtle flex flex-col gap-space-sm shadow-sm print:shadow-none print:border-black">
            <div class="flex items-start justify-between">
                <div>
                    <h3 class="font-title-md text-title-md text-on-surface font-bold">${o.nome}</h3>
                    <span class="font-caption text-caption text-on-surface-variant">${o.cidade} — Resp. Técnico: ${resp}</span>
                </div>
                <span class="font-label-md text-label-md font-bold text-status-em-andamento">${prog}% Concluído</span>
            </div>

            <div class="w-full h-2.5 rounded-full bg-surface-subtle overflow-hidden my-1">
                <div class="h-full bg-status-em-andamento" style="width: ${prog}%"></div>
            </div>

            <div class="flex items-center justify-between font-caption text-caption text-on-surface-variant pt-2 border-t border-border-subtle">
                <span>Início: ${o.data_inicio ? new Date(o.data_inicio).toLocaleDateString('pt-BR') : 'Sem data'}</span>
                <span>Previsão: ${o.data_previsao_fim ? new Date(o.data_previsao_fim).toLocaleDateString('pt-BR') : 'A definir'}</span>
                <span>Status: <strong class="uppercase">${o.status}</strong></span>
            </div>
        </div>
    `;
}

function exportarRelatorioCSV() {
    dbService.getObras().then(obras => {
        if (!obras || obras.length === 0) {
            alert('Sem dados para exportar.');
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,ID;Nome;Cidade;Status;Progresso;DataInicio;PrevisaoFim\n";
        obras.forEach(o => {
            csvContent += `"${o.id}";"${o.nome}";"${o.cidade}";"${o.status}";"${o.progresso}%";"${o.data_inicio || ''}";"${o.data_previsao_fim || ''}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Relatorio_CivilConnection_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

function imprimirRelatorioPDF() {
    window.print();
}
