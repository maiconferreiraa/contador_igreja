// Importe as funções necessárias
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// COLE SUAS CONFIGURAÇÕES REAIS DO FIREBASE AQUI
const firebaseConfig = {
  apiKey: "AIzaSyA5xHIDyvrW4f76vGEcZSk57e7G77uTN84",
  authDomain: "contadoricm.firebaseapp.com",
  projectId: "contadoricm",
  storageBucket: "contadoricm.firebasestorage.app",
  messagingSenderId: "517227834185",
  appId: "1:517227834185:web:661d0176a25fae7ec14898"
};
// ===============================================

// Inicializar o Firebase
const app = initializeApp(firebaseConfig);

// Exportar os serviços que vamos usar
export const db = getFirestore(app);
export const auth = getAuth(app);