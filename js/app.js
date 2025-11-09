// Importa 'db' e 'auth'
import { db } from './firebase-config.js';
// Importa as funções do Firestore que vamos usar
import { collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// --- LÓGICA DA DATA (COM HORÁRIO) ---
function capitalizar(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
const hoje = new Date();
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
let dataFormatada = hoje.toLocaleDateString('pt-BR', options);
dataFormatada = dataFormatada.split(', ').map(capitalizar).join(', ');
dataFormatada = dataFormatada.replace(' De ', ' de ');

// === Pega o horário ===
const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
const horaFormatada = hoje.toLocaleTimeString('pt-BR', timeOptions); // ex: 13:39

// Adiciona o horário à data formatada
dataFormatada = `${dataFormatada} às ${horaFormatada}`;
// =================================

document.getElementById('data-atual').innerText = dataFormatada;
// --- FIM DA LÓGICA DE DATA ---


// --- LÓGICA DO FORMULÁRIO ---
let urlWhatsAppArmazenada = '';

const form = document.getElementById('contador-form');
const btnSalvar = document.getElementById('btn-salvar');
const btnWhatsApp = document.getElementById('btn-whatsapp');
const msgSucesso = document.getElementById('mensagem-sucesso');
const msgErro = document.getElementById('mensagem-erro'); // Mensagem de erro

// Esconde o botão WhatsApp se o usuário começar a digitar de novo
form.addEventListener('input', () => {
    btnWhatsApp.classList.add('d-none');
    msgSucesso.classList.add('d-none');
    msgErro.classList.add('d-none');
});

// Lógica de SALVAR (ao clicar no botão submit)
form.addEventListener('submit', async function(event) {
    event.preventDefault(); 
    btnSalvar.disabled = true;
    btnSalvar.innerText = "Salvando...";
    
    btnWhatsApp.classList.add('d-none');
    msgSucesso.classList.add('d-none');
    msgErro.classList.add('d-none');
    urlWhatsAppArmazenada = '';

    // Pegar os valores dos campos
    const nomeIgreja = document.getElementById('nome-igreja').value;
    const tipoCulto = document.getElementById('tipo-culto').value; // NOVO CAMPO
    const mA = parseInt(document.getElementById('membros-adultos').value) || 0;
    const mC = parseInt(document.getElementById('membros-cias').value) || 0;
    const vA = parseInt(document.getElementById('visitantes-adultos').value) || 0;
    const vC = parseInt(document.getElementById('visitantes-cias').value) || 0;

    const totalMembros = mA + mC;
    const totalVisitantes = vA + vC;
    const totalGeral = totalMembros + totalVisitantes;

    const relatorio = {
        nomeIgreja: nomeIgreja,
        tipoCulto: tipoCulto, // NOVO CAMPO
        membrosAdultos: mA,
        membrosCias: mC,
        visitantesAdultos: vA,
        visitantesCias: vC,
        totalMembros: totalMembros,
        totalVisitantes: totalVisitantes,
        totalGeral: totalGeral,
        dataCompleta: dataFormatada, // Esta variável agora inclui o horário
        timestamp: Timestamp.now() 
    };

    try {
        // Salvar no Firestore
        await addDoc(collection(db, "contagens"), relatorio);
        
        msgSucesso.classList.remove('d-none');
        // Adiciona o timer para esconder a mensagem após 3 segundos
        setTimeout(() => msgSucesso.classList.add('d-none'), 3000);
        
        form.reset(); // Reseta o formulário

        // Formatar a mensagem para o WhatsApp
        const mensagemWhats = `
*RELATÓRIO DE PRESENÇA*
Igreja: *${nomeIgreja}*
Culto: *${tipoCulto}*
Data: _${dataFormatada}_

-----------------------------------
*MEMBROS*
Adultos: ${mA}
Classes (Cias): ${mC}
*Total Membros: ${totalMembros}*
-----------------------------------
*VISITANTES*
Adultos: ${vA}
Classes (Cias): ${vC}
*Total Visitantes: ${totalVisitantes}*
-----------------------------------
*TOTAL GERAL: ${totalGeral}*
        `;
        
        urlWhatsAppArmazenada = `https://wa.me/?text=${encodeURIComponent(mensagemWhats)}`;
        
        // MOSTRA O BOTÃO DE COMPARTILHAR
        btnWhatsApp.classList.remove('d-none');
        
    } catch (e) {
        console.error("Erro ao adicionar documento: ", e);
        msgErro.innerText = "Erro ao salvar. Verifique as Regras do Firestore ou sua conexão.";
        msgErro.classList.remove('d-none');
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.innerText = "Salvar Relatório";
    }
});

// Lógica de COMPARTILHAR (ao clicar no segundo botão)
btnWhatsApp.addEventListener('click', () => {
    if (urlWhatsAppArmazenada) {
        window.open(urlWhatsAppArmazenada, '_blank');
        btnWhatsApp.classList.add('d-none');
        urlWhatsAppArmazenada = '';
    }
});

