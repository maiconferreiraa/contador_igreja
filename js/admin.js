// Importa 'db' e 'auth'
import { db, auth } from './firebase-config.js';

// Funções de Autenticação
import { 
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// === Funções do Firestore (ATUALIZADO) ===
import { 
    collection,
    query,
    where,
    getDocs,
    orderBy,
    doc,        // Novo: para buscar um documento específico
    getDoc      // Novo: para ler um documento específico
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Elementos da Página
const loadingDiv = document.getElementById('loading');
const adminContent = document.getElementById('admin-content');
const btnLogout = document.getElementById('btn-logout');
const btnFiltrar = document.getElementById('btn-filtrar');
const filtroIgreja = document.getElementById('filtro-igreja');
const filtroData = document.getElementById('filtro-data');
const tabelaResultados = document.getElementById('tabela-resultados');
const semResultados = document.getElementById('sem-resultados');

// Elementos dos Cards de Total
const cardTotalGeral = document.getElementById('total-geral');
const cardTotalRelatorios = document.getElementById('total-relatorios');
const cardTotalMembros = document.getElementById('total-membros');
const cardTotalVisitantes = document.getElementById('total-visitantes');
const cardTotalMembrosAdultos = document.getElementById('total-membros-adultos');
const cardTotalMembrosCias = document.getElementById('total-membros-cias');
const cardTotalVisitantesAdultos = document.getElementById('total-visitantes-adultos');
const cardTotalVisitantesCias = document.getElementById('total-visitantes-cias');

// Elementos dos Filtros (para ajustar o layout)
const filtroIgrejaContainer = document.getElementById('filtro-igreja-container');
const filtroDataContainer = document.getElementById('filtro-data-container');
const btnFiltrarContainer = document.getElementById('btn-filtrar-container');

// Armazena todos os documentos carregados para evitar buscas repetidas
let todosOsDocumentos = [];
let nomesDeIgrejas = new Set(); 

// --- 1. VERIFICAÇÃO DE AUTENTICAÇÃO (ATUALIZADO) ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário está logado, vamos verificar quem ele é
        verificarPermissoes(user);
    } else {
        // Usuário não está logado, redireciona para o login
        console.log('Acesso negado. Redirecionando...');
        window.location.href = 'login.html';
    }
});

// --- 2. (NOVO) VERIFICAR PERMISSÕES ---
async function verificarPermissoes(user) {
    try {
        // Busca o documento do usuário na coleção 'usuarios' usando o UID
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            console.error("Documento de permissão do usuário não encontrado!");
            alert("Sua conta não tem permissões definidas. Contate o administrador.");
            signOut(auth);
            return;
        }

        const userData = userDoc.data();
        const userRole = userData.role;

        loadingDiv.classList.add('d-none');
        adminContent.classList.remove('d-none');

        if (userRole === "admin") {
            // É Admin: Mostra o filtro de igreja e carrega tudo
            filtroIgrejaContainer.classList.remove('d-none');
            carregarDadosIniciais(null); // 'null' significa "carregar tudo"

        } else if (userRole === "secretaria") {
            // É Secretaria: Esconde o filtro de igreja e carrega só os dados da igreja dele
            const userIgreja = userData.igreja;
            if (!userIgreja) {
                 alert("Sua conta de secretaria não está associada a nenhuma igreja.");
                 signOut(auth);
                 return;
            }
            
            // Ajusta o layout dos filtros (data e botão ficam maiores)
            filtroDataContainer.classList.replace('col-md-4', 'col-md-6');
            btnFiltrarContainer.classList.replace('col-md-4', 'col-md-6');
            
            // Carrega os dados (com filtro)
            carregarDadosIniciais(userIgreja); // Passa o nome da igreja

        } else {
            alert("Permissão desconhecida.");
            signOut(auth);
        }

    } catch (error) {
        console.error("Erro ao verificar permissões: ", error);
        alert("Erro ao verificar permissões. Tente recarregar a página.");
        signOut(auth);
    }
}


// --- 3. LÓGICA DE LOGOUT ---
btnLogout.addEventListener('click', () => {
    signOut(auth).catch((error) => {
        console.error('Erro ao sair:', error);
    });
});

// --- 4. LÓGICA DE BUSCA DE DADOS (ATUALIZADO) ---
// Agora a função aceita um parâmetro
async function carregarDadosIniciais(filtroIgrejaSecretaria) {
    try {
        let q; // Nossa consulta (query)
        
        if (filtroIgrejaSecretaria) {
            // É SECRETARIA: Busca apenas os documentos daquela igreja
            q = query(
                collection(db, "contagens"), 
                where("nomeIgreja", "==", filtroIgrejaSecretaria),
                orderBy("timestamp", "desc")
            );
        } else {
            // É ADMIN: Busca todos os documentos
            q = query(collection(db, "contagens"), orderBy("timestamp", "desc"));
        }
        
        const querySnapshot = await getDocs(q);
        
        todosOsDocumentos = []; 
        nomesDeIgrejas.clear(); 

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            todosOsDocumentos.push(data);
            // O Set garante que os nomes não se repitam
            nomesDeIgrejas.add(data.nomeIgreja); 
        });

        // Preenche o dropdown de igrejas (só será útil para o admin)
        preencherFiltroIgrejas();
        // Exibe os dados na tela
        aplicarFiltros();

    } catch (error) {
        console.error("Erro ao buscar documentos: ", error);
        alert("Não foi possível carregar os dados do banco.");
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
// Esta função NÃO PRECISA MUDAR.
// Para o Admin: ela filtra 'todosOsDocumentos' usando o dropdown.
// Para a Secretaria: 'todosOsDocumentos' JÁ VEM FILTRADO, e o dropdown está escondido,
// então ela só vai aplicar o filtro de data. Perfeito.
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
        // Filtro de Igreja: (Para admin, funciona. Para secretaria, valorIgreja é "" e passa direto)
        const filtroIgrejaOk = (valorIgreja === "") || (doc.nomeIgreja === valorIgreja);
        
        // Filtro de Data
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
// Esta função também NÃO PRECISA MUDAR.
function renderizarResultados(dados) {
    tabelaResultados.innerHTML = "";
    
    let totGeral = 0;
    let totMembros = 0;
    let totVisitantes = 0;
    let totMembrosAdultos = 0;
    let totMembrosCias = 0;
    let totVisitantesAdultos = 0;
    let totVisitantesCias = 0;
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