/* ==========================================================================
   Civil Connection — Configuração dos testes de interface
   ==========================================================================
   Os testes rodam contra o site estático servido localmente e injetam o
   simulador `tests/fake-supabase.js` no lugar da biblioteca do Supabase.
   Nenhum projeto Supabase real é acessado e nenhum dado de produção é
   alterado.

   Variáveis de ambiente aceitas:
   - CC_BASE_URL     (padrão: http://127.0.0.1:8000)
   - CC_CHROMIUM     caminho do executável do Chromium, quando necessário
   ========================================================================== */

const { defineConfig, devices } = require('@playwright/test');

const executavel = process.env.CC_CHROMIUM || undefined;

module.exports = defineConfig({
    testDir: './',
    testMatch: '**/*.spec.js',
    timeout: 60000,
    expect: { timeout: 8000 },
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: [['list']],
    use: {
        baseURL: process.env.CC_BASE_URL || 'http://127.0.0.1:8000',
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
        trace: 'off',
        screenshot: 'only-on-failure',
        launchOptions: executavel ? { executablePath: executavel } : {}
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
        }
    ]
});
