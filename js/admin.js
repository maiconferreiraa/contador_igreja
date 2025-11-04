// Importa 'db' e 'auth'
import { db, auth } from './firebase-config.js';

// Funções de Autenticação
import { 
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// Funções do Firestore
import { 
    collection,
    query,
    where,
    getDocs,
    orderBy,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// (O resto dos 'getElementById' está aqui... igual ao anterior)
const loadingDiv = document.getElementById('loading');
const adminContent = document.getElementById('admin-content');
const btnLogout = document.getElementById('btn-logout');
const btnFiltrar = document.getElementById('btn-filtrar');
const filtroIgreja = document.getElementById('filtro-igreja');
const filtroData = document.getElementById('filtro-data');
const tabelaResultados = document.getElementById('tabela-resultados');
const semResultados = document.getElementById('sem-resultados');
const cardTotalGeral = document.getElementById('total-geral');
const cardTotalRelatorios = document.getElementById('total-relatorios');
const cardTotalMembros = document.getElementById('total-membros');
const cardTotalVisitantes = document.getElementById('total-visitantes');
const cardTotalMembrosAdultos = document.getElementById('total-membros-adultos');
const cardTotalMembrosCias = document.getElementById('total-membros-cias');
const cardTotalVisitantesAdultos = document.getElementById('total-visitantes-adultos');
const cardTotalVisitantesCias = document.getElementById('total-visitantes-cias');
const filtroIgrejaContainer = document.getElementById('filtro-igreja-container');
const filtroDataContainer = document.getElementById('filtro-data-container');
const btnFiltrarContainer = document.getElementById('btn-filtrar-container');
let todosOsDocumentos = [];
let nomesDeIgrejas = new Set(); 

// --- 1. VERIFICAÇÃO DE AUTENTICAÇÃO ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário está logado, vamos verificar quem ele é
        verificarPermissoes(user);
    } else {
        // Usuário não está logado, redireciona para o login
        console.log('DEBUG: Usuário não está logado (ou foi deslogado). Redirecionando para login.html');
        window.location.href = 'login.html';
    }
});

// --- 2. VERIFICAR PERMISSÕES ---
async function verificarPermissoes(user) {
    
    // === DEBUG 1: MOSTRA O UID QUE ESTAMOS USANDO ===
    console.log("DEBUG: Verificando permissões para o UID:", user.uid);

    try {
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDoc = await getDoc(userDocRef);

        // === DEBUG 2: MOSTRA SE O DOCUMENTO FOI ENCONTRADO ===
        console.log("DEBUG: Documento encontrado no Firestore?", userDoc.exists());

        if (!userDoc.exists()) {
            console.error("DEBUG: FALHA! Documento de permissão do usuário não encontrado! (UID não bate)");
            alert("Sua conta não tem permissões definidas. Verifique o Firestore.");
            signOut(auth); // Desloga o usuário
            return;
        }

        const userData = userDoc.data();
        const userRole = userData.role;

        // === DEBUG 3: MOSTRA O CARGO ENCONTRADO ===
        console.log("DEBUG: Cargo (role) encontrado:", userRole);

        loadingDiv.classList.add('d-none');
        adminContent.classList.remove('d-none');

        if (userRole === "admin") {
            filtroIgrejaContainer.classList.remove('d-none');
            carregarDadosIniciais(null);
        } else if (userRole === "secretaria") {
            const userIgreja = userData.igreja;
            if (!userIgreja) {
                 alert("Sua conta de secretaria não está associada a nenhuma igreja.");
                 signOut(auth);
                 return;
            }
            filtroDataContainer.classList.replace('col-md-4', 'col-md-6');
            btnFiltrarContainer.classList.replace('col-md-4', 'col-md-6');
            document.getElementById('admin-cards-container').classList.add('d-none');
            const relatoriosContainer = document.getElementById('card-relatorios-container');
            relatoriosContainer.classList.remove('col-lg-4');
            relatoriosContainer.classList.add('col-lg-6');
            carregarDadosIniciais(userIgreja);
        } else {
            alert("Permissão desconhecida.");
            signOut(auth);
        }

    } catch (error) {
        // === DEBUG 4: MOSTRA SE HOUVE UM ERRO NAS REGRAS ===
        console.error("DEBUG: FALHA! Erro ao verificar permissões (provavelmente as Regras do Firestore): ", error.message);
        alert("Erro ao verificar permissões. Verifique as Regras do Firestore.");
        signOut(auth);
    }
}


// --- 3. LÓGICA DE LOGOUT ---
btnLogout.addEventListener('click', () => {
    signOut(auth).catch((error) => {
        console.error('Erro ao sair:', error);
    });
});

// --- 4. LÓGICA DE BUSCA DE DADOS ---
async function carregarDadosIniciais(filtroIgrejaSecretaria) {
    try {
        let q;
        if (filtroIgrejaSecretaria) {
            q = query(
                collection(db, "contagens"), 
                where("nomeIgreja", "==", filtroIgrejaSecretaria),
                orderBy("timestamp", "desc")
            );
        } else {
            q = query(collection(db, "contagens"), orderBy("timestamp", "desc"));
        }
        
        const querySnapshot = await getDocs(q);
        todosOsDocumentos = []; 
        nomesDeIgrejas.clear(); 
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            todosOsDocumentos.push(data);
            nomesDeIgrejas.add(data.nomeIgreja); 
        });
        preencherFiltroIgrejas();
        aplicarFiltros();
    } catch (error) {
        console.error("Erro ao buscar documentos: ", error);
        alert("Não foi possível carregar os dados do banco. (Verifique os Índices do Firestore)");
    }
}

// --- 5. PREENCHE O FILTRO DE IGREJAS ---
function preencherFiltroIgrejas() {
    filtroIgreja.innerHTML = '<option value="">Todas as Igrejas</option>';
    nomesDeIgrejas.forEach(nome => {
        const option = document.createElement('option');
        option.value = nome;
        option.textContent = nome;
        filtroIgreja.appendChild(option);
    });
}

// --- 6. LÓGICA DE FILTRAGEM ---
btnFiltrar.addEventListener('click', aplicarFiltros);
function aplicarFiltros() {
    const valorIgreja = filtroIgreja.value;
    const valorData = filtroData.value;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); 
    let dataInicio;
    if (valorData === 'week') {
        dataInicio = new Date(hoje.setDate(hoje.getDate() - hoje.getDay()));
    } else if (valorData === 'month') {
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    } else if (valorData === 'year') {
        dataInicio = new Date(hoje.getFullYear(), 0, 1);
    }
    const dadosFiltrados = todosOsDocumentos.filter(doc => {
        const filtroIgrejaOk = (valorIgreja === "") || (doc.nomeIgreja === valorIgreja);
        let filtroDataOk = true;
        if (dataInicio) {
            const dataDoc = doc.timestamp.toDate();
            filtroDataOk = dataDoc >= dataInicio;
        }
        return filtroIgrejaOk && filtroDataOk;
    });
    renderizarResultados(dadosFiltrados);
}


// --- 7. RENDERIZA OS DADOS NA TELA ---
function renderizarResultados(dados) {
    tabelaResultados.innerHTML = "";
    let totGeral = 0, totMembros = 0, totVisitantes = 0;
    let totMembrosAdultos = 0, totMembrosCias = 0;
    let totVisitantesAdultos = 0, totVisitantesCias = 0;
    let totRelatorios = dados.length;

    if (totRelatorios === 0) {
        semResultados.classList.remove('d-none');
    } else {
        semResultados.classList.add('d-none');
    }

    dados.forEach(doc => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${doc.nomeIgreja}</td>
            <td>${doc.dataCompleta}</td>
            <td>${doc.membrosAdultos || 0}</td>
            <td>${doc.membrosCias || 0}</td>
            <td>${doc.visitantesAdultos || 0}</td>
            <td>${doc.visitantesCias || 0}</td>
            <td><strong>${doc.totalGeral}</strong></td>
        `;
        tabelaResultados.appendChild(tr);
        totGeral += (doc.totalGeral || 0);
        totMembros += (doc.totalMembros || 0);
        totVisitantes += (doc.totalVisitantes || 0);
        totMembrosAdultos += (doc.membrosAdultos || 0);
        totMembrosCias += (doc.membrosCias || 0);
        totVisitantesAdultos += (doc.visitantesAdultos || 0);
        totVisitantesCias += (doc.visitantesCias || 0);
    });

    cardTotalGeral.innerText = totGeral;
    cardTotalRelatorios.innerText = totRelatorios;
    cardTotalMembros.innerText = totMembros;
    cardTotalVisitantes.innerText = totVisitantes;
    cardTotalMembrosAdultos.innerText = totMembrosAdultos;
    cardTotalMembrosCias.innerText = totMembrosCias;
    cardTotalVisitantesAdultos.innerText = totVisitantesAdultos;
    cardTotalVisitantesCias.innerText = totVisitantesCias;
}