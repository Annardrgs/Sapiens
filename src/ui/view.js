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

export function showEnrollmentsView() {
    if (sortableInstances.disciplines && sortableInstances.disciplines.el) {
        try { sortableInstances.disciplines.destroy(); } catch (e) {}
    }
    sortableInstances.disciplines = null;

    if (dom.dashboardView) dom.dashboardView.classList.add('hidden');
    if (dom.enrollmentsView) dom.enrollmentsView.classList.remove('hidden');
    if (dom.generalDashboard) dom.generalDashboard.classList.add('hidden'); // Simplifica a tela
    
    setState('activeEnrollmentId', null);
    setState('activePeriodId', null);
    renderEnrollments();
}

// --- RENDERIZAÇÃO DE CONTEÚDO ---
export function renderUserEmail(email) {
    if(dom.userEmailDisplay) dom.userEmailDisplay.textContent = email;
}

export async function renderEnrollments() {
  if (!dom.enrollmentsList) return;
  dom.enrollmentsList.innerHTML = `<p class="text-subtle">Carregando...</p>`;
  const enrollments = await api.getEnrollments();
  dom.enrollmentsList.innerHTML = '';
  if (!enrollments.length) {
    dom.enrollmentsList.innerHTML = `<p class="text-subtle col-span-full text-center">Nenhuma matrícula encontrada.</p>`;
    return;
  }
  enrollments.forEach(e => dom.enrollmentsList.appendChild(createEnrollmentCard(e)));
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
    enrollmentSection.dataset.id = data.enrollmentId; // Adiciona o ID para o listener
    const disciplinesToShow = data.disciplines.slice(0, 3);
    
    // REMOVIDO o botão "Ver Painel" daqui
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
    if (!dom.dashboardView || !dom.enrollmentsView) return;

    if (dom.enrollmentsView) dom.enrollmentsView.classList.add('hidden');
    if (dom.disciplineDashboardView) dom.disciplineDashboardView.classList.add('hidden'); // Adicione esta linha
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
        
        // A busca já está ordenada do mais antigo para o mais novo (asc)
        const periods = await api.getPeriods(enrollmentId);
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
                // Pega o último da lista de períodos abertos (que é o mais novo)
                const newestOpenPeriod = openPeriods[openPeriods.length - 1];
                activeIndex = periods.indexOf(newestOpenPeriod);
                // Atualiza o período ativo no banco de dados para lembrar dessa escolha
                await api.updateActivePeriod(enrollmentId, newestOpenPeriod.id);
            } else {
                // Se todos os períodos estiverem encerrados, exibe o mais recente (o último da lista)
                activeIndex = periods.length > 0 ? periods.length - 1 : -1;
            }
        }
        
        // Define o índice ativo (ou 0 como padrão se algo der errado)
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
            responsive: true, // <-- Mantenha como true
            maintainAspectRatio: false, // <-- ESSA É A CHAVE: Diz ao gráfico para não manter a proporção e preencher a div
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

function renderEvaluationsList(discipline) {
    if (!dom.evaluationsList) return;
    dom.evaluationsList.innerHTML = '';

    if (!discipline.grades || discipline.grades.length === 0) {
        dom.evaluationsList.innerHTML = `<p class="text-sm text-subtle">Nenhuma avaliação configurada.</p>`;
        return;
    }

    discipline.grades.forEach((grade, index) => {
        const gradeValue = grade.grade ?? '-';
        const evaluationEl = document.createElement('div');
        evaluationEl.className = 'bg-bkg p-3 rounded-lg flex justify-between items-center border border-transparent';
        
        // Adicionamos data-action e data-index para identificar o clique
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
    if (!dom.dashboardView || !dom.disciplineDashboardView) return;

    // Garante que outras telas estejam escondidas
    dom.dashboardView.classList.add('hidden');
    dom.enrollmentsView.classList.add('hidden');
    dom.disciplineDashboardView.classList.remove('hidden');

    const { activeEnrollmentId, activePeriodId } = getState();
    setState('activeDisciplineId', disciplineId); // Armazena o ID da disciplina ativa

    const enrollmentSnap = await api.getEnrollment(activeEnrollmentId);
    const disciplineSnap = await api.getDiscipline(activeEnrollmentId, activePeriodId, disciplineId);

    if (disciplineSnap.exists() && enrollmentSnap.exists()) {
        const discipline = { id: disciplineSnap.id, ...disciplineSnap.data() };
        const enrollmentData = enrollmentSnap.data();

        // --- INÍCIO DAS VERIFICAÇÕES DE SEGURANÇA ---
        // Preenche os dados do cabeçalho
        if (dom.disciplineDashTitle) dom.disciplineDashTitle.textContent = discipline.name;
        if (dom.disciplineDashSubtitle) dom.disciplineDashSubtitle.textContent = discipline.teacher || 'Professor não definido';
        
        // Passa os dados para o botão "Gerenciar"
        if (dom.disciplineDashConfigGradesBtn) {
            dom.disciplineDashConfigGradesBtn.dataset.id = discipline.id;
            dom.disciplineDashConfigGradesBtn.dataset.name = discipline.name;
        }
        // --- FIM DAS VERIFICAÇÕES DE SEGURANÇA ---
        
        // Chama todas as funções de renderização para construir a tela
        renderStatCards(discipline, enrollmentData);
        renderAbsenceControls(discipline);
        renderEvaluationsList(discipline);
        renderPerformanceChartWithChartJS(discipline);
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
    dom.disciplinesList.innerHTML = ''; // Limpa antes de adicionar
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
        dateClick: (info) => modals.showEventModal(null, info.dateStr), // Cria novo evento
        eventClick: (info) => modals.showEventModal(info.event.id), // Edita evento existente
        // ... (resto das opções)
    });
    calendar.render();
}

export function renderWeeklyClasses(disciplines) {
    const container = dom.agendaContentContainer;
    if (!container) return;

    const dayOrder = { 'Seg': 1, 'Ter': 2, 'Qua': 3, 'Qui': 4, 'Sex': 5, 'Sab': 6, 'Dom': 7 };

    // 1. Cria uma lista plana de todas as aulas agendadas
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

    // 2. Ordena a lista por dia da semana e depois por horário
    allSchedules.sort((a, b) => {
        const dayDiff = (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99);
        if (dayDiff !== 0) return dayDiff;
        return a.time.localeCompare(b.time);
    });

    if (allSchedules.length === 0) {
        container.innerHTML = `<div class="bg-surface border border-border p-4 rounded-lg text-center text-subtle">Nenhuma aula cadastrada neste período.</div>`;
        return;
    }

    // 3. Renderiza a nova lista simplificada
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
    
    // --- LÓGICA DE FILTRO ADICIONADA ---
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // Mês atual (0-11)

    const eventsThisMonth = allEvents.filter(event => {
        const eventDate = new Date(event.start.replace(/-/g, '/') + ' 00:00:00');
        return eventDate.getFullYear() === currentYear && eventDate.getMonth() === currentMonth;
    });
    // --- FIM DA LÓGICA DE FILTRO ---

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

    // 1. Pega os dados do usuário, incluindo os lembretes já dispensados
    const userSnap = await api.getUserDoc();
    const dismissedIds = userSnap.exists() ? userSnap.data().dismissedReminderIds || [] : [];

    const allEnrollments = await api.getEnrollments();
    if (allEnrollments.length === 0) return;

    let allEvents = [];
    for (const enrollment of allEnrollments) {
        if (enrollment.activePeriodId) {
            const events = await api.getCalendarEvents(enrollment.id, enrollment.activePeriodId);
            // Incluindo o ID do evento para rastreamento
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

        // 2. Verifica se o lembrete está ativo E se NÃO FOI dispensado
        if (reminderDate <= today && eventDate >= today && !dismissedIds.includes(event.eventId)) {
            activeReminders.push(event);
        }
    });

    if (activeReminders.length > 0) {
        dom.notificationBadge.classList.remove('hidden');
        dom.notificationList.innerHTML = activeReminders.map(event => {
            const eventDate = new Date(event.start.replace(/-/g, '/') + ' 00:00:00');
            // 3. Adiciona o data-event-id ao item da lista
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

    // ---- CORREÇÃO CRÍTICA ABAIXO ----
    // Armazena as disciplinas no estado global para que outras funções possam acessá-las
    setState('disciplines', disciplines); 
    
    renderSummaryCards(disciplines, currentPeriod);
    renderDisciplines(activeEnrollmentId, activePeriodId, enrollmentData, isPeriodClosed);
    
    // Agora que o estado está correto, a agenda será renderizada
    renderWeeklyClasses(disciplines); 
    
    renderInteractiveCalendar(disciplines, currentPeriod);
}