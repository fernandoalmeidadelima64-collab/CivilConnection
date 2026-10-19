/* ==========================================================================
   Civil Connection — Utilidades de interface
   ==========================================================================
   Funções compartilhadas por todas as páginas: escape de conteúdo, formatação,
   estados de carregamento/vazio/erro, avisos (toasts) e confirmação acessível
   de ações destrutivas. Nenhuma função aqui acessa o banco de dados.
   ========================================================================== */

(function () {
    'use strict';

    const MAPA_STATUS_OBRA = {
        planejamento: 'Planejamento',
        em_andamento: 'Em andamento',
        pausada: 'Pausada',
        concluida: 'Concluída'
    };

    const MAPA_STATUS_ETAPA = {
        pendente: 'Pendente',
        em_andamento: 'Em andamento',
        concluida: 'Concluída'
    };

    const MAPA_STATUS_TAREFA = {
        pendente: 'Pendente',
        em_andamento: 'Em andamento',
        concluida: 'Concluída',
        atrasada: 'Atrasada',
        bloqueada: 'Bloqueada'
    };

    const MAPA_STATUS_AGENDAMENTO = {
        agendado: 'Agendado',
        confirmado: 'Confirmado',
        concluido: 'Concluído',
        cancelado: 'Cancelado'
    };

    const MAPA_TIPO_AGENDAMENTO = {
        visita_tecnica: 'Visita técnica',
        inspecao: 'Inspeção / Vistoria',
        reuniao: 'Reunião de alinhamento',
        outro: 'Outro compromisso'
    };

    const MAPA_TIPO_REGISTRO = {
        profissional: 'Profissional',
        fornecedor: 'Fornecedor'
    };

    function escapeHtml(valor) {
        return String(valor === null || valor === undefined ? '' : valor)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function texto(valor, padrao) {
        const limpo = String(valor === null || valor === undefined ? '' : valor).trim();
        return limpo || (padrao || '');
    }

    function dataValida(valor) {
        if (!valor) return null;
        const dt = valor instanceof Date ? valor : new Date(valor);
        return Number.isNaN(dt.getTime()) ? null : dt;
    }

    function formatarData(valor, opcoes) {
        const dt = dataValida(valor);
        if (!dt) return 'Não informada';
        return dt.toLocaleDateString('pt-BR', opcoes || { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function formatarDataHora(valor) {
        const dt = dataValida(valor);
        if (!dt) return 'Data não informada';
        return dt.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatarHora(valor) {
        const dt = dataValida(valor);
        if (!dt) return '--:--';
        return dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Converte uma data para o formato aceito por <input type="datetime-local">
     * usando o fuso local (toISOString() usaria UTC e exibiria a hora errada).
     */
    function paraInputDatetimeLocal(valor) {
        const dt = dataValida(valor);
        if (!dt) return '';
        const pad = (n) => String(n).padStart(2, '0');
        return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    }

    function paraInputData(valor) {
        const dt = dataValida(valor);
        if (!dt) return '';
        const pad = (n) => String(n).padStart(2, '0');
        return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    }

    function formatarBytes(bytes) {
        const n = Number(bytes || 0);
        if (!n || n < 0) return 'Tamanho não informado';
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1).replace('.', ',')} KB`;
        return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
    }

    function pluralizar(quantidade, singular, plural) {
        return `${quantidade} ${quantidade === 1 ? singular : plural}`;
    }

    function nomeStatusObra(status) {
        return MAPA_STATUS_OBRA[status] || MAPA_STATUS_OBRA.planejamento;
    }

    function nomeStatusEtapa(status) {
        return MAPA_STATUS_ETAPA[status] || MAPA_STATUS_ETAPA.pendente;
    }

    function nomeStatusTarefa(status) {
        return MAPA_STATUS_TAREFA[status] || MAPA_STATUS_TAREFA.pendente;
    }

    function nomeStatusAgendamento(status) {
        return MAPA_STATUS_AGENDAMENTO[status] || MAPA_STATUS_AGENDAMENTO.agendado;
    }

    function nomeTipoAgendamento(tipo) {
        return MAPA_TIPO_AGENDAMENTO[tipo] || MAPA_TIPO_AGENDAMENTO.outro;
    }

    function nomeTipoRegistro(tipo) {
        return MAPA_TIPO_REGISTRO[tipo] || MAPA_TIPO_REGISTRO.profissional;
    }

    /**
     * Converte um erro técnico em uma mensagem clara em português.
     * O detalhe original permanece apenas no console, para não expor mensagens
     * internas do PostgREST/Supabase ao usuário final.
     */
    function mensagemErroDados(erro) {
        if (!erro) return 'Não foi possível concluir a operação. Tente novamente.';

        if (erro.name === 'ErroIntegracao' || erro.tipo === 'integracao') {
            return erro.message || 'Não foi possível acessar os dados. Tente novamente.';
        }

        const mensagem = String(erro.message || '');
        if (/failed to fetch|networkerror|load failed|network request failed/i.test(mensagem)) {
            return 'Não foi possível conectar ao servidor do Supabase. Verifique sua conexão e tente novamente.';
        }

        // Mensagens já traduzidas pela camada de dados / autenticação.
        if (/[áàâãéêíóôõúç]/i.test(mensagem) && mensagem.length <= 240) {
            return mensagem;
        }

        return 'Não foi possível concluir a operação. Tente novamente em instantes.';
    }

    function acoesHtml(acoes) {
        if (!acoes) return '';
        const botoes = (Array.isArray(acoes) ? acoes : [acoes])
            .filter((acao) => acao && acao.rotulo && acao.onclick)
            .map((acao) => {
                const classe = acao.classe || 'cc-btn cc-btn--secundario';
                return `<button type="button" class="${escapeHtml(classe)}" onclick="${escapeHtml(acao.onclick)}">${escapeHtml(acao.rotulo)}</button>`;
            })
            .join('');
        return botoes ? `<div class="cc-estado__acoes">${botoes}</div>` : '';
    }

    function estadoCarregando(mensagem) {
        return `
            <div class="cc-carregando" role="status" aria-live="polite">
                <span class="material-symbols-outlined" aria-hidden="true">sync</span>
                <span>${escapeHtml(mensagem || 'Carregando dados...')}</span>
            </div>
        `;
    }

    function estadoVazio(opcoes) {
        const cfg = opcoes || {};
        return `
            <div class="cc-estado cc-estado--vazio" role="status">
                <div class="cc-estado__icone" aria-hidden="true">
                    <span class="material-symbols-outlined">${escapeHtml(cfg.icone || 'inbox')}</span>
                </div>
                <strong>${escapeHtml(cfg.titulo || 'Nenhum registro encontrado')}</strong>
                <p>${escapeHtml(cfg.mensagem || 'Não há dados para exibir no momento.')}</p>
                ${acoesHtml(cfg.acoes)}
            </div>
        `;
    }

    function estadoErro(opcoes) {
        const cfg = opcoes || {};
        return `
            <div class="cc-estado cc-estado--erro" role="alert">
                <div class="cc-estado__icone" aria-hidden="true">
                    <span class="material-symbols-outlined">warning</span>
                </div>
                <strong>${escapeHtml(cfg.titulo || 'Não foi possível carregar os dados')}</strong>
                <p>${escapeHtml(cfg.mensagem || 'Ocorreu uma falha ao consultar o Supabase. Tente novamente.')}</p>
                ${acoesHtml(cfg.acoes)}
            </div>
        `;
    }

    function obterContainerToasts() {
        let container = document.getElementById('cc-toasts');
        if (!container) {
            container = document.createElement('div');
            container.id = 'cc-toasts';
            container.className = 'cc-toasts';
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-atomic', 'false');
            document.body.appendChild(container);
        }
        return container;
    }

    function mostrarAviso(mensagem, tipo, duracao) {
        const tipoFinal = tipo || 'erro';
        const container = obterContainerToasts();
        const toast = document.createElement('div');
        toast.className = `cc-toast cc-toast--${tipoFinal}`;
        toast.setAttribute('role', tipoFinal === 'erro' ? 'alert' : 'status');

        const textoEl = document.createElement('div');
        textoEl.className = 'cc-toast__texto';
        textoEl.textContent = String(mensagem || '');

        const fechar = document.createElement('button');
        fechar.type = 'button';
        fechar.className = 'cc-toast__fechar';
        fechar.setAttribute('aria-label', 'Fechar aviso');
        fechar.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">close</span>';
        fechar.addEventListener('click', () => toast.remove());

        toast.appendChild(textoEl);
        toast.appendChild(fechar);
        container.appendChild(toast);

        const tempo = Number(duracao) || (tipoFinal === 'erro' ? 9000 : 5000);
        let timer = window.setTimeout(() => toast.remove(), tempo);
        toast.addEventListener('mouseenter', () => window.clearTimeout(timer));
        toast.addEventListener('focusin', () => window.clearTimeout(timer));
        toast.addEventListener('mouseleave', () => {
            timer = window.setTimeout(() => toast.remove(), 2500);
        });
        return toast;
    }

    /**
     * Diálogo de confirmação acessível (substitui window.confirm).
     * Retorna uma Promise<boolean>.
     */
    function confirmarAcao(opcoes) {
        const cfg = opcoes || {};
        return new Promise((resolve) => {
            const focoAnterior = document.activeElement;
            const modal = document.createElement('div');
            modal.className = 'cc-modal fixed inset-0 z-[95] flex items-center justify-center bg-primary/50 backdrop-blur-sm';
            modal.setAttribute('role', 'alertdialog');
            modal.setAttribute('aria-modal', 'true');

            const tituloId = 'cc-confirmar-titulo';
            const descricaoId = 'cc-confirmar-descricao';

            const painel = document.createElement('div');
            painel.className = 'cc-modal__painel bg-surface-card rounded-xl shadow-xl w-full max-w-md p-space-lg mx-4 flex flex-col gap-space-md';
            painel.innerHTML = `
                <h3 id="${tituloId}" class="font-headline-sm text-headline-sm font-bold ${cfg.perigo === false ? 'text-on-surface' : 'text-error'}">
                    ${escapeHtml(cfg.titulo || 'Confirmar ação')}
                </h3>
                <p id="${descricaoId}" class="font-body-md text-body-md text-on-surface-variant">
                    ${escapeHtml(cfg.mensagem || 'Deseja continuar?')}
                </p>
                <div class="flex items-center justify-end gap-space-sm pt-space-xs border-t border-border-subtle">
                    <button type="button" class="cc-btn cc-btn--secundario" data-cc-cancelar>${escapeHtml(cfg.textoCancelar || 'Cancelar')}</button>
                    <button type="button" class="cc-btn ${cfg.perigo === false ? 'cc-btn--primario' : 'cc-btn--perigo'}" data-cc-confirmar>${escapeHtml(cfg.textoConfirmar || 'Confirmar')}</button>
                </div>
            `;
            modal.appendChild(painel);
            modal.setAttribute('aria-labelledby', tituloId);
            modal.setAttribute('aria-describedby', descricaoId);

            const finalizar = (resultado) => {
                modal.remove();
                if (document.body.classList.contains('cc-modal-aberto') && !document.querySelector('.cc-modal')) {
                    document.body.classList.remove('cc-modal-aberto');
                }
                if (focoAnterior && typeof focoAnterior.focus === 'function') {
                    focoAnterior.focus({ preventScroll: true });
                }
                resolve(resultado);
            };

            const botaoCancelar = painel.querySelector('[data-cc-cancelar]');
            const botaoConfirmar = painel.querySelector('[data-cc-confirmar]');

            botaoCancelar.addEventListener('click', () => finalizar(false));
            botaoConfirmar.addEventListener('click', () => finalizar(true));

            modal.addEventListener('click', (evento) => {
                if (evento.target === modal) finalizar(false);
            });

            modal.addEventListener('keydown', (evento) => {
                if (evento.key === 'Escape') {
                    evento.preventDefault();
                    finalizar(false);
                    return;
                }
                if (evento.key !== 'Tab') return;
                const focaveis = Array.from(painel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
                    .filter((el) => !el.disabled && el.offsetParent !== null);
                if (!focaveis.length) return;
                const primeiro = focaveis[0];
                const ultimo = focaveis[focaveis.length - 1];
                if (evento.shiftKey && document.activeElement === primeiro) {
                    evento.preventDefault();
                    ultimo.focus();
                } else if (!evento.shiftKey && document.activeElement === ultimo) {
                    evento.preventDefault();
                    primeiro.focus();
                }
            });

            document.body.appendChild(modal);
            document.body.classList.add('cc-modal-aberto');
            botaoCancelar.focus({ preventScroll: true });
        });
    }

    function garantirIdConteudoPrincipal() {
        const main = document.querySelector('main');
        if (main && !main.id) main.id = 'conteudo-principal';
        return main;
    }

    window.ccUI = {
        escapeHtml,
        texto,
        dataValida,
        formatarData,
        formatarDataHora,
        formatarHora,
        paraInputDatetimeLocal,
        paraInputData,
        formatarBytes,
        pluralizar,
        nomeStatusObra,
        nomeStatusEtapa,
        nomeStatusTarefa,
        nomeStatusAgendamento,
        nomeTipoAgendamento,
        nomeTipoRegistro,
        mensagemErroDados,
        estadoCarregando,
        estadoVazio,
        estadoErro,
        mostrarAviso,
        confirmarAcao,
        garantirIdConteudoPrincipal
    };
})();
