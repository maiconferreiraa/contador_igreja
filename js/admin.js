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
    doc,
    getDoc,
    updateDoc,  // Novo: Para editar
    deleteDoc   // Novo: Para excluir
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

// Cards
const cardTotalGeral = document.getElementById('total-geral');
const cardTotalRelatorios = document.getElementById('total-relatorios');
const cardTotalMembros = document.getElementById('total-membros');
const cardTotalVisitantes = document.getElementById('total-visitantes');
const cardTotalMembrosAdultos = document.getElementById('total-membros-adultos');
const cardTotalMembrosCias = document.getElementById('total-membros-cias');
const cardTotalVisitantesAdultos = document.getElementById('total-visitantes-adultos');
const cardTotalVisitantesCias = document.getElementById('total-visitantes-cias');

// Containers
const filtroIgrejaContainer = document.getElementById('filtro-igreja-container');
const filtroDataContainer = document.getElementById('filtro-data-container');
const btnFiltrarContainer = document.getElementById('btn-filtrar-container');
const thAcoes = document.getElementById('th-acoes'); // Cabeçalho da coluna "Ações"

// --- Referências aos Modais ---
const editModalEl = document.getElementById('editModal');
const editModal = new bootstrap.Modal(editModalEl); // Objeto JS do Modal
const btnSaveEdit = document.getElementById('btn-save-edit');
const editForm = document.getElementById('edit-form');

const deleteModalEl = document.getElementById('deleteModal');
const deleteModal = new bootstrap.Modal(deleteModalEl); // Objeto JS do Modal
const btnConfirmDelete = document.getElementById('btn-confirm-delete');

// --- Variáveis Globais ---
let todosOsDocumentos = [];
let nomesDeIgrejas = new Set(); 
let currentUserRole = null; // Guarda o cargo do usuário logado

// --- 1. VERIFICAÇÃO DE AUTENTICAÇÃO ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        verificarPermissoes(user);
    } else {
        console.log('Acesso negado. Redirecionando para login.html');
        window.location.href = 'login.html';
    }
});

// --- 2. VERIFICAR PERMISSÕES (ATUALIZADO) ---
async function verificarPermissoes(user) {
    try {
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            console.error("Documento de permissão do usuário não encontrado! (UID não bate)");
            alert("Sua conta não tem permissões definidas. Contate o administrador.");
            signOut(auth);
            return;
        }

        const userData = userDoc.data();
        currentUserRole = userData.role; // Salva o cargo globalmente

        loadingDiv.classList.add('d-none');
        adminContent.classList.remove('d-none');

        if (currentUserRole === "admin") {
            filtroIgrejaContainer.classList.remove('d-none');
            thAcoes.classList.remove('d-none'); // Mostra a coluna "Ações"
            carregarDadosIniciais(null);

        } else if (currentUserRole === "secretaria") {
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
        
        todosOsDocumentos = []; // Limpa cache local
        nomesDeIgrejas.clear(); 

        querySnapshot.forEach((doc) => {
            // IMPORTANTE: Armazena o ID do documento junto com os dados
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


// --- 7. RENDERIZA OS DADOS NA TELA (ATUALIZADO) ---
function renderizarResultados(dados) {
    tabelaResultados.innerHTML = "";
    
    // Zera os totais
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
        
        // Colunas de dados
        tr.innerHTML = `
            <td>${doc.nomeIgreja}</td>
            <td>${doc.dataCompleta}</td>
            <td>${doc.membrosAdultos || 0}</td>
            <td>${doc.membrosCias || 0}</td>
            <td>${doc.visitantesAdultos || 0}</td>
            <td>${doc.visitantesCias || 0}</td>
            <td><strong>${doc.totalGeral}</strong></td>
        `;

        // Coluna de Ações (SÓ PARA ADMIN)
        if (currentUserRole === 'admin') {
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

        // Soma dos totais
        totGeral += (doc.totalGeral || 0);
        totMembros += (doc.totalMembros || 0);
        totVisitantes += (doc.totalVisitantes || 0);
        totMembrosAdultos += (doc.membrosAdultos || 0);
        totMembrosCias += (doc.membrosCias || 0);
        totVisitantesAdultos += (doc.visitantesAdultos || 0);
        totVisitantesCias += (doc.visitantesCias || 0);
    });

    // Atualiza os cards
    cardTotalGeral.innerText = totGeral;
    cardTotalRelatorios.innerText = totRelatorios;
    cardTotalMembros.innerText = totMembros;
    cardTotalVisitantes.innerText = totVisitantes;
    cardTotalMembrosAdultos.innerText = totMembrosAdultos;
    cardTotalMembrosCias.innerText = totMembrosCias;
    cardTotalVisitantesAdultos.innerText = totVisitantesAdultos;
    cardTotalVisitantesCias.innerText = totVisitantesCias;
}

// --- 8. (NOVO) LÓGICA DE EVENTOS DA TABELA (EDITAR/EXCLUIR) ---

// Adiciona um listener na tabela inteira (delegação de evento)
tabelaResultados.addEventListener('click', (e) => {
    const target = e.target.closest('button'); // Acha o botão que foi clicado
    if (!target) return; // Sai se não foi um botão

    const docId = target.dataset.id; // Pega o ID (data-id)

    if (target.classList.contains('btn-edit')) {
        abrirModalEdicao(docId);
    }
    
    if (target.classList.contains('btn-delete')) {
        abrirModalExclusao(docId);
    }
});

// --- 9. (NOVO) LÓGICA DE EDIÇÃO ---

function abrirModalEdicao(id) {
    // Acha o documento completo no nosso array
    const docParaEditar = todosOsDocumentos.find(doc => doc.id === id);
    if (!docParaEditar) return;

    // Preenche o formulário do modal
    document.getElementById('edit-doc-id').value = id;
    document.getElementById('edit-nome-igreja').innerText = docParaEditar.nomeIgreja;
    document.getElementById('edit-data-completa').innerText = docParaEditar.dataCompleta;
    document.getElementById('edit-membros-adultos').value = docParaEditar.membrosAdultos;
    document.getElementById('edit-membros-cias').value = docParaEditar.membrosCias;
    document.getElementById('edit-visitantes-adultos').value = docParaEditar.visitantesAdultos;
    document.getElementById('edit-visitantes-cias').value = docParaEditar.visitantesCias;
    
    // Abre o modal
    editModal.show();
}

// Listener para o botão "Salvar Alterações" do modal de edição
btnSaveEdit.addEventListener('click', async () => {
    const id = document.getElementById('edit-doc-id').value;
    if (!id) return;

    btnSaveEdit.disabled = true;
    btnSaveEdit.innerText = "Salvando...";

    try {
        // Pega os novos valores
        const mA = parseInt(document.getElementById('edit-membros-adultos').value) || 0;
        const mC = parseInt(document.getElementById('edit-membros-cias').value) || 0;
        const vA = parseInt(document.getElementById('edit-visitantes-adultos').value) || 0;
        const vC = parseInt(document.getElementById('edit-visitantes-cias').value) || 0;

        // Recalcula totais
        const totalMembros = mA + mC;
        const totalVisitantes = vA + vC;
        const totalGeral = totalMembros + totalVisitantes;

        // Cria o objeto de atualização
        const dadosAtualizados = {
            membrosAdultos: mA,
            membrosCias: mC,
            visitantesAdultos: vA,
            visitantesCias: vC,
            totalMembros: totalMembros,
            totalVisitantes: totalVisitantes,
            totalGeral: totalGeral,
        };
        
        // Pega a referência do documento no Firestore
        const docRef = doc(db, "contagens", id);
        
        // Envia a atualização
        await updateDoc(docRef, dadosAtualizados);
        
        // Fecha o modal
        editModal.hide();
        
        // Recarrega todos os dados da tabela para mostrar a alteração
        carregarDadosIniciais(currentUserRole === 'admin' ? null : todosOsDocumentos[0].nomeIgreja);

    } catch (error) {
        console.error("Erro ao atualizar documento: ", error);
        alert("Falha ao salvar. Verifique as regras do Firestore.");
    } finally {
        btnSaveEdit.disabled = false;
        btnSaveEdit.innerText = "Salvar Alterações";
    }
});


// --- 10. (NOVO) LÓGICA DE EXCLUSÃO ---

function abrirModalExclusao(id) {
    const docParaExcluir = todosOsDocumentos.find(doc => doc.id === id);
    if (!docParaExcluir) return;

    // Preenche os dados do modal de confirmação
    document.getElementById('delete-nome-igreja').innerText = docParaExcluir.nomeIgreja;
    document.getElementById('delete-data-completa').innerText = docParaExcluir.dataCompleta;
    
    // Armazena o ID no botão de confirmação
    btnConfirmDelete.dataset.id = id; 

    // Abre o modal
    deleteModal.show();
}

// Listener para o botão "Sim, Excluir" do modal de exclusão
btnConfirmDelete.addEventListener('click', async () => {
    const id = btnConfirmDelete.dataset.id;
    if (!id) return;

    btnConfirmDelete.disabled = true;
    btnConfirmDelete.innerText = "Excluindo...";

    try {
        // Pega a referência do documento
        const docRef = doc(db, "contagens", id);
        
        // Exclui o documento
        await deleteDoc(docRef);
        
        // Fecha o modal
        deleteModal.hide();
        
        // Recarrega todos os dados da tabela
        carregarDadosIniciais(currentUserRole === 'admin' ? null : todosOsDocumentos[0].nomeIgreja);

    } catch (error) {
        console.error("Erro ao excluir documento: ", error);
        alert("Falha ao excluir. Verifique as regras do Firestore.");
    } finally {
        btnConfirmDelete.disabled = false;
        btnConfirmDelete.innerText = "Sim, Excluir";
    }
});
