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
    getDoc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// --- Referências aos Elementos ---
const loadingDiv = document.getElementById('loading');
const adminContent = document.getElementById('admin-content');
const btnLogout = document.getElementById('btn-logout');
const btnFiltrar = document.getElementById('btn-filtrar');
const filtroIgreja = document.getElementById('filtro-igreja');
const filtroData = document.getElementById('filtro-data');
const tabelaResultados = document.getElementById('tabela-resultados');
const semResultados = document.getElementById('sem-resultados');

// Cards (Simplificado)
const cardTotalRelatorios = document.getElementById('total-relatorios');

// Containers
const filtroIgrejaContainer = document.getElementById('filtro-igreja-container');
const filtroDataContainer = document.getElementById('filtro-data-container');
const btnFiltrarContainer = document.getElementById('btn-filtrar-container');
const thAcoes = document.getElementById('th-acoes'); 

// === CAMPO DE MÊS ===
const filtroMesEspecificoContainer = document.getElementById('filtro-mes-especifico-container');
const filtroMesEspecifico = document.getElementById('filtro-mes-especifico');

// --- Referências aos Modais ---
const editModalEl = document.getElementById('editModal');
const editModal = new bootstrap.Modal(editModalEl); 
const btnSaveEdit = document.getElementById('btn-save-edit');
const editForm = document.getElementById('edit-form');

const deleteModalEl = document.getElementById('deleteModal');
const deleteModal = new bootstrap.Modal(deleteModalEl); 
const btnConfirmDelete = document.getElementById('btn-confirm-delete');

// --- Variáveis Globais ---
let todosOsDocumentos = [];
let nomesDeIgrejas = new Set(); 
let currentUserRole = null; 

// --- 1. VERIFICAÇÃO DE AUTENTICAÇÃO ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        verificarPermissoes(user);
    } else {
        console.log('DEBUG: Usuário não está logado. Redirecionando para login.html');
        window.location.href = 'login.html';
    }
});

// --- 2. VERIFICAR PERMISSÕES ---
async function verificarPermissoes(user) {
    
    console.log("DEBUG: Verificando permissões para o UID:", user.uid);

    try {
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDoc = await getDoc(userDocRef);

        console.log("DEBUG: Documento encontrado no Firestore?", userDoc.exists());

        if (!userDoc.exists()) {
            console.error("DEBUG: FALHA! Documento de permissão não encontrado!");
            alert("Sua conta não tem permissões definidas. Verifique o Firestore.");
            signOut(auth); 
            return;
        }

        const userData = userDoc.data();
        currentUserRole = userData.role; 

        console.log("DEBUG: Cargo (role) encontrado:", currentUserRole);

        loadingDiv.classList.add('d-none');
        adminContent.classList.remove('d-none');
        
        // Esconde cards extras (se existirem no HTML antigo)
        const adminCards = document.getElementById('admin-cards-container');
        if (adminCards) {
            adminCards.classList.add('d-none');
        }
        // Ajusta layout do card restante
        const relatoriosContainer = document.getElementById('card-relatorios-container');
        if (relatoriosContainer) {
            relatoriosContainer.classList.remove('col-lg-4', 'col-lg-5');
            // Ajusta o layout do card restante para ocupar o espaço
            relatoriosContainer.classList.add('col-md-6', 'col-lg-6');
        }

        if (currentUserRole === "admin") {
            filtroIgrejaContainer.classList.remove('d-none');
            thAcoes.classList.remove('d-none'); // Mostra coluna "Ações"
            carregarDadosIniciais(null); 
        } else if (currentUserRole === "secretaria") {
            const userIgreja = userData.igreja;
            if (!userIgreja) {
                 alert("Sua conta de secretaria não está associada a nenhuma igreja.");
                 signOut(auth); 
                 return;
            }
            // Ajusta layout dos filtros para Secretaria
            filtroDataContainer.classList.replace('col-md-3', 'col-md-4');
            btnFiltrarContainer.classList.replace('col-md-3', 'col-md-4');
            filtroMesEspecificoContainer.classList.replace('col-md-3', 'col-md-4');
            
            // === MUDANÇA: Mostra coluna "Ações" para Secretaria ===
            thAcoes.classList.remove('d-none');
            // ==================

            carregarDadosIniciais(userIgreja); 
        } else {
            alert("Permissão desconhecida.");
            signOut(auth);
        }

    } catch (error) {
        console.error("DEBUG: FALHA! Erro ao verificar permissões: ", error.message);
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
            todosOsDocumentos.push({ id: doc.id, ...doc.data() });
            nomesDeIgrejas.add(doc.data().nomeIgreja); 
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

// --- 6. LÓGICA DE FILTRAGEM (ATUALIZADA) ---

// Evento para mostrar/esconder o input de mês
filtroData.addEventListener('change', () => {
    if (filtroData.value === 'specific-month') {
        filtroMesEspecificoContainer.classList.remove('d-none');
    } else {
        filtroMesEspecificoContainer.classList.add('d-none');
    }
});

btnFiltrar.addEventListener('click', aplicarFiltros);

function aplicarFiltros() {
    const valorIgreja = filtroIgreja.value;
    const valorData = filtroData.value;
    const valorMesEspecifico = filtroMesEspecifico.value; // Pega o valor do YYYY-MM

    let dataInicio, dataFim; // indefinidos por padrão (para "todo o período")
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); 

    if (valorData === 'week') {
        dataInicio = new Date(hoje.setDate(hoje.getDate() - hoje.getDay()));
        dataFim = new Date(); 
        dataFim.setHours(23, 59, 59, 999);
    } else if (valorData === 'month') {
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0); 
        dataFim.setHours(23, 59, 59, 999);
    } else if (valorData === 'year') {
        dataInicio = new Date(hoje.getFullYear(), 0, 1);
        dataFim = new Date(hoje.getFullYear(), 11, 31);
        dataFim.setHours(23, 59, 59, 999);
    } else if (valorData === 'specific-month') {
        if (!valorMesEspecifico) {
            alert("Por favor, selecione um mês para filtrar.");
            return; 
        }
        const [ano, mes] = valorMesEspecifico.split('-').map(Number);
        dataInicio = new Date(ano, mes - 1, 1);
        dataFim = new Date(ano, mes, 0); 
        dataFim.setHours(23, 59, 59, 999);
    }

    const dadosFiltrados = todosOsDocumentos.filter(doc => {
        const filtroIgrejaOk = (valorIgreja === "") || (doc.nomeIgreja === valorIgreja);
        let filtroDataOk = true; 
        if (dataInicio && dataFim) {
            const dataDoc = doc.timestamp.toDate();
            filtroDataOk = dataDoc >= dataInicio && dataDoc <= dataFim;
        }
        return filtroIgrejaOk && filtroDataOk;
    });

    renderizarResultados(dadosFiltrados);
}


// --- 7. RENDERIZA OS DADOS NA TELA (com 'tipoCulto') ---
function renderizarResultados(dados) {
    tabelaResultados.innerHTML = "";
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
            <td>${doc.tipoCulto || 'N/D'}</td> <!-- MOSTRA O TIPO DE CULTO -->
            <td>${doc.dataCompleta}</td>
            <td>${doc.membrosAdultos || 0}</td>
            <td>${doc.membrosCias || 0}</td>
            <td>${doc.visitantesAdultos || 0}</td>
            <td>${doc.visitantesCias || 0}</td>
            <td><strong>${doc.totalGeral}</strong></td>
        `;

        // Adiciona botões de Ação se for admin OU secretaria
        if (currentUserRole === 'admin' || currentUserRole === 'secretaria') {
            const tdAcoes = document.createElement('td');
            tdAcoes.innerHTML = `
                <button class="btn btn-sm btn-outline-primary btn-edit" data-id="${doc.id}" title="Editar">
                    <i class="bi bi-pencil-fill"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${doc.id}" title="Excluir">
                    <i class="bi bi-trash-fill"></i>
                </button>
            `;
            tr.appendChild(tdAcoes);
        }
        tabelaResultados.appendChild(tr);
    });
    cardTotalRelatorios.innerText = totRelatorios;
}

// --- 8. LÓGICA DE EVENTOS DA TABELA (EDITAR/EXCLUIR) ---
tabelaResultados.addEventListener('click', (e) => {
    const target = e.target.closest('button'); 
    if (!target) return; 
    const docId = target.dataset.id; 
    if (target.classList.contains('btn-edit')) {
        abrirModalEdicao(docId);
    }
    if (target.classList.contains('btn-delete')) {
        abrirModalExclusao(docId);
    }
});

// --- 9. LÓGICA DE EDIÇÃO (com 'tipoCulto') ---
function abrirModalEdicao(id) {
    const docParaEditar = todosOsDocumentos.find(doc => doc.id === id);
    if (!docParaEditar) return;
    document.getElementById('edit-doc-id').value = id;
    document.getElementById('edit-nome-igreja').innerText = docParaEditar.nomeIgreja;
    document.getElementById('edit-data-completa').innerText = docParaEditar.dataCompleta;
    
    // Define o valor do 'tipoCulto' no modal
    document.getElementById('edit-tipo-culto').value = docParaEditar.tipoCulto || 'CULTO DIÁRIO';

    document.getElementById('edit-membros-adultos').value = docParaEditar.membrosAdultos;
    document.getElementById('edit-membros-cias').value = docParaEditar.membrosCias;
    document.getElementById('edit-visitantes-adultos').value = docParaEditar.visitantesAdultos;
    document.getElementById('edit-visitantes-cias').value = docParaEditar.visitantesCias;
    editModal.show();
}

btnSaveEdit.addEventListener('click', async () => {
    const id = document.getElementById('edit-doc-id').value;
    if (!id) return;
    btnSaveEdit.disabled = true;
    btnSaveEdit.innerText = "Salvando...";
    try {
        // Pega os novos valores do formulário
        const tipoCulto = document.getElementById('edit-tipo-culto').value; // PEGA O NOVO CAMPO
        const mA = parseInt(document.getElementById('edit-membros-adultos').value) || 0;
        const mC = parseInt(document.getElementById('edit-membros-cias').value) || 0;
        const vA = parseInt(document.getElementById('edit-visitantes-adultos').value) || 0;
        const vC = parseInt(document.getElementById('edit-visitantes-cias').value) || 0;
        
        // Recalcula os totais
        const totalMembros = mA + mC;
        const totalVisitantes = vA + vC;
        const totalGeral = totalMembros + totalVisitantes;

        const dadosAtualizados = {
            tipoCulto: tipoCulto, // SALVA O NOVO CAMPO
            membrosAdultos: mA,
            membrosCias: mC,
            visitantesAdultos: vA,
            visitantesCias: vC,
            totalMembros: totalMembros,
            totalVisitantes: totalVisitantes,
            totalGeral: totalGeral,
        };
        
        const docRef = doc(db, "contagens", id);
        await updateDoc(docRef, dadosAtualizados);
        editModal.hide();
        
        const docAtualizado = todosOsDocumentos.find(doc => doc.id === id);
        const filtroIgrejaAdmin = currentUserRole === 'admin' ? null : docAtualizado?.nomeIgreja;
        carregarDadosIniciais(filtroIgrejaAdmin);
    } catch (error) {
        console.error("Erro ao atualizar documento: ", error);
        alert("Falha ao salvar. Verifique as regras do Firestore.");
    } finally {
        btnSaveEdit.disabled = false;
        btnSaveEdit.innerText = "Salvar Alterações";
    }
});

// --- 10. LÓGICA DE EXCLUSÃO (CORRIGIDA) ---
let idParaExcluir = null; 
function abrirModalExclusao(id) {
    const docParaExcluir = todosOsDocumentos.find(doc => doc.id === id);
    if (!docParaExcluir) return;
    document.getElementById('delete-nome-igreja').innerText = docParaExcluir.nomeIgreja;
    document.getElementById('delete-data-completa').innerText = docParaExcluir.dataCompleta;
    idParaExcluir = id; 
    deleteModal.show(); 
}

btnConfirmDelete.addEventListener('click', async () => { 
    if (!idParaExcluir) return;
    btnConfirmDelete.disabled = true;
    btnConfirmDelete.innerText = "Excluindo...";
    const docExcluido = todosOsDocumentos.find(doc => doc.id === idParaExcluir);
    const nomeIgreja = docExcluido?.nomeIgreja;
    try {
        const docRef = doc(db, "contagens", idParaExcluir);
        await deleteDoc(docRef);
        deleteModal.hide();
        const filtroIgrejaAdmin = currentUserRole === 'admin' ? null : nomeIgreja;
        carregarDadosIniciais(filtroIgrejaAdmin);
    } catch (error) {
        console.error("Erro ao excluir documento: ", error);
        alert("Falha ao excluir. Verifique as regras do Firestore.");
    } finally {
        idParaExcluir = null; 
        btnConfirmDelete.disabled = false;
        btnConfirmDelete.innerText = "Sim, Excluir";
    }
});

