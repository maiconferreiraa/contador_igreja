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

// --- LÓGICA DO FORMULÁRIO ---
const form = document.getElementById('contador-form');
const btnSalvar = document.getElementById('btn-salvar');
const msgSucesso = document.getElementById('mensagem-sucesso');

form.addEventListener('submit', async function(event) {
    event.preventDefault(); 
    btnSalvar.disabled = true;
    btnSalvar.innerText = "Salvando...";

    // 1. Pegar os valores dos campos
    const nomeIgreja = document.getElementById('nome-igreja').value;
    const mA = parseInt(document.getElementById('membros-adultos').value) || 0;
    const mC = parseInt(document.getElementById('membros-cias').value) || 0;
    const vA = parseInt(document.getElementById('visitantes-adultos').value) || 0;
    const vC = parseInt(document.getElementById('visitantes-cias').value) || 0;

    // 2. Calcular os totais
    const totalMembros = mA + mC;
    const totalVisitantes = vA + vC;
    const totalGeral = totalMembros + totalVisitantes;

    // 3. Criar o objeto de dados para salvar no Firebase
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
        // Timestamp é essencial para filtrar por data no admin
        timestamp: Timestamp.now() 
    };

    try {
        // 4. Salvar no Firestore
        // Isso cria uma coleção chamada "contagens" (se não existir)
        // e adiciona um documento com os dados do 'relatorio'
        const docRef = await addDoc(collection(db, "contagens"), relatorio);
        console.log("Documento salvo com ID: ", docRef.id);
        
        // Mostrar mensagem de sucesso e resetar o form
        msgSucesso.classList.remove('d-none');
        form.reset();
        setTimeout(() => msgSucesso.classList.add('d-none'), 3000);

        // 5. Formatar e abrir o WhatsApp
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
        
        const urlWhatsApp = `https://wa.me/?text=${encodeURIComponent(mensagemWhats)}`;
        window.open(urlWhatsApp, '_blank');

    } catch (e) {
        console.error("Erro ao adicionar documento: ", e);
        alert("Erro ao salvar os dados. Tente novamente.");
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.innerText = "Salvar e Gerar Relatório";
    }
});