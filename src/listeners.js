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
    dom.appContainer.addEventListener('click', handleAppContainerClick);
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
    dom.disciplinesList.addEventListener('click', handleDisciplinesListClick);
    dom.absenceHistoryList.addEventListener('click', handleAbsenceHistoryListClick);

    // Listeners para o navegador de período
    dom.prevPeriodBtn.addEventListener('click', () => switchPeriod('prev'));
    dom.nextPeriodBtn.addEventListener('click', () => switchPeriod('next'));
    dom.managePeriodBtn.addEventListener('click', () => dom.periodMenu.classList.toggle('hidden'));
    dom.endPeriodBtn.addEventListener('click', handleEndPeriod);
    dom.reopenPeriodBtn.addEventListener('click', handleReopenPeriod);
    dom.deletePeriodBtn.addEventListener('click', handleDeletePeriod);

    dom.cancelConfigGradesBtn.addEventListener('click', modals.hideConfigGradesModal);
    dom.addGradeFieldBtn.addEventListener('click', handleAddGradeField);
    dom.configGradesForm.addEventListener('submit', handleConfigGradesSubmit);
    dom.disciplinesList.addEventListener('input', handleGradeInput);

    document.addEventListener('click', handleOutsideClick, true);
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

async function handlePeriodFormSubmit(e) {
    e.preventDefault();
    const { activeEnrollmentId } = getState();
    const periodName = dom.addPeriodForm.querySelector('#period-name').value;
    if (!periodName) return alert("O nome do período é obrigatório.");
    try {
        const newPeriodDoc = await firestoreApi.createPeriod(activeEnrollmentId, periodName);
        modals.hidePeriodModal();
        await view.showDashboardView(activeEnrollmentId);
    } catch (error) {
        console.error("Erro ao criar período:", error);
    }
}

async function handleAppContainerClick(e) {
    const enrollmentCard = e.target.closest('#enrollments-list [data-id]');
    if (enrollmentCard) {
        const id = enrollmentCard.dataset.id;
        if (e.target.closest('.edit-btn')) {
            modals.showEnrollmentModal(id);
        } else if (e.target.closest('.delete-btn')) {
            modals.showConfirmDeleteModal({ type: 'enrollment', id });
        } else {
            view.showDashboardView(id);
        }
        return; // Evita que outros handlers disparem
    }

    // NOVO: Handler para o botão "Ver Painel" do dashboard geral
    const viewDashboardBtn = e.target.closest('.view-enrollment-dashboard-btn');
    if (viewDashboardBtn) {
        const enrollmentId = viewDashboardBtn.dataset.id;
        view.showDashboardView(enrollmentId);
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
        // Ao reconfigurar, limpamos as notas antigas
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

    // Limpa o timeout anterior a cada nova digitação
    clearTimeout(gradeInputTimeout);

    const input = e.target;
    const disciplineId = input.dataset.disciplineId;
    const gradeIndex = parseInt(input.dataset.gradeIndex, 10);
    const grade = input.value === '' ? null : parseFloat(input.value);

    // Validação visual imediata para o usuário
    if (grade !== null && (grade < 0 || grade > 10)) {
        input.classList.add('border', 'border-danger'); // Adiciona uma borda vermelha
        return;
    } else {
        input.classList.remove('border', 'border-danger');
    }

    const { activeEnrollmentId, activePeriodId } = getState();
    const cardElement = input.closest('[data-id]');
    
    // Inicia um novo timeout para salvar e atualizar a UI
    gradeInputTimeout = setTimeout(async () => {
        try {
            await firestoreApi.saveGrade(grade, gradeIndex, { enrollmentId: activeEnrollmentId, periodId: activePeriodId, disciplineId });
            
            // Após salvar, busca apenas os dados atualizados da disciplina específica
            const disciplineSnap = await firestoreApi.getDiscipline(activeEnrollmentId, activePeriodId, disciplineId);
            if (disciplineSnap.exists()) {
                const updatedData = disciplineSnap.data();
                // Recalcula a média com os dados novos
                const newAverage = calculateAverage(updatedData);
                // Atualiza SOMENTE a média no card, sem piscar
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
    const target = e.target;
    const disciplineCard = target.closest('[data-id]');
    if (!disciplineCard) return;

    const id = disciplineCard.dataset.id;
    
    // Controla o menu dropdown
    if (target.closest('.discipline-menu-btn')) {
        const menu = document.getElementById(`menu-${id}`);
        if (menu) {
            // Fecha todos os outros menus antes de abrir o novo
            document.querySelectorAll('[id^="menu-"]').forEach(m => {
                if (m.id !== menu.id) m.classList.add('hidden');
            });
            menu.classList.toggle('hidden');
        }
        return;
    }

    // Ações dentro do menu ou do card
    const button = target.closest('button[data-id], a[data-id]');
    if(!button) return;

    const name = button.dataset.name;
    const { activeEnrollmentId, activePeriodId } = getState();

    // Fecha o menu após clicar em uma opção
    const menu = document.getElementById(`menu-${id}`);
    if (menu) menu.classList.add('hidden');

    if (button.matches('.edit-discipline-btn')) {
        modals.showDisciplineModal(id);
    } else if (button.matches('.delete-discipline-btn')) {
        modals.showConfirmDeleteModal({ type: 'discipline', id, enrollmentId: activeEnrollmentId, periodId: activePeriodId });
    } else if (button.matches('.add-absence-btn')) {
        modals.showAbsenceModal(id, name);
    } else if (button.matches('.absence-history-btn')) {
        modals.showAbsenceHistoryModal(id, name);
        view.renderAbsenceHistory(activeEnrollmentId, activePeriodId, id);
    } else if (button.matches('.config-grades-btn')) {
        modals.showConfigGradesModal(id, name);
    }
}

function handleOutsideClick(e) {
    // Fecha o menu de opções da disciplina
    const openMenu = document.querySelector('[id^="menu-"]:not(.hidden)');
    if (openMenu && !openMenu.previousElementSibling.contains(e.target)) {
        openMenu.classList.add('hidden');
    }

    // Fecha o menu de opções do período
    if (!dom.periodMenu.classList.contains('hidden') && !dom.managePeriodBtn.contains(e.target)) {
        dom.periodMenu.classList.add('hidden');
    }

    // Fecha modais clicando no fundo
    const activeModal = document.querySelector('.fixed.inset-0.flex:not(.hidden)');
    if (activeModal && activeModal === e.target) {
        // Uma forma simples de fechar qualquer modal aberto
        modals.hideAllModals(); 
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
