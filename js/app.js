// Importa o 'db' do nosso arquivo de configuração
import { db } from './firebase-config.js';
// Importa as funções do Firestore que vamos usar
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


// --- LÓGICA DO FORMULÁRIO (ATUALIZADA) ---

// 1. Armazena a URL do WhatsApp para o segundo botão
let urlWhatsAppArmazenada = '';

// 2. Pega os novos elementos
const form = document.getElementById('contador-form');
const btnSalvar = document.getElementById('btn-salvar');
const btnWhatsApp = document.getElementById('btn-whatsapp');
const msgSucesso = document.getElementById('mensagem-sucesso');

// 3. Esconde o botão WhatsApp se o usuário começar a digitar de novo
form.addEventListener('input', () => {
    btnWhatsApp.classList.add('d-none');
    msgSucesso.classList.add('d-none');
});

// 4. Lógica de SALVAR (ao clicar no botão submit)
form.addEventListener('submit', async function(event) {
    event.preventDefault(); 
    btnSalvar.disabled = true;
    btnSalvar.innerText = "Salvando...";
    
    // Esconde botões/mensagens antigas
    btnWhatsApp.classList.add('d-none');
    msgSucesso.classList.add('d-none');
    urlWhatsAppArmazenada = '';

    // Pegar os valores dos campos
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
        // Salvar no Firestore
        await addDoc(collection(db, "contagens"), relatorio);
        
        // Mostrar mensagem de sucesso e resetar o form
        msgSucesso.classList.remove('d-none');
        form.reset();

        // Formatar a mensagem para o WhatsApp
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
        
        // Prepara a URL e armazena
        urlWhatsAppArmazenada = `https://wa.me/?text=${encodeURIComponent(mensagemWhats)}`;
        
        // === MOSTRA O BOTÃO DE COMPARTILHAR ===
        btnWhatsApp.classList.remove('d-none');
        
        // (Removemos o 'window.open' daqui)

    } catch (e) {
        console.error("Erro ao adicionar documento: ", e);
        alert("Erro ao salvar os dados. Tente novamente.");
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.innerText = "Salvar Relatório";
    }
});

// 5. (NOVO) Lógica de COMPARTILHAR (ao clicar no segundo botão)
btnWhatsApp.addEventListener('click', () => {
    if (urlWhatsAppArmazenada) {
        // Esta ação é um clique direto, não será bloqueada!
        window.open(urlWhatsAppArmazenada, '_blank');
        
        // Esconde o botão após o clique para evitar cliques duplos
        btnWhatsApp.classList.add('d-none');
        urlWhatsAppArmazenada = ''; // Limpa a URL
    }
});