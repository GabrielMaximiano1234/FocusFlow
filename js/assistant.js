/**
 * ASSISTANT.JS - Assistente de Recomendação Diária do FocusFlow
 * Analisa os hábitos do usuário a partir das tarefas salvas e
 * gera uma linha do tempo personalizada no Dashboard principal.
 */

class DailyAssistantSystem {
    constructor() {
        this.currentUser = null;
        this.notesKey = 'prod_hub_notes';
    }

    init(user) {
        if (!user || !user.email) return;
        this.currentUser = user;
        this.renderRoutine();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const btnRefresh = document.getElementById('btn-refresh-routine');
        if (btnRefresh) {
            // Remove event listeners antigos clonando o botão
            const newBtn = btnRefresh.cloneNode(true);
            btnRefresh.parentNode.replaceChild(newBtn, btnRefresh);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.showToast) {
                    window.showToast("Rotina Recalculada", "Analisamos seus novos hábitos e atualizamos suas sugestões!", "success");
                }
                // Toca som sutil de clique do assistente
                if (window.Gamification && window.Gamification.playSynthSound) {
                    window.Gamification.playSynthSound(587.33, 0.08, 'sine'); // D5
                    setTimeout(() => window.Gamification.playSynthSound(659.25, 0.15, 'sine'), 80); // E5
                }
                this.renderRoutine(true); // render com animação
            });
        }
    }

    // Lê dados de tarefas no localStorage e analisa padrões de categorias e horários
    analyzeHabits() {
        if (!this.currentUser) return { topCategories: [], timeDistribution: {} };

        try {
            const allNotesRaw = localStorage.getItem(this.notesKey);
            if (!allNotesRaw) return { topCategories: [], timeDistribution: {} };

            const allNotes = JSON.parse(allNotesRaw) || [];
            // Filtra tarefas/lembretes ativos ou concluídos do usuário logado
            const userTasks = allNotes.filter(item => 
                item.owner === this.currentUser.email && 
                (item.type === 'Task' || item.type === 'Reminder')
            );

            if (userTasks.length === 0) {
                return { topCategories: [], timeDistribution: {} };
            }

            // 1. Frequência de Categorias
            const categoryCounts = {};
            userTasks.forEach(task => {
                const category = task.category || 'Geral';
                categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            });

            // Ordena categorias pela frequência
            const topCategories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);

            // 2. Frequência de Horários (Manhã, Tarde, Noite)
            const timeDistribution = { morning: 0, afternoon: 0, night: 0 };
            userTasks.forEach(task => {
                let hour = 12; // default
                if (task.reminderTime) {
                    hour = parseInt(task.reminderTime.split(':')[0]);
                } else if (task.createdAt) {
                    hour = new Date(task.createdAt).getHours();
                }

                if (hour >= 6 && hour < 12) {
                    timeDistribution.morning++;
                } else if (hour >= 12 && hour < 18) {
                    timeDistribution.afternoon++;
                } else {
                    timeDistribution.night++;
                }
            });

            return { topCategories, timeDistribution };

        } catch (e) {
            console.error("Erro na análise de hábitos:", e);
            return { topCategories: [], timeDistribution: {} };
        }
    }

    // Gera a linha do tempo baseado nos hábitos ou fornece uma padrão para novos usuários
    generateRoutine() {
        const habits = this.analyzeHabits();
        
        // Se o usuário não tiver dados suficientes (menos de 2 tarefas), fornece rotina padrão balanceada
        if (habits.topCategories.length === 0) {
            return this.getDefaultRoutine();
        }

        const topCat1 = habits.topCategories[0] || 'Trabalho';
        const topCat2 = habits.topCategories[1] || 'Saúde';
        
        // Define ícones dinâmicos para categorias comuns
        const getCategoryIcon = (cat) => {
            const lower = cat.toLowerCase();
            if (lower.includes('trabalho') || lower.includes('work') || lower.includes('job')) return { icon: 'fa-briefcase', color: 'rgba(99, 102, 241, 0.25)', textCol: '#818cf8' };
            if (lower.includes('estudo') || lower.includes('escola') || lower.includes('estudar') || lower.includes('aula')) return { icon: 'fa-graduation-cap', color: 'rgba(168, 85, 247, 0.25)', textCol: '#c084fc' };
            if (lower.includes('saude') || lower.includes('saúde') || lower.includes('treino') || lower.includes('fit') || lower.includes('academia')) return { icon: 'fa-heart-pulse', color: 'rgba(239, 68, 68, 0.25)', textCol: '#f87171' };
            if (lower.includes('fam') || lower.includes('casa') || lower.includes('domest')) return { icon: 'fa-house-user', color: 'rgba(34, 197, 94, 0.25)', textCol: '#4ade80' };
            if (lower.includes('igreja') || lower.includes('espirit')) return { icon: 'fa-church', color: 'rgba(245, 158, 11, 0.25)', textCol: '#fbbf24' };
            if (lower.includes('amigo') || lower.includes('social') || lower.includes('lazer')) return { icon: 'fa-user-group', color: 'rgba(6, 182, 212, 0.25)', textCol: '#22d3ee' };
            return { icon: 'fa-wand-magic-sparkles', color: 'rgba(236, 72, 153, 0.25)', textCol: '#f472b6' };
        };

        const cat1Style = getCategoryIcon(topCat1);
        const cat2Style = getCategoryIcon(topCat2);

        // Constrói a linha do tempo inteligente baseada nos hábitos reais de horário e categoria
        const routine = [];

        // 1. Início de dia padrão e saudável
        routine.push({ time: "07:00", title: "Despertar & Bem-estar", desc: "Alongamento e hidratação. Prepare sua mente para o dia de hoje.", icon: "fa-sun", color: "rgba(234, 179, 8, 0.25)", textCol: "#eab308" });
        routine.push({ time: "07:45", title: "Café da Manhã & Notas", desc: "Revise suas prioridades do FocusFlow durante o café.", icon: "fa-mug-hot", color: "rgba(255, 255, 255, 0.05)", textCol: "#9ca3af" });

        // 2. Bloco do período da Manhã (Focado na categoria que ele mais faz pela manhã ou topCat1)
        const isMorningHeavy = (habits.timeDistribution.morning || 0) >= (habits.timeDistribution.afternoon || 0);
        if (isMorningHeavy) {
            routine.push({ 
                time: "08:30", 
                title: `Foco Produtivo: ${topCat1}`, 
                desc: `Você costuma realizar tarefas de **${topCat1}** pela manhã. Faça um ciclo Pomodoro focado nesta prioridade!`, 
                icon: cat1Style.icon, 
                color: cat1Style.color, 
                textCol: cat1Style.textCol 
            });
        } else {
            routine.push({ 
                time: "08:30", 
                title: "Resolução de Pendências", 
                desc: "Momento reservado para e-mails e pequenos lembretes diários.", 
                icon: "fa-circle-check", 
                color: "rgba(99, 102, 241, 0.25)", 
                textCol: "#818cf8" 
            });
        }

        // 3. Almoço saudável padrão
        routine.push({ time: "12:00", title: "Pausa para Almoço", desc: "Alimente-se de forma leve e saudável. Desconecte do trabalho.", icon: "fa-utensils", color: "rgba(34, 197, 94, 0.25)", textCol: "#4ade80" });

        // 4. Bloco da Tarde (Focado na segunda maior categoria ou topCat1 se for o caso)
        routine.push({ 
            time: "14:00", 
            title: `Ciclo Principal: ${topCat2 !== topCat1 ? topCat2 : topCat1}`, 
            desc: `Período da tarde reservado para o foco profundo em atividades de **${topCat2 !== topCat1 ? topCat2 : topCat1}**.`, 
            icon: cat2Style.icon, 
            color: cat2Style.color, 
            textCol: cat2Style.textCol 
        });

        // 5. Final do dia
        // Se o usuário tem muitas tarefas de Saúde, focar mais nisso no fim de tarde
        if (topCat1 === 'Saúde' || topCat2 === 'Saúde') {
            routine.push({ time: "17:30", title: "Cuidado e Exercício", desc: "Sua rotina mostra que cuidar da Saúde é prioridade. Faça seu treino ou meditação!", icon: "fa-heart-pulse", color: "rgba(239, 68, 68, 0.25)", textCol: "#f87171" });
        } else {
            routine.push({ time: "17:30", title: "Caminhada ou Relaxamento", desc: "Faça uma pausa ativa para oxigenar o cérebro após o bloco de foco.", icon: "fa-person-running", color: "rgba(34, 197, 94, 0.25)", textCol: "#4ade80" });
        }

        // 6. Período da Noite
        const isNightActive = (habits.timeDistribution.night || 0) > (habits.timeDistribution.afternoon || 0);
        if (isNightActive) {
            routine.push({ 
                time: "20:00", 
                title: `Revisão Noturna: ${topCat1}`, 
                desc: `Você costuma trabalhar em **${topCat1}** à noite. Evite tarefas muito estressantes para não prejudicar seu sono.`, 
                icon: cat1Style.icon, 
                color: cat1Style.color, 
                textCol: cat1Style.textCol 
            });
        } else {
            routine.push({ time: "19:30", title: "Jantar & Desconexão", desc: "Jante leve e afaste-se de telas e obrigações profissionais.", icon: "fa-film", color: "rgba(255, 255, 255, 0.05)", textCol: "#9ca3af" });
        }

        routine.push({ time: "22:30", title: "Higiene do Sono", desc: "Apague as luzes fortes, deite-se e aproveite para ler um livro físico.", icon: "fa-bed", color: "rgba(99, 102, 241, 0.25)", textCol: "#818cf8" });

        return routine;
    }

    getDefaultRoutine() {
        return [
            { time: "07:00", title: "Despertar & Alongamento", desc: "Comece o dia oxigenando o corpo com um alongamento leve.", icon: "fa-person-running", color: "rgba(34, 197, 94, 0.25)", textCol: "#4ade80" },
            { time: "07:30", title: "Café da Manhã & Foco", desc: "Alimente-se de forma saudável e revise seus compromissos no FocusFlow.", icon: "fa-mug-hot", color: "rgba(245, 158, 11, 0.25)", textCol: "#fbbf24" },
            { time: "08:30", title: "Ciclo de Foco (Trabalho/Estudo)", desc: "Faça um ciclo completo de Pomodoro concentrando-se nas tarefas prioritárias.", icon: "fa-brain", color: "rgba(99, 102, 241, 0.25)", textCol: "#818cf8" },
            { time: "12:00", title: "Almoço & Descanso", desc: "Faça uma refeição leve e tire 20 minutos para descansar a mente.", icon: "fa-utensils", color: "rgba(34, 197, 94, 0.25)", textCol: "#4ade80" },
            { time: "14:00", title: "Tarefas Gerais & Revisão", desc: "Organize seus cadernos de notas e resolva pendências secundárias.", icon: "fa-clipboard-list", color: "rgba(168, 85, 247, 0.25)", textCol: "#c084fc" },
            { time: "17:30", title: "Exercício Físico / Caminhada", desc: "Hora de se movimentar para manter a energia física em alta.", icon: "fa-heart-pulse", color: "rgba(239, 68, 68, 0.25)", textCol: "#f87171" },
            { time: "19:00", title: "Jantar & Lazer", desc: "Desconecte das responsabilidades e aproveite seu tempo livre.", icon: "fa-film", color: "rgba(6, 182, 212, 0.25)", textCol: "#22d3ee" },
            { time: "22:30", title: "Preparação para Dormir", desc: "Desligue as telas e relaxe com uma leitura para melhorar o sono.", icon: "fa-bed", color: "rgba(99, 102, 241, 0.25)", textCol: "#818cf8" }
        ];
    }

    // Renderiza a linha do tempo estilizada na tela
    renderRoutine(animate = false) {
        const container = document.getElementById('routine-timeline-container');
        if (!container) return;

        const routine = this.generateRoutine();
        
        let animationStyle = animate ? 'animation: slideDown 0.4s ease-out forwards; opacity:0;' : '';

        const timelineHTML = routine.map((event, index) => {
            return `
                <div class="timeline-event" style="display: flex; gap: 16px; margin-bottom: 24px; position: relative; ${animationStyle} animation-delay: ${index * 0.05}s;">
                    <!-- Hora da Atividade -->
                    <div style="font-family: monospace; font-size: 14px; font-weight: bold; color: ${event.textCol}; min-width: 50px; text-align: right; padding-top: 6px;">
                        ${event.time}
                    </div>

                    <!-- Ícone no Centro da Linha -->
                    <div style="position: relative; z-index: 2;">
                        <div class="timeline-icon-box" style="width: 36px; height: 36px; border-radius: 50%; background: ${event.color}; border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; color: ${event.textCol}; box-shadow: 0 0 10px ${event.color}; transition: transform 0.2s;">
                            <i class="fa-solid ${event.icon}"></i>
                        </div>
                    </div>

                    <!-- Conteúdo Explicativo -->
                    <div style="flex-grow: 1; padding: 12px 16px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; transition: background-color 0.2s, border-color 0.2s;" class="timeline-content-card">
                        <h4 style="font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 4px; font-family: 'Outfit', sans-serif;">${event.title}</h4>
                        <p style="font-size: 12px; color: var(--text-muted); line-height: 1.4; margin: 0;">${event.desc}</p>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div style="position: relative; padding-left: 0px;">
                <!-- Trilha vertical conectora (Timeline track) -->
                <div class="timeline-track" style="position: absolute; left: 84px; top: 12px; bottom: 30px; width: 2px; background: linear-gradient(180deg, var(--primary) 0%, var(--secondary) 50%, rgba(255,255,255,0.04) 100%); z-index: 1;"></div>
                
                ${timelineHTML}
            </div>
        `;
    }
}

// Expõe classe de forma global
window.DailyAssistant = new DailyAssistantSystem();
