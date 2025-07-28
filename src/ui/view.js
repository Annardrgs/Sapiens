/**
 * @file Módulo para funções que manipulam a interface do usuário (UI).
 * Inclui renderização de listas, troca de telas e atualização de elementos visuais.
 */

import { dom } from './dom.js';
import * as api from '../api/firestore.js';
import { getState, setState } from '../store/state.js';
import { createEnrollmentCard } from '../components/Card.js';

let sortableInstances = {
  enrollments: null,
  disciplines: null,
};

// --- CONTROLE DE VISIBILIDADE DAS TELAS ---

export function showAuthScreen() {
  dom.authScreen.classList.remove('hidden');
  dom.appContainer.classList.add('hidden');
  updateAuthView();
}

export function showAppScreen() {
  dom.authScreen.classList.add('hidden');
  dom.appContainer.classList.remove('hidden');
}

export function showEnrollmentsView() {
    if (sortableInstances.disciplines) {
        sortableInstances.disciplines.destroy();
        sortableInstances.disciplines = null;
    }
    dom.dashboardView.classList.add('hidden');
    dom.enrollmentsView.classList.remove('hidden');
    setState('activeEnrollmentId', null);
    setState('activePeriodId', null);
}

// --- RENDERIZAÇÃO DE CONTEÚDO ---

export function renderUserEmail(email) {
    dom.userEmailDisplay.textContent = email;
}

export async function renderEnrollments() {
  dom.enrollmentsList.innerHTML = `<p class="text-subtle">Carregando matrículas...</p>`;
  const enrollments = await api.getEnrollments();

  if (!enrollments.length) {
    dom.enrollmentsList.innerHTML = `<p class="text-subtle col-span-full text-center">Nenhuma matrícula encontrada. Adicione uma para começar!</p>`;
    return;
  }

  dom.enrollmentsList.innerHTML = '';
  enrollments.forEach(enrollment => {
    const card = createEnrollmentCard(enrollment);
    dom.enrollmentsList.appendChild(card);
  });

  // Inicializa o SortableJS para a lista de matrículas
  if (sortableInstances.enrollments) sortableInstances.enrollments.destroy();
  sortableInstances.enrollments = new Sortable(dom.enrollmentsList, {
      animation: 150,
      ghostClass: 'opacity-50',
      onEnd: (evt) => api.updateEnrollmentsOrder(Array.from(evt.to.children)),
  });
}

export async function showDashboardView(enrollmentId) {
    if (sortableInstances.enrollments) {
        sortableInstances.enrollments.destroy();
        sortableInstances.enrollments = null;
    }
    dom.enrollmentsView.classList.add('hidden');
    dom.dashboardView.classList.remove('hidden');
    setState('activeEnrollmentId', enrollmentId);

    const enrollmentSnap = await api.getEnrollment(enrollmentId);
    if (enrollmentSnap.exists()) {
        const data = enrollmentSnap.data();
        dom.dashboardTitle.textContent = data.course;
        dom.dashboardSubtitle.textContent = data.institution;
        await populatePeriodSwitcher(enrollmentId, data.activePeriodId);
        
        // Após popular o seletor, renderiza o dashboard completo
        await renderFullDashboard();
    }
}

async function renderFullDashboard() {
    const { activeEnrollmentId, activePeriodId } = getState();
    if (!activePeriodId) return;

    const disciplines = await api.getDisciplines(activeEnrollmentId, activePeriodId);
    
    renderDashboardSummaryCards(disciplines);
    
    renderDisciplineBudgets(disciplines);
    renderRecentDisciplinesList(disciplines);
}

function renderDashboardSummaryCards(disciplines) {
    let totalClasses = 0;
    let totalAbsences = 0;

    disciplines.forEach(d => {
        const workload = d.workload || 0;
        const hoursPerClass = d.hoursPerClass || 1;
        totalClasses += Math.floor(workload / hoursPerClass);
        totalAbsences += d.absences || 0;
    });

    const totalPresences = totalClasses > totalAbsences ? totalClasses - totalAbsences : 0;

    document.getElementById('total-classes-period').textContent = totalClasses;
    document.getElementById('total-presences-period').textContent = totalPresences;
    document.getElementById('total-absences-period').textContent = totalAbsences;
}

export async function renderDisciplines(enrollmentId, periodId) {
  dom.disciplinesList.innerHTML = `<p class="text-subtle">Carregando disciplinas...</p>`;
  const disciplines = await api.getDisciplines(enrollmentId, periodId);

  if (!disciplines.length) {
    dom.disciplinesList.innerHTML = `<p class="text-subtle col-span-full text-center">Nenhuma disciplina adicionada a este período ainda.</p>`;
    return;
  }

  dom.disciplinesList.innerHTML = '';
  disciplines.forEach(discipline => {
    const card = createDisciplineCard(discipline);
    dom.disciplinesList.appendChild(card);
  });
  
  // Inicializa o SortableJS para a lista de disciplinas
  if (sortableInstances.disciplines) sortableInstances.disciplines.destroy();
  sortableInstances.disciplines = new Sortable(dom.disciplinesList, {
      animation: 150,
      ghostClass: 'opacity-50',
      onEnd: (evt) => api.updateDisciplinesOrder(Array.from(evt.to.children), { enrollmentId, periodId }),
  });
}

export async function renderAbsenceHistory(enrollmentId, periodId, disciplineId) {
    dom.absenceHistoryList.innerHTML = `<p class="text-subtle">Carregando histórico...</p>`;
    const history = await api.getAbsenceHistory(enrollmentId, periodId, disciplineId);

    if (!history.length) {
        dom.absenceHistoryList.innerHTML = `<p class="text-subtle text-center">Nenhuma falta registrada.</p>`;
        return;
    }
    
    dom.absenceHistoryList.innerHTML = '';
    const listContainer = document.createElement('div');
    listContainer.className = 'space-y-2';
    history.forEach(item => {
        listContainer.appendChild(createAbsenceHistoryItem(item));
    });
    dom.absenceHistoryList.appendChild(listContainer);
}

export async function populatePeriodSwitcher(enrollmentId, activePeriodId) {
    const periods = await api.getPeriods(enrollmentId);
    dom.periodSwitcher.innerHTML = '';

    if (!periods.length) {
        dom.periodSwitcher.innerHTML = '<option>Nenhum período</option>';
        dom.disciplinesList.innerHTML = '<p class="text-subtle col-span-full text-center">Crie um novo período para começar.</p>';
        return;
    }

    periods.forEach(period => {
        const option = document.createElement('option');
        option.value = period.id;
        option.textContent = period.name;
        if (period.id === activePeriodId) {
            option.selected = true;
        }
        dom.periodSwitcher.appendChild(option);
    });

    setState('activePeriodId', dom.periodSwitcher.value);
    renderDisciplines(enrollmentId, getState().activePeriodId);
}


// --- UI DE AUTENTICAÇÃO ---

export function updateAuthView() {
  const authMode = getState().authMode;
  if (authMode === 'login') {
    dom.authTitle.textContent = 'Acesse sua Conta';
    dom.authSubmitBtn.textContent = 'Entrar';
    dom.authPrompt.innerHTML = 'Ou <button id="switch-to-signup-btn" type="button" class="font-medium text-primary hover:opacity-80">crie uma nova conta</button>';
  } else {
    dom.authTitle.textContent = 'Crie sua Conta';
    dom.authSubmitBtn.textContent = 'Criar Conta';
    dom.authPrompt.innerHTML = 'Já tem uma conta? <button id="switch-to-login-btn" type="button" class="font-medium text-primary hover:opacity-80">Faça o login</button>';
  }
}

export function togglePasswordVisibility() {
    const isPassword = dom.authPasswordInput.type === 'password';
    dom.authPasswordInput.type = isPassword ? 'text' : 'password';
    dom.eyeIcon.classList.toggle('hidden', isPassword);
    dom.eyeSlashIcon.classList.toggle('hidden', !isPassword);
}
