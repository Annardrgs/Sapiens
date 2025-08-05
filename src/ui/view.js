/**
 * @file Módulo para funções que manipulam a interface do usuário (UI).
 */
import { dom } from './dom.js';
import * as api from '../api/firestore.js';
import { getState, setState } from '../store/state.js';
import { createEnrollmentCard, createDisciplineCard, createAbsenceHistoryItem, calculateAverage } from '../components/card.js';
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import * as modals from './modals.js';
import interactionPlugin from '@fullcalendar/interaction';
import { notify } from './notifications.js';

let sortableInstances = { enrollments: null, disciplines: null };
let performanceChartInstance = null;

/**
 * Atualiza um único card de disciplina na tela com novos dados.
 * @param {object} disciplineData - Os dados atualizados da disciplina.
 */
export function updateDisciplineCard(disciplineData) {
    const cardToReplace = document.querySelector(`#disciplines-list [data-id="${disciplineData.id}"]`);
    if (cardToReplace) {
        const { activeEnrollmentId } = getState();
        api.getEnrollment(activeEnrollmentId).then(enrollmentSnap => {
            if (enrollmentSnap.exists()) {
                const enrollmentData = enrollmentSnap.data();
                const { periods, activePeriodIndex } = getState();
                const isPeriodClosed = periods[activePeriodIndex]?.status === 'closed';
                const newCard = createDisciplineCard(disciplineData, enrollmentData, isPeriodClosed);
                cardToReplace.replaceWith(newCard);
            }
        });
    }
}

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

export async function showEnrollmentsView() {
    if (sortableInstances.disciplines && sortableInstances.disciplines.el) {
        try { sortableInstances.disciplines.destroy(); } catch (e) {}
    }
    sortableInstances.disciplines = null;

    if (dom.dashboardView) dom.dashboardView.classList.add('hidden');
    if (dom.enrollmentsView) dom.enrollmentsView.classList.remove('hidden');
    if (dom.generalDashboard) dom.generalDashboard.classList.add('hidden');
    
    setState('activeEnrollmentId', null);
    setState('activePeriodId', null);
    await renderEnrollments();
    await renderTodoList(); // Renderiza a to-do list na tela de matrículas
}

// --- RENDERIZAÇÃO DE CONTEÚDO ---
export function renderUserEmail(email) {
    if(dom.userEmailDisplay) dom.userEmailDisplay.textContent = email;
}

export async function renderEnrollments() {
  if (!dom.enrollmentsList) return;
  dom.enrollmentsList.innerHTML = `<p class="text-subtle">Carregando...</p>`;
  
  const enrollments = await api.getEnrollments();
  
  // Limpa completamente a lista antes de adicionar os novos cards
  dom.enrollmentsList.innerHTML = ''; 

  if (!enrollments.length) {
    dom.enrollmentsList.innerHTML = `<p class="text-subtle col-span-full text-center">Nenhuma matrícula encontrada.</p>`;
    return;
  }

  // Busca os períodos de todas as matrículas em paralelo para maior eficiência
  const periodPromises = enrollments.map(en => api.getPeriods(en.id));
  const periodsByEnrollment = await Promise.all(periodPromises);

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Zera o tempo para comparar apenas a data

  enrollments.forEach((enrollment, index) => {
    const periods = periodsByEnrollment[index] || [];
    let displayPeriodName = 'Nenhum período';

    // 1. Tenta encontrar um período que inclua a data de hoje
    const currentPeriod = periods.find(p => {
        if (!p.startDate || !p.endDate) return false;
        // As datas do formulário não têm fuso horário, então tratamos como tal
        const startDate = new Date(p.startDate + 'T00:00:00');
        const endDate = new Date(p.endDate + 'T23:59:59');
        return today >= startDate && today <= endDate;
    });

    if (currentPeriod) {
        displayPeriodName = currentPeriod.name;
    } else if (enrollment.activePeriodId) {
        // 2. Se não encontrar, usa o último período ativo salvo
        const activePeriod = periods.find(p => p.id === enrollment.activePeriodId);
        if (activePeriod) {
            displayPeriodName = activePeriod.name;
        }
    } else if (periods.length > 0) {
        // 3. Como último recurso, pega o período mais recente
        displayPeriodName = periods[periods.length - 1].name;
    }
    
    // Adiciona o nome do período dinâmico ao objeto antes de criar o card
    const enrollmentDataForCard = { ...enrollment, displayPeriod: displayPeriodName };
    dom.enrollmentsList.appendChild(createEnrollmentCard(enrollmentDataForCard));
  });
}

async function checkAndCloseOutdatedPeriods(enrollmentId, periods) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compara com o início do dia de hoje

    // Filtra para encontrar apenas os períodos que estão 'ativos' e cuja data final já passou
    const periodsToClose = periods.filter(period => {
        if (period.status !== 'active' || !period.endDate) {
            return false;
        }
        // Trata a data do formulário como 'meia-noite' para evitar problemas de fuso horário
        const endDate = new Date(period.endDate + 'T23:59:59');
        return endDate < today;
    });

    // Se não houver períodos para fechar, não faz nada
    if (periodsToClose.length === 0) {
        return periods;
    }

    try {
        // Cria uma promessa de atualização para cada período a ser encerrado
        const updatePromises = periodsToClose.map(period => 
            api.updatePeriodStatus(enrollmentId, period.id, 'closed')
        );
        // Executa todas as atualizações em paralelo
        await Promise.all(updatePromises);
        
        // Notifica o usuário sobre a ação automática
        notify.info(`${periodsToClose.length} período(s) foram encerrados automaticamente.`);

        // Retorna uma versão atualizada da lista de períodos para a UI
        return periods.map(p => {
            if (periodsToClose.some(ptc => ptc.id === p.id)) {
                return { ...p, status: 'closed' };
            }
            return p;
        });

    } catch (error) {
        console.error("Erro ao encerrar períodos automaticamente:", error);
        notify.error("Não foi possível atualizar o status dos períodos.");
        return periods; // Em caso de erro, retorna a lista original
    }
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
    enrollmentSection.dataset.id = data.enrollmentId;
    const disciplinesToShow = data.disciplines.slice(0, 3);
    
    enrollmentSection.innerHTML = `
      <div class="flex justify-between items-center mb-4">
        <div>
            <h3 class="text-xl font-bold text-secondary">${data.course}</h3>
            <p class="text-sm text-subtle">${data.institution} - Período: ${data.periodName}</p>
        </div>
        <button class="view-enrollment-dashboard-btn text-sm text-primary hover:underline">
            Ver detalhes
        </button>
      </div>
      <div class="space-y-3">
        ${disciplinesToShow.length > 0 ? disciplinesToShow.map(d => `
          <div class="p-3 bg-bkg rounded-md border border-border">
            <p class="font-semibold text-secondary">${d.name}</p>
            <p class="text-xs text-subtle">${d.teacher || 'Professor não definido'}</p>
          </div>
        `).join('') : '<p class="text-sm text-subtle">Nenhuma disciplina cadastrada.</p>'}
      </div>
    `;
    dom.generalDashboardContent.appendChild(enrollmentSection);
  });
}

export async function showDashboardView(enrollmentId) {
    if (dom.courseChecklistView) dom.courseChecklistView.classList.add('hidden');
    if (dom.gradesReportView) dom.gradesReportView.classList.add('hidden');
    if (!dom.dashboardView || !dom.enrollmentsView) return;

    if (dom.enrollmentsView) dom.enrollmentsView.classList.add('hidden');
    if (dom.disciplineDashboardView) dom.disciplineDashboardView.classList.add('hidden');
    if (dom.dashboardView) dom.dashboardView.classList.remove('hidden');
    setState('activeEnrollmentId', enrollmentId);

    // Limpa o conteúdo antigo enquanto carrega
    if (dom.disciplinesList) dom.disciplinesList.innerHTML = `<p class="text-subtle">Carregando...</p>`;
    if (dom.weeklyAgendaContainer) dom.weeklyAgendaContainer.innerHTML = '';
    
    const enrollmentSnap = await api.getEnrollment(enrollmentId);
    if (enrollmentSnap.exists()) {
        const data = enrollmentSnap.data();
        
        if (dom.dashboardTitle) dom.dashboardTitle.textContent = data.course;
        if (dom.dashboardSubtitle) dom.dashboardSubtitle.textContent = data.institution;
        
        // Busca os períodos e verifica se algum precisa ser encerrado
        let periods = await api.getPeriods(enrollmentId);
        periods = await checkAndCloseOutdatedPeriods(enrollmentId, periods); // Lógica de encerramento automático
        
        setState('periods', periods);
        
        let activeIndex = -1;
        const lastActivePeriod = periods.find(p => p.id === data.activePeriodId);

        // Verifica se o último período ativo é válido e não está encerrado
        if (lastActivePeriod && lastActivePeriod.status !== 'closed') {
            activeIndex = periods.indexOf(lastActivePeriod);
        } else {
            // Se estiver encerrado (ou não existir), procura pelo período aberto mais recente
            const openPeriods = periods.filter(p => p.status !== 'closed');
            
            if (openPeriods.length > 0) {
                const newestOpenPeriod = openPeriods[openPeriods.length - 1];
                activeIndex = periods.indexOf(newestOpenPeriod);
                await api.updateActivePeriod(enrollmentId, newestOpenPeriod.id);
            } else {
                // Se todos os períodos estiverem encerrados, exibe o mais recente
                activeIndex = periods.length > 0 ? periods.length - 1 : -1;
            }
        }
        
        setState('activePeriodIndex', activeIndex > -1 ? activeIndex : 0);
        
        await renderPeriodNavigator();
        await refreshDashboard();
    }
}

function renderPerformanceChartWithChartJS(discipline) {
    if (performanceChartInstance) {
        performanceChartInstance.destroy();
    }
    if (!dom.disciplinePerformanceChart) return;
    
    const ctx = dom.disciplinePerformanceChart.getContext('2d');
    const labels = discipline.grades?.map(g => g.name) || [];
    const data = discipline.grades?.map(g => g.grade) || [];
    
    performanceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nota',
                data: data,
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1,
                borderRadius: 4,
                barPercentage: 0.6,
                categoryPercentage: 0.7,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    grid: { color: 'rgba(55, 65, 81, 0.6)' },
                    ticks: { color: '#9ca3af' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

async function renderDisciplineAgenda(disciplineId) {
    if (!dom.disciplineEventsList) return;
    
    const { activeEnrollmentId, activePeriodId } = getState();
    const allEvents = await api.getCalendarEvents(activeEnrollmentId, activePeriodId);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera o horário para comparar apenas a data

    const relatedEvents = allEvents
        .filter(event => {
            const eventDate = new Date(event.start.replace(/-/g, '/') + ' 00:00:00');
            return event.relatedDisciplineId === disciplineId && eventDate >= today;
        })
        .sort((a, b) => new Date(a.start) - new Date(b.start));

    if (relatedEvents.length === 0) {
        dom.disciplineEventsList.innerHTML = `<div class="bg-surface border border-border p-4 rounded-lg text-center text-subtle">Nenhum evento futuro para esta disciplina.</div>`;
        return;
    }

    dom.disciplineEventsList.innerHTML = relatedEvents.map(event => {
        const eventDate = new Date(event.start.replace(/-/g, '/') + ' 00:00:00');
        const formattedDate = eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });

        return `
            <div class="flex items-center bg-surface border border-border p-3 rounded-lg shadow-sm">
                <span class="w-2 h-10 rounded-full mr-4 flex-shrink-0" style="background-color: ${event.backgroundColor};"></span>
                <div class="flex-grow">
                    <p class="font-semibold text-secondary">${event.title}</p>
                    <p class="text-sm text-subtle">${event.category || 'Evento'}</p>
                </div>
                <div class="text-right">
                    <p class="font-semibold text-sm text-primary">${formattedDate}</p>
                </div>
            </div>
        `;
    }).join('');
}

function renderEvaluationsList(discipline) {
    if (!dom.evaluationsList) return;

    const manageButton = document.querySelector('#evaluations-section [data-action="manage-evaluations"]');

    // --- CORREÇÃO APLICADA AQUI ---
    // Se a disciplina tem 'completionDetails', ela foi criada de forma simples.
    // Neste caso, escondemos o botão "Gerenciar".
    if (discipline.completionDetails && manageButton) {
        manageButton.classList.add('hidden');
    } else if (manageButton) {
        manageButton.classList.remove('hidden');
    }

    dom.evaluationsList.innerHTML = '';

    if (!discipline.grades || discipline.grades.length === 0) {
        dom.evaluationsList.innerHTML = `<p class="text-sm text-subtle">Nenhuma avaliação configurada.</p>`;
        return;
    }

    discipline.grades.forEach((grade, index) => {
        const gradeValue = grade.grade ?? '-';
        const evaluationEl = document.createElement('div');
        evaluationEl.className = 'bg-bkg p-3 rounded-lg flex justify-between items-center border border-transparent';

        evaluationEl.innerHTML = `
            <span class="font-semibold text-secondary">${grade.name}</span>
            <span data-action="edit-grade" data-grade-index="${index}" class="font-bold text-lg text-primary cursor-pointer hover:opacity-75 p-1 -m-1">
                ${gradeValue}
            </span>
        `;
        dom.evaluationsList.appendChild(evaluationEl);
    });
}

export async function showDisciplineDashboard(disciplineId) {
    if (dom.gradesReportView) dom.gradesReportView.classList.add('hidden');
    if (dom.courseChecklistView) dom.courseChecklistView.classList.add('hidden');
    if (!dom.dashboardView || !dom.disciplineDashboardView) return;

    dom.dashboardView.classList.add('hidden');
    dom.enrollmentsView.classList.add('hidden');
    dom.disciplineDashboardView.classList.remove('hidden');

    const { activeEnrollmentId, activePeriodId } = getState();
    setState('activeDisciplineId', disciplineId);

    const enrollmentSnap = await api.getEnrollment(activeEnrollmentId);
    const disciplineSnap = await api.getDiscipline(activeEnrollmentId, activePeriodId, disciplineId);

    if (disciplineSnap.exists() && enrollmentSnap.exists()) {
        const discipline = { id: disciplineSnap.id, ...disciplineSnap.data() };
        const enrollmentData = enrollmentSnap.data();

        if (dom.disciplineDashTitle) dom.disciplineDashTitle.textContent = discipline.name;
        if (dom.disciplineDashSubtitle) dom.disciplineDashSubtitle.textContent = discipline.teacher || 'Professor não definido';
        
        // --- CORREÇÃO APLICADA AQUI ---
        // Adiciona TODOS os IDs necessários ao botão "Gerenciar"
        const manageButton = document.querySelector('#evaluations-section [data-action="manage-evaluations"]');
        if (manageButton) {
            manageButton.dataset.periodId = activePeriodId;
            manageButton.dataset.disciplineId = disciplineId; // Adiciona o ID da disciplina
        }
        
        renderStatCards(discipline, enrollmentData);
        renderAbsenceControls(discipline);
        renderEvaluationsList(discipline);
        renderPerformanceChartWithChartJS(discipline);
        renderDisciplineAgenda(disciplineId);
    }
}

function renderAbsenceControls(discipline) {
    const container = document.getElementById('absences-section');
    if (!container) return;

    const workload = Number(discipline.workload) || 0;
    const hoursPerClass = Number(discipline.hoursPerClass) || 1;
    const totalClasses = workload > 0 && hoursPerClass > 0 ? Math.floor(workload / hoursPerClass) : 0;
    const absenceLimit = totalClasses > 0 ? Math.floor(totalClasses * 0.25) : 0;
    const currentAbsences = discipline.absences || 0;
    const absencePercentage = absenceLimit > 0 ? (currentAbsences / absenceLimit) * 100 : 0;
    
    let absenceStatusColor = 'bg-success';
    if (absencePercentage > 66.66) absenceStatusColor = 'bg-danger';
    else if (absencePercentage > 33.33) absenceStatusColor = 'bg-warning';

    container.innerHTML = `
        <h3 class="text-xl font-bold text-secondary mb-4">Controle de Faltas</h3>
        <div class="bg-surface p-4 rounded-xl border border-border space-y-4">
            <div>
                <div class="flex justify-between font-bold text-secondary mb-1">
                    <span>${currentAbsences} / ${absenceLimit}</span>
                    <span>${absencePercentage.toFixed(0)}%</span>
                </div>
                <div class="w-full bg-bkg rounded-full h-2.5">
                    <div class="${absenceStatusColor} h-2.5 rounded-full" style="width: ${Math.min(absencePercentage, 100)}%"></div>
                </div>
            </div>
            <div class="flex gap-3">
                <button data-action="add-absence" data-name="${discipline.name}" class="w-full text-center py-2 px-3 text-sm font-semibold text-primary bg-primary/10 rounded-md hover:bg-primary/20">
                    + Adicionar Falta
                </button>
                <button data-action="history-absence" data-name="${discipline.name}" class="w-full text-center py-2 px-3 text-sm font-semibold text-secondary bg-bkg rounded-md hover:opacity-80 border border-border">
                    Histórico
                </button>
            </div>
        </div>
    `;
}

function renderStatCards(discipline, enrollmentData) {
    const container = document.getElementById('discipline-stats-container');
    if (!container) return;

    const averageGrade = calculateAverage(discipline);
    const passingGrade = enrollmentData.passingGrade || 7.0;
    const currentAbsences = discipline.absences || 0;

    let status = { text: 'Em Andamento', color: 'text-warning' };
    if (averageGrade !== 'N/A') {
        const numericAverage = parseFloat(averageGrade);
        const allGradesFilled = discipline.grades && discipline.grades.every(g => g.grade !== null);
        if (numericAverage >= passingGrade) status = { text: 'Aprovado', color: 'text-success' };
        else if (allGradesFilled) status = { text: 'Reprovado', color: 'text-danger' };
    }

    container.innerHTML = `
        <div class="bg-surface p-4 rounded-xl border border-border">
            <h4 class="text-sm font-bold text-subtle mb-1">Média Atual</h4>
            <p class="text-3xl font-bold text-secondary">${averageGrade}</p>
        </div>
        <div class="bg-surface p-4 rounded-xl border border-border">
            <h4 class="text-sm font-bold text-subtle mb-1">Faltas</h4>
            <p class="text-3xl font-bold text-secondary">${currentAbsences}</p>
        </div>
        <div class="bg-surface p-4 rounded-xl border border-border">
            <h4 class="text-sm font-bold text-subtle mb-1">Status</h4>
            <p class="text-3xl font-bold ${status.color}">${status.text}</p>
        </div>
    `;
}

export async function renderDisciplines(enrollmentId, periodId, enrollmentData, isPeriodClosed = false) {
    if (!dom.disciplinesList) return;
    dom.disciplinesList.innerHTML = '';
    const disciplines = await api.getDisciplines(enrollmentId, periodId);
    if (!disciplines.length) {
        dom.disciplinesList.innerHTML = `<p class="text-subtle col-span-full text-center">Nenhuma disciplina adicionada.</p>`;
        return;
    }
    
    disciplines.forEach(discipline => {
        const card = createDisciplineCard(discipline, enrollmentData, isPeriodClosed);
        dom.disciplinesList.appendChild(card);
    });

    if (sortableInstances.disciplines && sortableInstances.disciplines.el) {
        sortableInstances.disciplines.destroy();
    }
    if (!isPeriodClosed) {
        sortableInstances.disciplines = new Sortable(dom.disciplinesList, {
            animation: 150,
            handle: '.cursor-grab',
            onEnd: (evt) => api.updateDisciplinesOrder(Array.from(evt.to.children), { enrollmentId, periodId }),
        });
    }
}

export async function renderAbsenceHistory(enrollmentId, periodId, disciplineId) {
    dom.absenceHistoryList.innerHTML = `<p class="text-subtle">Carregando histórico...</p>`;
    const history = await api.getAbsenceHistory(enrollmentId, periodId, disciplineId);
    dom.absenceHistoryList.innerHTML = !history.length ? `<p class="text-subtle text-center">Nenhuma falta registrada.</p>` : '';
    const listContainer = document.createElement('div');
    listContainer.className = 'space-y-2';
    history.forEach(item => {
        listContainer.appendChild(createAbsenceHistoryItem(item));
    });
    dom.absenceHistoryList.appendChild(listContainer);
}

export async function renderPeriodNavigator() {
    const { periods, activePeriodIndex } = getState();
    if (!periods || periods.length === 0) {
        dom.currentPeriodName.textContent = 'Nenhum';
        dom.prevPeriodBtn.disabled = true;
        dom.nextPeriodBtn.disabled = true;
        dom.disciplinesList.innerHTML = '<p class="text-subtle col-span-full text-center">Crie um novo período para começar.</p>';
        return;
    }
    const currentPeriod = periods[activePeriodIndex];
    if (!currentPeriod) return;

    setState('activePeriodId', currentPeriod.id);
    dom.currentPeriodName.textContent = currentPeriod.name;
    if (currentPeriod.status === 'closed') {
        dom.currentPeriodName.classList.add('line-through', 'text-subtle');
    } else {
        dom.currentPeriodName.classList.remove('line-through', 'text-subtle');
    }
    dom.prevPeriodBtn.disabled = activePeriodIndex <= 0;
    dom.nextPeriodBtn.disabled = activePeriodIndex >= periods.length - 1;
}

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

function renderSummaryCards(disciplines, period) {
    const container = dom.summaryCardsContainer;
    if (!container) return;
    const totalDisciplines = disciplines.length;
    const nextAssessment = 'N/A';
    const totalAbsences = disciplines.reduce((acc, dis) => acc + (dis.absences || 0), 0);
    const periodStatus = period.status === 'closed' ? 'Encerrado' : 'Em andamento';
    container.innerHTML = `
        <div class="bg-surface p-4 rounded-xl shadow-lg border border-border"><h3 class="text-subtle text-sm font-bold">Total de Disciplinas</h3><p class="text-secondary text-2xl font-bold">${totalDisciplines}</p></div>
        <div class="bg-surface p-4 rounded-xl shadow-lg border border-border"><h3 class="text-subtle text-sm font-bold">Próxima Avaliação</h3><p class="text-secondary text-2xl font-bold">${nextAssessment}</p></div>
        <div class="bg-surface p-4 rounded-xl shadow-lg border border-border"><h3 class="text-subtle text-sm font-bold">Faltas Acumuladas</h3><p class="text-secondary text-2xl font-bold">${totalAbsences}</p></div>
        <div class="bg-surface p-4 rounded-xl shadow-lg border border-border"><h3 class="text-subtle text-sm font-bold">Status do Período</h3><p class="text-secondary text-2xl font-bold">${periodStatus}</p></div>
    `;
}

async function renderInteractiveCalendar(disciplines, period) {
    const calendarEl = dom.calendarContainer;
    if (!calendarEl) return;
    calendarEl.innerHTML = '';

    const { activeEnrollmentId, activePeriodId } = getState();
    const events = await api.getCalendarEvents(activeEnrollmentId, activePeriodId);

    const calendar = new Calendar(calendarEl, {
        plugins: [dayGridPlugin, interactionPlugin],
        locale: 'pt-br',
        height: 'auto',
        events: events,
        headerToolbar: { left: 'prev', center: 'title', right: 'next today' },
        dateClick: (info) => modals.showEventModal(null, info.dateStr),
        eventClick: (info) => modals.showEventModal(info.event.id),
    });
    calendar.render();
}

export function renderWeeklyClasses(disciplines) {
    const container = dom.agendaContentContainer;
    if (!container) return;

    const dayOrder = { 'Seg': 1, 'Ter': 2, 'Qua': 3, 'Qui': 4, 'Sex': 5, 'Sab': 6, 'Dom': 7 };

    const allSchedules = disciplines.flatMap(discipline => 
        (discipline.schedules || []).map(schedule => ({
            disciplineName: discipline.name,
            disciplineColor: discipline.color || '#71717a',
            day: schedule.day,
            time: `${schedule.startTime}-${schedule.endTime}`,
            campus: discipline.campus,
            location: discipline.location,
        }))
    );

    allSchedules.sort((a, b) => {
        const dayDiff = (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99);
        if (dayDiff !== 0) return dayDiff;
        return a.time.localeCompare(b.time);
    });

    if (allSchedules.length === 0) {
        container.innerHTML = `<div class="bg-surface border border-border p-4 rounded-lg text-center text-subtle">Nenhuma aula cadastrada neste período.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="space-y-3">
            ${allSchedules.map(item => `
                <div class="flex items-center bg-surface border border-border p-3 rounded-lg shadow-sm">
                    <span class="w-2 h-10 rounded-full mr-4 flex-shrink-0" style="background-color: ${item.disciplineColor};"></span>
                    <div class="flex-grow">
                        <p class="font-semibold text-secondary">${item.disciplineName}</p>
                        <p class="text-sm text-subtle">${item.campus || ''}${item.campus && item.location ? ' - ' : ''}${item.location || ''}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-semibold text-sm text-secondary">${item.day}</p>
                        <p class="text-sm text-primary">${item.time}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

export async function renderAllEvents() {
    const container = dom.agendaContentContainer;
    if (!container) return;

    const { activeEnrollmentId, activePeriodId } = getState();
    if (!activeEnrollmentId || !activePeriodId) {
        container.innerHTML = '';
        return;
    }
    const allEvents = await api.getCalendarEvents(activeEnrollmentId, activePeriodId);
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const eventsThisMonth = allEvents.filter(event => {
        const eventDate = new Date(event.start.replace(/-/g, '/') + ' 00:00:00');
        return eventDate.getFullYear() === currentYear && eventDate.getMonth() === currentMonth;
    });

    if (eventsThisMonth.length === 0) {
        container.innerHTML = `<div class="bg-surface border border-border p-4 rounded-lg text-center text-subtle">Nenhum evento para o mês atual.</div>`;
        return;
    }

    const eventsByDate = eventsThisMonth.reduce((acc, event) => {
        (acc[event.start] = acc[event.start] || []).push(event);
        return acc;
    }, {});

    const sortedDates = Object.keys(eventsByDate).sort();

    container.innerHTML = sortedDates.map(dateStr => {
        const date = new Date(dateStr.replace(/-/g, '/') + ' 00:00:00');
        const dayLabel = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
        
        return `
            <div class="agenda-day">
                <h4 class="font-bold text-lg text-secondary mb-2">${dayLabel}</h4>
                <div class="space-y-2">
                    ${eventsByDate[dateStr].map(event => `
                        <div class="flex items-center bg-surface border border-border p-3 rounded-lg shadow-sm">
                            <span class="w-2 h-10 rounded-full mr-4 flex-shrink-0" style="background-color: ${event.backgroundColor};"></span>
                            <div class="flex-grow">
                                <p class="font-semibold text-secondary">${event.title}</p>
                            </div>
                            <span class="text-sm font-medium text-primary">${event.category || 'Evento'}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

export async function checkAndRenderNotifications() {
    if (!dom.notificationList || !dom.notificationBadge) return;

    const userSnap = await api.getUserDoc();
    const dismissedIds = userSnap.exists() ? userSnap.data().dismissedReminderIds || [] : [];

    const allEnrollments = await api.getEnrollments();
    if (allEnrollments.length === 0) return;

    let allEvents = [];
    for (const enrollment of allEnrollments) {
        if (enrollment.activePeriodId) {
            const events = await api.getCalendarEvents(enrollment.id, enrollment.activePeriodId);
            allEvents.push(...events.map(e => ({ ...e, courseName: enrollment.course, eventId: e.id })));
        }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let activeReminders = [];
    allEvents.forEach(event => {
        if (!event.reminder || event.reminder === 'none') return;
        const eventDate = new Date(event.start.replace(/-/g, '/') + ' 00:00:00');
        if (isNaN(eventDate.getTime())) return;
        
        let reminderDate = new Date(eventDate);
        if (event.reminder === '1d') reminderDate.setDate(reminderDate.getDate() - 1);
        if (event.reminder === '2d') reminderDate.setDate(reminderDate.getDate() - 2);
        if (event.reminder === '1w') reminderDate.setDate(reminderDate.getDate() - 7);

        if (reminderDate <= today && eventDate >= today && !dismissedIds.includes(event.eventId)) {
            activeReminders.push(event);
        }
    });

    if (activeReminders.length > 0) {
        dom.notificationBadge.classList.remove('hidden');
        dom.notificationList.innerHTML = activeReminders.map(event => {
            const eventDate = new Date(event.start.replace(/-/g, '/') + ' 00:00:00');
            return `
                <div class="p-3 border-b border-border hover:bg-bkg/50" data-event-id="${event.eventId}">
                    <p class="font-semibold text-secondary">${event.title}</p>
                    <p class="text-sm text-subtle">${event.courseName}</p>
                    <p class="text-xs font-bold text-primary mt-1">${eventDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
            `;
        }).join('');
    } else {
        dom.notificationBadge.classList.add('hidden');
        dom.notificationList.innerHTML = `<p class="p-4 text-sm text-subtle text-center">Nenhum lembrete ativo.</p>`;
    }
}

export async function refreshDashboard() {
    const { activeEnrollmentId, activePeriodId, periods, activePeriodIndex } = getState();
    if (!activeEnrollmentId || !activePeriodId) return;
    
    const enrollmentSnap = await api.getEnrollment(activeEnrollmentId);
    if (!enrollmentSnap.exists()) return;
    
    const enrollmentData = enrollmentSnap.data();
    const currentPeriod = periods[activePeriodIndex];
    if (!currentPeriod) return;

    const disciplines = await api.getDisciplines(activeEnrollmentId, activePeriodId);
    const isPeriodClosed = currentPeriod.status === 'closed';

    setState('disciplines', disciplines); 
    
    renderSummaryCards(disciplines, currentPeriod);
    renderDisciplines(activeEnrollmentId, activePeriodId, enrollmentData, isPeriodClosed);
    
    renderWeeklyClasses(disciplines); 
    
    renderInteractiveCalendar(disciplines, currentPeriod);
    renderTodoList();
}

export async function showGradesReportView() {
    if (dom.courseChecklistView) dom.courseChecklistView.classList.add('hidden');
    if (!dom.gradesReportView) return;

    // Esconde as outras telas principais
    dom.dashboardView.classList.add('hidden');
    dom.enrollmentsView.classList.add('hidden');
    dom.disciplineDashboardView.classList.add('hidden');

    // Mostra a tela do boletim
    dom.gradesReportView.classList.remove('hidden');

    const { activeEnrollmentId } = getState();
    const enrollmentSnap = await api.getEnrollment(activeEnrollmentId);
    if (enrollmentSnap.exists()) {
        const enrollmentData = enrollmentSnap.data();
        dom.gradesReportSubtitle.textContent = `${enrollmentData.course} - ${enrollmentData.institution}`;
        // Chama a nova função para preencher o conteúdo do boletim
        await renderGradesReportContent(enrollmentData); 
    }
}

async function renderGradesReportContent(enrollmentData) {
    const { activeEnrollmentId, periods } = getState();
    const passingGrade = enrollmentData.passingGrade || 7.0;

    const container = dom.gradesReportContent;
    container.innerHTML = ''; // Limpa a mensagem "Carregando..."

    const allPeriodsData = [];
    // Busca as disciplinas para cada período
    for (const period of periods) {
        const disciplines = await api.getDisciplines(activeEnrollmentId, period.id);
        allPeriodsData.push({ period, disciplines });
    }

    if (allPeriodsData.length === 0 || allPeriodsData.every(p => p.disciplines.length === 0)) {
        container.innerHTML = `<p class="text-subtle text-center mt-8">Nenhuma disciplina encontrada para gerar o boletim.</p>`;
        return;
    }

    let totalWeightedGradeSum = 0;
    let totalWorkloadSum = 0;

    const reportContainer = document.createElement('div');
    reportContainer.className = 'space-y-8';

    // Itera dos períodos mais recentes para os mais antigos
    for (let i = allPeriodsData.length - 1; i >= 0; i--) {
        const { period, disciplines } = allPeriodsData[i];
        if (disciplines.length === 0) continue;

        let periodWeightedGradeSum = 0;
        let periodWorkloadSum = 0;

        const periodSection = document.createElement('section');
        periodSection.innerHTML = `<h3 class="text-2xl font-bold text-secondary mb-4">Período: ${period.name}</h3>`;
        
        // --- INÍCIO DA CORREÇÃO ---
        // 1. Cria uma div para envolver a tabela
        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'bg-surface rounded-xl shadow-md border border-border overflow-hidden';

        // 2. A tabela em si não precisa mais das classes de estilo, apenas de layout
        const table = document.createElement('table');
        table.className = 'w-full text-left border-collapse'; 
        table.innerHTML = `
            <thead>
                <tr class="border-b border-border">
                    <th class="p-4">Disciplina</th>
                    <th class="p-4 text-center">Média Final</th>
                    <th class="p-4 text-center">Status</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        disciplines.forEach(discipline => {
            const averageGradeString = calculateAverage(discipline);
            const averageGrade = parseFloat(averageGradeString);
            const workload = parseInt(discipline.workload);

            let status = { text: 'Em Andamento', color: 'text-warning' };
            const allGradesFilled = discipline.grades && discipline.grades.length > 0 && discipline.grades.every(g => g.grade !== null);

            if (!isNaN(averageGrade) && allGradesFilled) {
                status = averageGrade >= passingGrade 
                    ? { text: 'Aprovado', color: 'text-success' } 
                    : { text: 'Reprovado', color: 'text-danger' };

                if (workload > 0) {
                    periodWeightedGradeSum += averageGrade * workload;
                    periodWorkloadSum += workload;
                    totalWeightedGradeSum += averageGrade * workload;
                    totalWorkloadSum += workload;
                }
            }
            
            const tr = document.createElement('tr');
            tr.className = 'border-b border-border last:border-b-0';
            tr.innerHTML = `
                <td class="p-4 font-semibold">${discipline.name}</td>
                <td class="p-4 text-center font-bold">${averageGradeString}</td>
                <td class="p-4 text-center font-bold ${status.color}">${status.text}</td>
            `;
            tbody.appendChild(tr);
        });

        const periodCR = periodWorkloadSum > 0 ? (periodWeightedGradeSum / periodWorkloadSum).toFixed(2) : 'N/A';
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'mt-4 text-right';
        summaryDiv.innerHTML = `<span class="font-bold text-lg">CR do Período:</span> <span class="text-primary font-extrabold text-xl">${periodCR}</span>`;
        
        // 3. Adiciona a tabela à div wrapper, e a div wrapper à seção
        tableWrapper.appendChild(table);
        periodSection.appendChild(tableWrapper);
        periodSection.appendChild(summaryDiv);
        reportContainer.appendChild(periodSection);
        // --- FIM DA CORREÇÃO ---
    }
    
    // Calcula e exibe o CR Geral no topo
    const overallCR = totalWorkloadSum > 0 ? (totalWeightedGradeSum / totalWorkloadSum).toFixed(2) : 'N/A';
    const overallCRDiv = document.createElement('div');
    overallCRDiv.className = 'bg-surface p-6 rounded-xl shadow-lg border border-border mb-8';
    overallCRDiv.innerHTML = `
        <h3 class="text-xl font-bold text-subtle">Coeficiente de Rendimento (CR) Geral</h3>
        <p class="text-5xl font-extrabold text-primary mt-2">${overallCR}</p>
    `;

    container.appendChild(overallCRDiv);
    container.appendChild(reportContainer);
}

export async function renderTodoList() {
    if (!dom.todoItemsList) return;

    const todos = await api.getTodosForToday();

    dom.todoItemsList.innerHTML = ''; // Limpa a lista antes de renderizar

    if (todos.length === 0) {
        dom.todoItemsList.innerHTML = '<p class="text-sm text-subtle text-center">Nenhuma tarefa para hoje.</p>';
        return;
    }

    todos.forEach(todo => {
        const todoElement = createTodoItemElement(todo);
        dom.todoItemsList.appendChild(todoElement);
    });
}

export function createTodoItemElement(todo) {
    const todoItem = document.createElement('div');
    todoItem.className = 'flex items-center gap-3 p-2 rounded-md hover:bg-bkg animate-fade-in-down';
    // Adicionamos data-action="edit-todo" e um data-text para facilitar a edição
    todoItem.innerHTML = `
        <input type="checkbox" id="todo-${todo.id}" data-action="toggle-todo" data-id="${todo.id}" class="h-5 w-5 rounded text-primary border-border focus:ring-primary flex-shrink-0" ${todo.completed ? 'checked' : ''}>
        <label for="todo-${todo.id}" 
               class="flex-grow text-secondary cursor-pointer ${todo.completed ? 'line-through text-subtle' : ''}"
               data-action="edit-todo"
               data-id="${todo.id}"
               data-text="${todo.text}">
            ${todo.text}
        </label>
        <button data-action="delete-todo" data-id="${todo.id}" class="p-1 rounded-full text-subtle hover:bg-danger/20 hover:text-danger flex-shrink-0">
            <svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
    `;
    return todoItem;
}

export async function showCourseChecklistView() {
    if (!dom.courseChecklistView) return;

    // Esconde as outras telas
    dom.dashboardView.classList.add('hidden');
    dom.gradesReportView.classList.add('hidden');
    dom.disciplineDashboardView.classList.add('hidden');

    // Mostra a tela da grade
    dom.courseChecklistView.classList.remove('hidden');

    const { activeEnrollmentId } = getState();
    const enrollmentSnap = await api.getEnrollment(activeEnrollmentId);
    if (enrollmentSnap.exists()) {
        const data = enrollmentSnap.data();
        dom.checklistSubtitle.textContent = `${data.course} - ${data.institution}`;
    }

    await renderChecklistContent(); // Exibe o conteúdo
}

export function showCurriculumSubjectModal(subjectId = null) {
    if (!dom.addCurriculumSubjectModal) return;
    dom.addCurriculumSubjectForm.reset();
    setState('editingCurriculumSubjectId', subjectId);

    // Lógica para edição (será implementada no futuro)
    // if (subjectId) { ... }
    
    showModal(dom.addCurriculumSubjectModal);
}

export function hideCurriculumSubjectModal() { hideModal(dom.addCurriculumSubjectModal); }

export async function renderChecklistContent() {
    if (!dom.checklistContent) return;
    dom.checklistContent.innerHTML = '<p class="text-subtle">Sincronizando e carregando grade...</p>';

    const { activeEnrollmentId } = getState();

    // Busca os dados da matrícula para obter a média de aprovação
    const enrollmentSnap = await api.getEnrollment(activeEnrollmentId);
    if (!enrollmentSnap.exists()) return;
    const enrollmentData = enrollmentSnap.data();
    const passingGrade = enrollmentData.passingGrade || 7.0;

    const curriculumSubjectsPromise = api.getCurriculumSubjects(activeEnrollmentId);
    const allTakenDisciplinesPromise = api.getAllTakenDisciplines(activeEnrollmentId);
    let [curriculumSubjects, allTakenDisciplines] = await Promise.all([curriculumSubjectsPromise, allTakenDisciplinesPromise]);
    
    const curriculumCodes = new Set(curriculumSubjects.map(s => s.code));
    
    const subjectsToSync = allTakenDisciplines.filter(d => d.code && !curriculumCodes.has(d.code));
    if (subjectsToSync.length > 0) {
        const syncPromises = subjectsToSync.map(d => {
            const payload = { name: d.name, code: d.code, period: 0 };
            return api.saveCurriculumSubject(payload, { enrollmentId: activeEnrollmentId });
        });
        await Promise.all(syncPromises);
        curriculumSubjects = await api.getCurriculumSubjects(activeEnrollmentId);
    }

    if (curriculumSubjects.length === 0) {
        dom.checklistContent.innerHTML = `<div class="text-center p-8 bg-surface rounded-xl border border-border">
            <h3 class="font-bold text-secondary">Nenhuma disciplina na sua grade</h3>
            <p class="text-subtle text-sm mt-2">Comece adicionando as disciplinas do seu curso para acompanhar seu progresso.</p>
        </div>`;
        return;
    }

    // Cria um mapa para acesso fácil às disciplinas cursadas
    const takenDisciplinesMap = new Map(allTakenDisciplines.map(d => [d.code, d]));

    const subjectsByPeriod = curriculumSubjects.reduce((acc, subject) => {
        const period = subject.period || 0;
        if (!acc[period]) acc[period] = [];
        acc[period].push(subject);
        return acc;
    }, {});

    dom.checklistContent.innerHTML = Object.keys(subjectsByPeriod).sort((a,b) => a - b).map(periodNumber => {
        const isUnsorted = periodNumber === "0";
        const periodTitle = isUnsorted ? "Disciplinas a Organizar" : `${periodNumber}º Período`;
        const titleColorClass = isUnsorted ? "text-danger" : "text-secondary";
        
        return `
            <div class="mb-8">
                <h3 class="text-xl font-bold ${titleColorClass} mb-4">${periodTitle}</h3>
                <div class="bg-surface rounded-xl border border-border p-2 sm:p-4">
                    ${subjectsByPeriod[periodNumber].map(subject => {
                        const takenDiscipline = takenDisciplinesMap.get(subject.code);
                        let isCompleted = false; // Começa como falso
                        
                        // --- LÓGICA DE CONCLUSÃO CORRIGIDA ---
                        if (takenDiscipline) {
                            const averageGrade = parseFloat(calculateAverage(takenDiscipline));
                            const allGradesFilled = takenDiscipline.grades && takenDiscipline.grades.length > 0 && takenDiscipline.grades.every(g => g.grade !== null);
                            if (!isNaN(averageGrade) && allGradesFilled && averageGrade >= passingGrade) {
                                isCompleted = true;
                            }
                        }

                        return `
                        <div data-action="edit-curriculum-subject" data-id="${subject.id}" class="flex items-center justify-between p-3 rounded-md hover:bg-bkg cursor-pointer group">
                            <div class="flex items-center">
                                <div class="mr-4">
                                    ${isCompleted
                                        ? `<div class="w-6 h-6 rounded-full bg-success flex items-center justify-center text-white" title="Disciplina Aprovada"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg></div>`
                                        : `<button data-action="mark-subject-completed" data-id='${subject.id}' data-name='${subject.name}' data-code='${subject.code}' class="w-6 h-6 rounded-full bg-bkg border border-border hover:bg-primary/20" title="Marcar como concluída"></button>`
                                    }
                                </div>
                                <div>
                                    <p class="font-semibold text-secondary flex items-baseline">
                                        ${subject.name}
                                        <span class="ml-2 text-xs font-mono text-subtle">(${subject.code})</span>
                                    </p>
                                </div>
                            </div>
                            <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                                <button data-action="view-curriculum-subject-details" data-id="${subject.id}" class="p-2 rounded-full text-subtle hover:bg-bkg" title="Ver detalhes">
                                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </button>
                            </div>
                        </div>
                    `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}