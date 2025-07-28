/**
 * @file Módulo para inicializar todos os event listeners da aplicação.
 */

import { dom } from './ui/dom.js';
import { setState, getState } from './store/state.js';
import * as authApi from './api/auth.js';
import * as firestoreApi from './api/firestore.js';
import * as view from './ui/view.js';
import * as modals from './ui/modals.js';
import { toggleTheme } from './ui/theme.js';

// --- INICIALIZAÇÃO DOS LISTENERS ---

export function initializeAuthListeners() {
  dom.authForm.addEventListener('submit', handleAuthFormSubmit);
  dom.togglePasswordBtn.addEventListener('click', view.togglePasswordVisibility);
  
  dom.authPrompt.addEventListener('click', (e) => {
    if (e.target.id === 'switch-to-signup-btn') {
      setState('authMode', 'signup');
      view.updateAuthView();
    }
    if (e.target.id === 'switch-to-login-btn') {
      setState('authMode', 'login');
      view.updateAuthView();
    }
  });
}

export function initializeAppListeners() {
  // Header
  dom.logoutBtn.addEventListener('click', authApi.logOut);
  dom.themeToggleBtn.addEventListener('click', toggleTheme);

  // Navegação
  dom.backToEnrollmentsBtn.addEventListener('click', view.showEnrollmentsView);

  // Modais
  dom.addEnrollmentBtn.addEventListener('click', () => modals.showEnrollmentModal());
  dom.cancelEnrollmentBtn.addEventListener('click', modals.hideEnrollmentModal);
  dom.addEnrollmentForm.addEventListener('submit', handleEnrollmentFormSubmit);

  dom.addDisciplineBtn.addEventListener('click', () => modals.showDisciplineModal());
  dom.cancelDisciplineBtn.addEventListener('click', modals.hideDisciplineModal);
  dom.addDisciplineForm.addEventListener('submit', handleDisciplineFormSubmit);
  
  dom.newPeriodBtn.addEventListener('click', modals.showPeriodModal);
  dom.cancelPeriodBtn.addEventListener('click', modals.hidePeriodModal);
  dom.addPeriodForm.addEventListener('submit', handlePeriodFormSubmit);

  dom.cancelAbsenceBtn.addEventListener('click', modals.hideAbsenceModal);
  dom.addAbsenceForm.addEventListener('submit', handleAbsenceFormSubmit);
  dom.closeAbsenceHistoryBtn.addEventListener('click', modals.hideAbsenceHistoryModal);

  dom.confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
  dom.cancelDeleteBtn.addEventListener('click', modals.hideConfirmDeleteModal);

  // Delegação de Eventos para listas dinâmicas
  dom.enrollmentsList.addEventListener('click', handleEnrollmentsListClick);
  dom.disciplinesList.addEventListener('click', handleDisciplinesListClick);
  dom.absenceHistoryList.addEventListener('click', handleAbsenceHistoryListClick);

  // Listeners para o navegador de período
  dom.prevPeriodBtn.addEventListener('click', () => switchPeriod('prev'));
  dom.nextPeriodBtn.addEventListener('click', () => switchPeriod('next'));
  dom.managePeriodBtn.addEventListener('click', () => dom.periodMenu.classList.toggle('hidden'));
  dom.endPeriodBtn.addEventListener('click', handleEndPeriod);
  dom.reopenPeriodBtn.addEventListener('click', handleReopenPeriod);
  dom.deletePeriodBtn.addEventListener('click', handleDeletePeriod);
}

// --- HANDLERS (LÓGICA DOS EVENTOS) ---

async function handleAuthFormSubmit(e) {
  e.preventDefault();
  const email = dom.authEmailInput.value;
  const password = dom.authPasswordInput.value;
  try {
    if (getState().authMode === 'login') await authApi.signIn(email, password);
    else await authApi.signUp(email, password);
  } catch (error) {
    console.error("Erro de autenticação:", error);
    alert(`Erro: ${error.message}`);
  }
}

async function handleEnrollmentFormSubmit(e) {
    e.preventDefault();
    const payload = {
        course: dom.addEnrollmentForm.querySelector('#enrollment-course').value,
        institution: dom.addEnrollmentForm.querySelector('#enrollment-institution').value,
        currentPeriod: dom.addEnrollmentForm.querySelector('#enrollment-period').value,
    };
    const { editingEnrollmentId } = getState();
    try {
        await firestoreApi.saveEnrollment(payload, editingEnrollmentId);
        modals.hideEnrollmentModal();
        await view.renderEnrollments();
    } catch (error) {
        console.error("Erro ao salvar matrícula:", error);
    }
}

function handleEnrollmentsListClick(e) {
    const card = e.target.closest('[data-id]');
    if (!card) return;
    const id = card.dataset.id;
    if (e.target.closest('.edit-btn')) {
        modals.showEnrollmentModal(id);
    } else if (e.target.closest('.delete-btn')) {
        modals.showConfirmDeleteModal({ type: 'enrollment', id });
    } else {
        view.showDashboardView(id);
    }
}

async function handlePeriodFormSubmit(e) {
    e.preventDefault();
    const { activeEnrollmentId } = getState();
    const periodName = dom.addPeriodForm.querySelector('#period-name').value;
    if (!periodName) return alert("O nome do período é obrigatório.");
    try {
        const newPeriodDoc = await firestoreApi.createPeriod(activeEnrollmentId, periodName);
        modals.hidePeriodModal();
        await view.populatePeriodSwitcher(activeEnrollmentId, newPeriodDoc.id);
    } catch (error) {
        console.error("Erro ao criar período:", error);
    }
}

async function handlePeriodSwitch(e) {
    const newPeriodId = e.target.value;
    const { activeEnrollmentId } = getState();
    setState('activePeriodId', newPeriodId);
    await firestoreApi.updateActivePeriod(activeEnrollmentId, newPeriodId);
    await view.renderDisciplines(activeEnrollmentId, newPeriodId);
}

async function handleDisciplineFormSubmit(e) {
    e.preventDefault();
    const { activeEnrollmentId, activePeriodId, editingDisciplineId } = getState();
    const payload = {
        name: dom.addDisciplineForm.querySelector('#discipline-name').value,
        code: dom.addDisciplineForm.querySelector('#discipline-code').value,
        teacher: dom.addDisciplineForm.querySelector('#discipline-teacher').value,
        location: dom.addDisciplineForm.querySelector('#discipline-location').value,
        schedule: dom.addDisciplineForm.querySelector('#discipline-schedule').value,
        workload: parseInt(dom.addDisciplineForm.querySelector('#discipline-workload').value),
        hoursPerClass: parseInt(dom.addDisciplineForm.querySelector('#discipline-hours-per-class').value),
    };
    try {
        await firestoreApi.saveDiscipline(payload, { enrollmentId: activeEnrollmentId, periodId: activePeriodId, disciplineId: editingDisciplineId });
        modals.hideDisciplineModal();
        await view.renderDisciplines(activeEnrollmentId, activePeriodId);
    } catch (error) {
        console.error("Erro ao salvar disciplina:", error);
    }
}

function handleDisciplinesListClick(e) {
    const button = e.target.closest('button[data-id]');
    if(!button) return;

    const id = button.dataset.id;
    const name = button.dataset.name;
    const { activeEnrollmentId, activePeriodId } = getState();

    if (button.matches('.edit-discipline-btn')) {
        modals.showDisciplineModal(id);
    } else if (button.matches('.delete-discipline-btn')) {
        modals.showConfirmDeleteModal({ type: 'discipline', id, enrollmentId: activeEnrollmentId, periodId: activePeriodId });
    } else if (button.matches('.add-absence-btn')) {
        modals.showAbsenceModal(id, name);
    } else if (button.matches('.absence-history-btn')) {
        modals.showAbsenceHistoryModal(id, name);
        view.renderAbsenceHistory(activeEnrollmentId, activePeriodId, id);
    }
}

async function handleAbsenceFormSubmit(e) {
    e.preventDefault();
    const { currentDisciplineForAbsence } = getState();
    if (!currentDisciplineForAbsence) return;
    
    const payload = {
        absenceDate: dom.addAbsenceForm.querySelector('#absence-date').value,
        justification: dom.addAbsenceForm.querySelector('#absence-justification').value,
        addedAt: new Date(),
    };

    try {
        await firestoreApi.addAbsence(payload, currentDisciplineForAbsence);
        modals.hideAbsenceModal();
        await view.renderDisciplines(currentDisciplineForAbsence.enrollmentId, currentDisciplineForAbsence.periodId);
    } catch (error) {
        console.error("Erro ao registrar falta:", error);
    }
}

async function handleAbsenceHistoryListClick(e) {
    const removeBtn = e.target.closest('.remove-absence-btn');
    if (!removeBtn) return;
    const { currentDisciplineForAbsence } = getState();
    if (confirm("Tem certeza que deseja remover esta falta?")) {
        try {
            await firestoreApi.removeAbsence(removeBtn.dataset.id, currentDisciplineForAbsence);
            view.renderAbsenceHistory(currentDisciplineForAbsence.enrollmentId, currentDisciplineForAbsence.periodId, currentDisciplineForAbsence.disciplineId);
            await view.renderDisciplines(currentDisciplineForAbsence.enrollmentId, currentDisciplineForAbsence.periodId);
        } catch (error) {
            console.error("Erro ao remover falta:", error);
        }
    }
}

async function handleConfirmDelete() {
    const item = getState().itemToDelete;
    if (!item) return;
    try {
        if (item.type === 'discipline') {
            await firestoreApi.deleteDiscipline(item.enrollmentId, item.periodId, item.id);
            await view.renderDisciplines(item.enrollmentId, item.periodId);
        } else if (item.type === 'period') {
            await firestoreApi.deletePeriod(item.enrollmentId, item.id);
            await view.showDashboardView(item.enrollmentId);
        } else {
            await firestoreApi.deleteEnrollment(item.id);
            await view.renderEnrollments();
        }
    } catch (error) {
        console.error("Erro ao excluir:", error);
    } finally {
        modals.hideConfirmDeleteModal();
    }
}

async function switchPeriod(direction) {
    const { periods, activePeriodIndex, activeEnrollmentId } = getState();
    let newIndex = activePeriodIndex;

    if (direction === 'prev' && activePeriodIndex < periods.length - 1) {
        newIndex++;
    } else if (direction === 'next' && activePeriodIndex > 0) {
        newIndex--;
    }

    if (newIndex !== activePeriodIndex) {
        setState('activePeriodIndex', newIndex);
        const newActivePeriodId = periods[newIndex].id;
        await firestoreApi.updateActivePeriod(activeEnrollmentId, newActivePeriodId);
        await view.renderPeriodNavigator();
    }
}

function handleEndPeriod() {
    const { activeEnrollmentId, activePeriodId } = getState();
    if (confirm("Tem certeza que deseja encerrar este período? Não será possível adicionar ou editar disciplinas.")) {
        firestoreApi.updatePeriodStatus(activeEnrollmentId, activePeriodId, 'closed')
            .then(() => view.showDashboardView(activeEnrollmentId));
    }
    dom.periodMenu.classList.add('hidden');
}

function handleReopenPeriod() {
    const { activeEnrollmentId, activePeriodId } = getState();
    firestoreApi.updatePeriodStatus(activeEnrollmentId, activePeriodId, 'active')
        .then(() => view.showDashboardView(activeEnrollmentId));
    dom.periodMenu.classList.add('hidden');
}

function handleDeletePeriod() {
    const { activeEnrollmentId, activePeriodId } = getState();
    modals.showConfirmDeleteModal({ type: 'period', id: activePeriodId, enrollmentId: activeEnrollmentId });
    dom.periodMenu.classList.add('hidden');
}
