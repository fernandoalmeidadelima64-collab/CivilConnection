/* ==========================================================================
   Civil Connection — Apoio dos testes de interface
   ==========================================================================
   Injeta a configuração pública de teste e o simulador do Supabase em todas
   as requisições, garantindo que nenhuma chamada saia para a internet.
   ========================================================================== */

const path = require('path');
const { expect } = require('@playwright/test');

const CHAVE_ANON_TESTE = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.assinatura-de-teste';
const CAMINHO_SIMULADOR = path.join(__dirname, '..', 'fake-supabase.js');

async function prepararContexto(page) {
    await page.route('**/js/supabase-config.js', (rota) => rota.fulfill({
        contentType: 'application/javascript; charset=utf-8',
        body: `window.CIVIL_CONNECTION_CONFIG = { supabaseUrl: 'https://projeto-teste.supabase.co', supabaseAnonKey: '${CHAVE_ANON_TESTE}' };`
    }));

    await page.route('**/assets/vendor/supabase-js.min.js', (rota) => rota.fulfill({
        contentType: 'application/javascript; charset=utf-8',
        path: CAMINHO_SIMULADOR
    }));

    // Evita qualquer requisição externa acidental durante os testes.
    await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (rota) => {
        if (rota.request().resourceType() === 'image') return rota.abort();
        return rota.abort();
    });
}

async function autenticar(page) {
    await page.goto('/pages/login.html');
    await page.evaluate(() => {
        sessionStorage.setItem('cc_teste_sessao', 'ativa');
        sessionStorage.removeItem('cc_teste_banco');
    });
}

async function limparEstado(page) {
    await page.goto('/pages/login.html');
    await page.evaluate(() => {
        if (window.__CC_TESTE_LIMPAR) window.__CC_TESTE_LIMPAR();
        sessionStorage.clear();
        localStorage.clear();
    });
}

async function semRolagemHorizontal(page) {
    const medidas = await page.evaluate(() => ({
        larguraConteudo: document.documentElement.scrollWidth,
        larguraVisivel: window.innerWidth
    }));
    expect(medidas.larguraConteudo, 'a página não deve rolar na horizontal').toBeLessThanOrEqual(medidas.larguraVisivel + 1);
}

module.exports = { prepararContexto, autenticar, limparEstado, semRolagemHorizontal, CHAVE_ANON_TESTE };
