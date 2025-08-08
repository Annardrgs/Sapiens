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

async function handleEventFormSubmit(e) {
    e.preventDefault();
    const { activeEnrollmentId, activePeriodId, activeDisciplineId } = getState();
    const form = dom.addEventForm;
    const eventId = form.querySelector('#event-id').value;

    // CORREÇÃO: Lê o valor dos inputs escondidos dos dropdowns customizados
    const payload = {
        title: form.querySelector('#event-title').value,
        date: form.querySelector('#event-date').value,
        category: form.querySelector('#event-category-value').value,
        relatedDisciplineId: form.querySelector('#event-discipline-value').value,
        reminder: form.querySelector('#event-reminder-value').value,
        color: form.querySelector('#event-color-input').value,
    };

    try {
        if (eventId) {
            await firestoreApi.updateCalendarEvent(eventId, payload, { enrollmentId: activeEnrollmentId, periodId: activePeriodId });
        } else {
            await firestoreApi.saveCalendarEvent(payload, { enrollmentId: activeEnrollmentId, periodId: activePeriodId });
        }
        modals.hideEventModal();
        
        if (dom.disciplineDashboardView && !dom.disciplineDashboardView.classList.contains('hidden')) {
            view.showDisciplineDashboard({ enrollmentId: activeEnrollmentId, disciplineId: activeDisciplineId });
        } else {
            view.refreshDashboard();
        }

        notify.success("Evento salvo com sucesso!");
        view.checkAndRenderNotifications();
    } catch (error) {
        console.error("Erro ao salvar evento:", error);
        notify.error("Erro ao salvar evento!");
    }
}

// --- HANDLERS (LÓGICA DOS EVENTOS) ---
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
    if (dom.closeAbsenceHistoryBtn) dom.closeAbsenceHistoryBtn.addEventListener('click', modals.hideAbsenceHistoryModal);

    // Formulários
    if (dom.addEnrollmentForm) dom.addEnrollmentForm.addEventListener('submit', handleEnrollmentFormSubmit);
    if (dom.addDisciplineForm) {
        dom.addDisciplineForm.addEventListener('submit', handleDisciplineFormSubmit);
        // Listener para cálculo automático de horas
        dom.addDisciplineForm.addEventListener('input', handleScheduleTimeChange);
    }
    if (dom.addPeriodForm) dom.addPeriodForm.addEventListener('submit', handlePeriodFormSubmit);
    if (dom.addAbsenceForm) dom.addAbsenceForm.addEventListener('submit', handleAbsenceFormSubmit);
    if (dom.configGradesForm) dom.configGradesForm.addEventListener('submit', handleConfigGradesSubmit);
    if (dom.addTodoForm) dom.addTodoForm.addEventListener('submit', handleTodoFormSubmit);
    if (dom.addEventForm) dom.addEventForm.addEventListener('submit', handleEventFormSubmit);
    if (dom.periodOptionsForm) dom.periodOptionsForm.addEventListener('submit', handlePeriodOptionsFormSubmit);
    if (dom.addCurriculumSubjectForm) dom.addCurriculumSubjectForm.addEventListener('submit', handleCurriculumSubjectFormSubmit);
    if (dom.markAsCompletedForm) dom.markAsCompletedForm.addEventListener('submit', handleMarkAsCompletedSubmit);
    if (dom.addDocumentForm) dom.addDocumentForm.addEventListener('submit', handleDocumentFormSubmit);
    
    // Pomodoro Timer
    if (dom.startPomodoroBtn) dom.startPomodoroBtn.addEventListener('click', () => modals.showPomodoroSettingsModal());
    if (dom.pausePomodoroBtn) dom.pausePomodoroBtn.addEventListener('click', pomodoro.togglePause);
    if (dom.stopPomodoroBtn) dom.stopPomodoroBtn.addEventListener('click', pomodoro.stopTimer);
    if (dom.closeStudyHistoryModalBtn) dom.closeStudyHistoryModalBtn.addEventListener('click', pomodoro.hideHistoryModal);
    if (dom.pomodoroSettingsForm) dom.pomodoroSettingsForm.addEventListener('submit', handlePomodoroSettingsSubmit);
    if (dom.floatingPausePomodoroBtn) dom.floatingPausePomodoroBtn.addEventListener('click', pomodoro.togglePause);
    if (dom.floatingStopPomodoroBtn) dom.floatingStopPomodoroBtn.addEventListener('click', pomodoro.stopTimer);

    // Outros
    if (dom.addEventModal) {
        const deleteBtn = dom.addEventModal.querySelector('#delete-event-btn');
        if (deleteBtn) deleteBtn.addEventListener('click', handleDeleteEvent);
    }

    if (dom.notificationBellBtn) dom.notificationBellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dom.notificationPanel.classList.toggle('hidden');
    });
    
    if (dom.confirmModalConfirmBtn) dom.confirmModalConfirmBtn.addEventListener('click', handleConfirmAction);
    if (dom.confirmModalCancelBtn) dom.confirmModalCancelBtn.addEventListener('click', handleCancelAction);

    const agendaToggle = document.getElementById('agenda-view-toggle');
    if (agendaToggle) agendaToggle.addEventListener('click', e => {
        const button = e.target.closest('.agenda-view-btn');
        if (!button) return;
        agendaToggle.querySelector('.active')?.classList.remove('active');
        button.classList.add('active');
        if (button.dataset.view === 'classes') view.renderWeeklyClasses(getState().disciplines);
        else view.renderAllEvents();
    });

    if (dom.disciplinesList) dom.disciplinesList.addEventListener('input', handleGradeInput);
    if (dom.absenceHistoryList) dom.absenceHistoryList.addEventListener('click', handleAbsenceHistoryListClick);
    if (dom.studyHistoryList) dom.studyHistoryList.addEventListener('click', handleDeleteStudySession);

    const documentsToolbar = document.getElementById('documents-toolbar');
    if (documentsToolbar) {
        const searchInput = documentsToolbar.querySelector('#document-search-input');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    view.renderDocumentsList(getState().activeEnrollmentId);
                }, 300);
            });
        }
    }

    const calendarFileInput = document.getElementById('period-calendar-file');
    if (calendarFileInput) {
        calendarFileInput.addEventListener('change', handleCalendarFileChange);
    }

    const removeCalendarBtn = document.getElementById('remove-calendar-btn');
    if (removeCalendarBtn) {
        removeCalendarBtn.addEventListener('click', handleRemoveCalendarFile);
    }
}

function handlePinTodo(id, pinButton) {
    const isPinned = !pinButton.classList.contains('text-primary');
    const svgIcon = pinButton.querySelector('svg');

    firestoreApi.updateTodoPinnedStatus(id, isPinned)
        .then(() => {
            // Atualiza a cor do botão (e do ícone via currentColor)
            pinButton.classList.toggle('text-primary', isPinned);
            
            // Atualiza o preenchimento do ícone
            if (svgIcon) {
                svgIcon.setAttribute('fill', isPinned ? 'currentColor' : 'none');
            }
            
            // Atualiza a visibilidade do botão
            pinButton.classList.toggle('opacity-100', isPinned);
            pinButton.classList.toggle('opacity-0', !isPinned);
            pinButton.classList.toggle('group-hover:opacity-100', !isPinned);

            reorderTodoListDOM(); // Reordena para mover o item fixado para o topo
        })
        .catch(err => {
            console.error("Erro ao fixar tarefa:", err);
            notify.error("Não foi possível fixar a tarefa.");
        });
}

// --- HANDLERS (LÓGICA DOS EVENTOS) ---
async function handleAppContainerClick(e) {
    const target = e.target;
    const actionTarget = target.closest('[data-action]');

    if (target.closest('.color-swatch')) {
        const colorSwatch = target.closest('.color-swatch');
        const palette = colorSwatch.parentElement;
        const colorInput = palette.nextElementSibling;
        if (colorInput && colorInput.type === 'hidden') {
            palette.querySelector('.selected')?.classList.remove('selected');
            colorSwatch.classList.add('selected');
            colorInput.value = colorSwatch.dataset.color;
        }
        return;
    }

    if (actionTarget) {
        e.stopPropagation();
        const action = actionTarget.dataset.action;
        const id = actionTarget.dataset.id || actionTarget.dataset.disciplineId;
        const name = actionTarget.dataset.name;
        let { activeEnrollmentId, activePeriodId, activeEnrollment } = getState();

        switch (action) {
            case 'manage-evaluations': if (id) modals.showConfigGradesModal(id, activePeriodId); break;
            case 'add-absence': if (id && name) modals.showAbsenceModal(id, name); break;
            case 'history-absence':
                if (id && name) {
                    modals.showAbsenceHistoryModal(id, name);
                    view.renderAbsenceHistory(activeEnrollmentId, activePeriodId, id);
                }
                break;
            case 'manage-evaluations':
                const disciplineId = actionTarget.dataset.disciplineId;
                const periodId = actionTarget.dataset.periodId;
                if (disciplineId && periodId) {
                    modals.showConfigGradesModal(disciplineId, periodId);
                }
                break;
            case 'pin-todo':
                if (id) handlePinTodo(id, actionTarget);
                break;
            case 'view-documents': if (activeEnrollmentId) navigate(`/documents?enrollmentId=${activeEnrollmentId}`); else navigate('/documents'); break;
            case 'view-checklist': if (activeEnrollmentId) navigate(`/checklist?enrollmentId=${activeEnrollmentId}`); break;
            case 'view-grades-report': if (activeEnrollmentId) navigate(`/grades?enrollmentId=${activeEnrollmentId}`); break;
            case 'view-discipline-details': if (id && activeEnrollmentId) view.showDisciplineDashboard({ enrollmentId: activeEnrollmentId, disciplineId: id }); break;
            case 'back-to-dashboard': if (activeEnrollmentId) navigate(`/dashboard?enrollmentId=${activeEnrollmentId}`); break;
            case 'back-from-documents': if (activeEnrollmentId) navigate(`/dashboard?enrollmentId=${activeEnrollmentId}`); else navigate('/'); break;
            case 'edit-enrollment': if (id) modals.showEnrollmentModal(id); break;
            case 'delete-enrollment': if (id) handleDeleteEnrollment(id); break;
            case 'edit-discipline': if (id) modals.showDisciplineModal(id); break;
            case 'delete-discipline': if (id) handleDeleteDiscipline(id); break;
            case 'add-new-event': modals.showEventModal(); break;
            case 'toggle-mute': pomodoro.toggleMute(); break;
            case 'view-study-history': pomodoro.showHistoryModal(); break;
            case 'toggle-dropdown': modals.toggleDropdown(actionTarget.closest('[data-dropdown-container]')); break;
            case 'select-dropdown-item':
                modals.selectDropdownItem(actionTarget);
                if (actionTarget.closest('[data-filter-key]')) view.renderDocumentsList(activeEnrollment ? activeEnrollment.id : null);
                break;
            case 'delete-todo': if (id) handleDeleteTodo(id, actionTarget.closest('.flex')); break;
            case 'mark-subject-completed':
                if (id) {
                    const subjects = await firestoreApi.getCurriculumSubjects(activeEnrollmentId);
                    const subjectData = subjects.find(s => s.id === id);
                    if (subjectData) modals.showMarkAsCompletedModal(subjectData);
                    else notify.error("Disciplina da grade não encontrada.");
                }
                break;
            case 'edit-curriculum-subject': if (id) modals.showCurriculumSubjectModal(id); break;
            case 'view-curriculum-subject-details': if (id) modals.showCurriculumSubjectDetailsModal(id); break;
            case 'toggle-todo': if (id) handleToggleTodo(id, actionTarget); break;
            case 'cancel': modals.hidePeriodOptionsModal(); break;
            case 'delete-document': if(id) handleDeleteDocument(id); break;
            case 'edit-todo':
                if (id) handleEditTodo(id, actionTarget);
                break;
            case 'toggle-todo': 
                if (id) handleToggleTodo(id, actionTarget); 
                break;
        }
        return;
    }

    const button = target.closest('button');
    if (button && button.id) {
        switch (button.id) {
            case 'add-enrollment-btn': modals.showEnrollmentModal(); break;
            case 'add-discipline-btn': modals.showDisciplineModal(); break;
            case 'add-document-btn': modals.showDocumentModal(); break;
            case 'new-period-btn': modals.showPeriodModal(); break;
            case 'back-to-enrollments-btn': navigate('/'); break;
            case 'prev-period-btn': switchPeriod('prev'); break;
            case 'next-period-btn': switchPeriod('next'); break;
            case 'cancel-period-btn': modals.hidePeriodModal(); break;
            case 'cancel-pomodoro-settings-btn': modals.hidePomodoroSettingsModal(); break;
            case 'manage-period-btn': modals.showPeriodOptionsModal(); break;
            case 'cancel-event-btn': modals.hideEventModal(); break;
            case 'cancel-enrollment-btn': modals.hideEnrollmentModal(); break;
            case 'cancel-mark-as-completed-btn': modals.hideMarkAsCompletedModal(); break;
            case 'close-curriculum-subject-details-btn': modals.hideCurriculumSubjectDetailsModal(); break;
            case 'cancel-curriculum-subject-btn': modals.hideCurriculumSubjectModal(); break;
            case 'cancel-document-btn': modals.hideDocumentModal(); break;
            case 'add-curriculum-subject-btn': modals.showCurriculumSubjectModal(); break;
            case 'reopen-period-btn': handleReopenPeriod(); break;
            case 'add-schedule-btn': modals.addScheduleField(); break;
            case 'cancel-discipline-btn': modals.hideDisciplineModal(); break;
            case 'end-period-btn': handleEndPeriod(); break;
            case 'delete-period-btn': handleDeletePeriod(); break;
            case 'close-pdf-viewer-btn': modals.hidePdfViewerModal(); break;
        }
    }

    const enrollmentCard = target.closest('#enrollments-list [data-id]');
    if (enrollmentCard) navigate(`/dashboard?enrollmentId=${enrollmentCard.dataset.id}`);
}

function handleDeleteTodo(id, element) {
    console.log(`%c[DEBUG] handleDeleteTodo fired for ID: ${id}`, 'color: green');
    firestoreApi.deleteTodo(id).then(() => {
        element.remove();
        notify.success("Tarefa removida.");
    }).catch(err => notify.error("Erro ao remover tarefa."));
}

function handleCancelAction() {
    const onCancel = getState().onCancelAction;
    if (typeof onCancel === 'function') {
        try {
            onCancel(); // Executa a ação de cancelamento (ex: isPaused = false)
        } catch (error) {
            console.error("Erro ao executar ação de cancelamento:", error);
        }
    }
    modals.hideConfirmModal(); // Fecha o modal depois
}

function reorderTodoListDOM() {
    if (!dom.todoItemsList) return;
    const items = Array.from(dom.todoItemsList.children);
    
    // Separa os itens fixados, pendentes e concluídos
    const pinned = items.filter(item => item.querySelector('[data-action="pin-todo"].text-primary'));
    const completed = items.filter(item => item.querySelector('[data-action="toggle-todo"].bg-primary') && !item.querySelector('[data-action="pin-todo"].text-primary'));
    const pending = items.filter(item => !item.querySelector('[data-action="toggle-todo"].bg-primary') && !item.querySelector('[data-action="pin-todo"].text-primary'));

    // Limpa a lista e adiciona em ordem: fixados, pendentes, concluídos
    dom.todoItemsList.innerHTML = '';
    pinned.forEach(item => dom.todoItemsList.appendChild(item));
    pending.forEach(item => dom.todoItemsList.appendChild(item));
    completed.forEach(item => dom.todoItemsList.appendChild(item));
}

function handleToggleTodo(id, buttonElement) {
    const todoItemElement = buttonElement.closest('.group');
    const checkIcon = buttonElement.querySelector('svg');
    const label = todoItemElement.querySelector('.todo-text');
    const pinButton = todoItemElement.querySelector('[data-action="pin-todo"]');

    const isBecomingCompleted = !buttonElement.classList.contains('bg-primary');
    const isCurrentlyPinned = pinButton && pinButton.classList.contains('text-primary');

    // Monta o payload para a atualização no banco de dados
    const payload = {
        completed: isBecomingCompleted
    };

    // CORREÇÃO: Se a tarefa está sendo concluída E está fixada, desfixa ela.
    if (isBecomingCompleted && isCurrentlyPinned) {
        payload.isPinned = false;
    }

    firestoreApi.updateTodo(id, payload)
        .then(() => {
            // Atualiza a UI do checkbox
            todoItemElement.classList.toggle('opacity-60', isBecomingCompleted);
            buttonElement.classList.toggle('bg-primary', isBecomingCompleted);
            buttonElement.classList.toggle('border-primary', isBecomingCompleted);
            if (checkIcon) checkIcon.classList.toggle('hidden', !isBecomingCompleted);
            if (label) {
                label.classList.toggle('line-through', isBecomingCompleted);
                label.classList.toggle('text-subtle', isBecomingCompleted);
            }

            // Atualiza a UI do ícone de fixar, se ele foi alterado
            if (isBecomingCompleted && isCurrentlyPinned && pinButton) {
                const pinIcon = pinButton.querySelector('svg');
                pinButton.classList.remove('text-primary', 'opacity-100');
                pinButton.classList.add('opacity-0', 'group-hover:opacity-100');
                if (pinIcon) pinIcon.setAttribute('fill', 'none');
            }

            reorderTodoListDOM();
        })
        .catch(err => {
            console.error("Erro ao atualizar tarefa:", err);
            notify.error("Não foi possível atualizar a tarefa.");
        });
}

function handleEditTodo(id, textElement) {
    const currentText = textElement.dataset.text;
    const newText = prompt("Editar tarefa:", currentText);

    if (newText && newText.trim() !== currentText) {
        firestoreApi.updateTodoText(id, newText.trim())
            .then(() => {
                textElement.textContent = newText.trim();
                textElement.dataset.text = newText.trim();
                notify.success("Tarefa atualizada.");
            })
            .catch(err => {
                console.error("Erro ao editar tarefa:", err);
                notify.error("Não foi possível editar a tarefa.");
            });
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

async function handleDeleteDocument(docId) {
    modals.showConfirmModal({
        title: 'Excluir Documento',
        message: 'Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.',
        confirmText: 'Excluir',
        onConfirm: async () => {
            try {
                await firestoreApi.deleteDocument(docId);
                notify.success('Documento excluído.');
                await view.renderDocumentsList(getState().activeEnrollmentId);
            } catch (error) {
                notify.error('Falha ao excluir o documento.');
                console.error("Erro ao excluir documento:", error);
            }
        }
    });
}

async function handleScheduleTimeChange(e) {
    if (e.target.name !== 'schedule-start' && e.target.name !== 'schedule-end') return;
    
    const scheduleField = e.target.parentElement;
    const startTime = scheduleField.querySelector('[name="schedule-start"]').value;
    const endTime = scheduleField.querySelector('[name="schedule-end"]').value;

    const hours = calculateHoursDifference(startTime, endTime);
    
    if (hours !== null) {
        const hoursPerClassInput = dom.addDisciplineForm.querySelector('#discipline-hours-per-class');
        if (hoursPerClassInput) {
            hoursPerClassInput.value = hours;
        }
    }
}

function calculateHoursDifference(startTime, endTime) {
    if (!startTime || !endTime) return null;
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    if (isNaN(start) || isNaN(end) || end <= start) return null;
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
        if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Salvando...'; }

        if (file) {
            payload.calendarUrl = await firestoreApi.uploadPeriodCalendar(file);
        }
        await firestoreApi.updatePeriodDetails(activeEnrollmentId, activePeriodId, payload);
        
        if (payload.calendarUrl) {
            notify.info("Calendário salvo. Enviando para análise da IA...");
            
            // CORREÇÃO: Substitua o placeholder pela sua URL real da Vercel
            const vercelFunctionUrl = 'https://SEU-DOMINIO.vercel.app/api/process-calendar'; 

            const response = await fetch(vercelFunctionUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileUrl: payload.calendarUrl }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro na IA');
            }

            const { events } = await response.json();

            if (events && events.length > 0) {
                const batch = firestoreApi.createBatch();
                events.forEach(event => {
                    firestoreApi.addEventToBatch(batch, event, { enrollmentId: activeEnrollmentId, periodId: activePeriodId });
                });
                await firestoreApi.commitBatch(batch);
                notify.success(`${events.length} eventos foram criados com sucesso!`);
            } else {
                notify.info("Nenhum evento relevante encontrado pela IA.");
            }

        } else {
            notify.success("Opções do período salvas.");
        }

        modals.hidePeriodOptionsModal();
        await view.showDashboardView(activeEnrollmentId);

    } catch (error) {
        console.error("Erro ao salvar opções do período:", error);
        notify.error(`Falha ao salvar: ${error.message}`);
    } finally {
        if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Salvar Alterações'; }
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
        
        const emptyState = document.getElementById('todo-empty-state');
        if (emptyState) emptyState.remove();

        const newTodo = { id: docRef.id, text: taskText, completed: false };
        const todoElement = view.createTodoItemElement(newTodo);

        // CORREÇÃO: Adiciona a nova tarefa no início da lista
        dom.todoItemsList.prepend(todoElement);
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
        return notify.error("Por favor, selecione um arquivo.");
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Enviando...';
    notify.info('Enviando arquivo, por favor aguarde...');

    try {
        let { activeEnrollmentId } = getState();
        const uploadResult = await firestoreApi.uploadFileToCloudinary(file);

        const selectedDisciplineItem = form.querySelector('#modal-discipline-list .selected');
        const disciplineId = selectedDisciplineItem ? selectedDisciplineItem.dataset.value : 'none';
        
        // CORREÇÃO: Garantir que periodId seja null se nenhuma disciplina for selecionada
        const periodId = (disciplineId !== 'none' && selectedDisciplineItem) 
            ? selectedDisciplineItem.dataset.periodId 
            : null;
        
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
            enrollmentId: activeEnrollmentId,
            disciplineId: disciplineId === 'none' ? null : disciplineId,
            periodId: periodId, // <<< Agora será `null` em vez de `undefined`
        };

        await firestoreApi.saveDocument(payload);
        
        notify.success("Documento salvo com sucesso!");
        modals.hideDocumentModal();
        await view.renderDocumentsList(getState().activeEnrollmentId);

    } catch (error) {
        console.error("Erro ao salvar documento:", error);
        notify.error(`Falha ao salvar: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Salvar';
    }
}