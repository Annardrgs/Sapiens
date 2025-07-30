/**
 * @file Módulo para inicializar e gerenciar todos os event listeners da aplicação.
 */

import { dom } from './ui/dom.js';
import { setState, getState } from './store/state.js';
import * as authApi from './api/auth.js';
import * as firestoreApi from './api/firestore.js';
import * as view from './ui/view.js';
import * as modals from './ui/modals.js';
import { toggleTheme } from './ui/theme.js';
import { calculateAverage } from './components/card.js';

// --- INICIALIZAÇÃO DOS LISTENERS ---

export function initializeAuthListeners() {
    if (dom.authForm) dom.authForm.addEventListener('submit', handleAuthFormSubmit);
    if (dom.authPrompt) dom.authPrompt.addEventListener('click', (e) => {
        if (e.target.id === 'switch-to-signup-btn') setState('authMode', 'signup');
        else if (e.target.id === 'switch-to-login-btn') setState('authMode', 'login');
        view.updateAuthView();
    });
    const authToggleBtn = dom.authScreen?.querySelector('[data-toggle-password]');
    if(authToggleBtn) authToggleBtn.addEventListener('click', () => view.togglePasswordVisibility(dom.authPasswordInput));
}

export function initializeAppListeners() {
    if (dom.appContainer) dom.appContainer.addEventListener('click', handleAppContainerClick);
    if (dom.logoutBtn) dom.logoutBtn.addEventListener('click', authApi.logOut);
    if (dom.themeToggleBtn) dom.themeToggleBtn.addEventListener('click', toggleTheme);
    document.addEventListener('click', handleOutsideClick, true);

    if (dom.addEnrollmentForm) dom.addEnrollmentForm.addEventListener('submit', handleEnrollmentFormSubmit);
    if (dom.addDisciplineForm) dom.addDisciplineForm.addEventListener('submit', handleDisciplineFormSubmit);
    if (dom.addPeriodForm) dom.addPeriodForm.addEventListener('submit', handlePeriodFormSubmit);
    if (dom.addAbsenceForm) dom.addAbsenceForm.addEventListener('submit', handleAbsenceFormSubmit);
    if (dom.confirmDeleteBtn) dom.confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
    if (dom.configGradesForm) dom.configGradesForm.addEventListener('submit', handleConfigGradesSubmit);
    if (dom.periodOptionsForm) dom.periodOptionsForm.addEventListener('submit', handlePeriodOptionsFormSubmit);
    
    if (dom.addDisciplineModal) dom.addDisciplineModal.querySelector('#add-schedule-btn').addEventListener('click', modals.addScheduleField);
    if (dom.configGradesForm) {
        dom.configGradesForm.querySelector('#grade-calculation-rule').addEventListener('change', modals.renderGradeFields);
        dom.addGradeFieldBtn.addEventListener('click', modals.addGradeField);
        dom.gradesContainer.addEventListener('input', modals.updateWeightsSum);
    }
    if (dom.disciplinesList) dom.disciplinesList.addEventListener('input', handleGradeInput);
    
    if (dom.cancelEnrollmentBtn) dom.cancelEnrollmentBtn.addEventListener('click', modals.hideEnrollmentModal);
    if (dom.cancelDisciplineBtn) dom.cancelDisciplineBtn.addEventListener('click', modals.hideDisciplineModal);
    if (dom.cancelPeriodBtn) dom.cancelPeriodBtn.addEventListener('click', modals.hidePeriodModal);
    if (dom.cancelAbsenceBtn) dom.cancelAbsenceBtn.addEventListener('click', modals.hideAbsenceModal);
    if (dom.closeAbsenceHistoryBtn) dom.closeAbsenceHistoryBtn.addEventListener('click', modals.hideAbsenceHistoryModal);
    if (dom.cancelDeleteBtn) dom.cancelDeleteBtn.addEventListener('click', modals.hideConfirmDeleteModal);
    if (dom.cancelConfigGradesBtn) dom.cancelConfigGradesBtn.addEventListener('click', modals.hideConfigGradesModal);
    if (dom.periodOptionsModal) dom.periodOptionsModal.querySelector('[data-action="cancel"]')?.addEventListener('click', modals.hidePeriodOptionsModal);
    if (dom.closePdfViewerBtn) dom.closePdfViewerBtn.addEventListener('click', modals.hidePdfViewerModal);

    // Listeners de "cancelar" dos modais
    if (dom.cancelEnrollmentBtn) dom.cancelEnrollmentBtn.addEventListener('click', modals.hideEnrollmentModal);
}


// --- HANDLERS (LÓGICA DOS EVENTOS) ---

async function handlePeriodOptionsFormSubmit(e) {
    e.preventDefault();
    const { activeEnrollmentId, activePeriodId } = getState();
    const fileInput = dom.periodOptionsForm.querySelector('#period-calendar-file');
    const file = fileInput.files[0];

    const payload = {
        startDate: dom.periodOptionsForm.querySelector('#period-start-date').value,
        endDate: dom.periodOptionsForm.querySelector('#period-end-date').value,
    };

    const submitButton = dom.periodOptionsForm.querySelector('button[type="submit"]');
    try {
        submitButton.textContent = 'Salvando...';
        submitButton.disabled = true;
        if (file) {
            const downloadURL = await firestoreApi.uploadPeriodCalendar(file);
            payload.calendarUrl = downloadURL;
        }
        await firestoreApi.updatePeriodDetails(activeEnrollmentId, activePeriodId, payload);
        modals.hidePeriodOptionsModal();
        await view.showDashboardView(activeEnrollmentId);
    } catch (error) {
        console.error("Erro ao salvar opções do período:", error);
        alert("Não foi possível salvar as alterações.");
    } finally {
        if(submitButton) {
            submitButton.textContent = 'Salvar Alterações';
            submitButton.disabled = false;
        }
    }
}

async function handleAppContainerClick(e) {
    const target = e.target;
    const button = target.closest('button');
    const actionTarget = target.closest('[data-action]');
    
    if (button && button.id) {
        switch (button.id) {
            case 'add-enrollment-btn': modals.showEnrollmentModal(); return;
            case 'add-discipline-btn': modals.showDisciplineModal(); return;
            case 'new-period-btn': modals.showPeriodModal(); return;
            case 'manage-period-btn': modals.showPeriodOptionsModal(); return;
            case 'back-to-enrollments-btn': view.showEnrollmentsView(); return;
            case 'prev-period-btn': switchPeriod('prev'); return;
            case 'next-period-btn': switchPeriod('next'); return;
        }
    }
    if (actionTarget) {
        const action = actionTarget.dataset.action;
        const card = target.closest('[data-id]');
        const id = card ? card.dataset.id : null;
        switch (action) {
            case 'edit-enrollment': modals.showEnrollmentModal(id); break;
            case 'delete-enrollment': modals.showConfirmDeleteModal({ type: 'enrollment', id }); break;
            case 'toggle-menu': e.stopPropagation(); document.getElementById(`menu-${id}`)?.classList.toggle('hidden'); break;
            case 'edit-discipline': modals.showDisciplineModal(id); break;
            case 'delete-discipline': {
                const { activeEnrollmentId, activePeriodId } = getState();
                modals.showConfirmDeleteModal({ type: 'discipline', id, enrollmentId: activeEnrollmentId, periodId: activePeriodId });
                break;
            }
            case 'add-absence': modals.showAbsenceModal(id, actionTarget.dataset.name); break;
            case 'history-absence': {
                const { activeEnrollmentId, activePeriodId } = getState();
                modals.showAbsenceHistoryModal(id, actionTarget.dataset.name);
                view.renderAbsenceHistory(activeEnrollmentId, activePeriodId, id);
                break;
            }
            case 'config-grades': modals.showConfigGradesModal(id, actionTarget.dataset.name); break;
        }
        return;
    }
    const enrollmentCard = target.closest('#enrollments-list [data-id]');
    if (enrollmentCard) {
        view.showDashboardView(enrollmentCard.dataset.id);
        return;
    }
    const detailsButton = target.closest('.view-enrollment-dashboard-btn');
    if (detailsButton) {
        const section = target.closest('[data-id]');
        if (section) {
            view.showDashboardView(section.dataset.id);
        }
        return;
    }
    const disciplineCard = target.closest('#disciplines-list [data-id]');
    if (disciplineCard && target.closest('.card-header')) {
        toggleCardExpansion(disciplineCard);
        return;
    }
}

async function handleAuthFormSubmit(e) {
    e.preventDefault();
    try {
        if (getState().authMode === 'login') await authApi.signIn(dom.authEmailInput.value, dom.authPasswordInput.value);
        else await authApi.signUp(dom.authEmailInput.value, dom.authPasswordInput.value);
    } catch (error) { console.error("Authentication Error:", error); alert(`Error: ${error.message}`); }
}

async function handleEnrollmentFormSubmit(e) {
    e.preventDefault();
    const payload = {
        course: dom.addEnrollmentForm.querySelector('#enrollment-course').value,
        institution: dom.addEnrollmentForm.querySelector('#enrollment-institution').value,
        currentPeriod: dom.addEnrollmentForm.querySelector('#enrollment-period').value,
        passingGrade: parseFloat(dom.addEnrollmentForm.querySelector('#enrollment-passing-grade').value) || 7.0,
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

async function handlePeriodFormSubmit(e) {
    e.preventDefault();
    const { activeEnrollmentId } = getState();
    const payload = {
        name: dom.addPeriodForm.querySelector('#period-name').value,
        startDate: dom.addPeriodForm.querySelector('#period-start-date-new').value,
        endDate: dom.addPeriodForm.querySelector('#period-end-date-new').value,
    };
    if (!payload.name || !payload.startDate || !payload.endDate) return alert("Todos os campos são obrigatórios.");
    try {
        await firestoreApi.createPeriod(activeEnrollmentId, payload);
        modals.hidePeriodModal();
        await view.showDashboardView(activeEnrollmentId);
    } catch (error) { console.error("Error creating period:", error); }
}

async function handleDisciplineFormSubmit(e) {
    e.preventDefault();
    const { activeEnrollmentId, activePeriodId, editingDisciplineId } = getState();
    const schedules = [];
    dom.addDisciplineForm.querySelectorAll('#schedules-container .schedule-field').forEach(field => {
        schedules.push({
            day: field.querySelector('[name="schedule-day"]').value,
            startTime: field.querySelector('[name="schedule-start"]').value,
            endTime: field.querySelector('[name="schedule-end"]').value,
        });
    });
    const payload = {
        name: dom.addDisciplineForm.querySelector('#discipline-name').value,
        teacher: dom.addDisciplineForm.querySelector('#discipline-teacher').value,
        location: dom.addDisciplineForm.querySelector('#discipline-location').value,
        schedules: schedules,
        workload: parseInt(dom.addDisciplineForm.querySelector('#discipline-workload').value),
        hoursPerClass: parseInt(dom.addDisciplineForm.querySelector('#discipline-hours-per-class').value),
    };
    try {
        await firestoreApi.saveDiscipline(payload, { enrollmentId: activeEnrollmentId, periodId: activePeriodId, disciplineId: editingDisciplineId });
        modals.hideDisciplineModal();
        await view.refreshDashboard();
    } catch (error) { console.error("Error saving discipline:", error); }
}

async function handleConfigGradesSubmit(e) {
    e.preventDefault();
    const { currentDisciplineForGrades } = getState();
    if (!currentDisciplineForGrades) return;
    const evaluations = [];
    let totalWeight = 0;
    const rule = dom.configGradesForm.querySelector('#grade-calculation-rule').value;
    dom.configGradesForm.querySelectorAll('#grades-container > div').forEach(field => {
        const name = field.querySelector('[name="name"]').value;
        if (rule === 'weighted') {
            const weight = parseInt(field.querySelector('[name="weight"]').value, 10);
            if (name && weight > 0) { evaluations.push({ name, weight }); totalWeight += weight; }
        } else { if (name) evaluations.push({ name }); }
    });
    if (rule === 'weighted' && totalWeight !== 100 && evaluations.length > 0) return alert("A soma dos pesos deve ser 100.");
    const payload = {
        gradeConfig: { rule, evaluations },
        grades: evaluations.map(ev => ({ name: ev.name, grade: null }))
    };
    try {
        await firestoreApi.saveDiscipline(payload, currentDisciplineForGrades);
        modals.hideConfigGradesModal();
        const updatedDiscipline = await firestoreApi.getDiscipline(currentDisciplineForGrades.enrollmentId, currentDisciplineForGrades.periodId, currentDisciplineForGrades.disciplineId);
        view.updateDisciplineCard({ id: currentDisciplineForGrades.disciplineId, ...updatedDiscipline.data() });
    } catch (error) { console.error("Error saving grade config:", error); }
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
        const updatedDiscipline = await firestoreApi.getDiscipline(currentDisciplineForAbsence.enrollmentId, currentDisciplineForAbsence.periodId, currentDisciplineForAbsence.disciplineId);
        if (updatedDiscipline.exists()) view.updateDisciplineCard({ id: updatedDiscipline.id, ...updatedDiscipline.data() });
    } catch (error) { console.error("Error saving absence:", error); }
}

async function handleConfirmDelete() {
    const item = getState().itemToDelete;
    if (!item) return;
    try {
        if (item.type === 'discipline') {
            await firestoreApi.deleteDiscipline(item.enrollmentId, item.periodId, item.id);
            await view.refreshDashboard();
        } else if (item.type === 'period') {
            await firestoreApi.deletePeriod(item.enrollmentId, item.id);
            await view.showDashboardView(item.enrollmentId);
        } else {
            await firestoreApi.deleteEnrollment(item.id);
            await view.renderEnrollments();
        }
    } catch (error) { console.error("Error deleting:", error); }
    finally { modals.hideConfirmDeleteModal(); }
}

let gradeInputTimeout;
function handleGradeInput(e) {
    if (!e.target.matches('.grade-input')) return;
    clearTimeout(gradeInputTimeout);
    const input = e.target;
    const disciplineId = input.dataset.disciplineId;
    const gradeIndex = parseInt(input.dataset.gradeIndex, 10);
    const grade = input.value === '' ? null : parseFloat(input.value);
    const { activeEnrollmentId, activePeriodId } = getState();
    gradeInputTimeout = setTimeout(async () => {
        try {
            await firestoreApi.saveGrade(grade, gradeIndex, { enrollmentId: activeEnrollmentId, periodId: activePeriodId, disciplineId });
            const disciplineSnap = await firestoreApi.getDiscipline(activeEnrollmentId, activePeriodId, disciplineId);
            if (disciplineSnap.exists()) view.updateDisciplineCard({ id: disciplineSnap.id, ...disciplineSnap.data() });
        } catch (error) { console.error("Error saving grade:", error); }
    }, 800);
}

function handleOutsideClick(e) {
    const openMenu = document.querySelector('.menu-options:not(.hidden)');
    if (openMenu && !openMenu.parentElement.contains(e.target)) openMenu.classList.add('hidden');
}

function toggleCardExpansion(card) {
    const details = card.querySelector('.details-content');
    if (!details) return;
    if (details.style.maxHeight && details.style.maxHeight !== '0px') details.style.maxHeight = '0px';
    else details.style.maxHeight = details.scrollHeight + "px";
}

async function switchPeriod(direction) {
    const { periods, activePeriodIndex } = getState();
    let newIndex = activePeriodIndex;
    if (direction === 'prev' && activePeriodIndex > 0) newIndex--;
    else if (direction === 'next' && activePeriodIndex < periods.length - 1) newIndex++;
    if (newIndex !== activePeriodIndex) {
        setState('activePeriodIndex', newIndex);
        const { activeEnrollmentId } = getState();
        await firestoreApi.updateActivePeriod(activeEnrollmentId, periods[newIndex].id);
        await view.renderPeriodNavigator();
        await view.refreshDashboard();
    }
}

function handleEndPeriod() {
    const { activeEnrollmentId, activePeriodId } = getState();
    if (confirm("Encerrar período? Não será possível editar.")) {
        firestoreApi.updatePeriodStatus(activeEnrollmentId, activePeriodId, 'closed').then(() => view.showDashboardView(activeEnrollmentId));
    }
}

function handleReopenPeriod() {
    const { activeEnrollmentId, activePeriodId } = getState();
    firestoreApi.updatePeriodStatus(activeEnrollmentId, activePeriodId, 'active').then(() => view.showDashboardView(activeEnrollmentId));
}

function handleDeletePeriod() {
    const { activeEnrollmentId, activePeriodId } = getState();
    modals.showConfirmDeleteModal({ type: 'period', id: activePeriodId, enrollmentId: activeEnrollmentId });
}

async function handleViewCalendar() {
    const { activeEnrollmentId, activePeriodId } = getState();
    try {
        const periodSnap = await firestoreApi.getPeriod(activeEnrollmentId, activePeriodId);
        if (periodSnap?.exists()) {
            const p = periodSnap.data();
            if (p?.calendarUrl) modals.showPdfViewerModal(p.calendarUrl);
            else alert("Nenhum calendário para este período.");
        } else alert("Não foi possível encontrar dados do período.");
    } catch (error) { console.error("Error fetching calendar:", error); }
}

async function handleAbsenceHistoryListClick(e) {
    const removeBtn = e.target.closest('.remove-absence-btn');
    if (!removeBtn) return;
    const { currentDisciplineForAbsence } = getState();
    if (confirm("Remover esta falta?")) {
        try {
            await firestoreApi.removeAbsence(removeBtn.dataset.id, currentDisciplineForAbsence);
            const updatedDiscipline = await firestoreApi.getDiscipline(currentDisciplineForAbsence.enrollmentId, currentDisciplineForAbsence.periodId, currentDisciplineForAbsence.disciplineId);
            if (updatedDiscipline.exists()) view.updateDisciplineCard({ id: updatedDiscipline.id, ...updatedDiscipline.data() });
            view.renderAbsenceHistory(currentDisciplineForAbsence.enrollmentId, currentDisciplineForAbsence.periodId, currentDisciplineForAbsence.disciplineId);
        } catch (error) { console.error("Error removing absence:", error); }
    }
}

// --- FUNÇÕES RECOLOCADAS DO MODALS.JS ---
function addGradeField() {
    if (!dom.configGradesForm) return;
    const rule = dom.configGradesForm.querySelector('#grade-calculation-rule').value;
    const gradeField = document.createElement('div');
    gradeField.className = 'flex items-center space-x-2 animate-fade-in';
    const baseInputClasses = "w-full px-3 py-2 bg-bkg text-secondary border border-border rounded-md";
    let fieldsHTML = (rule === 'weighted')
        ? `<input type="text" name="name" placeholder="Nome (ex: P1)" class="${baseInputClasses}"><input type="number" name="weight" min="1" max="100" placeholder="Peso (%)" class="${baseInputClasses} w-32">`
        : `<input type="text" name="name" placeholder="Nome (ex: Prova 1)" class="${baseInputClasses}">`;

    gradeField.innerHTML = `${fieldsHTML}<button type="button" class="remove-field-btn text-danger p-2 rounded-full hover:bg-danger/10"><svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>`;
    gradeField.querySelector('.remove-field-btn').addEventListener('click', () => { gradeField.remove(); updateWeightsSum(); });
    dom.gradesContainer.appendChild(gradeField);
}

function updateWeightsSum() {
    if (!dom.configGradesForm) return;
    const rule = dom.configGradesForm.querySelector('#grade-calculation-rule').value;
    const summaryContainer = dom.configGradesForm.querySelector('#grades-summary');
    if (rule !== 'weighted') { summaryContainer.innerHTML = ''; return; }
    let totalWeight = 0;
    dom.gradesContainer.querySelectorAll('[name="weight"]').forEach(input => totalWeight += Number(input.value) || 0);
    const colorClass = totalWeight === 100 ? 'text-success' : (totalWeight > 100 ? 'text-danger' : 'text-subtle');
    summaryContainer.innerHTML = `<p class="text-sm font-bold ${colorClass}">Soma dos Pesos: ${totalWeight}%</p>`;
}

function renderGradeFields() {
    if (dom.gradesContainer) dom.gradesContainer.innerHTML = '';
    updateWeightsSum();
    addGradeField();
}