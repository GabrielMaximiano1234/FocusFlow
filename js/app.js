/**
 * APP.JS - Inicializador e Controlador Principal (SPA)
 * Coordena as visualizações (Auth vs. Dashboard), gerencia toasts e instancia os módulos.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Referências das Seções Principais (SPA)
    const authSection = document.getElementById('auth-section');
    const dashboardSection = document.getElementById('dashboard-section');
    
    // Dados de perfil e exibição no Dashboard
    const userDisplayName = document.getElementById('user-display-name');
    const userDisplayEmail = document.getElementById('user-display-email');
    const welcomeUsername = document.getElementById('welcome-username');
    const userAvatar = document.getElementById('user-avatar');
    
    // Botões e navegação
    const btnLogout = document.getElementById('btn-logout');
    
    // Instâncias Globais dos Componentes
    let carouselInstance = null;
    let notepadInstance = null;

    // --- FUNÇÃO PARA CRIAR E EXIBIR TOASTS PREMIUM ---
    function showToast(title, desc, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        // Criar elemento de toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Define o ícone de acordo com o tipo
        let iconClass = 'fa-solid fa-circle-info';
        if (type === 'success') iconClass = 'fa-solid fa-circle-check';
        if (type === 'error') iconClass = 'fa-solid fa-circle-exclamation';
        if (type === 'warning') iconClass = 'fa-solid fa-triangle-exclamation';

        toast.innerHTML = `
            <i class="${iconClass} toast-icon"></i>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-desc">${desc}</div>
            </div>
            <button class="toast-close" aria-label="Fechar">&times;</button>
        `;

        // Insere no container
        container.appendChild(toast);

        // Força reflow para animação e exibe
        setTimeout(() => toast.classList.add('show'), 50);

        // Fecha automaticamente após 4.5 segundos
        const autoCloseTimeout = setTimeout(() => closeToast(toast), 4500);

        // Evento de fechar manual clicando no 'x'
        toast.querySelector('.toast-close').addEventListener('click', () => {
            clearTimeout(autoCloseTimeout);
            closeToast(toast);
        });
    }

    function closeToast(toast) {
        toast.classList.remove('show');
        // Espera transição terminar para deletar da DOM
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }

    // Exporta showToast globalmente para que outros módulos usem
    window.showToast = showToast;

    // --- GERENCIADOR DE TRANSIÇÃO DE TELAS (SPA) ---
    function initApp() {
        const user = window.Auth.getCurrentUser();

        if (user) {
            // Usuário logado: Exibe painel
            showDashboard(user);
        } else {
            // Deslogado: Exibe login/cadastro
            showAuth();
        }
    }

    function showDashboard(user) {
        // Transição visual suave
        authSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');

        // Atualizar informações do usuário na UI
        if (userDisplayName) userDisplayName.textContent = user.name;
        if (userDisplayEmail) userDisplayEmail.textContent = user.email;
        if (welcomeUsername) welcomeUsername.textContent = user.name.split(' ')[0]; // Pega primeiro nome
        if (userAvatar) userAvatar.textContent = user.name.charAt(0).toUpperCase();

        // Inicializar componentes do painel se ainda não existirem
        if (!carouselInstance && window.FocusCarousel) {
            carouselInstance = new window.FocusCarousel('focus-carousel');
        }

        if (!notepadInstance && window.NotepadManager) {
            notepadInstance = new window.NotepadManager();
        }

        // Passa o escopo do usuário atual para carregar suas notas particulares
        if (notepadInstance) {
            notepadInstance.setUser(user);
        }
    }

    function showAuth() {
        dashboardSection.classList.add('hidden');
        authSection.classList.remove('hidden');
        
        // Pausa autoplay se usuário deslogar
        if (carouselInstance) {
            carouselInstance.stopAutoplay();
        }
    }

    // --- EVENTOS E CALLBACKS ---

    // Callback ativado no auth.js após login com sucesso
    window.onAuthSuccess = () => {
        const user = window.Auth.getCurrentUser();
        showDashboard(user);
    };

    // Evento de Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            window.Auth.logout();
            showToast('Sessão Encerrada', 'Você saiu da sua conta com sucesso.', 'info');
            showAuth();
        });
    }

    // Inicialização da aplicação
    initApp();
});
