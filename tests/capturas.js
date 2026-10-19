/* ==========================================================================
   Civil Connection — Captura de telas nas resoluções de validação
   ==========================================================================
   Uso:
   CC_CHROMIUM=/caminho/do/chromium node tests/capturas.js

   Requer o site servido em http://127.0.0.1:8000 e as dependências do
   Playwright disponíveis. As imagens são gravadas em tests/artifacts/.
   ========================================================================== */

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const BASE = process.env.CC_BASE_URL || 'http://127.0.0.1:8000';
const CHAVE = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.assinatura-de-teste';
const SIMULADOR = path.join(__dirname, 'fake-supabase.js');
const SAIDA = path.join(__dirname, 'artifacts');

const RESOLUCOES = [
    [320, 568, '320x568'],
    [360, 800, '360x800'],
    [375, 812, '375x812'],
    [390, 844, '390x844'],
    [430, 932, '430x932'],
    [768, 1024, '768x1024'],
    [1024, 768, '1024x768'],
    [1440, 900, '1440x900']
];

const PAGINAS = [
    ['index.html', 'visao-geral'],
    ['pages/obras.html', 'obras'],
    ['pages/obra-detalhes.html?obra_id=33333333-3333-4333-8333-333333333301', 'obra-detalhes'],
    ['pages/agenda.html', 'agenda'],
    ['pages/profissionais.html', 'profissionais'],
    ['pages/relatorios.html', 'relatorios'],
    ['pages/cadastro-obra.html', 'cadastro-obra'],
    ['pages/cadastro-profissional.html', 'cadastro-profissional'],
    ['pages/login.html', 'login']
];

(async () => {
    fs.mkdirSync(SAIDA, { recursive: true });

    const navegador = await chromium.launch({
        executablePath: process.env.CC_CHROMIUM || undefined,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    const relatorio = [];
    let falhas = 0;

    for (const [largura, altura, nome] of RESOLUCOES) {
        const contexto = await navegador.newContext({ viewport: { width: largura, height: altura }, locale: 'pt-BR' });
        await contexto.route('**/js/supabase-config.js', (rota) => rota.fulfill({
            contentType: 'application/javascript; charset=utf-8',
            body: `window.CIVIL_CONNECTION_CONFIG = { supabaseUrl: 'https://projeto-teste.supabase.co', supabaseAnonKey: '${CHAVE}' };`
        }));
        await contexto.route('**/assets/vendor/supabase-js.min.js', (rota) => rota.fulfill({
            contentType: 'application/javascript; charset=utf-8',
            path: SIMULADOR
        }));
        await contexto.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (rota) => rota.abort());

        const pagina = await contexto.newPage();
        const erros = [];
        pagina.on('pageerror', (erro) => erros.push(erro.message));

        await pagina.goto(`${BASE}/pages/login.html`);
        await pagina.evaluate(() => {
            sessionStorage.setItem('cc_teste_sessao', 'ativa');
            sessionStorage.removeItem('cc_teste_banco');
        });

        for (const [caminho, apelido] of PAGINAS) {
            if (caminho.includes('login')) {
                await pagina.evaluate(() => sessionStorage.removeItem('cc_teste_sessao'));
            }
            await pagina.goto(`${BASE}/${caminho}`, { waitUntil: 'networkidle' });
            await pagina.waitForTimeout(350);

            const medidas = await pagina.evaluate(() => ({
                conteudo: document.documentElement.scrollWidth,
                visivel: window.innerWidth
            }));
            const transbordo = medidas.conteudo > medidas.visivel + 1;
            if (transbordo) falhas += 1;

            relatorio.push({
                resolucao: nome,
                pagina: apelido,
                larguraConteudo: medidas.conteudo,
                larguraVisivel: medidas.visivel,
                transbordoHorizontal: transbordo
            });

            await pagina.screenshot({
                path: path.join(SAIDA, `${nome}-${apelido}.png`),
                fullPage: true
            });
        }

        if (erros.length) {
            falhas += erros.length;
            relatorio.push({ resolucao: nome, erro: erros });
        }

        await contexto.close();
    }

    await navegador.close();

    fs.writeFileSync(path.join(SAIDA, 'relatorio-medicoes.json'), JSON.stringify(relatorio, null, 2));
    console.log(`Capturas geradas: ${relatorio.filter((item) => item.pagina).length}`);
    console.log(`Problemas encontrados: ${falhas}`);
    process.exit(falhas ? 1 : 0);
})();
