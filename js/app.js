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

    // Navegação interna do Dashboard (SPA de visualizações secundárias)
    const navHome = document.getElementById('nav-home');
    const navDashboard = document.getElementById('nav-dashboard');
    const navLibrary = document.getElementById('nav-library');
    const navNotifications = document.getElementById('nav-notifications');

    const viewHome = document.getElementById('view-home');
    const viewDashboard = document.getElementById('view-dashboard');
    const viewLibrary = document.getElementById('view-library');
    const viewNotifications = document.getElementById('view-notifications');

    // Histórico de logs de notificações para esta sessão
    const sessionNotificationLogs = [];

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

        // Garante que iniciamos na view principal de Início
        switchSubView('home');
    }

    function showAuth() {
        dashboardSection.classList.add('hidden');
        authSection.classList.remove('hidden');
        
        // Pausa autoplay se usuário deslogar
        if (carouselInstance) {
            carouselInstance.stopAutoplay();
        }
    }

    // --- GERENCIAMENTO DE SUB-VIEWS INTERNAS (SPA) ---
    function switchSubView(targetView) {
        if (!viewHome || !viewDashboard || !viewLibrary || !viewNotifications) return;

        // Oculta todas as sub-views
        viewHome.classList.add('hidden');
        viewDashboard.classList.add('hidden');
        viewLibrary.classList.add('hidden');
        viewNotifications.classList.add('hidden');

        // Remove active class de todos os botões do menu
        navHome.classList.remove('active');
        navDashboard.classList.remove('active');
        navLibrary.classList.remove('active');
        navNotifications.classList.remove('active');

        // Exibe a view selecionada e ativa o item correspondente no menu
        if (targetView === 'home') {
            viewHome.classList.remove('hidden');
            navHome.classList.add('active');
        } else if (targetView === 'dashboard') {
            viewDashboard.classList.remove('hidden');
            navDashboard.classList.add('active');
            updateDashboardStats();
        } else if (targetView === 'library') {
            viewLibrary.classList.remove('hidden');
            navLibrary.classList.add('active');
            if (notepadInstance) notepadInstance.renderNotes();
        } else if (targetView === 'notifications') {
            viewNotifications.classList.remove('hidden');
            navNotifications.classList.add('active');
            updateNotificationsView();
        }
    }

    // Expor globalmente para outros scripts (como notepad.js)
    window.switchSubView = switchSubView;

    // Vincula cliques aos botões da sidebar e ao logotipo inicial
    const sidebarBrandHome = document.getElementById('sidebar-brand-home');
    if (sidebarBrandHome) {
        sidebarBrandHome.addEventListener('click', (e) => {
            e.preventDefault();
            switchSubView('home');
        });
    }
    if (navHome) {
        navHome.addEventListener('click', (e) => {
            e.preventDefault();
            switchSubView('home');
        });
    }
    if (navDashboard) {
        navDashboard.addEventListener('click', (e) => {
            e.preventDefault();
            switchSubView('dashboard');
        });
    }
    if (navLibrary) {
        navLibrary.addEventListener('click', (e) => {
            e.preventDefault();
            switchSubView('library');
        });
    }
    if (navNotifications) {
        navNotifications.addEventListener('click', (e) => {
            e.preventDefault();
            switchSubView('notifications');
        });
    }

    // Atualiza as estatísticas exibidas na visão geral do Dashboard
    function updateDashboardStats() {
        if (!notepadInstance) return;
        const notes = notepadInstance.getNotes();
        
        const statsTotal = document.getElementById('stats-total-notes');
        const statsImportant = document.getElementById('stats-important-notes');
        
        if (statsTotal) statsTotal.textContent = notes.length;
        if (statsImportant) {
            statsImportant.textContent = notes.filter(n => n.isImportant).length;
        }
    }
    window.updateDashboardStats = updateDashboardStats; // Deixa disponível para o notepad.js chamar!

    // Registra e exibe os logs de alertas disparados na sessão
    function logNotificationTrigger(title, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('pt-BR');
        sessionNotificationLogs.unshift({ title, type, timestamp });
        
        // Atualiza o badge de notificações não lidas no menu lateral se não estiver na tela de notificações
        const notifBadge = document.getElementById('notif-badge');
        const viewNotifications = document.getElementById('view-notifications');
        if (notifBadge && (!viewNotifications || viewNotifications.classList.contains('hidden'))) {
            notifBadge.classList.remove('hidden');
        }
        
        // Atualiza a lista de histórico na tela
        updateNotificationsView();
    }
    window.logNotificationTrigger = logNotificationTrigger; // Disponibiliza globalmente

    function updateNotificationsView() {
        // Oculta badge de novas notificações
        const notifBadge = document.getElementById('notif-badge');
        if (notifBadge) notifBadge.classList.add('hidden');

        // Atualiza status da permissão atual
        const notifPermission = document.getElementById('notif-permission-status');
        if (notifPermission) {
            const currentPerm = Notification.permission;
            notifPermission.textContent = currentPerm === 'granted' ? 'Ativado' : (currentPerm === 'denied' ? 'Bloqueado' : 'Pendente');
            
            // Remove classes antigas
            notifPermission.className = 'status-badge';
            if (currentPerm === 'granted') notifPermission.classList.add('success');
            if (currentPerm === 'denied') notifPermission.classList.add('error');
        }

        // Atualiza botão na view de notificações
        const btnRequestNotifView = document.getElementById('btn-request-notif-view');
        if (btnRequestNotifView && notepadInstance) {
            notepadInstance.updateNotificationButtonState();
            
            const isGranted = Notification.permission === 'granted';
            const icon = btnRequestNotifView.querySelector('i');
            const text = btnRequestNotifView.querySelector('span');

            if (isGranted) {
                btnRequestNotifView.className = 'btn-secondary active';
                if (icon) icon.className = 'fa-solid fa-bell';
                if (text) text.textContent = 'Notificações Ativadas';
                btnRequestNotifView.disabled = true;
            } else {
                btnRequestNotifView.className = 'btn-secondary';
                if (icon) icon.className = 'fa-solid fa-bell-slash';
                if (text) text.textContent = 'Ativar Notificações';
                btnRequestNotifView.disabled = false;
            }
        }

        // Renderiza lista de logs
        const logList = document.getElementById('notif-log-list');
        const noLogsState = document.getElementById('no-logs-state');
        if (!logList || !noLogsState) return;

        logList.innerHTML = '';
        
        if (sessionNotificationLogs.length === 0) {
            noLogsState.classList.remove('hidden');
            logList.classList.add('hidden');
        } else {
            noLogsState.classList.add('hidden');
            logList.classList.remove('hidden');

            sessionNotificationLogs.forEach(log => {
                const li = document.createElement('li');
                li.className = `notif-log-item ${log.type}`;
                
                let iconClass = 'fa-solid fa-circle-info';
                if (log.type === 'success') iconClass = 'fa-solid fa-circle-check';
                if (log.type === 'warning') iconClass = 'fa-solid fa-triangle-exclamation';

                li.innerHTML = `
                    <i class="${iconClass}"></i>
                    <span>${log.title}</span>
                    <span class="notif-log-time">${log.timestamp}</span>
                `;
                logList.appendChild(li);
            });
        }
    }

    // Associa clique do botão da view de notificações
    const btnRequestNotifView = document.getElementById('btn-request-notif-view');
    if (btnRequestNotifView) {
        btnRequestNotifView.addEventListener('click', () => {
            if (notepadInstance) {
                notepadInstance.requestNotificationPermission();
                setTimeout(() => updateNotificationsView(), 1000);
            }
        });
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
