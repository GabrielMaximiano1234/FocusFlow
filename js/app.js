/**
 * APP.JS - Inicializador e Controlador Principal (SPA)
 * Coordena as visualizações (Auth vs. Dashboard), gerencia toasts e instancia os módulos.
 */

function initAppModule() {
    // Helper to escape HTML and prevent XSS
    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Referências das Seções Principais (SPA)
    const authSection = document.getElementById('tela-login');
    const dashboardSection = document.getElementById('tela-dashboard');
    
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
                <div class="toast-title">${escapeHTML(title)}</div>
                <div class="toast-desc">${escapeHTML(desc)}</div>
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
    const navDashboard = document.getElementById('nav-dashboard');
    const navLibrary = document.getElementById('nav-library');
    const navFocus = document.getElementById('nav-focus');
    const navChallenges = document.getElementById('nav-challenges');
    const navGames = document.getElementById('nav-games');
    const navNotifications = document.getElementById('nav-notifications');
    const navPricing = document.getElementById('nav-pricing');
    const navTopCalendar = document.getElementById('nav-top-calendar');
    const navTopTasks = document.getElementById('nav-top-tasks');

    const viewDashboard = document.getElementById('view-dashboard');
    const viewLibrary = document.getElementById('view-library');
    const viewNotifications = document.getElementById('view-notifications');
    const viewCalendar = document.getElementById('view-calendar');
    const viewTasks = document.getElementById('view-tasks');
    const viewFocus = document.getElementById('tela-foco');
    const viewChallenges = document.getElementById('view-challenges');
    const viewPricing = document.getElementById('view-pricing');
    const navAdmin = document.getElementById('nav-admin');
    const viewAdmin = document.getElementById('view-admin');

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
        document.querySelector('#tela-login').style.display = 'none';
        document.querySelector('#tela-dashboard').style.display = 'block';
        console.log("Transição executada");

        authSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');

        // Garante objeto de usuário válido para evitar erros de leitura
        const currentUser = user || { name: 'Usuário', email: 'usuario@exemplo.com' };

        // Atualizar informações do usuário na UI
        if (userDisplayName) userDisplayName.textContent = currentUser.name;
        if (userDisplayEmail) userDisplayEmail.textContent = currentUser.email;
        if (welcomeUsername) welcomeUsername.textContent = currentUser.name; // Exibe o nome exato digitado no cadastro
        if (userAvatar) userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();

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
            notepadInstance.setUser(currentUser);
        }

        // Inicializa o sistema de gamificação para o usuário
        if (window.Gamification) {
            window.Gamification.init(currentUser);
        }

        // Inicializa o sistema de recomendação diária
        if (window.DailyAssistant) {
            window.DailyAssistant.init(currentUser);
        }

        // Inicializa o sistema de planos e assinaturas
        initPricingSystem();

        // Aplica restrições de planos para Pomodoro e Recomendação Diária
        if (window.applyPlanConstraints) {
            window.applyPlanConstraints();
        }

        // Controla exibição do Painel Gerencial (Apenas para superadmin)
        if (navAdmin) {
            if (currentUser.role === 'superadmin') {
                navAdmin.style.display = 'flex';
            } else {
                navAdmin.style.display = 'none';
            }
        }

        // Garante que iniciamos na view principal do Dashboard
        switchSubView('dashboard');
    }

    function showAuth() {
        document.querySelector('#tela-dashboard').style.display = 'none';
        document.querySelector('#tela-login').style.display = 'flex';

        dashboardSection.classList.add('hidden');
        authSection.classList.remove('hidden');
        
        // Pausa autoplay se usuário deslogar
        if (carouselInstance) {
            carouselInstance.stopAutoplay();
        }
    }

    // --- GERENCIAMENTO DE SUB-VIEWS INTERNAS (SPA) ---
    function switchSubView(targetView) {
        if (!viewDashboard || !viewLibrary || !viewNotifications || !viewCalendar || !viewTasks || !viewFocus || !viewChallenges || !viewGames || !viewPricing || !viewAdmin) return;

        // Barreira Anti-Hacker para o Painel Administrativo
        if (targetView === 'admin') {
            const user = window.Auth.getCurrentUser();
            if (!user || user.role !== 'superadmin') {
                if (window.showToast) {
                    window.showToast("Acesso Negado", "Acesso Negado: Área Restrita", "error");
                }
                if (window.Gamification && window.Gamification.playSynthSound) {
                    window.Gamification.playSynthSound(220, 0.25, 'triangle'); // A3
                }
                switchSubView('dashboard');
                return;
            }
        }

        // Verificação de Planos e Assinaturas (Bloqueio SPA)
        if (targetView === 'challenges' || targetView === 'games') {
            if (window.checkPlanAccess && !window.checkPlanAccess(targetView)) {
                switchSubView('pricing');
                return;
            }
        }

        // Oculta todas as sub-views
        viewDashboard.classList.add('hidden');
        viewLibrary.classList.add('hidden');
        viewNotifications.classList.add('hidden');
        viewCalendar.classList.add('hidden');
        viewTasks.classList.add('hidden');
        viewFocus.classList.add('hidden');
        viewChallenges.classList.add('hidden');
        viewGames.classList.add('hidden');
        viewPricing.classList.add('hidden');
        viewAdmin.classList.add('hidden');

        // Remove active class de todos os botões do menu lateral
        navDashboard.classList.remove('active');
        navLibrary.classList.remove('active');
        navNotifications.classList.remove('active');
        if (navFocus) navFocus.classList.remove('active');
        if (navChallenges) navChallenges.classList.remove('active');
        if (navGames) navGames.classList.remove('active');
        if (navPricing) navPricing.classList.remove('active');
        if (navAdmin) navAdmin.classList.remove('active');
        
        // Remove active class dos botões superiores
        if (navTopCalendar) navTopCalendar.classList.remove('active');
        if (navTopTasks) navTopTasks.classList.remove('active');

        // Exibe a view selecionada e ativa o item correspondente no menu
        if (targetView === 'dashboard') {
            viewDashboard.classList.remove('hidden');
            navDashboard.classList.add('active');
            updateDashboardStats();
            if (window.DailyAssistant) {
                window.DailyAssistant.renderRoutine();
            }
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
        } else if (targetView === 'focus') {
            viewFocus.classList.remove('hidden');
            if (navFocus) navFocus.classList.add('active');
        } else if (targetView === 'challenges') {
            viewChallenges.classList.remove('hidden');
            if (navChallenges) navChallenges.classList.add('active');
            if (window.Gamification) window.Gamification.renderChallengesView();
        } else if (targetView === 'games') {
            viewGames.classList.remove('hidden');
            if (navGames) navGames.classList.add('active');
            if (window.Gamification) window.Gamification.renderGamesView();
        } else if (targetView === 'pricing') {
            viewPricing.classList.remove('hidden');
            if (navPricing) navPricing.classList.add('active');
            updatePricingUI();
        } else if (targetView === 'admin') {
            viewAdmin.classList.remove('hidden');
            if (navAdmin) navAdmin.classList.add('active');
            renderAdminPanel();
        }
    }

    // Expor globalmente para outros scripts (como notepad.js)
    window.switchSubView = switchSubView;

    // Vincula cliques aos botões da sidebar e ao logotipo inicial
    const sidebarBrandHome = document.getElementById('sidebar-brand-home');
    if (sidebarBrandHome) {
        sidebarBrandHome.addEventListener('click', (e) => {
            e.preventDefault();
            switchSubView('dashboard');
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
    if (navFocus) {
        navFocus.addEventListener('click', (e) => {
            e.preventDefault();
            switchSubView('focus');
        });
    }
    if (navChallenges) {
        navChallenges.addEventListener('click', (e) => {
            e.preventDefault();
            switchSubView('challenges');
        });
    }
    if (navGames) {
        navGames.addEventListener('click', (e) => {
            e.preventDefault();
            switchSubView('games');
        });
    }
    if (navPricing) {
        navPricing.addEventListener('click', (e) => {
            e.preventDefault();
            switchSubView('pricing');
        });
    }
    if (navAdmin) {
        navAdmin.addEventListener('click', (e) => {
            e.preventDefault();
            switchSubView('admin');
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

        const btnNextUpDone = document.getElementById('btn-next-up-done');
        if (btnNextUpDone) {
            btnNextUpDone.style.display = 'inline-block';
            // Clona o botão para remover os event listeners anteriores
            const newBtn = btnNextUpDone.cloneNode(true);
            btnNextUpDone.parentNode.replaceChild(newBtn, btnNextUpDone);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.notepadInstance) {
                    window.notepadInstance.toggleNoteCompleted(note.id);
                }
            });
        }

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
            timerStr += `${mins}m ${String(secs).padStart(2, '0')}s a partir de agora`;
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
                    ${escapeHTML(note.category)}
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
                    <h4 style="color: #fff; font-size: 14px; font-weight: 600; margin: 0;">${escapeHTML(note.title)}</h4>
                    <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                        ${priorityBadge}
                        ${categoryBadge}
                        ${timeInfo}
                    </div>
                </div>
                <button class="btn-mark-done" data-id="${note.id}" style="background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3); padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-weight: 500; transition: all 0.2s;">
                    Marcar como concluída ✓
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
        let greeting = 'Bom dia';
        if (hour >= 12 && hour < 18) {
            greeting = 'Boa tarde';
        } else if (hour >= 18 || hour < 5) {
            greeting = 'Boa noite';
        }

        const firstName = user ? user.name.split(' ')[0] : 'Usuário';
        greetingText.textContent = `${greeting}, ${firstName} 👋`;

        const todayStr = now.toDateString();
        const todayFormatted = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        
        const todayNotes = notes.filter(n => {
            if (n.reminderDate) {
                return n.reminderDate === todayFormatted && !n.completed;
            }
            const createdDateStr = new Date(n.createdAt).toDateString();
            return createdDateStr === todayStr && !n.completed;
        });

        const highPriorityCount = todayNotes.filter(n => n.priority === 'High').length;

        greetingSubtext.innerHTML = `Você tem <strong>${todayNotes.length}</strong> itens restantes hoje · <strong>${highPriorityCount}</strong> de alta prioridade.`;
    }

    // Atualiza as estatísticas exibidas na visão geral do Dashboard
    function updateDashboardStats() {
        if (!notepadInstance) return;
        const notes = notepadInstance.getNotes();
        const user = window.Auth.getCurrentUser();
        
        // Atualiza saudação
        updateDashboardGreeting(user, notes);

        const statsToday = document.getElementById('today-items-count');
        const statsPending = document.getElementById('pending-tasks-count');
        const statsCompleted = document.getElementById('completed-tasks-count');
        const statsHigh = document.getElementById('high-priority-count');

        const now = new Date();
        const todayStr = now.toDateString();
        const todayFormatted = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

        const todayItems = notes.filter(n => {
            if (n.reminderDate) {
                return n.reminderDate === todayFormatted;
            }
            return new Date(n.createdAt).toDateString() === todayStr;
        });
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

    // --- SISTEMA DE PLANOS E ASSINATURAS (SIMULAÇÃO) ---
    function getPlanStorageKey() {
        const user = window.Auth.getCurrentUser();
        return user ? `prod_hub_user_plan_${user.email}` : 'prod_hub_user_plan_guest';
    }

    function getUserPlan() {
        const user = window.Auth.getCurrentUser();
        return user ? (user.plan_level || 'Iniciante Ativo') : 'Iniciante Ativo';
    }

    function setUserPlan(planName) {
        if (window.Auth && window.Auth.reissueTokenWithNewPlan) {
            window.Auth.reissueTokenWithNewPlan(planName);
        }
    }

    function updatePricingUI() {
        const currentPlan = getUserPlan();
        
        const btnFree = document.getElementById('btn-plan-free');
        const btnAlpha = document.getElementById('btn-plan-alpha');
        const btnPro = document.getElementById('btn-plan-pro');

        if (!btnFree || !btnAlpha || !btnPro) return;

        // Resetar estados
        btnFree.disabled = false;
        btnFree.textContent = "Assinar";
        btnFree.className = "btn-plan-action";

        btnAlpha.disabled = false;
        btnAlpha.textContent = "Assinar";
        btnAlpha.className = "btn-plan-action";

        btnPro.disabled = false;
        btnPro.textContent = "Assinar";
        btnPro.className = "btn-plan-action";

        // Definir plano atual
        if (currentPlan === "Iniciante Ativo") {
            btnFree.disabled = true;
            btnFree.textContent = "Plano Atual";
            btnFree.className = "btn-plan-action";
        } else if (currentPlan === "Concentração Alfa") {
            btnAlpha.disabled = true;
            btnAlpha.textContent = "Plano Atual";
            btnAlpha.className = "btn-plan-action";
        } else if (currentPlan === "Mestre de Foco") {
            btnPro.disabled = true;
            btnPro.textContent = "Plano Atual";
            btnPro.className = "btn-plan-action";
        }
    }

    function playUpgradeSound() {
        // Toca acorde comemorativo sintetizado (som estelar ascendente)
        if (window.Gamification && window.Gamification.playSynthSound) {
            const synth = window.Gamification;
            synth.playSynthSound(523.25, 0.1, 'sine'); // C5
            setTimeout(() => synth.playSynthSound(659.25, 0.1, 'sine'), 100); // E5
            setTimeout(() => synth.playSynthSound(783.99, 0.1, 'sine'), 200); // G5
            setTimeout(() => synth.playSynthSound(1046.50, 0.25, 'sine'), 300); // C6
        }
    }

    function initPricingSystem() {
        const btnFree = document.getElementById('btn-plan-free');
        const btnAlpha = document.getElementById('btn-plan-alpha');
        const btnPro = document.getElementById('btn-plan-pro');

        if (!btnFree || !btnAlpha || !btnPro) return;

        const handleUpgrade = (planName) => {
            const oldPlan = getUserPlan();
            if (oldPlan === planName) return;

            setUserPlan(planName);
            updatePricingUI();
            playUpgradeSound();

            if (window.showToast) {
                window.showToast("Assinatura Atualizada!", `Você agora possui o plano ${planName}! Desbloqueando recursos.`, "success");
            }

            // Aplica restrições do novo plano (ex: Pomodoro, Recomendação Diária)
            if (window.applyPlanConstraints) {
                window.applyPlanConstraints();
            }

            // Ganho de XP virtual bônus por realizar o Upgrade (Gamificação)
            if (window.Gamification && window.Gamification.addXP) {
                window.Gamification.addXP(150, "Upgrade de Conta");
            }
        };

        // Remove listeners antigos se houver
        const newBtnFree = btnFree.cloneNode(true);
        btnFree.parentNode.replaceChild(newBtnFree, btnFree);
        const newBtnAlpha = btnAlpha.cloneNode(true);
        btnAlpha.parentNode.replaceChild(newBtnAlpha, btnAlpha);
        const newBtnPro = btnPro.cloneNode(true);
        btnPro.parentNode.replaceChild(newBtnPro, btnPro);

        newBtnFree.addEventListener('click', (e) => { e.preventDefault(); handleUpgrade("Iniciante Ativo"); });
        newBtnAlpha.addEventListener('click', (e) => { e.preventDefault(); handleUpgrade("Concentração Alfa"); });
        newBtnPro.addEventListener('click', (e) => { e.preventDefault(); handleUpgrade("Mestre de Foco"); });

        updatePricingUI();
    }
    window.initPricingSystem = initPricingSystem;
    window.getUserPlan = getUserPlan;

    // --- SEGURANÇA E CONTROLE DE PLANOS (CHAVE MESTRA) ---
    function checkPlanAccess(targetView) {
        const user = window.Auth.getCurrentUser();
        // Chave Mestra: Se o usuário logado for superadmin, libera tudo sem precisar assinar
        if (user && user.role === 'superadmin') {
            return true;
        }

        const plan = getUserPlan();

        // Bloqueios SPA baseados nos planos
        if (targetView === 'challenges' || targetView === 'games') {
            if (plan === 'Iniciante Ativo') {
                if (window.showToast) {
                    window.showToast("Recurso Premium", "Esta aba está disponível a partir do plano Concentração Alfa!", "warning");
                }
                return false;
            }
        }

        if (targetView === 'dashboard-recommendation') {
            if (plan === 'Iniciante Ativo' || plan === 'Concentração Alfa') {
                return false;
            }
        }

        return true;
    }
    window.checkPlanAccess = checkPlanAccess;

    function applyPlanConstraints() {
        if (window.pomodoroTimer) {
            if (window.checkPlanAccess && !window.checkPlanAccess('challenges')) {
                window.pomodoroTimer.focusDuration = 25 * 60;
                window.pomodoroTimer.breakDuration = 5 * 60;
                if (window.pomodoroTimer.inputFocus) window.pomodoroTimer.inputFocus.value = 25;
                if (window.pomodoroTimer.inputBreak) window.pomodoroTimer.inputBreak.value = 5;
                window.pomodoroTimer.reset();
            } else {
                const savedFocus = parseInt(localStorage.getItem('pomodoro_focus_duration') || 25);
                const savedBreak = parseInt(localStorage.getItem('pomodoro_break_duration') || 5);
                window.pomodoroTimer.focusDuration = savedFocus * 60;
                window.pomodoroTimer.breakDuration = savedBreak * 60;
                if (window.pomodoroTimer.inputFocus) window.pomodoroTimer.inputFocus.value = savedFocus;
                if (window.pomodoroTimer.inputBreak) window.pomodoroTimer.inputBreak.value = savedBreak;
                window.pomodoroTimer.reset();
            }
        }
        if (window.DailyAssistant) {
            window.DailyAssistant.renderRoutine();
        }
    }
    window.applyPlanConstraints = applyPlanConstraints;

    // --- PAINEL ADMINISTRATIVO E SIMULAÇÕES ---
    let visitorsSim = Math.floor(Math.random() * 50) + 120;
    let onlineSim = Math.floor(Math.random() * 8) + 12;

    function renderAdminPanel() {
        const metricUsers = document.getElementById('admin-metric-users');
        const metricVisitors = document.getElementById('admin-metric-visitors');
        const metricOnline = document.getElementById('admin-metric-online');
        const metricMRR = document.getElementById('admin-metric-mrr');
        const metricOrganicClicks = document.getElementById('seo-organic-clicks');
        const trafficBarsContainer = document.getElementById('seo-traffic-bars');
        const tableBody = document.getElementById('admin-users-table-body');

        if (!metricUsers || !metricVisitors || !metricOnline || !tableBody) return;

        // 1. Contar usuários cadastrados
        let users = [];
        try {
            users = JSON.parse(localStorage.getItem('prod_hub_users')) || [];
        } catch (e) {
            console.error("Erro ao ler usuários no admin:", e);
        }
        metricUsers.textContent = users.length;

        // 2. Simular visitantes e online agora
        visitorsSim += Math.floor(Math.random() * 5) - 2;
        if (visitorsSim < 50) visitorsSim = 120;
        metricVisitors.textContent = visitorsSim;

        onlineSim += Math.floor(Math.random() * 3) - 1;
        if (onlineSim < 1) onlineSim = 12;
        if (onlineSim > 40) onlineSim = 20;
        metricOnline.innerHTML = `${onlineSim} <span class="pulse-indicator-small"></span>`;

        // 3. Simular MRR dinâmico baseado em usuários reais cadastrados no localDB
        let baseMRR = 14820.00;
        users.forEach(u => {
            const plan = u.plan_level || localStorage.getItem(`prod_hub_user_plan_${u.email}`) || 'Iniciante Ativo';
            if (plan === 'Concentração Alfa') {
                baseMRR += 9.90;
            } else if (plan === 'Mestre de Foco') {
                baseMRR += 19.90;
            }
        });
        if (metricMRR) {
            metricMRR.textContent = baseMRR.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        // 4. Simular Cliques Orgânicos de SEO com flutuações realistas
        if (metricOrganicClicks) {
            const fluct = Math.floor(Math.random() * 120) - 60;
            metricOrganicClicks.textContent = (34200 + fluct).toLocaleString('pt-BR');
        }

        // 5. Simular variação das barras do gráfico de tráfego orgânico
        if (trafficBarsContainer) {
            const bars = trafficBarsContainer.children;
            const baseHeights = [35, 44, 53, 65, 82, 100];
            for (let i = 0; i < bars.length; i++) {
                const bar = bars[i];
                const baseH = baseHeights[i] || 50;
                const fluct = Math.floor(Math.random() * 6) - 3; // -3 to +3
                const finalH = Math.max(15, Math.min(100, baseH + fluct));
                bar.style.height = `${finalH}%`;
            }
        }

        // 6. Renderizar tabela de usuários
        tableBody.innerHTML = '';
        if (users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; color: var(--text-muted);">Nenhum usuário cadastrado no localStorage.</td>
                </tr>
            `;
            return;
        }

        users.forEach(u => {
            const plan = u.plan_level || localStorage.getItem(`prod_hub_user_plan_${u.email}`) || 'Iniciante Ativo';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 12px 16px; font-weight: 500; color: #fff;">${escapeHTML(u.name)}</td>
                <td style="padding: 12px 16px; color: var(--text-muted); font-family: monospace;">${escapeHTML(u.email)}</td>
                <td style="padding: 12px 16px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 11px; padding: 2px 8px; border-radius: 100px; font-weight: bold; 
                            background: ${u.role === 'superadmin' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.1)'}; 
                            color: ${u.role === 'superadmin' ? '#f87171' : '#818cf8'}; 
                            border: 1px solid ${u.role === 'superadmin' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(99, 102, 241, 0.2)'};">
                            ${u.role === 'superadmin' ? 'SUPERADMIN' : 'USUÁRIO'}
                        </span>
                        <span style="font-size: 10px; padding: 2px 8px; border-radius: 100px; font-weight: bold; 
                            background: rgba(255, 255, 255, 0.05); color: #a5b4fc; border: 1px solid rgba(255, 255, 255, 0.08);">
                            ${plan}
                        </span>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

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
                    <span>${escapeHTML(log.title)}</span>
                    <span class="notif-log-time">${escapeHTML(log.timestamp)}</span>
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
            if (window.pomodoroTimer) {
                window.pomodoroTimer.reset();
            }
            if (window.Gamification && window.Gamification.exitActiveGame) {
                window.Gamification.exitActiveGame();
                window.Gamification.closeZenRelax();
            }
            showAuth();
        });
    }

    // --- CONTROLE DE TELA CHEIA E ORIENTAÇÃO ---
    const btnFullscreen = document.getElementById('btn-fullscreen');

    // Sincroniza a escala dinâmica via CSS transform ao entrar/sair de tela cheia
    const handleFullscreenViewportSync = () => {
        const scaleWrapper = document.getElementById('modal-scale-wrapper');
        
        if (document.fullscreenElement) {
            const isMobileDevice = Math.min(screen.width, screen.height) <= 600;
            const isLandscape = window.innerWidth > window.innerHeight;
            const isMobileLandscape = isMobileDevice && isLandscape;
            
            if (isMobileLandscape) {
                // Proporção base do layout desktop = 1280px
                const scale = window.innerWidth / 1280;
                
                // Aplica a transformação de escala no wrapper do Dashboard
                if (dashboardSection) {
                    dashboardSection.style.transform = `scale(${scale})`;
                    dashboardSection.style.transformOrigin = 'top left';
                    dashboardSection.style.width = '1280px';
                }
                
                // Aplica a mesma escala no wrapper do modal
                if (scaleWrapper) {
                    scaleWrapper.style.transform = `scale(${scale})`;
                    scaleWrapper.style.transformOrigin = 'center center';
                }
                
                document.body.classList.add('fullscreen-scaled');
            } else {
                restoreScale();
            }
        } else {
            restoreScale();
        }
    };

    const restoreScale = () => {
        if (dashboardSection) {
            dashboardSection.style.transform = '';
            dashboardSection.style.transformOrigin = '';
            dashboardSection.style.width = '';
        }
        const scaleWrapper = document.getElementById('modal-scale-wrapper');
        if (scaleWrapper) {
            scaleWrapper.style.transform = '';
            scaleWrapper.style.transformOrigin = '';
        }
        document.body.classList.remove('fullscreen-scaled');
    };

    // Trava de orientação vertical para dispositivos móveis
    const checkOrientation = () => {
        const isMobileDevice = Math.min(screen.width, screen.height) <= 600;
        const isPortrait = window.innerHeight > window.innerWidth;
        
        if (isMobileDevice && isPortrait) {
            document.body.classList.add('portrait-locked');
            restoreScale(); // Garante restaurar escala ao voltar para portrait
        } else {
            document.body.classList.remove('portrait-locked');
            if (document.fullscreenElement) {
                handleFullscreenViewportSync();
            }
        }
    };
    
    window.addEventListener('resize', () => {
        checkOrientation();
        if (document.fullscreenElement) {
            handleFullscreenViewportSync();
        }
    });
    window.addEventListener('orientationchange', () => {
        checkOrientation();
        if (document.fullscreenElement) {
            handleFullscreenViewportSync();
        }
    });
    checkOrientation();
    
    if (btnFullscreen) {
        btnFullscreen.addEventListener('click', async () => {
            try {
                if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                    if (screen.orientation && screen.orientation.lock) {
                        await screen.orientation.lock('landscape').catch(err => {
                            console.warn('Orientation lock failed or not supported:', err);
                        });
                    }
                    btnFullscreen.querySelector('span').textContent = 'Sair Tela Cheia';
                    btnFullscreen.querySelector('i').className = 'fa-solid fa-compress';
                } else {
                    await document.exitFullscreen();
                    if (screen.orientation && screen.orientation.unlock) {
                        screen.orientation.unlock();
                    }
                    btnFullscreen.querySelector('span').textContent = 'Tela Cheia';
                    btnFullscreen.querySelector('i').className = 'fa-solid fa-expand';
                }
            } catch (err) {
                console.error('Fullscreen request failed:', err);
                if (window.showToast) {
                    window.showToast('Erro de Tela Cheia', 'Não foi possível ativar a tela cheia neste navegador.', 'warning');
                }
            }
        });

        // Sincronizar estado ao sair manual da tela cheia
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                btnFullscreen.querySelector('span').textContent = 'Tela Cheia';
                btnFullscreen.querySelector('i').className = 'fa-solid fa-expand';
                if (screen.orientation && screen.orientation.unlock) {
                    try { screen.orientation.unlock(); } catch(e) {}
                }
            }
            handleFullscreenViewportSync();
        });
    }

    // Inicialização da aplicação
    initApp();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAppModule);
} else {
    initAppModule();
}
