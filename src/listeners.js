/**
 * @file Módulo para inicializar e gerenciar todos os event listeners da aplicação.
 */

import { dom } from './ui/dom.js';
import { setState, getState } from './store/state.js';
import * as authApi from './api/auth.js';
import * as firestoreApi from './api/firestore.js';
import * as view from './ui/view.js';
import * as modals from './ui/modals.js';
import * as pomodoro from './ui/pomodoro.js';
import { toggleTheme } from './ui/theme.js';
import { notify } from './ui/notifications.js';
import { calculateAverage } from './components/card.js';
import { navigate } from './main.js';

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

async function handleDeleteEvent() {
    const eventId = dom.addEventForm.querySelector('#event-id').value;
    if (!eventId) return;

    modals.showConfirmModal({
        title: 'Excluir Evento',
        message: 'Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.',
        confirmText: 'Excluir',
        onConfirm: async () => {
            const { activeEnrollmentId, activePeriodId } = getState();
            try {
                await firestoreApi.deleteCalendarEvent(eventId, { enrollmentId: activeEnrollmentId, periodId: activePeriodId });
                modals.hideEventModal();
                await view.refreshDashboard();
                notify.success('Evento excluído!');
                view.checkAndRenderNotifications();
            } catch (error) {
                console.error("Erro ao excluir evento:", error);
                notify.error('Falha ao excluir o evento.');
            }
        }
    });
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
    document.body.addEventListener('click', handleAppContainerClick);
    if (dom.logoutBtn) dom.logoutBtn.addEventListener('click', authApi.logOut);
    if (dom.themeToggleBtn) dom.themeToggleBtn.addEventListener('click', toggleTheme);
    document.addEventListener('click', handleOutsideClick, true);

    if (dom.exportPdfBtn) dom.exportPdfBtn.addEventListener('click', handleExportPdf);

    // Formulários
    if (dom.addEnrollmentForm) dom.addEnrollmentForm.addEventListener('submit', handleEnrollmentFormSubmit);
    if (dom.addDisciplineForm) dom.addDisciplineForm.addEventListener('submit', handleDisciplineFormSubmit);
    if (dom.addPeriodForm) dom.addPeriodForm.addEventListener('submit', handlePeriodFormSubmit);
    if (dom.addAbsenceForm) dom.addAbsenceForm.addEventListener('submit', handleAbsenceFormSubmit);
    if (dom.configGradesForm) dom.configGradesForm.addEventListener('submit', handleConfigGradesSubmit);
    if (dom.addTodoForm) dom.addTodoForm.addEventListener('submit', handleTodoFormSubmit);
    
    // Pomodoro Timer
    if (dom.startPomodoroBtn) dom.startPomodoroBtn.addEventListener('click', () => modals.showPomodoroSettingsModal());
    if (dom.pausePomodoroBtn) dom.pausePomodoroBtn.addEventListener('click', pomodoro.togglePause);
    if (dom.stopPomodoroBtn) dom.stopPomodoroBtn.addEventListener('click', pomodoro.stopTimer);
    if (dom.closeStudyHistoryModalBtn) dom.closeStudyHistoryModalBtn.addEventListener('click', pomodoro.hideHistoryModal);
    if (dom.pomodoroSettingsForm) dom.pomodoroSettingsForm.addEventListener('submit', handlePomodoroSettingsSubmit);
    if (dom.cancelPomodoroSettingsBtn) dom.cancelPomodoroSettingsBtn.addEventListener('click', modals.hidePomodoroSettingsModal);
    if (dom.studyHistoryList) dom.studyHistoryList.addEventListener('click', handleDeleteStudySession);
    if (dom.floatingPausePomodoroBtn) dom.floatingPausePomodoroBtn.addEventListener('click', pomodoro.togglePause);
    if (dom.floatingStopPomodoroBtn) dom.floatingStopPomodoroBtn.addEventListener('click', pomodoro.stopTimer);

    const deleteBtn = dom.addEventModal.querySelector('#delete-event-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleDeleteEvent);
    }
    if (dom.addEventForm) {
        dom.addEventForm.addEventListener('submit', handleEventFormSubmit);
        const disciplineSelect = dom.addEventForm.querySelector('#event-discipline');
    if (disciplineSelect) {
        disciplineSelect.addEventListener('change', e => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const color = selectedOption.dataset.color;
            
            if (e.target.value !== 'none' && color) {
                e.target.style.borderLeft = `5px solid ${color}`;
            } else {
                e.target.style.borderLeft = 'none';
            }
        });
    }
    }
    const palette = dom.addEventForm.querySelector('#event-color-palette');
    if (palette) {
        palette.addEventListener('click', e => {
            const swatch = e.target.closest('.color-swatch');
            if (!swatch) return;
            palette.querySelector('.selected')?.classList.remove('selected');
            swatch.classList.add('selected');
            dom.addEventForm.querySelector('#event-color-input').value = swatch.dataset.color;
        });
    }

    if (dom.notificationBellBtn) {
        dom.notificationBellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dom.notificationPanel.classList.toggle('hidden');
        });
    }
    
    if (dom.periodOptionsForm) dom.periodOptionsForm.addEventListener('submit', handlePeriodOptionsFormSubmit);
    
    if (dom.confirmModalConfirmBtn) dom.confirmModalConfirmBtn.addEventListener('click', handleConfirmAction);
    if (dom.confirmModalCancelBtn) dom.confirmModalCancelBtn.addEventListener('click', modals.hideConfirmModal);

    if (dom.endPeriodBtn) dom.endPeriodBtn.addEventListener('click', handleEndPeriod);
    if (dom.reopenPeriodBtn) dom.reopenPeriodBtn.addEventListener('click', handleReopenPeriod);
    if (dom.deletePeriodBtn) dom.deletePeriodBtn.addEventListener('click', handleDeletePeriod);

    if (dom.backToMainDashboardBtn) dom.backToMainDashboardBtn.addEventListener('click', () => {
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
            const { id } = e.currentTarget.dataset;
            modals.showConfigGradesModal(id);
        });
    }

    const agendaToggle = document.getElementById('agenda-view-toggle');
    if (agendaToggle) {
        agendaToggle.addEventListener('click', e => {
            const button = e.target.closest('.agenda-view-btn');
            if (!button) return;

            const currentActive = agendaToggle.querySelector('.active');
            if (currentActive) {
                currentActive.classList.remove('active');
            }
            button.classList.add('active');

            const viewType = button.dataset.view;

            if (viewType === 'classes') {
                const { disciplines } = getState();
                view.renderWeeklyClasses(disciplines);
            } else {
                view.renderAllEvents();
            }
        });
    }

    if (dom.addDisciplineModal) {
        dom.addDisciplineModal.querySelector('#add-schedule-btn').addEventListener('click', modals.addScheduleField);
        const palette = dom.addDisciplineModal.querySelector('#discipline-color-palette');
        if (palette) {
            palette.addEventListener('click', e => {
                const swatch = e.target.closest('.color-swatch');
                if (!swatch) return;
                
                palette.querySelector('.selected')?.classList.remove('selected');
                swatch.classList.add('selected');
                
                dom.addDisciplineForm.querySelector('#discipline-color-input').value = swatch.dataset.color;
            });
        }
    }

    dom.addDisciplineModal.addEventListener('change', e => {
        if (e.target.matches('[name="schedule-start"], [name="schedule-end"]')) {
            const scheduleField = e.target.closest('.schedule-field');
            const firstScheduleField = dom.addDisciplineModal.querySelector('.schedule-field');

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

    if (dom.addCurriculumSubjectForm) dom.addCurriculumSubjectForm.addEventListener('submit', handleCurriculumSubjectFormSubmit);
    if (dom.cancelCurriculumSubjectBtn) dom.cancelCurriculumSubjectBtn.addEventListener('click', modals.hideCurriculumSubjectModal);
    if (dom.markAsCompletedForm) dom.markAsCompletedForm.addEventListener('submit', handleMarkAsCompletedSubmit);
    if (dom.cancelMarkAsCompletedBtn) dom.cancelMarkAsCompletedBtn.addEventListener('click', modals.hideMarkAsCompletedModal);
    if (dom.cancelDocumentBtn) dom.cancelDocumentBtn.addEventListener('click', modals.hideDocumentModal);
    if (dom.addDocumentForm) dom.addDocumentForm.addEventListener('submit', handleDocumentFormSubmit);

    // Listener para mostrar/esconder o campo de código equivalente
    const isEquivalentCheckbox = document.getElementById('completed-is-equivalent');
    if (isEquivalentCheckbox) {
        isEquivalentCheckbox.addEventListener('change', (e) => {
            dom.equivalentCodeContainer.classList.toggle('hidden', !e.target.checked);
        });
    }

    if (dom.closeCurriculumSubjectDetailsBtn) dom.closeCurriculumSubjectDetailsBtn.addEventListener('click', modals.hideCurriculumSubjectDetailsModal);
}

async function handleEventFormSubmit(e) {
    e.preventDefault();
    const { activeEnrollmentId, activePeriodId } = getState();
    const form = dom.addEventForm;
    const eventId = form.querySelector('#event-id').value;

    const payload = {
        title: form.querySelector('#event-title').value,
        date: form.querySelector('#event-date').value,
        category: form.querySelector('#event-category').value,
        relatedDisciplineId: form.querySelector('#event-discipline').value,
        reminder: form.querySelector('#event-reminder').value,
        color: form.querySelector('#event-color-input').value,
    };

    try {
        if (eventId) {
            await firestoreApi.updateCalendarEvent(eventId, payload, { enrollmentId: activeEnrollmentId, periodId: activePeriodId });
        } else {
            await firestoreApi.saveCalendarEvent(payload, { enrollmentId: activeEnrollmentId, periodId: activePeriodId });
        }
        modals.hideEventModal();
        view.refreshDashboard();
        notify.success("Evento salvo com sucesso!")
        view.checkAndRenderNotifications();
    } catch (error) {
        console.error("Erro ao salvar evento:", error);
        notify.error("Erro ao salvar evento!");
    }
}

// --- HANDLERS (LÓGICA DOS EVENTOS) ---
async function handleAppContainerClick(e) {
    const target = e.target;
    const actionTarget = target.closest('[data-action]');

    if (actionTarget) {
        const action = actionTarget.dataset.action;
        const id = actionTarget.dataset.id;
        let { activeEnrollmentId } = getState(); // Use 'let' para poder modificar
        
        e.stopPropagation();

        switch (action) {
            // ... (todos os seus outros cases, como 'toggle-mute', etc.)

            case 'toggle-dropdown':
                modals.toggleDropdown(actionTarget.closest('[data-dropdown-container]'));
                break;
            case 'select-dropdown-item':
                modals.selectDropdownItem(actionTarget);
                // Se o dropdown for um filtro, atualiza a lista de documentos
                if (actionTarget.closest('[data-filter-key]')) {
                    view.renderDocumentsList(activeEnrollmentId);
                }
                break;
            
            // ... (todos os seus outros cases)
        }
        return;
    }

    const button = target.closest('button');
    if (button && button.id) {
        switch (button.id) {
            case 'add-enrollment-btn': modals.showEnrollmentModal(); return;
            case 'add-discipline-btn': modals.showDisciplineModal(); return;
            case 'add-document-btn': modals.showDocumentModal(); return; // Botão de adicionar documento
            case 'new-period-btn': modals.showPeriodModal(); return;
            case 'manage-period-btn': modals.showPeriodOptionsModal(); return;
            case 'back-to-enrollments-btn': navigate('/'); return;
            case 'prev-period-btn': switchPeriod('prev'); return;
            case 'next-period-btn': switchPeriod('next'); return;
        }
    }

    // Adiciona o listener para a pesquisa de documentos
    const searchInput = target.closest('#document-search-input');
    if (searchInput) {
        // Usamos 'input' para pesquisar enquanto o usuário digita
        searchInput.addEventListener('input', () => {
            const { activeEnrollmentId } = getState();
            view.renderDocumentsList(activeEnrollmentId);
        });
    }

    const enrollmentCard = target.closest('#enrollments-list [data-id]');
    if (enrollmentCard) {
        navigate(`/dashboard?enrollmentId=${enrollmentCard.dataset.id}`);
    }
}


async function handleConfirmAction() {
    const onConfirm = getState().onConfirmAction;
    if (typeof onConfirm === 'function') {
        try {
            await onConfirm();
        } catch (error) {
            console.error("Erro ao executar ação de confirmação:", error);
            notify.error("Erro ao executar ação de confirmação:", error.message);
        }
    }
    modals.hideConfirmModal();
}

function handleDeleteEnrollment(id) {
    modals.showConfirmModal({
        title: 'Excluir Matrícula',
        message: 'Esta ação removerá todos os períodos e disciplinas associados. Não pode ser desfeita.',
        confirmText: 'Excluir',
        confirmClass: 'bg-danger',
        onConfirm: async () => {
            await firestoreApi.deleteEnrollment(id);
            await view.renderEnrollments();
            notify.success("Matrícula excluída.");
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
            notify.success("Disciplina excluída.");
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
            notify.success("Período excluído.");
        }
    });
}

function handleEndPeriod() {
    const { activeEnrollmentId, activePeriodId } = getState();
    modals.showConfirmModal({
        title: 'Encerrar Período',
        message: 'Tem certeza? Após encerrado, o período não poderá mais ser editado.',
        confirmText: 'Encerrar',
        confirmClass: 'bg-warning',
        onConfirm: async () => {
            await firestoreApi.updatePeriodStatus(activeEnrollmentId, activePeriodId, 'closed');
            modals.hidePeriodOptionsModal();
            await view.showDashboardView(activeEnrollmentId);
            notify.info("Período encerrado.");
        }
    });
}

async function handleReopenPeriod() {
    const { activeEnrollmentId, activePeriodId } = getState();
    try {
        await firestoreApi.updatePeriodStatus(activeEnrollmentId, activePeriodId, 'active');
        modals.hidePeriodOptionsModal();
        await view.showDashboardView(activeEnrollmentId);
        notify.success("Período reaberto.");
    } catch(error) {
        console.error("Erro ao reabrir o período:", error);
        notify.error("Falha ao reabrir o período.");
    }
}

async function handleAuthFormSubmit(e) {
    e.preventDefault();
    try {
        if (getState().authMode === 'login') await authApi.signIn(dom.authEmailInput.value, dom.authPasswordInput.value);
        else await authApi.signUp(dom.authEmailInput.value, dom.authPasswordInput.value);
    } catch (error) { console.error("Authentication Error:", error); notify.error(`Erro: ${error.message}`); }
}

async function handleEnrollmentFormSubmit(e) {
    e.preventDefault();
    const selectedModality = dom.addEnrollmentForm.querySelector('input[name="enrollment-modality"]:checked').value;

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const semester = month <= 6 ? 1 : 2;
    const defaultPeriodName = `${year}.${semester}`;

    const payload = {
        course: dom.addEnrollmentForm.querySelector('#enrollment-course').value,
        institution: dom.addEnrollmentForm.querySelector('#enrollment-institution').value,
        currentPeriod: defaultPeriodName,
        passingGrade: parseFloat(dom.addEnrollmentForm.querySelector('#enrollment-passing-grade').value) || 7.0,
        modality: selectedModality,
    };
    const { editingEnrollmentId } = getState();
    try {
        await firestoreApi.saveEnrollment(payload, editingEnrollmentId);
        modals.hideEnrollmentModal();
        await view.renderEnrollments();
        notify.success("Matrícula salva com sucesso!");
    } catch (error) {
        console.error("Erro ao salvar matrícula:", error);
        notify.error("Falha ao salvar a matrícula.");
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
        notify.success("Período criado com sucesso!");
        
        if (getState().returnToCompleteSubjectModal) {
            setState('returnToCompleteSubjectModal', false);
            await view.showDashboardView(activeEnrollmentId); 
            modals.showMarkAsCompletedModal(getState().subjectDataForReturn);
        } else {
            await view.showDashboardView(activeEnrollmentId);
        }

    } catch (error) { 
        console.error("Error creating period:", error); 
        notify.error("Falha ao criar o período.");
    }
}

async function handleDisciplineFormSubmit(e) {
    e.preventDefault();
    const { activeEnrollmentId, activePeriodId, editingDisciplineId } = getState();
    const form = dom.addDisciplineForm;

    if (!activePeriodId) {
        return notify.error("Período ativo não identificado. Por favor, recarregue a página e tente novamente.");
    }

    const code = form.querySelector('#discipline-code').value.trim();
    if (code) {
        const isUnique = await firestoreApi.isDisciplineCodeUnique(activeEnrollmentId, code, editingDisciplineId);
        if (!isUnique) {
            return notify.error('O código da disciplina já está em uso nesta matrícula.');
        }
    }
    
    const enrollmentSnap = await firestoreApi.getEnrollment(activeEnrollmentId);
    const isEAD = enrollmentSnap.exists() && enrollmentSnap.data().modality === 'EAD';

    const schedules = [];
    if (!isEAD) {
        const scheduleElements = form.querySelectorAll('#schedules-container .schedule-field');
        if (scheduleElements.length === 0) {
            return notify.error('Adicione pelo menos um horário para a disciplina.');
        }
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
            return notify.error('Preencha a hora de início e fim para todos os horários.');
        }
    }

    const payload = {
        name: form.querySelector('#discipline-name').value,
        code: code,
        teacher: form.querySelector('#discipline-teacher').value,
        campus: form.querySelector('#discipline-campus').value,
        location: form.querySelector('#discipline-location').value,
        schedules: schedules,
        workload: isEAD ? (parseInt(form.querySelector('#discipline-workload').value) || null) : parseInt(form.querySelector('#discipline-workload').value),
        hoursPerClass: isEAD ? (parseInt(form.querySelector('#discipline-hours-per-class').value) || null) : parseInt(form.querySelector('#discipline-hours-per-class').value),
        color: form.querySelector('#discipline-color-input').value
    };

    if (!isEAD && (!payload.workload || !payload.hoursPerClass)) {
        return notify.error('Carga Horária e Horas por Aula são obrigatórios para disciplinas presenciais.');
    }

    try {
        await firestoreApi.saveDiscipline(payload, { enrollmentId: activeEnrollmentId, periodId: activePeriodId, disciplineId: editingDisciplineId });
        notify.success(`Disciplina "${payload.name}" salva com sucesso!`);
        modals.hideDisciplineModal();
        await view.refreshDashboard();
    } catch (error) { 
        console.error("Erro ao salvar disciplina:", error);
        notify.error('Falha ao salvar a disciplina. Verifique os dados e tente novamente.');
    }
}

function calculateHoursDifference(startTime, endTime) {
    if (!startTime || !endTime) {
        return '';
    }
    
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);

    if (end <= start) {
        return '';
    }

    const diffMilliseconds = end - start;
    const diffHours = diffMilliseconds / (1000 * 60 * 60);
    
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
        await view.showDisciplineDashboard(currentDisciplineForGrades);
        notify.success("Configuração de notas salva.");
    } catch (error) { 
        console.error("Error saving grade config:", error); 
        notify.error("Falha ao salvar configuração.");
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
        notify.success("Falta registrada.");

        if (!dom.disciplineDashboardView.classList.contains('hidden')) {
            await view.showDisciplineDashboard(currentDisciplineForAbsence);
        }
        const updatedDiscipline = await firestoreApi.getDiscipline(currentDisciplineForAbsence.enrollmentId, currentDisciplineForAbsence.periodId, currentDisciplineForAbsence.disciplineId);
        if (updatedDiscipline.exists()) {
            view.updateDisciplineCard({ id: updatedDiscipline.id, ...updatedDiscipline.data() });
        }

    } catch (error) { 
        console.error("Error saving absence:", error); 
        notify.error("Falha ao registrar falta.");
    }
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
    if (dom.notificationPanel && !dom.notificationPanel.classList.contains('hidden')) {
        if (!dom.notificationPanel.parentElement.contains(e.target)) {
            dom.notificationPanel.classList.add('hidden');
        }
    }
    document.querySelectorAll('[data-dropdown-panel]:not(.hidden)').forEach(panel => {
        if (!panel.closest('[data-dropdown-container]').contains(e.target)) {
            panel.classList.add('hidden');
        }
    });
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
        notify.success("Opções do período salvas.");
    } catch (error) {
        console.error("Erro ao salvar opções do período:", error);
        notify.error("Falha ao salvar opções.");
    } finally {
        if(submitButton) { submitButton.textContent = 'Salvar Alterações'; submitButton.disabled = false; }
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
                if (updatedDiscipline.exists()) {
                    view.updateDisciplineCard({ id: updatedDiscipline.id, ...updatedDiscipline.data() });
                }

                view.renderAbsenceHistory(currentDisciplineForAbsence.enrollmentId, currentDisciplineForAbsence.periodId, currentDisciplineForAbsence.disciplineId);
                
                if (!dom.disciplineDashboardView.classList.contains('hidden')) {
                    await view.showDisciplineDashboard(currentDisciplineForAbsence);
                }

                notify.success("Falta removida.");
            } catch (error) { 
                console.error("Error removing absence:", error);
                notify.error("Falha ao remover falta.");
            }
        }
    });
}

async function handleTodoFormSubmit(e) {
    e.preventDefault();
    if (!dom.newTodoInput) return;

    const taskText = dom.newTodoInput.value.trim();
    if (!taskText) return;

    try {
        const docRef = await firestoreApi.addTodo(taskText);
        const placeholder = dom.todoItemsList.querySelector('p');
        if (placeholder) {
            placeholder.remove();
        }
        const newTodo = {
            id: docRef.id,
            text: taskText,
            completed: false
        };
        const todoElement = view.createTodoItemElement(newTodo);
        dom.todoItemsList.appendChild(todoElement);
        dom.addTodoForm.reset();
    } catch (error) {
        console.error("Erro ao adicionar tarefa:", error);
        notify.error("Não foi possível adicionar a tarefa.");
    }
}

async function handleExportPdf() {
    const { jsPDF } = window.jspdf;
    const { activeEnrollmentId, periods } = getState();
    const enrollmentSnap = await firestoreApi.getEnrollment(activeEnrollmentId);
    if (!enrollmentSnap.exists()) return notify.error("Matrícula não encontrada.");

    notify.info('Gerando PDF, por favor aguarde...');

    try {
        const enrollmentData = enrollmentSnap.data();
        const doc = new jsPDF({ orientation: 'p', unit: 'px', format: 'a4' });
        
        const styles = getComputedStyle(document.body);
        const theme = {
            bkg: styles.getPropertyValue('--color-bkg').trim(),
            surface: styles.getPropertyValue('--color-surface').trim(),
            text: styles.getPropertyValue('--color-secondary').trim(),
            subtle: styles.getPropertyValue('--color-subtle').trim(),
            primary: styles.getPropertyValue('--color-primary').trim(),
            border: styles.getPropertyValue('--color-border').trim(),
        };

        const allPeriodsData = [];
        for (const period of periods) {
            const disciplines = await firestoreApi.getDisciplines(activeEnrollmentId, period.id);
            allPeriodsData.push({ period, disciplines });
        }

        let totalWeightedGradeSum = 0;
        let totalWorkloadSum = 0;
        const passingGrade = enrollmentData.passingGrade || 7.0;

        allPeriodsData.forEach(({ disciplines }) => {
            disciplines.forEach(discipline => {
                const averageGradeString = calculateAverage(discipline);
                const averageGrade = parseFloat(averageGradeString);
                const workload = parseInt(discipline.workload);
                const allGradesFilled = discipline.grades && discipline.grades.length > 0 && discipline.grades.every(g => g.grade !== null);
                if (!isNaN(averageGrade) && allGradesFilled && workload > 0) {
                    totalWeightedGradeSum += averageGrade * workload;
                    totalWorkloadSum += workload;
                }
            });
        });
        const overallCR = totalWorkloadSum > 0 ? (totalWeightedGradeSum / totalWorkloadSum).toFixed(2) : 'N/A';

        let finalY = 40;
        const pageMargin = 40;
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFillColor(theme.bkg);
        doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');

        doc.setFontSize(22).setFont('helvetica', 'bold').setTextColor(theme.text);
        doc.text('Boletim Acadêmico', pageWidth / 2, finalY, { align: 'center' });
        finalY += 20;
        doc.setFontSize(12).setFont('helvetica', 'normal').setTextColor(theme.subtle);
        doc.text(`${enrollmentData.course} - ${enrollmentData.institution}`, pageWidth / 2, finalY, { align: 'center' });
        finalY += 50;
        
        doc.setFillColor(theme.surface);
        doc.setDrawColor(theme.border);
        doc.roundedRect(pageMargin, finalY - 25, pageWidth - (pageMargin * 2), 65, 8, 8, 'FD');
        doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(theme.subtle);
        doc.text('Coeficiente de Rendimento (CR) Geral', pageMargin + 15, finalY);
        doc.setFontSize(36).setFont('helvetica', 'bold').setTextColor(theme.primary);
        doc.text(overallCR, pageMargin + 15, finalY + 30);
        finalY += 80;

        for (let i = allPeriodsData.length - 1; i >= 0; i--) {
            const { period, disciplines } = allPeriodsData[i];
            if (disciplines.length === 0) continue;

            doc.setFontSize(18).setFont('helvetica', 'bold').setTextColor(theme.text);
            doc.text(`Período: ${period.name}`, pageMargin, finalY);
            finalY += 20;

            const head = [['Disciplina', 'Média Final', 'Status']];
            const body = disciplines.map(discipline => {
                const averageGradeString = calculateAverage(discipline);
                const averageGrade = parseFloat(averageGradeString);
                let statusText = 'Em Andamento';
                const allGradesFilled = discipline.grades && discipline.grades.length > 0 && discipline.grades.every(g => g.grade !== null);
                if (!isNaN(averageGrade) && allGradesFilled) {
                    statusText = averageGrade >= passingGrade ? 'Aprovado' : 'Reprovado';
                }
                return [discipline.name, averageGradeString, statusText];
            });

            doc.autoTable({
                head,
                body,
                startY: finalY,
                theme: 'grid',
                styles: { font: 'helvetica', fillColor: theme.surface, textColor: theme.text, lineColor: theme.border },
                headStyles: { fillColor: theme.bkg, textColor: theme.subtle, fontStyle: 'bold' },
                didParseCell: (data) => {
                    if (data.column.dataKey === 2) { // Coluna "Status"
                        if (data.cell.raw === 'Aprovado') data.cell.styles.textColor = '#34d399';
                        if (data.cell.raw === 'Reprovado') data.cell.styles.textColor = '#f87171';
                        if (data.cell.raw === 'Em Andamento') data.cell.styles.textColor = '#f59e0b';
                    }
                }
            });
            
            finalY = doc.lastAutoTable.finalY + 40;
        }

        const fileName = `Boletim - ${enrollmentData.course}.pdf`;
        doc.save(fileName);

    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        notify.error("Não foi possível gerar o PDF.");
    }
}

async function handleCurriculumSubjectFormSubmit(e) {
    e.preventDefault();
    const { activeEnrollmentId, editingCurriculumSubjectId } = getState();
    const form = dom.addCurriculumSubjectForm;

    const payload = {
        name: form.querySelector('#curriculum-subject-name').value,
        code: form.querySelector('#curriculum-subject-code').value,
        period: parseInt(form.querySelector('#curriculum-subject-period').value),
    };

    try {
        await firestoreApi.saveCurriculumSubject(payload, {
            enrollmentId: activeEnrollmentId,
            subjectId: editingCurriculumSubjectId
        });
        modals.hideCurriculumSubjectModal();
        await view.renderChecklistContent();
        notify.success('Disciplina adicionada à grade!');
    } catch (error) {
        console.error("Erro ao salvar disciplina na grade:", error);
        notify.error("Não foi possível salvar a disciplina.");
    }
}

async function handleMarkAsCompletedSubmit(e) {
    e.preventDefault();
    const { subjectToComplete, activeEnrollmentId } = getState();
    const form = dom.markAsCompletedForm;

    const periodId = form.querySelector('#completed-in-period').value;
    const finalGrade = parseFloat(form.querySelector('#completed-final-grade').value);
    const isEquivalent = form.querySelector('#completed-is-equivalent').checked;
    const equivalentCode = form.querySelector('#completed-equivalent-code').value;
    const notes = form.querySelector('#completed-notes').value;

    if (!periodId || isNaN(finalGrade)) {
        return notify.error('Período e Média Final são obrigatórios.');
    }

    const payload = {
        name: subjectToComplete.name,
        code: subjectToComplete.code,
        gradeConfig: { rule: 'arithmetic', evaluations: [{ name: 'Média Final' }] },
        grades: [{ name: 'Média Final', grade: finalGrade }],
        completionDetails: {
            isEquivalent,
            equivalentCode: isEquivalent ? equivalentCode : null,
            notes
        }
    };

    try {
        await firestoreApi.saveDiscipline(payload, { enrollmentId: activeEnrollmentId, periodId });
        modals.hideMarkAsCompletedModal();
        await view.renderChecklistContent();
        notify.success(`"${subjectToComplete.name}" marcada como concluída!`);
    } catch (error) {
        console.error('Erro ao marcar disciplina como concluída:', error);
        notify.error('Não foi possível salvar a conclusão da disciplina.');
    }
}

async function handlePomodoroSettingsSubmit(e) {
    e.preventDefault();
    const form = dom.pomodoroSettingsForm;
    const studyTime = form.querySelector('#pomodoro-study-time').value;
    const breakTime = form.querySelector('#pomodoro-break-time').value;
    const disciplineValue = form.querySelector('#pomodoro-discipline-value').value;
    const disciplineName = form.querySelector('[data-dropdown-container] .selected-value').textContent;
    const ambientSoundKey = form.querySelector('#pomodoro-sound-value').value;
    
    const selectedDiscipline = disciplineValue === 'none' ? null : { id: disciplineValue, name: disciplineName };

    pomodoro.startTimer(parseInt(studyTime), parseInt(breakTime), selectedDiscipline, ambientSoundKey);
    modals.hidePomodoroSettingsModal();
}

function handleDeleteStudySession(e) {
    const deleteButton = e.target.closest('[data-action="delete-study-session"]');
    if (!deleteButton) return;

    const sessionId = deleteButton.dataset.id;
    modals.showConfirmModal({
        title: 'Excluir Sessão',
        message: 'Tem certeza que deseja excluir esta sessão de estudo do seu histórico?',
        confirmText: 'Excluir',
        confirmClass: 'bg-danger',
        onConfirm: async () => {
            try {
                await firestoreApi.deleteStudySession(sessionId);
                notify.success('Sessão de estudo excluída.');
                pomodoro.showHistoryModal(); // Atualiza a lista
            } catch (error) {
                console.error("Erro ao excluir sessão de estudo:", error);
                notify.error('Falha ao excluir a sessão.');
            }
        }
    });
}

async function handleDocumentFormSubmit(e) {
    e.preventDefault();
    const form = dom.addDocumentForm;
    const submitButton = form.querySelector('button[type="submit"]');
    const fileInput = form.querySelector('#document-file');
    const file = fileInput.files[0];

    if (!file) {
        notify.error("Por favor, selecione um arquivo.");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Enviando...';
    notify.info('Enviando arquivo, por favor aguarde...');

    try {
        let { activeEnrollmentId } = getState();
        const uploadResult = await firestoreApi.uploadFileToCloudinary(file); 

        // Lógica para obter IDs do dropdown customizado
        const selectedDisciplineItem = form.querySelector('#modal-discipline-list .selected');
        const disciplineId = selectedDisciplineItem ? selectedDisciplineItem.dataset.value : 'none';
        const periodId = selectedDisciplineItem ? selectedDisciplineItem.dataset.periodId : null;
        
        // Se uma disciplina for selecionada na biblioteca geral, o ID da matrícula vem do próprio item
        if (disciplineId !== 'none' && selectedDisciplineItem && selectedDisciplineItem.dataset.enrollmentId) {
            activeEnrollmentId = selectedDisciplineItem.dataset.enrollmentId;
        }

        const payload = {
            title: form.querySelector('#document-title').value,
            type: form.querySelector('#document-type-value').value,
            tags: form.querySelector('#document-tags').value.split(',').map(tag => tag.trim()).filter(Boolean),
            fileUrl: uploadResult.url,
            filePublicId: uploadResult.publicId,
            fileType: file.type,
            enrollmentId: activeEnrollmentId, // Pode ser null se nenhuma disciplina for selecionada
            disciplineId: disciplineId === 'none' ? null : disciplineId,
            periodId: periodId,
        };

        await firestoreApi.saveDocument(payload);
        
        notify.success("Documento salvo com sucesso!");
        modals.hideDocumentModal();
        await view.renderDocumentsList(getState().activeEnrollmentId); // Recarrega a view atual

    } catch (error) {
        console.error("Erro ao salvar documento:", error);
        notify.error(`Falha ao salvar: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Salvar';
    }
}