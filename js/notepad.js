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
        
        // Elementos da DOM - Notas e Modal
        this.modal = document.getElementById('add-item-modal');
        this.modalForm = document.getElementById('modal-item-form');
        this.modalEditId = document.getElementById('modal-edit-id');
        this.modalTitle = document.getElementById('modal-item-title');
        this.modalDate = document.getElementById('modal-item-date');
        this.modalTime = document.getElementById('modal-item-time');
        this.modalType = document.getElementById('modal-item-type');
        this.modalPriority = document.getElementById('modal-item-priority');
        this.modalContent = document.getElementById('modal-item-content');
        this.modalCategoryGrid = document.getElementById('modal-category-grid');
        this.modalCloseX = document.getElementById('modal-close-x');
        this.modalCancelBtn = document.getElementById('modal-cancel-btn');
        this.selectedCategory = '';
        
        this.notesGrid = document.getElementById('notes-grid');
        this.noNotesState = document.getElementById('no-notes-state');
        this.searchInput = document.getElementById('search-notes');
        
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
        // Associa submissão do formulário do modal
        if (this.modalForm) {
            this.modalForm.addEventListener('submit', (e) => this.handleSaveModalItem(e));
        }

        // Categoria no Modal
        if (this.modalCategoryGrid) {
            const catButtons = this.modalCategoryGrid.querySelectorAll('.category-select-btn');
            catButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    catButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.selectedCategory = btn.getAttribute('data-category');
                });
            });
        }

        // Eventos de Fechamento do Modal
        if (this.modalCloseX) {
            this.modalCloseX.addEventListener('click', () => this.closeModal());
        }
        if (this.modalCancelBtn) {
            this.modalCancelBtn.addEventListener('click', () => this.closeModal());
        }
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeModal();
                }
            });
        }

        // Associa busca (com debounce de 250ms para evitar lags de renderização ao digitar)
        let searchTimeout = null;
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => this.renderNotes(), 250);
            });
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

        // Controles do Calendário
        const btnPrevMonth = document.getElementById('btn-prev-month');
        const btnNextMonth = document.getElementById('btn-next-month');
        if (btnPrevMonth) btnPrevMonth.addEventListener('click', () => this.changeCalendarMonth(-1));
        if (btnNextMonth) btnNextMonth.addEventListener('click', () => this.changeCalendarMonth(1));

        // Filtros do Gerenciador de Tarefas
        const filterTaskStatus = document.getElementById('filter-task-status');
        const filterTaskPriority = document.getElementById('filter-task-priority');
        if (filterTaskStatus) filterTaskStatus.addEventListener('change', () => this.renderTasksManager());
        if (filterTaskPriority) filterTaskPriority.addEventListener('change', () => this.renderTasksManager());

        // Iniciar intervalo para verificar lembretes agendados a cada 15 segundos
        setInterval(() => this.checkReminders(), 15000);
    }

    // Define o escopo das notas baseado no usuário logado
    setUser(user) {
        this.currentUser = user;
        this.activeNotebookId = null; // Reseta para a raiz da biblioteca ao logar/trocar
        this.resetModalForm();
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

    // Ação de Salvar/Editar no Modal
    handleSaveModalItem(e) {
        e.preventDefault();
        if (!this.currentUser) return;

        const title = this.modalTitle ? this.modalTitle.value.trim() : '';
        const content = this.modalContent ? this.modalContent.value.trim() : '';
        const editId = this.modalEditId ? this.modalEditId.value : '';
        const reminderDate = this.modalDate ? this.modalDate.value : '';
        const reminderTime = this.modalTime ? this.modalTime.value : '';
        const type = this.modalType ? this.modalType.value : 'Task';
        const priority = this.modalPriority ? this.modalPriority.value : 'Medium';
        const category = this.selectedCategory || '';

        if (!title || !content) return;

        // Mapear categoria para cor
        let colorClass = 'note-default';
        if (category === 'Trabalho') colorClass = 'note-blue';
        else if (category === 'Escola') colorClass = 'note-purple';
        else if (category === 'Família') colorClass = 'note-green';
        else if (category === 'Igreja') colorClass = 'note-amber';
        else if (category === 'Saúde') colorClass = 'note-green';
        else if (category === 'Amigos') colorClass = 'note-blue';
        else if (category === 'Amor') colorClass = 'note-purple';

        let notes = this.getNotes();
        let isEditMode = false;

        if (editId) {
            // Modo Edição
            notes = notes.map(note => {
                if (note.id === editId) {
                    isEditMode = true;
                    const oldReminderDate = note.reminderDate || '';
                    const oldReminderTime = note.reminderTime || '';
                    const hasReminderChanged = oldReminderDate !== reminderDate || oldReminderTime !== reminderTime;
                    return {
                        ...note,
                        title,
                        content,
                        color: colorClass,
                        notebookId: null,
                        reminderDate: reminderDate || null,
                        reminderTime: reminderTime || null,
                        reminderTriggered: hasReminderChanged ? false : (note.reminderTriggered || false),
                        priority,
                        category: category || null,
                        type,
                        updatedAt: new Date().toISOString()
                    };
                }
                return note;
            });
            if (window.showToast) window.showToast('Item Atualizado', 'O item foi editado com sucesso.', 'success');
        } else {
            // Modo Criação
            const newNote = {
                id: 'note_' + Date.now(),
                owner: this.currentUser.email,
                title,
                content,
                color: colorClass,
                notebookId: null,
                reminderDate: reminderDate || null,
                reminderTime: reminderTime || null,
                reminderTriggered: false,
                priority,
                category: category || null,
                type,
                completed: false,
                createdAt: new Date().toISOString()
            };
            notes.unshift(newNote);

            if (window.showToast) window.showToast('Item Salvo', 'Novo item adicionado com sucesso.', 'success');
        }

        this.saveNotes(notes);
        this.closeModal();

        // Se estivermos visualizando Notas Gerais, renderizar
        if (this.activeNotebookId === 'general') {
            this.renderNotes();
        } else if (this.activeNotebookId === null) {
            this.renderNotebooks();
        }

        this.renderCalendar();
        this.renderTasksManager();

        if (window.updateDashboardStats) window.updateDashboardStats();
    }

    // Excluir Nota
    deleteNote(id) {
        if (!confirm('Deseja realmente excluir este item?')) return;
        
        let notes = this.getNotes();
        notes = notes.filter(n => n.id !== id);
        this.saveNotes(notes);
        
        if (window.showToast) window.showToast('Item Excluído', 'O item foi deletado permanentemente.', 'warning');
        
        this.renderNotes();
        this.renderCalendar();
        this.renderTasksManager();

        if (window.updateDashboardStats) window.updateDashboardStats();

        if (this.modalEditId && this.modalEditId.value === id) {
            this.closeModal();
        }
    }

    // Carregar Nota no Formulário para Edição
    startEditNote(id) {
        this.openModal(id);
    }

    // Abrir o Modal de Adição/Edição
    openModal(editId = null) {
        if (!this.modal) return;
        this.resetModalForm();

        if (editId) {
            const notes = this.getNotes();
            const note = notes.find(n => n.id === editId);
            if (note) {
                if (this.modalEditId) this.modalEditId.value = note.id;
                if (this.modalTitle) this.modalTitle.value = note.title || '';
                if (this.modalDate) this.modalDate.value = note.reminderDate || '';
                if (this.modalTime) this.modalTime.value = note.reminderTime || '';
                if (this.modalType) this.modalType.value = note.type || 'Task';
                if (this.modalPriority) this.modalPriority.value = note.priority || 'Medium';
                if (this.modalContent) this.modalContent.value = note.content || '';
                
                this.selectedCategory = note.category || '';
                if (this.modalCategoryGrid) {
                    const catButtons = this.modalCategoryGrid.querySelectorAll('.category-select-btn');
                    catButtons.forEach(btn => {
                        if (btn.getAttribute('data-category') === this.selectedCategory) {
                            btn.classList.add('active');
                        } else {
                            btn.classList.remove('active');
                        }
                    });
                }
            }
        } else {
            if (this.modalDate) {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                this.modalDate.value = `${yyyy}-${mm}-${dd}`;
            }
        }

        this.modal.classList.remove('hidden');
        setTimeout(() => {
            this.modal.style.opacity = '1';
            this.modal.style.pointerEvents = 'auto';
            const modalBox = this.modal.querySelector('.modal-box');
            if (modalBox) {
                modalBox.style.transform = 'scale(1)';
            }
        }, 10);

        if (this.modalTitle) this.modalTitle.focus();
    }

    // Fechar o Modal
    closeModal() {
        if (!this.modal) return;
        this.modal.style.opacity = '0';
        this.modal.style.pointerEvents = 'none';
        const modalBox = this.modal.querySelector('.modal-box');
        if (modalBox) {
            modalBox.style.transform = 'scale(0.9)';
        }
        setTimeout(() => {
            this.modal.classList.add('hidden');
            this.resetModalForm();
        }, 300);
    }

    // Limpar o formulário do Modal
    resetModalForm() {
        if (this.modalForm) {
            this.modalForm.reset();
        }
        if (this.modalEditId) {
            this.modalEditId.value = '';
        }
        this.selectedCategory = '';
        if (this.modalCategoryGrid) {
            const catButtons = this.modalCategoryGrid.querySelectorAll('.category-select-btn');
            catButtons.forEach(btn => btn.classList.remove('active'));
        }
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
            card.className = `note-card ${note.color} ${note.completed ? 'completed' : ''}`;
            card.setAttribute('data-id', note.id);
            if (note.completed) {
                card.style.opacity = '0.6';
            } else {
                card.style.opacity = '1';
            }

            const date = new Date(note.createdAt);
            const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

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

            const timeBadge = timeStr ? `
                <span class="note-card-time" title="Lembrete agendado">
                    <i class="fa-regular fa-clock"></i> ${timeStr}
                </span>
            ` : '';

            const priorityBadge = note.priority ? `
                <span class="badge-priority ${note.priority.toLowerCase()}" style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
                    ${note.priority === 'High' ? 'Alta' : (note.priority === 'Medium' ? 'Média' : 'Baixa')}
                </span>
            ` : '';

            const categoryBadge = note.category ? `
                <span class="badge-category" style="background: rgba(255,255,255,0.08); font-size: 10px; padding: 2px 6px; border-radius: 4px; color: #e5e7eb;">
                    ${this.escapeHTML(note.category)}
                </span>
            ` : '';

            const doneButton = `
                <button class="note-action-btn toggle-done" title="${note.completed ? 'Reabrir tarefa' : 'Concluir tarefa'}" style="color: ${note.completed ? '#22c55e' : 'var(--text-muted)'}; background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0;">
                    <i class="${note.completed ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'}"></i>
                </button>
            `;

            card.innerHTML = `
                <div class="note-header">
                    <h4 class="note-card-title" style="text-decoration: ${note.completed ? 'line-through' : 'none'};">${this.escapeHTML(note.title)}</h4>
                    <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                        ${priorityBadge}
                        ${categoryBadge}
                        ${timeBadge}
                        ${doneButton}
                    </div>
                </div>
                <p class="note-body" style="text-decoration: ${note.completed ? 'line-through' : 'none'};">${this.escapeHTML(note.content)}</p>
                <div class="note-actions">
                    <span style="font-size:0.7rem; color:var(--text-muted); margin-right:auto; align-self:center;">${dateStr}</span>
                    <button class="note-action-btn edit" title="Editar Nota"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="note-action-btn delete" title="Excluir Nota"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;

            card.querySelector('.edit').addEventListener('click', () => this.startEditNote(note.id));
            card.querySelector('.delete').addEventListener('click', () => this.deleteNote(note.id));
            card.querySelector('.toggle-done').addEventListener('click', () => this.toggleNoteCompleted(note.id));

            this.notesGrid.appendChild(card);
        });
    }

    // resetForm foi substituído por resetModalForm e closeModal do modal.

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
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const currentDateString = `${yyyy}-${mm}-${dd}`;

        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        const currentTimeString = `${currentHours}:${currentMinutes}`;

        let updated = false;

        const updatedNotes = notes.map(note => {
            if (note.reminderTime && !note.reminderTriggered) {
                const timeMatches = note.reminderTime === currentTimeString;
                const dateMatches = !note.reminderDate || note.reminderDate === currentDateString;
                if (timeMatches && dateMatches) {
                    this.triggerReminderNotification(note);
                    note.reminderTriggered = true;
                    updated = true;
                }
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
            this.renderCalendar();
            this.renderTasksManager();
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
                    const scheduledTime = note.reminderDate ? `${note.reminderDate} ${note.reminderTime || ''}` : (note.reminderTime || '');
                    window.logNotificationTrigger(`Lembrete disparado para "${note.title}" às ${scheduledTime} ⏰`, 'success');
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

    toggleNoteCompleted(id) {
        let notes = this.getNotes();
        notes = notes.map(note => {
            if (note.id === id) {
                const newStatus = !note.completed;
                if (window.showToast) {
                    window.showToast(
                        newStatus ? 'Tarefa Concluída ✓' : 'Tarefa Reaberta',
                        `A tarefa "${note.title}" foi marcada como ${newStatus ? 'concluída' : 'pendente'}.`,
                        newStatus ? 'success' : 'info'
                    );
                }
                return {
                    ...note,
                    completed: newStatus,
                    updatedAt: new Date().toISOString()
                };
            }
            return note;
        });
        this.saveNotes(notes);
        this.renderNotes();
        if (window.updateDashboardStats) window.updateDashboardStats();
    }

    changeCalendarMonth(offset) {
        if (!this.calendarDate) {
            this.calendarDate = new Date();
        }
        this.calendarDate.setMonth(this.calendarDate.getMonth() + offset);
        this.renderCalendar();
    }

    renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        const monthYearTitle = document.getElementById('calendar-month-year');
        if (!grid || !monthYearTitle) return;

        grid.innerHTML = '';
        const notes = this.getNotes();

        if (!this.calendarDate) {
            this.calendarDate = new Date();
        }

        const year = this.calendarDate.getFullYear();
        const month = this.calendarDate.getMonth();

        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        monthYearTitle.textContent = `${monthNames[month]} de ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day empty';
            cell.style.cssText = 'padding: 10px; opacity: 0.2;';
            grid.appendChild(cell);
        }

        for (let day = 1; day <= totalDays; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day';
            cell.style.cssText = 'padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); cursor: pointer; position: relative; min-height: 48px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; transition: all 0.2s;';
            
            const daySpan = document.createElement('span');
            daySpan.textContent = day;
            daySpan.style.fontSize = '14px';
            daySpan.style.color = '#fff';
            cell.appendChild(daySpan);

            const dayTasks = notes.filter(note => {
                if (note.reminderDate) {
                    const [ry, rm, rd] = note.reminderDate.split('-').map(Number);
                    return ry === year && rm === (month + 1) && rd === day;
                }
                const noteDate = new Date(note.createdAt);
                return noteDate.getFullYear() === year &&
                       noteDate.getMonth() === month &&
                       noteDate.getDate() === day;
            });

            const today = new Date();
            if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === day) {
                cell.style.border = '1px solid #3b82f6';
                cell.style.background = 'rgba(59, 130, 246, 0.1)';
            }

            if (dayTasks.length > 0) {
                const dotContainer = document.createElement('div');
                dotContainer.style.cssText = 'display: flex; gap: 3px; justify-content: center; margin-top: 4px;';
                
                dayTasks.slice(0, 3).forEach(task => {
                    const dot = document.createElement('span');
                    dot.style.cssText = 'width: 6px; height: 6px; border-radius: 50%; display: block;';
                    
                    let dotColor = '#60a5fa';
                    if (task.priority === 'High') dotColor = '#ef4444';
                    else if (task.priority === 'Medium') dotColor = '#f59e0b';
                    else if (task.completed) dotColor = '#10b981';

                    dot.style.background = dotColor;
                    dotContainer.appendChild(dot);
                });
                cell.appendChild(dotContainer);
            }

            cell.addEventListener('click', () => {
                document.querySelectorAll('.calendar-day').forEach(c => c.style.boxShadow = 'none');
                cell.style.boxShadow = '0 0 10px rgba(99, 102, 241, 0.5)';
                this.renderCalendarDayTasks(year, month, day, dayTasks);
            });

            grid.appendChild(cell);
            
            if (today.getDate() === day && today.getMonth() === month && today.getFullYear() === year) {
                this.renderCalendarDayTasks(year, month, day, dayTasks);
            }
        }
    }

    renderCalendarDayTasks(year, month, day, tasks) {
        const container = document.getElementById('calendar-tasks-list');
        if (!container) return;

        container.innerHTML = '';
        
        const titleEl = document.querySelector('#calendar-day-tasks h4');
        if (titleEl) {
            titleEl.textContent = `Tarefas para ${day}/${month + 1}/${year}`;
        }

        if (tasks.length === 0) {
            container.innerHTML = '<p style="color: #9ca3af; font-size: 14px;">Nenhuma tarefa registrada para este dia.</p>';
            return;
        }

        tasks.forEach(note => {
            const div = document.createElement('div');
            div.className = `task-item-horizontal ${note.completed ? 'completed' : ''}`;
            div.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 14px;
                border-radius: 8px;
                background: rgba(255,255,255,0.02);
                border: 1px solid rgba(255,255,255,0.05);
                opacity: ${note.completed ? 0.6 : 1};
            `;

            const priorityBadge = note.priority ? `<span class="badge-priority ${note.priority.toLowerCase()}" style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">${note.priority === 'High' ? 'Alta' : (note.priority === 'Medium' ? 'Média' : 'Baixa')}</span>` : '';
            const categoryBadge = note.category ? `<span class="badge-category" style="background: rgba(255,255,255,0.08); font-size: 10px; padding: 2px 6px; border-radius: 4px; color: #e5e7eb;">${note.category}</span>` : '';
            
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
            const timeBadge = timeStr ? `<span style="font-size: 10px; background: rgba(255,255,255,0.05); color: #9ca3af; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-regular fa-clock"></i> ${timeStr}</span>` : '';

            div.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <span style="font-size: 14px; font-weight: 500; color: #fff; text-decoration: ${note.completed ? 'line-through' : 'none'};">${note.title}</span>
                    <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                        ${priorityBadge}
                        ${categoryBadge}
                        ${timeBadge}
                    </div>
                </div>
                <button class="btn-toggle-day-task" style="background: none; border: none; color: ${note.completed ? '#10b981' : '#8a8ab0'}; cursor: pointer; font-size: 16px; padding: 0;"><i class="${note.completed ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'}"></i></button>
            `;

            div.querySelector('.btn-toggle-day-task').addEventListener('click', () => {
                this.toggleNoteCompleted(note.id);
                setTimeout(() => {
                    const updatedNotes = this.getNotes();
                    const updatedDayTasks = updatedNotes.filter(n => {
                        const noteDate = new Date(n.createdAt);
                        return noteDate.getFullYear() === year &&
                               noteDate.getMonth() === month &&
                               noteDate.getDate() === day;
                    });
                    this.renderCalendarDayTasks(year, month, day, updatedDayTasks);
                    this.renderCalendar();
                }, 100);
            });

            container.appendChild(div);
        });
    }

    renderTasksManager() {
        const container = document.getElementById('tasks-manager-list');
        if (!container) return;

        container.innerHTML = '';
        const notes = this.getNotes();

        const statusFilter = document.getElementById('filter-task-status') ? document.getElementById('filter-task-status').value : 'all';
        const priorityFilter = document.getElementById('filter-task-priority') ? document.getElementById('filter-task-priority').value : 'all';

        let filtered = notes;

        if (statusFilter === 'pending') {
            filtered = filtered.filter(n => !n.completed);
        } else if (statusFilter === 'completed') {
            filtered = filtered.filter(n => n.completed);
        }

        if (priorityFilter !== 'all') {
            filtered = filtered.filter(n => n.priority === priorityFilter);
        }

        if (filtered.length === 0) {
            container.innerHTML = '<p style="color: #9ca3af; font-size: 14px; text-align: center; padding: 20px;">Nenhuma tarefa encontrada para os filtros aplicados.</p>';
            return;
        }

        filtered.forEach(note => {
            const div = document.createElement('div');
            div.className = `tasks-manager-item ${note.color || 'note-default'}`;
            div.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 14px 18px;
                border-radius: 10px;
                background: rgba(255,255,255,0.02);
                border: 1px solid rgba(255,255,255,0.05);
                opacity: ${note.completed ? 0.6 : 1};
            `;

            let pColor = '#a855f7';
            let pName = 'Média';
            if (note.priority === 'High') { pColor = '#ef4444'; pName = 'Alta'; }
            else if (note.priority === 'Medium') { pColor = '#eab308'; pName = 'Média'; }
            else if (note.priority === 'Low') { pColor = '#3b82f6'; pName = 'Baixa'; }

            const priorityBadge = note.priority ? `<span style="font-size: 10px; background: rgba(255,255,255,0.05); border: 1px solid ${pColor}55; color: ${pColor}; font-weight: 600; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">${pName}</span>` : '';
            const categoryBadge = note.category ? `<span style="font-size: 10px; background: rgba(255,255,255,0.08); color: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${note.category}</span>` : '';
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
            const timeBadge = timeStr ? `<span style="font-size: 11px; color: #9ca3af; display: flex; align-items: center; gap: 4px;"><i class="fa-regular fa-clock"></i> ${timeStr}</span>` : '';

            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <button class="btn-toggle-task-manager" style="background: none; border: none; color: ${note.completed ? '#22c55e' : '#8a8ab0'}; cursor: pointer; font-size: 18px; padding: 0;"><i class="${note.completed ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'}"></i></button>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <span style="font-size: 15px; font-weight: 500; color: #fff; text-decoration: ${note.completed ? 'line-through' : 'none'};">${note.title}</span>
                        <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                            ${priorityBadge}
                            ${categoryBadge}
                            ${timeBadge}
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="note-action-btn edit-task" style="background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 6px 10px; border-radius: 6px; cursor: pointer;"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="note-action-btn delete-task" style="background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); padding: 6px 10px; border-radius: 6px; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;

            div.querySelector('.btn-toggle-task-manager').addEventListener('click', () => {
                this.toggleNoteCompleted(note.id);
                setTimeout(() => this.renderTasksManager(), 100);
            });

            div.querySelector('.edit-task').addEventListener('click', () => {
                this.startEditNote(note.id);
            });

            div.querySelector('.delete-task').addEventListener('click', () => {
                this.deleteNote(note.id);
                setTimeout(() => this.renderTasksManager(), 100);
            });

            container.appendChild(div);
        });
    }
}

window.NotepadManager = NotepadManager;
