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

// --- NOVOS ELEMENTOS PARA DATA MANUAL (ESQUECI DE LANÇAR) ---
const btnEsqueci = document.getElementById('btn-esqueci');
const containerDataManual = document.getElementById('container-data-manual');
const dataManualInput = document.getElementById('data-manual-input');

// Containers dos campos
const camposCultoPadrao = document.getElementById('campos-culto-padrao');
const camposTrombetas = document.getElementById('campos-trombetas');

// Containers específicos de CIAs para esconder (exceto na EBD)
const containerMembrosCias = document.getElementById('container-membros-cias');
const containerVisitantesCias = document.getElementById('container-visitantes-cias');

// --- VARIÁVEIS DE ESTADO ---
let modoDataManual = false;

// --- LÓGICA DO TOTALIZADOR EM TEMPO REAL ---

const inputsContagemPadrao = [
    document.getElementById('membros-adultos'),
    document.getElementById('membros-cias'),
    document.getElementById('visitantes-adultos'),
    document.getElementById('visitantes-cias')
];

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

const totalGeralDisplay = document.getElementById('total-geral-display');

function atualizarTotalDisplay() {
    let total = 0;
    const tipoCulto = tipoCultoSelect.value;

    if (tipoCulto === "TROMBETAS E FESTAS") {
        inputsContagemTrombetas.forEach(input => {
            total += parseInt(input.value) || 0;
        });
    } else {
        // Soma os 4 campos Padrão (mesmo que escondidos/zerados)
        inputsContagemPadrao.forEach(input => {
            total += parseInt(input.value) || 0;
        });
    }
    
    if (totalGeralDisplay) {
        totalGeralDisplay.value = total;
    }
}

// Adiciona o evento de input para recalcular em tempo real
[...inputsContagemPadrao, ...inputsContagemTrombetas].forEach(input => {
    input.addEventListener('input', atualizarTotalDisplay);
});

// --- LÓGICA DE EXIBIÇÃO CONDICIONAL ---
tipoCultoSelect.addEventListener('change', () => {
    const tipoCulto = tipoCultoSelect.value;
    
    // 1. Reseta tudo primeiro (esconde tudo)
    camposCultoPadrao.classList.add('d-none');
    camposTrombetas.classList.add('d-none');
    containerMembrosCias.classList.add('d-none');
    containerVisitantesCias.classList.add('d-none');

    // 2. Aplica a lógica
    if (tipoCulto === "TROMBETAS E FESTAS") {
        // CASO 1: TROMBETAS
        camposTrombetas.classList.remove('d-none');
        
    } else if (tipoCulto === "EBD") {
        // CASO 2: EBD (Único que mostra CIAs e Adultos)
        camposCultoPadrao.classList.remove('d-none');
        containerMembrosCias.classList.remove('d-none');
        containerVisitantesCias.classList.remove('d-none');

    } else {
        // CASO 3: TODOS OS OUTROS (Diário, Ceia, Vigília, Casamento, etc.)
        // Mostra padrão, mas ESCONDE CIAs
        camposCultoPadrao.classList.remove('d-none');
        // Garante que CIAs estão zerados
        document.getElementById('membros-cias').value = 0;
        document.getElementById('visitantes-cias').value = 0;
    }
    
    atualizarTotalDisplay(); 
});

// --- LÓGICA DO BOTÃO "ESQUECI DE LANÇAR" ---
if (btnEsqueci) {
    btnEsqueci.addEventListener('click', () => {
        modoDataManual = !modoDataManual; // Alterna (Liga/Desliga)

        if (modoDataManual) {
            // MOSTRA O CALENDÁRIO
            dataAtualEl.classList.add('d-none');
            containerDataManual.classList.remove('d-none');
            
            // Muda aparência do botão
            btnEsqueci.innerHTML = '<i class="bi bi-arrow-counterclockwise"></i> Voltar para Lançamento de Hoje';
            btnEsqueci.classList.replace('btn-outline-warning', 'btn-outline-secondary');
            
            // Define data padrão se vazio
            if(!dataManualInput.value) {
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                dataManualInput.value = now.toISOString().slice(0, 16);
            }
        } else {
            // ESCONDE O CALENDÁRIO (Volta ao normal)
            containerDataManual.classList.add('d-none');
            dataAtualEl.classList.remove('d-none');
            
            // Reseta botão
            btnEsqueci.innerHTML = '<i class="bi bi-calendar-event"></i> Esqueci de Lançar (Data Passada)';
            btnEsqueci.classList.replace('btn-outline-secondary', 'btn-outline-warning');
            dataManualInput.value = "";
        }
    });
}

// --- HELPER DE FORMATAÇÃO DE DATA ---
function formatarDataParaString(dataObj) {
    function capitalizar(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let dataTexto = dataObj.toLocaleDateString('pt-BR', options);
    dataTexto = dataTexto.split(', ').map(capitalizar).join(', ');
    dataTexto = dataTexto.replace(' De ', ' de ');
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    const horaTexto = dataObj.toLocaleTimeString('pt-BR', timeOptions); 
    return `${dataTexto} às ${horaTexto}`;
}

// --- EXIBIÇÃO DA DATA INICIAL (HOJE) ---
dataAtualEl.innerText = formatarDataParaString(new Date());

// --- LÓGICA DO FORMULÁRIO (SALVAR) ---
let urlWhatsAppArmazenada = '';

form.addEventListener('input', () => {
    btnWhatsApp.classList.add('d-none');
    msgSucesso.classList.add('d-none');
    msgErro.classList.add('d-none');
});

form.addEventListener('submit', async function(event) {
    event.preventDefault(); 
    
    // --- DECISÃO DA DATA (Manual ou Automática) ---
    let dataReferencia;
    
    if (modoDataManual) {
        if (!dataManualInput.value) {
            alert("Por favor, selecione a data e a hora do culto.");
            return;
        }
        dataReferencia = new Date(dataManualInput.value);
    } else {
        dataReferencia = new Date();
    }
    
    // Formata a string bonita para exibir na tabela e no WhatsApp
    const dataFormatada = formatarDataParaString(dataReferencia);

    btnSalvar.disabled = true;
    btnSalvar.innerText = "Salvando...";
    
    btnWhatsApp.classList.add('d-none');
    msgSucesso.classList.add('d-none');
    msgErro.classList.add('d-none');
    urlWhatsAppArmazenada = '';

    const nomeIgreja = document.getElementById('nome-igreja').value;
    const tipoCulto = document.getElementById('tipo-culto').value; 

    const relatorio = {
        nomeIgreja: nomeIgreja,
        tipoCulto: tipoCulto,
        dataCompleta: dataFormatada,
        // IMPORTANTE: Usa a dataReferencia para o Timestamp (ordenação correta no admin)
        timestamp: Timestamp.fromDate(dataReferencia),
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

    if (tipoCulto === "TROMBETAS E FESTAS") {
        // === TROMBETAS (Completo) ===
        const mC = parseInt(document.getElementById('trombetas-membros-criancas').value) || 0;
        const mI = parseInt(document.getElementById('trombetas-membros-intermediarios').value) || 0;
        const mAd = parseInt(document.getElementById('trombetas-membros-adolescentes').value) || 0;
        const mA = parseInt(document.getElementById('trombetas-membros-adultos').value) || 0;
        const vC = parseInt(document.getElementById('trombetas-visitantes-criancas').value) || 0;
        const vI = parseInt(document.getElementById('trombetas-visitantes-intermediarios').value) || 0;
        const vAd = parseInt(document.getElementById('trombetas-visitantes-adolescentes').value) || 0;
        const vA = parseInt(document.getElementById('trombetas-visitantes-adultos').value) || 0;

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

    } else if (tipoCulto === "EBD") {
        // === EBD (Membros e CIAs) ===
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

    } else {
        // === TODOS OS OUTROS (Apenas Membros e Visitantes - SEM CIAs) ===
        const mA = parseInt(document.getElementById('membros-adultos').value) || 0;
        const vA = parseInt(document.getElementById('visitantes-adultos').value) || 0;
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

        // MENSAGEM MODIFICADA: Apenas "Membros" e "Visitantes" (Sem a palavra Adulto)
        mensagemWhats += `
*MEMBROS*: ${mA}

*VISITANTES*: ${vA}

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
        
        // Força o reset visual da lógica de campos
        tipoCultoSelect.dispatchEvent(new Event('change'));

        // Se estava no modo manual, volta para o automático após salvar
        if(modoDataManual) {
            btnEsqueci.click(); 
        }

        urlWhatsAppArmazenada = `https://wa.me/?text=${encodeURIComponent(mensagemWhats)}`;
        btnWhatsApp.classList.remove('d-none');
        
    } catch (e) {
        console.error("Erro ao adicionar documento: ", e);
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
