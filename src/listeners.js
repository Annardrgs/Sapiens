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

// --- INICIALIZAÇÃO DOS LISTENERS ---

function handleCalendarFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const uploadView = document.getElementById('calendar-upload-view');
    const uploadedView = document.getElementById('calendar-uploaded-view');
    const fileNameSpan = document.getElementById('calendar-file-name');
    const viewLink = document.getElementById('view-calendar-link');
    const removeBtn = document.getElementById('remove-calendar-btn');

    fileNameSpan.textContent = file.name;
    viewLink.classList.add('hidden'); // Esconde o link "Ver" para arquivos novos não salvos
    removeBtn.classList.remove('hidden'); // Garante que o botão "Remover" apareça
    uploadView.classList.add('hidden');
    uploadedView.classList.remove('hidden');
}

// Adicione esta nova função também
function handleRemoveCalendarFile() {
    const fileInput = document.getElementById('period-calendar-file');
    fileInput.value = ''; // Limpa o arquivo selecionado

    const uploadView = document.getElementById('calendar-upload-view');
    const uploadedView = document.getElementById('calendar-uploaded-view');
    uploadView.classList.remove('hidden');
    uploadedView.classList.add('hidden');

    // Futuramente, você pode adicionar uma lógica para marcar a remoção de um arquivo já salvo
    setState('calendarMarkedForDeletion', true);
}

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

    // Formulários
    if (dom.addEnrollmentForm) dom.addEnrollmentForm.addEventListener('submit', handleEnrollmentFormSubmit);
    if (dom.addDisciplineForm) dom.addDisciplineForm.addEventListener('submit', handleDisciplineFormSubmit);
    if (dom.addPeriodForm) dom.addPeriodForm.addEventListener('submit', handlePeriodFormSubmit);
    if (dom.addAbsenceForm) dom.addAbsenceForm.addEventListener('submit', handleAbsenceFormSubmit);
    if (dom.configGradesForm) dom.configGradesForm.addEventListener('submit', handleConfigGradesSubmit);
    if (dom.periodOptionsForm) dom.periodOptionsForm.addEventListener('submit', handlePeriodOptionsFormSubmit);
    
    // --- BOTÕES DO MODAL DE CONFIRMAÇÃO GENÉRICO ---
    if (dom.confirmModalConfirmBtn) dom.confirmModalConfirmBtn.addEventListener('click', handleConfirmAction);
    if (dom.confirmModalCancelBtn) dom.confirmModalCancelBtn.addEventListener('click', modals.hideConfirmModal);

    // --- BOTÕES DAS OPÇÕES DO PERÍODO ---
    if (dom.endPeriodBtn) dom.endPeriodBtn.addEventListener('click', handleEndPeriod);
    if (dom.reopenPeriodBtn) dom.reopenPeriodBtn.addEventListener('click', handleReopenPeriod);
    if (dom.deletePeriodBtn) dom.deletePeriodBtn.addEventListener('click', handleDeletePeriod);

    // Modais interativos
    if (dom.addDisciplineModal) dom.addDisciplineModal.querySelector('#add-schedule-btn').addEventListener('click', modals.addScheduleField);
    if (dom.configGradesForm) {
        dom.configGradesForm.querySelector('#grade-calculation-rule').addEventListener('change', modals.renderGradeFields);
        dom.addGradeFieldBtn.addEventListener('click', modals.addGradeField);
        dom.gradesContainer.addEventListener('input', modals.updateWeightsSum);
    }
    if (dom.disciplinesList) dom.disciplinesList.addEventListener('input', handleGradeInput);
    if (dom.absenceHistoryList) dom.absenceHistoryList.addEventListener('click', handleAbsenceHistoryListClick);
    
    // Botões de Cancelar
    if (dom.cancelEnrollmentBtn) dom.cancelEnrollmentBtn.addEventListener('click', modals.hideEnrollmentModal);
    if (dom.cancelDisciplineBtn) dom.cancelDisciplineBtn.addEventListener('click', modals.hideDisciplineModal);
    if (dom.cancelPeriodBtn) dom.cancelPeriodBtn.addEventListener('click', modals.hidePeriodModal);
    if (dom.cancelAbsenceBtn) dom.cancelAbsenceBtn.addEventListener('click', modals.hideAbsenceModal);
    if (dom.closeAbsenceHistoryBtn) dom.closeAbsenceHistoryBtn.addEventListener('click', modals.hideAbsenceHistoryModal);
    if (dom.cancelConfigGradesBtn) dom.cancelConfigGradesBtn.addEventListener('click', modals.hideConfigGradesModal);
    if (dom.periodOptionsModal) dom.periodOptionsModal.querySelector('[data-action="cancel"]')?.addEventListener('click', modals.hidePeriodOptionsModal);
    if (dom.closePdfViewerBtn) dom.closePdfViewerBtn.addEventListener('click', modals.hidePdfViewerModal);

    const calendarFileInput = document.getElementById('period-calendar-file');
    if (calendarFileInput) calendarFileInput.addEventListener('change', handleCalendarFileChange);

    const removeCalendarBtn = document.getElementById('remove-calendar-btn');
    if (removeCalendarBtn) removeCalendarBtn.addEventListener('click', handleRemoveCalendarFile);
}


// --- HANDLERS (LÓGICA DOS EVENTOS) ---

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
            case 'delete-enrollment': handleDeleteEnrollment(id); break;
            case 'toggle-menu': e.stopPropagation(); document.getElementById(`menu-${id}`)?.classList.toggle('hidden'); break;
            case 'edit-discipline': modals.showDisciplineModal(id); break;
            case 'delete-discipline': handleDeleteDiscipline(id); break;
            case 'add-absence': modals.showAbsenceModal(id, actionTarget.dataset.name); break;
            case 'history-absence': { const { activeEnrollmentId, activePeriodId } = getState(); modals.showAbsenceHistoryModal(id, actionTarget.dataset.name); view.renderAbsenceHistory(activeEnrollmentId, activePeriodId, id); break; }
            case 'config-grades': modals.showConfigGradesModal(id, actionTarget.dataset.name); break;
        }
        return;
    }

    const enrollmentCard = target.closest('#enrollments-list [data-id]');
    if (enrollmentCard) { view.showDashboardView(enrollmentCard.dataset.id); return; }
    
    const disciplineCard = target.closest('#disciplines-list [data-id]');
    if (disciplineCard && target.closest('.card-header')) { toggleCardExpansion(disciplineCard); return; }
}

async function handleConfirmAction() {
    const onConfirm = getState().onConfirmAction;
    if (typeof onConfirm === 'function') {
        try {
            await onConfirm();
        } catch (error) {
            console.error("Erro ao executar ação de confirmação:", error);
            // Poderia mostrar um alerta de erro para o usuário aqui
        }
    }
    modals.hideConfirmModal();
}

// --- FUNÇÕES DE AÇÃO ESPECÍFICAS (CHAMAM O MODAL) ---

function handleDeleteEnrollment(id) {
    modals.showConfirmModal({
        title: 'Excluir Matrícula',
        message: 'Esta ação removerá todos os períodos e disciplinas associados. Não pode ser desfeita.',
        confirmText: 'Excluir',
        confirmClass: 'bg-danger',
        onConfirm: async () => {
            await firestoreApi.deleteEnrollment(id);
            await view.renderEnrollments();
        }
    });
}

function handleDeleteDiscipline(id) {
    const { activeEnrollmentId, activePeriodId } = getState();
    modals.showConfirmModal({
        title: 'Excluir Disciplina',
        message: 'Tem certeza que deseja excluir esta disciplina?',
        confirmText: 'Excluir',
        confirmClass: 'bg-danger',
        onConfirm: async () => {
            await firestoreApi.deleteDiscipline(activeEnrollmentId, activePeriodId, id);
            await view.refreshDashboard();
        }
    });
}

function handleDeletePeriod() {
    const { activeEnrollmentId, activePeriodId } = getState();
    modals.showConfirmModal({
        title: 'Excluir Período',
        message: 'Excluir este período removerá todas as suas disciplinas. Esta ação não pode ser desfeita.',
        confirmText: 'Excluir',
        confirmClass: 'bg-danger',
        onConfirm: async () => {
            await firestoreApi.deletePeriod(activeEnrollmentId, activePeriodId);
            modals.hidePeriodOptionsModal();
            await view.showDashboardView(activeEnrollmentId);
        }
    });
}

function handleEndPeriod() {
    const { activeEnrollmentId, activePeriodId } = getState();
    modals.showConfirmModal({
        title: 'Encerrar Período',
        message: 'Tem certeza? Após encerrado, o período não poderá mais ser editado.',
        confirmText: 'Encerrar',
        confirmClass: 'bg-warning', // Usando a classe de aviso
        onConfirm: async () => {
            await firestoreApi.updatePeriodStatus(activeEnrollmentId, activePeriodId, 'closed');
            modals.hidePeriodOptionsModal();
            await view.showDashboardView(activeEnrollmentId);
        }
    });
}

async function handleReopenPeriod() {
    const { activeEnrollmentId, activePeriodId } = getState();
    try {
        await firestoreApi.updatePeriodStatus(activeEnrollmentId, activePeriodId, 'active');
        modals.hidePeriodOptionsModal();
        await view.showDashboardView(activeEnrollmentId);
    } catch(error) {
        console.error("Erro ao reabrir o período:", error);
    }
}

// --- OUTROS HANDLERS (EXISTENTES) ---

async function handleAuthFormSubmit(e) {
    e.preventDefault();
    try {
        if (getState().authMode === 'login') await authApi.signIn(dom.authEmailInput.value, dom.authPasswordInput.value);
        else await authApi.signUp(dom.authEmailInput.value, dom.authPasswordInput.value);
    } catch (error) { console.error("Authentication Error:", error); alert(`Error: ${error.message}`); }
}

async function handleEnrollmentFormSubmit(e) {
    e.preventDefault();
    const selectedModality = dom.addEnrollmentForm.querySelector('input[name="enrollment-modality"]:checked').value;

    const payload = {
        course: dom.addEnrollmentForm.querySelector('#enrollment-course').value,
        institution: dom.addEnrollmentForm.querySelector('#enrollment-institution').value,
        currentPeriod: dom.addEnrollmentForm.querySelector('#enrollment-period').value,
        passingGrade: parseFloat(dom.addEnrollmentForm.querySelector('#enrollment-passing-grade').value) || 7.0,
        modality: selectedModality,
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
    const scheduleElements = dom.addDisciplineForm.querySelectorAll('#schedules-container .schedule-field');
    let hasInvalidTime = false;
    scheduleElements.forEach(field => {
        const startTime = field.querySelector('[name="schedule-start"]').value;
        const endTime = field.querySelector('[name="schedule-end"]').value;

        if (!startTime || !endTime) {
            hasInvalidTime = true;
        }

        schedules.push({ day: field.querySelector('[name="schedule-day"]').value, startTime, endTime });
    });

    if (hasInvalidTime) {
        return alert('Por favor, preencha a hora de início e fim para todos os horários.');
    }

    const payload = {
        name: dom.addDisciplineForm.querySelector('#discipline-name').value,
        teacher: dom.addDisciplineForm.querySelector('#discipline-teacher').value,
        campus: dom.addDisciplineForm.querySelector('#discipline-campus').value,
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
        if(submitButton) { submitButton.textContent = 'Salvando...'; submitButton.disabled = true; }
        if (file) {
            payload.calendarUrl = await firestoreApi.uploadPeriodCalendar(file);
        }
        await firestoreApi.updatePeriodDetails(activeEnrollmentId, activePeriodId, payload);
        modals.hidePeriodOptionsModal();
        await view.showDashboardView(activeEnrollmentId);
    } catch (error) {
        console.error("Erro ao salvar opções do período:", error);
    } finally {
        if(submitButton) { submitButton.textContent = 'Salvar'; submitButton.disabled = false; }
    }
}

async function handleAbsenceHistoryListClick(e) {
    const removeBtn = e.target.closest('.remove-absence-btn');
    if (!removeBtn) return;
    
    const { currentDisciplineForAbsence } = getState();

    modals.showConfirmModal({
        title: 'Remover Falta',
        message: 'Tem certeza que deseja remover esta falta do histórico?',
        confirmText: 'Remover',
        confirmClass: 'bg-danger',
        onConfirm: async () => {
            try {
                await firestoreApi.removeAbsence(removeBtn.dataset.id, currentDisciplineForAbsence);
                const updatedDiscipline = await firestoreApi.getDiscipline(currentDisciplineForAbsence.enrollmentId, currentDisciplineForAbsence.periodId, currentDisciplineForAbsence.disciplineId);
                if (updatedDiscipline.exists()) view.updateDisciplineCard({ id: updatedDiscipline.id, ...updatedDiscipline.data() });
                view.renderAbsenceHistory(currentDisciplineForAbsence.enrollmentId, currentDisciplineForAbsence.periodId, currentDisciplineForAbsence.disciplineId);
            } catch (error) { 
                console.error("Error removing absence:", error); 
            }
        }
    });
}