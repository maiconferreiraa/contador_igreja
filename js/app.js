// Importa 'db' e 'auth'
import { db, auth } from './firebase-config.js'; // ADICIONADO: auth
// Importa funções de Autenticação (Login Anônimo)
import { signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
// Importa as funções do Firestore necessárias
import { collection, addDoc, Timestamp, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// --- REFERÊNCIAS AOS ELEMENTOS ---
const form = document.getElementById('contador-form');
const btnSalvar = document.getElementById('btn-salvar');
const btnWhatsApp = document.getElementById('btn-whatsapp');
const msgSucesso = document.getElementById('mensagem-sucesso');
const msgErro = document.getElementById('mensagem-erro');
const dataAtualEl = document.getElementById('data-atual');
const tipoCultoSelect = document.getElementById('tipo-culto');

// Data Manual
const btnEsqueci = document.getElementById('btn-esqueci');
const containerDataManual = document.getElementById('container-data-manual');
const dataManualInput = document.getElementById('data-manual-input');

// Correção
const containerCorrigir = document.getElementById('container-corrigir');
const btnCorrigirUltimo = document.getElementById('btn-corrigir-ultimo');

// Containers dos campos
const camposCultoPadrao = document.getElementById('campos-culto-padrao');
const camposTrombetas = document.getElementById('campos-trombetas');

// Containers específicos de CIAs
const containerMembrosCias = document.getElementById('container-membros-cias');
const containerVisitantesCias = document.getElementById('container-visitantes-cias');

// --- VARIÁVEIS DE ESTADO ---
let modoDataManual = false;
let ultimoIdSalvo = null;        
let ultimoRelatorioSalvo = null; 
let modoEdicaoImediata = false;  

// --- ESTADO INICIAL DO BOTÃO ---
// Bloqueia o botão até confirmar a conexão com o Firebase
btnSalvar.disabled = true;
btnSalvar.innerText = "Conectando...";

// --- AUTENTICAÇÃO ANÔNIMA (Correção do Erro de Permissão) ---
// Tenta logar anonimamente ao carregar a página para ter permissão de escrita
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Usuário autenticado (ID):", user.uid);
        // Libera o botão apenas quando temos um usuário válido
        btnSalvar.disabled = false;
        btnSalvar.innerText = "Salvar Relatório";
    } else {
        // Se não tiver usuário, cria um anônimo
        signInAnonymously(auth).catch((error) => {
            console.error("Erro na autenticação anônima:", error);
            msgErro.innerText = "Erro de conexão: Verifique sua internet.";
            msgErro.classList.remove('d-none');
        });
    }
});

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
        inputsContagemPadrao.forEach(input => {
            total += parseInt(input.value) || 0;
        });
    }
    
    if (totalGeralDisplay) {
        totalGeralDisplay.value = total;
    }
}

[...inputsContagemPadrao, ...inputsContagemTrombetas].forEach(input => {
    input.addEventListener('input', atualizarTotalDisplay);
});

// --- LÓGICA DE EXIBIÇÃO CONDICIONAL ---
tipoCultoSelect.addEventListener('change', () => {
    const tipoCulto = tipoCultoSelect.value;
    
    camposCultoPadrao.classList.add('d-none');
    camposTrombetas.classList.add('d-none');
    containerMembrosCias.classList.add('d-none');
    containerVisitantesCias.classList.add('d-none');

    if (tipoCulto === "TROMBETAS E FESTAS") {
        camposTrombetas.classList.remove('d-none');
    } else if (tipoCulto === "EBD") {
        camposCultoPadrao.classList.remove('d-none');
        containerMembrosCias.classList.remove('d-none');
        containerVisitantesCias.classList.remove('d-none');
    } else {
        camposCultoPadrao.classList.remove('d-none');
        if(!modoEdicaoImediata) { 
            document.getElementById('membros-cias').value = 0;
            document.getElementById('visitantes-cias').value = 0;
        }
    }
    
    atualizarTotalDisplay(); 
});

// --- LÓGICA DO BOTÃO "ESQUECI DE LANÇAR" ---
if (btnEsqueci) {
    btnEsqueci.addEventListener('click', () => {
        modoDataManual = !modoDataManual;
        if (modoDataManual) {
            dataAtualEl.classList.add('d-none');
            containerDataManual.classList.remove('d-none');
            btnEsqueci.innerHTML = '<i class="bi bi-arrow-counterclockwise"></i> Voltar para Lançamento de Hoje';
            btnEsqueci.classList.replace('btn-outline-warning', 'btn-outline-secondary');
            if(!dataManualInput.value) {
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                dataManualInput.value = now.toISOString().slice(0, 16);
            }
        } else {
            containerDataManual.classList.add('d-none');
            dataAtualEl.classList.remove('d-none');
            btnEsqueci.innerHTML = '<i class="bi bi-calendar-event"></i> Esqueci de Lançar (Data Passada)';
            btnEsqueci.classList.replace('btn-outline-secondary', 'btn-outline-warning');
            dataManualInput.value = "";
        }
    });
}

// --- HELPER DE FORMATAÇÃO DE DATA ---
function formatarDataParaString(dataObj) {
    function capitalizar(string) { return string.charAt(0).toUpperCase() + string.slice(1); }
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let dataTexto = dataObj.toLocaleDateString('pt-BR', options);
    dataTexto = dataTexto.split(', ').map(capitalizar).join(', ');
    dataTexto = dataTexto.replace(' De ', ' de ');
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    const horaTexto = dataObj.toLocaleTimeString('pt-BR', timeOptions); 
    return `${dataTexto} às ${horaTexto}`;
}

dataAtualEl.innerText = formatarDataParaString(new Date());

// --- LÓGICA DO BOTÃO "CORRIGIR ÚLTIMO ENVIO" ---
btnCorrigirUltimo.addEventListener('click', () => {
    if (!ultimoRelatorioSalvo || !ultimoIdSalvo) return;

    modoEdicaoImediata = true;
    containerCorrigir.classList.add('d-none'); 
    msgSucesso.classList.add('d-none'); 
    btnWhatsApp.classList.add('d-none'); 
    
    document.getElementById('nome-igreja').value = ultimoRelatorioSalvo.nomeIgreja;
    document.getElementById('tipo-culto').value = ultimoRelatorioSalvo.tipoCulto;
    
    tipoCultoSelect.dispatchEvent(new Event('change'));

    document.getElementById('membros-adultos').value = ultimoRelatorioSalvo.membrosAdultos;
    document.getElementById('membros-cias').value = ultimoRelatorioSalvo.membrosCias;
    document.getElementById('visitantes-adultos').value = ultimoRelatorioSalvo.visitantesAdultos;
    document.getElementById('visitantes-cias').value = ultimoRelatorioSalvo.visitantesCias;
    
    document.getElementById('trombetas-membros-criancas').value = ultimoRelatorioSalvo.trombetasMembrosCriancas;
    document.getElementById('trombetas-membros-intermediarios').value = ultimoRelatorioSalvo.trombetasMembrosIntermediarios;
    document.getElementById('trombetas-membros-adolescentes').value = ultimoRelatorioSalvo.trombetasMembrosAdolescentes;
    document.getElementById('trombetas-membros-adultos').value = ultimoRelatorioSalvo.trombetasMembrosAdultos;
    document.getElementById('trombetas-visitantes-criancas').value = ultimoRelatorioSalvo.trombetasVisitantesCriancas;
    document.getElementById('trombetas-visitantes-intermediarios').value = ultimoRelatorioSalvo.trombetasVisitantesIntermediarios;
    document.getElementById('trombetas-visitantes-adolescentes').value = ultimoRelatorioSalvo.trombetasVisitantesAdolescentes;
    document.getElementById('trombetas-visitantes-adultos').value = ultimoRelatorioSalvo.trombetasVisitantesAdultos;

    btnSalvar.innerText = "Atualizar Relatório";
    btnSalvar.classList.replace('btn-primary', 'btn-warning');
    
    atualizarTotalDisplay();
    window.scrollTo({ top: 0, behavior: 'smooth' });
});


// --- LÓGICA DO FORMULÁRIO (SALVAR / ATUALIZAR) ---
let urlWhatsAppArmazenada = '';

form.addEventListener('input', () => {
    if (!modoEdicaoImediata) {
        btnWhatsApp.classList.add('d-none');
        msgSucesso.classList.add('d-none');
        containerCorrigir.classList.add('d-none');
        msgErro.classList.add('d-none'); // Esconde erro ao tentar novamente
    }
});

form.addEventListener('submit', async function(event) {
    event.preventDefault(); 
    
    let dataReferencia;
    
    if (modoEdicaoImediata && ultimoRelatorioSalvo) {
        if (modoDataManual && dataManualInput.value) {
            dataReferencia = new Date(dataManualInput.value);
        } else {
            dataReferencia = ultimoRelatorioSalvo.timestamp.toDate(); 
        }
    } else {
        if (modoDataManual) {
            if (!dataManualInput.value) {
                alert("Por favor, selecione a data e a hora do culto.");
                return;
            }
            dataReferencia = new Date(dataManualInput.value);
        } else {
            dataReferencia = new Date();
        }
    }
    
    const dataFormatada = formatarDataParaString(dataReferencia);

    btnSalvar.disabled = true;
    btnSalvar.innerText = modoEdicaoImediata ? "Atualizando..." : "Salvando...";
    
    btnWhatsApp.classList.add('d-none');
    msgSucesso.classList.add('d-none');
    msgErro.classList.add('d-none');
    containerCorrigir.classList.add('d-none');
    urlWhatsAppArmazenada = '';

    const nomeIgreja = document.getElementById('nome-igreja').value;
    const tipoCulto = document.getElementById('tipo-culto').value; 

    const relatorio = {
        nomeIgreja: nomeIgreja,
        tipoCulto: tipoCulto,
        dataCompleta: dataFormatada,
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

        mensagemWhats += `
*MEMBROS*: ${mA}

*VISITANTES*: ${vA}

-----------------------------------
*TOTAL GERAL: ${relatorio.totalGeral}*
        `;
    }

    try {
        if (modoEdicaoImediata && ultimoIdSalvo) {
            await updateDoc(doc(db, "contagens", ultimoIdSalvo), relatorio);
            console.log("Documento atualizado:", ultimoIdSalvo);
        } else {
            const docRef = await addDoc(collection(db, "contagens"), relatorio);
            ultimoIdSalvo = docRef.id; 
            console.log("Documento criado:", ultimoIdSalvo);
        }

        ultimoRelatorioSalvo = relatorio;

        msgSucesso.innerHTML = modoEdicaoImediata 
            ? '<i class="bi bi-check-circle-fill"></i> Relatório atualizado com sucesso!'
            : '<i class="bi bi-check-circle-fill"></i> Dados salvos com sucesso!';
            
        msgSucesso.classList.remove('d-none');
        containerCorrigir.classList.remove('d-none');
        
        urlWhatsAppArmazenada = `https://wa.me/?text=${encodeURIComponent(mensagemWhats)}`;
        btnWhatsApp.classList.remove('d-none');

        form.reset(); 
        atualizarTotalDisplay(); 
        tipoCultoSelect.dispatchEvent(new Event('change'));

        if(modoDataManual) btnEsqueci.click(); 
        
        modoEdicaoImediata = false; 
        btnSalvar.innerText = "Salvar Relatório";
        btnSalvar.classList.replace('btn-warning', 'btn-primary');

    } catch (e) {
        console.error("Erro ao salvar/atualizar: ", e);
        // MOSTRA O ERRO REAL PARA O USUÁRIO AJUDAR NO DEBUG
        msgErro.innerText = "Erro ao salvar: " + e.message; 
        msgErro.classList.remove('d-none');
    } finally {
        btnSalvar.disabled = false;
    }
});

btnWhatsApp.addEventListener('click', () => {
    if (urlWhatsAppArmazenada) {
        window.open(urlWhatsAppArmazenada, '_blank');
    }
});