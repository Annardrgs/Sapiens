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
import { notify } from './ui/notifications.js';

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
    if (dom.addEventForm) dom.addEventForm.addEventListener('submit', handleEventFormSubmit);
    if (dom.periodOptionsForm) dom.periodOptionsForm.addEventListener('submit', handlePeriodOptionsFormSubmit);
    
    // --- BOTÕES DO MODAL DE CONFIRMAÇÃO GENÉRICO ---
    if (dom.confirmModalConfirmBtn) dom.confirmModalConfirmBtn.addEventListener('click', handleConfirmAction);
    if (dom.confirmModalCancelBtn) dom.confirmModalCancelBtn.addEventListener('click', modals.hideConfirmModal);

    // --- BOTÕES DAS OPÇÕES DO PERÍODO ---
    if (dom.endPeriodBtn) dom.endPeriodBtn.addEventListener('click', handleEndPeriod);
    if (dom.reopenPeriodBtn) dom.reopenPeriodBtn.addEventListener('click', handleReopenPeriod);
    if (dom.deletePeriodBtn) dom.deletePeriodBtn.addEventListener('click', handleDeletePeriod);

    if (dom.backToMainDashboardBtn) dom.backToMainDashboardBtn.addEventListener('click', () => {
        // Lógica para voltar para a tela anterior
        const { activeEnrollmentId } = getState();
        if (activeEnrollmentId) {
            dom.disciplineDashboardView.classList.add('hidden');
            dom.dashboardView.classList.remove('hidden');
        } else {
            view.showEnrollmentsView();
        }
    });

    if (dom.disciplineDashConfigGradesBtn) {
        dom.disciplineDashConfigGradesBtn.addEventListener('click', (e) => {
            const { id, name } = e.currentTarget.dataset;
            modals.showConfigGradesModal(id, name);
        });
    }

    // Modais interativos
    if (dom.addDisciplineModal) {
        dom.addDisciplineModal.querySelector('#add-schedule-btn').addEventListener('click', modals.addScheduleField);
        const palette = dom.addDisciplineModal.querySelector('#discipline-color-palette');
        if (palette) {
            palette.addEventListener('click', e => {
                const swatch = e.target.closest('.color-swatch');
                if (!swatch) return;
                
                // Atualiza a seleção visual
                palette.querySelector('.selected')?.classList.remove('selected');
                swatch.classList.add('selected');
                
                // Atualiza o valor do input escondido
                dom.addDisciplineForm.querySelector('#discipline-color-input').value = swatch.dataset.color;
            });
        }
    }

    dom.addDisciplineModal.addEventListener('change', e => {
        // Verifica se o alvo da mudança foi um input de tempo
        if (e.target.matches('[name="schedule-start"], [name="schedule-end"]')) {
            const scheduleField = e.target.closest('.schedule-field');
            const firstScheduleField = dom.addDisciplineModal.querySelector('.schedule-field');

            // Apenas calcula com base na primeira linha de horário para manter a simplicidade
            if (scheduleField && scheduleField === firstScheduleField) {
                const startTime = scheduleField.querySelector('[name="schedule-start"]').value;
                const endTime = scheduleField.querySelector('[name="schedule-end"]').value;
                
                const hoursInput = dom.addDisciplineForm.querySelector('#discipline-hours-per-class');
                if (hoursInput) {
                    hoursInput.value = calculateHoursDifference(startTime, endTime);
                }
            }
        }
    });

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
    if (dom.cancelEventBtn) dom.cancelEventBtn.addEventListener('click', modals.hideEventModal);
    if (dom.periodOptionsModal) dom.periodOptionsModal.querySelector('[data-action="cancel"]')?.addEventListener('click', modals.hidePeriodOptionsModal);
    if (dom.closePdfViewerBtn) dom.closePdfViewerBtn.addEventListener('click', modals.hidePdfViewerModal);

    const calendarFileInput = document.getElementById('period-calendar-file');
    if (calendarFileInput) calendarFileInput.addEventListener('change', handleCalendarFileChange);

    const removeCalendarBtn = document.getElementById('remove-calendar-btn');
    if (removeCalendarBtn) removeCalendarBtn.addEventListener('click', handleRemoveCalendarFile);
}

async function handleEventFormSubmit(e) {
    e.preventDefault();
    const { activeEnrollmentId, activePeriodId } = getState();
    if (!activeEnrollmentId || !activePeriodId) return;

    const form = dom.addEventForm;
    const payload = {
        title: form.querySelector('#event-title').value,
        date: form.querySelector('#event-date').value,
        color: form.querySelector('#event-color').value,
        createdAt: new Date(),
    };

    try {
        await firestoreApi.saveCalendarEvent(payload, { enrollmentId: activeEnrollmentId, periodId: activePeriodId });
        modals.hideEventModal();
        await view.refreshDashboard(); // Atualiza o dashboard para mostrar o novo evento no calendário
    } catch (error) {
        console.error("Erro ao salvar evento: ", error);
        notify.error("Erro ao salvar evento: ", error);
    }
}

// --- HANDLERS (LÓGICA DOS EVENTOS) ---
async function handleAppContainerClick(e) {
    const target = e.target;
    const actionTarget = target.closest('[data-action]');

    // --- LÓGICA PRINCIPAL BASEADA EM 'data-action' ---
    if (actionTarget) {
        const action = actionTarget.dataset.action;
        let id;

        // Determina o ID de contexto: da disciplina ativa ou do card clicado
        if (!dom.disciplineDashboardView.classList.contains('hidden')) {
            // Se o dashboard da disciplina está visível, o contexto é a disciplina ativa
            id = getState().activeDisciplineId;
        } else {
            // Senão, o contexto é o card que foi clicado
            id = target.closest('[data-id]')?.dataset.id;
        }

        // Lida com todas as ações
        switch (action) {
            // Ações do Dashboard Principal
            case 'edit-enrollment': e.stopPropagation(); modals.showEnrollmentModal(id); break;
            case 'delete-enrollment': e.stopPropagation(); handleDeleteEnrollment(id); break;
            case 'view-discipline-details': view.showDisciplineDashboard(id); break;
            case 'edit-discipline': e.stopPropagation(); modals.showDisciplineModal(id); break;
            case 'delete-discipline': e.stopPropagation(); handleDeleteDiscipline(id); break;

            // Ações do Dashboard da Disciplina
            case 'add-absence': modals.showAbsenceModal(id, actionTarget.dataset.name); break;
            case 'history-absence': {
                const { activeEnrollmentId, activePeriodId } = getState();
                modals.showAbsenceHistoryModal(id, actionTarget.dataset.name);
                view.renderAbsenceHistory(activeEnrollmentId, activePeriodId, id);
                break;
            }
            case 'manage-evaluations': modals.showConfigGradesModal(id, actionTarget.dataset.name); break;
            case 'back-to-main-dashboard': {
                const { activeEnrollmentId } = getState();
                view.showDashboardView(activeEnrollmentId);
                break;
            }
        }
        return;
    }

    // --- LÓGICA SECUNDÁRIA PARA BOTÕES SEM 'data-action' (BOTÕES GERAIS) ---
    const button = target.closest('button');
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

    // --- LÓGICA PARA CLIQUE GERAL NO CARD DE MATRÍCULA ---
    const enrollmentCard = target.closest('#enrollments-list [data-id]');
    if (enrollmentCard) {
        view.showDashboardView(enrollmentCard.dataset.id);
    }
}

async function handleConfirmAction() {
    const onConfirm = getState().onConfirmAction;
    if (typeof onConfirm === 'function') {
        try {
            await onConfirm();
        } catch (error) {
            console.error("Erro ao executar ação de confirmação:", error);
            notify.error(error.message);
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
    } catch (error) { console.error("Authentication Error:", error); notify.error(`Error: ${error.message}`); }
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
    if (!payload.name || !payload.startDate || !payload.endDate) return notify.error("Todos os campos são obrigatórios.");
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
        return notify.error('Por favor, preencha a hora de início e fim para todos os horários.');
    }

    const payload = {
        name: dom.addDisciplineForm.querySelector('#discipline-name').value,
        teacher: dom.addDisciplineForm.querySelector('#discipline-teacher').value,
        campus: dom.addDisciplineForm.querySelector('#discipline-campus').value,
        location: dom.addDisciplineForm.querySelector('#discipline-location').value,
        schedules: schedules, 
        workload: parseInt(dom.addDisciplineForm.querySelector('#discipline-workload').value),
        hoursPerClass: parseInt(dom.addDisciplineForm.querySelector('#discipline-hours-per-class').value),
        color: dom.addDisciplineForm.querySelector('#discipline-color-input').value // MODIFIQUE ESTA LINHA
    };
    try {
        await firestoreApi.saveDiscipline(payload, { enrollmentId: activeEnrollmentId, periodId: activePeriodId, disciplineId: editingDisciplineId });
        modals.hideDisciplineModal();
        await view.refreshDashboard();
    } catch (error) { console.error("Error saving discipline:", error); }
}

/**
 * Calcula a diferença em horas entre um horário inicial e final.
 * @param {string} startTime - Horário no formato "HH:mm".
 * @param {string} endTime - Horário no formato "HH:mm".
 * @returns {number|string} A diferença em horas, ou uma string vazia se inválido.
 */
function calculateHoursDifference(startTime, endTime) {
    if (!startTime || !endTime) {
        return '';
    }
    
    // Cria objetos de data para cálculo, usando uma data base qualquer
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);

    // Se o horário final for antes do inicial, retorna vazio
    if (end <= start) {
        return '';
    }

    const diffMilliseconds = end - start;
    // Converte a diferença de milissegundos para horas
    const diffHours = diffMilliseconds / (1000 * 60 * 60);
    
    // Retorna o valor, permitindo casas decimais (ex: 1.5 para 1h30min)
    return diffHours;
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
    if (rule === 'weighted' && totalWeight !== 100 && evaluations.length > 0) return notify.error("A soma dos pesos deve ser 100.");
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