/* ============================================================
   Civil Conection — Lógica de Autenticação, Sessão e Perfil (CC-10)
   E Alternador de Tema Claro / Escuro
   ============================================================ */

(function initThemeEarly() {
    const theme = localStorage.getItem('civil_theme') || 'light';
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    }
})();

function injectDarkModeStyles() {
    if (document.getElementById('dark-theme-styles')) return;
    const style = document.createElement('style');
    style.id = 'dark-theme-styles';
    style.textContent = `
        html.dark {
            color-scheme: dark;
        }
        html.dark body,
        html.dark main {
            background-color: #121824 !important;
            color: #f6f4ef !important;
        }
        html.dark aside,
        html.dark header,
        html.dark .bg-surface-card,
        html.dark .bg-surface-canvas {
            background-color: #17243c !important;
            color: #f6f4ef !important;
            border-color: #213352 !important;
        }
        html.dark .bg-surface-subtle {
            background-color: #213352 !important;
            color: #ffffff !important;
        }
        html.dark input,
        html.dark select,
        html.dark textarea {
            background-color: #213352 !important;
            color: #ffffff !important;
            border-color: #314668 !important;
        }
        html.dark input::placeholder,
        html.dark textarea::placeholder {
            color: #a0aec0 !important;
        }
        html.dark .text-on-surface,
        html.dark .text-primary,
        html.dark .text-on-surface-variant {
            color: #e2e8f0 !important;
        }
        html.dark table thead tr,
        html.dark table tbody tr {
            border-color: #213352 !important;
        }
        html.dark table tbody tr:hover {
            background-color: #213352 !important;
        }
    `;
    document.head.appendChild(style);
}

function getThemePreference() {
    return localStorage.getItem('civil_theme') || 'light';
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('civil_theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('civil_theme', 'light');
    }
    updateThemeToggleButton(theme);
}

function toggleTheme() {
    const currentTheme = getThemePreference();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

function updateThemeToggleButton(theme) {
    const btn = document.getElementById('btn-toggle-theme');
    if (!btn) return;
    const icon = btn.querySelector('.material-symbols-outlined');
    const label = btn.querySelector('.theme-toggle-label');
    if (theme === 'dark') {
        if (icon) icon.textContent = 'light_mode';
        if (label) label.textContent = 'Modo Claro';
        btn.setAttribute('aria-label', 'Alternar para Tema Claro');
        btn.setAttribute('title', 'Alternar para Tema Claro');
    } else {
        if (icon) icon.textContent = 'dark_mode';
        if (label) label.textContent = 'Modo Escuro';
        btn.setAttribute('aria-label', 'Alternar para Tema Escuro');
        btn.setAttribute('title', 'Alternar para Tema Escuro');
    }
}

function injectThemeToggleButton() {
    injectDarkModeStyles();
    if (document.getElementById('btn-toggle-theme')) return;

    const headerContainer = document.querySelector('header .flex.items-center.gap-space-md') ||
                            document.querySelector('header .flex.items-center:last-child') ||
                            document.querySelector('header');
    if (headerContainer) {
        const btn = document.createElement('button');
        btn.id = 'btn-toggle-theme';
        btn.type = 'button';
        btn.onclick = toggleTheme;
        btn.className = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors cursor-pointer shadow-sm ml-2';
        btn.innerHTML = `<span class="material-symbols-outlined text-[18px]">dark_mode</span><span class="theme-toggle-label hidden sm:inline">Modo Escuro</span>`;
        headerContainer.appendChild(btn);
        updateThemeToggleButton(getThemePreference());
    }
}

let currentAuthMode = 'login'; // 'login' ou 'register'

function switchAuthTab(mode) {
    currentAuthMode = mode;
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const registerFields = document.getElementById('register-fields');
    const formTitle = document.getElementById('form-main-title');
    const submitBtnText = document.getElementById('submit-btn-text');
    const feedbackMsg = document.getElementById('auth-feedback');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const footerSwitch = document.getElementById('footer-switch');

    if (feedbackMsg) feedbackMsg.classList.add('hidden');

    if (mode === 'register') {
        tabLogin.className = 'flex-1 py-2 rounded-md font-label-md text-label-md transition-all duration-200 text-on-surface-variant hover:text-on-surface text-center';
        tabRegister.className = 'flex-1 py-2 rounded-md font-label-md text-label-md transition-all duration-200 bg-surface-card text-on-surface shadow-sm text-center';
        registerFields.classList.remove('hidden');
        registerFields.classList.add('flex');
        if (formTitle) formTitle.textContent = 'Criar sua Conta';
        if (submitBtnText) submitBtnText.textContent = 'Cadastrar-se';
        if (forgotPasswordLink) forgotPasswordLink.style.display = 'none';
        if (footerSwitch) footerSwitch.style.display = 'none';
    } else {
        tabRegister.className = 'flex-1 py-2 rounded-md font-label-md text-label-md transition-all duration-200 text-on-surface-variant hover:text-on-surface text-center';
        tabLogin.className = 'flex-1 py-2 rounded-md font-label-md text-label-md transition-all duration-200 bg-surface-card text-on-surface shadow-sm text-center';
        registerFields.classList.add('hidden');
        registerFields.classList.remove('flex');
        if (formTitle) formTitle.textContent = 'Entrar na Plataforma';
        if (submitBtnText) submitBtnText.textContent = 'Entrar no Sistema';
        if (forgotPasswordLink) forgotPasswordLink.style.display = '';
        if (footerSwitch) footerSwitch.style.display = '';
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
            const tipoUsuarioInput = document.querySelector('input[name="tipo_usuario"]:checked');
            const tipoUsuario = tipoUsuarioInput ? tipoUsuarioInput.value : 'cliente';

            if (!nome) {
                showAuthError('O nome completo é obrigatório.');
                if (submitBtn) submitBtn.disabled = false;
                return;
            }

            showAuthSuccess('Criando conta no sistema...');
            await dbService.registerUser({
                nome,
                email,
                password,
                tipo_usuario: tipoUsuario
            });

            showAuthSuccess('Conta criada com sucesso! Redirecionando...');
            setTimeout(async () => {
                const isPagesDir = window.location.pathname.includes('/pages/');
                const user = await dbService.getCurrentUser();
                if (user && (user.tipo_usuario === 'gestor' || user.tipo_usuario === 'administrador')) {
                    window.location.href = isPagesDir ? 'painel-gestor.html' : 'pages/painel-gestor.html';
                } else {
                    window.location.href = isPagesDir ? '../index.html' : 'index.html';
                }
            }, 1000);
        } else {
            showAuthSuccess('Autenticando...');
            await dbService.loginUser({ email, password });
            showAuthSuccess('Login realizado com sucesso! Redirecionando...');
            setTimeout(async () => {
                const isPagesDir = window.location.pathname.includes('/pages/');
                const user = await dbService.getCurrentUser();
                if (user && (user.tipo_usuario === 'gestor' || user.tipo_usuario === 'administrador')) {
                    window.location.href = isPagesDir ? 'painel-gestor.html' : 'pages/painel-gestor.html';
                } else {
                    window.location.href = isPagesDir ? '../index.html' : 'index.html';
                }
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
        feedbackMsg.classList.remove('hidden', 'bg-status-concluida/10', 'text-status-concluida');
        feedbackMsg.classList.add('bg-error-container', 'text-on-error-container');
    } else {
        alert(msg);
    }
}

function showAuthSuccess(msg) {
    const feedbackMsg = document.getElementById('auth-feedback');
    if (feedbackMsg) {
        feedbackMsg.textContent = msg;
        feedbackMsg.classList.remove('hidden', 'bg-error-container', 'text-on-error-container');
        feedbackMsg.classList.add('bg-status-concluida/10', 'text-status-concluida');
    }
}

// CC-10 — Foto de Perfil & Atualização de Cabeçalho
async function checkAuthAndHeader() {
    const currentUser = await dbService.getCurrentUser();
    const isLoginPage = window.location.pathname.endsWith('login.html');

    if (!currentUser && !isLoginPage) {
        window.location.href = window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
        return;
    }

    if (currentUser) {
        // Atualizar nome e cargo do usuário
        document.querySelectorAll('.user-display-name').forEach(el => {
            el.textContent = currentUser.nome || 'Usuário';
        });

        const roleMap = {
            'administrador': 'Gestor ETEC',
            'gestor': 'Gestor ETEC',
            'profissional': 'Profissional Técnico',
            'cliente': 'Cliente'
        };
        document.querySelectorAll('.user-display-role').forEach(el => {
            el.textContent = roleMap[currentUser.tipo_usuario] || 'Usuário';
        });

        // Atualizar foto do perfil
        updateAvatarDisplay(currentUser.foto_perfil_url, currentUser.nome);

        // Se o usuário for gestor/admin, adicionar link do Painel do Gestor no menu lateral se disponível
        if (currentUser.tipo_usuario === 'gestor' || currentUser.tipo_usuario === 'administrador') {
            const sidebarNav = document.querySelector('nav');
            if (sidebarNav && !sidebarNav.querySelector('[href*="painel-gestor.html"]')) {
                const gestorLink = document.createElement('a');
                const isPagesDir = window.location.pathname.includes('/pages/');
                gestorLink.className = 'flex items-center gap-space-sm px-space-md py-2.5 rounded-lg text-status-em-andamento bg-surface-subtle hover:bg-surface-container font-label-md text-label-md transition-colors font-bold mt-2';
                gestorLink.href = isPagesDir ? 'painel-gestor.html' : 'pages/painel-gestor.html';
                gestorLink.innerHTML = `<span class="material-symbols-outlined text-[20px]">admin_panel_settings</span><span>Painel do Gestor</span>`;
                sidebarNav.appendChild(gestorLink);
            }
        }
    }
}

function updateAvatarDisplay(fotoUrl, nome) {
    const avatarContainers = document.querySelectorAll('.user-avatar-container');
    avatarContainers.forEach(container => {
        if (fotoUrl) {
            container.innerHTML = `<img src="${fotoUrl}" alt="${nome || 'Foto de Perfil'}" class="w-full h-full object-cover rounded-full" />`;
        } else {
            const inicial = (nome || 'U').charAt(0).toUpperCase();
            container.innerHTML = `<span class="material-symbols-outlined text-on-primary text-[18px]">person</span>`;
        }
    });
}

// CC-10 — Modal para Adicionar/Editar Foto de Perfil
function abrirModalFotoPerfil() {
    let modal = document.getElementById('modal-foto-perfil');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-foto-perfil';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm hidden';
        modal.innerHTML = `
            <div class="bg-surface-card rounded-xl shadow-xl w-full max-w-md p-space-lg mx-4 flex flex-col gap-space-md">
                <div class="flex items-center justify-between">
                    <h3 class="font-headline-sm text-headline-sm text-on-surface">Foto de Perfil</h3>
                    <button type="button" onclick="fecharModalFotoPerfil()" class="p-1 rounded-lg hover:bg-surface-subtle text-on-surface-variant">
                        <span class="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
                <div class="flex flex-col items-center gap-space-md py-space-sm">
                    <div id="preview-avatar-box" class="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-on-primary font-display text-2xl overflow-hidden shadow-md">
                        <span class="material-symbols-outlined text-4xl">person</span>
                    </div>
                    <label class="cursor-pointer inline-flex items-center gap-2 px-space-md py-2 rounded-lg bg-surface-subtle hover:bg-surface-container font-label-md text-label-md text-on-surface transition-colors">
                        <span class="material-symbols-outlined text-[18px]">photo_camera</span>
                        <span>Escolher Imagem...</span>
                        <input type="file" id="input-foto-perfil" accept="image/jpeg,image/png,image/webp" class="hidden" onchange="previewFotoPerfilSelected(event)" />
                    </label>
                    <p class="font-caption text-caption text-on-surface-variant text-center">Formatos aceitos: JPEG, PNG e WebP (máx. 5MB)</p>
                    <div id="foto-feedback" class="hidden w-full p-2 text-center rounded font-label-sm text-label-sm"></div>
                </div>
                <div class="flex items-center justify-between pt-space-xs border-t border-border-subtle">
                    <button type="button" onclick="removerFotoPerfil()" class="px-space-md py-2 rounded-lg text-error hover:bg-error-container/20 font-label-md text-label-md transition-colors">Remover Foto</button>
                    <div class="flex items-center gap-space-sm">
                        <button type="button" onclick="fecharModalFotoPerfil()" class="px-space-md py-2 rounded-lg bg-surface-subtle font-label-md text-label-md text-on-surface">Cancelar</button>
                        <button type="button" onclick="salvarFotoPerfil()" id="btn-salvar-foto" class="px-space-md py-2 rounded-lg bg-status-em-andamento text-on-primary font-label-md text-label-md shadow-sm hover:bg-secondary transition-colors">Salvar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Carregar preview com foto atual
    dbService.getCurrentUser().then(user => {
        const previewBox = document.getElementById('preview-avatar-box');
        if (previewBox) {
            if (user && user.foto_perfil_url) {
                previewBox.innerHTML = `<img src="${user.foto_perfil_url}" class="w-full h-full object-cover" />`;
            } else {
                const inicial = (user?.nome || 'U').charAt(0).toUpperCase();
                previewBox.innerHTML = `<span class="material-symbols-outlined text-4xl">person</span>`;
            }
        }
        window.tempPerfilFotoData = null;
    });

    modal.classList.remove('hidden');
}

function fecharModalFotoPerfil() {
    const modal = document.getElementById('modal-foto-perfil');
    if (modal) modal.classList.add('hidden');
}

function previewFotoPerfilSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert('O arquivo selecionado é maior que 5MB. Por favor escolha uma imagem menor.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        window.tempPerfilFotoData = dataUrl;
        const previewBox = document.getElementById('preview-avatar-box');
        if (previewBox) {
            previewBox.innerHTML = `<img src="${dataUrl}" class="w-full h-full object-cover" />`;
        }
    };
    reader.readAsDataURL(file);
}

async function salvarFotoPerfil() {
    const btn = document.getElementById('btn-salvar-foto');
    try {
        if (btn) btn.disabled = true;
        if (window.tempPerfilFotoData) {
            const updated = await dbService.updateUserProfile({ foto_perfil_url: window.tempPerfilFotoData });
            updateAvatarDisplay(updated.foto_perfil_url, updated.nome);
        }
        fecharModalFotoPerfil();
    } catch (err) {
        console.error(err);
        alert('Erro ao salvar foto de perfil.');
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function removerFotoPerfil() {
    try {
        const updated = await dbService.updateUserProfile({ foto_perfil_url: '' });
        updateAvatarDisplay('', updated.nome);
        fecharModalFotoPerfil();
    } catch (err) {
        console.error(err);
        alert('Erro ao remover foto de perfil.');
    }
}

async function handleLogout() {
    await dbService.logoutUser();
    const loginPath = window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
    window.location.href = loginPath;
}

document.addEventListener('DOMContentLoaded', () => {
    injectThemeToggleButton();
    checkAuthAndHeader();

    // Listener para logout
    document.querySelectorAll('[data-action="logout"], [title="Encerrar Sessão"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    });

    // Listener para alterar foto de perfil
    document.querySelectorAll('.user-avatar-container, .user-display-name').forEach(el => {
        el.addEventListener('click', () => {
            abrirModalFotoPerfil();
        });
        el.classList.add('cursor-pointer');
    });
});
