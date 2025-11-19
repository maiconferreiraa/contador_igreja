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
const tipoCultoSelect = document.getElementById('tipo-culto');

// Containers dos campos
const camposCultoPadrao = document.getElementById('campos-culto-padrao');
const camposTrombetas = document.getElementById('campos-trombetas');

// Containers específicos de CIAs para esconder no Culto Diário
const containerMembrosCias = document.getElementById('container-membros-cias');
const containerVisitantesCias = document.getElementById('container-visitantes-cias');

// --- LÓGICA DO TOTALIZADOR EM TEMPO REAL ---

// Inputs Padrão (AGORA INCLUI CIAS NOVAMENTE)
const inputsContagemPadrao = [
    document.getElementById('membros-adultos'),
    document.getElementById('membros-cias'),
    document.getElementById('visitantes-adultos'),
    document.getElementById('visitantes-cias')
];

// Inputs Trombetas (8 campos)
const inputsContagemTrombetas = [
    document.getElementById('trombetas-membros-criancas'),
    document.getElementById('trombetas-membros-intermediarios'),
    document.getElementById('trombetas-membros-adolescentes'),
    document.getElementById('trombetas-membros-adultos'),
    document.getElementById('trombetas-visitantes-criancas'),
    document.getElementById('trombetas-visitantes-intermediarios'),
    document.getElementById('trombetas-visitantes-adolescentes'),
    document.getElementById('trombetas-visitantes-adultos')
];

// Pega o campo de display do total
const totalGeralDisplay = document.getElementById('total-geral-display');

// Função para atualizar o total
function atualizarTotalDisplay() {
    let total = 0;
    const tipoCulto = tipoCultoSelect.value;

    if (tipoCulto === "TROMBETAS E FESTAS") {
        // Soma os 8 campos de Trombetas
        inputsContagemTrombetas.forEach(input => {
            total += parseInt(input.value) || 0;
        });
    } else {
        // Soma os 4 campos Padrão
        // No Culto Diário, os inputs de CIAs estarão zerados e escondidos, então a soma funcionará igual
        inputsContagemPadrao.forEach(input => {
            total += parseInt(input.value) || 0;
        });
    }
    
    // Atualiza o valor no campo de total (somente leitura)
    if (totalGeralDisplay) {
        totalGeralDisplay.value = total;
    }
}

// Adiciona o "escutador" para todos os inputs
[...inputsContagemPadrao, ...inputsContagemTrombetas].forEach(input => {
    input.addEventListener('input', atualizarTotalDisplay);
});
// =======================================


// --- LÓGICA DE EXIBIÇÃO CONDICIONAL ---
tipoCultoSelect.addEventListener('change', () => {
    const tipoCulto = tipoCultoSelect.value;
    
    // Reseta visibilidade (esconde tudo primeiro)
    camposCultoPadrao.classList.add('d-none');
    camposTrombetas.classList.add('d-none');
    // Garante que os containers de CIA voltem a aparecer caso venham de um "Diário"
    containerMembrosCias.classList.remove('d-none');
    containerVisitantesCias.classList.remove('d-none');

    if (tipoCulto === "TROMBETAS E FESTAS") {
        // Mostra apenas Trombetas
        camposTrombetas.classList.remove('d-none');
        
    } else if (tipoCulto === "CULTO DIÁRIO") {
        // Mostra Padrão, mas ESCONDE CIAs especificamente
        camposCultoPadrao.classList.remove('d-none');
        containerMembrosCias.classList.add('d-none');
        containerVisitantesCias.classList.add('d-none');
        
        // Zera os valores de CIAs para não afetar a soma
        document.getElementById('membros-cias').value = 0;
        document.getElementById('visitantes-cias').value = 0;

    } else {
        // Para todos os outros (EBD, CEIA, VIGÍLIA, etc)
        // Mostra Padrão COMPLETO (com CIAs visíveis)
        camposCultoPadrao.classList.remove('d-none');
    }
    
    // Atualiza o total ao trocar o tipo de culto
    atualizarTotalDisplay(); 
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

    // === Pega a data e hora EXATAS do clique ===
    const hoje = new Date(); 
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let dataFormatada = hoje.toLocaleDateString('pt-BR', options);
    dataFormatada = dataFormatada.split(', ').map(capitalizar).join(', ');
    dataFormatada = dataFormatada.replace(' De ', ' de ');
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    const horaFormatada = hoje.toLocaleTimeString('pt-BR', timeOptions); 
    dataFormatada = `${dataFormatada} às ${horaFormatada}`;
    // ===============================================

    // Pegar os valores dos campos
    const nomeIgreja = document.getElementById('nome-igreja').value;
    const tipoCulto = document.getElementById('tipo-culto').value; 

    // Objeto base do relatório
    const relatorio = {
        nomeIgreja: nomeIgreja,
        tipoCulto: tipoCulto,
        dataCompleta: dataFormatada,
        timestamp: Timestamp.now(),
        membrosAdultos: 0,
        membrosCias: 0,
        visitantesAdultos: 0,
        visitantesCias: 0,
        trombetasMembrosCriancas: 0,
        trombetasMembrosIntermediarios: 0,
        trombetasMembrosAdolescentes: 0,
        trombetasMembrosAdultos: 0,
        trombetasVisitantesCriancas: 0,
        trombetasVisitantesIntermediarios: 0,
        trombetasVisitantesAdolescentes: 0,
        trombetasVisitantesAdultos: 0,
        totalMembros: 0,
        totalVisitantes: 0,
        totalGeral: 0
    };

    let mensagemWhats = `
*RELATÓRIO DE PRESENÇA*
Igreja: *${nomeIgreja}*
Culto: *${tipoCulto}*
Data: _${dataFormatada}_

-----------------------------------`;

    // === CASO 1: TROMBETAS ===
    if (tipoCulto === "TROMBETAS E FESTAS") {
        const mC = parseInt(document.getElementById('trombetas-membros-criancas').value) || 0;
        const mI = parseInt(document.getElementById('trombetas-membros-intermediarios').value) || 0;
        const mAd = parseInt(document.getElementById('trombetas-membros-adolescentes').value) || 0;
        const mA = parseInt(document.getElementById('trombetas-membros-adultos').value) || 0;
        const vC = parseInt(document.getElementById('trombetas-visitantes-criancas').value) || 0;
        const vI = parseInt(document.getElementById('trombetas-visitantes-intermediarios').value) || 0;
        const vAd = parseInt(document.getElementById('trombetas-visitantes-adolescentes').value) || 0;
        const vA = parseInt(document.getElementById('trombetas-visitantes-adultos').value) || 0;

        // Salva no objeto 'relatorio'
        relatorio.trombetasMembrosCriancas = mC;
        relatorio.trombetasMembrosIntermediarios = mI;
        relatorio.trombetasMembrosAdolescentes = mAd;
        relatorio.trombetasMembrosAdultos = mA;
        relatorio.trombetasVisitantesCriancas = vC;
        relatorio.trombetasVisitantesIntermediarios = vI;
        relatorio.trombetasVisitantesAdolescentes = vAd;
        relatorio.trombetasVisitantesAdultos = vA;

        const totalMembros = mC + mI + mAd + mA;
        const totalVisitantes = vC + vI + vAd + vA;
        relatorio.totalMembros = totalMembros;
        relatorio.totalVisitantes = totalVisitantes;
        relatorio.totalGeral = totalMembros + totalVisitantes;

        mensagemWhats += `
*MEMBROS*
Crianças: ${mC}
Intermediários: ${mI}
Adolescentes: ${mAd}
Adultos: ${mA}
*Total Membros: ${totalMembros}*

-----------------------------------
*VISITANTES*
Crianças: ${vC}
Intermediários: ${vI}
Adolescentes: ${vAd}
Adultos: ${vA}
*Total Visitantes: ${totalVisitantes}*

-----------------------------------
*TOTAL GERAL: ${relatorio.totalGeral}*
        `;

    // === CASO 2: CULTO DIÁRIO (Sem CIAs) ===
    } else if (tipoCulto === "CULTO DIÁRIO") {
        const mA = parseInt(document.getElementById('membros-adultos').value) || 0;
        const vA = parseInt(document.getElementById('visitantes-adultos').value) || 0;
        // CIAs são ignorados (0)
        const mC = 0;
        const vC = 0;

        relatorio.membrosAdultos = mA;
        relatorio.membrosCias = mC; 
        relatorio.visitantesAdultos = vA;
        relatorio.visitantesCias = vC; 

        const totalMembros = mA;
        const totalVisitantes = vA;
        relatorio.totalMembros = totalMembros;
        relatorio.totalVisitantes = totalVisitantes;
        relatorio.totalGeral = totalMembros + totalVisitantes;

        mensagemWhats += `
*MEMBROS*
Adultos: ${mA}
*Total Membros: ${totalMembros}*

-----------------------------------
*VISITANTES*
Adultos: ${vA}
*Total Visitantes: ${totalVisitantes}*

-----------------------------------
*TOTAL GERAL: ${relatorio.totalGeral}*
        `;

    // === CASO 3: EBD, CEIA, VIGÍLIA (Completo com CIAs) ===
    } else {
        const mA = parseInt(document.getElementById('membros-adultos').value) || 0;
        const mC = parseInt(document.getElementById('membros-cias').value) || 0;
        const vA = parseInt(document.getElementById('visitantes-adultos').value) || 0;
        const vC = parseInt(document.getElementById('visitantes-cias').value) || 0;

        relatorio.membrosAdultos = mA;
        relatorio.membrosCias = mC;
        relatorio.visitantesAdultos = vA;
        relatorio.visitantesCias = vC;

        const totalMembros = mA + mC;
        const totalVisitantes = vA + vC;
        relatorio.totalMembros = totalMembros;
        relatorio.totalVisitantes = totalVisitantes;
        relatorio.totalGeral = totalMembros + totalVisitantes;

        mensagemWhats += `
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
*TOTAL GERAL: ${relatorio.totalGeral}*
        `;
    }

    try {
        await addDoc(collection(db, "contagens"), relatorio);
        
        msgSucesso.classList.remove('d-none');
        setTimeout(() => msgSucesso.classList.add('d-none'), 3000);
        
        form.reset(); 
        atualizarTotalDisplay(); 
        
        // Força o disparo do evento change para resetar a interface visual para o estado inicial
        // Isso garante que se o formulário resetar para "Selecione...", os campos fiquem corretos
        tipoCultoSelect.dispatchEvent(new Event('change'));

        urlWhatsAppArmazenada = `https://wa.me/?text=${encodeURIComponent(mensagemWhats)}`;
        
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