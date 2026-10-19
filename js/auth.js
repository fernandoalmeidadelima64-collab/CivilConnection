/* ==========================================================================
   Civil Connection — Autenticação, sessão e perfil
   ==========================================================================
   A autenticação usa exclusivamente Supabase Auth. Não há login local nem
   criação automática de usuário a partir de um e-mail digitado. Erros de
   configuração, rede e credenciais são exibidos em português.
   ========================================================================== */

let currentAuthMode = 'login';

function caminhoLogin() {
    return window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
}

function caminhoInicial() {
    return window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
}

function ehPaginaLogin() {
    return window.location.pathname.endsWith('login.html');
}

function definirFeedbackAuth(mensagem, tipo) {
    const feedback = document.getElementById('auth-feedback');
    if (!feedback) {
        window.ccUI.mostrarAviso(mensagem, tipo === 'sucesso' ? 'sucesso' : 'erro');
        return;
    }
    feedback.textContent = mensagem;
    feedback.classList.remove('hidden', 'bg-status-concluida/10', 'text-status-concluida', 'bg-error-container', 'text-on-error-container');
    feedback.classList.add(
        tipo === 'sucesso' ? 'bg-status-concluida/10' : 'bg-error-container',
        tipo === 'sucesso' ? 'text-status-concluida' : 'text-on-error-container'
    );
    feedback.setAttribute('role', tipo === 'sucesso' ? 'status' : 'alert');
    feedback.setAttribute('aria-live', 'polite');
}

function showAuthError(mensagem) {
    definirFeedbackAuth(mensagem, 'erro');
}

function showAuthSuccess(mensagem) {
    definirFeedbackAuth(mensagem, 'sucesso');
}

function switchAuthTab(mode) {
    currentAuthMode = mode === 'register' ? 'register' : 'login';
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const registerFields = document.getElementById('register-fields');
    const formTitle = document.getElementById('form-main-title');
    const submitBtnText = document.getElementById('submit-btn-text');
    const feedbackMsg = document.getElementById('auth-feedback');

    if (feedbackMsg) {
        feedbackMsg.classList.add('hidden');
        feedbackMsg.textContent = '';
    }

    const classeInativa = 'flex-1 py-2 rounded-md font-label-md text-label-md transition-all duration-200 text-on-surface-variant hover:text-on-surface text-center';
    const classeAtiva = 'flex-1 py-2 rounded-md font-label-md text-label-md transition-all duration-200 bg-surface-card text-on-surface shadow-sm text-center';

    if (currentAuthMode === 'register') {
        if (tabLogin) tabLogin.className = classeInativa;
        if (tabRegister) tabRegister.className = classeAtiva;
        if (tabLogin) {
            tabLogin.setAttribute('aria-selected', 'false');
            tabLogin.setAttribute('tabindex', '-1');
        }
        if (tabRegister) {
            tabRegister.setAttribute('aria-selected', 'true');
            tabRegister.setAttribute('tabindex', '0');
        }
        if (registerFields) {
            registerFields.classList.remove('hidden');
            registerFields.classList.add('flex');
        }
        if (formTitle) formTitle.textContent = 'Criar sua conta';
        if (submitBtnText) submitBtnText.textContent = 'Cadastrar-se';
    } else {
        if (tabRegister) tabRegister.className = classeInativa;
        if (tabLogin) tabLogin.className = classeAtiva;
        if (tabRegister) {
            tabRegister.setAttribute('aria-selected', 'false');
            tabRegister.setAttribute('tabindex', '-1');
        }
        if (tabLogin) {
            tabLogin.setAttribute('aria-selected', 'true');
            tabLogin.setAttribute('tabindex', '0');
        }
        if (registerFields) {
            registerFields.classList.add('hidden');
            registerFields.classList.remove('flex');
        }
        if (formTitle) formTitle.textContent = 'Entrar na plataforma';
        if (submitBtnText) submitBtnText.textContent = 'Entrar no sistema';
    }
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    const submitBtn = document.getElementById('auth-submit-btn');

    if (!window.dbService || !window.dbService.isConfigured()) {
        const erro = window.dbService ? window.dbService.getConfigError() : null;
        showAuthError(erro || 'A conexão com o Supabase não está configurada. Consulte js/supabase-config.js.');
        return;
    }

    const email = (document.getElementById('email-login')?.value || '').trim();
    const password = document.getElementById('senha-login')?.value || '';

    if (!email || !email.includes('@')) {
        showAuthError('Por favor, informe um e-mail válido.');
        return;
    }
    if (!password || password.length < 4) {
        showAuthError('A senha deve conter no mínimo 4 caracteres.');
        return;
    }

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.setAttribute('aria-busy', 'true');
        }

        if (currentAuthMode === 'register') {
            const nome = (document.getElementById('nome-completo')?.value || '').trim();
            const tipoUsuarioInput = document.querySelector('input[name="tipo_usuario"]:checked');
            const tipoUsuario = tipoUsuarioInput ? tipoUsuarioInput.value : 'cliente';

            if (!nome) {
                showAuthError('O nome completo é obrigatório.');
                return;
            }

            showAuthSuccess('Criando sua conta...');
            const resultado = await window.dbService.registerUser({
                nome,
                email,
                password,
                tipo_usuario: tipoUsuario
            });

            if (resultado && resultado.session) {
                showAuthSuccess('Conta criada com sucesso! Redirecionando...');
                window.setTimeout(() => {
                    window.location.href = caminhoInicial();
                }, 900);
            } else {
                showAuthSuccess('Conta criada! Confirme seu e-mail antes de entrar.');
                switchAuthTab('login');
                const senha = document.getElementById('senha-login');
                if (senha) senha.value = '';
            }
        } else {
            showAuthSuccess('Autenticando...');
            await window.dbService.loginUser({ email, password });
            showAuthSuccess('Login realizado com sucesso! Redirecionando...');
            window.setTimeout(() => {
                window.location.href = caminhoInicial();
            }, 700);
        }
    } catch (erro) {
        console.error('Falha na autenticação:', erro);
        showAuthError(window.ccUI.mensagemErroDados(erro));
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.removeAttribute('aria-busy');
        }
    }
}

async function handlePasswordReset(event) {
    if (event) event.preventDefault();
    const email = (document.getElementById('email-login')?.value || '').trim();
    if (!email || !email.includes('@')) {
        showAuthError('Informe seu e-mail no campo de acesso para receber o link de recuperação.');
        const campo = document.getElementById('email-login');
        if (campo) campo.focus();
        return;
    }
    try {
        await window.dbService.resetPassword(email);
        showAuthSuccess('Enviamos um link de recuperação de senha para o seu e-mail. Verifique também a caixa de spam.');
    } catch (erro) {
        console.error('Falha ao solicitar recuperação de senha:', erro);
        showAuthError(window.ccUI.mensagemErroDados(erro));
    }
}

function exibirErroDeSessao(mensagem) {
    const main = document.querySelector('main');
    if (!main) return;
    let alerta = document.getElementById('cc-erro-sessao');
    if (!alerta) {
        alerta = document.createElement('div');
        alerta.id = 'cc-erro-sessao';
        alerta.className = 'cc-alerta-pagina';
        alerta.setAttribute('role', 'alert');
        main.prepend(alerta);
    }
    alerta.replaceChildren();
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = 'warning';
    const texto = document.createElement('div');
    const titulo = document.createElement('strong');
    titulo.textContent = 'Não foi possível verificar sua sessão';
    const descricao = document.createElement('span');
    descricao.textContent = mensagem + ' ';
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'cc-btn cc-btn--secundario';
    botao.style.marginTop = '8px';
    botao.textContent = 'Tentar novamente';
    botao.addEventListener('click', () => window.location.reload());
    texto.appendChild(titulo);
    texto.appendChild(descricao);
    texto.appendChild(botao);
    alerta.appendChild(icon);
    alerta.appendChild(texto);
}

async function exibirErroConfiguracaoLogin(mensagem) {
    const feedback = document.getElementById('auth-feedback');
    if (!feedback) return;
    feedback.textContent = mensagem || 'A conexão com o Supabase ainda não foi configurada.';
    feedback.className = 'p-3 rounded-lg bg-error-container text-on-error-container font-label-sm text-label-sm text-center mb-2';
    feedback.setAttribute('role', 'alert');
    feedback.classList.remove('hidden');

    const botao = document.querySelector('#auth-form button[type="submit"]');
    if (botao) {
        botao.disabled = true;
        botao.setAttribute('aria-disabled', 'true');
        botao.title = 'Configure a URL e a chave anon do Supabase para entrar.';
    }
}

async function checkAuthAndHeader() {
    const login = ehPaginaLogin();
    const info = window.dbService ? window.dbService.getConfigInfo() : { configurado: false };

    if (!info.configurado) {
        // Sem configuração não há autenticação possível. Nunca criamos uma
        // sessão local: o usuário é levado ao login, onde a pendência de
        // configuração é explicada.
        if (!login) {
            window.location.replace(caminhoLogin());
        } else {
            exibirErroConfiguracaoLogin(info.erro);
        }
        return;
    }

    let usuario;
    try {
        usuario = await window.dbService.getCurrentUser();
    } catch (erro) {
        console.error('Falha ao verificar a sessão:', erro);
        exibirErroDeSessao(window.ccUI.mensagemErroDados(erro));
        return;
    }

    if (!usuario) {
        if (!login) {
            window.location.replace(caminhoLogin());
        }
        return;
    }

    if (login) {
        window.location.replace(caminhoInicial());
        return;
    }

    document.querySelectorAll('.user-display-name').forEach((el) => {
        el.textContent = usuario.nome || 'Usuário';
    });

    const roleMap = {
        administrador: 'Administrador',
        profissional: 'Profissional técnico',
        cliente: 'Cliente'
    };
    document.querySelectorAll('.user-display-role').forEach((el) => {
        el.textContent = roleMap[usuario.tipo_usuario] || 'Usuário';
    });

    updateAvatarDisplay(usuario.foto_perfil_url, usuario.nome);

    try {
        window.dispatchEvent(new CustomEvent('civil:usuario', { detail: usuario }));
    } catch (erro) {
        // Evento opcional.
    }
}

function atualizarAvatarDoContainer(container, fotoUrl, nome) {
    if (!container) return;
    container.replaceChildren();
    const nomeFinal = nome || 'Usuário';
    const urlValida = fotoUrl && /^(https?:\/\/|data:image\/)/i.test(String(fotoUrl));

    if (urlValida) {
        const img = document.createElement('img');
        img.src = fotoUrl;
        img.alt = `Foto de perfil de ${nomeFinal}`;
        img.className = 'w-full h-full object-cover rounded-full';
        img.addEventListener('error', () => {
            container.replaceChildren();
            const fallback = document.createElement('span');
            fallback.className = 'material-symbols-outlined text-on-primary text-[18px]';
            fallback.setAttribute('aria-hidden', 'true');
            fallback.textContent = 'person';
            container.appendChild(fallback);
            container.setAttribute('title', 'Foto indisponível');
        });
        container.appendChild(img);
    } else {
        const inicial = document.createElement('span');
        inicial.className = 'font-label-md text-label-md text-on-primary font-bold';
        inicial.setAttribute('aria-hidden', 'true');
        inicial.textContent = (nomeFinal.charAt(0) || 'U').toUpperCase();
        container.appendChild(inicial);
    }
    container.setAttribute('title', 'Alterar foto de perfil');
}

function updateAvatarDisplay(fotoUrl, nome) {
    document.querySelectorAll('.user-avatar-container').forEach((container) => {
        atualizarAvatarDoContainer(container, fotoUrl, nome);
    });
}

function abrirModalFotoPerfil() {
    if (!window.dbService || !window.dbService.isConfigured()) {
        window.ccUI.mostrarAviso('A conexão com o Supabase não está configurada.', 'aviso');
        return;
    }

    let modal = document.getElementById('modal-foto-perfil');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-foto-perfil';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm hidden';
        modal.innerHTML = `
            <div class="bg-surface-card rounded-xl shadow-xl w-full max-w-md p-space-lg mx-4 flex flex-col gap-space-md">
                <div class="flex items-center justify-between gap-2">
                    <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold">Foto de perfil</h3>
                    <button type="button" data-cc-fechar-foto class="p-2 rounded-lg hover:bg-surface-subtle text-on-surface-variant" aria-label="Fechar">
                        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
                    </button>
                </div>
                <div class="flex flex-col items-center gap-space-md py-space-sm">
                    <div id="preview-avatar-box" class="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-on-primary font-display text-2xl overflow-hidden shadow-md">
                        <span class="material-symbols-outlined text-4xl" aria-hidden="true">person</span>
                    </div>
                    <label class="cursor-pointer inline-flex items-center gap-2 px-space-md py-2 rounded-lg bg-surface-subtle hover:bg-surface-container font-label-md text-label-md text-on-surface transition-colors">
                        <span class="material-symbols-outlined text-[18px]" aria-hidden="true">photo_camera</span>
                        <span>Escolher imagem</span>
                        <input type="file" id="input-foto-perfil" accept="image/jpeg,image/png,image/webp" class="hidden" />
                    </label>
                    <p class="font-caption text-caption text-on-surface-variant text-center">Formatos aceitos: JPEG, PNG e WebP (máximo de 5 MB).</p>
                    <p id="foto-feedback" class="hidden w-full p-2 text-center rounded font-label-sm text-label-sm" role="status" aria-live="polite"></p>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs border-t border-border-subtle">
                    <button type="button" data-cc-remover-foto class="px-space-md py-2 rounded-lg text-error hover:bg-error-container/20 font-label-md text-label-md transition-colors">Remover foto</button>
                    <div class="flex items-center gap-space-sm">
                        <button type="button" data-cc-fechar-foto class="px-space-md py-2 rounded-lg bg-surface-subtle font-label-md text-label-md text-on-surface">Cancelar</button>
                        <button type="button" data-cc-salvar-foto id="btn-salvar-foto" class="px-space-md py-2 rounded-lg bg-status-em-andamento text-on-primary font-label-md text-label-md shadow-sm hover:bg-secondary transition-colors">Salvar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelectorAll('[data-cc-fechar-foto]').forEach((botao) => {
            botao.addEventListener('click', fecharModalFotoPerfil);
        });
        const input = modal.querySelector('#input-foto-perfil');
        if (input) input.addEventListener('change', previewFotoPerfilSelected);
        const salvar = modal.querySelector('[data-cc-salvar-foto]');
        if (salvar) salvar.addEventListener('click', salvarFotoPerfil);
        const remover = modal.querySelector('[data-cc-remover-foto]');
        if (remover) remover.addEventListener('click', removerFotoPerfil);
    }

    window.tempPerfilFotoData = null;
    const input = document.getElementById('input-foto-perfil');
    if (input) input.value = '';
    const feedback = document.getElementById('foto-feedback');
    if (feedback) {
        feedback.classList.add('hidden');
        feedback.textContent = '';
    }

    const previewBox = document.getElementById('preview-avatar-box');
    if (previewBox) {
        previewBox.replaceChildren();
        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined text-4xl';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = 'person';
        previewBox.appendChild(icon);
    }

    window.dbService.getCurrentUser().then((usuario) => {
        if (usuario && usuario.foto_perfil_url) {
            atualizarPreviewFoto(usuario.foto_perfil_url);
        }
    }).catch((erro) => {
        console.error('Falha ao carregar a foto atual:', erro);
    });

    modal.classList.remove('hidden');
    const primeiroBotao = modal.querySelector('button');
    if (primeiroBotao) primeiroBotao.focus({ preventScroll: true });
}

function atualizarPreviewFoto(url) {
    const previewBox = document.getElementById('preview-avatar-box');
    if (!previewBox) return;
    previewBox.replaceChildren();
    if (!url) {
        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined text-4xl';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = 'person';
        previewBox.appendChild(icon);
        return;
    }
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Pré-visualização da foto de perfil';
    img.className = 'w-full h-full object-cover';
    previewBox.appendChild(img);
}

function fecharModalFotoPerfil() {
    const modal = document.getElementById('modal-foto-perfil');
    if (modal) modal.classList.add('hidden');
    window.tempPerfilFotoData = null;
}

function previewFotoPerfilSelected(event) {
    const file = event.target.files && event.target.files[0];
    const feedback = document.getElementById('foto-feedback');
    if (!file) return;

    const exibirFeedback = (mensagem, erro) => {
        if (!feedback) return;
        feedback.textContent = mensagem;
        feedback.className = `w-full p-2 text-center rounded font-label-sm text-label-sm ${erro ? 'bg-error-container text-on-error-container' : 'bg-surface-subtle text-on-surface'}`;
        feedback.classList.remove('hidden');
    };

    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
        exibirFeedback('Selecione uma imagem JPEG, PNG ou WebP.', true);
        event.target.value = '';
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        exibirFeedback('A imagem selecionada é maior que 5 MB. Escolha um arquivo menor.', true);
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        window.tempPerfilFotoData = dataUrl;
        atualizarPreviewFoto(dataUrl);
        exibirFeedback('Imagem pronta para salvar.', false);
    };
    reader.onerror = () => {
        exibirFeedback('Não foi possível ler a imagem selecionada.', true);
    };
    reader.readAsDataURL(file);
}

async function salvarFotoPerfil() {
    const btn = document.getElementById('btn-salvar-foto');
    const feedback = document.getElementById('foto-feedback');

    if (!window.tempPerfilFotoData) {
        fecharModalFotoPerfil();
        return;
    }

    try {
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Salvando...';
        }
        const atualizado = await window.dbService.updateUserProfile({ foto_perfil_url: window.tempPerfilFotoData });
        updateAvatarDisplay(atualizado.foto_perfil_url, atualizado.nome);
        try {
            window.dispatchEvent(new CustomEvent('civil:usuario', { detail: atualizado }));
        } catch (erro) { /* opcional */ }
        window.ccUI.mostrarAviso('Foto de perfil atualizada com sucesso.', 'sucesso');
        fecharModalFotoPerfil();
    } catch (erro) {
        console.error('Falha ao salvar a foto de perfil:', erro);
        if (feedback) {
            feedback.textContent = window.ccUI.mensagemErroDados(erro);
            feedback.className = 'w-full p-2 text-center rounded font-label-sm text-label-sm bg-error-container text-on-error-container';
            feedback.classList.remove('hidden');
        } else {
            window.ccUI.mostrarAviso(window.ccUI.mensagemErroDados(erro), 'erro');
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Salvar';
        }
    }
}

async function removerFotoPerfil() {
    const confirmado = await window.ccUI.confirmarAcao({
        titulo: 'Remover foto de perfil',
        mensagem: 'A foto atual será removida do seu perfil. Deseja continuar?',
        textoConfirmar: 'Remover foto',
        textoCancelar: 'Cancelar'
    });
    if (!confirmado) return;

    try {
        const atualizado = await window.dbService.updateUserProfile({ foto_perfil_url: '' });
        updateAvatarDisplay('', atualizado.nome);
        try {
            window.dispatchEvent(new CustomEvent('civil:usuario', { detail: atualizado }));
        } catch (erro) { /* opcional */ }
        window.ccUI.mostrarAviso('Foto de perfil removida.', 'sucesso');
        fecharModalFotoPerfil();
    } catch (erro) {
        console.error('Falha ao remover a foto de perfil:', erro);
        window.ccUI.mostrarAviso(window.ccUI.mensagemErroDados(erro), 'erro');
    }
}

async function handleLogout() {
    try {
        await window.dbService.logoutUser();
        try {
            window.dispatchEvent(new CustomEvent('civil:usuario', { detail: null }));
        } catch (erro) { /* opcional */ }
        window.location.href = caminhoLogin();
    } catch (erro) {
        console.error('Falha ao encerrar a sessão:', erro);
        window.ccUI.mostrarAviso(window.ccUI.mensagemErroDados(erro), 'erro');
    }
}

function configurarPaginaLogin() {
    const form = document.getElementById('auth-form');
    if (!form) return;

    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    if (tabLogin && tabRegister) {
        const container = tabLogin.parentElement;
        if (container) container.setAttribute('role', 'tablist');
        tabLogin.setAttribute('role', 'tab');
        tabRegister.setAttribute('role', 'tab');
        tabLogin.setAttribute('aria-controls', 'register-fields');
        tabRegister.setAttribute('aria-controls', 'register-fields');
        tabLogin.setAttribute('aria-selected', 'true');
        tabRegister.setAttribute('aria-selected', 'false');
        tabRegister.setAttribute('tabindex', '-1');
        tabLogin.addEventListener('keydown', (evento) => {
            if (evento.key === 'ArrowRight') {
                evento.preventDefault();
                switchAuthTab('register');
                tabRegister.focus();
            }
        });
        tabRegister.addEventListener('keydown', (evento) => {
            if (evento.key === 'ArrowLeft') {
                evento.preventDefault();
                switchAuthTab('login');
                tabLogin.focus();
            }
        });
    }

    const email = document.getElementById('email-login');
    if (email) email.setAttribute('autocomplete', 'email');
    const senha = document.getElementById('senha-login');
    if (senha) senha.setAttribute('autocomplete', 'current-password');

    const forgot = document.getElementById('forgot-password-link');
    if (forgot) forgot.addEventListener('click', handlePasswordReset);
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndHeader();
    configurarPaginaLogin();

    document.querySelectorAll('[data-action="logout"], [title="Encerrar Sessão"]').forEach((botao) => {
        botao.addEventListener('click', (evento) => {
            evento.preventDefault();
            handleLogout();
        });
    });

    document.querySelectorAll('.user-avatar-container, .user-display-name').forEach((el) => {
        el.addEventListener('click', abrirModalFotoPerfil);
        el.addEventListener('keydown', (evento) => {
            if (evento.key === 'Enter' || evento.key === ' ') {
                evento.preventDefault();
                abrirModalFotoPerfil();
            }
        });
        el.classList.add('cursor-pointer');
        if (el.classList.contains('user-display-name')) {
            el.setAttribute('tabindex', '0');
            el.setAttribute('role', 'button');
            el.setAttribute('title', 'Alterar foto de perfil');
        }
    });

    const feedback = document.getElementById('auth-feedback');
    if (feedback) {
        feedback.setAttribute('aria-live', 'polite');
    }
});
