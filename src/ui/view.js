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
    dom.evaluationsList.innerHTML = ''; // Limpa a lista

    if (!discipline.grades || discipline.grades.length === 0) {
        dom.evaluationsList.innerHTML = `<p class="text-sm text-subtle">Nenhuma avaliação configurada.</p>`;
        return;
    }

    discipline.grades.forEach(grade => {
        const evaluationEl = document.createElement('div');
        evaluationEl.className = 'bg-bkg p-3 rounded-lg flex justify-between items-center border border-border';
        evaluationEl.innerHTML = `
            <span class="font-semibold text-secondary">${grade.name}</span>
            <span class="font-bold text-lg text-primary">${grade.grade ?? '-'}</span>
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

async function renderInteractiveCalendar(disciplines, period) { // A função agora é async
    const calendarEl = dom.calendarContainer;
    if (!calendarEl) return;
    calendarEl.innerHTML = '';

    const { activeEnrollmentId, activePeriodId } = getState();
    const events = await api.getCalendarEvents(activeEnrollmentId, activePeriodId);

    const calendar = new Calendar(calendarEl, {
        plugins: [dayGridPlugin, interactionPlugin],
        initialView: 'dayGridMonth',
        locale: 'pt-br',
        headerToolbar: { left: 'prev', center: 'title', right: 'next today' },
        height: 'auto',
        events: events, // Carrega os eventos do Firestore
        dateClick: function(info) {
            // Abre o modal ao clicar em um dia
            modals.showEventModal(info.dateStr);
        },
        validRange: {
            start: period.startDate,
            end: period.endDate ? new Date(new Date(period.endDate).setDate(new Date(period.endDate).getDate() + 2)).toISOString().split('T')[0] : undefined
        },
        initialDate: period.startDate || new Date(),
    });
    calendar.render();
}

function renderWeeklyAgenda(disciplines) {
    const container = dom.weeklyAgendaContainer;
    if (!container) return;
    const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let agendaItems = [];
    const dayMap = { 'dom': 0, 'seg': 1, 'ter': 2, 'qua': 3, 'qui': 4, 'sex': 5, 'sab': 6 };

    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dayOfWeek = date.getDay();
        const eventsForDay = disciplines.flatMap(discipline => {
            const schedules = (discipline.schedule || '').split(',').map(s => s.trim().toLowerCase());
            return schedules.filter(schedule => schedule.startsWith(Object.keys(dayMap).find(key => dayMap[key] === dayOfWeek)))
                .map(schedule => {
                    const timeMatch = schedule.match(/(\d{1,2}h?-\d{1,2}h?|\d{1,2}h?)/);
                    return {
                        time: timeMatch ? timeMatch[0].replace(/h/g, ':00') : 'Indefinido',
                        disciplineName: discipline.name,
                        disciplineColor: discipline.color || '#71717a',
                        location: discipline.location
                    };
                });
        });
        if (eventsForDay.length > 0) agendaItems.push({ date, events: eventsForDay });
    }

    if (agendaItems.length === 0) {
        container.innerHTML = `<div class="bg-surface border border-border p-4 rounded-lg text-center text-subtle">Nenhum compromisso para os próximos 7 dias.</div>`;
        return;
    }

    container.innerHTML = agendaItems.map(({ date, events }) => {
        let dayLabel;
        const diffDays = Math.round((date - today) / 86400000);
        if (diffDays === 0) dayLabel = 'Hoje';
        else if (diffDays === 1) dayLabel = 'Amanhã';
        else dayLabel = weekDays[date.getDay()];
        return `
            <div class="agenda-day">
                <h4 class="font-bold text-lg text-secondary mb-2">${dayLabel} <span class="text-sm font-normal text-subtle">${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span></h4>
                <div class="space-y-2">
                    ${events.map(event => `
                        <div class="flex items-center bg-surface border border-border p-3 rounded-lg shadow-sm">
                            <span class="w-2 h-10 rounded-full mr-4 flex-shrink-0" style="background-color: ${event.disciplineColor};"></span>
                            <div class="flex-grow"><p class="font-semibold text-secondary">${event.disciplineName}</p><p class="text-sm text-subtle">${event.location || 'Local não definido'}</p></div>
                            <span class="text-sm font-medium text-primary">${event.time}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
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

    renderSummaryCards(disciplines, currentPeriod);
    renderDisciplines(activeEnrollmentId, activePeriodId, enrollmentData, isPeriodClosed);
    renderWeeklyAgenda(disciplines);
    renderInteractiveCalendar(disciplines, currentPeriod);
}