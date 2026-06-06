/**
 * POMODORO.JS - Controle do Modo Foco e Descanso
 * Implementa o timer Pomodoro imersivo integrado à Central de Alertas e Toasts.
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
        this.container = document.querySelector('.timer-display-container');

        // Configurações do Timer
        this.totalSeconds = 25 * 60; // 25:00 default
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

        // Associar eventos
        this.btnStart.addEventListener('click', () => this.startFocus());
        this.btnPause.addEventListener('click', () => this.pause());
        this.btnBreak.addEventListener('click', () => this.startBreak());
        this.btnReset.addEventListener('click', () => this.reset());

        // Inicializar círculo de progresso
        this.setProgress(1);
    }

    startFocus() {
        this.currentMode = 'focus';
        this.totalSeconds = 25 * 60;
        this.labelDisplay.textContent = 'Foco';
        this.container.classList.remove('break-mode');
        this.progressBar.style.stroke = 'var(--primary)';
        this.progressBar.style.filter = 'drop-shadow(0 0 10px var(--primary-glow))';
        
        this.startCountdown();
    }

    startBreak() {
        this.currentMode = 'break';
        this.totalSeconds = 5 * 60;
        this.labelDisplay.textContent = 'Descanso';
        this.container.classList.add('break-mode');
        this.progressBar.style.stroke = 'var(--success)';
        this.progressBar.style.filter = 'drop-shadow(0 0 10px var(--success-glow))';
        
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
        if (this.currentMode === 'focus') {
            this.totalSeconds = 25 * 60;
            this.labelDisplay.textContent = 'Foco';
            this.container.classList.remove('break-mode');
            this.progressBar.style.stroke = 'var(--primary)';
            this.progressBar.style.filter = 'drop-shadow(0 0 10px var(--primary-glow))';
        } else {
            this.totalSeconds = 5 * 60;
            this.labelDisplay.textContent = 'Descanso';
            this.container.classList.add('break-mode');
            this.progressBar.style.stroke = 'var(--success)';
            this.progressBar.style.filter = 'drop-shadow(0 0 10px var(--success-glow))';
        }
        this.secondsLeft = this.totalSeconds;
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
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.pomodoroTimer = new PomodoroTimer();
});
