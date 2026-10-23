/* ============================================================
   Civil Connection — Módulo Administrativo do Gestor (CC-GEST)
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    await checkGestorAccessGuard();
    carregarPainelGestor();
});

async function checkGestorAccessGuard() {
    const user = await dbService.getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    if (user.tipo_usuario !== 'gestor' && user.tipo_usuario !== 'administrador') {
        alert('Acesso negado: Este painel é exclusivo para o perfil Gestor ETEC.');
        window.location.href = '../index.html';
    }
}

async function carregarPainelGestor() {
    try {
        const usuarios = getLocalData('usuarios') || [];
        const obras = await dbService.getObras({ includeDeleted: true });
        const profissionais = await dbService.getProfissionais();

        // Totalizadores
        const totalUsers = usuarios.length;
        const totalClientes = usuarios.filter(u => u.tipo_usuario === 'cliente').length;
        const totalProfs = profissionais.length;
        const totalObras = obras.length;

        const elTotal = document.getElementById('gestor-total-usuarios');
        const elClientes = document.getElementById('gestor-total-clientes');
        const elProfs = document.getElementById('gestor-total-profissionais');
        const elObras = document.getElementById('gestor-total-obras');

        if (elTotal) elTotal.textContent = totalUsers;
        if (elClientes) elClientes.textContent = totalClientes;
        if (elProfs) elProfs.textContent = totalProfs;
        if (elObras) elObras.textContent = totalObras;

        renderTabelaUsuarios(usuarios);
        renderTabelaObras(obras);
    } catch (err) {
        console.error('Erro ao carregar dados do painel gestor:', err);
    }
}

function renderTabelaUsuarios(usuarios) {
    const tbody = document.getElementById('tabela-usuarios-gestor');
    if (!tbody) return;

    if (!usuarios || usuarios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-on-surface-variant">Nenhum usuário localizado.</td></tr>`;
        return;
    }

    const badgeClasses = {
        'cliente': 'bg-primary/10 text-primary',
        'profissional': 'bg-secondary/10 text-secondary',
        'administrador': 'bg-status-em-andamento/20 text-status-em-andamento font-bold',
        'gestor': 'bg-status-em-andamento/20 text-status-em-andamento font-bold'
    };

    const labelMap = {
        'cliente': 'Cliente',
        'profissional': 'Profissional Técnico',
        'administrador': 'Gestor ETEC',
        'gestor': 'Gestor ETEC'
    };

    tbody.innerHTML = usuarios.map(u => `
        <tr class="border-b border-border-subtle hover:bg-surface-subtle/50 transition-colors">
            <td class="py-3 px-4 font-semibold text-on-surface">${u.nome || 'Sem nome'}</td>
            <td class="py-3 px-4 text-on-surface-variant">${u.email || '-'}</td>
            <td class="py-3 px-4">
                <span class="inline-block px-2.5 py-1 rounded-full text-caption font-label-sm ${badgeClasses[u.tipo_usuario] || 'bg-surface-subtle'}">
                    ${labelMap[u.tipo_usuario] || u.tipo_usuario}
                </span>
            </td>
            <td class="py-3 px-4 text-on-surface-variant">${u.criado_em ? new Date(u.criado_em).toLocaleDateString('pt-BR') : '-'}</td>
        </tr>
    `).join('');
}

function renderTabelaObras(obras) {
    const tbody = document.getElementById('tabela-obras-gestor');
    if (!tbody) return;

    if (!obras || obras.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-on-surface-variant">Nenhuma obra cadastrada.</td></tr>`;
        return;
    }

    const statusMap = {
        'planejamento': 'Planejamento',
        'em_andamento': 'Em Andamento',
        'pausada': 'Pausada',
        'concluida': 'Concluída'
    };

    tbody.innerHTML = obras.map(o => `
        <tr class="border-b border-border-subtle hover:bg-surface-subtle/50 transition-colors">
            <td class="py-3 px-4 font-semibold text-on-surface">${o.nome}</td>
            <td class="py-3 px-4 text-on-surface-variant">${o.cidade}</td>
            <td class="py-3 px-4">${statusMap[o.status] || o.status}</td>
            <td class="py-3 px-4 font-bold text-status-em-andamento">${Number(o.progresso) || 0}%</td>
            <td class="py-3 px-4">
                <a href="obra-detalhes.html?obra_id=${o.id}" class="text-status-em-andamento font-semibold hover:underline">Detalhes</a>
            </td>
        </tr>
    `).join('');
}
