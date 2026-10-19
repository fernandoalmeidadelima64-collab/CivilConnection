/* ==========================================================================
   Testes — integridade dos dados e diferenciação de estados
   ==========================================================================
   Verificam que o site não inventa dados: base vazia produz estado vazio,
   falha de backend produz erro explícito, e nada é gravado apenas no
   navegador.
   ========================================================================== */

const { test, expect } = require('@playwright/test');
const { prepararContexto, autenticar, limparEstado } = require('./apoio');

test.beforeEach(async ({ page }) => {
    await prepararContexto(page);
    await limparEstado(page);
    await autenticar(page);
});

test('base vazia mostra estado vazio, nunca números ou cards fictícios', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => {
        const banco = window.__CC_TESTE_BANCO();
        banco.obras = [];
        banco.profissionais = [];
        banco.agendamentos = [];
        banco.historico_obra = [];
        sessionStorage.setItem('cc_teste_banco', JSON.stringify(banco));
    });

    await page.goto('/pages/obras.html');
    await expect(page.locator('#total-obras-count')).toHaveText('0 obras');
    await expect(page.locator('#lista-obras')).toContainText('Nenhuma obra cadastrada');
    await expect(page.locator('#lista-obras article')).toHaveCount(0);

    await page.goto('/pages/profissionais.html');
    await expect(page.locator('#lista-profissionais')).toContainText('Nenhum profissional cadastrado');

    await page.goto('/index.html');
    await expect(page.locator('#dash-total-obras')).toHaveText('0');
    await expect(page.locator('#dash-obras-recentes')).toContainText('Nenhuma obra cadastrada');
});

test('falha do backend aparece como erro e não como lista vazia', async ({ page }) => {
    await page.goto('/pages/obras.html');
    await page.evaluate(() => { window.__CC_TESTE_FALHAS = { obras: true }; });
    await page.evaluate(() => window.carregarObras());
    const estado = page.locator('#lista-obras .cc-estado--erro');
    await expect(estado).toBeVisible();
    await expect(estado).toContainText('Não foi possível carregar as obras');
    await expect(page.locator('#total-obras-count')).toHaveText('Indisponível');
});

test('nenhum dado de negócio é gravado no localStorage', async ({ page }) => {
    await page.goto('/pages/obras.html');
    await page.fill('#busca-obra', 'Aurora');
    await page.waitForTimeout(600);
    const chaves = await page.evaluate(() => Object.keys(localStorage));
    const suspeitas = chaves.filter((chave) => /^civil_db_|^civil_current_user$|^civil_obras|^civil_profissionais/.test(chave));
    expect(suspeitas).toEqual([]);
});

test('configuração ausente bloqueia o painel e explica a pendência', async ({ page }) => {
    await page.unroute('**/js/supabase-config.js');
    await page.route('**/js/supabase-config.js', (rota) => rota.fulfill({
        contentType: 'application/javascript; charset=utf-8',
        body: 'window.CIVIL_CONNECTION_CONFIG = { supabaseUrl: "", supabaseAnonKey: "" };'
    }));
    await page.goto('/pages/login.html');
    await page.evaluate(() => sessionStorage.setItem('cc_teste_sessao', 'ativa'));

    // Sem configuração não há autenticação: o painel sempre volta ao login,
    // onde a pendência é explicada. Nenhum indicador é exibido.
    await page.goto('/pages/obras.html');
    await expect(page).toHaveURL(/pages\/login\.html$/);
    await expect(page.locator('#auth-feedback')).toContainText('não foi configurada');
    const indicadores = await page.evaluate(() => document.querySelectorAll('#dash-total-obras').length);
    expect(indicadores).toBe(0);
});

test('as operações de escrita exigem sessão autenticada', async ({ page }) => {
    await page.goto('/pages/login.html');
    await page.evaluate(() => {
        sessionStorage.removeItem('cc_teste_sessao');
        sessionStorage.removeItem('cc_teste_banco');
    });
    // Recarrega para descartar o usuário em cache no documento anterior.
    await page.goto('/pages/login.html');
    const resultado = await page.evaluate(async () => {
        try {
            await window.dbService.saveObra({ nome: 'Sem sessão', cidade: 'Nada' });
            return 'gravou';
        } catch (erro) {
            return erro.message;
        }
    });
    expect(resultado).not.toBe('gravou');
});
