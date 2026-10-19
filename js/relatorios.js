/* ==========================================================================
   Civil Connection — Relatórios consolidados e auditoria
   ==========================================================================
   Consolida obras e histórico reais do Supabase. A exportação CSV é gerada
   no navegador, com escape correto dos campos e sem interpolar HTML.
   ========================================================================== */

let relatorioObras = [];
let relatorioProfissionais = [];

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('relatorio-obras-list')) carregarRelatorios();
});

async function carregarRelatorios() {
    const containerObras = document.getElementById('relatorio-obras-list');
    const containerAuditoria = document.getElementById('relatorio-auditoria-list');
    if (!containerObras) return;

    containerObras.setAttribute('aria-busy', 'true');
    containerObras.innerHTML = window.ccUI.estadoCarregando('Consolidando dados das obras...');
    if (containerAuditoria) {
        containerAuditoria.setAttribute('aria-busy', 'true');
        containerAuditoria.innerHTML = window.ccUI.estadoCarregando('Carregando auditoria...');
    }

    const [obras, profissionais, historico] = await Promise.allSettled([
        window.dbService.getObras(),
        window.dbService.getProfissionais(),
        window.dbService.getHistoricoRecente(30)
    ]);

    if (obras.status === 'rejected') {
        console.error('Erro ao consolidar obras:', obras.reason);
        containerObras.innerHTML = window.ccUI.estadoErro({
            titulo: 'Não foi possível gerar o relatório de obras',
            mensagem: window.ccUI.mensagemErroDados(obras.reason),
            acoes: [{ rotulo: 'Tentar novamente', onclick: 'carregarRelatorios()', classe: 'cc-btn cc-btn--secundario' }]
        });
    } else {
        relatorioObras = obras.value || [];
        relatorioProfissionais = profissionais.status === 'fulfilled' ? (profissionais.value || []) : [];

        if (!relatorioObras.length) {
            containerObras.innerHTML = window.ccUI.estadoVazio({
                icone: 'description',
                titulo: 'Nenhuma obra para consolidar',
                mensagem: 'Cadastre obras e etapas para gerar relatórios de acompanhamento.',
                acoes: [{ rotulo: 'Cadastrar obra', onclick: "window.location.href='cadastro-obra.html'", classe: 'cc-btn cc-btn--primario' }]
            });
        } else {
            containerObras.innerHTML = relatorioObras.map(renderRelatorioObraCard).join('');
        }
    }
    containerObras.setAttribute('aria-busy', 'false');

    if (containerAuditoria) {
        if (historico.status === 'rejected') {
            console.error('Erro ao carregar auditoria:', historico.reason);
            containerAuditoria.innerHTML = window.ccUI.estadoErro({
                titulo: 'Não foi possível carregar a auditoria',
                mensagem: window.ccUI.mensagemErroDados(historico.reason)
            });
        } else if (!historico.value.length) {
            containerAuditoria.innerHTML = window.ccUI.estadoVazio({
                icone: 'history',
                titulo: 'Nenhum evento de auditoria',
                mensagem: 'As alterações registradas nas obras aparecerão aqui automaticamente.'
            });
        } else {
            containerAuditoria.innerHTML = historico.value.map((evento) => {
                const obra = evento.obras && evento.obras.nome ? evento.obras.nome : 'Obra não informada';
                const autor = evento.usuarios && evento.usuarios.nome ? evento.usuarios.nome : 'Sistema';
                return `
                    <div class="p-3 bg-surface-card rounded-lg border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-body-sm">
                        <div class="flex flex-col min-w-0">
                            <span class="font-semibold text-on-surface cc-quebra">${window.ccUI.escapeHtml(evento.descricao)}</span>
                            <span class="font-caption text-caption text-on-surface-variant cc-quebra">${window.ccUI.escapeHtml(obra)} · ${window.ccUI.escapeHtml(autor)}</span>
                        </div>
                        <span class="font-caption text-caption text-on-surface-variant shrink-0">${window.ccUI.escapeHtml(window.ccUI.formatarDataHora(evento.criado_em))}</span>
                    </div>
                `;
            }).join('');
        }
        containerAuditoria.setAttribute('aria-busy', 'false');
    }
}

function renderRelatorioObraCard(obra) {
    const progresso = Math.min(100, Math.max(0, Number(obra.progresso) || 0));
    const responsavel = (relatorioProfissionais.find((profissional) => profissional.id === obra.responsavel_id) || {}).nome
        || (obra.profissionais && obra.profissionais.nome)
        || 'Não definido';
    const nome = window.ccUI.escapeHtml(obra.nome);

    return `
        <article class="bg-surface-card p-space-lg rounded-xl border border-border-subtle flex flex-col gap-space-sm shadow-sm print:shadow-none print:border-black cc-relatorio-obra">
            <div class="flex flex-wrap items-start justify-between gap-2">
                <div class="min-w-0">
                    <h3 class="font-title-md text-title-md text-on-surface font-bold cc-quebra">${nome}</h3>
                    <span class="font-caption text-caption text-on-surface-variant cc-quebra">${window.ccUI.escapeHtml(obra.cidade || 'Cidade não informada')} — Responsável técnico: ${window.ccUI.escapeHtml(responsavel)}</span>
                </div>
                <span class="font-label-md text-label-md font-bold text-status-em-andamento shrink-0">${progresso}% concluído</span>
            </div>

            <div class="w-full h-2.5 rounded-full bg-surface-subtle overflow-hidden my-1" role="progressbar"
                 aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progresso}" aria-label="Progresso da obra ${nome}">
                <div class="h-full bg-status-em-andamento" style="width: ${progresso}%"></div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-x-space-md gap-y-1 font-caption text-caption text-on-surface-variant pt-2 border-t border-border-subtle">
                <span>Início: ${window.ccUI.escapeHtml(obra.data_inicio ? window.ccUI.formatarData(obra.data_inicio) : 'Não informado')}</span>
                <span>Previsão: ${window.ccUI.escapeHtml(obra.data_previsao_fim ? window.ccUI.formatarData(obra.data_previsao_fim) : 'A definir')}</span>
                <span>Status: <strong>${window.ccUI.escapeHtml(window.ccUI.nomeStatusObra(obra.status))}</strong></span>
            </div>
        </article>
    `;
}

function escaparCampoCsv(valor) {
    const texto = String(valor === null || valor === undefined ? '' : valor);
    return `"${texto.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
}

async function exportarRelatorioCSV() {
    try {
        const obras = relatorioObras.length ? relatorioObras : await window.dbService.getObras();
        if (!obras.length) {
            window.ccUI.mostrarAviso('Não há obras para exportar.', 'aviso');
            return;
        }

        const cabecalho = ['ID', 'Nome', 'Cidade', 'Status', 'Progresso (%)', 'Data de início', 'Previsão de término', 'Responsável técnico'];
        const linhas = obras.map((obra) => {
            const responsavel = (relatorioProfissionais.find((profissional) => profissional.id === obra.responsavel_id) || {}).nome || '';
            return [
                obra.id,
                obra.nome,
                obra.cidade,
                window.ccUI.nomeStatusObra(obra.status),
                Number(obra.progresso) || 0,
                obra.data_inicio || '',
                obra.data_previsao_fim || '',
                responsavel
            ].map(escaparCampoCsv).join(';');
        });

        const conteudo = '\uFEFF' + [cabecalho.map(escaparCampoCsv).join(';'), ...linhas].join('\r\n');
        const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio-obras-civil-connection-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 5000);
        window.ccUI.mostrarAviso('Relatório CSV exportado.', 'sucesso');
    } catch (erro) {
        console.error('Erro ao exportar CSV:', erro);
        window.ccUI.mostrarAviso(window.ccUI.mensagemErroDados(erro), 'erro');
    }
}

function imprimirRelatorioPDF() {
    if (!relatorioObras.length) {
        window.ccUI.mostrarAviso('Não há dados carregados para imprimir.', 'aviso');
        return;
    }
    window.print();
}
