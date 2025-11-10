// Importa 'db' e 'auth'
import { db } from './firebase-config.js';
// Importa as funções do Firestore que vamos usar
import { collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// --- REFERÊNCIAS AOS ELEMENTOS ---
const form = document.getElementById('contador-form');
const btnSalvar = document.getElementById('btn-salvar');
const btnWhatsApp = document.getElementById('btn-whatsapp');
const msgSucesso = document.getElementById('mensagem-sucesso');
const msgErro = document.getElementById('mensagem-erro');
const dataAtualEl = document.getElementById('data-atual');

// === LÓGICA DO TOTALIZADOR EM TEMPO REAL ===

// Pega os 4 campos de input
const inputsContagem = [
    document.getElementById('membros-adultos'),
    document.getElementById('membros-cias'),
    document.getElementById('visitantes-adultos'),
    document.getElementById('visitantes-cias')
];

// Pega o campo de display do total
const totalGeralDisplay = document.getElementById('total-geral-display');

// Função para atualizar o total
function atualizarTotalDisplay() {
    let total = 0;
    inputsContagem.forEach(input => {
        total += parseInt(input.value) || 0;
    });
    
    // Atualiza o valor no campo de total (somente leitura)
    if (totalGeralDisplay) {
        totalGeralDisplay.value = total;
    }
}

// Adiciona o "escutador" para cada input
inputsContagem.forEach(input => {
    input.addEventListener('input', atualizarTotalDisplay);
});
// =======================================


// --- LÓGICA DA DATA (Exibição inicial) ---
// Mostra a data atual (sem hora) quando a página carrega
function capitalizar(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
const hojeInicial = new Date();
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
let dataFormatadaInicial = hojeInicial.toLocaleDateString('pt-BR', options);
dataFormatadaInicial = dataFormatadaInicial.split(', ').map(capitalizar).join(', ');
dataFormatadaInicial = dataFormatadaInicial.replace(' De ', ' de ');
dataAtualEl.innerText = dataFormatadaInicial;


// --- LÓGICA DO FORMULÁRIO (SALVAR) ---
let urlWhatsAppArmazenada = '';

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

    // === CORREÇÃO: Pega a data e hora EXATAS do clique ===
    const hoje = new Date(); // Pega a data e hora de AGORA
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let dataFormatada = hoje.toLocaleDateString('pt-BR', options);
    dataFormatada = dataFormatada.split(', ').map(capitalizar).join(', ');
    dataFormatada = dataFormatada.replace(' De ', ' de ');

    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    const horaFormatada = hoje.toLocaleTimeString('pt-BR', timeOptions); // ex: 13:39

    // Adiciona o horário à data formatada
    dataFormatada = `${dataFormatada} às ${horaFormatada}`;
    // ===============================================

    // Pegar os valores dos campos
    const nomeIgreja = document.getElementById('nome-igreja').value;
    const tipoCulto = document.getElementById('tipo-culto').value; // CAMPO NOVO
    const mA = parseInt(document.getElementById('membros-adultos').value) || 0;
    const mC = parseInt(document.getElementById('membros-cias').value) || 0;
    const vA = parseInt(document.getElementById('visitantes-adultos').value) || 0;
    const vC = parseInt(document.getElementById('visitantes-cias').value) || 0;

    const totalMembros = mA + mC;
    const totalVisitantes = vA + vC;
    const totalGeral = totalMembros + totalVisitantes;

    const relatorio = {
        nomeIgreja: nomeIgreja,
        tipoCulto: tipoCulto, // CAMPO NOVO
        membrosAdultos: mA,
        membrosCias: mC,
        visitantesAdultos: vA,
        visitantesCias: vC,
        totalMembros: totalMembros,
        totalVisitantes: totalVisitantes,
        totalGeral: totalGeral,
        dataCompleta: dataFormatada, // Esta variável agora inclui o horário exato
        timestamp: Timestamp.now() 
    };

    try {
        // Salvar no Firestore
        await addDoc(collection(db, "contagens"), relatorio);
        
        msgSucesso.classList.remove('d-none');
        // Adiciona o timer para esconder a mensagem após 3 segundos
        setTimeout(() => msgSucesso.classList.add('d-none'), 3000);
        
        form.reset(); // Reseta o formulário
        atualizarTotalDisplay(); // Reseta o totalizador

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
        msgErro.classList.add('d-none');
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