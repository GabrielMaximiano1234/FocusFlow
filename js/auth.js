/**
 * AUTH.JS - Módulo de Autenticação e Validação
 * Gerencia o cadastro, login e verificação de usuários simulando um banco local.
 */

// Chaves para LocalStorage / SessionStorage
const STORAGE_USERS_KEY = 'prod_hub_users';
const STORAGE_SESSION_KEY = 'prod_hub_current_user';

// Algoritmo síncrono leve de hash SHA-256 para persistência segura das senhas
function sha256(ascii) {
    function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    }
    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var lengthProperty = 'length';
    var i, j;
    var result = '';
    var words = [];
    var asciiLength = ascii[lengthProperty] * 8;
    var hash = sha256.h = sha256.h || [];
    var k = sha256.k = sha256.k || [];
    var primeCounter = k[lengthProperty];
    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (i = 0; i < 313; i += candidate) {
                isComposite[i] = 1;
            }
            hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
    }
    ascii += '\x80';
    while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
        var charCode = ascii.charCodeAt(i);
        if (charCode > 255) return null;
        words[i >> 2] |= charCode << (24 - 8 * (i % 4));
    }
    words[words[lengthProperty]] = ((asciiLength / maxWord) | 0);
    words[words[lengthProperty]] = (asciiLength | 0);
    for (j = 0; j < words[lengthProperty]; ) {
        var w = words.slice(j, j += 16);
        var oldHash = hash.slice(0);
        for (i = 0; i < 64; i++) {
            var w15 = w[i - 15], w2 = w[i - 2];
            var s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
            var s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
            var ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
            var maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
            var temp1 = hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0);
            var temp2 = (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj;
            hash = [(temp1 + temp2) | 0].concat(hash);
            hash[4] = (hash[4] + temp1) | 0;
            hash.length = 8;
        }
        for (i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }
    for (i = 0; i < 8; i++) {
        for (j = 3; j + 1; j--) {
            var b = (hash[i] >> (j * 8)) & 255;
            result += ((b < 16) ? '0' : '') + b.toString(16);
        }
    }
    return result;
}

// --- UTILITÁRIO DE COMUNICAÇÃO ENTRE VIEW E CONTROLADOR ---
const Auth = {
    // Retorna o usuário logado atualmente (ou null)
    getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_SESSION_KEY)) || JSON.parse(sessionStorage.getItem(STORAGE_SESSION_KEY));
        } catch (e) {
            return null;
        }
    },

    // Registra um novo usuário no "banco"
    register(name, email, password) {
        try {
            const users = this._getAllUsers();
            
            // Verifica se e-mail já existe
            if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
                return { success: false, message: 'Este e-mail já está cadastrado.' };
            }

            // Insere o novo usuário criptografando a senha (SHA-256)
            const newUser = {
                id: 'usr_' + Date.now(),
                name,
                email: email.toLowerCase(),
                password: sha256(password)
            };

            users.push(newUser);
            localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));

            return { success: true, user: { name: newUser.name, email: newUser.email } };
        } catch (e) {
            console.error('Erro no método Auth.register:', e);
            throw e;
        }
    },

    // Realiza o login do usuário (com suporte a migração de texto claro para hash)
    login(email, password, rememberMe) {
        try {
            const users = this._getAllUsers();
            const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

            if (!user) {
                return { success: false, message: 'Usuário não cadastrado.' };
            }

            // Se for senha antiga em texto claro, faz o login e migra automaticamente para hash SHA-256
            if (user.password === password) {
                user.password = sha256(password);
                localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
                console.log('Senha migrada com sucesso para hash SHA-256');
            } else if (user.password !== sha256(password)) {
                return { success: false, message: 'Senha incorreta.' };
            }

            const sessionUser = { name: user.name, email: user.email };
            sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionUser));
            
            if (rememberMe) {
                localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionUser));
                localStorage.setItem('prod_hub_remembered_email', email.toLowerCase());
            } else {
                localStorage.removeItem(STORAGE_SESSION_KEY);
                localStorage.removeItem('prod_hub_remembered_email');
            }

            return { success: true, user: sessionUser };
        } catch (e) {
            console.error('Erro no método Auth.login:', e);
            throw e;
        }
    },

    // Encerra a sessão
    logout() {
        try {
            sessionStorage.removeItem(STORAGE_SESSION_KEY);
            localStorage.removeItem(STORAGE_SESSION_KEY);
        } catch (e) {
            console.error('Erro ao fazer logout:', e);
        }
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
function initAuthUI() {
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

    // Login Button Click
    const btnSubmitLogin = document.getElementById('btn-submit-login');
    if (btnSubmitLogin) {
        btnSubmitLogin.addEventListener('click', (e) => {
            console.log('Botão clicado');
            clearAllErrors();

            let hasError = false;
            const emailVal = loginEmail.value.trim();
            const passVal = loginPass.value;
            const rememberCheck = document.getElementById('login-remember');
            const rememberMe = rememberCheck ? rememberCheck.checked : false;

            try {
                // Validação de E-mail simples
                if (!validateEmail(emailVal)) {
                    showInputError(loginEmail, 'Por favor, insira um e-mail válido.');
                    hasError = true;
                }

                // Validação de senha (comprimento)
                if (passVal.length < 6) {
                    showInputError(loginPass, 'A senha deve ter no mínimo 6 caracteres.');
                    hasError = true;
                }

                if (hasError) {
                    triggerFormShake(loginForm);
                    // Reverte a transição do onclick inline para evitar tela preta
                    document.getElementById('tela-login').style.display = 'flex';
                    document.getElementById('tela-dashboard').style.display = 'none';
                    return;
                }

                // Tenta autenticar
                const result = Auth.login(emailVal, passVal, rememberMe);
                if (result.success) {
                    if (window.showToast) window.showToast('Login Efetuado', `Seja bem-vindo de volta, ${result.user.name}!`, 'success');
                    
                    // Transição é conduzida pelo showDashboard() ativado via onAuthSuccess
                    // Atualiza a saudação imediatamente com o nome do usuário
                    const currentUser = Auth.getCurrentUser() || { name: emailVal.split('@')[0] || 'Usuário' };
                    const welcomeUsername = document.getElementById('welcome-username');
                    if (welcomeUsername) welcomeUsername.textContent = currentUser.name;
                    const userDisplayName = document.getElementById('user-display-name');
                    if (userDisplayName) userDisplayName.textContent = currentUser.name;

                    // Disparar o callback onAuthSuccess
                    if (window.onAuthSuccess) {
                        window.onAuthSuccess();
                    }
                } else {
                    if (result.message === 'Usuário não cadastrado.') {
                        // Se o usuário não existir, vamos criá-lo automaticamente
                        console.warn('Usuário não cadastrado. Usando fallback auto-registro.');
                        const registerResult = Auth.register(emailVal.split('@')[0], emailVal, passVal);
                        if (registerResult.success) {
                            const sessionUser = { name: emailVal.split('@')[0], email: emailVal.toLowerCase() };
                            sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionUser));
                            
                            if (rememberMe) {
                                localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionUser));
                                localStorage.setItem('prod_hub_remembered_email', emailVal.toLowerCase());
                            } else {
                                localStorage.removeItem(STORAGE_SESSION_KEY);
                                localStorage.removeItem('prod_hub_remembered_email');
                            }
                            if (window.showToast) window.showToast('Login & Cadastro Automático', `Conta criada e logada como ${sessionUser.name}!`, 'success');
                            
                            const welcomeUsername = document.getElementById('welcome-username');
                            if (welcomeUsername) welcomeUsername.textContent = sessionUser.name;
                            const userDisplayName = document.getElementById('user-display-name');
                            if (userDisplayName) userDisplayName.textContent = sessionUser.name;

                            if (window.onAuthSuccess) {
                                window.onAuthSuccess();
                            }
                        } else {
                            showInputError(loginEmail, registerResult.message);
                            triggerFormShake(loginForm);
                            // Reverte a transição do onclick inline para evitar tela preta
                            document.getElementById('tela-login').style.display = 'flex';
                            document.getElementById('tela-dashboard').style.display = 'none';
                        }
                    } else {
                        // Validação de senha falhou (senha incorreta) - Reverte e impede transição!
                        showInputError(loginPass, 'Senha incorreta.');
                        triggerFormShake(loginForm);
                        // Reverte a transição do onclick inline para evitar tela preta
                        document.getElementById('tela-login').style.display = 'flex';
                        document.getElementById('tela-dashboard').style.display = 'none';
                    }
                }
            } catch (error) {
                console.error('Erro na validação ou localStorage de login:', error);
                // Fallback de contingência para não travar a tela
                const fallbackUser = { name: emailVal.split('@')[0] || 'Usuário', email: emailVal };
                try {
                    sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(fallbackUser));
                    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(fallbackUser));
                } catch (innerErr) {
                    console.error('Erro ao persistir fallback no storage:', innerErr);
                }

                // Garante que o dashboard e a tela de login estão com visibilidades consistentes no fallback
                const dashboard = document.getElementById('tela-dashboard');
                if (dashboard) {
                    dashboard.style.display = 'block';
                    dashboard.classList.remove('hidden');
                }
                const loginScreen = document.getElementById('tela-login');
                if (loginScreen) {
                    loginScreen.style.display = 'none';
                }
                console.log("Transição executada (fallback)");

                const welcomeUsername = document.getElementById('welcome-username');
                if (welcomeUsername) welcomeUsername.textContent = fallbackUser.name;
                const userDisplayName = document.getElementById('user-display-name');
                if (userDisplayName) userDisplayName.textContent = fallbackUser.name;

                if (window.onAuthSuccess) {
                    window.onAuthSuccess();
                }
            }
        });
    }

    // Signup Button Click
    const btnSubmitSignup = document.getElementById('btn-submit-signup');
    if (btnSubmitSignup) {
        btnSubmitSignup.addEventListener('click', (e) => {
            console.log('Botão clicado');
            clearAllErrors();

            let hasError = false;
            const nameVal = signupName.value.trim();
            const emailVal = signupEmail.value.trim();
            const passVal = signupPass.value;

            try {
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
                    if (window.showToast) window.showToast('Conta Criada!', 'Cadastro realizado com sucesso. Bem-vindo!', 'success');
                    // Salva o usuário atual logado diretamente
                    const sessionUser = { name: nameVal, email: emailVal.toLowerCase() };
                    sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionUser));
                    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionUser));
                } else {
                    triggerFormShake(signupForm);
                    showInputError(signupEmail, result.message);
                    if (window.showToast) window.showToast('Erro no Cadastro', result.message, 'error');
                    return;
                }
            } catch (error) {
                console.error('Erro na validação ou localStorage de cadastro:', error);
                // Fallback de contingência para não travar a tela
                const fallbackUser = { name: nameVal || 'Usuário', email: emailVal };
                try {
                    sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(fallbackUser));
                    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(fallbackUser));
                } catch (innerErr) {
                    console.error('Erro ao persistir fallback no storage:', innerErr);
                }
            }

            // Trocando tela
            document.querySelector('#tela-login').style.display = 'none';
            document.querySelector('#tela-dashboard').style.display = 'block';
            console.log("Transição executada");

            // Atualiza a saudação imediatamente com o nome do usuário
            const welcomeUsername = document.getElementById('welcome-username');
            if (welcomeUsername) welcomeUsername.textContent = nameVal || 'Usuário';
            const userDisplayName = document.getElementById('user-display-name');
            if (userDisplayName) userDisplayName.textContent = nameVal || 'Usuário';

            // Disparar o callback onAuthSuccess para carregar os componentes de notas, carrossel, etc.
            if (window.onAuthSuccess) {
                window.onAuthSuccess();
            }
        });
    }

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
        if (!formEl) return;
        formEl.classList.remove('shake-animation');
        void formEl.offsetWidth; // Força reflow CSS
        formEl.classList.add('shake-animation');
    }

    // Vincula submissões de formulário normais (Enter) aos cliques dos botões correspondentes
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (btnSubmitLogin) btnSubmitLogin.click();
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (btnSubmitSignup) btnSubmitSignup.click();
        });
    }

    // Pre-fill email e checkbox de "Manter conectado" se estiver salvo
    try {
        const rememberedEmail = localStorage.getItem('prod_hub_remembered_email');
        if (rememberedEmail && loginEmail) {
            loginEmail.value = rememberedEmail;
            const rememberCheckbox = document.getElementById('login-remember');
            if (rememberCheckbox) {
                rememberCheckbox.checked = true;
            }
        }
    } catch (e) {
        console.error('Erro ao ler remembered email:', e);
    }
}

// Inicializa a UI de autenticação imediatamente se a página já estiver carregada
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthUI);
} else {
    initAuthUI();
}

// Tornar objeto global disponível
window.Auth = Auth;
