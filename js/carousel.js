/**
 * CAROUSEL.JS - Controle do Carrossel Dinâmico
 * Gerencia a troca de slides, indicadores visuais e comportamento de autoplay inteligente.
 */

class FocusCarousel {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.slides = this.container.querySelectorAll('.carousel-slide');
        this.prevBtn = this.container.querySelector('.prev-btn');
        this.nextBtn = this.container.querySelector('.next-btn');
        this.dotsContainer = this.container.querySelector('.carousel-dots');
        
        this.currentIndex = 0;
        this.totalSlides = this.slides.length;
        this.autoplayTimer = null;
        this.autoplayInterval = 6000; // 6 segundos por imagem

        this.init();
    }

    init() {
        if (this.totalSlides === 0) return;

        // Limpa e recria bolinhas indicadoras para bater exatamente com a quantidade de slides
        this.setupDots();

        // Registra listeners de botões
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => {
                this.prevSlide();
                this.resetAutoplay();
            });
        }

        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => {
                this.nextSlide();
                this.resetAutoplay();
            });
        }

        // Adiciona pausa ao passar o mouse por cima
        this.container.addEventListener('mouseenter', () => this.stopAutoplay());
        this.container.addEventListener('mouseleave', () => this.startAutoplay());

        // Inicia Autoplay inicial
        this.startAutoplay();
    }

    setupDots() {
        if (!this.dotsContainer) return;
        
        this.dotsContainer.innerHTML = '';
        for (let i = 0; i < this.totalSlides; i++) {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            if (i === this.currentIndex) dot.classList.add('active');
            dot.setAttribute('data-index', i);
            
            dot.addEventListener('click', (e) => {
                const targetIndex = parseInt(e.target.getAttribute('data-index'));
                this.goToSlide(targetIndex);
                this.resetAutoplay();
            });
            
            this.dotsContainer.appendChild(dot);
        }
        this.dots = this.dotsContainer.querySelectorAll('.dot');
    }

    goToSlide(index) {
        // Garante os limites ciclando o carrossel
        if (index < 0) {
            index = this.totalSlides - 1;
        } else if (index >= this.totalSlides) {
            index = 0;
        }

        // Remove classe ativa do anterior
        this.slides[this.currentIndex].classList.remove('active');
        if (this.dots && this.dots[this.currentIndex]) {
            this.dots[this.currentIndex].classList.remove('active');
        }

        // Atualiza índice atual
        this.currentIndex = index;

        // Ativa o novo slide
        this.slides[this.currentIndex].classList.add('active');
        if (this.dots && this.dots[this.currentIndex]) {
            this.dots[this.currentIndex].classList.add('active');
        }
    }

    nextSlide() {
        this.goToSlide(this.currentIndex + 1);
    }

    prevSlide() {
        this.goToSlide(this.currentIndex - 1);
    }

    startAutoplay() {
        this.stopAutoplay(); // Evita timers duplicados
        this.autoplayTimer = setInterval(() => {
            this.nextSlide();
        }, this.autoplayInterval);
    }

    stopAutoplay() {
        if (this.autoplayTimer) {
            clearInterval(this.autoplayTimer);
            this.autoplayTimer = null;
        }
    }

    resetAutoplay() {
        this.stopAutoplay();
        this.startAutoplay();
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Inicialização será disparada pelo app.js ao exibir o Dashboard
    window.FocusCarousel = FocusCarousel;
});
