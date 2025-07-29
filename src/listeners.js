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
    const authToggleBtn = dom.authScreen.querySelector('[data-toggle-password]');
    if(authToggleBtn) {
        authToggleBtn.addEventListener('click', () => view.togglePasswordVisibility(dom.authPasswordInput));
    }
}

export function initializeAppListeners() {
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

    if (dom.disciplinesList) dom.disciplinesList.addEventListener('input', handleGradeInput);
    
    // Listeners de "cancelar" dos modais
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
async function handleAppContainerClick(e) {
    const target = e.target;
    const button = target.closest('button');

    // 1. Ações na tela de Matrículas
    const enrollmentCard = target.closest('#enrollments-list [data-id]');
    if (enrollmentCard) {
        const id = enrollmentCard.dataset.id;
        if (target.closest('.edit-btn')) {
            modals.showEnrollmentModal(id);
        } else if (target.closest('.delete-btn')) {
            modals.showConfirmDeleteModal({ type: 'enrollment', id });
        } else {
            view.showDashboardView(id);
        }
        return;
    }

    // 2. Ações nos botões principais por ID
    if (button && button.id) {
        switch (button.id) {
            case 'add-enrollment-btn': modals.showEnrollmentModal(); return;
            case 'add-discipline-btn': modals.showDisciplineModal(); return;
            case 'new-period-btn': modals.showPeriodModal(); return;
            case 'manage-period-btn': modals.showPeriodOptionsModal(); return;
            case 'back-to-enrollments-btn': view.showEnrollmentsView(); return;
            case 'prev-period-btn': switchPeriod('next'); return; // A lógica está invertida intencionalmente (ordem desc)
            case 'next-period-btn': switchPeriod('prev'); return;
        }
    }

    // 3. Ações nos Cards de Disciplina
    const disciplineCard = target.closest('#disciplines-list [data-id]');
    if (disciplineCard) {
        handleDisciplinesListClick(e, disciplineCard);
        return;
    }

    // 4. Ações no modal de opções do período
    if (target.closest('#end-period-btn')) handleEndPeriod();
    if (target.closest('#reopen-period-btn')) handleReopenPeriod();
    if (target.closest('#delete-period-btn')) handleDeletePeriod();
    if (target.closest('#view-calendar-btn')) handleViewCalendar();

    // 5. Ações no histórico de faltas
     const absenceAction = target.closest('#absence-history-list button');
     if (absenceAction) {
         handleAbsenceHistoryListClick(e);
         return;
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
    // Lendo os novos campos de data
    const payload = {
        name: dom.addPeriodForm.querySelector('#period-name').value,
        startDate: dom.addPeriodForm.querySelector('#period-start-date-new').value,
        endDate: dom.addPeriodForm.querySelector('#period-end-date-new').value,
    };
    if (!payload.name || !payload.startDate || !payload.endDate) {
        return alert("Todos os campos são obrigatórios.");
    }
    try {
        await firestoreApi.createPeriod(activeEnrollmentId, payload);
        modals.hidePeriodModal();
        await view.showDashboardView(activeEnrollmentId);
    } catch (error) {
        console.error("Erro ao criar período:", error);
    }
}

function renderGradeFields() {
    const rule = dom.configGradesForm.querySelector('#grade-calculation-rule').value;
    dom.gradesContainer.innerHTML = ''; // Limpa os campos existentes
    updateWeightsSum(); // Atualiza o totalizador
    // Adiciona um campo inicial
    addGradeField();
}

function addGradeField() {
    const rule = dom.configGradesForm.querySelector('#grade-calculation-rule').value;
    const gradeField = document.createElement('div');
    gradeField.className = 'flex items-center space-x-2 animate-fade-in';

    const baseInputClasses = "w-full px-3 py-2 bg-bkg text-secondary border border-border rounded-md";
    let fieldsHTML = '';
    
    if (rule === 'weighted') {
        fieldsHTML = `
            <input type="text" name="name" placeholder="Nome (ex: P1)" class="${baseInputClasses}">
            <input type="number" name="weight" min="1" max="100" placeholder="Peso (%)" class="${baseInputClasses} w-32">
        `;
    } else { // 'min-max' para Média Aritmética
        fieldsHTML = `
            <input type="text" name="name" placeholder="Nome (ex: Prova 1)" class="${baseInputClasses}">
        `;
    }

    gradeField.innerHTML = `
        ${fieldsHTML}
        <button type="button" class="remove-field-btn text-danger p-2 rounded-full hover:bg-danger/10">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
    `;
    gradeField.querySelector('.remove-field-btn').addEventListener('click', () => {
        gradeField.remove();
        updateWeightsSum();
    });
    dom.gradesContainer.appendChild(gradeField);
}

function updateWeightsSum() {
    const rule = dom.configGradesForm.querySelector('#grade-calculation-rule').value;
    const summaryContainer = dom.configGradesForm.querySelector('#grades-summary');
    if (rule !== 'weighted') {
        summaryContainer.innerHTML = '';
        return;
    }

    let totalWeight = 0;
    const weightInputs = dom.gradesContainer.querySelectorAll('[name="weight"]');
    weightInputs.forEach(input => {
        totalWeight += Number(input.value) || 0;
    });

    const colorClass = totalWeight === 100 ? 'text-success' : (totalWeight > 100 ? 'text-danger' : 'text-subtle');
    summaryContainer.innerHTML = `<p class="text-sm font-bold ${colorClass}">Soma dos Pesos: ${totalWeight}%</p>`;
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
    
    // Lendo os novos horários estruturados
    const schedules = [];
    const scheduleElements = dom.addDisciplineForm.querySelectorAll('#schedules-container .schedule-field');
    scheduleElements.forEach(field => {
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
        schedules: schedules, // Salva o array de horários
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

function addScheduleField() {
    const container = dom.addDisciplineForm.querySelector('#schedules-container');
    const field = document.createElement('div');
    field.className = 'schedule-field grid grid-cols-[1fr,auto,auto,auto] gap-2 items-center';
    field.innerHTML = `
        <select name="schedule-day" class="w-full px-3 py-2 bg-bkg text-secondary border border-border rounded-md">
            <option value="Seg">Segunda</option>
            <option value="Ter">Terça</option>
            <option value="Qua">Quarta</option>
            <option value="Qui">Quinta</option>
            <option value="Sex">Sexta</option>
            <option value="Sab">Sábado</option>
            <option value="Dom">Domingo</option>
        </select>
        <input type="time" name="schedule-start" required class="px-3 py-2 bg-bkg text-secondary border border-border rounded-md">
        <input type="time" name="schedule-end" required class="px-3 py-2 bg-bkg text-secondary border border-border rounded-md">
        <button type="button" class="remove-schedule-btn text-danger p-2 rounded-full hover:bg-danger/10">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
    `;
    field.querySelector('.remove-schedule-btn').addEventListener('click', () => field.remove());
    container.appendChild(field);
}

/**
 * Lida com cliques na lista de disciplinas, delegando para ações específicas.
 */
function handleDisciplinesListClick(e, card) {
    const target = e.target;
    const actionTarget = target.closest('[data-id]');
    if (!actionTarget) return;

    const id = card.dataset.id;
    const name = actionTarget.dataset.name;
    const { activeEnrollmentId, activePeriodId } = getState();

    // Lógica para o menu de 3 pontos
    if (target.closest('.discipline-menu-btn')) {
        const menu = document.getElementById(`menu-${id}`);
        if (menu) {
            document.querySelectorAll('[id^="menu-"]').forEach(m => {
                if (m.id !== menu.id) m.classList.add('hidden');
            });
            menu.classList.toggle('hidden');
        }
        return;
    }
    
    // Fecha o menu após clicar numa opção
    const menu = document.getElementById(`menu-${id}`);
    if (menu) menu.classList.add('hidden');
    
    // Lógica para os botões de ação
    if (target.matches('.edit-discipline-btn, .edit-discipline-btn *')) modals.showDisciplineModal(id);
    else if (target.matches('.delete-discipline-btn, .delete-discipline-btn *')) modals.showConfirmDeleteModal({ type: 'discipline', id, enrollmentId: activeEnrollmentId, periodId: activePeriodId });
    else if (target.matches('.add-absence-btn, .add-absence-btn *')) modals.showAbsenceModal(id, name);
    else if (target.matches('.absence-history-btn, .absence-history-btn *')) {
        modals.showAbsenceHistoryModal(id, name);
        view.renderAbsenceHistory(activeEnrollmentId, activePeriodId, id);
    } else if (target.matches('.config-grades-btn, .config-grades-btn *')) modals.showConfigGradesModal(id, name);
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