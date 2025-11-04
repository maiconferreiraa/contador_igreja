import { db } from './firebase-config.js';
import { collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// --- LÓGICA DA DATA ---
function capitalizar(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
const hoje = new Date();
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
let dataFormatada = hoje.toLocaleDateString('pt-BR', options);
dataFormatada = dataFormatada.split(', ').map(capitalizar).join(', ');
dataFormatada = dataFormatada.replace(' De ', ' de ');
document.getElementById('data-atual').innerText = dataFormatada;

// --- LÓGICA DO FORMULÁRIO ---
let urlWhatsAppArmazenada = '';
const form = document.getElementById('contador-form');
const btnSalvar = document.getElementById('btn-salvar');
const btnWhatsApp = document.getElementById('btn-whatsapp');
const msgSucesso = document.getElementById('mensagem-sucesso');
const msgErro = document.getElementById('mensagem-erro'); // Mensagem de erro

form.addEventListener('input', () => {
    btnWhatsApp.classList.add('d-none');
    msgSucesso.classList.add('d-none');
    msgErro.classList.add('d-none');
});

form.addEventListener('submit', async function(event) {
    event.preventDefault(); 
    btnSalvar.disabled = true;
    btnSalvar.innerText = "Salvando...";
    
    btnWhatsApp.classList.add('d-none');
    msgSucesso.classList.add('d-none');
    msgErro.classList.add('d-none');
    urlWhatsAppArmazenada = '';

    const nomeIgreja = document.getElementById('nome-igreja').value;
    const mA = parseInt(document.getElementById('membros-adultos').value) || 0;
    const mC = parseInt(document.getElementById('membros-cias').value) || 0;
    const vA = parseInt(document.getElementById('visitantes-adultos').value) || 0;
    const vC = parseInt(document.getElementById('visitantes-cias').value) || 0;

    const totalMembros = mA + mC;
    const totalVisitantes = vA + vC;
    const totalGeral = totalMembros + totalVisitantes;

    const relatorio = {
        nomeIgreja: nomeIgreja,
        membrosAdultos: mA,
        membrosCias: mC,
        visitantesAdultos: vA,
        visitantesCias: vC,
        totalMembros: totalMembros,
        totalVisitantes: totalVisitantes,
        totalGeral: totalGeral,
        dataCompleta: dataFormatada,
        timestamp: Timestamp.now() 
    };

    try {
        // AQUI É O PONTO QUE FALHA SE AS REGRAS (ETAPA 1) ESTIVEREM ERRADAS
        await addDoc(collection(db, "contagens"), relatorio);
        
        msgSucesso.classList.remove('d-none');
        form.reset();

        const mensagemWhats = `
*RELATÓRIO DE PRESENÇA*
Igreja: *${nomeIgreja}*
Data: _${dataFormatada}_
-----------------------------------
*MEMBROS*
Adultos: ${mA}
Crianças: ${mC}
*Total Membros: ${totalMembros}*
-----------------------------------
*VISITANTES*
Adultos: ${vA}
Crianças: ${vC}
*Total Visitantes: ${totalVisitantes}*
-----------------------------------
*TOTAL GERAL: ${totalGeral}*
        `;
        
        urlWhatsAppArmazenada = `https://wa.me/?text=${encodeURIComponent(mensagemWhats)}`;
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

btnWhatsApp.addEventListener('click', () => {
    if (urlWhatsAppArmazenada) {
        window.open(urlWhatsAppArmazenada, '_blank');
        btnWhatsApp.classList.add('d-none');
        urlWhatsAppArmazenada = '';
    }
});