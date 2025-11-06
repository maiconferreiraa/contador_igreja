// Importa o 'auth' do nosso arquivo de configuração
import { auth } from './firebase-config.js';
// Importa as funções de Autenticação
import { 
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
// === NOVAS REFERÊNCIAS ===
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('toggle-password');
// ==========================

// --- VERIFICA SE JÁ ESTÁ LOGADO ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = 'admin.html';
    }
});

// --- LÓGICA DE LOGIN ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Sucesso! O 'onAuthStateChanged' vai pegar e redirecionar
            console.log('Login bem-sucedido:', userCredential.user);
        })
        .catch((error) => {
            // Erro no login
            console.error('Erro de login:', error.code);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/api-key-not-valid') {
                loginError.innerText = 'Email, senha ou Chave de API inválidos.';
            } else {
                loginError.innerText = 'Ocorreu um erro. Tente novamente.';
            }
            loginError.classList.remove('d-none');
        });
});

// === NOVA LÓGICA PARA O "OLHO" ===
togglePassword.addEventListener('click', () => {
    // Pega o ícone <i> dentro do <span>
    const icon = togglePassword.querySelector('i');
    
    // Verifica o tipo do input
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    // Muda o ícone
    if (type === 'text') {
        // Se a senha está visível, mostra o olho "cortado"
        icon.classList.remove('bi-eye-fill');
        icon.classList.add('bi-eye-slash-fill');
    } else {
        // Se a senha está oculta, mostra o olho normal
        icon.classList.remove('bi-eye-slash-fill');
        icon.classList.add('bi-eye-fill');
    }
});