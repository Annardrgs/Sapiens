import './style.css';
import { auth, db } from './firebase.js';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

document.querySelector('#app').innerHTML = `
  <div id="auth-screen">
    <div class="min-h-screen flex flex-col items-center justify-center bg-bkg p-4">
      <div class="w-full max-w-md p-8 space-y-6 bg-surface rounded-xl shadow-2xl border border-border">
        <div>
          <h2 id="auth-title" class="text-center text-3xl font-extrabold text-secondary">
            Acesse sua Conta
          </h2>
          <p id="auth-prompt" class="mt-2 text-center text-sm text-subtle">
          </p>
        </div>
        <form id="auth-form" class="space-y-6">
          <input type="email" id="auth-email" placeholder="Email" required 
                 class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md shadow-sm focus:ring-primary focus:border-primary placeholder-subtle">
          <div class="relative">
            <input type="password" id="auth-password" placeholder="Senha" required 
                   class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md shadow-sm focus:ring-primary focus:border-primary placeholder-subtle pr-12 appearance-none">
            <button type="button" id="toggle-password-btn" class="absolute inset-y-0 right-0 px-4 flex items-center text-subtle hover:text-primary focus:outline-none rounded-r-md">
              <svg id="eye-icon" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <svg id="eye-slashed-icon" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7 .847 0 1.67.129 2.452.37M9.875 9.875A3 3 0 1112 15a3 3 0 01-2.125-5.125M15 12a3 3 0 00-3-3m0 0l-6 6m6-6l6 6" />
              </svg>
            </button>
          </div>
          <button id="auth-submit-btn" type="submit" 
                  class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-bkg bg-primary hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary">
            Entrar
          </button>
        </form>
      </div>
    </div>
  </div>

  <div id="app-container" class="hidden">
    <header class="bg-surface shadow-md border-b border-border">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
                <h1 class="text-2xl font-bold text-secondary">Meu Planner</h1>
                <div class="flex items-center">
                    <span id="user-email" class="text-sm text-subtle mr-4"></span>
                    <button id="logout-btn" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg shadow-md hover:opacity-90 transition-opacity">Sair</button>
                </div>
            </div>
        </div>
    </header>

    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
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

      <div id="dashboard-view" class="hidden">
        <div class="px-4 py-6 sm:px-0">
          <button id="back-to-enrollments-btn" class="mb-6 text-sm text-primary hover:opacity-80 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Voltar para Matrículas
          </button>
          <h2 id="dashboard-title" class="text-3xl font-bold text-secondary"></h2>
          <p id="dashboard-subtitle" class="text-subtle mt-1"></p>
          
          <div class="mt-8 border-t border-border pt-8">
            <p>Em breve: Disciplinas, Calendário, Faltas e mais...</p>
          </div>
        </div>
      </div>
    </main>
  </div>
`;

const authScreen = document.getElementById('auth-screen');
const appContainer = document.getElementById('app-container');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authPrompt = document.getElementById('auth-prompt');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const logoutBtn = document.getElementById('logout-btn');
const userEmailDisplay = document.getElementById('user-email');

let authMode = 'login';

function updateAuthView() {
    if (authMode === 'login') {
        authTitle.textContent = 'Acesse sua Conta';
        authSubmitBtn.textContent = 'Entrar';
        authPrompt.innerHTML = 'Ou <button id="switch-to-signup-btn" type="button" class="font-medium text-primary hover:opacity-80">crie uma nova conta</button>';

        document.getElementById('switch-to-signup-btn').addEventListener('click', () => {
            authMode = 'signup';
            updateAuthView();
        });
    } else {
        authTitle.textContent = 'Crie sua Conta';
        authSubmitBtn.textContent = 'Criar Conta';
        authPrompt.innerHTML = 'Já tem uma conta? <button id="switch-to-login-btn" type="button" class="font-medium text-primary hover:opacity-80">Faça o login</button>';

        document.getElementById('switch-to-login-btn').addEventListener('click', () => {
            authMode = 'login';
            updateAuthView();
        });
    }
}

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
                uid: user.uid,
                email: user.email,
                name: email.split('@')[0],
                createdAt: new Date()
            });
        }
    } catch (error) {
        console.error("Erro de autenticação:", error);
        alert(`Erro: ${error.message}`);
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

const modalHTML = `
  <div id="add-enrollment-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 items-center justify-center z-50">
    <div class="bg-surface p-8 rounded-lg shadow-xl w-full max-w-md border border-border">
      <h3 class="text-2xl font-bold mb-6 text-secondary">Nova Matrícula</h3>
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

const enrollmentsView = document.getElementById('enrollments-view');
const dashboardView = document.getElementById('dashboard-view');
const backToEnrollmentsBtn = document.getElementById('back-to-enrollments-btn');

const addEnrollmentBtn = document.getElementById('add-enrollment-btn');
const addEnrollmentModal = document.getElementById('add-enrollment-modal');
const addEnrollmentForm = document.getElementById('add-enrollment-form');
const cancelEnrollmentBtn = document.getElementById('cancel-enrollment-btn');
const enrollmentsList = document.getElementById('enrollments-list');

addEnrollmentBtn.addEventListener('click', () => {
  addEnrollmentModal.classList.remove('hidden');
});

cancelEnrollmentBtn.addEventListener('click', () => {
  addEnrollmentModal.classList.add('hidden');
  addEnrollmentForm.reset();
});

addEnrollmentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return alert("Você precisa estar logado.");

  const course = document.getElementById('enrollment-course').value;
  const institution = document.getElementById('enrollment-institution').value;
  const period = document.getElementById('enrollment-period').value;

  try {
    const payload = { course, institution, currentPeriod: period };
    
    if (editingEnrollmentId) {
        // Se estamos editando, ATUALIZA o documento
        const { doc, updateDoc } = await import('firebase/firestore');
        const docRef = doc(db, 'users', user.uid, 'enrollments', editingEnrollmentId);
        await updateDoc(docRef, payload);
    } else {
        // Se não, CRIA um novo documento
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        const enrollmentsRef = collection(db, 'users', user.uid, 'enrollments');
        await addDoc(enrollmentsRef, { ...payload, createdAt: serverTimestamp() });
    }

    addEnrollmentModal.classList.add('hidden');
    addEnrollmentForm.reset();
    editingEnrollmentId = null; // Limpa o ID de edição
    document.querySelector('#add-enrollment-modal h3').textContent = "Nova Matrícula";
    await renderEnrollments(); // Atualiza a lista
  } catch (error) {
    console.error("Erro ao salvar matrícula:", error);
    alert("Não foi possível salvar a matrícula.");
  }
});

let editingEnrollmentId = null;

document.getElementById('enrollments-list').addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');
    const user = auth.currentUser;
    if (!user) return;

    if (editBtn) {
        const docId = editBtn.dataset.id;
        editingEnrollmentId = docId; // Define o ID que estamos editando
        
        const { getDoc, doc } = await import('firebase/firestore');
        const docRef = doc(db, 'users', user.uid, 'enrollments', docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            // Preenche o modal com os dados existentes
            document.getElementById('enrollment-course').value = data.course;
            document.getElementById('enrollment-institution').value = data.institution;
            document.getElementById('enrollment-period').value = data.currentPeriod;
            document.querySelector('#add-enrollment-modal h3').textContent = "Editar Matrícula";
            addEnrollmentModal.classList.remove('hidden');
        }
    }

    if (deleteBtn) {
        const docId = deleteBtn.dataset.id;
        if (confirm("Tem certeza que deseja excluir esta matrícula? Esta ação não pode ser desfeita.")) {
            try {
                const { doc, deleteDoc } = await import('firebase/firestore');
                const docRef = doc(db, 'users', user.uid, 'enrollments', docId);
                await deleteDoc(docRef);
                await renderEnrollments(); // Atualiza a lista
            } catch (error) {
                console.error("Erro ao excluir matrícula:", error);
                alert("Não foi possível excluir a matrícula.");
            }
        }
    }
});

// Listener do botão de cancelar no modal precisa limpar o modo de edição
cancelEnrollmentBtn.addEventListener('click', () => {
    addEnrollmentModal.classList.add('hidden');
    addEnrollmentForm.reset();
    editingEnrollmentId = null; // Limpa o ID de edição
    document.querySelector('#add-enrollment-modal h3').textContent = "Nova Matrícula";
});

function showDashboard(enrollmentData, enrollmentId) {
  enrollmentsView.classList.add('hidden');
  dashboardView.classList.remove('hidden');

  document.getElementById('dashboard-title').textContent = enrollmentData.course;
  document.getElementById('dashboard-subtitle').textContent = `${enrollmentData.institution} - Período ${enrollmentData.currentPeriod}`;
  
  // Guardamos o ID da matrícula selecionada para uso futuro
  dashboardView.dataset.enrollmentId = enrollmentId;
}

// Função para VOLTAR para a lista de matrículas
backToEnrollmentsBtn.addEventListener('click', () => {
  dashboardView.classList.add('hidden');
  enrollmentsView.classList.remove('hidden');
  dashboardView.dataset.enrollmentId = ''; // Limpa o ID
});

async function renderEnrollments() {
  const user = auth.currentUser;
  if (!user) return;
  const enrollmentsList = document.getElementById('enrollments-list');
  enrollmentsList.innerHTML = `<p class="text-subtle">Carregando matrículas...</p>`;
  
  const { collection, query, orderBy, getDocs } = await import('firebase/firestore');
  const enrollmentsRef = collection(db, 'users', user.uid, 'enrollments');
  const q = query(enrollmentsRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    enrollmentsList.innerHTML = `<p class="text-subtle col-span-full text-center">Nenhuma matrícula encontrada. Adicione uma para começar!</p>`;
    return;
  }

  enrollmentsList.innerHTML = ''; // Limpa a lista antes de adicionar os novos cards
  querySnapshot.forEach(doc => {
    const data = doc.data();
    const card = document.createElement('div');
    card.className = "bg-surface p-6 rounded-lg shadow-lg border border-border hover:border-primary transition-all cursor-pointer";
    card.innerHTML = `
      <div class="flex-grow">
        <h4 class="text-xl font-bold text-secondary">${data.course}</h4>
        <p class="text-subtle">${data.institution}</p>
        <p class="text-sm text-subtle mt-4">Período: ${data.currentPeriod}</p>
      </div>
      <div class="flex flex-col space-y-2">
        <button data-id="${doc.id}" class="edit-btn p-2 rounded-md hover:bg-bkg"><svg class="w-5 h-5 text-subtle pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
        <button data-id="${doc.id}" class="delete-btn p-2 rounded-md hover:bg-bkg"><svg class="w-5 h-5 text-danger pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
      </div>
    `;
    // Adiciona o listener de clique para NAVEGAR (se clicar no card, mas não nos botões)
    card.addEventListener('click', (e) => {
      if (e.target.closest('.edit-btn') || e.target.closest('.delete-btn')) {
        return;
      }
      showDashboard(data, doc.id);
    });
    // Adiciona o listener de clique para navegar para o dashboard
    card.addEventListener('click', () => showDashboard(data, doc.id));
    enrollmentsList.appendChild(card);
  });
}

const togglePasswordBtn = document.getElementById('toggle-password-btn');
const passwordInput = document.getElementById('auth-password');
const eyeIcon = document.getElementById('eye-icon');
const eyeSlashedIcon = document.getElementById('eye-slashed-icon');

togglePasswordBtn.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  eyeIcon.classList.toggle('hidden', isPassword);
  eyeSlashedIcon.classList.toggle('hidden', !isPassword);
});

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

updateAuthView();