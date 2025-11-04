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

// --- Referências aos Modais ---
// É crucial que o 'bootstrap' esteja sendo importado no HTML para isto funcionar
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
let currentUserRole = null; // Guarda o cargo do usuário logado

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

// --- 2. VERIFICAR PERMISSÕES (CORRIGIDO) ---
async function verificarPermissoes(user) {
    
    console.log("DEBUG: Verificando permissões para o UID:", user.uid);

    try {
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDoc = await getDoc(userDocRef);

        console.log("DEBUG: Documento encontrado no Firestore?", userDoc.exists());

        if (!userDoc.exists()) {
            console.error("DEBUG: FALHA! Documento de permissão do usuário não encontrado! (UID não bate)");
            alert("Sua conta não tem permissões definidas. Verifique o Firestore.");
            signOut(auth); 
            return;
        }

        const userData = userDoc.data();
        currentUserRole = userData.role; // Salva o cargo globalmente

        console.log("DEBUG: Cargo (role) encontrado:", currentUserRole);

        loadingDiv.classList.add('d-none');
        adminContent.classList.remove('d-none');
        
        // Lógica de UI foi movida para DENTRO de cada 'if'

        if (currentUserRole === "admin") {
            // Admin: Mostra filtro de igreja e coluna de ações
            filtroIgrejaContainer.classList.remove('d-none');
            thAcoes.classList.remove('d-none'); 
            
            // === LÓGICA DE UI (COMO NA SECRETARIA) ===
            const adminCards = document.getElementById('admin-cards-container');
            if (adminCards) {
                adminCards.classList.add('d-none');
            }
            const relatoriosContainer = document.getElementById('card-relatorios-container');
            if (relatoriosContainer) {
                relatoriosContainer.classList.remove('col-lg-4');
                relatoriosContainer.classList.remove('col-lg-5');
                relatoriosContainer.classList.add('col-lg-6');
            }
            // =======================================
            
            carregarDadosIniciais(null); // 'null' significa carregar tudo

        } else if (currentUserRole === "secretaria") {
            const userIgreja = userData.igreja;
            if (!userIgreja) {
                 alert("Sua conta de secretaria não está associada a nenhuma igreja.");
                 signOut(auth);
                 return;
            }
            
            // Ajusta layout dos filtros
            filtroDataContainer.classList.replace('col-md-4', 'col-md-6');
            btnFiltrarContainer.classList.replace('col-md-4', 'col-md-6');
            
            // === LÓGICA DE UI (EXISTENTE DA SECRETARIA) ===
            const adminCards = document.getElementById('admin-cards-container');
            if (adminCards) {
                adminCards.classList.add('d-none');
            }
            const relatoriosContainer = document.getElementById('card-relatorios-container');
            if (relatoriosContainer) {
                relatoriosContainer.classList.remove('col-lg-4');
                relatoriosContainer.classList.remove('col-lg-5');
                relatoriosContainer.classList.add('col-lg-6');
            }
            // =======================================
            
            carregarDadosIniciais(userIgreja); // Passa o nome da igreja
        } else {
            alert("Permissão desconhecida.");
            signOut(auth);
        }

    } catch (error) {
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
        let q; // Nossa consulta (query)
        
        if (filtroIgrejaSecretaria) {
            // É SECRETARIA (Precisa do índice composto no Firebase)
            q = query(
                collection(db, "contagens"), 
                where("nomeIgreja", "==", filtroIgrejaSecretaria),
                orderBy("timestamp", "desc")
            );
        } else {
            // É ADMIN (Precisa do índice simples 'timestamp')
            q = query(collection(db, "contagens"), orderBy("timestamp", "desc"));
        }
        
        const querySnapshot = await getDocs(q);
        
        todosOsDocumentos = []; 
        nomesDeIgrejas.clear(); 

        querySnapshot.forEach((doc) => {
            // Armazena o ID do documento junto com os dados
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
            // Converte o Timestamp do Firebase para um Date do JS
            const dataDoc = doc.timestamp.toDate();
            filtroDataOk = dataDoc >= dataInicio;
        }
        return filtroIgrejaOk && filtroDataOk;
    });
    renderizarResultados(dadosFiltrados);
}


// --- 7. RENDERIZA OS DADOS NA TELA (Simplificado) ---
function renderizarResultados(dados) {
    // Limpa a tabela
    tabelaResultados.innerHTML = "";
    
    // Zera os totais (só precisamos de um)
    let totRelatorios = dados.length;

    if (totRelatorios === 0) {
        semResultados.classList.remove('d-none');
    } else {
        semResultados.classList.add('d-none');
    }

    dados.forEach(doc => {
        const tr = document.createElement('tr');
        
        // Preenche as colunas de dados
        tr.innerHTML = `
            <td>${doc.nomeIgreja}</td>
            <td>${doc.dataCompleta}</td>
            <td>${doc.membrosAdultos || 0}</td>
            <td>${doc.membrosCias || 0}</td>
            <td>${doc.visitantesAdultos || 0}</td>
            <td>${doc.visitantesCias || 0}</td>
            <td><strong>${doc.totalGeral}</strong></td>
        `;

        // Adiciona botões de Ação APENAS se for admin
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
    });

    // Atualiza o único card
    cardTotalRelatorios.innerText = totRelatorios;
}

// --- 8. LÓGICA DE EVENTOS DA TABELA (EDITAR/EXCLUIR) ---
tabelaResultados.addEventListener('click', (e) => {
    // Encontra o botão mais próximo que foi clicado
    const target = e.target.closest('button'); 
    if (!target) return; // Sai se não clicou em um botão

    // Pega o ID do documento armazenado no botão (data-id)
    const docId = target.dataset.id; 

    if (target.classList.contains('btn-edit')) {
        abrirModalEdicao(docId);
    }
    
    if (target.classList.contains('btn-delete')) {
        abrirModalExclusao(docId);
    }
});

// --- 9. LÓGICA DE EDIÇÃO ---
function abrirModalEdicao(id) {
    // Encontra o documento na nossa lista local
    const docParaEditar = todosOsDocumentos.find(doc => doc.id === id);
    if (!docParaEditar) return;

    // Preenche o formulário do modal com os dados
    document.getElementById('edit-doc-id').value = id;
    document.getElementById('edit-nome-igreja').innerText = docParaEditar.nomeIgreja;
    document.getElementById('edit-data-completa').innerText = docParaEditar.dataCompleta;
    document.getElementById('edit-membros-adultos').value = docParaEditar.membrosAdultos;
    document.getElementById('edit-membros-cias').value = docParaEditar.membrosCias;
    document.getElementById('edit-visitantes-adultos').value = docParaEditar.visitantesAdultos;
    document.getElementById('edit-visitantes-cias').value = docParaEditar.visitantesCias;
    
    // Mostra o modal
    editModal.show();
}

btnSaveEdit.addEventListener('click', async () => {
    const id = document.getElementById('edit-doc-id').value;
    if (!id) return;

    btnSaveEdit.disabled = true;
    btnSaveEdit.innerText = "Salvando...";

    try {
        // Pega os novos valores do formulário
        const mA = parseInt(document.getElementById('edit-membros-adultos').value) || 0;
        const mC = parseInt(document.getElementById('edit-membros-cias').value) || 0;
        const vA = parseInt(document.getElementById('edit-visitantes-adultos').value) || 0;
        const vC = parseInt(document.getElementById('edit-visitantes-cias').value) || 0;

        // Recalcula os totais
        const totalMembros = mA + mC;
        const totalVisitantes = vA + vC;
        const totalGeral = totalMembros + totalVisitantes;

        const dadosAtualizados = {
            membrosAdultos: mA,
            membrosCias: mC,
            visitantesAdultos: vA,
            visitantesCias: vC,
            totalMembros: totalMembros,
            totalVisitantes: totalVisitantes,
            totalGeral: totalGeral,
        };
        
        // Cria a referência do documento
        const docRef = doc(db, "contagens", id);
        
        // Envia o comando de atualização
        await updateDoc(docRef, dadosAtualizados);
        
        editModal.hide();
        
        // Recarrega os dados para mostrar a tabela atualizada
        // Descobre qual filtro de igreja usar (nenhum se for admin, ou a igreja específica se for secretaria)
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


// --- 10. LÓGICA DE EXCLUSÃO ---
let idParaExcluir = null; // Guarda o ID para o botão de confirmação

function abrirModalExclusao(id) {
    const docParaExcluir = todosOsDocumentos.find(doc => doc.id === id);
    if (!docParaExcluir) return;

    // Preenche os dados no modal de confirmação
    document.getElementById('delete-nome-igreja').innerText = docParaExcluir.nomeIgreja;
    document.getElementById('delete-data-completa').innerText = docParaEditar.dataCompleta;
    
    // Guarda o ID que queremos excluir
    idParaExcluir = id; 

    deleteModal.show();
}

btnConfirmDelete.addEventListener('click', async () => {
    if (!idParaExcluir) return;

    btnConfirmDelete.disabled = true;
    btnConfirmDelete.innerText = "Excluindo...";
    
    // Encontra o nome da igreja ANTES de excluir (para poder recarregar a lista da secretaria)
    const docExcluido = todosOsDocumentos.find(doc => doc.id === idParaExcluir);
    const nomeIgreja = docExcluido?.nomeIgreja;

    try {
        const docRef = doc(db, "contagens", idParaExcluir);
        
        // Envia o comando de exclusão
        await deleteDoc(docRef);
        
        deleteModal.hide();
        
        // Recarrega os dados
        const filtroIgrejaAdmin = currentUserRole === 'admin' ? null : nomeIgreja;
        carregarDadosIniciais(filtroIgrejaAdmin);

    } catch (error) {
        console.error("Erro ao excluir documento: ", error);
        alert("Falha ao excluir. Verifique as regras do Firestore.");
    } finally {
        idParaExcluir = null; // Limpa o ID
        btnConfirmDelete.disabled = false;
        btnConfirmDelete.innerText = "Sim, Excluir";
    }
});

