/* ==========================================================================
   Testes — autenticação, sessão e proteção de rotas
   ========================================================================== */

const { test, expect } = require('@playwright/test');
const { prepararContexto, autenticar, limparEstado } = require('./apoio');

test.beforeEach(async ({ page }) => {
    await prepararContexto(page);
});

test('sem sessão, o painel redireciona para o login', async ({ page }) => {
    await limparEstado(page);
    await page.goto('/index.html');
    await expect(page).toHaveURL(/pages\/login\.html$/);
});

test('não existe login local: e-mail preenchido sem senha não autentica', async ({ page }) => {
    await limparEstado(page);
    await page.goto('/pages/login.html');
    await page.fill('#email-login', 'invasor@exemplo.com.br');
    await page.click('#auth-form button[type="submit"]');
    await expect(page).toHaveURL(/pages\/login\.html$/);
    const sessao = await page.evaluate(() => Object.keys(localStorage).filter((chave) => /civil_current_user|civil_db_/.test(chave)));
    expect(sessao).toHaveLength(0);
});

test('senha incorreta exibe mensagem em português e mantém o usuário no login', async ({ page }) => {
    await limparEstado(page);
    await page.goto('/pages/login.html');
    await page.fill('#email-login', 'ana.souza@exemplo.com.br');
    await page.fill('#senha-login', 'senha-errada');
    await page.click('#auth-form button[type="submit"]');
    const feedback = page.locator('#auth-feedback');
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText('E-mail ou senha incorretos.');
    await expect(page).toHaveURL(/pages\/login\.html$/);
});

test('login válido abre o painel e exibe o perfil autenticado', async ({ page }) => {
    await limparEstado(page);
    await page.goto('/pages/login.html');
    await page.fill('#email-login', 'ana.souza@exemplo.com.br');
    await page.fill('#senha-login', 'senha-correta');
    await page.click('#auth-form button[type="submit"]');
    await expect(page).toHaveURL(/index\.html$/);
    await expect(page.locator('#cc-drawer-nome')).toHaveText('Ana Souza');
    await expect(page.locator('.user-display-role').first()).toHaveText('Administrador');
});

test('logout encerra a sessão e devolve o usuário ao login', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await autenticar(page);
    await page.goto('/index.html');
    await page.click('#cc-botao-menu');
    await page.click('#cc-drawer-sair');
    await expect(page).toHaveURL(/pages\/login\.html$/);
    await page.goto('/index.html');
    await expect(page).toHaveURL(/pages\/login\.html$/);
});

test('chave privada configurada é recusada e o login fica bloqueado', async ({ page }) => {
    await page.unroute('**/js/supabase-config.js');
    await page.route('**/js/supabase-config.js', (rota) => rota.fulfill({
        contentType: 'application/javascript; charset=utf-8',
        body: "window.CIVIL_CONNECTION_CONFIG = { supabaseUrl: 'https://projeto-teste.supabase.co', supabaseAnonKey: 'sb_secret_chave_privada_de_teste' };"
    }));
    await page.goto('/pages/login.html');
    await expect(page.locator('#auth-feedback')).toContainText('service role');
    await expect(page.locator('#auth-form button[type="submit"]')).toBeDisabled();
    const status = await page.evaluate(() => window.dbService.isConfigured());
    expect(status).toBe(false);
});

test('cadastro público não oferece nem envia perfil de administrador', async ({ page }) => {
    await limparEstado(page);
    await page.goto('/pages/login.html');
    await page.click('#tab-register');
    await expect(page.locator('input[name="tipo_usuario"][value="administrador"]')).toHaveCount(0);
    await expect(page.locator('input[name="tipo_usuario"][value="cliente"]')).toBeChecked();
});

test('página de login alterna entre entrar e criar conta com ARIA correto', async ({ page }) => {
    await limparEstado(page);
    await page.goto('/pages/login.html');
    await page.click('#tab-register');
    await expect(page.locator('#tab-register')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#register-fields')).toBeVisible();
    await page.click('#tab-login');
    await expect(page.locator('#tab-login')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#register-fields')).toBeHidden();
});
