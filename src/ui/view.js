/**
 * @file Módulo para funções que manipulam a interface do usuário (UI).
 * Inclui renderização de listas, troca de telas e atualização de elementos visuais.
 */

import { dom } from './dom.js';
import * as api from '../api/firestore.js';
import { getState, setState } from '../store/state.js';
import { createEnrollmentCard, createDisciplineCard, createAbsenceHistoryItem } from '../components/card.js';

let sortableInstances = { enrollments: null, disciplines: null };

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
    renderEnrollments();
    renderGeneralDashboard();
}

// --- RENDERIZAÇÃO DE CONTEÚDO ---

export function renderUserEmail(email) {
    dom.userEmailDisplay.textContent = email;
}

export async function renderEnrollments() {
  dom.enrollmentsList.innerHTML = `<p class="text-subtle">Carregando...</p>`;
  const enrollments = await api.getEnrollments();
  dom.enrollmentsList.innerHTML = '';
  if (!enrollments.length) {
    dom.enrollmentsList.innerHTML = `<p class="text-subtle col-span-full text-center">Nenhuma matrícula encontrada.</p>`;
    return;
  }
  enrollments.forEach(e => dom.enrollmentsList.appendChild(createEnrollmentCard(e)));
  if (sortableInstances.enrollments) sortableInstances.enrollments.destroy();
  sortableInstances.enrollments = new Sortable(dom.enrollmentsList, { /* ... */ });
}

async function renderGeneralDashboard() {
  dom.generalDashboardContent.innerHTML = `<p class="text-subtle">Carregando resumo...</p>`;
  const dashboardData = await api.getActivePeriodDataForAllEnrollments();

  if (!dashboardData.length) {
    dom.generalDashboard.classList.add('hidden');
    return;
  }
  
  dom.generalDashboard.classList.remove('hidden');
  dom.generalDashboardContent.innerHTML = '';

  dashboardData.forEach(data => {
    const enrollmentSection = document.createElement('div');
    enrollmentSection.className = 'bg-surface p-6 rounded-lg shadow-md border border-border';

    // Limita a 3 disciplinas para um resumo
    const disciplinesToShow = data.disciplines.slice(0, 3); 

    enrollmentSection.innerHTML = `
      <div class="flex justify-between items-center mb-4">
        <div>
            <h3 class="text-xl font-bold text-secondary">${data.course}</h3>
            <p class="text-sm text-subtle">${data.institution} - Período: ${data.periodName}</p>
        </div>
        <button data-id="${data.enrollmentId}" class="view-enrollment-dashboard-btn bg-primary text-bkg text-sm font-semibold py-2 px-3 rounded-lg hover:opacity-90">
            Ver Painel
        </button>
      </div>
      <div class="space-y-3">
        ${disciplinesToShow.length > 0 ? disciplinesToShow.map(d => `
          <div class="p-3 bg-bkg rounded-md border border-border">
            <p class="font-semibold text-secondary">${d.name}</p>
            <p class="text-xs text-subtle">${d.teacher || 'Professor não definido'}</p>
          </div>
        `).join('') : '<p class="text-sm text-subtle">Nenhuma disciplina cadastrada neste período.</p>'}
      </div>
    `;
    dom.generalDashboardContent.appendChild(enrollmentSection);
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

        // Nova lógica para buscar e renderizar períodos
        const periods = await api.getPeriods(enrollmentId);
        setState('periods', periods);
        const activeIndex = periods.findIndex(p => p.id === data.activePeriodId);
        setState('activePeriodIndex', activeIndex > -1 ? activeIndex : 0);
        
        await renderPeriodNavigator();
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

export async function renderDisciplines(enrollmentId, periodId, isPeriodClosed = false) {
  dom.disciplinesList.innerHTML = `<p class="text-subtle">Carregando disciplinas...</p>`;
  const disciplines = await api.getDisciplines(enrollmentId, periodId);

  if (!disciplines.length) {
    dom.disciplinesList.innerHTML = `<p class="text-subtle col-span-full text-center">Nenhuma disciplina adicionada a este período ainda.</p>`;
    return;
  }

  dom.disciplinesList.innerHTML = '';
  disciplines.forEach(discipline => {
    const card = createDisciplineCard(discipline, isPeriodClosed);
    dom.disciplinesList.appendChild(card);
  });
  
  if (sortableInstances.disciplines) {
    sortableInstances.disciplines.destroy();
  }
  
  if (!isPeriodClosed) {
    sortableInstances.disciplines = new Sortable(dom.disciplinesList, {
        animation: 150,
        ghostClass: 'opacity-50',
        onEnd: (evt) => api.updateDisciplinesOrder(Array.from(evt.to.children), { enrollmentId, periodId }),
    });
  }
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

export async function renderPeriodNavigator() {
    const { periods, activePeriodIndex, activeEnrollmentId } = getState();

    if (!periods || periods.length === 0) {
        dom.currentPeriodName.textContent = 'Nenhum';
        dom.prevPeriodBtn.disabled = true;
        dom.nextPeriodBtn.disabled = true;
        dom.disciplinesList.innerHTML = '<p class="text-subtle col-span-full text-center">Crie um novo período para começar.</p>';
        return;
    }
    
    const currentPeriod = periods[activePeriodIndex];
    if (!currentPeriod) return;

    if (currentPeriod.calendarUrl) {
        dom.viewCalendarBtn.classList.remove('hidden');
    } else {
        dom.viewCalendarBtn.classList.add('hidden');
    }

    setState('activePeriodId', currentPeriod.id);
    
    // Atualiza o nome e o status visual do período
    dom.currentPeriodName.textContent = currentPeriod.name;
    if (currentPeriod.status === 'closed') {
        dom.currentPeriodName.classList.add('line-through', 'text-subtle');
        dom.endPeriodBtn.classList.add('hidden');
        dom.reopenPeriodBtn.classList.remove('hidden');
    } else {
        dom.currentPeriodName.classList.remove('line-through', 'text-subtle');
        dom.endPeriodBtn.classList.remove('hidden');
        dom.reopenPeriodBtn.classList.add('hidden');
    }

    // Habilita/desabilita as setas de navegação
    dom.prevPeriodBtn.disabled = activePeriodIndex >= periods.length - 1;
    dom.nextPeriodBtn.disabled = activePeriodIndex <= 0;

    // Renderiza as disciplinas do período selecionado
    await renderDisciplines(activeEnrollmentId, currentPeriod.id, currentPeriod.status === 'closed');
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
