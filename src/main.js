// 1. IMPORTAÇÕES
import './style.css';
import { auth, db } from './firebase.js';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

// 2. INJEÇÃO DO HTML PRINCIPAL
document.querySelector('#app').innerHTML = `
  <!-- TELA DE AUTENTICAÇÃO -->
  <div id="auth-screen">
    <div class="min-h-screen flex flex-col items-center justify-center bg-bkg p-4">
      <div class="w-full max-w-md p-8 space-y-6 bg-surface rounded-xl shadow-2xl border border-border">
        <div>
          <h2 id="auth-title" class="text-center text-3xl font-extrabold text-secondary">Acesse sua Conta</h2>
          <p id="auth-prompt" class="mt-2 text-center text-sm text-subtle"></p>
        </div>
        <form id="auth-form" class="space-y-6">
          <input type="email" id="auth-email" placeholder="Email" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md shadow-sm focus:ring-primary focus:border-primary placeholder-subtle">
          <div class="relative">
            <input type="password" id="auth-password" placeholder="Senha" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md shadow-sm focus:ring-primary focus:border-primary placeholder-subtle pr-12 appearance-none">
            <button type="button" id="toggle-password-btn" class="absolute inset-y-0 right-0 px-4 flex items-center text-subtle hover:text-primary focus:outline-none rounded-r-md">
              <svg class="w-5 h-5 eye-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <svg class="w-5 h-5 eye-slash-icon hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" /></svg>
            </button>
          </div>
          <button id="auth-submit-btn" type="submit" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-bkg bg-primary hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary">
            Entrar
          </button>
        </form>
      </div>
    </div>
  </div>

  <!-- CONTAINER PRINCIPAL DO APP -->
  <div id="app-container" class="hidden">
    <header class="bg-surface shadow-md border-b border-border">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <h1 class="text-2xl font-bold text-secondary">Meu Planner</h1>
          <div class="flex items-center">
            <button id="theme-toggle-btn" class="mr-4 p-2 rounded-full text-subtle hover:text-secondary hover:bg-surface">
              <svg id="theme-sun-icon" class="w-5 h-5 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              <svg id="theme-moon-icon" class="w-5 h-5 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            </button>
            <span id="user-email" class="text-sm text-subtle mr-4"></span>
            <button id="logout-btn" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg shadow-md hover:opacity-90 transition-opacity">Sair</button>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- TELA 1: LISTA DE MATRÍCULAS -->
      <div id="enrollments-view">
        <div class="px-4 py-6 sm:px-0">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-3xl font-bold text-secondary">Minhas Matrículas</h2>
            <button id="add-enrollment-btn" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg shadow-md hover:opacity-90 transition-opacity">
              + Adicionar Matrícula
            </button>
          </div>
          <div id="enrollments-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        </div>
      </div>

      <!-- TELA 2: PAINEL DA MATRÍCULA -->
      <div id="dashboard-view" class="hidden">
        <div class="px-4 py-6 sm:px-0">
          <button id="back-to-enrollments-btn" class="mb-6 text-sm text-primary hover:opacity-80 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Voltar para Matrículas
          </button>
          <h2 id="dashboard-title" class="text-3xl font-bold text-secondary"></h2>
          <p id="dashboard-subtitle" class="text-subtle mt-1"></p>
          
          <div class="mt-8 border-t border-border pt-8">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-2xl font-bold text-secondary">Disciplinas do Período</h3>
              <button id="add-discipline-btn" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg shadow-md hover:opacity-90 transition-opacity">
                + Adicionar Disciplina
              </button>
            </div>
            <div id="disciplines-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
          </div>
        </div>
      </div>
    </main>
  </div>
`;

// 3. INJEÇÃO DOS MODAIS
const modalHTML = `
  <div id="add-enrollment-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-surface p-8 rounded-lg shadow-xl w-full max-w-md border border-border">
      <h3 id="enrollment-modal-title" class="text-2xl font-bold mb-6 text-secondary">Nova Matrícula</h3>
      <form id="add-enrollment-form">
        <div class="space-y-4">
          <input type="text" id="enrollment-course" placeholder="Nome do Curso (ex: Ciência da Computação)" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary">
          <input type="text" id="enrollment-institution" placeholder="Instituição de Ensino" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary">
          <input type="text" id="enrollment-period" placeholder="Período Atual (ex: 2025.1)" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary">
        </div>
        <div class="mt-8 flex justify-end space-x-4">
          <button type="button" id="cancel-enrollment-btn" class="bg-subtle text-bkg font-semibold py-2 px-4 rounded-lg hover:opacity-80">Cancelar</button>
          <button type="submit" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg hover:opacity-90">Salvar</button>
        </div>
      </form>
    </div>
  </div>
`;
document.querySelector('#app').insertAdjacentHTML('beforeend', modalHTML);

const confirmModalHTML = `
  <div id="confirm-delete-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-surface p-8 rounded-lg shadow-xl w-full max-w-sm border border-border">
      <h3 class="text-xl font-bold text-secondary">Confirmar Exclusão</h3>
      <p id="confirm-delete-message" class="text-subtle mt-2">Tem certeza que deseja excluir? Esta ação não pode ser desfeita.</p>
      <div class="mt-6 flex justify-end space-x-4">
        <button id="cancel-delete-btn" class="bg-subtle text-bkg font-semibold py-2 px-4 rounded-lg hover:opacity-80">Cancelar</button>
        <button id="confirm-delete-btn" class="bg-danger text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90">Excluir</button>
      </div>
    </div>
  </div>
`;
document.querySelector('#app').insertAdjacentHTML('beforeend', confirmModalHTML);

const disciplineModalHTML = `
  <div id="add-discipline-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-surface p-8 rounded-lg shadow-xl w-full max-w-md border border-border">
      <h3 id="discipline-modal-title" class="text-2xl font-bold mb-6 text-secondary">Nova Disciplina</h3>
      <form id="add-discipline-form">
        <div class="space-y-4">
          <input type="text" id="discipline-name" placeholder="Nome da Disciplina" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary">
          <input type="text" id="discipline-code" placeholder="Código (opcional)" class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary">
          <input type="text" id="discipline-teacher" placeholder="Professor(a) (opcional)" class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary">
          <input type="text" id="discipline-location" placeholder="Local (sala, prédio, etc.)" class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary">
          <input type="text" id="discipline-schedule" placeholder="Horários (ex: Seg 10-12h, Qua 10-12h)" class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary">
        </div>
        <div class="mt-8 flex justify-end space-x-4">
          <button type="button" id="cancel-discipline-btn" class="bg-subtle text-bkg font-semibold py-2 px-4 rounded-lg hover:opacity-80">Cancelar</button>
          <button type="submit" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg hover:opacity-90">Salvar</button>
        </div>
      </form>
    </div>
  </div>
`;
document.querySelector('#app').insertAdjacentHTML('beforeend', disciplineModalHTML);


// =================================================================
//          INÍCIO DO BLOCO DE CÓDIGO ORGANIZADO
// =================================================================

// 4. SELEÇÃO DE ELEMENTOS DO DOM
// Telas
const authScreen = document.getElementById('auth-screen');
const appContainer = document.getElementById('app-container');
const enrollmentsView = document.getElementById('enrollments-view');
const dashboardView = document.getElementById('dashboard-view');

// Autenticação
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authPrompt = document.getElementById('auth-prompt');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const togglePasswordBtn = document.getElementById('toggle-password-btn');
const passwordInput = document.getElementById('auth-password');
const eyeIcon = togglePasswordBtn.querySelector('.eye-icon');
const eyeSlashIcon = togglePasswordBtn.querySelector('.eye-slash-icon');

// Cabeçalho
const logoutBtn = document.getElementById('logout-btn');
const userEmailDisplay = document.getElementById('user-email');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const sunIcon = document.getElementById('theme-sun-icon');
const moonIcon = document.getElementById('theme-moon-icon');

// Matrículas
const addEnrollmentBtn = document.getElementById('add-enrollment-btn');
const enrollmentsList = document.getElementById('enrollments-list');
const addEnrollmentModal = document.getElementById('add-enrollment-modal');
const addEnrollmentForm = document.getElementById('add-enrollment-form');
const cancelEnrollmentBtn = document.getElementById('cancel-enrollment-btn');
const backToEnrollmentsBtn = document.getElementById('back-to-enrollments-btn');

// Disciplinas
const addDisciplineBtn = document.getElementById('add-discipline-btn');
const disciplinesList = document.getElementById('disciplines-list');
const addDisciplineModal = document.getElementById('add-discipline-modal');
const addDisciplineForm = document.getElementById('add-discipline-form');
const cancelDisciplineBtn = document.getElementById('cancel-discipline-btn');

// Modal de Confirmação
const confirmDeleteModal = document.getElementById('confirm-delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteMessage = document.getElementById('confirm-delete-message');

// 5. VARIÁVEIS DE ESTADO
let authMode = 'login';
let sortable = null;
let editingEnrollmentId = null;
let editingDisciplineId = null;
let itemToDelete = null;

// 6. FUNÇÕES

// --- Funções de Tema ---
const applyTheme = (theme) => {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    }
};

// --- Inicialização do Tema ---
const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const initialTheme = savedTheme ? savedTheme : (prefersDark ? 'dark' : 'light');
applyTheme(initialTheme);

// --- Funções de Autenticação ---
function updateAuthView() {
    if (authMode === 'login') {
        authTitle.textContent = 'Acesse sua Conta';
        authSubmitBtn.textContent = 'Entrar';
        authPrompt.innerHTML = 'Ou <button id="switch-to-signup-btn" type="button" class="font-medium text-primary hover:opacity-80">crie uma nova conta</button>';
        document.getElementById('switch-to-signup-btn').addEventListener('click', () => { authMode = 'signup'; updateAuthView(); });
    } else {
        authTitle.textContent = 'Crie sua Conta';
        authSubmitBtn.textContent = 'Criar Conta';
        authPrompt.innerHTML = 'Já tem uma conta? <button id="switch-to-login-btn" type="button" class="font-medium text-primary hover:opacity-80">Faça o login</button>';
        document.getElementById('switch-to-login-btn').addEventListener('click', () => { authMode = 'login'; updateAuthView(); });
    }
}

// --- Funções de Navegação e Renderização ---
function showDashboard(enrollmentData, enrollmentId) {
    enrollmentsView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    dashboardView.dataset.enrollmentId = enrollmentId;
    document.getElementById('dashboard-title').textContent = enrollmentData.course;
    document.getElementById('dashboard-subtitle').textContent = `${enrollmentData.institution} - Período ${enrollmentData.currentPeriod}`;
    renderDisciplines(enrollmentId);
}

async function renderEnrollments() {
    const user = auth.currentUser;
    if (!user) return;
    enrollmentsList.innerHTML = `<p class="text-subtle">Carregando matrículas...</p>`;
    
    const { collection, query, orderBy, getDocs } = await import('firebase/firestore');
    const enrollmentsRef = collection(db, 'users', user.uid, 'enrollments');
    const q = query(enrollmentsRef, orderBy('position', 'asc'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        enrollmentsList.innerHTML = `<p class="text-subtle col-span-full text-center">Nenhuma matrícula encontrada. Adicione uma para começar!</p>`;
        return;
    }

    enrollmentsList.innerHTML = '';
    querySnapshot.forEach(doc => {
        const data = doc.data();
        const card = document.createElement('div');
        card.dataset.id = doc.id;
        card.className = "relative bg-surface p-6 rounded-lg shadow-lg border border-border hover:border-primary transition-all group cursor-grab";
        card.innerHTML = `
            <div class="pr-10">
                <h4 class="text-xl font-bold text-secondary">${data.course}</h4>
                <p class="text-subtle">${data.institution}</p>
                <p class="text-sm text-subtle mt-4">Período: ${data.currentPeriod}</p>
            </div>
            <div class="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button data-id="${doc.id}" title="Editar" class="edit-btn p-2 rounded-full hover:bg-bkg"><svg class="w-5 h-5 text-subtle pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                <button data-id="${doc.id}" title="Excluir" class="delete-btn p-2 rounded-full hover:bg-bkg"><svg class="w-5 h-5 text-danger pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
            </div>
        `;
        card.addEventListener('click', (e) => {
            if (e.target.closest('.edit-btn') || e.target.closest('.delete-btn')) return;
            showDashboard(data, doc.id);
        });
        enrollmentsList.appendChild(card);
    });

    if (sortable) sortable.destroy();
    sortable = new Sortable(enrollmentsList, {
        animation: 150,
        ghostClass: 'opacity-50',
        onEnd: async (evt) => {
            const items = evt.to.children;
            const { writeBatch, doc } = await import('firebase/firestore');
            const batch = writeBatch(db);
            for (let i = 0; i < items.length; i++) {
                const docId = items[i].dataset.id;
                const docRef = doc(db, 'users', user.uid, 'enrollments', docId);
                batch.update(docRef, { position: i });
            }
            await batch.commit();
        }
    });
}

async function renderDisciplines(enrollmentId) {
    const user = auth.currentUser;
    if (!user) return;
    disciplinesList.innerHTML = `<p class="text-subtle">Carregando disciplinas...</p>`;
    
    const { collection, query, orderBy, getDocs } = await import('firebase/firestore');
    const disciplinesRef = collection(db, 'users', user.uid, 'enrollments', enrollmentId, 'disciplines');
    const q = query(disciplinesRef, orderBy('createdAt', 'asc'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        disciplinesList.innerHTML = `<p class="text-subtle col-span-full">Nenhuma disciplina adicionada a esta matrícula ainda.</p>`;
        return;
    }

    disciplinesList.innerHTML = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return `
        <div class="relative bg-surface p-5 rounded-lg border border-border group">
            <div class="pr-10">
                <h4 class="font-bold text-secondary">${data.name}</h4>
                <p class="text-sm text-subtle">${data.teacher || 'Professor não definido'}</p>
                <p class="text-sm text-subtle mt-2">${data.location || 'Local não definido'}</p>
                <p class="text-xs text-primary mt-2 font-mono">${data.schedule || 'Horário não definido'}</p>
            </div>
            <div class="absolute top-4 right-4 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button data-id="${doc.id}" title="Editar Disciplina" class="edit-discipline-btn p-2 rounded-full hover:bg-bkg"><svg class="w-5 h-5 text-subtle pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                <button data-id="${doc.id}" title="Excluir Disciplina" class="delete-discipline-btn p-2 rounded-full hover:bg-bkg"><svg class="w-5 h-5 text-danger pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
            </div>
        </div>
        `;
    }).join('');
}

// 7. LISTENERS DE EVENTOS

// --- Listeners Globais ---
themeToggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
});

// --- Listeners de Autenticação ---
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    try {
        if (authMode === 'login') {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid, email: user.email, name: email.split('@')[0], createdAt: new Date()
            });
        }
    } catch (error) {
        console.error("Erro de autenticação:", error);
        alert(`Erro: ${error.message}`);
    }
});

togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    eyeIcon.classList.toggle('hidden', isPassword);
    eyeSlashIcon.classList.toggle('hidden', !isPassword);
});

logoutBtn.addEventListener('click', () => signOut(auth));

// --- Listeners de Navegação ---
backToEnrollmentsBtn.addEventListener('click', () => {
    dashboardView.classList.add('hidden');
    enrollmentsView.classList.remove('hidden');
    dashboardView.dataset.enrollmentId = '';
});

// --- Listeners de Matrículas ---
addEnrollmentBtn.addEventListener('click', () => {
    addEnrollmentForm.reset();
    document.getElementById('enrollment-modal-title').textContent = "Nova Matrícula";
    editingEnrollmentId = null;
    addEnrollmentModal.classList.remove('hidden');
});

cancelEnrollmentBtn.addEventListener('click', () => {
    addEnrollmentModal.classList.add('hidden');
});

addEnrollmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    const payload = {
        course: document.getElementById('enrollment-course').value,
        institution: document.getElementById('enrollment-institution').value,
        currentPeriod: document.getElementById('enrollment-period').value,
    };
    try {
        if (editingEnrollmentId) {
            const { doc, updateDoc } = await import('firebase/firestore');
            const docRef = doc(db, 'users', user.uid, 'enrollments', editingEnrollmentId);
            await updateDoc(docRef, payload);
        } else {
            const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
            const enrollmentsRef = collection(db, 'users', user.uid, 'enrollments');
            await addDoc(enrollmentsRef, { ...payload, createdAt: serverTimestamp(), position: Date.now() });
        }
        addEnrollmentModal.classList.add('hidden');
        await renderEnrollments();
    } catch (error) {
        console.error("Erro ao salvar matrícula:", error);
        alert("Não foi possível salvar a matrícula.");
    }
});

enrollmentsList.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');
    const user = auth.currentUser;
    if (!user) return;

    if (editBtn) {
        const docId = editBtn.dataset.id;
        editingEnrollmentId = docId;
        const { getDoc, doc } = await import('firebase/firestore');
        const docRef = doc(db, 'users', user.uid, 'enrollments', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('enrollment-course').value = data.course;
            document.getElementById('enrollment-institution').value = data.institution;
            document.getElementById('enrollment-period').value = data.currentPeriod;
            document.getElementById('enrollment-modal-title').textContent = "Editar Matrícula";
            addEnrollmentModal.classList.remove('hidden');
        }
    }

    if (deleteBtn) {
        itemToDelete = { type: 'enrollment', id: deleteBtn.dataset.id };
        confirmDeleteMessage.textContent = "Tem certeza que deseja excluir esta matrícula? Esta ação não pode ser desfeita.";
        confirmDeleteModal.classList.remove('hidden');
    }
});

// --- Listeners de Disciplinas ---
addDisciplineBtn.addEventListener('click', () => {
    addDisciplineForm.reset();
    document.getElementById('discipline-modal-title').textContent = "Nova Disciplina";
    editingDisciplineId = null;
    addDisciplineModal.classList.remove('hidden');
});

cancelDisciplineBtn.addEventListener('click', () => {
    addDisciplineModal.classList.add('hidden');
});

addDisciplineForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    const enrollmentId = dashboardView.dataset.enrollmentId;
    if (!user || !enrollmentId) return;
    const payload = {
        name: document.getElementById('discipline-name').value,
        code: document.getElementById('discipline-code').value,
        teacher: document.getElementById('discipline-teacher').value,
        location: document.getElementById('discipline-location').value,
        schedule: document.getElementById('discipline-schedule').value,
    };
    try {
        if (editingDisciplineId) {
            const { doc, updateDoc } = await import('firebase/firestore');
            const docRef = doc(db, 'users', user.uid, 'enrollments', enrollmentId, 'disciplines', editingDisciplineId);
            await updateDoc(docRef, payload);
        } else {
            const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
            const disciplinesRef = collection(db, 'users', user.uid, 'enrollments', enrollmentId, 'disciplines');
            await addDoc(disciplinesRef, { ...payload, createdAt: serverTimestamp() });
        }
        addDisciplineModal.classList.add('hidden');
        renderDisciplines(enrollmentId);
    } catch (error) {
        console.error("Erro ao salvar disciplina:", error);
        alert("Não foi possível salvar a disciplina.");
    }
});

disciplinesList.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.edit-discipline-btn');
    const deleteBtn = e.target.closest('.delete-discipline-btn');
    const user = auth.currentUser;
    const enrollmentId = dashboardView.dataset.enrollmentId;
    if (!user || !enrollmentId) return;

    if (editBtn) {
        const docId = editBtn.dataset.id;
        editingDisciplineId = docId;
        const { getDoc, doc } = await import('firebase/firestore');
        const docRef = doc(db, 'users', user.uid, 'enrollments', enrollmentId, 'disciplines', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('discipline-name').value = data.name;
            document.getElementById('discipline-code').value = data.code || '';
            document.getElementById('discipline-teacher').value = data.teacher || '';
            document.getElementById('discipline-location').value = data.location || '';
            document.getElementById('discipline-schedule').value = data.schedule || '';
            document.getElementById('discipline-modal-title').textContent = "Editar Disciplina";
            addDisciplineModal.classList.remove('hidden');
        }
    }

    if (deleteBtn) {
        itemToDelete = { type: 'discipline', enrollmentId, id: deleteBtn.dataset.id };
        confirmDeleteMessage.textContent = "Tem certeza que deseja excluir esta disciplina? Esta ação não pode ser desfeita.";
        confirmDeleteModal.classList.remove('hidden');
    }
});

// --- Listeners do Modal de Confirmação ---
confirmDeleteBtn.addEventListener('click', async () => {
    if (!itemToDelete) return;
    const user = auth.currentUser;
    try {
        const { doc, deleteDoc } = await import('firebase/firestore');
        let docRef;
        if (itemToDelete.type === 'discipline') {
            docRef = doc(db, 'users', user.uid, 'enrollments', itemToDelete.enrollmentId, 'disciplines', itemToDelete.id);
            await deleteDoc(docRef);
            await renderDisciplines(itemToDelete.enrollmentId);
        } else {
            docRef = doc(db, 'users', user.uid, 'enrollments', itemToDelete.id);
            await deleteDoc(docRef);
            await renderEnrollments();
        }
    } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("Não foi possível realizar a exclusão.");
    } finally {
        itemToDelete = null;
        confirmDeleteModal.classList.add('hidden');
    }
});

cancelDeleteBtn.addEventListener('click', () => {
    itemToDelete = null;
    confirmDeleteModal.classList.add('hidden');
});

// 8. LISTENER PRINCIPAL DE ESTADO DE AUTENTICAÇÃO
onAuthStateChanged(auth, (user) => {
    if (user) {
        authScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
        userEmailDisplay.textContent = user.email;
        renderEnrollments();
    } else {
        authScreen.classList.remove('hidden');
        appContainer.classList.add('hidden');
        userEmailDisplay.textContent = '';
        dashboardView.classList.add('hidden');
        enrollmentsView.classList.remove('hidden');
        authMode = 'login';
        updateAuthView();
    }
});

// 9. INICIALIZAÇÃO
updateAuthView();