// Importe as funções necessárias
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// COLE SUAS CONFIGURAÇÕES DO FIREBASE AQUI
const firebaseConfig = {
  apiKey: "AIzaSyCQRZR9lcLrl5hwxm5MHsgnRAMiiTcP8xU",
  authDomain: "contadoricm.firebaseapp.com",
  projectId: "contadoricm",
  storageBucket: "contadoricm.firebasestorage.app",
  messagingSenderId: "517227834185",
  appId: "1:517227834185:web:661d0176a25fae7ec14898"
};

// Inicializar o Firebase
const app = initializeApp(firebaseConfig);

// Exportar os serviços que vamos usar
// 'db' é o nosso banco de dados (Firestore)
// 'auth' é o nosso sistema de autenticação
export const db = getFirestore(app);
export const auth = getAuth(app);