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
    const navTopCalendar = document.getElementById('nav-top-calendar');
    const navTopTasks = document.getElementById('nav-top-tasks');

    const viewHome = document.getElementById('view-home');
    const viewDashboard = document.getElementById('view-dashboard');
    const viewLibrary = document.getElementById('view-library');
    const viewNotifications = document.getElementById('view-notifications');
    const viewCalendar = document.getElementById('view-calendar');
    const viewTasks = document.getElementById('view-tasks');

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
            window.notepadInstance = notepadInstance; // Expose globally
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
        if (!viewHome || !viewDashboard || !viewLibrary || !viewNotifications || !viewCalendar || !viewTasks) return;

        // Oculta todas as sub-views
        viewHome.classList.add('hidden');
        viewDashboard.classList.add('hidden');
        viewLibrary.classList.add('hidden');
        viewNotifications.classList.add('hidden');
        viewCalendar.classList.add('hidden');
        viewTasks.classList.add('hidden');

        // Remove active class de todos os botões do menu lateral
        navHome.classList.remove('active');
        navDashboard.classList.remove('active');
        navLibrary.classList.remove('active');
        navNotifications.classList.remove('active');
        
        // Remove active class dos botões superiores
        if (navTopCalendar) navTopCalendar.classList.remove('active');
        if (navTopTasks) navTopTasks.classList.remove('active');

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
            if (notepadInstance) {
                if (notepadInstance.activeNotebookId === 'general') {
                    notepadInstance.renderNotes();
                } else if (notepadInstance.activeNotebookId) {
                    notepadInstance.enterNotebook(notepadInstance.activeNotebookId);
                } else {
                    notepadInstance.renderNotebooks();
                }
            }
        } else if (targetView === 'notifications') {
            viewNotifications.classList.remove('hidden');
            navNotifications.classList.add('active');
            updateNotificationsView();
        } else if (targetView === 'calendar') {
            viewCalendar.classList.remove('hidden');
            if (navTopCalendar) navTopCalendar.classList.add('active');
            if (notepadInstance) notepadInstance.renderCalendar();
        } else if (targetView === 'tasks') {
            viewTasks.classList.remove('hidden');
            if (navTopTasks) navTopTasks.classList.add('active');
            if (notepadInstance) notepadInstance.renderTasksManager();
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
            if (notepadInstance) {
                notepadInstance.exitNotebook();
            }
            switchSubView('library');
        });
    }
    if (navNotifications) {
        navNotifications.addEventListener('click', (e) => {
            e.preventDefault();
            switchSubView('notifications');
        });
    }
    if (navTopCalendar) {
        navTopCalendar.addEventListener('click', (e) => {
            e.preventDefault();
            switchSubView('calendar');
        });
    }
    if (navTopTasks) {
        navTopTasks.addEventListener('click', (e) => {
            e.preventDefault();
            switchSubView('tasks');
        });
    }
    const btnDashboardQuickAdd = document.getElementById('btn-dashboard-quick-add');
    if (btnDashboardQuickAdd) {
        btnDashboardQuickAdd.addEventListener('click', (e) => {
            e.preventDefault();
            if (notepadInstance) {
                notepadInstance.openModal();
            }
        });
    }

    const btnHomeAddTask = document.getElementById('btn-home-add-task');
    if (btnHomeAddTask) {
        btnHomeAddTask.addEventListener('click', (e) => {
            e.preventDefault();
            if (notepadInstance) {
                notepadInstance.openModal();
            }
        });
    }

    // Global countdown state
    let countdownInterval = null;

    function getNextScheduledTask(notes) {
        const now = new Date();
        const upcoming = [];

        notes.forEach(note => {
            if (note.reminderTime && !note.completed) {
                let reminderDate;
                if (note.reminderDate) {
                    const [year, month, day] = note.reminderDate.split('-').map(Number);
                    const [hours, minutes] = note.reminderTime.split(':').map(Number);
                    reminderDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
                } else {
                    const [hours, minutes] = note.reminderTime.split(':').map(Number);
                    reminderDate = new Date();
                    reminderDate.setHours(hours, minutes, 0, 0);
                }

                if (reminderDate > now) {
                    upcoming.push({ note, date: reminderDate });
                }
            }
        });

        if (upcoming.length === 0) return null;

        upcoming.sort((a, b) => a.date - b.date);
        return upcoming[0];
    }

    function renderNextUpCard(notes) {
        const nextUp = getNextScheduledTask(notes);
        const titleEl = document.getElementById('next-up-task-title');
        const descEl = document.getElementById('next-up-task-desc');
        const timeEl = document.getElementById('next-up-task-time');
        const timerEl = document.getElementById('next-up-timer');

        if (!titleEl || !descEl || !timeEl || !timerEl) return;

        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }

        if (!nextUp) {
            titleEl.textContent = 'Nenhum lembrete agendado';
            descEl.textContent = 'Crie uma nota rápida com horário programado para ver o próximo evento aqui.';
            timeEl.innerHTML = '<i class="fa-regular fa-clock"></i> --:--';
            timerEl.textContent = '--:--:--';
            return;
        }

        const { note, date } = nextUp;
        titleEl.textContent = note.title;
        descEl.textContent = note.content;
        
        let displayTimeStr = note.reminderTime;
        if (note.reminderDate) {
            const [yyyy, mm, dd] = note.reminderDate.split('-');
            displayTimeStr = `${dd}/${mm} ${note.reminderTime}`;
        }
        timeEl.innerHTML = `<i class="fa-regular fa-clock"></i> ${displayTimeStr}`;

        const updateTimer = () => {
            const now = new Date();
            const diffMs = date - now;

            if (diffMs <= 0) {
                timerEl.textContent = 'Disparando lembrete!';
                clearInterval(countdownInterval);
                setTimeout(() => updateDashboardStats(), 2000);
                return;
            }

            const totalSecs = Math.floor(diffMs / 1000);
            const hours = Math.floor(totalSecs / 3600);
            const mins = Math.floor((totalSecs % 3600) / 60);
            const secs = totalSecs % 60;

            let timerStr = '';
            if (hours > 0) {
                timerStr += `${hours}h `;
            }
            timerStr += `${mins}m ${String(secs).padStart(2, '0')}s from now`;
            timerEl.textContent = timerStr;
        };

        updateTimer();
        countdownInterval = setInterval(updateTimer, 1000);
    }

    function renderDashboardTaskList(notes) {
        const container = document.getElementById('dashboard-tasks-list');
        if (!container) return;

        container.innerHTML = '';
        const pendingNotes = notes.filter(n => !n.completed).slice(0, 5);

        if (pendingNotes.length === 0) {
            container.innerHTML = `
                <div class="empty-state-tasks" style="text-align: center; padding: 24px; color: #9ca3af;">
                    <i class="fa-solid fa-tasks" style="font-size: 24px; margin-bottom: 8px; opacity: 0.5;"></i>
                    <p>Nenhuma tarefa pendente criada.</p>
                </div>
            `;
            return;
        }

        pendingNotes.forEach(note => {
            const div = document.createElement('div');
            div.className = `dashboard-task-item ${note.color || 'note-default'}`;
            div.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.02);
                border-left: 4px solid var(--accent-color, #3b82f6);
                border-top: 1px solid rgba(255, 255, 255, 0.05);
                border-right: 1px solid rgba(255, 255, 255, 0.05);
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            `;

            let borderCol = '#3b82f6';
            if (note.color === 'note-blue') borderCol = '#3b82f6';
            else if (note.color === 'note-green') borderCol = '#22c55e';
            else if (note.color === 'note-amber') borderCol = '#f59e0b';
            else if (note.color === 'note-purple') borderCol = '#a855f7';
            div.style.borderLeftColor = borderCol;

            const priorityBadge = note.priority ? `
                <span class="badge-priority ${note.priority.toLowerCase()}" style="font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 600; text-transform: uppercase;">
                    ${note.priority === 'High' ? 'Alta' : (note.priority === 'Medium' ? 'Média' : 'Baixa')}
                </span>
            ` : '';

            const categoryBadge = note.category ? `
                <span class="badge-category" style="background: rgba(255,255,255,0.08); color: #e5e7eb; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 500;">
                    ${note.category}
                </span>
            ` : '';

            let timeStr = '';
            if (note.reminderDate) {
                const [yyyy, mm, dd] = note.reminderDate.split('-');
                timeStr = `${dd}/${mm}`;
                if (note.reminderTime) {
                    timeStr += ` às ${note.reminderTime}`;
                }
            } else if (note.reminderTime) {
                timeStr = note.reminderTime;
            }
            const timeInfo = timeStr ? `
                <span style="font-size: 12px; color: #9ca3af; display: flex; align-items: center; gap: 4px;">
                    <i class="fa-regular fa-clock"></i> ${timeStr}
                </span>
            ` : '';

            div.innerHTML = `
                <div class="task-info-side" style="display: flex; flex-direction: column; gap: 4px;">
                    <h4 style="color: #fff; font-size: 14px; font-weight: 600; margin: 0;">${note.title}</h4>
                    <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                        ${priorityBadge}
                        ${categoryBadge}
                        ${timeInfo}
                    </div>
                </div>
                <button class="btn-mark-done" data-id="${note.id}" style="background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3); padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-weight: 500; transition: all 0.2s;">
                    Mark done ✓
                </button>
            `;

            div.querySelector('.btn-mark-done').addEventListener('click', () => {
                if (window.notepadInstance) {
                    window.notepadInstance.toggleNoteCompleted(note.id);
                }
            });

            container.appendChild(div);
        });
    }

    function updateDashboardGreeting(user, notes) {
        const greetingText = document.getElementById('dashboard-greeting-text');
        const greetingSubtext = document.getElementById('dashboard-greeting-subtext');
        if (!greetingText || !greetingSubtext) return;

        const now = new Date();
        const hour = now.getHours();
        let greeting = 'Good morning';
        if (hour >= 12 && hour < 18) {
            greeting = 'Good afternoon';
        } else if (hour >= 18 || hour < 5) {
            greeting = 'Good evening';
        }

        const firstName = user ? user.name.split(' ')[0] : 'Usuário';
        greetingText.textContent = `${greeting}, ${firstName}! 👋`;

        const todayStr = now.toDateString();
        
        const todayNotes = notes.filter(n => {
            const createdDateStr = new Date(n.createdAt).toDateString();
            return createdDateStr === todayStr && !n.completed;
        });

        const highPriorityCount = todayNotes.filter(n => n.priority === 'High').length;

        greetingSubtext.innerHTML = `Você tem <strong>${todayNotes.length}</strong> tarefas restantes para hoje, sendo <strong>${highPriorityCount}</strong> de alta prioridade.`;
    }

    // Atualiza as estatísticas exibidas na visão geral do Dashboard
    function updateDashboardStats() {
        if (!notepadInstance) return;
        const notes = notepadInstance.getNotes();
        const user = window.Auth.getCurrentUser();
        
        // Atualiza saudação
        updateDashboardGreeting(user, notes);

        const statsToday = document.getElementById('metric-today-items');
        const statsPending = document.getElementById('metric-pending-tasks');
        const statsCompleted = document.getElementById('metric-completed-tasks');
        const statsHigh = document.getElementById('metric-high-priority');

        const now = new Date();
        const todayStr = now.toDateString();

        const todayItems = notes.filter(n => new Date(n.createdAt).toDateString() === todayStr);
        const pendingItems = notes.filter(n => !n.completed);
        const completedItems = notes.filter(n => n.completed);
        const highPriorityPending = notes.filter(n => n.priority === 'High' && !n.completed);

        if (statsToday) statsToday.textContent = todayItems.length;
        if (statsPending) statsPending.textContent = pendingItems.length;
        if (statsCompleted) statsCompleted.textContent = completedItems.length;
        if (statsHigh) statsHigh.textContent = highPriorityPending.length;

        // Renderizar lista e Next Up
        renderDashboardTaskList(notes);
        renderNextUpCard(notes);
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
