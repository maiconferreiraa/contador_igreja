// Importa o 'auth' do nosso arquivo de configuração
import { auth } from './firebase-config.js';
// Importa as funções de Autenticação
import { 
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

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
            if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                loginError.innerText = 'Email ou senha inválidos.';
            } else {
                loginError.innerText = 'Ocorreu um erro. Tente novamente.';
            }
            loginError.classList.remove('d-none');
        });
});