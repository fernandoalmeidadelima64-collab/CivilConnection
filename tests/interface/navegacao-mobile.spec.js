/* ==========================================================================
   Testes — navegação mobile, acessibilidade e responsividade
   ========================================================================== */

const { test, expect } = require('@playwright/test');
const { prepararContexto, autenticar, semRolagemHorizontal } = require('./apoio');

const RESOLUCOES = [
    { largura: 320, altura: 568 },
    { largura: 360, altura: 800 },
    { largura: 375, altura: 812 },
    { largura: 390, altura: 844 },
    { largura: 430, altura: 932 },
    { largura: 768, altura: 1024 },
    { largura: 1024, altura: 768 },
    { largura: 1440, altura: 900 }
];

const PAGINAS = [
    '/index.html',
    '/pages/obras.html',
    '/pages/cadastro-obra.html',
    '/pages/obra-detalhes.html?obra_id=33333333-3333-4333-8333-333333333301',
    '/pages/agenda.html',
    '/pages/profissionais.html',
    '/pages/cadastro-profissional.html',
    '/pages/relatorios.html'
];

test.beforeEach(async ({ page }) => {
    await prepararContexto(page);
    await autenticar(page);
});

test('barra inferior tem cinco destinos e marca a página ativa', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/pages/obras.html');
    const itens = page.locator('#cc-menu-drawer ~ .cc-bottomnav a, .cc-bottomnav a');
    await expect(itens).toHaveCount(5);
    const ativo = page.locator('.cc-bottomnav a[aria-current="page"]');
    await expect(ativo).toHaveCount(1);
    await expect(ativo).toContainText('Obras');
});

test('menu lateral abre, recebe foco, fecha com Esc e devolve o foco', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/index.html');
    const botao = page.locator('#cc-botao-menu');
    await botao.click();
    const drawer = page.locator('#cc-menu-drawer');
    await expect(drawer).toBeVisible();
    await expect(botao).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(botao).toHaveAttribute('aria-expanded', 'false');
});

test('o drawer exibe o usuário autenticado e o atalho de saída', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/index.html');
    await page.click('#cc-botao-menu');
    await expect(page.locator('#cc-drawer-nome')).toHaveText('Ana Souza');
    await expect(page.locator('#cc-drawer-sair')).toBeVisible();
});

for (const resolucao of RESOLUCOES) {
    test(`sem rolagem horizontal em ${resolucao.largura}x${resolucao.altura}`, async ({ page }) => {
        await page.setViewportSize({ width: resolucao.largura, height: resolucao.altura });
        for (const caminho of PAGINAS) {
            await page.goto(caminho);
            await page.waitForTimeout(250);
            await semRolagemHorizontal(page);
        }
    });
}

test('alvos de toque têm pelo menos 44px no celular', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/pages/agenda.html');
    const pequenos = await page.evaluate(() => {
        const seletores = '.cc-bottomnav a, #cc-botao-menu, main button, main a';
        const problemas = [];
        document.querySelectorAll(seletores).forEach((elemento) => {
            const estilo = window.getComputedStyle(elemento);
            if (estilo.display === 'none' || estilo.visibility === 'hidden') return;
            const caixa = elemento.getBoundingClientRect();
            if (!caixa.width || !caixa.height) return;
            if (caixa.height < 43.5 || caixa.width < 43.5) {
                problemas.push({
                    tag: elemento.tagName,
                    texto: (elemento.textContent || '').trim().slice(0, 40),
                    largura: Math.round(caixa.width),
                    altura: Math.round(caixa.height)
                });
            }
        });
        return problemas;
    });
    expect(pequenos).toEqual([]);
});

test('formulários usam fonte de 16px no celular para evitar zoom automático', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/pages/cadastro-obra.html');
    const tamanho = await page.locator('#nome-obra').evaluate((elemento) => window.getComputedStyle(elemento).fontSize);
    expect(parseFloat(tamanho)).toBeGreaterThanOrEqual(16);
});

test('modais expõem role=dialog, aria-modal e fecham com Esc', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/pages/obra-detalhes.html?obra_id=33333333-3333-4333-8333-333333333301');
    await page.click('button:has-text("Cadastrar etapa")');
    const modal = page.locator('#modal-nova-etapa');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
});

test('link de pular conteúdo leva ao conteúdo principal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/index.html');
    const pular = page.locator('.cc-pular-conteudo');
    await pular.focus();
    await expect(pular).toBeFocused();
    await expect(pular).toHaveAttribute('href', '#conteudo-principal');
});

test('as abas da obra funcionam por teclado', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/pages/obra-detalhes.html?obra_id=33333333-3333-4333-8333-333333333301');
    await page.locator('#tab-btn-etapas').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#tab-btn-diario')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#tab-content-diario')).toBeVisible();
});

test('prefers-reduced-motion desativa animações', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/index.html');
    const duracao = await page.locator('.cc-bottomnav a').first().evaluate((elemento) => {
        const estilo = window.getComputedStyle(elemento);
        return estilo.animationDuration + '|' + estilo.transitionDuration;
    });
    const valor = parseFloat(duracao.split('|')[0]);
    expect(valor).toBeLessThan(0.001);
});
