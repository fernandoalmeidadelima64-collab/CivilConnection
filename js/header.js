/* ==========================================================================
   Civil Connection — Cabeçalho desktop
   ==========================================================================
   Liga a busca global do cabeçalho à listagem de obras. Sem isso o campo
   era apenas decorativo e não devolvia nenhum resultado.
   ========================================================================== */

(function () {
    'use strict';

    function iniciarBuscaGlobal() {
        const campo = document.querySelector('header input[placeholder*="Buscar obras"]');
        if (!campo || campo.dataset.ccBuscaGlobal === 'true') return;

        campo.dataset.ccBuscaGlobal = 'true';
        campo.setAttribute('aria-label', 'Buscar obras por nome ou descrição');
        campo.setAttribute('type', 'search');

        // O campo e o ícone da lupa ficam dentro do mesmo formulário; apenas
        // envolvemos o contêiner existente para não perder o ícone.
        const container = campo.parentElement;
        const form = document.createElement('form');
        form.setAttribute('role', 'search');
        form.className = 'relative flex items-center';
        container.replaceWith(form);
        form.appendChild(container);

        form.addEventListener('submit', (evento) => {
            evento.preventDefault();
            const termo = campo.value.trim();
            const emPaginas = window.location.pathname.includes('/pages/');
            const destino = new URL(emPaginas ? 'obras.html' : 'pages/obras.html', window.location.href);
            if (termo) destino.searchParams.set('busca', termo);
            window.location.href = destino.href;
        });
    }

    document.addEventListener('DOMContentLoaded', iniciarBuscaGlobal);
})();
