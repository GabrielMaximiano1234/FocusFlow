/**
 * NOTEPAD.JS - Módulo do Bloco de Notas, Notificações e Cadernos
 * Gerencia o ciclo de vida das notas e cadernos do usuário.
 * Dispara notificações no navegador automaticamente para todas as notas no horário agendado.
 */

class NotepadManager {
    constructor() {
        this.storageKey = 'prod_hub_notes';
        this.notebookStorageKey = 'prod_hub_notebooks';
        this.currentUser = null;
        this.activeNotebookId = null; // null = grid de cadernos, 'general' = notas gerais, 'notebook_id' = caderno específico
        this.autoSaveTimeout = null;
        
        // Elementos da DOM - Notas
        this.form = document.getElementById('note-form');
        this.editIdInput = document.getElementById('edit-note-id');
        this.titleInput = document.getElementById('note-title');
        this.contentInput = document.getElementById('note-content');
        this.notesGrid = document.getElementById('notes-grid');
        this.noNotesState = document.getElementById('no-notes-state');
        this.searchInput = document.getElementById('search-notes');
        this.reminderTimeInput = document.getElementById('note-reminder-time');
        
        // Elementos da DOM - Cadernos
        this.notebooksViewContainer = document.getElementById('library-notebooks-view');
        this.notesViewContainer = document.getElementById('library-notes-view');
        this.notebooksGrid = document.getElementById('notebooks-grid');
        this.btnCreateNotebook = document.getElementById('btn-create-notebook');
        this.btnBackToNotebooks = document.getElementById('btn-back-to-notebooks');
        this.activeNotebookTitle = document.getElementById('active-notebook-title');
        
        // Elementos da DOM - Editor do Caderno
        this.notebookEditorView = document.getElementById('library-notebook-editor-view');
        this.editorTitle = document.getElementById('editor-notebook-title');
        this.editorTextarea = document.getElementById('notebook-text-content');
        this.btnEditorSave = document.getElementById('btn-save-notebook-content');
        this.btnEditorBack = document.getElementById('btn-editor-back');
        this.editorSaveStatus = document.getElementById('editor-save-status');
        
        // Botão de notificação geral na topbar
        this.btnRequestNotif = document.getElementById('btn-request-notif');
        
        this.init();
    }

    init() {
        if (!this.form) return;

        // Associa submissão do formulário
        this.form.addEventListener('submit', (e) => this.handleSaveNote(e));

        // Associa busca
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.renderNotes());
        }

        // Configuração de Notificações
        if (this.btnRequestNotif) {
            this.btnRequestNotif.addEventListener('click', () => this.requestNotificationPermission());
            this.updateNotificationButtonState();
        }

        // Botões de Cadernos
        if (this.btnCreateNotebook) {
            this.btnCreateNotebook.addEventListener('click', () => this.showInlineNotebookCreator());
        }
        if (this.btnBackToNotebooks) {
            this.btnBackToNotebooks.addEventListener('click', () => this.exitNotebook());
        }

        // Botões e Ações do Editor de Caderno
        if (this.btnEditorSave) {
            this.btnEditorSave.addEventListener('click', () => this.saveActiveNotebookContent(false));
        }
        if (this.btnEditorBack) {
            this.btnEditorBack.addEventListener('click', () => this.exitNotebook());
        }
        if (this.editorTextarea) {
            // Auto-salvamento ao digitar (com debounce)
            this.editorTextarea.addEventListener('input', () => {
                this.showSaveStatus('Salvando...', false);
                clearTimeout(this.autoSaveTimeout);
                this.autoSaveTimeout = setTimeout(() => {
                    this.saveActiveNotebookContent(true);
                }, 1500);
            });
            // Auto-salvamento imediato ao sair do foco
            this.editorTextarea.addEventListener('blur', () => {
                this.saveActiveNotebookContent(true);
            });
        }

        // Monitorar mudança nos botões de cor para marcar o selecionado como ativo
        const colorOptions = document.querySelectorAll('.color-option-btn');
        colorOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                colorOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            });
        });

        // Iniciar intervalo para verificar lembretes agendados a cada 15 segundos
        setInterval(() => this.checkReminders(), 15000);
    }

    // Define o escopo das notas baseado no usuário logado
    setUser(user) {
        this.currentUser = user;
        this.activeNotebookId = null; // Reseta para a raiz da biblioteca ao logar/trocar
        this.resetForm();
        this.renderNotebooks();
    }

    // Carrega notas específicas do usuário atual
    getNotes() {
        if (!this.currentUser) return [];
        try {
            const allNotes = JSON.parse(localStorage.getItem(this.storageKey)) || [];
            // Filtra notas que pertencem ao usuário logado
            return allNotes.filter(note => note.owner === this.currentUser.email);
        } catch (e) {
            return [];
        }
    }

    // Salva notas de volta ao LocalStorage
    saveNotes(notesList) {
        try {
            const allNotes = JSON.parse(localStorage.getItem(this.storageKey)) || [];
            const otherUsersNotes = allNotes.filter(note => note.owner !== this.currentUser.email);
            const combinedNotes = [...otherUsersNotes, ...notesList];
            localStorage.setItem(this.storageKey, JSON.stringify(combinedNotes));
        } catch (e) {
            console.error('Erro ao gravar notas no LocalStorage', e);
        }
    }

    // --- MÉTODOS DE GERENCIAMENTO DE CADERNOS ---

    // Carrega cadernos do usuário atual do LocalStorage
    getNotebooks() {
        if (!this.currentUser) return [];
        try {
            const allNotebooks = JSON.parse(localStorage.getItem(this.notebookStorageKey)) || [];
            return allNotebooks.filter(nb => nb.owner === this.currentUser.email);
        } catch (e) {
            return [];
        }
    }

    // Salva cadernos de volta ao LocalStorage
    saveNotebooks(notebooksList) {
        try {
            const allNotebooks = JSON.parse(localStorage.getItem(this.notebookStorageKey)) || [];
            const otherUsersNotebooks = allNotebooks.filter(nb => nb.owner !== this.currentUser.email);
            const combinedNotebooks = [...otherUsersNotebooks, ...notebooksList];
            localStorage.setItem(this.notebookStorageKey, JSON.stringify(combinedNotebooks));
        } catch (e) {
            console.error('Erro ao gravar cadernos no LocalStorage', e);
        }
    }

    // Cria um novo caderno
    createNotebook(name) {
        if (!name || !this.currentUser) return;
        const notebooks = this.getNotebooks();
        
        // Verifica duplicidade
        if (notebooks.some(nb => nb.name.toLowerCase() === name.toLowerCase())) {
            if (window.showToast) window.showToast('Caderno Existente', 'Já existe um caderno com este nome.', 'warning');
            return;
        }

        const newNotebook = {
            id: 'notebook_' + Date.now(),
            owner: this.currentUser.email,
            name: name,
            content: '',
            createdAt: new Date().toISOString()
        };

        notebooks.push(newNotebook);
        this.saveNotebooks(notebooks);
        
        if (window.showToast) window.showToast('Caderno Criado', `O caderno "${name}" foi adicionado com sucesso.`, 'success');
        
        this.renderNotebooks();
    }

    // Exclui um caderno
    deleteNotebook(id, event) {
        if (event) event.stopPropagation();

        const notebooks = this.getNotebooks();
        const notebook = notebooks.find(nb => nb.id === id);
        if (!notebook) return;

        if (!confirm(`Aviso: Deseja realmente excluir o caderno "${notebook.name}" permanentemente? Seu texto será excluído.`)) {
            return;
        }

        // Filtra caderno
        const updatedNotebooks = notebooks.filter(nb => nb.id !== id);
        this.saveNotebooks(updatedNotebooks);

        if (window.showToast) window.showToast('Caderno Removido', `O caderno foi deletado.`, 'warning');

        this.renderNotebooks();
        if (window.updateDashboardStats) window.updateDashboardStats();
    }

    // Mostra o card do criador inline
    showInlineNotebookCreator() {
        if (!this.notebooksGrid) return;
        
        if (this.notebooksGrid.querySelector('.creator-card')) {
            const input = this.notebooksGrid.querySelector('.notebook-input');
            if (input) input.focus();
            return;
        }

        const creatorCard = document.createElement('div');
        creatorCard.className = 'notebook-card creator-card';
        creatorCard.innerHTML = `
            <i class="fa-solid fa-folder-plus notebook-icon"></i>
            <input type="text" class="notebook-input" placeholder="Nome do caderno..." autofocus maxlength="30">
            <div class="creator-actions">
                <button class="creator-btn save" title="Criar"><i class="fa-solid fa-check"></i></button>
                <button class="creator-btn cancel" title="Cancelar"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `;

        // Inserir no início do grid
        this.notebooksGrid.insertBefore(creatorCard, this.notebooksGrid.firstChild);

        const input = creatorCard.querySelector('.notebook-input');
        input.focus();

        const saveBtn = creatorCard.querySelector('.save');
        const cancelBtn = creatorCard.querySelector('.cancel');

        const handleSave = () => {
            const val = input.value.trim();
            if (val) {
                this.createNotebook(val);
            } else {
                creatorCard.remove();
            }
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleSave();
            } else if (e.key === 'Escape') {
                creatorCard.remove();
            }
        });

        saveBtn.addEventListener('click', handleSave);
        cancelBtn.addEventListener('click', () => creatorCard.remove());
    }

    // Entrar em um Caderno ou Notas Gerais
    enterNotebook(notebookId) {
        this.activeNotebookId = notebookId;
        
        if (notebookId === 'general') {
            if (this.activeNotebookTitle) this.activeNotebookTitle.innerHTML = `<i class="fa-solid fa-folder-open"></i> Notas Gerais`;
            
            if (this.notebooksViewContainer) this.notebooksViewContainer.classList.add('hidden');
            if (this.notebookEditorView) this.notebookEditorView.classList.add('hidden');
            if (this.notesViewContainer) this.notesViewContainer.classList.remove('hidden');

            this.renderNotes();
        } else {
            const notebooks = this.getNotebooks();
            const notebook = notebooks.find(nb => nb.id === notebookId);
            if (!notebook) return;

            if (this.editorTitle) {
                this.editorTitle.innerHTML = `<i class="fa-solid fa-folder-open"></i> Caderno: ${this.escapeHTML(notebook.name)}`;
            }
            if (this.editorTextarea) {
                this.editorTextarea.value = notebook.content || '';
            }
            if (this.editorSaveStatus) {
                this.editorSaveStatus.style.opacity = 0;
            }

            if (this.notebooksViewContainer) this.notebooksViewContainer.classList.add('hidden');
            if (this.notesViewContainer) this.notesViewContainer.classList.add('hidden');
            if (this.notebookEditorView) this.notebookEditorView.classList.remove('hidden');

            setTimeout(() => {
                if (this.editorTextarea) this.editorTextarea.focus();
            }, 100);
        }
    }

    // Salva o conteúdo do caderno ativo
    saveActiveNotebookContent(isAuto = false) {
        if (!this.activeNotebookId || this.activeNotebookId === 'general') return;

        const notebooks = this.getNotebooks();
        const notebookIndex = notebooks.findIndex(nb => nb.id === this.activeNotebookId);
        if (notebookIndex === -1) return;

        const textContent = this.editorTextarea ? this.editorTextarea.value : '';
        
        if (notebooks[notebookIndex].content === textContent) {
            if (isAuto) {
                this.showSaveStatus('Salvo', true);
            }
            return;
        }

        notebooks[notebookIndex].content = textContent;
        notebooks[notebookIndex].updatedAt = new Date().toISOString();
        this.saveNotebooks(notebooks);

        if (isAuto) {
            this.showSaveStatus('Salvo', true);
        } else {
            this.showSaveStatus('Salvo', true);
            if (window.showToast) {
                window.showToast('Caderno Salvo', 'O texto do caderno foi gravado no armazenamento.', 'success');
            }
        }
    }

    // Exibe indicador visual de salvamento no editor
    showSaveStatus(text, fade = true) {
        if (!this.editorSaveStatus) return;
        this.editorSaveStatus.innerHTML = text === 'Salvo' 
            ? `<i class="fa-solid fa-circle-check"></i> Salvo` 
            : `<i class="fa-solid fa-circle-notch fa-spin"></i> ${text}`;
        
        this.editorSaveStatus.style.opacity = 0.8;
        
        if (fade) {
            clearTimeout(this.saveStatusTimeout);
            this.saveStatusTimeout = setTimeout(() => {
                this.editorSaveStatus.style.opacity = 0;
            }, 3000);
        }
    }

    // Sair de um Caderno (Voltar para Lista de Pastas)
    exitNotebook() {
        if (this.activeNotebookId && this.activeNotebookId !== 'general') {
            clearTimeout(this.autoSaveTimeout);
            this.saveActiveNotebookContent(true);
        }

        this.activeNotebookId = null;
        if (this.notesViewContainer) this.notesViewContainer.classList.add('hidden');
        if (this.notebookEditorView) this.notebookEditorView.classList.add('hidden');
        if (this.notebooksViewContainer) this.notebooksViewContainer.classList.remove('hidden');
        
        this.renderNotebooks();
    }

    // Renderiza a lista de cadernos na tela
    renderNotebooks() {
        if (!this.notebooksGrid || !this.currentUser) return;

        this.notebooksGrid.innerHTML = '';

        const notebooks = this.getNotebooks();
        const notes = this.getNotes();

        // 1. Caderno Fixo: Notas Gerais
        const generalNotesCount = notes.length;
        const generalCard = document.createElement('div');
        generalCard.className = 'notebook-card general-folder';
        generalCard.innerHTML = `
            <i class="fa-solid fa-folder-open notebook-icon"></i>
            <h4 class="notebook-title">Notas Gerais</h4>
            <span class="notebook-count">${generalNotesCount} ${generalNotesCount === 1 ? 'nota' : 'notas'}</span>
        `;
        generalCard.addEventListener('click', () => this.enterNotebook('general'));
        this.notebooksGrid.appendChild(generalCard);

        // 2. Cadernos do Usuário
        notebooks.forEach(nb => {
            const card = document.createElement('div');
            card.className = 'notebook-card';
            card.innerHTML = `
                <button class="notebook-delete-btn" title="Excluir Caderno"><i class="fa-solid fa-trash-can"></i></button>
                <i class="fa-solid fa-folder notebook-icon"></i>
                <h4 class="notebook-title" title="${this.escapeHTML(nb.name)}">${this.escapeHTML(nb.name)}</h4>
                <span class="notebook-count">${nb.content ? 'Documento escrito' : 'Vazio'}</span>
            `;

            card.addEventListener('click', () => this.enterNotebook(nb.id));
            
            const delBtn = card.querySelector('.notebook-delete-btn');
            delBtn.addEventListener('click', (e) => this.deleteNotebook(nb.id, e));

            this.notebooksGrid.appendChild(card);
        });
    }

    // Ação de Salvar/Editar Nota Rápida
    handleSaveNote(e) {
        e.preventDefault();
        if (!this.currentUser) return;

        const title = this.titleInput.value.trim();
        const content = this.contentInput.value.trim();
        const editId = this.editIdInput.value;
        const reminderTime = this.reminderTimeInput ? this.reminderTimeInput.value : '';
        
        // Capturar cor selecionada
        const colorRadio = this.form.querySelector('input[name="note-color"]:checked');
        const colorClass = colorRadio ? colorRadio.value : 'note-default';

        if (!title || !content) return;

        let notes = this.getNotes();
        let isEditMode = false;

        if (editId) {
            // Modo Edição
            notes = notes.map(note => {
                if (note.id === editId) {
                    isEditMode = true;
                    const oldReminderTime = note.reminderTime || '';
                    const hasReminderChanged = oldReminderTime !== reminderTime;
                    return {
                        ...note,
                        title,
                        content,
                        color: colorClass,
                        notebookId: null,
                        reminderTime: reminderTime || null,
                        reminderTriggered: hasReminderChanged ? false : (note.reminderTriggered || false),
                        updatedAt: new Date().toISOString()
                    };
                }
                return note;
            });
            if (window.showToast) window.showToast('Nota Atualizada', 'A anotação foi editada com sucesso.', 'success');
        } else {
            // Modo Criação
            const newNote = {
                id: 'note_' + Date.now(),
                owner: this.currentUser.email,
                title,
                content,
                color: colorClass,
                notebookId: null,
                reminderTime: reminderTime || null,
                reminderTriggered: false,
                createdAt: new Date().toISOString()
            };
            notes.unshift(newNote);

            if (window.showToast) window.showToast('Nota Salva', 'Nova anotação adicionada ao seu bloco.', 'success');
        }

        this.saveNotes(notes);
        this.resetForm();

        // Direciona o usuário para as Notas Gerais na Biblioteca
        this.activeNotebookId = 'general';
        
        if (this.notebooksViewContainer) this.notebooksViewContainer.classList.add('hidden');
        if (this.notebookEditorView) this.notebookEditorView.classList.add('hidden');
        if (this.notesViewContainer) this.notesViewContainer.classList.remove('hidden');
        
        if (this.activeNotebookTitle) this.activeNotebookTitle.innerHTML = `<i class="fa-solid fa-folder-open"></i> Notas Gerais`;

        if (window.switchSubView) {
            window.switchSubView('library');
        } else {
            this.renderNotes();
        }
        if (window.updateDashboardStats) window.updateDashboardStats();
    }

    // Excluir Nota
    deleteNote(id) {
        if (!confirm('Deseja realmente excluir esta nota?')) return;
        
        let notes = this.getNotes();
        notes = notes.filter(n => n.id !== id);
        this.saveNotes(notes);
        
        if (window.showToast) window.showToast('Nota Excluída', 'A nota foi deletada permanentemente.', 'warning');
        
        this.renderNotes();
        if (window.updateDashboardStats) window.updateDashboardStats();

        if (this.editIdInput.value === id) {
            this.resetForm();
        }
    }

    // Carregar Nota no Formulário para Edição
    startEditNote(id) {
        const notes = this.getNotes();
        const note = notes.find(n => n.id === id);
        if (!note) return;

        this.editIdInput.value = note.id;
        this.titleInput.value = note.title;
        this.contentInput.value = note.content;
        if (this.reminderTimeInput) {
            this.reminderTimeInput.value = note.reminderTime || '';
        }

        const radio = this.form.querySelector(`input[name="note-color"][value="${note.color}"]`);
        if (radio) {
            radio.checked = true;
            document.querySelectorAll('.color-option-btn').forEach(o => o.classList.remove('active'));
            radio.parentElement.classList.add('active');
        }

        if (window.switchSubView) {
            window.switchSubView('home');
        }

        this.titleInput.scrollIntoView({ behavior: 'smooth' });
        this.titleInput.focus();

        const btnSaveSpan = this.form.querySelector('.btn-save span');
        const btnSaveIcon = this.form.querySelector('.btn-save i');
        if (btnSaveSpan) btnSaveSpan.textContent = 'Atualizar';
        if (btnSaveIcon) btnSaveIcon.className = 'fa-solid fa-arrows-rotate';
    }

    // Renderiza os cards das notas rápidas (Notas Gerais)
    renderNotes() {
        const notes = this.getNotes();
        const searchQuery = this.searchInput ? this.searchInput.value.toLowerCase().trim() : '';

        const noteCards = this.notesGrid.querySelectorAll('.note-card');
        noteCards.forEach(card => card.remove());

        let filteredNotes = notes;

        if (searchQuery) {
            filteredNotes = filteredNotes.filter(n => 
                n.title.toLowerCase().includes(searchQuery) || 
                n.content.toLowerCase().includes(searchQuery)
            );
        }

        if (filteredNotes.length === 0) {
            this.noNotesState.classList.remove('hidden');
            return;
        }

        this.noNotesState.classList.add('hidden');

        filteredNotes.forEach(note => {
            const card = document.createElement('div');
            card.className = `note-card ${note.color}`;
            card.setAttribute('data-id', note.id);

            const date = new Date(note.createdAt);
            const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            const timeBadge = note.reminderTime ? `
                <span class="note-card-time" title="Lembrete agendado">
                    <i class="fa-regular fa-clock"></i> ${note.reminderTime}
                </span>
            ` : '';

            card.innerHTML = `
                <div class="note-header">
                    <h4 class="note-card-title">${this.escapeHTML(note.title)}</h4>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        ${timeBadge}
                    </div>
                </div>
                <p class="note-body">${this.escapeHTML(note.content)}</p>
                <div class="note-actions">
                    <span style="font-size:0.7rem; color:var(--text-muted); margin-right:auto; align-self:center;">${dateStr}</span>
                    <button class="note-action-btn edit" title="Editar Nota"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="note-action-btn delete" title="Excluir Nota"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;

            card.querySelector('.edit').addEventListener('click', () => this.startEditNote(note.id));
            card.querySelector('.delete').addEventListener('click', () => this.deleteNote(note.id));

            this.notesGrid.appendChild(card);
        });
    }

    // Limpa formulário
    resetForm() {
        this.form.reset();
        this.editIdInput.value = '';
        if (this.reminderTimeInput) {
            this.reminderTimeInput.value = '';
        }
        
        document.querySelectorAll('.color-option-btn').forEach(o => o.classList.remove('active'));
        const defaultColor = document.querySelector('.color-default');
        if (defaultColor) {
            defaultColor.classList.add('active');
            defaultColor.querySelector('input').checked = true;
        }

        const btnSaveSpan = this.form.querySelector('.btn-save span');
        const btnSaveIcon = this.form.querySelector('.btn-save i');
        if (btnSaveSpan) btnSaveSpan.textContent = 'Salvar';
        if (btnSaveIcon) btnSaveIcon.className = 'fa-solid fa-plus';
    }

    // --- MÉTODOS DE INTEGRACÃO COM WEB NOTIFICATIONS API ---

    requestNotificationPermission() {
        if (!('Notification' in window)) {
            if (window.showToast) window.showToast('Navegador incompatível', 'Este navegador não oferece suporte a notificações nativas.', 'error');
            return;
        }

        Notification.requestPermission().then(permission => {
            this.updateNotificationButtonState();
            
            if (permission === 'granted') {
                if (window.showToast) window.showToast('Notificações Ativadas', 'Você receberá alertas nativos nos horários agendados.', 'success');
                if (window.logNotificationTrigger) window.logNotificationTrigger('Permissão de Notificação Concedida 🔔', 'success');
                new Notification('FocusFlow', {
                    body: 'Alertas no navegador ativados com sucesso! 🚀',
                    icon: 'assets/images/workspace.png'
                });
            } else if (permission === 'denied') {
                if (window.showToast) window.showToast('Notificações Negadas', 'Permissão negada. Ative manualmente nas configurações do navegador.', 'warning');
                if (window.logNotificationTrigger) window.logNotificationTrigger('Permissão de Notificação Negada 🔕', 'warning');
            }
        });
    }

    updateNotificationButtonState() {
        if (!this.btnRequestNotif) return;

        if (!('Notification' in window)) {
            this.btnRequestNotif.style.display = 'none';
            return;
        }

        const icon = this.btnRequestNotif.querySelector('i');
        const text = this.btnRequestNotif.querySelector('span');

        if (Notification.permission === 'granted') {
            this.btnRequestNotif.className = 'btn-secondary active';
            if (icon) icon.className = 'fa-solid fa-bell';
            if (text) text.textContent = 'Alertas no Navegador Ativados';
            this.btnRequestNotif.disabled = true;
        } else if (Notification.permission === 'denied') {
            this.btnRequestNotif.className = 'btn-secondary';
            if (icon) icon.className = 'fa-solid fa-bell-slash';
            if (text) text.textContent = 'Alertas Bloqueados (clique para ajuda)';
            this.btnRequestNotif.disabled = false;
        } else {
            this.btnRequestNotif.className = 'btn-secondary';
            if (icon) icon.className = 'fa-solid fa-bell-slash';
            if (text) text.textContent = 'Ativar Alertas no Navegador';
            this.btnRequestNotif.disabled = false;
        }
    }

    // Verifica se há lembretes agendados para disparar
    checkReminders() {
        if (!this.currentUser) return;
        const notes = this.getNotes();

        const now = new Date();
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        const currentTimeString = `${currentHours}:${currentMinutes}`;

        let updated = false;

        const updatedNotes = notes.map(note => {
            if (note.reminderTime && !note.reminderTriggered && note.reminderTime === currentTimeString) {
                this.triggerReminderNotification(note);
                note.reminderTriggered = true;
                updated = true;
            }
            return note;
        });

        if (updated) {
            this.saveNotes(updatedNotes);
            if (this.activeNotebookId === 'general') {
                this.renderNotes();
            } else if (!this.activeNotebookId) {
                this.renderNotebooks();
            }
        }
    }

    // Dispara a notificação de lembrete agendado
    triggerReminderNotification(note) {
        if (window.showToast) {
            window.showToast('Lembrete Agendado ⏰', `Está na hora: "${note.title}"`, 'info');
        }

        if ('Notification' in window && Notification.permission === 'granted') {
            const snippet = note.content.length > 80 ? note.content.substring(0, 80) + '...' : note.content;
            try {
                new Notification(`Lembrete: ${note.title}`, {
                    body: snippet,
                    icon: 'assets/images/workspace.png',
                    tag: `reminder-${note.id}`,
                    requireInteraction: true
                });
                if (window.logNotificationTrigger) {
                    window.logNotificationTrigger(`Lembrete disparado para "${note.title}" às ${note.reminderTime} ⏰`, 'success');
                }
            } catch (e) {
                console.error('Erro ao disparar notificação de lembrete', e);
            }
        }
    }

    escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

window.NotepadManager = NotepadManager;
