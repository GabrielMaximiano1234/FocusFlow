/**
 * GAMIFICATION.JS - FocusFlow Gamification Module
 * Handles User XP, Levels, Streaks, Daily Challenges, Mini-Games, and Zen Break Activities.
 */

class GamificationSystem {
    constructor() {
        this.currentUser = null;
        this.storageKey = null;
        this.state = {
            xp: 0,
            level: 1,
            streak: 0,
            lastLoginDate: null,
            challenges: [],
            highScores: { reflex: null, memory: null }
        };

        // Competidores simulados para o ranking
        this.simulatedPlayers = [
            { name: "Ana Silva", xp: 1250, badge: "Foco Lendário" },
            { name: "Carlos Souza", xp: 980, badge: "Concentração Alfa" },
            { name: "Beatriz Costa", xp: 750, badge: "Estudante Zen" },
            { name: "João Oliveira", xp: 420, badge: "Iniciante Ativo" }
        ];

        // Sintetizador de áudio web nativo para efeitos sonoros leves
        this.soundEnabled = true;
    }

    // Inicializa a gamificação para o usuário atual
    init(user) {
        if (!user || !user.email) return;
        this.currentUser = user;
        this.storageKey = `prod_hub_game_${user.email.replace(/[.@]/g, '_')}`;
        this.loadState();
        this.checkStreakAndLoginPoints();
        this.checkDailyChallenges();
        this.simulateLeaderboardEvolution();
    }

    // Carrega o estado do localStorage
    loadState() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                this.state = JSON.parse(data);
                if (!this.state.highScores) {
                    this.state.highScores = { reflex: null, memory: null };
                }
            } else {
                // Estado inicial
                this.state = {
                    xp: 0,
                    level: 1,
                    streak: 1,
                    lastLoginDate: new Date().toDateString(),
                    challenges: this.generateNewChallenges(),
                    highScores: { reflex: null, memory: null }
                };
                this.saveState();
            }
        } catch (e) {
            console.error("Erro ao carregar estado de gamificação:", e);
        }
    }

    // Salva o estado atual no localStorage
    saveState() {
        if (!this.storageKey) return;
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        } catch (e) {
            console.error("Erro ao salvar estado de gamificação:", e);
        }
    }

    // Verifica streak diária e concede pontos de login
    checkStreakAndLoginPoints() {
        const todayStr = new Date().toDateString();
        if (this.state.lastLoginDate === todayStr) {
            return; // Já fez login hoje
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        let streakUpdated = false;
        if (this.state.lastLoginDate === yesterdayStr) {
            // Fez login no dia anterior, mantém/incrementa streak
            this.state.streak++;
            streakUpdated = true;
        } else if (this.state.lastLoginDate !== null) {
            // Quebrou a streak
            this.state.streak = 1;
            streakUpdated = true;
        }

        this.state.lastLoginDate = todayStr;
        this.saveState();

        // Concede XP de login diário (+50 XP) e bônus de streak
        const streakBonus = this.state.streak * 10;
        const totalLoginXP = 50 + streakBonus;

        setTimeout(() => {
            this.awardXP(totalLoginXP, `Login Diário (Dia ${this.state.streak} 🔥)`);
            if (window.showToast) {
                window.showToast(
                    "Bônus de Acesso Diário!",
                    `Você ganhou +${totalLoginXP} XP por manter sua rotina de foco! Streak atual: ${this.state.streak} dias.`,
                    "success"
                );
            }
        }, 1500);
    }

    // Verifica se os desafios diários precisam ser renovados
    checkDailyChallenges() {
        const todayStr = new Date().toDateString();
        // Se não houver desafios ou eles forem de outro dia, gera novos
        const hasChallengesFromToday = this.state.challenges && 
                                      this.state.challenges.length > 0 && 
                                      this.state.challenges[0].date === todayStr;

        if (!hasChallengesFromToday) {
            this.state.challenges = this.generateNewChallenges();
            this.saveState();
        }
    }

    // Gera 3 novos desafios aleatórios para o dia
    generateNewChallenges() {
        const todayStr = new Date().toDateString();
        const pool = [
            { id: 'tasks_3', text: 'Conclua 3 tarefas na plataforma', target: 3, progress: 0, reward: 60, type: 'task' },
            { id: 'tasks_high_1', text: 'Conclua 1 tarefa de alta prioridade', target: 1, progress: 0, reward: 50, type: 'task_high' },
            { id: 'notes_2', text: 'Crie 2 notas na biblioteca', target: 2, progress: 0, reward: 40, type: 'note' },
            { id: 'pomodoro_1', text: 'Conclua 1 ciclo completo de Foco Pomodoro', target: 1, progress: 0, reward: 70, type: 'focus' },
            { id: 'notes_3', text: 'Organize suas ideias criando 3 itens na biblioteca', target: 3, progress: 0, reward: 50, type: 'note' }
        ];

        // Embaralha e pega 3
        const shuffled = pool.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 3).map(ch => ({
            ...ch,
            date: todayStr,
            completed: false
        }));
    }

    // Lógica para simular que outros competidores ganham alguns pontos aleatórios
    simulateLeaderboardEvolution() {
        this.simulatedPlayers.forEach(p => {
            if (Math.random() > 0.6) {
                p.xp += Math.floor(Math.random() * 15) + 5;
            }
        });
    }

    // Concede XP ao usuário
    awardXP(amount, reason) {
        if (!this.currentUser) return;
        this.state.xp += amount;
        
        // Verifica level up
        const nextLevelThreshold = this.state.level * 200;
        let leveledUp = false;
        
        while (this.state.xp >= nextLevelThreshold) {
            this.state.level++;
            leveledUp = true;
        }

        this.saveState();
        
        // Efeito visual flutuante de ganho de XP
        this.triggerFloatingXP(amount);

        if (leveledUp && window.showToast) {
            this.playSynthSound(440, 0.15, 'triangle');
            setTimeout(() => this.playSynthSound(880, 0.3, 'sine'), 150);
            
            window.showToast(
                "Subiu de Nível! 🌟",
                `Parabéns! Você alcançou o Nível ${this.state.level} com ${this.state.xp} XP total!`,
                "success"
            );
        }

        this.renderChallengesView();
    }

    // Efeito visual dinâmico de pontuação flutuante (+15 XP)
    triggerFloatingXP(amount) {
        const floatDiv = document.createElement("div");
        floatDiv.className = "floating-xp-gain";
        floatDiv.textContent = `+${amount} XP`;
        
        // Posiciona no centro superior ou perto da ação
        floatDiv.style.position = "fixed";
        floatDiv.style.left = "50%";
        floatDiv.style.top = "40%";
        floatDiv.style.transform = "translate(-50%, -50%)";
        floatDiv.style.color = "#a855f7";
        floatDiv.style.fontFamily = "var(--font-display)";
        floatDiv.style.fontWeight = "800";
        floatDiv.style.fontSize = "2rem";
        floatDiv.style.zIndex = "10000";
        floatDiv.style.pointerEvents = "none";
        floatDiv.style.textShadow = "0 0 15px rgba(168, 85, 247, 0.8)";
        
        // Animação inline de fade + subida
        floatDiv.style.animation = "floatXP 1.2s ease-out forwards";
        
        document.body.appendChild(floatDiv);
        
        setTimeout(() => {
            floatDiv.remove();
        }, 1200);
    }

    // Hooks interceptadores para atualizar desafios
    onTaskComplete(task) {
        if (!this.currentUser) return;
        
        // XP Base por concluir tarefa
        let points = 15;
        if (task.priority === 'High') {
            points += 10; // Bônus de prioridade alta
        }
        this.awardXP(points, `Tarefa Concluída: ${task.title}`);

        // Atualiza progresso nos desafios
        this.state.challenges.forEach(ch => {
            if (ch.completed) return;

            if (ch.type === 'task') {
                ch.progress++;
            } else if (ch.type === 'task_high' && task.priority === 'High') {
                ch.progress++;
            }

            this.checkChallengeCompletion(ch);
        });
        this.saveState();
    }

    onNoteCreated() {
        if (!this.currentUser) return;
        
        // XP Base por criar item/nota
        this.awardXP(10, "Nota Criada na Biblioteca");

        // Atualiza progresso nos desafios
        this.state.challenges.forEach(ch => {
            if (ch.completed) return;

            if (ch.type === 'note') {
                ch.progress++;
            }

            this.checkChallengeCompletion(ch);
        });
        this.saveState();
    }

    onFocusSessionComplete() {
        if (!this.currentUser) return;

        // XP por completar foco Pomodoro
        this.awardXP(40, "Ciclo de Foco Completo");

        // Atualiza progresso nos desafios
        this.state.challenges.forEach(ch => {
            if (ch.completed) return;

            if (ch.type === 'focus') {
                ch.progress++;
            }

            this.checkChallengeCompletion(ch);
        });
        this.saveState();
    }

    // Verifica se um desafio atingiu a meta e paga o bônus
    checkChallengeCompletion(ch) {
        if (ch.progress >= ch.target && !ch.completed) {
            ch.completed = true;
            ch.progress = ch.target;
            
            this.playSynthSound(523.25, 0.1, 'sine'); // C5
            setTimeout(() => this.playSynthSound(659.25, 0.1, 'sine'), 100); // E5
            setTimeout(() => this.playSynthSound(783.99, 0.25, 'sine'), 200); // G5
            
            setTimeout(() => {
                this.awardXP(ch.reward, `Desafio Concluído!`);
                if (window.showToast) {
                    window.showToast(
                        "Desafio Diário Concluído! 🏆",
                        `Você completou o desafio: "${ch.text}" e ganhou +${ch.reward} XP bônus!`,
                        "success"
                    );
                }
            }, 800);
        }
    }

    // Retorna a lista unificada de classificação ordenando XP
    getLeaderboardData() {
        const userRow = {
            name: `${this.currentUser ? this.currentUser.name : 'Você'} (Você)`,
            xp: this.state.xp,
            badge: this.getBadgeName(this.state.level),
            isUser: true
        };

        const list = [...this.simulatedPlayers, userRow];
        return list.sort((a, b) => b.xp - a.xp);
    }

    getBadgeName(level) {
        if (level >= 10) return "Mestre de Foco";
        if (level >= 7) return "Foco Lendário";
        if (level >= 5) return "Concentração Alfa";
        if (level >= 3) return "Estudante Zen";
        return "Iniciante Ativo";
    }

    // Sintetizador de som por Web Audio API
    playSynthSound(freq, duration, type = 'sine') {
        if (!this.soundEnabled) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            // Navegador bloqueou áudio ou não suporta
        }
    }

    // --- RENDERIZAÇÃO DA VIEW DE DESAFIOS ---
    renderChallengesView() {
        const container = document.getElementById("view-challenges");
        if (!container) return;

        const streakHTML = `
            <div class="metrics-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
                <div class="metric-card-premium" style="padding: 24px; border-radius: 16px; background: linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%); border: 1px solid rgba(249, 115, 22, 0.25); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; position: relative; overflow: hidden;">
                    <div style="font-size: 3rem; margin-bottom: 10px; filter: drop-shadow(0 0 10px rgba(249,115,22,0.4)); animation: pulseGlow 2s infinite ease-in-out;">🔥</div>
                    <span style="font-size: 13px; color: #f97316; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Streak de Rotina</span>
                    <span style="font-size: 32px; font-weight: 800; color: #fff; margin-top: 5px;">${this.state.streak} Dias Seguidos</span>
                    <p style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">Acesse e crie tarefas todos os dias para acumular bônus multiplicador!</p>
                </div>
                
                <div class="metric-card-premium" style="padding: 24px; border-radius: 16px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%); border: 1px solid rgba(168, 85, 247, 0.25); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 10px; filter: drop-shadow(0 0 10px rgba(168,85,247,0.4));">⭐</div>
                    <span style="font-size: 13px; color: #c084fc; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Seu Progresso</span>
                    <span style="font-size: 32px; font-weight: 800; color: #fff; margin-top: 5px;">Nível ${this.state.level}</span>
                    <span style="font-size: 14px; color: #a855f7; font-weight: 600; margin-top: 4px;">${this.state.xp} / ${this.state.level * 200} XP</span>
                    <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; margin-top: 12px; overflow: hidden;">
                        <div style="width: ${(this.state.xp / (this.state.level * 200)) * 100}%; height: 100%; background: linear-gradient(90deg, var(--primary), var(--secondary));"></div>
                    </div>
                </div>
            </div>
        `;

        const challengesHTML = this.state.challenges.map(ch => {
            const percent = Math.min(100, Math.round((ch.progress / ch.target) * 100));
            return `
                <div class="challenge-item-row" style="padding: 16px; background: rgba(255, 255, 255, 0.02); border: 1px solid ${ch.completed ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.05)'}; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; gap: 16px; transition: all 0.3s;">
                    <div style="flex-grow: 1;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 1.2rem;">${ch.completed ? '✅' : '🎯'}</span>
                            <h4 style="font-size: 14px; color: #fff; font-weight: 600; text-decoration: ${ch.completed ? 'line-through' : 'none'}">${ch.text}</h4>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px; margin-top: 8px;">
                            <div style="flex-grow: 1; height: 5px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden;">
                                <div style="width: ${percent}%; height: 100%; background: ${ch.completed ? 'var(--success)' : 'var(--primary)'};"></div>
                            </div>
                            <span style="font-size: 12px; color: var(--text-muted); font-weight: bold; min-width: 35px; text-align: right;">${ch.progress}/${ch.target}</span>
                        </div>
                    </div>
                    <div style="text-align: right; min-width: 80px;">
                        <span style="font-family: 'Outfit', sans-serif; font-weight: bold; color: ${ch.completed ? 'var(--success)' : '#c084fc'}; display: block;">+${ch.reward} XP</span>
                        <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Recompensa</span>
                    </div>
                </div>
            `;
        }).join('');

        const leaderboardHTML = this.getLeaderboardData().map((player, index) => {
            let posIcon = `${index + 1}º`;
            let highlightStyle = player.isUser ? "background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(99, 102, 241, 0.3);" : "";
            
            if (index === 0) posIcon = "🥇";
            else if (index === 1) posIcon = "🥈";
            else if (index === 2) posIcon = "🥉";

            return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); ${highlightStyle}">
                    <td style="padding: 12px; font-size: 1.2rem; text-align: center; width: 60px;">${posIcon}</td>
                    <td style="padding: 12px; font-weight: ${player.isUser ? 'bold' : 'normal'}; color: ${player.isUser ? 'var(--primary)' : '#fff'};">${player.name}</td>
                    <td style="padding: 12px; text-align: center;"><span style="padding: 4px 8px; border-radius: 100px; font-size: 11px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: var(--text-muted);">${player.badge}</span></td>
                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #fff;">${player.xp} XP</td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="dashboard-card" style="margin-bottom: 24px;">
                <div class="card-header">
                    <h3><i class="fa-solid fa-trophy header-icon"></i> Desafios & Conquistas</h3>
                    <p>Cumpra objetivos de rotina diários e dispute o pódio do ranking FocusFlow.</p>
                </div>
                <div style="padding: 10px 0;">
                    ${streakHTML}
                    
                    <h3 style="font-size: 16px; color: #fff; margin-bottom: 16px; font-family: 'Outfit', sans-serif;"><i class="fa-solid fa-bullseye" style="color: var(--primary); margin-right: 8px;"></i> Desafios Globais do Dia</h3>
                    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px;">
                        ${challengesHTML}
                    </div>

                    <h3 style="font-size: 16px; color: #fff; margin-bottom: 16px; font-family: 'Outfit', sans-serif;"><i class="fa-solid fa-ranking-star" style="color: var(--secondary); margin-right: 8px;"></i> Ranking Semanal da Liga</h3>
                    <div style="overflow-x: auto; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid rgba(255,255,255,0.04);">
                        <table style="width: 100%; border-collapse: collapse; text-align: left;">
                            <thead>
                                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.01);">
                                    <th style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 12px; text-transform: uppercase;">Posição</th>
                                    <th style="padding: 12px; color: var(--text-muted); font-size: 12px; text-transform: uppercase;">Usuário</th>
                                    <th style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 12px; text-transform: uppercase;">Crachá de Conquista</th>
                                    <th style="padding: 12px; text-align: right; color: var(--text-muted); font-size: 12px; text-transform: uppercase;">Total XP</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${leaderboardHTML}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    // --- RENDERIZAÇÃO DA VIEW DE JOGOS ---
    renderGamesView() {
        const container = document.getElementById("view-games");
        if (!container) return;

        // Renderiza apenas se não estiver jogando no momento
        container.innerHTML = `
            <div class="dashboard-card" style="margin-bottom: 24px;">
                <div class="card-header">
                    <h3><i class="fa-solid fa-gamepad header-icon"></i> Jogos de Foco</h3>
                    <p>Exercite sua concentração e agilidade mental. Recordes valem pontos bônus no ranking global!</p>
                </div>
                
                <div id="games-selection-screen" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; padding: 20px 0;">
                    <!-- GAME 1 CARD -->
                    <div class="game-select-card" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.3s; cursor: pointer;" onclick="window.Gamification.startReflexGame()">
                        <div>
                            <div style="font-size: 2.5rem; margin-bottom: 12px;">⚡</div>
                            <h4 style="font-size: 18px; color: #fff; font-family: 'Outfit', sans-serif; margin-bottom: 8px;">Grade de Reflexo</h4>
                            <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin-bottom: 16px;">
                                Clique no bloco iluminado o mais rápido possível por 10 rodadas. Testa seus reflexos rápidos e concentração focada.
                            </p>
                        </div>
                        <div>
                            <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                                <span style="color: var(--text-muted);">Recorde Pessoal:</span>
                                <span style="color: var(--primary); font-weight: bold;">${this.state.highScores.reflex ? this.state.highScores.reflex + ' ms' : 'Nenhum'}</span>
                            </div>
                            <button class="btn-primary" style="width: 100%; margin-top: 16px; padding: 10px; font-size: 13px; background: linear-gradient(135deg, var(--primary), var(--secondary)) !important;">Jogar Agora</button>
                        </div>
                    </div>
                    
                    <!-- GAME 2 CARD -->
                    <div class="game-select-card" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.3s; cursor: pointer;" onclick="window.Gamification.startMemoryGame()">
                        <div>
                            <div style="font-size: 2.5rem; margin-bottom: 12px;">🧠</div>
                            <h4 style="font-size: 18px; color: #fff; font-family: 'Outfit', sans-serif; margin-bottom: 8px;">Sequência de Memória</h4>
                            <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin-bottom: 16px;">
                                Preste atenção na sequência e repita o padrão de cores e sons piscantes na grade. Focado em memorização e foco espacial.
                            </p>
                        </div>
                        <div>
                            <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                                <span style="color: var(--text-muted);">Recorde Pessoal:</span>
                                <span style="color: var(--secondary); font-weight: bold;">${this.state.highScores.memory ? 'Nível ' + this.state.highScores.memory : 'Nenhum'}</span>
                            </div>
                            <button class="btn-primary" style="width: 100%; margin-top: 16px; padding: 10px; font-size: 13px; background: linear-gradient(135deg, var(--secondary), var(--primary)) !important;">Jogar Agora</button>
                        </div>
                    </div>
                </div>

                <div id="game-active-arena" class="hidden" style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 24px;"></div>
            </div>
        `;
    }

    // ==========================================================================
    // MINI-JOGO 1: TESTE DE REFLEXO (REFLEX TEST)
    // ==========================================================================
    startReflexGame() {
        const arena = document.getElementById("game-active-arena");
        const selectionScreen = document.getElementById("games-selection-screen");
        if (!arena || !selectionScreen) return;

        selectionScreen.classList.add("hidden");
        arena.classList.remove("hidden");

        arena.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 20px; max-width: 420px; margin: 0 auto; text-align: center;">
                <div style="display: flex; justify-content: space-between; width: 100%; font-size: 14px; color: var(--text-muted);">
                    <button class="btn-secondary" style="padding: 6px 12px; font-size: 12px; margin-top:0;" onclick="window.Gamification.exitActiveGame()"><i class="fa-solid fa-arrow-left"></i> Voltar</button>
                    <span id="reflex-rounds">Rodada: 0 / 10</span>
                </div>
                
                <h4 style="font-family: 'Outfit', sans-serif; font-size: 18px; color: #fff;" id="reflex-instruction">Clique em "Começar" e aguarde o bloco azul se acender!</h4>
                
                <!-- GRID DE CLIQUES -->
                <div id="reflex-grid-board" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; width: 260px; height: 260px; margin: 10px 0;">
                    ${Array.from({ length: 9 }).map((_, i) => `
                        <div class="reflex-block" data-index="${i}" style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; cursor: pointer; transition: background-color 0.1s, box-shadow 0.1s; display: flex; align-items: center; justify-content: center; font-size: 20px;"></div>
                    `).join('')}
                </div>

                <div id="reflex-controls">
                    <button id="btn-reflex-start" class="btn-primary" style="margin-top:0; padding: 12px 32px;" onclick="window.Gamification.runReflexLogic()">Começar Jogo ⚡</button>
                </div>
            </div>
        `;
    }

    runReflexLogic() {
        const btnStart = document.getElementById("btn-reflex-start");
        const instruction = document.getElementById("reflex-instruction");
        const roundsDisplay = document.getElementById("reflex-rounds");
        const blocks = document.querySelectorAll(".reflex-block");
        if (btnStart) btnStart.style.display = "none";

        let currentRound = 0;
        const totalRounds = 10;
        const reactionTimes = [];
        let startTime = null;
        let activeBlockIndex = null;
        let waitingForClick = false;
        let timeoutId = null;

        const nextRound = () => {
            if (currentRound >= totalRounds) {
                concludeGame();
                return;
            }

            instruction.textContent = "Aguarde ficar azul...";
            instruction.style.color = "var(--text-muted)";
            waitingForClick = false;

            // Limpa qualquer azul ativo anterior
            blocks.forEach(b => {
                b.style.backgroundColor = "rgba(255,255,255,0.04)";
                b.style.borderColor = "rgba(255,255,255,0.08)";
                b.style.boxShadow = "none";
            });

            // Tempo de espera aleatório (entre 1s e 3s) antes de acender
            const delay = Math.random() * 2000 + 1000;
            timeoutId = setTimeout(() => {
                activeBlockIndex = Math.floor(Math.random() * 9);
                const block = blocks[activeBlockIndex];
                block.style.backgroundColor = "var(--primary)";
                block.style.borderColor = "var(--primary)";
                block.style.boxShadow = "0 0 15px var(--primary-glow)";
                
                this.playSynthSound(600, 0.05, 'sine');
                
                instruction.textContent = "CLIQUE AGORA! ⚡";
                instruction.style.color = "#60a5fa";
                startTime = Date.now();
                waitingForClick = true;
            }, delay);
        };

        const concludeGame = () => {
            const avgTime = Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length);
            instruction.style.color = "#fff";
            instruction.innerHTML = `<h3>Resultado do Teste!</h3><p style="font-size:24px; font-weight:bold; color:var(--primary); margin: 8px 0;">${avgTime} ms médio</p>`;
            roundsDisplay.textContent = "Jogo Concluído!";
            
            // Concede pontos
            // Fórmula: Menor tempo = Mais pontos. Máximo 150 XP por um reflexo insano (ex: 200ms)
            const scoreXP = Math.max(10, Math.round((1000 - avgTime) * 0.15));
            
            let isNewRecord = false;
            if (this.state.highScores.reflex === null || avgTime < this.state.highScores.reflex) {
                this.state.highScores.reflex = avgTime;
                isNewRecord = true;
                this.saveState();
            }

            this.playSynthSound(523.25, 0.1, 'sine');
            setTimeout(() => this.playSynthSound(783.99, 0.2, 'sine'), 100);

            const containerControls = document.getElementById("reflex-controls");
            if (containerControls) {
                containerControls.innerHTML = `
                    <div style="margin-bottom:16px; font-size:14px; color:var(--text-primary);">
                        Você ganhou <span style="font-weight:bold; color:#a855f7;">+${scoreXP} XP</span>!
                        ${isNewRecord ? '<br><span style="color:var(--success); font-weight:bold;">🏆 NOVO RECORDE PESSOAL!</span>' : ''}
                    </div>
                    <button class="btn-primary" style="margin-top:0; padding:10px 24px;" onclick="window.Gamification.startReflexGame()">Jogar Novamente</button>
                `;
            }

            this.awardXP(scoreXP, "Partida de Grade de Reflexo");
        };

        // Escuta cliques nos blocos
        blocks.forEach(block => {
            block.addEventListener("click", () => {
                const idx = parseInt(block.getAttribute("data-index"));
                if (waitingForClick && idx === activeBlockIndex) {
                    const reactionTime = Date.now() - startTime;
                    reactionTimes.push(reactionTime);
                    currentRound++;
                    roundsDisplay.textContent = `Rodada: ${currentRound} / ${10}`;
                    
                    this.playSynthSound(800, 0.05, 'sine');
                    
                    block.style.backgroundColor = "var(--success)";
                    block.style.borderColor = "var(--success)";
                    block.style.boxShadow = "0 0 15px var(--success-glow)";
                    
                    waitingForClick = false;
                    setTimeout(nextRound, 600);
                } else if (waitingForClick && idx !== activeBlockIndex) {
                    // Erro: clicou no bloco errado
                    this.playSynthSound(150, 0.15, 'sawtooth');
                    instruction.textContent = "Clicou no bloco errado! +200ms penalidade";
                    instruction.style.color = "var(--error)";
                    reactionTimes.push(500); // Penalidade pesada de 500ms
                    currentRound++;
                    roundsDisplay.textContent = `Rodada: ${currentRound} / ${10}`;
                    waitingForClick = false;
                    setTimeout(nextRound, 1000);
                }
            });
        });

        // Inicia primeira rodada
        nextRound();

        // Expõe ID de intervalo/timeout para cancelamento no logout
        this.activeGameCleanup = () => {
            clearTimeout(timeoutId);
        };
    }

    // ==========================================================================
    // MINI-JOGO 2: SEQUÊNCIA DE MEMÓRIA (SIMON SAYS)
    // ==========================================================================
    startMemoryGame() {
        const arena = document.getElementById("game-active-arena");
        const selectionScreen = document.getElementById("games-selection-screen");
        if (!arena || !selectionScreen) return;

        selectionScreen.classList.add("hidden");
        arena.classList.remove("hidden");

        arena.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 20px; max-width: 420px; margin: 0 auto; text-align: center;">
                <div style="display: flex; justify-content: space-between; width: 100%; font-size: 14px; color: var(--text-muted);">
                    <button class="btn-secondary" style="padding: 6px 12px; font-size: 12px; margin-top:0;" onclick="window.Gamification.exitActiveGame()"><i class="fa-solid fa-arrow-left"></i> Voltar</button>
                    <span id="memory-level">Nível: 1</span>
                </div>
                
                <h4 style="font-family: 'Outfit', sans-serif; font-size: 18px; color: #fff;" id="memory-instruction">Clique em "Começar" e preste atenção na sequência piscante!</h4>
                
                <!-- BOARDS DO SIMON (4 BLOCOS COLORIDOS) -->
                <div id="memory-grid-board" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; width: 240px; height: 240px; margin: 15px 0;">
                    <div class="memory-block" data-index="0" style="background: rgba(239, 68, 68, 0.15); border: 2px solid rgba(239, 68, 68, 0.4); border-radius: 16px 0 0 0; cursor: pointer; transition: all 0.2s;"></div>
                    <div class="memory-block" data-index="1" style="background: rgba(59, 130, 246, 0.15); border: 2px solid rgba(59, 130, 246, 0.4); border-radius: 0 16px 0 0; cursor: pointer; transition: all 0.2s;"></div>
                    <div class="memory-block" data-index="2" style="background: rgba(234, 179, 8, 0.15); border: 2px solid rgba(234, 179, 8, 0.4); border-radius: 0 0 0 16px; cursor: pointer; transition: all 0.2s;"></div>
                    <div class="memory-block" data-index="3" style="background: rgba(34, 197, 94, 0.15); border: 2px solid rgba(34, 197, 94, 0.4); border-radius: 0 0 16px 0; cursor: pointer; transition: all 0.2s;"></div>
                </div>

                <div id="memory-controls">
                    <button id="btn-memory-start" class="btn-primary" style="margin-top:0; padding: 12px 32px;" onclick="window.Gamification.runMemoryLogic()">Começar Jogo 🧠</button>
                </div>
            </div>
        `;
    }

    runMemoryLogic() {
        const btnStart = document.getElementById("btn-memory-start");
        const instruction = document.getElementById("memory-instruction");
        const levelDisplay = document.getElementById("memory-level");
        const blocks = document.querySelectorAll(".memory-block");
        if (btnStart) btnStart.style.display = "none";

        let sequence = [];
        let playerSequence = [];
        let level = 1;
        let isFlashing = false;
        let currentStep = 0;

        // Frequências para sons do Simon: Vermelho (261.63 - Do), Azul (293.66 - Re), Amarelo (329.63 - Mi), Verde (349.23 - Fa)
        const sounds = [261.63, 293.66, 329.63, 349.23];
        const blockStyles = [
            { bgActive: "rgb(239, 68, 68)", shadow: "0 0 20px rgba(239, 68, 68, 0.7)", border: "2px solid #ef4444" },
            { bgActive: "rgb(59, 130, 246)", shadow: "0 0 20px rgba(59, 130, 246, 0.7)", border: "2px solid #3b82f6" },
            { bgActive: "rgb(234, 179, 8)", shadow: "0 0 20px rgba(234, 179, 8, 0.7)", border: "2px solid #eab308" },
            { bgActive: "rgb(34, 197, 94)", shadow: "0 0 20px rgba(34, 197, 94, 0.7)", border: "2px solid #22c55e" }
        ];

        const flashBlock = (index) => {
            return new Promise((resolve) => {
                const block = blocks[index];
                const originalStyle = block.style.backgroundColor;
                const originalBorder = block.style.border;
                
                block.style.backgroundColor = blockStyles[index].bgActive;
                block.style.border = blockStyles[index].border;
                block.style.boxShadow = blockStyles[index].shadow;
                
                this.playSynthSound(sounds[index], 0.25, 'sine');
                
                setTimeout(() => {
                    block.style.backgroundColor = originalStyle;
                    block.style.border = originalBorder;
                    block.style.boxShadow = "none";
                    setTimeout(resolve, 150); // Pausa curta entre flashes
                }, 300);
            });
        };

        const playSequence = async () => {
            isFlashing = true;
            instruction.textContent = "Preste Atenção...";
            instruction.style.color = "var(--warning)";
            
            for (let i = 0; i < sequence.length; i++) {
                await flashBlock(sequence[i]);
            }
            
            isFlashing = false;
            instruction.textContent = "Sua Vez! Repita a sequência.";
            instruction.style.color = "var(--success)";
            playerSequence = [];
            currentStep = 0;
        };

        const startNextLevel = () => {
            levelDisplay.textContent = `Nível: ${level}`;
            // Adiciona um novo passo aleatório à sequência
            sequence.push(Math.floor(Math.random() * 4));
            setTimeout(playSequence, 800);
        };

        const gameOver = () => {
            instruction.textContent = "Fim de Jogo! Você errou a sequência.";
            instruction.style.color = "var(--error)";
            this.playSynthSound(130.81, 0.4, 'sawtooth'); // Baixo Do
            
            // Concede XP: 25 XP por nível concluído
            const scoreXP = (level - 1) * 25;
            const finalLevel = level - 1;

            let isNewRecord = false;
            if (this.state.highScores.memory === null || finalLevel > this.state.highScores.memory) {
                this.state.highScores.memory = finalLevel;
                isNewRecord = true;
                this.saveState();
            }

            const containerControls = document.getElementById("memory-controls");
            if (containerControls) {
                containerControls.innerHTML = `
                    <div style="margin-bottom:16px; font-size:14px; color:var(--text-primary);">
                        Nível alcançado: <span style="font-weight:bold; color:var(--secondary);">${finalLevel}</span>
                        <br>Você ganhou <span style="font-weight:bold; color:#a855f7;">+${scoreXP} XP</span>!
                        ${isNewRecord ? '<br><span style="color:var(--success); font-weight:bold;">🏆 NOVO RECORDE PESSOAL!</span>' : ''}
                    </div>
                    <button class="btn-primary" style="margin-top:0; padding:10px 24px;" onclick="window.Gamification.startMemoryGame()">Jogar Novamente</button>
                `;
            }

            this.awardXP(scoreXP, `Nível ${finalLevel} na Sequência de Memória`);
        };

        // Configura clique de inputs
        blocks.forEach(block => {
            block.addEventListener("mousedown", () => {
                if (isFlashing) return;
                const index = parseInt(block.getAttribute("data-index"));
                block.style.backgroundColor = blockStyles[index].bgActive;
                block.style.border = blockStyles[index].border;
                block.style.boxShadow = blockStyles[index].shadow;
                this.playSynthSound(sounds[index], 0.15, 'sine');
            });

            block.addEventListener("mouseup", () => {
                if (isFlashing) return;
                const index = parseInt(block.getAttribute("data-index"));
                block.style.backgroundColor = ""; // Limpa estilo inline temporário
                block.style.border = "";
                block.style.boxShadow = "";

                playerSequence.push(index);
                
                // Verifica acerto parcial
                if (playerSequence[currentStep] === sequence[currentStep]) {
                    currentStep++;
                    
                    // Se completou a sequência inteira do nível
                    if (currentStep === sequence.length) {
                        level++;
                        instruction.textContent = "Correto! Avançando...";
                        instruction.style.color = "var(--success)";
                        this.playSynthSound(523.25, 0.08, 'sine');
                        setTimeout(() => this.playSynthSound(659.25, 0.08, 'sine'), 80);
                        
                        startNextLevel();
                    }
                } else {
                    gameOver();
                }
            });
        });

        // Inicia
        startNextLevel();

        // Expõe função de cancelamento para limpeza rápida
        this.activeGameCleanup = () => {
            isFlashing = false;
        };
    }

    exitActiveGame() {
        if (this.activeGameCleanup) {
            this.activeGameCleanup();
            this.activeGameCleanup = null;
        }
        this.renderGamesView();
    }


    // ==========================================================================
    // MODO ZEN / RELAXAMENTO DE DESCANSO (POMODORO INTEGRADO)
    // ==========================================================================
    openZenRelax() {
        if (window.checkPlanAccess && !window.checkPlanAccess('games')) {
            return;
        }
        const focusCard = document.querySelector(".focus-card");
        if (!focusCard) return;

        // Cria overlay se não existir
        let overlay = document.getElementById("zen-relax-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "zen-relax-overlay";
            overlay.style.cssText = "position: absolute; top:0; left:0; width:100%; height:100%; background: linear-gradient(135deg, rgba(11, 24, 44, 0.96) 0%, rgba(18, 12, 36, 0.96) 100%); backdrop-filter: blur(20px); border-radius: 16px; z-index: 200; display: flex; flex-direction: column; padding: 24px; box-sizing: border-box; justify-content: space-between; align-items: center;";
            focusCard.style.position = "relative";
            focusCard.appendChild(overlay);
        }

        // Renderiza conteúdo Zen (Breathing + Bubble wrap tabs)
        overlay.innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 12px; align-items:center;">
                <h4 style="font-family:'Outfit', sans-serif; font-size:16px; color:#fff; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-seedling" style="color:var(--success);"></i> Relaxamento Zen do Intervalo</h4>
                <button class="btn-secondary" style="padding: 4px 10px; font-size: 11px; margin-top:0;" onclick="window.Gamification.closeZenRelax()"><i class="fa-solid fa-xmark"></i> Fechar Modo Zen</button>
            </div>

            <!-- MENU ZEN TABS -->
            <div style="display:flex; gap:8px; width:100%; justify-content:center; margin-top:12px;">
                <button id="zen-tab-breath" class="auth-tab-btn active" style="font-size:12px; padding: 6px 12px;" onclick="window.Gamification.switchZenTab('breath')">🧘 Guia de Respiração</button>
                <button id="zen-tab-bubbles" class="auth-tab-btn" style="font-size:12px; padding: 6px 12px;" onclick="window.Gamification.switchZenTab('bubbles')">🧼 Plástico Bolha</button>
            </div>

            <!-- CONTEÚDO ZEN -->
            <div style="flex-grow:1; display:flex; align-items:center; justify-content:center; width:100%; min-height: 220px;">
                <!-- TAB 1: BREATHING GUIDE -->
                <div id="zen-content-breath" style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px;">
                    <div id="breathing-circle-wrapper" style="width: 140px; height: 140px; border-radius:50%; background: radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(168, 85, 247, 0.1) 100%); border: 2px dashed rgba(16, 185, 129, 0.4); display:flex; align-items:center; justify-content:center; transition: transform 4s cubic-bezier(0.4, 0, 0.2, 1); transform: scale(0.8);">
                        <span id="breathing-instruction" style="font-size: 14px; font-weight:bold; color: #fff; font-family:'Outfit', sans-serif;">Aguardando...</span>
                    </div>
                    <span id="breathing-timer" style="font-size: 12px; color: var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Técnica Respiração Quadrada (Box Breathing)</span>
                </div>

                <!-- TAB 2: BUBBLE WRAP -->
                <div id="zen-content-bubbles" class="hidden" style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; width:100%;">
                    <div id="bubble-wrap-grid" style="display:grid; grid-template-columns: repeat(6, 1fr); gap: 10px; width: 100%; max-width: 320px; padding: 8px;">
                        ${Array.from({ length: 24 }).map((_, i) => `
                            <div class="bubble-wrap-dot" style="width:36px; height:36px; border-radius:50%; background:radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, rgba(255,255,255,0.03) 100%); border:1px solid rgba(255,255,255,0.12); cursor:pointer; transition: all 0.2s; box-shadow: inset 0 2px 4px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3);" onclick="window.Gamification.popBubble(this)"></div>
                        `).join('')}
                    </div>
                    <button class="btn-secondary" style="padding: 6px 12px; font-size:12px; margin-top:0;" onclick="window.Gamification.resetBubbleWrap()"><i class="fa-solid fa-sync"></i> Reabastecer Bolhas</button>
                </div>
            </div>

            <div style="font-size: 11px; color:var(--text-muted); text-align:center; padding-top: 8px; border-top:1px solid rgba(255,255,255,0.04); width:100%;">
                💡 Atividades relaxantes não contabilizam XP para fins competitivos.
            </div>
        `;

        // Inicia a lógica de respiração dinâmica
        this.runBreathingGuide();
    }

    switchZenTab(tab) {
        const tabBreath = document.getElementById("zen-tab-breath");
        const tabBubbles = document.getElementById("zen-tab-bubbles");
        const contentBreath = document.getElementById("zen-content-breath");
        const contentBubbles = document.getElementById("zen-content-bubbles");

        if (tab === 'breath') {
            tabBreath.classList.add("active");
            tabBubbles.classList.remove("active");
            contentBreath.classList.remove("hidden");
            contentBubbles.classList.add("hidden");
            this.runBreathingGuide();
        } else {
            tabBreath.classList.remove("active");
            tabBubbles.classList.add("active");
            contentBreath.classList.add("hidden");
            contentBubbles.classList.remove("hidden");
            this.stopBreathingGuide();
        }
    }

    runBreathingGuide() {
        this.stopBreathingGuide(); // Limpeza anterior
        
        const circle = document.getElementById("breathing-circle-wrapper");
        const instruction = document.getElementById("breathing-instruction");
        if (!circle || !instruction) return;

        let cycle = 0; // 0 = Inhale (4s), 1 = Hold (4s), 2 = Exhale (4s), 3 = Hold (4s)
        
        const breathingCycle = () => {
            if (!document.getElementById("breathing-circle-wrapper")) return; // Overlay fechado

            if (cycle === 0) {
                // INSPIRE
                instruction.textContent = "INSPIRE";
                circle.style.transform = "scale(1.2)";
                circle.style.borderColor = "var(--success)";
                circle.style.background = "radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, rgba(168, 85, 247, 0.1) 100%)";
                this.playSynthSound(300, 0.1, 'sine');
                cycle = 1;
            } else if (cycle === 1) {
                // SEGURE
                instruction.textContent = "SEGURE";
                circle.style.transform = "scale(1.2)"; // Mantém expandido
                circle.style.borderColor = "var(--warning)";
                circle.style.background = "radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, rgba(168, 85, 247, 0.1) 100%)";
                this.playSynthSound(350, 0.15, 'sine');
                cycle = 2;
            } else if (cycle === 2) {
                // EXPIRE
                instruction.textContent = "EXPIRE";
                circle.style.transform = "scale(0.85)";
                circle.style.borderColor = "var(--primary)";
                circle.style.background = "radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, rgba(168, 85, 247, 0.1) 100%)";
                this.playSynthSound(400, 0.1, 'sine');
                cycle = 3;
            } else {
                // SEGURE
                instruction.textContent = "SEGURE";
                circle.style.transform = "scale(0.85)"; // Mantém contraído
                circle.style.borderColor = "var(--warning)";
                circle.style.background = "radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, rgba(168, 85, 247, 0.1) 100%)";
                this.playSynthSound(350, 0.15, 'sine');
                cycle = 0;
            }
        };

        // Executa imediatamente e depois a cada 4 segundos (Box Breathing)
        breathingCycle();
        this.breathingInterval = setInterval(breathingCycle, 4000);
    }

    stopBreathingGuide() {
        if (this.breathingInterval) {
            clearInterval(this.breathingInterval);
            this.breathingInterval = null;
        }
    }

    popBubble(element) {
        if (element.classList.contains("popped")) return;
        
        element.classList.add("popped");
        // Efeito visual bolha estourada
        element.style.background = "rgba(255, 255, 255, 0.01)";
        element.style.boxShadow = "inset 0 1px 2px rgba(0,0,0,0.6)";
        element.style.borderColor = "rgba(255,255,255,0.03)";
        element.style.transform = "scale(0.9)";
        
        // Som de "pop" sintético
        this.playSynthSound(800 + Math.random() * 200, 0.03, 'sine');
        setTimeout(() => this.playSynthSound(100 + Math.random() * 100, 0.04, 'triangle'), 10);
    }

    resetBubbleWrap() {
        const wrapGrid = document.getElementById("bubble-wrap-grid");
        if (!wrapGrid) return;
        
        // Regenera bolhas
        wrapGrid.innerHTML = Array.from({ length: 24 }).map((_, i) => `
            <div class="bubble-wrap-dot" style="width:36px; height:36px; border-radius:50%; background:radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, rgba(255,255,255,0.03) 100%); border:1px solid rgba(255,255,255,0.12); cursor:pointer; transition: all 0.2s; box-shadow: inset 0 2px 4px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3);" onclick="window.Gamification.popBubble(this)"></div>
        `).join('');
        this.playSynthSound(440, 0.15, 'sine');
    }

    closeZenRelax() {
        this.stopBreathingGuide();
        const overlay = document.getElementById("zen-relax-overlay");
        if (overlay) {
            overlay.remove();
        }
    }
}

// Expõe classe de forma global
window.Gamification = new GamificationSystem();
