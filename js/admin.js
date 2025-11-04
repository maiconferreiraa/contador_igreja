import { db, auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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

onAuthStateChanged(auth, (user) => {
    if (user) {
        verificarPermissoes(user);
    } else {
        // Redireciona se não houver usuário (é o que acontece após o signOut())
        console.log('Acesso negado. Redirecionando para login.html');
        window.location.href = 'login.html';
    }
});

async function verificarPermissoes(user) {
    try {
        // AQUI É O PONTO QUE FALHA SE AS REGRAS (ETAPA 1) OU A PONTE (ETAPA 2) ESTIVEREM ERRADAS
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            // CAUSA O LOOP DE LOGIN SE A "PONTE" (ETAPA 2) ESTIVER QUEBRADA
            console.error("Documento de permissão do usuário não encontrado! (UID não bate)");
            alert("Sua conta não tem permissões definidas. Contate o administrador.");
            signOut(auth); // Desloga o usuário
            return;
        }

        const userData = userDoc.data();
        const userRole = userData.role;

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
        // CAUSA O LOOP DE LOGIN SE AS REGRAS (ETAPA 1) ESTIVEREM BLOQUEANDO A LEITURA
        console.error("Erro ao verificar permissões: ", error);
        alert("Erro ao verificar permissões. Tente recarregar a página.");
        signOut(auth);
    }
}

btnLogout.addEventListener('click', () => {
    signOut(auth).catch((error) => {
        console.error('Erro ao sair:', error);
    });
});

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

function preencherFiltroIgrejas() {
    filtroIgreja.innerHTML = '<option value="">Todas as Igrejas</option>';
    nomesDeIgrejas.forEach(nome => {
        const option = document.createElement('option');
        option.value = nome;
        option.textContent = nome;
        filtroIgreja.appendChild(option);
    });
}

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