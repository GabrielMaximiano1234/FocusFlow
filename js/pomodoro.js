/**
 * POMODORO.JS - Controle do Modo Foco e Descanso
 * Implementa o timer Pomodoro imersivo com tempos configuráveis,
 * botão de relaxamento dinâmico no intervalo e integração de gamificação.
 */

class PomodoroTimer {
    constructor() {
        // Elementos do DOM
        this.timeDisplay = document.getElementById('timer-display-time');
        this.labelDisplay = document.getElementById('timer-display-label');
        this.progressBar = document.getElementById('timer-progress');
        this.btnStart = document.getElementById('btn-timer-start');
        this.btnPause = document.getElementById('btn-timer-pause');
        this.btnBreak = document.getElementById('btn-timer-break');
        this.btnReset = document.getElementById('btn-timer-reset');
        this.btnRelax = document.getElementById('btn-timer-relax');
        this.inputFocus = document.getElementById('pomodoro-focus-time');
        this.inputBreak = document.getElementById('pomodoro-break-time');
        this.container = document.querySelector('.timer-display-container');

        // Configurações do Timer (Duração padrão e carregamento do localStorage)
        this.focusDuration = parseInt(localStorage.getItem('pomodoro_focus_duration') || 25) * 60;
        this.breakDuration = parseInt(localStorage.getItem('pomodoro_break_duration') || 5) * 60;

        this.totalSeconds = this.focusDuration;
        this.secondsLeft = this.totalSeconds;
        this.timerInterval = null;
        this.isRunning = false;
        this.currentMode = 'focus'; // 'focus' ou 'break'

        // Circunferência do círculo SVG (2 * Math.PI * r) -> 2 * 3.14159 * 120 = 753.98
        this.circumference = 753.98;

        this.init();
    }

    init() {
        if (!this.timeDisplay) return;

        // Preencher inputs com valores carregados
        if (this.inputFocus) this.inputFocus.value = this.focusDuration / 60;
        if (this.inputBreak) this.inputBreak.value = this.breakDuration / 60;

        // Associar eventos
        this.btnStart.addEventListener('click', () => this.startFocus());
        this.btnPause.addEventListener('click', () => this.pause());
        this.btnBreak.addEventListener('click', () => this.startBreak());
        this.btnReset.addEventListener('click', () => this.reset());

        if (this.btnRelax) {
            this.btnRelax.addEventListener('click', () => {
                if (window.Gamification) {
                    window.Gamification.openZenRelax();
                }
            });
        }

        // Listener para alteração do tempo de Foco
        if (this.inputFocus) {
            this.inputFocus.addEventListener('change', () => {
                if (window.checkPlanAccess && !window.checkPlanAccess('challenges')) {
                    this.inputFocus.value = 25;
                    this.focusDuration = 25 * 60;
                    return;
                }
                let val = parseInt(this.inputFocus.value);
                if (isNaN(val) || val < 1) val = 1;
                if (val > 120) val = 120;
                this.inputFocus.value = val;
                this.focusDuration = val * 60;
                localStorage.setItem('pomodoro_focus_duration', val);
                
                if (this.currentMode === 'focus' && !this.isRunning) {
                    this.totalSeconds = this.focusDuration;
                    this.secondsLeft = this.totalSeconds;
                    this.updateUI();
                }
            });
        }

        // Listener para alteração do tempo de Descanso
        if (this.inputBreak) {
            this.inputBreak.addEventListener('change', () => {
                if (window.checkPlanAccess && !window.checkPlanAccess('challenges')) {
                    this.inputBreak.value = 5;
                    this.breakDuration = 5 * 60;
                    return;
                }
                let val = parseInt(this.inputBreak.value);
                if (isNaN(val) || val < 1) val = 1;
                if (val > 120) val = 120;
                this.inputBreak.value = val;
                this.breakDuration = val * 60;
                localStorage.setItem('pomodoro_break_duration', val);
                
                if (this.currentMode === 'break' && !this.isRunning) {
                    this.totalSeconds = this.breakDuration;
                    this.secondsLeft = this.totalSeconds;
                    this.updateUI();
                }
            });
        }

        // Inicializar círculo de progresso e botão de relaxamento
        this.setProgress(1);
        this.updateRelaxButtonVisibility();
    }

    startFocus() {
        this.currentMode = 'focus';
        this.totalSeconds = this.focusDuration;
        this.labelDisplay.textContent = 'Foco';
        this.container.classList.remove('break-mode');
        this.progressBar.style.stroke = 'var(--primary)';
        this.progressBar.style.filter = 'drop-shadow(0 0 10px var(--primary-glow))';
        
        this.updateRelaxButtonVisibility();
        this.startCountdown();
    }

    startBreak() {
        this.currentMode = 'break';
        this.totalSeconds = this.breakDuration;
        this.labelDisplay.textContent = 'Descanso';
        this.container.classList.add('break-mode');
        this.progressBar.style.stroke = 'var(--success)';
        this.progressBar.style.filter = 'drop-shadow(0 0 10px var(--success-glow))';
        
        this.updateRelaxButtonVisibility();
        this.startCountdown();
    }

    startCountdown() {
        // Se já está rodando, reinicia com a nova duração
        this.pause();
        
        this.secondsLeft = this.totalSeconds;
        this.isRunning = true;
        this.updateUI();

        this.btnStart.disabled = true;
        this.btnPause.disabled = false;
        this.container.classList.add('timer-running');

        this.timerInterval = setInterval(() => {
            this.secondsLeft--;
            this.updateUI();

            if (this.secondsLeft <= 0) {
                this.expire();
            }
        }, 1000);
    }

    pause() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.isRunning = false;
        this.btnStart.disabled = false;
        this.btnPause.disabled = true;
        this.container.classList.remove('timer-running');
    }

    reset() {
        this.pause();
        
        // Fecha o jogo zen se estiver aberto
        if (window.Gamification && window.Gamification.closeZenRelax) {
            window.Gamification.closeZenRelax();
        }

        if (this.currentMode === 'focus') {
            this.totalSeconds = this.focusDuration;
            this.labelDisplay.textContent = 'Foco';
            this.container.classList.remove('break-mode');
            this.progressBar.style.stroke = 'var(--primary)';
            this.progressBar.style.filter = 'drop-shadow(0 0 10px var(--primary-glow))';
        } else {
            this.totalSeconds = this.breakDuration;
            this.labelDisplay.textContent = 'Descanso';
            this.container.classList.add('break-mode');
            this.progressBar.style.stroke = 'var(--success)';
            this.progressBar.style.filter = 'drop-shadow(0 0 10px var(--success-glow))';
        }
        this.secondsLeft = this.totalSeconds;
        this.updateRelaxButtonVisibility();
        this.updateUI();
    }

    expire() {
        this.pause();
        
        const modeTitle = this.currentMode === 'focus' ? 'Foco Concluído! 🎯' : 'Descanso Terminado! ☕';
        const modeDesc = this.currentMode === 'focus' 
            ? 'Ótimo trabalho! Hora de fazer uma pausa curta.' 
            : 'Energias recarregadas! Pronto para focar novamente?';

        // 1. Toast
        if (window.showToast) {
            window.showToast(modeTitle, modeDesc, 'success');
        }

        // 2. Notificação Nativa
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(modeTitle, {
                    body: modeDesc,
                    icon: 'assets/images/workspace.png',
                    tag: 'pomodoro-timer'
                });
            } catch (e) {
                console.error('Erro ao disparar notificação pomodoro', e);
            }
        }

        // 3. Log de Notificação
        if (window.logNotificationTrigger) {
            window.logNotificationTrigger(`${modeTitle} - ${modeDesc}`, 'success');
        }

        // 4. Conceder XP se for fim do Foco
        if (this.currentMode === 'focus') {
            if (window.Gamification) {
                window.Gamification.onFocusSessionComplete();
            }
        }

        // Reset
        this.reset();
    }

    updateUI() {
        // Formata tempo (MM:SS)
        const minutes = Math.floor(this.secondsLeft / 60);
        const seconds = this.secondsLeft % 60;
        const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        this.timeDisplay.textContent = timeStr;

        // Atualiza progresso circular
        const percent = this.secondsLeft / this.totalSeconds;
        this.setProgress(percent);
    }

    setProgress(percent) {
        if (!this.progressBar) return;
        const offset = this.circumference - (percent * this.circumference);
        this.progressBar.style.strokeDashoffset = offset;
    }

    // Gerencia exibição condicional do botão de relaxamento de descanso
    updateRelaxButtonVisibility() {
        if (!this.btnRelax) return;
        if (this.currentMode === 'break') {
            const plan = window.getUserPlan ? window.getUserPlan() : 'Iniciante Ativo';
            if (plan === 'Iniciante Ativo') {
                this.btnRelax.classList.add('hidden');
            } else {
                this.btnRelax.classList.remove('hidden');
            }
        } else {
            this.btnRelax.classList.add('hidden');
        }
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.pomodoroTimer = new PomodoroTimer();
});
