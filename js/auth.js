/**
 * AUTH.JS - Módulo de Autenticação e Validação
 * Gerencia o cadastro, login e verificação de usuários simulando um banco local.
 */

// Chaves para LocalStorage / SessionStorage
const STORAGE_USERS_KEY = 'prod_hub_users';
const STORAGE_SESSION_KEY = 'prod_hub_current_user';

// --- UTILITÁRIO DE COMUNICAÇÃO ENTRE VIEW E CONTROLADOR ---
const Auth = {
    // Retorna o usuário logado atualmente (ou null)
    getCurrentUser() {
        try {
            return JSON.parse(sessionStorage.getItem(STORAGE_SESSION_KEY));
        } catch (e) {
            return null;
        }
    },

    // Registra um novo usuário no "banco"
    register(name, email, password) {
        const users = this._getAllUsers();
        
        // Verifica se e-mail já existe
        if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            return { success: false, message: 'Este e-mail já está cadastrado.' };
        }

        // Insere o novo usuário
        const newUser = {
            id: 'usr_' + Date.now(),
            name,
            email: email.toLowerCase(),
            password // Armazenado puro para fins de simulação simples frontend
        };

        users.push(newUser);
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));

        return { success: true, user: { name: newUser.name, email: newUser.email } };
    },

    // Realiza o login do usuário
    login(email, password) {
        const users = this._getAllUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!user) {
            return { success: false, message: 'Usuário não cadastrado.' };
        }

        if (user.password !== password) {
            return { success: false, message: 'Senha incorreta.' };
        }

        const sessionUser = { name: user.name, email: user.email };
        sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionUser));

        return { success: true, user: sessionUser };
    },

    // Encerra a sessão
    logout() {
        sessionStorage.removeItem(STORAGE_SESSION_KEY);
    },

    // Auxiliar: Busca todos os usuários
    _getAllUsers() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_USERS_KEY)) || [];
        } catch (e) {
            return [];
        }
    }
};

// --- LOGICA DE INTERFACE DE LOGIN / CADASTRO ---
document.addEventListener('DOMContentLoaded', () => {
    // Elementos de abas e formulários
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    // Inputs Login
    const loginEmail = document.getElementById('login-email');
    const loginPass = document.getElementById('login-password');
    
    // Inputs Cadastro
    const signupName = document.getElementById('signup-name');
    const signupEmail = document.getElementById('signup-email');
    const signupPass = document.getElementById('signup-password');
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');

    if (!tabLogin) return; // Segurança caso execute em outra página

    // Alternar entre abas Entrar e Cadastrar
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
        clearAllErrors();
    });

    tabSignup.addEventListener('click', () => {
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
        clearAllErrors();
    });

    // Exibir/Ocultar Senha (Olhinho)
    document.querySelectorAll('.btn-toggle-password').forEach(button => {
        button.addEventListener('click', function () {
            const input = this.previousElementSibling;
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fa-regular fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fa-regular fa-eye';
            }
        });
    });

    // Validação de força de senha ao digitar
    signupPass.addEventListener('input', () => {
        const password = signupPass.value;
        let score = 0;
        
        if (password.length >= 6) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;

        strengthBar.className = 'strength-bar'; // Reset classes
        
        if (password.length === 0) {
            strengthText.textContent = 'Força da senha';
        } else if (score === 1) {
            strengthBar.classList.add('weak');
            strengthText.textContent = 'Senha Fraca (adicione letras maiúsculas/números)';
            strengthText.style.color = '#ef4444';
        } else if (score === 2) {
            strengthBar.classList.add('medium');
            strengthText.textContent = 'Senha Média (bom, mas pode melhorar)';
            strengthText.style.color = '#f59e0b';
        } else if (score === 3) {
            strengthBar.classList.add('strong');
            strengthText.textContent = 'Senha Forte! Muito seguro';
            strengthText.style.color = '#10b981';
        }
    });

    // Limpar erros ao focar nos inputs
    const allInputs = [loginEmail, loginPass, signupName, signupEmail, signupPass];
    allInputs.forEach(input => {
        if (input) {
            input.addEventListener('focus', () => {
                const errorSpan = document.getElementById(`${input.id}-error`);
                if (errorSpan) {
                    errorSpan.classList.remove('active');
                    errorSpan.textContent = '';
                }
            });
        }
    });

    // --- SUBMISSÃO DOS FORMULÁRIOS COM VALIDAÇÃO ---

    // Login Form Submit
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        clearAllErrors();

        let hasError = false;
        const emailVal = loginEmail.value.trim();
        const passVal = loginPass.value;

        // Validação de E-mail simples
        if (!validateEmail(emailVal)) {
            showInputError(loginEmail, 'Por favor, insira um e-mail válido.');
            hasError = true;
        }

        // Validação de senha
        if (passVal.length < 6) {
            showInputError(loginPass, 'A senha deve ter no mínimo 6 caracteres.');
            hasError = true;
        }

        if (hasError) {
            triggerFormShake(loginForm);
            return;
        }

        // Tenta autenticar
        const result = Auth.login(emailVal, passVal);
        if (result.success) {
            if (window.showToast) window.showToast('Login Efetuado', `Seja bem-vindo de volta, ${result.user.name}!`, 'success');
            // Aciona callback global para alterar telas
            if (window.onAuthSuccess) window.onAuthSuccess();
        } else {
            triggerFormShake(loginForm);
            if (result.message.includes('Senha')) {
                showInputError(loginPass, result.message);
            } else {
                showInputError(loginEmail, result.message);
            }
            if (window.showToast) window.showToast('Erro de Login', result.message, 'error');
        }
    });

    // Signup Form Submit
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        clearAllErrors();

        let hasError = false;
        const nameVal = signupName.value.trim();
        const emailVal = signupEmail.value.trim();
        const passVal = signupPass.value;

        // Validar Nome
        if (nameVal.length < 3) {
            showInputError(signupName, 'Por favor, digite seu nome completo.');
            hasError = true;
        }

        // Validar Email
        if (!validateEmail(emailVal)) {
            showInputError(signupEmail, 'Por favor, insira um e-mail válido.');
            hasError = true;
        }

        // Validar Senha
        if (passVal.length < 6) {
            showInputError(signupPass, 'A senha deve ter no mínimo 6 caracteres.');
            hasError = true;
        }

        if (hasError) {
            triggerFormShake(signupForm);
            return;
        }

        // Tenta registrar
        const result = Auth.register(nameVal, emailVal, passVal);
        if (result.success) {
            if (window.showToast) window.showToast('Conta Criada!', 'Cadastro realizado com sucesso. Faça login para acessar.', 'success');
            // Volta para a aba de login preenchendo o email
            loginEmail.value = emailVal;
            loginPass.value = '';
            tabLogin.click();
        } else {
            triggerFormShake(signupForm);
            showInputError(signupEmail, result.message);
            if (window.showToast) window.showToast('Erro no Cadastro', result.message, 'error');
        }
    });

    // --- FUNÇÕES AUXILIARES DE SUPORTE ---

    // Validação Regex de E-mail
    function validateEmail(email) {
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return re.test(email);
    }

    // Exibir erro específico embaixo de um input
    function showInputError(inputEl, message) {
        const errorSpan = document.getElementById(`${inputEl.id}-error`);
        if (errorSpan) {
            errorSpan.textContent = message;
            errorSpan.classList.add('active');
        }
    }

    // Limpa todos os spans de erro ativos
    function clearAllErrors() {
        document.querySelectorAll('.error-message').forEach(span => {
            span.classList.remove('active');
            span.textContent = '';
        });
    }

    // Tremor visual em caso de erro de formulário
    function triggerFormShake(formEl) {
        formEl.classList.remove('shake-animation');
        void formEl.offsetWidth; // Força reflow CSS
        formEl.classList.add('shake-animation');
    }
});

// Tornar objeto global disponível
window.Auth = Auth;
