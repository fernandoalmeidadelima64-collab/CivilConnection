/* ==========================================================================
   Civil Connection — Gerenciador de Tema Claro e Escuro
   ==========================================================================
   Gerencia a preferência de tema (claro / escuro) armazenada em localStorage
   sob a chave 'civil_theme'. Funciona de maneira autônoma, sem depender de
   sessão autenticada.
   ========================================================================== */

(function () {
    'use strict';

    const CHAVE_TEMA = 'civil_theme';

    function obterTemaAtual() {
        try {
            const salvo = localStorage.getItem(CHAVE_TEMA);
            if (salvo === 'escuro' || salvo === 'claro') return salvo;
        } catch (e) {
            // Em caso de restrição de localStorage, usa o padrão claro.
        }
        return 'claro';
    }

    function aplicarTema(tema) {
        const escuro = tema === 'escuro';
        if (escuro) {
            document.documentElement.classList.add('dark', 'theme-dark');
            if (document.body) document.body.classList.add('dark', 'theme-dark');
        } else {
            document.documentElement.classList.remove('dark', 'theme-dark');
            if (document.body) document.body.classList.remove('dark', 'theme-dark');
        }

        document.querySelectorAll('.cc-theme-toggle').forEach((botao) => {
            const icone = botao.querySelector('.material-symbols-outlined');
            const texto = botao.querySelector('.cc-theme-toggle-label');

            if (icone) icone.textContent = escuro ? 'light_mode' : 'dark_mode';
            if (texto) texto.textContent = escuro ? 'Tema Claro' : 'Tema Escuro';

            botao.setAttribute('aria-label', escuro ? 'Alternar para tema claro' : 'Alternar para tema escuro');
            botao.setAttribute('title', escuro ? 'Alternar para tema claro' : 'Alternar para tema escuro');
        });
    }

    function alternarTema() {
        const atual = obterTemaAtual();
        const novo = atual === 'escuro' ? 'claro' : 'escuro';
        try {
            localStorage.setItem(CHAVE_TEMA, novo);
        } catch (e) {
            console.warn('Não foi possível salvar a preferência de tema no localStorage.');
        }
        aplicarTema(novo);
        try {
            window.dispatchEvent(new CustomEvent('civil:tema', { detail: { tema: novo } }));
        } catch (e) { /* opcional */ }
        return novo;
    }

    function criarBotaoTema(classeExtra) {
        const atual = obterTemaAtual();
        const escuro = atual === 'escuro';
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = `cc-theme-toggle ${classeExtra || ''}`;
        botao.setAttribute('aria-label', escuro ? 'Alternar para tema claro' : 'Alternar para tema escuro');
        botao.setAttribute('title', escuro ? 'Alternar para tema claro' : 'Alternar para tema escuro');
        botao.innerHTML = `
            <span class="material-symbols-outlined text-[20px]" aria-hidden="true">${escuro ? 'light_mode' : 'dark_mode'}</span>
            <span class="cc-theme-toggle-label sr-only">${escuro ? 'Tema Claro' : 'Tema Escuro'}</span>
        `;
        botao.addEventListener('click', alternarTema);
        return botao;
    }

    function injetarBotoesTema() {
        // Cabeçalho desktop
        const desktopHeader = document.querySelector('header .flex.items-center.gap-space-md');
        if (desktopHeader && !desktopHeader.querySelector('.cc-theme-toggle')) {
            const btnHeader = criarBotaoTema('relative w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-subtle hover:text-on-surface transition-colors border border-border-subtle bg-transparent overflow-hidden');
            desktopHeader.prepend(btnHeader);
        }

        // Topbar mobile
        const topbar = document.querySelector('.cc-topbar');
        if (topbar && !topbar.querySelector('.cc-theme-toggle')) {
            const btnTopbar = criarBotaoTema('cc-topbar__botao');
            const marca = topbar.querySelector('.cc-topbar__marca');
            if (marca) marca.after(btnTopbar);
            else topbar.appendChild(btnTopbar);
        }

        // Gaveta mobile
        const drawerHeader = document.querySelector('.cc-drawer__cabecalho');
        if (drawerHeader && !drawerHeader.querySelector('.cc-theme-toggle')) {
            const btnDrawer = criarBotaoTema('p-2 rounded-lg bg-surface-subtle text-on-surface-variant hover:text-on-surface transition-colors mr-1');
            const fechar = drawerHeader.querySelector('.cc-drawer__fechar');
            if (fechar) drawerHeader.insertBefore(btnDrawer, fechar);
            else drawerHeader.appendChild(btnDrawer);
        }
    }

    // Aplica o tema imediatamente para evitar FOUC
    const temaInicial = obterTemaAtual();
    if (temaInicial === 'escuro') {
        document.documentElement.classList.add('dark', 'theme-dark');
    }

    document.addEventListener('DOMContentLoaded', () => {
        aplicarTema(obterTemaAtual());
        injetarBotoesTema();

        // Re-injeta caso elementos sejam criados dinamicamente
        window.setTimeout(injetarBotoesTema, 200);
    });

    window.civilTheme = {
        get: obterTemaAtual,
        set: aplicarTema,
        toggle: alternarTema,
        criarBotao: criarBotaoTema
    };
})();
