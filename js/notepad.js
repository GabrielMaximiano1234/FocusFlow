/**
 * NOTEPAD.JS - Módulo do Bloco de Notas e Notificações
 * Gerencia o ciclo de vida das notas do usuário com armazenamento no LocalStorage
 * e dispara notificações no navegador para itens assinalados como Importantes.
 */

class NotepadManager {
    constructor() {
        this.storageKey = 'prod_hub_notes';
        this.currentUser = null;
        
        // Elementos da DOM
        this.form = document.getElementById('note-form');
        this.editIdInput = document.getElementById('edit-note-id');
        this.titleInput = document.getElementById('note-title');
        this.contentInput = document.getElementById('note-content');
        this.importantCheckbox = document.getElementById('note-important');
        this.notesGrid = document.getElementById('notes-grid');
        this.noNotesState = document.getElementById('no-notes-state');
        this.searchInput = document.getElementById('search-notes');
        
        // Filtros
        this.filterAllBtn = document.getElementById('filter-all');
        this.filterImportantBtn = document.getElementById('filter-important');
        this.activeFilter = 'all'; // 'all' ou 'important'
        
        // Botão de notificação geral na topbar
        this.btnRequestNotif = document.getElementById('btn-request-notif');
        
        this.init();
    }

    init() {
        if (!this.form) return;

        // Associa submissão do formulário
        this.form.addEventListener('submit', (e) => this.handleSaveNote(e));

        // Associa busca e filtros
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.renderNotes());
        }

        if (this.filterAllBtn && this.filterImportantBtn) {
            this.filterAllBtn.addEventListener('click', () => this.setFilter('all'));
            this.filterImportantBtn.addEventListener('click', () => this.setFilter('important'));
        }

        // Configuração de Notificações
        if (this.btnRequestNotif) {
            this.btnRequestNotif.addEventListener('click', () => this.requestNotificationPermission());
            this.updateNotificationButtonState();
        }

        // Monitorar mudança nos botões de cor para marcar o selecionado como ativo
        const colorOptions = document.querySelectorAll('.color-option-btn');
        colorOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                colorOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            });
        });
    }

    // Define o escopo das notas baseado no usuário logado
    setUser(user) {
        this.currentUser = user;
        this.resetForm();
        this.renderNotes();
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
            // Filtra fora as notas do usuário atual para reinseri-las atualizadas
            const otherUsersNotes = allNotes.filter(note => note.owner !== this.currentUser.email);
            // Une as notas atualizadas deste usuário com as dos outros
            const combinedNotes = [...otherUsersNotes, ...notesList];
            localStorage.setItem(this.storageKey, JSON.stringify(combinedNotes));
        } catch (e) {
            console.error('Erro ao gravar notas no LocalStorage', e);
        }
    }

    // Ação de Salvar/Editar Nota
    handleSaveNote(e) {
        e.preventDefault();
        if (!this.currentUser) return;

        const title = this.titleInput.value.trim();
        const content = this.contentInput.value.trim();
        const isImportant = this.importantCheckbox.checked;
        const editId = this.editIdInput.value;
        
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
                    return {
                        ...note,
                        title,
                        content,
                        color: colorClass,
                        isImportant,
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
                isImportant,
                createdAt: new Date().toISOString()
            };
            notes.unshift(newNote); // Adiciona no início da lista

            if (window.showToast) window.showToast('Nota Salva', 'Nova anotação adicionada ao seu bloco.', 'success');

            // --- WEB NOTIFICATIONS API ---
            // Se for marcada como IMPORTANTE, envia alerta do sistema
            if (isImportant) {
                this.triggerWebNotification(title, content);
            }
        }

        this.saveNotes(notes);
        this.resetForm();
        this.renderNotes();
    }

    // Excluir Nota
    deleteNote(id) {
        if (!confirm('Deseja realmente excluir esta nota?')) return;
        
        let notes = this.getNotes();
        notes = notes.filter(n => n.id !== id);
        this.saveNotes(notes);
        
        if (window.showToast) window.showToast('Nota Excluída', 'A nota foi deletada permanentemente.', 'warning');
        
        this.renderNotes();

        // Se a nota que estava sendo editada foi excluída, limpa o form
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
        this.importantCheckbox.checked = note.isImportant;

        // Selecionar cor correspondente no formulário
        const radio = this.form.querySelector(`input[name="note-color"][value="${note.color}"]`);
        if (radio) {
            radio.checked = true;
            // Atualiza borda ativa na UI do seletor
            document.querySelectorAll('.color-option-btn').forEach(o => o.classList.remove('active'));
            radio.parentElement.classList.add('active');
        }

        // Rola até o formulário para ficar visível e foca
        this.titleInput.scrollIntoView({ behavior: 'smooth' });
        this.titleInput.focus();

        // Altera o texto do botão de salvar
        const btnSaveSpan = this.form.querySelector('.btn-save span');
        const btnSaveIcon = this.form.querySelector('.btn-save i');
        if (btnSaveSpan) btnSaveSpan.textContent = 'Atualizar';
        if (btnSaveIcon) btnSaveIcon.className = 'fa-solid fa-arrows-rotate';
    }

    // Renderiza os cards das notas
    renderNotes() {
        const notes = this.getNotes();
        const searchQuery = this.searchInput ? this.searchInput.value.toLowerCase().trim() : '';

        // Limpa notas da tela mantendo o estado de vazio reservado
        const noteCards = this.notesGrid.querySelectorAll('.note-card');
        noteCards.forEach(card => card.remove());

        // Filtragem e busca
        let filteredNotes = notes;
        
        // Filtro por categoria (Todas vs Importantes)
        if (this.activeFilter === 'important') {
            filteredNotes = filteredNotes.filter(n => n.isImportant);
        }

        // Busca por texto
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

        // Cria os cards dinamicamente
        filteredNotes.forEach(note => {
            const card = document.createElement('div');
            card.className = `note-card ${note.color} ${note.isImportant ? 'important' : ''}`;
            card.setAttribute('data-id', note.id);

            // Formatando data legível
            const date = new Date(note.createdAt);
            const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            card.innerHTML = `
                <div class="note-header">
                    <h4 class="note-card-title">${this.escapeHTML(note.title)}</h4>
                    ${note.isImportant ? '<span class="note-card-badge" title="Item Importante"><i class="fa-solid fa-triangle-exclamation"></i></span>' : ''}
                </div>
                <p class="note-body">${this.escapeHTML(note.content)}</p>
                <div class="note-actions">
                    <span style="font-size:0.7rem; color:var(--text-muted); margin-right:auto; align-self:center;">${dateStr}</span>
                    <button class="note-action-btn edit" title="Editar Nota"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="note-action-btn delete" title="Excluir Nota"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;

            // Eventos dos botões do card
            card.querySelector('.edit').addEventListener('click', () => this.startEditNote(note.id));
            card.querySelector('.delete').addEventListener('click', () => this.deleteNote(note.id));

            this.notesGrid.appendChild(card);
        });
    }

    // Gerencia botões de filtragem
    setFilter(filterType) {
        this.activeFilter = filterType;
        if (filterType === 'all') {
            this.filterAllBtn.classList.add('active');
            this.filterImportantBtn.classList.remove('active');
        } else {
            this.filterImportantBtn.classList.add('active');
            this.filterAllBtn.classList.remove('active');
        }
        this.renderNotes();
    }

    // Limpa formulário
    resetForm() {
        this.form.reset();
        this.editIdInput.value = '';
        
        // Reseta o visual do seletor de cores
        document.querySelectorAll('.color-option-btn').forEach(o => o.classList.remove('active'));
        const defaultColor = document.querySelector('.color-default');
        if (defaultColor) {
            defaultColor.classList.add('active');
            defaultColor.querySelector('input').checked = true;
        }

        // Reseta texto do botão de salvar
        const btnSaveSpan = this.form.querySelector('.btn-save span');
        const btnSaveIcon = this.form.querySelector('.btn-save i');
        if (btnSaveSpan) btnSaveSpan.textContent = 'Salvar';
        if (btnSaveIcon) btnSaveIcon.className = 'fa-solid fa-plus';
    }

    // --- MÉTODOS DE INTEGRACÃO COM WEB NOTIFICATIONS API ---

    // Solicita permissão para disparar alertas nativos do SO/navegador
    requestNotificationPermission() {
        if (!('Notification' in window)) {
            if (window.showToast) window.showToast('Navegador incompatível', 'Este navegador não oferece suporte a notificações nativas.', 'error');
            return;
        }

        Notification.requestPermission().then(permission => {
            this.updateNotificationButtonState();
            
            if (permission === 'granted') {
                if (window.showToast) window.showToast('Notificações Ativadas', 'Você receberá alertas nativos para notas Importantes.', 'success');
                // Dispara uma notificação de confirmação imediata
                new Notification('Productivity Hub', {
                    body: 'Alertas no navegador ativados com sucesso! 🚀',
                    icon: 'assets/images/workspace.png'
                });
            } else if (permission === 'denied') {
                if (window.showToast) window.showToast('Notificações Negadas', 'Permissão negada. Ative manualmente nas configurações do navegador.', 'warning');
            }
        });
    }

    // Atualiza visualmente o botão de status de notificações
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
            this.btnRequestNotif.disabled = true; // Desabilita pois já está aceito
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

    // Envia alerta nativo no navegador
    triggerWebNotification(title, content) {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'granted') {
            // Limita o conteúdo na notificação para não estourar
            const snippet = content.length > 80 ? content.substring(0, 80) + '...' : content;
            
            try {
                new Notification(`Nota Importante: ${title}`, {
                    body: snippet,
                    icon: 'assets/images/workspace.png',
                    tag: 'important-note', // Evita spam agrupando notificações
                    requireInteraction: true // A notificação fica até o usuário fechar
                });
            } catch (e) {
                console.error('Erro ao tentar disparar Web Notification', e);
            }
        } else if (Notification.permission === 'default') {
            // Solicita permissão se ainda não decidiu
            this.requestNotificationPermission();
        }
    }

    // Auxiliar de escape de string (prevenção simples contra XSS)
    escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

// Vincula classe ao objeto global
window.NotepadManager = NotepadManager;
