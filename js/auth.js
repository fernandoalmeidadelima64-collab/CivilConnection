/* ============================================================
   Civil Conection — Lógica de Autenticação e Gestão de Sessão
   ============================================================ */

let currentAuthMode = 'login'; // 'login' ou 'register'

function switchAuthTab(mode) {
    currentAuthMode = mode;
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const registerFields = document.getElementById('register-fields');
    const formTitle = document.getElementById('form-main-title');
    const submitBtnText = document.getElementById('submit-btn-text');
    const feedbackMsg = document.getElementById('auth-feedback');

    if (feedbackMsg) feedbackMsg.classList.add('hidden');

    if (mode === 'register') {
        tabLogin.className = 'flex-1 py-2 rounded-md font-label-md text-label-md transition-all duration-200 text-on-surface-variant hover:text-on-surface text-center';
        tabRegister.className = 'flex-1 py-2 rounded-md font-label-md text-label-md transition-all duration-200 bg-surface-card text-on-surface shadow-sm text-center';
        registerFields.classList.remove('hidden');
        registerFields.classList.add('flex');
        if (formTitle) formTitle.textContent = 'Criar sua Conta';
        if (submitBtnText) submitBtnText.textContent = 'Cadastrar-se';
    } else {
        tabRegister.className = 'flex-1 py-2 rounded-md font-label-md text-label-md transition-all duration-200 text-on-surface-variant hover:text-on-surface text-center';
        tabLogin.className = 'flex-1 py-2 rounded-md font-label-md text-label-md transition-all duration-200 bg-surface-card text-on-surface shadow-sm text-center';
        registerFields.classList.add('hidden');
        registerFields.classList.remove('flex');
        if (formTitle) formTitle.textContent = 'Entrar na Plataforma';
        if (submitBtnText) submitBtnText.textContent = 'Entrar no Sistema';
    }
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    const feedbackMsg = document.getElementById('auth-feedback');
    const submitBtn = document.getElementById('auth-submit-btn');

    const email = document.getElementById('email-login').value.trim();
    const password = document.getElementById('senha-login').value;

    if (feedbackMsg) {
        feedbackMsg.classList.add('hidden');
        feedbackMsg.className = 'p-3 rounded-lg text-body-sm font-label-sm text-center mt-2';
    }

    // Validações
    if (!email || !email.includes('@')) {
        showAuthError('Por favor, informe um e-mail válido.');
        return;
    }
    if (!password || password.length < 4) {
        showAuthError('A senha deve conter no mínimo 4 caracteres.');
        return;
    }

    try {
        if (submitBtn) submitBtn.disabled = true;

        if (currentAuthMode === 'register') {
            const nome = document.getElementById('nome-completo').value.trim();
            const tipoUsuario = document.getElementById('tipo-usuario') ? document.getElementById('tipo-usuario').value : 'cliente';

            if (!nome) {
                showAuthError('O nome completo é obrigatório.');
                if (submitBtn) submitBtn.disabled = false;
                return;
            }

            showAuthSuccess('Criando conta...');
            await dbService.registerUser({
                nome,
                email,
                password,
                tipo_usuario: tipoUsuario
            });

            showAuthSuccess('Conta criada com sucesso! Redirecionando...');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1000);
        } else {
            showAuthSuccess('Autenticando...');
            await dbService.loginUser({ email, password });
            showAuthSuccess('Login realizado com sucesso! Redirecionando...');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1000);
        }
    } catch (err) {
        showAuthError(err.message || 'Falha ao autenticar. Verifique suas credenciais.');
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

function showAuthError(msg) {
    const feedbackMsg = document.getElementById('auth-feedback');
    if (feedbackMsg) {
        feedbackMsg.textContent = msg;
        feedbackMsg.classList.remove('hidden');
        feedbackMsg.classList.add('bg-error-container', 'text-on-error-container');
    } else {
        alert(msg);
    }
}

function showAuthSuccess(msg) {
    const feedbackMsg = document.getElementById('auth-feedback');
    if (feedbackMsg) {
        feedbackMsg.textContent = msg;
        feedbackMsg.classList.remove('hidden');
        feedbackMsg.classList.add('bg-status-concluida/10', 'text-status-concluida');
    }
}

// Proteger rotas nas páginas privadas
async function checkAuthAndHeader() {
    const currentUser = await dbService.getCurrentUser();
    const isLoginPage = window.location.pathname.endsWith('login.html');

    if (!currentUser && !isLoginPage) {
        window.location.href = window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
        return;
    }

    if (currentUser) {
        // Atualizar nome do usuário no menu lateral e cabeçalho se existir
        const userNameElements = document.querySelectorAll('.user-display-name');
        userNameElements.forEach(el => {
            el.textContent = currentUser.nome;
        });

        const userRoleElements = document.querySelectorAll('.user-display-role');
        userRoleElements.forEach(el => {
            const roleMap = {
                'administrador': 'Administrador',
                'profissional': 'Profissional Técnico',
                'cliente': 'Cliente'
            };
            el.textContent = roleMap[currentUser.tipo_usuario] || 'Usuário';
        });
    }
}

async function handleLogout() {
    await dbService.logoutUser();
    const loginPath = window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
    window.location.href = loginPath;
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndHeader();

    // Adicionar listener de logout a botões com data-action="logout"
    document.querySelectorAll('[data-action="logout"], [title="Encerrar Sessão"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    });
});
