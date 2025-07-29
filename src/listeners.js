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
import { calculateAverage } from './components/card.js';
import { createAbsenceHistoryItem } from './components/card.js';

// --- INICIALIZAÇÃO DOS LISTENERS ---

export function initializeAuthListeners() {
    if (dom.authForm) dom.authForm.addEventListener('submit', handleAuthFormSubmit);
    if (dom.authPrompt) dom.authPrompt.addEventListener('click', (e) => {
        if (e.target.id === 'switch-to-signup-btn') {
            setState('authMode', 'signup');
            view.updateAuthView();
        }
        if (e.target.id === 'switch-to-login-btn') {
            setState('authMode', 'login');
            view.updateAuthView();
        }
    });
    const authToggleBtn = document.querySelector('#auth-screen [data-toggle-password]');
    if (authToggleBtn) {
        authToggleBtn.addEventListener('click', () => view.togglePasswordVisibility(dom.authPasswordInput));
    }
}

export function initializeAppListeners() {
    document.addEventListener('click', handleOutsideClick, true);

    // Listeners Globais e de Modais (sempre devem existir no DOM após o login)
    if (dom.appContainer) dom.appContainer.addEventListener('click', handleAppContainerClick);
    if (dom.logoutBtn) dom.logoutBtn.addEventListener('click', authApi.logOut);
    if (dom.themeToggleBtn) dom.themeToggleBtn.addEventListener('click', toggleTheme);
    document.addEventListener('click', handleOutsideClick, true);

    // Listeners de formulários de modais
    if (dom.addEnrollmentForm) dom.addEnrollmentForm.addEventListener('submit', handleEnrollmentFormSubmit);
    if (dom.addDisciplineForm) dom.addDisciplineForm.addEventListener('submit', handleDisciplineFormSubmit);
    if (dom.addPeriodForm) dom.addPeriodForm.addEventListener('submit', handlePeriodFormSubmit);
    if (dom.addAbsenceForm) dom.addAbsenceForm.addEventListener('submit', handleAbsenceFormSubmit);
    if (dom.confirmDeleteBtn) dom.confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
    if (dom.configGradesForm) dom.configGradesForm.addEventListener('submit', handleConfigGradesSubmit);
    if (dom.periodOptionsForm) dom.periodOptionsForm.addEventListener('submit', handlePeriodOptionsFormSubmit);
    if (dom.addGradeFieldBtn) dom.addGradeFieldBtn.addEventListener('click', handleAddGradeField);

    // Listener de input para notas (só existe no dashboard)
    if (dom.disciplinesList) dom.disciplinesList.addEventListener('input', handleGradeInput);
    
    // Listeners de botões de "cancelar" dos modais
    if (dom.cancelEnrollmentBtn) dom.cancelEnrollmentBtn.addEventListener('click', modals.hideEnrollmentModal);
    if (dom.cancelDisciplineBtn) dom.cancelDisciplineBtn.addEventListener('click', modals.hideDisciplineModal);
    if (dom.cancelPeriodBtn) dom.cancelPeriodBtn.addEventListener('click', modals.hidePeriodModal);
    if (dom.cancelAbsenceBtn) dom.cancelAbsenceBtn.addEventListener('click', modals.hideAbsenceModal);
    if (dom.closeAbsenceHistoryBtn) dom.closeAbsenceHistoryBtn.addEventListener('click', modals.hideAbsenceHistoryModal);
    if (dom.cancelDeleteBtn) dom.cancelDeleteBtn.addEventListener('click', modals.hideConfirmDeleteModal);
    if (dom.cancelConfigGradesBtn) dom.cancelConfigGradesBtn.addEventListener('click', modals.hideConfigGradesModal);
    if (dom.periodOptionsModal) dom.periodOptionsModal.querySelector('[data-action="cancel"]')?.addEventListener('click', modals.hidePeriodOptionsModal);
    if (dom.closePdfViewerBtn) dom.closePdfViewerBtn.addEventListener('click', modals.hidePdfViewerModal);
}

// --- HANDLERS (LÓGICA DOS EVENTOS) ---

/**
 * Handler centralizado que captura todos os cliques dentro do #app-container
 * e delega a ação para a função correta.
 */
function handleAppContainerClick(e) {
    const target = e.target;
    const actionTarget = target.closest('[data-action]');

    // Ações na tela de Matrículas
    const enrollmentCard = target.closest('#enrollments-list [data-id]');
    if (enrollmentCard) {
        const id = enrollmentCard.dataset.id;
        const action = actionTarget ? actionTarget.dataset.action : null;
        if (action === 'edit-enrollment') modals.showEnrollmentModal(id);
        else if (action === 'delete-enrollment') modals.showConfirmDeleteModal({ type: 'enrollment', id });
        else view.showDashboardView(id); // Ação padrão do card
        return;
    }
    
    // Ações na tela de Resumo do Período Atual
    if (target.closest('.view-enrollment-dashboard-btn')) {
        view.showDashboardView(target.closest('[data-id]').dataset.id);
        return;
    }
    
    // Ações globais (botões principais)
    const globalActionId = target.closest('button')?.id;
    switch (globalActionId) {
        case 'add-enrollment-btn': modals.showEnrollmentModal(); break;
        case 'add-discipline-btn': modals.showDisciplineModal(); break;
        case 'back-to-enrollments-btn': view.showEnrollmentsView(); break;
        case 'new-period-btn': modals.showPeriodModal(); break;
        case 'manage-period-btn': modals.showPeriodOptionsModal(); break;
        case 'prev-period-btn': switchPeriod('prev'); break;
        case 'next-period-btn': switchPeriod('next'); break;
    }

    // Ações em cards de disciplina
    const disciplineCard = target.closest('#disciplines-list [data-id]');
    if (disciplineCard) {
        handleDisciplinesListClick(e, disciplineCard, actionTarget);
    }
}
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

async function handlePeriodFormSubmit(e) {
    e.preventDefault();
    const { activeEnrollmentId } = getState();
    const periodName = dom.addPeriodForm.querySelector('#period-name').value;
    if (!periodName) return alert("O nome do período é obrigatório.");
    try {
        await firestoreApi.createPeriod(activeEnrollmentId, periodName);
        modals.hidePeriodModal();
        await view.showDashboardView(activeEnrollmentId);
    } catch (error) {
        console.error("Erro ao criar período:", error);
    }
}

function handleAddGradeField() {
    const rule = dom.configGradesForm.querySelector('#grade-calculation-rule').value;
    const gradeField = document.createElement('div');
    gradeField.className = 'flex items-center space-x-2';

    let fieldsHTML = '';
    if (rule === 'weighted') {
        fieldsHTML = `
            <input type="text" name="name" placeholder="Nome (ex: P1)" class="w-2/3 px-3 py-2 bg-bkg text-secondary border border-border rounded-md">
            <input type="number" name="weight" placeholder="Peso (%)" class="w-1/3 px-3 py-2 bg-bkg text-secondary border border-border rounded-md">
        `;
    } else {
        fieldsHTML = `
            <input type="text" name="name" placeholder="Nome (ex: P1)" class="w-1/2 px-3 py-2 bg-bkg text-secondary border border-border rounded-md">
            <input type="number" name="min" placeholder="Mín." class="w-1/4 px-3 py-2 bg-bkg text-secondary border border-border rounded-md">
            <input type="number" name="max" placeholder="Máx." class="w-1/4 px-3 py-2 bg-bkg text-secondary border border-border rounded-md">
        `;
    }

    gradeField.innerHTML = `
        ${fieldsHTML}
        <button type="button" class="remove-field-btn text-danger hover:opacity-80">Remover</button>
    `;
    gradeField.querySelector('.remove-field-btn').addEventListener('click', () => gradeField.remove());
    dom.gradesContainer.appendChild(gradeField);
}

async function handleConfigGradesSubmit(e) {
    e.preventDefault();
    const { currentDisciplineForGrades } = getState();
    if (!currentDisciplineForGrades) return;

    const evaluations = [];
    const gradeFields = dom.configGradesForm.querySelectorAll('#grades-container > div');
    let totalWeight = 0;
    const rule = dom.configGradesForm.querySelector('#grade-calculation-rule').value;
    
    gradeFields.forEach(field => {
        const name = field.querySelector('[name="name"]').value;
        if (rule === 'weighted') {
            const weight = parseInt(field.querySelector('[name="weight"]').value, 10);
            if (name && weight > 0) {
                evaluations.push({ name, weight });
                totalWeight += weight;
            }
        } else {
            const min = parseFloat(field.querySelector('[name="min"]').value);
            const max = parseFloat(field.querySelector('[name="max"]').value);
            if (name && !isNaN(min) && !isNaN(max)) {
                evaluations.push({ name, min, max });
            }
        }
    });

    if (rule === 'weighted' && totalWeight !== 100 && evaluations.length > 0) {
        alert("A soma dos pesos de todas as avaliações deve ser igual a 100.");
        return;
    }

    const payload = {
        gradeConfig: {
            rule: dom.configGradesForm.querySelector('#grade-calculation-rule').value,
            evaluations: evaluations,
        },
        grades: evaluations.map(evaluation => ({ name: evaluation.name, grade: null }))
    };

    try {
        await firestoreApi.saveDiscipline(payload, currentDisciplineForGrades);
        modals.hideConfigGradesModal();
        await view.showDashboardView(currentDisciplineForGrades.enrollmentId);
    } catch (error) {
        console.error("Erro ao salvar configuração de notas:", error);
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

    if (grade !== null && (grade < 0 || grade > 10)) {
        input.classList.add('border', 'border-danger');
        return;
    } else {
        input.classList.remove('border', 'border-danger');
    }

    const { activeEnrollmentId, activePeriodId } = getState();
    const cardElement = input.closest('[data-id]');
    
    gradeInputTimeout = setTimeout(async () => {
        try {
            await firestoreApi.saveGrade(grade, gradeIndex, { enrollmentId: activeEnrollmentId, periodId: activePeriodId, disciplineId });
            const disciplineSnap = await firestoreApi.getDiscipline(activeEnrollmentId, activePeriodId, disciplineId);
            if (disciplineSnap.exists()) {
                const updatedData = disciplineSnap.data();
                const newAverage = calculateAverage(updatedData);
                const averageElement = cardElement.querySelector('.average-grade-display');
                if (averageElement) {
                    averageElement.textContent = `Média: ${newAverage}`;
                }
            }
        } catch (error) {
            console.error("Erro ao salvar nota:", error);
            alert("Não foi possível salvar a nota.");
        }
    }, 800);
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
        await view.refreshDashboard();
    } catch (error) {
        console.error("Erro ao salvar disciplina:", error);
    }
}

/**
 * Lida com cliques na lista de disciplinas, delegando para ações específicas.
 */
function handleDisciplinesListClick(e, card, actionTarget) {
    // Se há um alvo de ação (um botão), executa a ação.
    if (actionTarget) {
        e.preventDefault();
        const action = actionTarget.dataset.action;
        const disciplineId = card.dataset.id;
        const disciplineName = actionTarget.dataset.name;
        const { activeEnrollmentId, activePeriodId } = getState();

        const menu = card.querySelector('.menu-options');
        if (menu) menu.classList.add('hidden');
    
        switch (action) {
            case 'toggle-menu':
                e.stopPropagation();
                menu.classList.toggle('hidden');
                break;
            case 'edit-discipline':
                modals.showDisciplineModal(disciplineId);
                break;
            case 'delete-discipline':
                modals.showConfirmDeleteModal({ type: 'discipline', id: disciplineId, enrollmentId: activeEnrollmentId, periodId: activePeriodId });
                break;
            case 'add-absence':
                modals.showAbsenceModal(disciplineId, disciplineName);
                break;
            case 'history-absence':
                modals.showAbsenceHistoryModal(disciplineId, disciplineName);
                view.renderAbsenceHistory(activeEnrollmentId, activePeriodId, disciplineId);
                break;
            case 'config-grades':
                modals.showConfigGradesModal(disciplineId, disciplineName);
                break;
        }
    } 
    // Se o clique foi no cabeçalho do card (mas não em um botão de ação), expande/contrai.
    else if (e.target.closest('.card-header')) {
        toggleCardExpansion(card);
    }
}

/**
 * Expande ou contrai um card de disciplina.
 */
function toggleCardExpansion(card) {
    const details = card.querySelector('.details-content');
    if (!details) return;

    if (details.style.maxHeight && details.style.maxHeight !== '0px') {
        details.style.maxHeight = '0px';
        card.classList.remove('bg-bkg'); // Volta à cor normal
    } else {
        details.style.maxHeight = details.scrollHeight + "px";
        card.classList.add('bg-bkg'); // Muda a cor para dar destaque
    }
}

/**
 * Carrega e renderiza o histórico de faltas dentro de um card de disciplina.
 */
async function loadAbsenceHistoryIntoCard(card) {
    const container = card.querySelector('.absence-history-list');
    if (!container || container.dataset.loaded) return;

    const { activeEnrollmentId, activePeriodId } = getState();
    const disciplineId = card.dataset.id;

    container.innerHTML = `<p class="text-sm text-subtle">Carregando...</p>`;
    const history = await firestoreApi.getAbsenceHistory(activeEnrollmentId, activePeriodId, disciplineId);
    
    container.innerHTML = '';
    if (!history.length) {
        container.innerHTML = `<p class="text-sm text-subtle">Nenhuma falta registrada.</p>`;
    } else {
        history.forEach(item => {
            const historyItem = createAbsenceHistoryItem(item);
            historyItem.querySelector('.remove-absence-btn')?.addEventListener('click', async (e) => {
            e.stopPropagation();
                if (confirm("Tem certeza que deseja remover esta falta?")) {
                    await firestoreApi.removeAbsence(item.id, {enrollmentId, periodId, disciplineId });
                    // ATUALIZA APENAS O CARD AFETADO (CORREÇÃO DO BUG)
                    const updatedDiscipline = await firestoreApi.getDiscipline(enrollmentId, periodId, disciplineId);
                    if (updatedDiscipline.exists()) {
                        view.updateDisciplineCard({ id: updatedDiscipline.id, ...updatedDiscipline.data() });
                    }
                    // Recarrega o histórico no modal se estiver aberto
                    if (!dom.absenceHistoryModal.classList.contains('hidden')) {
                        view.renderAbsenceHistory(enrollmentId, periodId, disciplineId);
                    }
                }
            });
        });
    }
    container.dataset.loaded = 'true';
    
    const details = card.querySelector('.details-content');
    if (details.style.maxHeight && details.style.maxHeight !== '0px') {
        details.style.maxHeight = details.scrollHeight + "px";
    }
}

function handleOutsideClick(e) {
    // Fecha o menu de três pontos do card de disciplina
    const openMenu = document.querySelector('.menu-options:not(.hidden)');
    if (openMenu && !openMenu.parentElement.contains(e.target)) {
        openMenu.classList.add('hidden');
    }
}

async function handleAbsenceFormSubmit(e) {
    e.preventDefault();
    const { currentDisciplineForAbsence } = getState();
    if (!currentDisciplineForAbsence) return;
    
    const payload = {
        // CORRIGIDO: O nome do campo agora é 'absenceDate'
        absenceDate: dom.addAbsenceForm.querySelector('#absence-date').value,
        justification: dom.addAbsenceForm.querySelector('#absence-justification').value,
        addedAt: new Date(),
    };

    try {
        await firestoreApi.addAbsence(payload, currentDisciplineForAbsence);
        modals.hideAbsenceModal();
        
        const updatedDiscipline = await firestoreApi.getDiscipline(currentDisciplineForAbsence.enrollmentId, currentDisciplineForAbsence.periodId, currentDisciplineForAbsence.disciplineId);
        if (updatedDiscipline.exists()) {
            view.updateDisciplineCard({ id: updatedDiscipline.id, ...updatedDiscipline.data() });
        }
    } catch (error) {
        console.error("Erro ao registrar falta:", error);
        alert('Falha ao registrar falta.');
    }
}


async function handleAbsenceHistoryListClick(e) {
    const removeBtn = e.target.closest('.remove-absence-btn');
    if (!removeBtn) return;
    const { currentDisciplineForAbsence } = getState();
    if (confirm("Tem certeza que deseja remover esta falta?")) {
        try {
            await firestoreApi.removeAbsence(removeBtn.dataset.id, currentDisciplineForAbsence);
            await view.refreshDashboard();
            modals.hideAbsenceHistoryModal();
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
            await view.refreshDashboard();
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
    const { periods, activePeriodIndex } = getState();
    let newIndex = activePeriodIndex;
    if (direction === 'prev' && activePeriodIndex < periods.length - 1) {
        newIndex++;
    } else if (direction === 'next' && activePeriodIndex > 0) {
        newIndex--;
    }
    if (newIndex !== activePeriodIndex) {
        setState('activePeriodIndex', newIndex);
        await view.renderPeriodNavigator();
        await view.refreshDashboard();
    }
}

function handleEndPeriod() {
    const { activeEnrollmentId, activePeriodId } = getState();
    if (confirm("Tem certeza que deseja encerrar este período? Não será possível adicionar ou editar disciplinas.")) {
        firestoreApi.updatePeriodStatus(activeEnrollmentId, activePeriodId, 'closed')
            .then(() => view.showDashboardView(activeEnrollmentId));
    }
}

function handleReopenPeriod() {
    const { activeEnrollmentId, activePeriodId } = getState();
    firestoreApi.updatePeriodStatus(activeEnrollmentId, activePeriodId, 'active')
        .then(() => view.showDashboardView(activeEnrollmentId));
}

function handleDeletePeriod() {
    const { activeEnrollmentId, activePeriodId } = getState();
    modals.showConfirmDeleteModal({ type: 'period', id: activePeriodId, enrollmentId: activeEnrollmentId });
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
        submitButton.textContent = 'Salvar Alterações';
        submitButton.disabled = false;
    }
}

async function handleViewCalendar() {
    const { activeEnrollmentId, activePeriodId } = getState();
    try {
        const periodSnap = await firestoreApi.getPeriod(activeEnrollmentId, activePeriodId);
        if (periodSnap && periodSnap.exists()) {
            const currentPeriod = periodSnap.data();
            if (currentPeriod && currentPeriod.calendarUrl) {
                modals.showPdfViewerModal(currentPeriod.calendarUrl);
            } else {
                alert("Nenhum calendário encontrado para este período.");
            }
        } else {
            alert("Não foi possível encontrar os dados do período.");
        }
    } catch (error) {
        console.error("Erro ao buscar o calendário:", error);
        alert("Não foi possível carregar os dados do calendário.");
    }
}