/* ==========================================================================
   Testes — fluxos de cada módulo com dados reais do simulador
   ========================================================================== */

const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { prepararContexto, autenticar, limparEstado } = require('./apoio');

const OBRA_AURORA = '33333333-3333-4333-8333-333333333301';

test.beforeEach(async ({ page }) => {
    await prepararContexto(page);
    await limparEstado(page);
    await autenticar(page);
});

test('dashboard exibe indicadores calculados a partir dos dados', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#dash-total-obras')).toHaveText('3');
    await expect(page.locator('#dash-total-profissionais')).toHaveText('3');
    await expect(page.locator('#dash-obras-andamento')).toHaveText('1');
    await expect(page.locator('#dash-obras-concluidas')).toHaveText('1');
    await expect(page.locator('#dash-progresso-medio')).toHaveText('48%');
    await expect(page.locator('#dash-obras-recentes')).toContainText('Residencial Aurora');
    await expect(page.locator('#dash-proximos-agendamentos')).toContainText('Vistoria da laje do 3º pavimento');
});

test('obras: lista, filtros e opções de cidade vindas do banco', async ({ page }) => {
    await page.goto('/pages/obras.html');
    await expect(page.locator('#total-obras-count')).toHaveText('3 obras');
    await expect(page.locator('#lista-obras article')).toHaveCount(3);
    await expect(page.locator('#filtro-cidade-obra option')).toHaveCount(4);

    await page.selectOption('#filtro-cidade-obra', 'Campinas');
    await page.waitForTimeout(500);
    await expect(page.locator('#lista-obras article')).toHaveCount(1);
    await expect(page.locator('#lista-obras')).toContainText('Residencial Aurora');

    await page.selectOption('#filtro-cidade-obra', '');
    await page.fill('#busca-obra', 'galpão');
    await page.waitForTimeout(600);
    await expect(page.locator('#lista-obras article')).toHaveCount(1);
});

test('obras: cadastro grava no banco e volta para a listagem', async ({ page }) => {
    await page.goto('/pages/cadastro-obra.html');
    await page.fill('#nome-obra', 'Edifício Ipê');
    await page.fill('#cidade-obra', 'Atibaia');
    await page.selectOption('#status-obra', 'em_andamento');
    await page.fill('#progresso-obra', '15');
    await page.click('#form-cadastro-obra button[type="submit"]');
    await expect(page).toHaveURL(/pages\/obras\.html$/);
    await expect(page.locator('#total-obras-count')).toHaveText('4 obras');
    await expect(page.locator('#lista-obras')).toContainText('Edifício Ipê');
});

test('obras: exclusão lógica pede confirmação e remove do painel', async ({ page }) => {
    await page.goto('/pages/obras.html');
    await page.locator('button[aria-label^="Excluir obra"]').first().click();
    const dialogo = page.locator('[role="alertdialog"]');
    await expect(dialogo).toBeVisible();
    await expect(dialogo).toContainText('Excluir obra');
    await page.click('button:has-text("Cancelar")');
    await expect(page.locator('#lista-obras article')).toHaveCount(3);

    await page.locator('button[aria-label^="Excluir obra"]').first().click();
    await page.click('[role="alertdialog"] button:has-text("Excluir obra")');
    await page.waitForTimeout(500);
    await expect(page.locator('#lista-obras article')).toHaveCount(2);
});

test('obra: edição de dados gerais', async ({ page }) => {
    await page.goto(`/pages/obra-detalhes.html?obra_id=${OBRA_AURORA}`);
    await page.click('button:has-text("Editar obra")');
    await page.fill('#edit-nome-obra', 'Residencial Aurora II');
    await page.fill('#edit-descricao-obra', 'Descrição atualizada no teste.');
    await page.click('#form-editar-obra button[type="submit"]');
    await expect(page.locator('#detalhes-obra-container')).toContainText('Residencial Aurora II');
    await expect(page.locator('#detalhes-obra-container')).toContainText('Descrição atualizada no teste.');
});

test('etapas: cadastro, mudança de status e de progresso', async ({ page }) => {
    await page.goto(`/pages/obra-detalhes.html?obra_id=${OBRA_AURORA}`);
    await page.click('button:has-text("Cadastrar etapa")');
    await page.click('#form-nova-etapa button[type="submit"]');
    await expect(page.locator('#etapa-feedback')).toContainText('Informe o nome da etapa.');

    await page.fill('#nome-etapa', 'Instalações elétricas');
    await page.fill('#progresso-etapa', '0');
    await page.click('#form-nova-etapa button[type="submit"]');
    await expect(page.locator('#lista-etapas-obra')).toContainText('Instalações elétricas');

    await page.locator('[id^="tab-btn"]').first().click();
    const card = page.locator('.cc-etapa', { hasText: 'Instalações elétricas' });
    await card.locator('select').selectOption('em_andamento');
    await page.waitForTimeout(600);
    await expect(page.locator('.cc-etapa', { hasText: 'Instalações elétricas' }).locator('select')).toHaveValue('em_andamento');
});

test('tarefas: cadastro e exclusão com confirmação', async ({ page }) => {
    await page.goto(`/pages/obra-detalhes.html?obra_id=${OBRA_AURORA}`);
    const cardEtapa = page.locator('.cc-etapa', { hasText: 'Estrutura' });
    await cardEtapa.locator('button:has-text("Atividade")').click();
    await page.fill('#nome-tarefa', 'Impermeabilização da laje');
    await page.click('#form-nova-tarefa button[type="submit"]');
    await expect(page.locator('#lista-etapas-obra')).toContainText('Impermeabilização da laje');

    await page.locator('.cc-tarefa', { hasText: 'Impermeabilização da laje' }).locator('button[aria-label^="Excluir atividade"]').click();
    await page.click('[role="alertdialog"] button:has-text("Excluir atividade")');
    await page.waitForTimeout(500);
    await expect(page.locator('#lista-etapas-obra')).not.toContainText('Impermeabilização da laje');
});

test('diário: registro salvo e exibido na aba', async ({ page }) => {
    await page.goto(`/pages/obra-detalhes.html?obra_id=${OBRA_AURORA}`);
    await page.click('#tab-btn-diario');
    await page.click('button:has-text("Novo registro diário")');
    await page.fill('#diario-resumo', 'Concretagem da laje concluída sem intercorrências.');
    await page.click('#form-novo-diario button[type="submit"]');
    await expect(page.locator('#lista-diario-obra')).toContainText('Concretagem da laje concluída sem intercorrências.');
});

test('documentos: envio real de arquivo para o Storage e vínculo na obra', async ({ page }) => {
    await page.goto(`/pages/obra-detalhes.html?obra_id=${OBRA_AURORA}`);
    await page.click('#tab-btn-diario');
    await page.click('button:has-text("Anexar arquivo")');
    await page.fill('#anexo-titulo', 'Foto da fachada');
    await page.setInputFiles('#anexo-arquivo', {
        name: 'fachada.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('conteudo-de-teste')
    });
    await page.click('#form-novo-anexo button[type="submit"]');
    await expect(page.locator('#lista-documentos-obra')).toContainText('Foto da fachada');

    const url = await page.evaluate(() => window.__CC_TESTE_BANCO().documentos_obra
        .filter((documento) => documento.titulo === 'Foto da fachada')
        .map((documento) => documento.url_arquivo)[0]);
    expect(url).toMatch(/^https:\/\/exemplo\.test\/storage\/.+fachada\.jpg$/);
});

test('documentos: falha do bucket é explicada e não grava registro', async ({ page }) => {
    await page.goto(`/pages/obra-detalhes.html?obra_id=${OBRA_AURORA}`);
    await page.click('#tab-btn-diario');
    await page.evaluate(() => { window.__CC_TESTE_FALHA_STORAGE = true; });
    await page.click('button:has-text("Anexar arquivo")');
    await page.fill('#anexo-titulo', 'Arquivo sem bucket');
    await page.setInputFiles('#anexo-arquivo', {
        name: 'planta.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('pdf-de-teste')
    });
    await page.click('#form-novo-anexo button[type="submit"]');
    await expect(page.locator('#anexo-feedback')).toContainText('bucket');
    const total = await page.evaluate(() => window.__CC_TESTE_BANCO().documentos_obra
        .filter((documento) => documento.titulo === 'Arquivo sem bucket').length);
    expect(total).toBe(0);
});

test('equipe: vínculo e desvínculo de profissional', async ({ page }) => {
    await page.goto(`/pages/obra-detalhes.html?obra_id=${OBRA_AURORA}`);
    await page.click('#tab-btn-equipe');
    await page.click('button:has-text("Vincular profissional")');
    await page.selectOption('#select-prof-equipe', '22222222-2222-4222-8222-222222222203');
    await page.fill('#funcao-prof-equipe', 'Arquiteta responsável');
    await page.click('#form-associar-profissional button[type="submit"]');
    await expect(page.locator('#lista-equipe-obra')).toContainText('Marina Alves');

    await page.locator('button[aria-label^="Remover Marina Alves"]').click();
    await page.click('[role="alertdialog"] button:has-text("Desvincular")');
    await page.waitForTimeout(500);
    await expect(page.locator('#lista-equipe-obra')).not.toContainText('Marina Alves');
});

test('histórico registra as alterações feitas na obra', async ({ page }) => {
    await page.goto(`/pages/obra-detalhes.html?obra_id=${OBRA_AURORA}`);
    await page.click('#tab-btn-historico');
    await expect(page.locator('#lista-historico-obra')).toContainText('cadastrada com sucesso');
});

test('agenda: criação, status e detecção de conflito', async ({ page }) => {
    await page.goto('/pages/agenda.html');
    await page.click('button:has-text("Novo compromisso")');
    await page.fill('#agendamento-titulo', 'Inspeção de teste');
    await page.selectOption('#agendamento-obra', OBRA_AURORA);
    await page.fill('#agendamento-inicio', '2026-12-01T09:00');
    await page.fill('#agendamento-fim', '2026-12-01T10:00');
    await page.click('#btn-salvar-agendamento');
    await expect(page.locator('#lista-agendamentos')).toContainText('Inspeção de teste');

    await page.locator('article', { hasText: 'Inspeção de teste' }).locator('button:has-text("Confirmar")').click();
    await page.waitForTimeout(500);
    await expect(page.locator('article', { hasText: 'Inspeção de teste' })).toContainText('Confirmado');

    // Cria um compromisso conflitante com a vistoria já existente do mesmo
    // responsável, usando o horário real retornado pelo banco.
    // O horário é formatado dentro do navegador para respeitar o fuso da
    // página, que é o mesmo usado pelos inputs datetime-local.
    const horarios = await page.evaluate(() => {
        const registro = window.__CC_TESTE_BANCO().agendamentos
            .find((agendamento) => agendamento.titulo === 'Vistoria da laje do 3º pavimento');
        const formatar = (data) => {
            const d = new Date(data);
            const p = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
        };
        const inicio = new Date(registro.inicio).getTime();
        return {
            inicio: formatar(inicio + 30 * 60000),
            fim: formatar(inicio + 90 * 60000)
        };
    });

    await page.click('button:has-text("Novo compromisso")');
    await page.fill('#agendamento-titulo', 'Conflito de agenda');
    await page.selectOption('#agendamento-obra', OBRA_AURORA);
    await page.selectOption('#agendamento-responsavel', '22222222-2222-4222-8222-222222222201');
    await page.fill('#agendamento-inicio', horarios.inicio);
    await page.fill('#agendamento-fim', horarios.fim);
    await page.click('#btn-salvar-agendamento');
    await expect(page.locator('#agendamento-feedback-msg')).toContainText('Conflito de agenda');
});

test('profissionais: filtros dinâmicos e edição de cadastro', async ({ page }) => {
    await page.goto('/pages/profissionais.html');
    await expect(page.locator('#lista-profissionais article')).toHaveCount(3);
    const especialidades = await page.locator('#filtro-especialidade option').allTextContents();
    expect(especialidades).toContain('Arquitetura e Interiores');
    expect(especialidades).toContain('Estruturas Metálicas e Materiais');
    expect(especialidades).not.toContain('Mestre de Obras / Pedreiro');

    await page.selectOption('#filtro-tipo-registro', 'fornecedor');
    await page.waitForTimeout(500);
    await expect(page.locator('#lista-profissionais article')).toHaveCount(1);
    await expect(page.locator('#lista-profissionais')).toContainText('Construtora Horizonte');

    await page.selectOption('#filtro-tipo-registro', '');
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Editar cadastro")').first().click();
    await page.fill('#edit-prof-contato', '(19) 97777-0000');
    await page.click('#form-editar-profissional button[type="submit"]');
    await page.waitForTimeout(500);
    await expect(page.locator('#lista-profissionais')).toContainText('(19) 97777-0000');
});

test('relatórios consolidam obras e exportam CSV', async ({ page }) => {
    await page.goto('/pages/relatorios.html');
    await expect(page.locator('#relatorio-obras-list article')).toHaveCount(3);
    await expect(page.locator('#relatorio-obras-list')).toContainText('Residencial Aurora');
    await expect(page.locator('#relatorio-auditoria-list')).toContainText('cadastrada com sucesso');

    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('button:has-text("Exportar CSV")')
    ]);
    expect(download.suggestedFilename()).toMatch(/^relatorio-obras-civil-connection-\d{4}-\d{2}-\d{2}\.csv$/);
    const caminho = await download.path();
    const conteudo = fs.readFileSync(caminho, 'utf8');
    expect(conteudo).toContain('Residencial Aurora');
    expect(conteudo).toContain('Progresso (%)');
});
