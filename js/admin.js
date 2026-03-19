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
const cardTotalRelatorios = document.getElementById('total-relatorios');

// Containers
const filtroIgrejaContainer = document.getElementById('filtro-igreja-container');
const filtroDataContainer = document.getElementById('filtro-data-container');
const btnFiltrarContainer = document.getElementById('btn-filtrar-container');

// Filtro de Mês
const filtroMesEspecificoContainer = document.getElementById('filtro-mes-especifico-container');
const filtroMesEspecifico = document.getElementById('filtro-mes-especifico');

// --- Referências Tabelas ---
const tabelaResultadosGerais = document.getElementById('tabela-resultados-gerais');
const semResultadosGerais = document.getElementById('sem-resultados-gerais');
const thAcoesGerais = document.getElementById('th-acoes-gerais'); 

const tabelaResultadosEBD = document.getElementById('tabela-resultados-ebd');
const semResultadosEBD = document.getElementById('sem-resultados-ebd');
const thAcoesEBD = document.getElementById('th-acoes-ebd'); 

const tabelaResultadosTrombetas = document.getElementById('tabela-resultados-trombetas');
const semResultadosTrombetas = document.getElementById('sem-resultados-trombetas');
const thAcoesTrombetas = document.getElementById('th-acoes-trombetas'); 

// --- Referências aos Modais ---
const editModalEl = document.getElementById('editModal');
const deleteModalEl = document.getElementById('deleteModal');

const btnSaveEdit = document.getElementById('btn-save-edit');
const editForm = document.getElementById('edit-form');
const btnConfirmDelete = document.getElementById('btn-confirm-delete');

// Referências (Modal de Edição Condicional)
const editTipoCultoSelect = document.getElementById('edit-tipo-culto');
const editCamposPadrao = document.getElementById('edit-campos-padrao');
const editCamposTrombetas = document.getElementById('edit-campos-trombetas');
// Containers específicos para CIAs no modal
const editContainerMembrosCias = document.getElementById('edit-container-membros-cias');
const editContainerVisitantesCias = document.getElementById('edit-container-visitantes-cias');

// --- Variáveis Globais ---
let todosOsDocumentos = [];
let nomesDeIgrejas = new Set(); 
let currentUserRole = null; 
let idParaExcluir = null; 

// --- 1. VERIFICAÇÃO DE AUTENTICAÇÃO ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        verificarPermissoes(user);
    } else {
        window.location.href = 'login.html';
    }
});

// --- 2. VERIFICAR PERMISSÕES ---
async function verificarPermissoes(user) {
    try {
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            alert(`ATENÇÃO!\nA conta logou com sucesso, mas o documento no Firestore não foi encontrado.\n\nO sistema procurou na coleção "usuarios" pelo ID exato:\n${user.uid}\n\nPor favor, crie um documento com este ID exato no Firebase.`);
            signOut(auth); 
            return;
        }

        const userData = userDoc.data();
        
        currentUserRole = userData.role ? String(userData.role).trim().toLowerCase() : null; 

        loadingDiv.classList.add('d-none');
        adminContent.classList.remove('d-none');
        
        const relatoriosContainer = document.getElementById('card-relatorios-container');
        if (relatoriosContainer) {
            relatoriosContainer.classList.remove('col-lg-4', 'col-lg-5');
            relatoriosContainer.classList.add('col-md-6', 'col-lg-6');
        }

        if (currentUserRole === "admin") {
            // ADMIN VÊ TUDO
            filtroIgrejaContainer.classList.remove('d-none');
            thAcoesGerais.classList.remove('d-none');
            thAcoesEBD.classList.remove('d-none');
            thAcoesTrombetas.classList.remove('d-none');
            carregarDadosIniciais(null); 

        } else if (currentUserRole === "secretaria" || currentUserRole === "obreiro") {
            // SECRETARIA OU OBREIRO (VÊ APENAS SUA IGREJA)
            const userIgreja = userData.igreja;
            if (!userIgreja) {
                 alert("Sua conta não está associada a nenhuma igreja.\nAdicione o campo 'igreja' no seu documento.");
                 signOut(auth); 
                 return;
            }
            filtroDataContainer.classList.replace('col-md-3', 'col-md-4');
            btnFiltrarContainer.classList.replace('col-md-3', 'col-md-4');
            filtroMesEspecificoContainer.classList.replace('col-md-3', 'col-md-4');
            
            thAcoesGerais.classList.remove('d-none');
            thAcoesEBD.classList.remove('d-none');
            thAcoesTrombetas.classList.remove('d-none'); 

            carregarDadosIniciais(userIgreja); 
        } else {
            alert(`PERMISSÃO DESCONHECIDA!\nO sistema encontrou o seu documento, mas não reconheceu o seu cargo.\n\nCargo encontrado: "${userData.role}"\nUID: ${user.uid}\n\nO campo 'role' deve ser exatamente: admin, secretaria ou obreiro.`);
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
        alert("Não foi possível carregar os dados do banco.");
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

// --- 6. LÓGICA DE FILTRAGEM ---
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
    const valorMesEspecifico = filtroMesEspecifico.value; 

    let dataInicio, dataFim; 
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

    renderizarTabelas(dadosFiltrados);
}


// --- 7. RENDERIZA OS DADOS NAS TABELAS ---
function renderizarTabelas(dados) {
    const dadosGerais = [];
    const dadosEBD = [];
    const dadosTrombetas = [];
    
    dados.forEach(doc => {
        if (doc.tipoCulto === "TROMBETAS E FESTAS" || doc.tipoCulto === "EVANGELIZAÇÃO CIAS") {
            dadosTrombetas.push(doc);
        } else if (doc.tipoCulto === "EBD") {
            dadosEBD.push(doc);
        } else {
            dadosGerais.push(doc);
        }
    });

    cardTotalRelatorios.innerText = dados.length;
    renderizarTabelaGerais(dadosGerais);
    renderizarTabelaEBD(dadosEBD);
    renderizarTabelaTrombetas(dadosTrombetas);
}

function renderizarTabelaGerais(dados) {
    tabelaResultadosGerais.innerHTML = "";
    if (dados.length === 0) {
        semResultadosGerais.classList.remove('d-none');
    } else {
        semResultadosGerais.classList.add('d-none');
    }
    dados.forEach(doc => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${doc.nomeIgreja}</td>
            <td>${doc.tipoCulto || 'N/D'}</td> 
            <td>${doc.dataCompleta}</td>
            <td>${doc.membrosAdultos || 0}</td>
            <td>${doc.visitantesAdultos || 0}</td>
            <td><strong>${doc.totalGeral}</strong></td>
        `;
        addAcoes(tr, doc.id);
        tabelaResultadosGerais.appendChild(tr);
    });
}

function renderizarTabelaEBD(dados) {
    tabelaResultadosEBD.innerHTML = "";
    if (dados.length === 0) {
        semResultadosEBD.classList.remove('d-none');
    } else {
        semResultadosEBD.classList.add('d-none');
    }
    dados.forEach(doc => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${doc.nomeIgreja}</td>
            <td>${doc.tipoCulto || 'N/D'}</td> 
            <td>${doc.dataCompleta}</td>
            <td>${doc.membrosAdultos || 0}</td>
            <td>${doc.membrosCias || 0}</td>
            <td>${doc.visitantesAdultos || 0}</td>
            <td>${doc.visitantesCias || 0}</td>
            <td><strong>${doc.totalGeral}</strong></td>
        `;
        addAcoes(tr, doc.id);
        tabelaResultadosEBD.appendChild(tr);
    });
}

function renderizarTabelaTrombetas(dados) {
    tabelaResultadosTrombetas.innerHTML = "";
    if (dados.length === 0) {
        semResultadosTrombetas.classList.remove('d-none');
    } else {
        semResultadosTrombetas.classList.add('d-none');
    }
    dados.forEach(doc => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${doc.nomeIgreja}<br><small class="text-muted">${doc.tipoCulto}</small></td>
            <td>${doc.dataCompleta}</td>
            <td>${doc.trombetasMembrosCriancas || 0}</td>
            <td>${doc.trombetasMembrosIntermediarios || 0}</td>
            <td>${doc.trombetasMembrosAdolescentes || 0}</td>
            <td>${doc.trombetasMembrosAdultos || 0}</td>
            <td>${doc.trombetasVisitantesCriancas || 0}</td>
            <td>${doc.trombetasVisitantesIntermediarios || 0}</td>
            <td>${doc.trombetasVisitantesAdolescentes || 0}</td>
            <td>${doc.trombetasVisitantesAdultos || 0}</td>
            <td><strong>${doc.totalGeral}</strong></td>
        `;
        addAcoes(tr, doc.id);
        tabelaResultadosTrombetas.appendChild(tr);
    });
}

function addAcoes(tr, id) {
    if (currentUserRole === 'admin' || currentUserRole === 'secretaria' || currentUserRole === 'obreiro') {
        const tdAcoes = document.createElement('td');
        tdAcoes.innerHTML = `
            <button class="btn btn-sm btn-outline-primary btn-edit" data-id="${id}" title="Editar">
                <i class="bi bi-pencil-fill"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${id}" title="Excluir">
                <i class="bi bi-trash-fill"></i>
            </button>
        `;
        tr.appendChild(tdAcoes);
    }
}


// --- 8. EVENTOS (EDITAR/EXCLUIR) ---
document.getElementById('relatoriosTabContent').addEventListener('click', (e) => {
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

// --- 9. EDIÇÃO (ATUALIZADA) ---
editTipoCultoSelect.addEventListener('change', toggleEditCampos);

function toggleEditCampos() {
    const tipo = editTipoCultoSelect.value;
    editCamposPadrao.classList.add('d-none');
    editCamposTrombetas.classList.add('d-none');
    if (editContainerMembrosCias) editContainerMembrosCias.classList.remove('d-none');
    if (editContainerVisitantesCias) editContainerVisitantesCias.classList.remove('d-none');

    if (tipo === "TROMBETAS E FESTAS" || tipo === "EVANGELIZAÇÃO CIAS") {
        editCamposTrombetas.classList.remove('d-none');
    } else if (tipo === "EBD") {
        editCamposPadrao.classList.remove('d-none');
    } else {
        editCamposPadrao.classList.remove('d-none');
        if (editContainerMembrosCias) editContainerMembrosCias.classList.add('d-none');
        if (editContainerVisitantesCias) editContainerVisitantesCias.classList.add('d-none');
    }
}

function abrirModalEdicao(id) {
    const docParaEditar = todosOsDocumentos.find(doc => doc.id === id);
    if (!docParaEditar) return;
    
    document.getElementById('edit-doc-id').value = id;
    document.getElementById('edit-nome-igreja').innerText = docParaEditar.nomeIgreja;
    document.getElementById('edit-data-completa').innerText = docParaEditar.dataCompleta;
    editTipoCultoSelect.value = docParaEditar.tipoCulto || "CULTO DIÁRIO";

    document.getElementById('edit-membros-adultos').value = docParaEditar.membrosAdultos || 0;
    document.getElementById('edit-membros-cias').value = docParaEditar.membrosCias || 0;
    document.getElementById('edit-visitantes-adultos').value = docParaEditar.visitantesAdultos || 0;
    document.getElementById('edit-visitantes-cias').value = docParaEditar.visitantesCias || 0;
    
    document.getElementById('edit-trombetas-membros-criancas').value = docParaEditar.trombetasMembrosCriancas || 0;
    document.getElementById('edit-trombetas-membros-intermediarios').value = docParaEditar.trombetasMembrosIntermediarios || 0;
    document.getElementById('edit-trombetas-membros-adolescentes').value = docParaEditar.trombetasMembrosAdolescentes || 0;
    document.getElementById('edit-trombetas-membros-adultos').value = docParaEditar.trombetasMembrosAdultos || 0;
    document.getElementById('edit-trombetas-visitantes-criancas').value = docParaEditar.trombetasVisitantesCriancas || 0;
    document.getElementById('edit-trombetas-visitantes-intermediarios').value = docParaEditar.trombetasVisitantesIntermediarios || 0;
    document.getElementById('edit-trombetas-visitantes-adolescentes').value = docParaEditar.trombetasVisitantesAdolescentes || 0;
    document.getElementById('edit-trombetas-visitantes-adultos').value = docParaEditar.trombetasVisitantesAdultos || 0;

    toggleEditCampos(); 
    
    const editModal = window.bootstrap.Modal.getOrCreateInstance(editModalEl);
    editModal.show();
}

btnSaveEdit.addEventListener('click', async () => {
    const id = document.getElementById('edit-doc-id').value;
    if (!id) return;
    btnSaveEdit.disabled = true;
    btnSaveEdit.innerText = "Salvando...";

    try {
        const tipoCulto = editTipoCultoSelect.value;
        const dadosAtualizados = { tipoCulto: tipoCulto };

        let totalMembros = 0;
        let totalVisitantes = 0;

        if (tipoCulto === "TROMBETAS E FESTAS" || tipoCulto === "EVANGELIZAÇÃO CIAS") {
            const mC = parseInt(document.getElementById('edit-trombetas-membros-criancas').value) || 0;
            const mI = parseInt(document.getElementById('edit-trombetas-membros-intermediarios').value) || 0;
            const mAd = parseInt(document.getElementById('edit-trombetas-membros-adolescentes').value) || 0;
            const mA = parseInt(document.getElementById('edit-trombetas-membros-adultos').value) || 0;
            const vC = parseInt(document.getElementById('edit-trombetas-visitantes-criancas').value) || 0;
            const vI = parseInt(document.getElementById('edit-trombetas-visitantes-intermediarios').value) || 0;
            const vAd = parseInt(document.getElementById('edit-trombetas-visitantes-adolescentes').value) || 0;
            const vA = parseInt(document.getElementById('edit-trombetas-visitantes-adultos').value) || 0;

            dadosAtualizados.trombetasMembrosCriancas = mC;
            dadosAtualizados.trombetasMembrosIntermediarios = mI;
            dadosAtualizados.trombetasMembrosAdolescentes = mAd;
            dadosAtualizados.trombetasMembrosAdultos = mA;
            dadosAtualizados.trombetasVisitantesCriancas = vC;
            dadosAtualizados.trombetasVisitantesIntermediarios = vI;
            dadosAtualizados.trombetasVisitantesAdolescentes = vAd;
            dadosAtualizados.trombetasVisitantesAdultos = vA;
            
            totalMembros = mC + mI + mAd + mA;
            totalVisitantes = vC + vI + vAd + vA;

        } else {
            const mA = parseInt(document.getElementById('edit-membros-adultos').value) || 0;
            const vA = parseInt(document.getElementById('edit-visitantes-adultos').value) || 0;
            let mC = 0, vC = 0;

            if (tipoCulto === "EBD") {
                mC = parseInt(document.getElementById('edit-membros-cias').value) || 0;
                vC = parseInt(document.getElementById('edit-visitantes-cias').value) || 0;
            }

            dadosAtualizados.membrosAdultos = mA;
            dadosAtualizados.membrosCias = mC;
            dadosAtualizados.visitantesAdultos = vA;
            dadosAtualizados.visitantesCias = vC;
            
            totalMembros = mA + mC;
            totalVisitantes = vA + vC;
        }

        dadosAtualizados.totalMembros = totalMembros;
        dadosAtualizados.totalVisitantes = totalVisitantes;
        dadosAtualizados.totalGeral = totalMembros + totalVisitantes;
        
        const docRef = doc(db, "contagens", id);
        const docOriginal = todosOsDocumentos.find(d => d.id === id);
        const dadosFinais = { ...docOriginal, ...dadosAtualizados };

        await updateDoc(docRef, dadosFinais);
        
        const editModal = window.bootstrap.Modal.getInstance(editModalEl);
        if (editModal) editModal.hide();

        const docAtualizado = todosOsDocumentos.find(doc => doc.id === id);
        const filtroIgrejaAdmin = currentUserRole === 'admin' ? null : docAtualizado?.nomeIgreja;
        carregarDadosIniciais(filtroIgrejaAdmin);

    } catch (error) {
        console.error("Erro ao atualizar: ", error);
        alert("Falha ao salvar.");
    } finally {
        btnSaveEdit.disabled = false;
        btnSaveEdit.innerText = "Salvar Alterações";
    }
});


// --- 10. EXCLUSÃO ---
function abrirModalExclusao(id) {
    const docParaExcluir = todosOsDocumentos.find(doc => doc.id === id);
    if (!docParaExcluir) {
        return;
    }
    
    document.getElementById('delete-nome-igreja').innerText = docParaExcluir.nomeIgreja;
    document.getElementById('delete-data-completa').innerText = docParaExcluir.dataCompleta;
    idParaExcluir = id; 
    
    const deleteModal = window.bootstrap.Modal.getOrCreateInstance(deleteModalEl);
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
        
        const deleteModal = window.bootstrap.Modal.getInstance(deleteModalEl);
        if (deleteModal) deleteModal.hide();
        
        const filtroIgrejaAdmin = currentUserRole === 'admin' ? null : nomeIgreja;
        carregarDadosIniciais(filtroIgrejaAdmin);
    } catch (error) {
        console.error("Erro FATAL ao excluir: ", error);
        alert("Falha ao excluir.");
    } finally {
        idParaExcluir = null; 
        btnConfirmDelete.disabled = false;
        btnConfirmDelete.innerText = "Sim, Excluir";
    }
});