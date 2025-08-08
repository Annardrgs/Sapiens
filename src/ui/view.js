/**
 * @file Módulo para funções que manipulam a interface do usuário (UI).
 */
import { dom } from './dom.js';
import * as api from '../api/firestore.js';
import { getState, setState } from '../store/state.js';
import { createEnrollmentCard, createDisciplineCard, createDocumentCard, createAbsenceHistoryItem, calculateAverage, createSummaryCard } from '../components/card.js';
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import * as modals from './modals.js';
import interactionPlugin from '@fullcalendar/interaction';
import { notify } from './notifications.js';
import * as pomodoro from './pomodoro.js';
import { navigate } from '../main.js';
import { selectDropdownItem } from './modals.js';

let calendarInstance = null;
let performanceChart = null;
let sortableInstances = { enrollments: null, disciplines: null };
let performanceChartInstance = null;

// --- FUNÇÕES DE CONTROLE DE VISIBILIDADE ---
function hideAllViews() {
    if (dom.enrollmentsView) dom.enrollmentsView.classList.add('hidden');
    if (dom.dashboardView) dom.dashboardView.classList.add('hidden');
    if (dom.disciplineDashboardView) dom.disciplineDashboardView.classList.add('hidden');
    if (dom.gradesReportView) dom.gradesReportView.classList.add('hidden');
    if (dom.courseChecklistView) dom.courseChecklistView.classList.add('hidden');
    if (dom.documentsView) dom.documentsView.classList.add('hidden');
}

export function showAuthScreen() {
    dom.authScreen.classList.remove('hidden');
    dom.appContainer.classList.add('hidden');
    updateAuthView();
}

export function showAppScreen() {
    dom.authScreen.classList.add('hidden');
    dom.appContainer.classList.remove('hidden');
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
}

export async function showEnrollmentsView() {
    // CORREÇÃO: Reseta o ID da matrícula ativa ao voltar para a tela principal.
    setState('activeEnrollmentId', null);

    hideAllViews();
    dom.enrollmentsView.classList.remove('hidden');
    await renderEnrollments();
    await renderTodoList();
    await renderUpcomingEvents();
}

export async function showDashboardView(enrollmentId) {
    hideAllViews();
    setState('activeEnrollmentId', enrollmentId);
    dom.dashboardView.classList.remove('hidden');
    
    showLoading(true);

    try {
        const enrollmentSnap = await api.getEnrollment(enrollmentId);
        if (!enrollmentSnap.exists()) {
            navigate('/');
            return;
        }
        const enrollment = { id: enrollmentSnap.id, ...enrollmentSnap.data() };
        setState('activeEnrollment', enrollment);
        dom.dashboardTitle.textContent = enrollment.course;
        dom.dashboardSubtitle.textContent = enrollment.institution;

        const periods = await api.getPeriods(enrollmentId);
        setState('periods', periods);
        
        let activePeriodIndex = periods.findIndex(p => p.id === enrollment.activePeriodId);
        if (activePeriodIndex === -1 && periods.length > 0) {
            activePeriodIndex = 0;
            await api.updateActivePeriod(enrollmentId, periods[0].id);
        }
        setState('activePeriodIndex', activePeriodIndex);

        if (periods.length > 0) {
            await renderPeriodNavigator();
            await refreshDashboard();
            
            const currentPeriod = periods[activePeriodIndex];
            const isClosed = currentPeriod?.status === 'closed';
            if (dom.newPeriodBtn) dom.newPeriodBtn.disabled = isClosed;
            if (dom.addDisciplineBtn) dom.addDisciplineBtn.disabled = isClosed;
            
            const dashboardButtons = dom.dashboardView.querySelectorAll('button:not(#prev-period-btn):not(#next-period-btn):not(#back-to-enrollments-btn)');
            dashboardButtons.forEach(btn => {
                if (btn.id !== 'manage-period-btn') {
                     btn.classList.toggle('opacity-50', isClosed);
                     btn.classList.toggle('cursor-not-allowed', isClosed);
                }
            });
        } else {
            dom.disciplinesList.innerHTML = `<div class="text-center p-8 bg-surface rounded-lg border border-border"><p class="text-subtle">Nenhum período letivo encontrado.</p><button id="new-period-btn" class="mt-4 bg-primary text-bkg font-bold py-2 px-4 rounded-lg shadow-md hover:opacity-90">Criar Primeiro Período</button></div>`;
            dom.summaryCardsContainer.innerHTML = '';
            dom.agendaContentContainer.innerHTML = '';
            if (calendarInstance) calendarInstance.destroy();
        }

    } catch (error) {
        console.error("Erro ao carregar o dashboard:", error);
    } finally {
        showLoading(false);
    }
}

export async function showDocumentsView(enrollmentId) {
    hideAllViews();
    dom.documentsView.classList.remove('hidden');
    
    if (enrollmentId) {
        const enrollmentSnap = await api.getEnrollment(enrollmentId);
        if (enrollmentSnap.exists()) {
            const enrollment = enrollmentSnap.data();
            if (dom.documentsTitle) dom.documentsTitle.textContent = "Documentos";
            if (dom.documentsSubtitle) dom.documentsSubtitle.textContent = `${enrollment.course} - ${enrollment.institution}`;
            setState('activeEnrollmentId', enrollmentId);
        }
    } else {
        if (dom.documentsTitle) dom.documentsTitle.textContent = "Todos os Documentos";
        if (dom.documentsSubtitle) dom.documentsSubtitle.textContent = "Biblioteca geral";
        setState('activeEnrollmentId', null);
    }

    const toolbar = document.getElementById('documents-toolbar');
    if (toolbar) {
        toolbar.querySelector('#document-search-input').value = '';
        const dropdowns = toolbar.querySelectorAll('[data-dropdown-container]');
        dropdowns.forEach(container => {
            const firstItem = container.querySelector('li');
            if(firstItem) selectDropdownItem(firstItem);
        });
    }

    await renderDocumentsList(enrollmentId);
}

function showLoading(show = true) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.toggle('hidden', !show);
    }
}

export async function refreshDashboard() {
    showLoading(true);
    try {
        const { activeEnrollmentId, activePeriodId, activeEnrollment, periods, activePeriodIndex } = getState();
        if (!activeEnrollmentId || !activePeriodId) return;

        const disciplines = await api.getDisciplines(activeEnrollmentId, activePeriodId);
        setState('disciplines', disciplines);
        
        const currentPeriod = periods[activePeriodIndex];

        renderSummaryCards(disciplines);
        renderDisciplineCards(disciplines, activeEnrollment);
        renderWeeklyClasses(disciplines);
        await renderInteractiveCalendar(disciplines, currentPeriod);
        checkAndRenderNotifications();
    } catch (error) {
        console.error("Erro ao atualizar o dashboard:", error);
    } finally {
        showLoading(false);
    }
}

export async function renderPeriodNavigator() {
    const { periods, activePeriodIndex } = getState();
    const currentPeriod = periods[activePeriodIndex];

    if (dom.currentPeriodName && currentPeriod) {
        dom.currentPeriodName.textContent = currentPeriod.name;
        const isClosed = currentPeriod.status === 'closed';
        const navigatorContainer = dom.currentPeriodName.parentElement;
        if (navigatorContainer) {
            navigatorContainer.classList.toggle('opacity-50', isClosed);
            navigatorContainer.title = isClosed ? 'Período encerrado' : '';
        }
    }

    if (dom.prevPeriodBtn) dom.prevPeriodBtn.disabled = activePeriodIndex === 0;
    if (dom.nextPeriodBtn) dom.nextPeriodBtn.disabled = activePeriodIndex === periods.length - 1;
}

function renderSummaryCards(disciplines) {
    const { periods, activePeriodIndex } = getState();
    const currentPeriod = periods[activePeriodIndex];

    if (!currentPeriod) {
        if (dom.summaryCardsContainer) dom.summaryCardsContainer.innerHTML = '';
        return;
    }
    
    const isPeriodClosed = currentPeriod.status === 'closed';
    
    const totalDisciplines = disciplines.length;
    const nextEvaluation = 'N/A'; // Lógica a ser implementada
    const totalAbsences = disciplines.reduce((acc, d) => acc + (d.absences || 0), 0);
    const periodStatus = isPeriodClosed ? 'Encerrado' : 'Em Andamento';

    const summaryData = [
        { title: 'Total de Disciplinas', value: totalDisciplines, icon: 'academic-cap' },
        { title: 'Próxima Avaliação', value: nextEvaluation, icon: 'calendar' },
        { title: 'Faltas Acumuladas', value: totalAbsences, icon: 'user-minus' },
        { title: 'Status do Período', value: periodStatus, icon: 'check-circle' }
    ];

    if (dom.summaryCardsContainer) {
        dom.summaryCardsContainer.innerHTML = summaryData.map(createSummaryCard).join('');
    }
}

function renderDisciplineCards(disciplines, enrollmentData) {
    if (!dom.disciplinesList) return;
    if (disciplines.length === 0) {
        dom.disciplinesList.innerHTML = '<p class="text-subtle text-center">Nenhuma disciplina adicionada a este período.</p>';
        return;
    }
    dom.disciplinesList.innerHTML = '';
    const { periods, activePeriodIndex } = getState();
    const isPeriodClosed = periods[activePeriodIndex]?.status === 'closed';

    disciplines.forEach(discipline => {
        const card = createDisciplineCard(discipline, enrollmentData, isPeriodClosed);
        dom.disciplinesList.appendChild(card);
    });
}

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

export function renderUserEmail(email) {
    if(dom.userEmailDisplay) dom.userEmailDisplay.textContent = email;
}

export async function renderEnrollments() {
  if (!dom.enrollmentsList) return;
  dom.enrollmentsList.innerHTML = ''; 

  const enrollments = await api.getEnrollments();
  
  if (!enrollments.length) {
    dom.enrollmentsList.innerHTML = `<p class="text-subtle col-span-full text-center">Nenhuma matrícula encontrada.</p>`;
    return;
  }

  const periodPromises = enrollments.map(en => api.getPeriods(en.id));
  const periodsByEnrollment = await Promise.all(periodPromises);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  enrollments.forEach((enrollment, index) => {
    const periods = periodsByEnrollment[index] || [];
    let displayPeriodName = 'Nenhum período';

    const currentPeriod = periods.find(p => {
        if (!p.startDate || !p.endDate) return false;
        const startDate = new Date(p.startDate + 'T00:00:00');
        const endDate = new Date(p.endDate + 'T23:59:59');
        return today >= startDate && today <= endDate;
    });

    if (currentPeriod) {
        displayPeriodName = currentPeriod.name;
    } else if (enrollment.activePeriodId) {
        const activePeriod = periods.find(p => p.id === enrollment.activePeriodId);
        if (activePeriod) {
            displayPeriodName = activePeriod.name;
        }
    } else if (periods.length > 0) {
        displayPeriodName = periods[periods.length - 1].name;
    }
    
    const enrollmentDataForCard = { ...enrollment, displayPeriod: displayPeriodName };
    dom.enrollmentsList.appendChild(createEnrollmentCard(enrollmentDataForCard));
  });
}

async function checkAndCloseOutdatedPeriods(enrollmentId, periods) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const periodsToClose = periods.filter(period => {
        if (period.status !== 'active' || !period.endDate) {
            return false;
        }
        const endDate = new Date(period.endDate + 'T23:59:59');
        return endDate < today;
    });

    if (periodsToClose.length === 0) {
        return periods;
    }

    try {
        const updatePromises = periodsToClose.map(period => 
            api.updatePeriodStatus(enrollmentId, period.id, 'closed')
        );
        await Promise.all(updatePromises);
        
        notify.info(`${periodsToClose.length} período(s) foram encerrados automaticamente.`);

        return periods.map(p => {
            if (periodsToClose.some(ptc => ptc.id === p.id)) {
                return { ...p, status: 'closed' };
            }
            return p;
        });

    } catch (error) {
        console.error("Erro ao encerrar períodos automaticamente:", error);
        notify.error("Não foi possível atualizar o status dos períodos.");
        return periods;
    }
}

function renderPerformanceChartWithChartJS(discipline) {
    if (performanceChartInstance) {
        performanceChartInstance.destroy();
    }
    const canvas = dom.disciplinePerformanceChart;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.7)');
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0.1)');

    const labels = discipline.grades?.map(g => g.name) || [];
    const data = discipline.grades?.map(g => g.grade) || [];
    
    performanceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nota',
                data: data,
                backgroundColor: gradient,
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 2,
                borderRadius: 6,
                hoverBackgroundColor: 'rgba(79, 70, 229, 0.9)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    grid: { 
                        color: 'rgba(55, 65, 81, 0.4)',
                        borderDash: [2, 4], 
                    },
                    ticks: { color: '#9ca3af', font: { weight: '600' } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af', font: { weight: '600' } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(31, 41, 55, 0.9)',
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 12 },
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: false
                }
            }
        }
    });
}

async function renderDisciplineAgenda(disciplineId) {
    if (!dom.disciplineEventsList) return;
    
    const { activeEnrollmentId, activePeriodId } = getState();
    const allEvents = await api.getCalendarEvents(activeEnrollmentId, activePeriodId);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const relatedEvents = allEvents
        .filter(event => {
            const eventDate = new Date(event.start.replace(/-/g, '/') + ' 00:00:00');
            return event.relatedDisciplineId === disciplineId && eventDate >= today;
        })
        .sort((a, b) => new Date(a.start) - new Date(b.start));

    if (relatedEvents.length === 0) {
        dom.disciplineEventsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                </div>
                <h4 class="empty-state-title">Nenhum evento futuro</h4>
                <p class="empty-state-subtitle">Adicione provas ou trabalhos no calendário principal.</p>
            </div>
        `;
        return;
    }

    dom.disciplineEventsList.innerHTML = relatedEvents.map(event => {
        const eventDate = new Date(event.start.replace(/-/g, '/') + ' 00:00:00');
        const formattedDate = eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

        return `
            <div class="flex items-center bg-bkg p-3 rounded-lg border border-border">
                <span class="w-1.5 h-8 rounded-full mr-3 flex-shrink-0" style="background-color: ${event.backgroundColor};"></span>
                <div class="flex-grow">
                    <p class="font-semibold text-secondary truncate" title="${event.title}">${event.title}</p>
                    <p class="text-xs text-subtle">${event.category || 'Evento'}</p>
                </div>
                <div class="text-right flex-shrink-0 ml-2">
                    <p class="font-semibold text-sm text-primary">${formattedDate}</p>
                </div>
            </div>
        `;
    }).join('');
}

function renderEvaluationsList(discipline) {
    if (!dom.evaluationsList) return;
    dom.evaluationsList.innerHTML = '';

    const { periods, activePeriodIndex } = getState();
    const isPeriodClosed = periods[activePeriodIndex]?.status === 'closed';

    if (!discipline.grades || discipline.grades.length === 0) {
        dom.evaluationsList.innerHTML = `...`; // (O HTML do estado vazio permanece o mesmo)
        return;
    }

    discipline.grades.forEach((grade, index) => {
        const gradeValue = grade.grade ?? '-';
        const evaluationEl = document.createElement('div');
        evaluationEl.className = 'evaluation-item';

        // CORREÇÃO: Desabilita o campo de nota se o período estiver encerrado
        const gradeInputHTML = isPeriodClosed
            ? `<span class="evaluation-item-grade non-editable">${gradeValue}</span>`
            : `<span data-action="edit-grade" data-discipline-id="${discipline.id}" data-grade-index="${index}" class="evaluation-item-grade">${gradeValue}</span>`;

        evaluationEl.innerHTML = `
            <span class="evaluation-item-label" title="${grade.name}">${grade.name}</span>
            ${gradeInputHTML}
        `;
        dom.evaluationsList.appendChild(evaluationEl);
    });
}

export async function showDisciplineDashboard({ enrollmentId, disciplineId }) {
    if (!enrollmentId || !disciplineId) {
        navigate('/');
        return;
    }

    showLoading();

    if (getState().activeEnrollmentId !== enrollmentId || !getState().activePeriodId) {
        setState('activeEnrollmentId', enrollmentId);
        const enrollment = await api.getEnrollment(enrollmentId);
        if (enrollment.exists()) {
            const periods = await api.getPeriods(enrollmentId);
            setState('periods', periods);
            const activePeriod = periods.find(p => p.id === enrollment.data().activePeriodId);
            const activeIndex = periods.indexOf(activePeriod);
            setState('activePeriodIndex', activeIndex > -1 ? activeIndex : 0);
        } else {
            navigate('/');
            showLoading(false);
            return;
        }
    }
    
    dom.dashboardView.classList.add('hidden');
    dom.enrollmentsView.classList.add('hidden');
    dom.disciplineDashboardView.classList.remove('hidden');

    const { activePeriodId, periods, activePeriodIndex } = getState();
    setState('activeDisciplineId', disciplineId);

    const enrollmentSnap = await api.getEnrollment(enrollmentId);
    const disciplineSnap = await api.getDiscipline(enrollmentId, activePeriodId, disciplineId);

    if (disciplineSnap.exists() && enrollmentSnap.exists()) {
        const discipline = { id: disciplineSnap.id, ...disciplineSnap.data() };
        const enrollmentData = enrollmentSnap.data();

        dom.disciplineDashTitle.textContent = discipline.name;
        dom.disciplineDashSubtitle.textContent = discipline.teacher || 'Professor não definido';
        
        const manageButton = document.querySelector('#evaluations-section [data-action="manage-evaluations"]');
        if (manageButton) {
            manageButton.dataset.periodId = activePeriodId;
            manageButton.dataset.disciplineId = disciplineId;
            
            // CORREÇÃO: Esconde o botão se o período estiver encerrado
            const isPeriodClosed = periods[activePeriodIndex]?.status === 'closed';
            manageButton.classList.toggle('hidden', isPeriodClosed);
        }
        
        renderStatCards(discipline, enrollmentData);
        renderAbsenceControls(discipline);
        renderEvaluationsList(discipline);
        renderPerformanceChartWithChartJS(discipline);
        renderDisciplineAgenda(disciplineId);
    }
    showLoading(false);
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
                <button data-action="add-absence" data-id="${discipline.id}" data-name="${discipline.name}" class="w-full text-center py-2 px-3 text-sm font-semibold text-primary bg-primary/10 rounded-md hover:bg-primary/20">
                    + Adicionar Falta
                </button>
                <button data-action="history-absence" data-id="${discipline.id}" data-name="${discipline.name}" class="w-full text-center py-2 px-3 text-sm font-semibold text-secondary bg-bkg rounded-md hover:opacity-80 border border-border">
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

    let status = { text: 'Em Andamento', color: 'text-warning', iconColor: 'bg-warning/10 text-warning' };
    if (discipline.failedByAbsence) {
        status = { text: 'Reprovado', color: 'text-danger', iconColor: 'bg-danger/10 text-danger' };
    } else if (averageGrade !== 'N/A') {
        const numericAverage = parseFloat(averageGrade);
        const allGradesFilled = discipline.grades && discipline.grades.every(g => g.grade !== null);
        if (numericAverage >= passingGrade) {
            status = { text: 'Aprovado', color: 'text-success', iconColor: 'bg-success/10 text-success' };
        } else if (allGradesFilled) {
            status = { text: 'Reprovado', color: 'text-danger', iconColor: 'bg-danger/10 text-danger' };
        }
    }

    const stats = [
        {
            label: 'Média Atual',
            value: averageGrade,
            icon: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" /></svg>`,
            iconColor: 'bg-primary/10 text-primary'
        },
        {
            label: 'Faltas',
            value: currentAbsences,
            icon: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`,
            iconColor: 'bg-primary/10 text-primary'
        },
        {
            label: 'Status',
            value: status.text,
            icon: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`,
            iconColor: status.iconColor,
            valueColor: status.color,
        }
    ];

    container.innerHTML = stats.map(stat => `
        <section class="ui-card">
            <div class="stat-card-lg">
                <div class="stat-card-lg-icon ${stat.iconColor}">${stat.icon}</div>
                <div>
                    <h3 class="card-header">${stat.label}</h3>
                    <p class="stat-card-lg-value ${stat.valueColor || ''}">${stat.value}</p>
                </div>
            </div>
        </section>
    `).join('');
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

async function renderInteractiveCalendar(disciplines, period) {
    const calendarEl = dom.calendarContainer;
    if (!calendarEl) return;
    calendarEl.innerHTML = '';

    const { activeEnrollmentId, activePeriodId } = getState();
    const events = await api.getCalendarEvents(activeEnrollmentId, activePeriodId);

    if (calendarInstance) {
        calendarInstance.destroy();
    }

    calendarInstance = new Calendar(calendarEl, {
        plugins: [dayGridPlugin, interactionPlugin],
        locale: 'pt-br',
        height: 'auto',
        aspectRatio: 1.2,
        events: events,
        buttonText: { today: 'Hoje' },
        headerToolbar: { left: 'prev', center: 'title', right: 'next today' },
        dateClick: (info) => modals.showEventModal(null, info.dateStr),
        eventClick: (info) => modals.showEventModal(info.event.id),
        eventMouseEnter: (info) => {
            const el = info.el;
            el.style.transform = 'scale(1.1)';
            el.style.zIndex = '10';
            const extendedContent = document.createElement('div');
            extendedContent.className = 'fc-extended-content';
            extendedContent.innerHTML = `
                <p class="text-xs text-white/80">${info.event.extendedProps.category || 'Evento'}</p>
            `;
            el.querySelector('.fc-event-title-container').appendChild(extendedContent);
        },
        eventMouseLeave: (info) => {
            const el = info.el;
            el.style.transform = '';
            el.style.zIndex = '';
            const extended = el.querySelector('.fc-extended-content');
            if (extended) extended.remove();
        }
    });
    calendarInstance.render();
}

export async function renderUpcomingEvents() {
    const container = document.getElementById('upcoming-events-list');
    if (!container) return;

    container.innerHTML = `<p class="text-subtle text-center pt-4">Carregando eventos...</p>`;

    try {
        const events = await api.getAllUpcomingEvents();

        if (events.length === 0) {
            container.innerHTML = `<p class="text-subtle text-center pt-4">Nenhum evento futuro.</p>`;
            return;
        }

        container.innerHTML = events.slice(0, 10).map(event => {
            const eventDate = new Date(event.start.replace(/-/g, '/') + ' 00:00:00');
            const formattedDate = eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

            const subtitle = event.disciplineName ? `${event.disciplineName} • ${event.courseName}` : event.courseName;

            return `
                <div class="flex items-center bg-bkg p-3 rounded-lg shadow-sm">
                    <span class="w-2 h-10 rounded-full mr-4 flex-shrink-0" style="background-color: ${event.backgroundColor};"></span>
                    <div class="flex-grow">
                        <p class="font-semibold text-secondary">${event.title}</p>
                        <p class="text-xs text-subtle">${subtitle}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-semibold text-sm text-primary">${formattedDate}</p>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error("Erro ao carregar eventos futuros:", error);
        container.innerHTML = `<p class="text-danger text-center pt-4">Erro ao carregar eventos.</p>`;
    }
}

export async function showGradesReportView(enrollmentId) {
    if (!enrollmentId) {
        const params = new URLSearchParams(window.location.search);
        enrollmentId = params.get('enrollmentId');
        if (!enrollmentId) {
            navigate('/');
            return;
        }
    }
    setState('activeEnrollmentId', enrollmentId);
    showLoading();
    if (dom.courseChecklistView) dom.courseChecklistView.classList.add('hidden');
    if (!dom.gradesReportView) return;

    dom.dashboardView.classList.add('hidden');
    dom.enrollmentsView.classList.add('hidden');
    dom.disciplineDashboardView.classList.add('hidden');

    dom.gradesReportView.classList.remove('hidden');

    const enrollmentSnap = await api.getEnrollment(enrollmentId);
    if (enrollmentSnap.exists()) {
        const enrollmentData = enrollmentSnap.data();
        dom.gradesReportSubtitle.textContent = `${enrollmentData.course} - ${enrollmentData.institution}`;
        await renderGradesReportContent(enrollmentData); 
    }
    showLoading(false);
}

async function renderGradesReportContent(enrollmentData) {
    const { activeEnrollmentId, periods } = getState();
    const passingGrade = enrollmentData.passingGrade || 7.0;

    const container = dom.gradesReportContent;
    container.innerHTML = '';

    const allPeriodsData = [];
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

    for (let i = allPeriodsData.length - 1; i >= 0; i--) {
        const { period, disciplines } = allPeriodsData[i];
        if (disciplines.length === 0) continue;

        let periodWeightedGradeSum = 0;
        let periodWorkloadSum = 0;

        const periodSection = document.createElement('section');
        periodSection.innerHTML = `<h3 class="text-2xl font-bold text-secondary mb-4">Período: ${period.name}</h3>`;
        
        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'bg-surface rounded-xl shadow-md border border-border overflow-hidden';

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
        
        tableWrapper.appendChild(table);
        periodSection.appendChild(tableWrapper);
        periodSection.appendChild(summaryDiv);
        reportContainer.appendChild(periodSection);
    }
    
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
        // CORREÇÃO: Adicionado um ID ao contêiner do estado de lista vazia
        dom.todoItemsList.innerHTML = `
            <div id="todo-empty-state" class="text-center p-6">
                <div class="w-12 h-12 bg-bkg rounded-full flex items-center justify-center mx-auto text-subtle/70 border border-border">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                </div>
                <h4 class="mt-4 font-bold text-secondary">Tudo em ordem!</h4>
                <p class="mt-1 text-sm text-subtle">Nenhuma tarefa para hoje. Adicione uma abaixo.</p>
            </div>
        `;
        return;
    }

    todos.forEach(todo => {
        const todoElement = createTodoItemElement(todo);
        dom.todoItemsList.appendChild(todoElement);
    });
}

export function createTodoItemElement(todo) {
    const todoItem = document.createElement('div');
    const isCompleted = todo.completed;
    const isPinned = todo.isPinned || false;

    todoItem.className = `flex items-center bg-surface border border-border p-3 rounded-lg transition-all duration-200 group ${isCompleted ? 'opacity-60' : ''}`;
    
    // CORREÇÃO: Lógica para visibilidade e preenchimento do ícone de fixar
    const pinButtonVisibility = isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100';
    const pinIconFill = isPinned ? 'fill="currentColor"' : 'fill="none"';

    todoItem.innerHTML = `
        <button data-action="toggle-todo" data-id="${todo.id}" class="w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center border-2 transition-colors ${isCompleted ? 'bg-primary border-primary' : 'border-border group-hover:border-primary'}">
            <svg class="w-4 h-4 text-white ${isCompleted ? 'block' : 'hidden'}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
        </button>
        <p class="todo-text flex-grow mx-4 text-secondary cursor-pointer ${isCompleted ? 'line-through text-subtle' : ''}" data-action="edit-todo" data-id="${todo.id}" data-text="${todo.text}">
            ${todo.text}
        </p>
        <button data-action="pin-todo" data-id="${todo.id}" title="Fixar tarefa" class="p-1 rounded-full text-subtle ${pinButtonVisibility} hover:bg-primary/10 ${isPinned ? 'text-primary' : 'hover:text-primary'} flex-shrink-0 transition-opacity">
            <svg class="w-5 h-5 pointer-events-none" viewBox="0 0 24 24" ${pinIconFill} xmlns="http://www.w3.org/2000/svg">
                <path d="M12.0004 15L12.0004 22M8.00043 7.30813V9.43875C8.00043 9.64677 8.00043 9.75078 7.98001 9.85026C7.9619 9.93852 7.93194 10.0239 7.89095 10.1042C7.84474 10.1946 7.77977 10.2758 7.64982 10.4383L6.08004 12.4005C5.4143 13.2327 5.08143 13.6487 5.08106 13.9989C5.08073 14.3035 5.21919 14.5916 5.4572 14.7815C5.73088 15 6.26373 15 7.32943 15H16.6714C17.7371 15 18.27 15 18.5437 14.7815C18.7817 14.5916 18.9201 14.3035 18.9198 13.9989C18.9194 13.6487 18.5866 13.2327 17.9208 12.4005L16.351 10.4383C16.2211 10.2758 16.1561 10.1946 16.1099 10.1042C16.0689 10.0239 16.039 9.93852 16.0208 9.85026C16.0004 9.75078 16.0004 9.64677 16.0004 9.43875V7.30813C16.0004 7.19301 16.0004 7.13544 16.0069 7.07868C16.0127 7.02825 16.0223 6.97833 16.0357 6.92937C16.0507 6.87424 16.0721 6.8208 16.1149 6.71391L17.1227 4.19423C17.4168 3.45914 17.5638 3.09159 17.5025 2.79655C17.4489 2.53853 17.2956 2.31211 17.0759 2.1665C16.8247 2 16.4289 2 15.6372 2H8.36368C7.57197 2 7.17611 2 6.92494 2.1665C6.70529 2.31211 6.55199 2.53853 6.49838 2.79655C6.43707 3.09159 6.58408 3.45914 6.87812 4.19423L7.88599 6.71391C7.92875 6.8208 7.95013 6.87424 7.96517 6.92937C7.97853 6.97833 7.98814 7.02825 7.99392 7.07868C8.00043 7.13544 8.00043 7.19301 8.00043 7.30813Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
        <button data-action="delete-todo" data-id="${todo.id}" class="p-1 rounded-full text-subtle opacity-0 group-hover:opacity-100 hover:bg-danger/20 hover:text-danger flex-shrink-0 transition-opacity">
            <svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
    `;
    return todoItem;
}

export async function showCourseChecklistView(enrollmentId) {
    if (!enrollmentId) {
        const params = new URLSearchParams(window.location.search);
        enrollmentId = params.get('enrollmentId');
        if (!enrollmentId) {
            navigate('/');
            return;
        }
    }
    setState('activeEnrollmentId', enrollmentId);
    showLoading();
    if (!dom.courseChecklistView) return;

    dom.dashboardView.classList.add('hidden');
    dom.gradesReportView.classList.add('hidden');
    dom.disciplineDashboardView.classList.add('hidden');

    dom.courseChecklistView.classList.remove('hidden');

    const enrollmentSnap = await api.getEnrollment(enrollmentId);
    if (enrollmentSnap.exists()) {
        const data = enrollmentSnap.data();
        dom.checklistSubtitle.textContent = `${data.course} - ${data.institution}`;
    }

    await renderChecklistContent();
    showLoading(false);
}

export function showCurriculumSubjectModal(subjectId = null) {
    if (!dom.addCurriculumSubjectModal) return;
    dom.addCurriculumSubjectForm.reset();
    setState('editingCurriculumSubjectId', subjectId);
    
    showModal(dom.addCurriculumSubjectModal);
}

export function hideCurriculumSubjectModal() { hideModal(dom.addCurriculumSubjectModal); }

export async function renderChecklistContent() {
    if (!dom.checklistContent) return;
    dom.checklistContent.innerHTML = '';

    const { activeEnrollmentId } = getState();
    const enrollmentSnap = await api.getEnrollment(activeEnrollmentId);
    if (!enrollmentSnap.exists()) return;
    
    const enrollmentData = enrollmentSnap.data();
    const passingGrade = enrollmentData.passingGrade || 7.0;

    const [curriculumSubjects, allTakenDisciplines] = await Promise.all([
        api.getCurriculumSubjects(activeEnrollmentId),
        api.getAllTakenDisciplines(activeEnrollmentId)
    ]);
    
    if (curriculumSubjects.length === 0) {
        dom.checklistContent.innerHTML = `<div class="text-center p-8 bg-surface rounded-xl border border-border"><h3 class="font-bold text-secondary">Nenhuma disciplina na sua grade</h3><p class="text-subtle text-sm mt-2">Comece adicionando as disciplinas do seu curso para acompanhar seu progresso.</p></div>`;
        return;
    }

    const takenDisciplinesMap = new Map(allTakenDisciplines.map(d => [d.code, d]));
    const subjectsByPeriod = curriculumSubjects.reduce((acc, subject) => {
        const period = subject.period || 0;
        if (!acc[period]) acc[period] = [];
        acc[period].push(subject);
        return acc;
    }, {});

    dom.checklistContent.innerHTML = Object.keys(subjectsByPeriod).sort((a, b) => a - b).map(periodNumber => {
        const isUnsorted = periodNumber === "0";
        const periodTitle = isUnsorted ? "Disciplinas a Organizar" : `${periodNumber}º Período`;
        const titleColorClass = isUnsorted ? "text-danger" : "text-secondary";
        const subjectsInPeriod = subjectsByPeriod[periodNumber];
        
        let completedCount = 0;
        subjectsInPeriod.forEach(subject => {
            const takenDiscipline = takenDisciplinesMap.get(subject.code);
            if (takenDiscipline) {
                const averageGrade = parseFloat(calculateAverage(takenDiscipline));
                const allGradesFilled = takenDiscipline.grades && takenDiscipline.grades.length > 0 && takenDiscipline.grades.every(g => g.grade !== null);
                if (!isNaN(averageGrade) && allGradesFilled && averageGrade >= passingGrade) {
                    completedCount++;
                }
            }
        });

        const progress = subjectsInPeriod.length > 0 ? (completedCount / subjectsInPeriod.length) * 100 : 0;

        return `
            <div class="mb-8">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold ${titleColorClass}">${periodTitle}</h3>
                    <span class="text-sm font-semibold text-subtle">${completedCount} de ${subjectsInPeriod.length} concluídas</span>
                </div>
                <div class="w-full bg-bkg rounded-full h-2 mb-4 border border-border">
                    <div class="progress-bar h-full" style="width: ${progress}%"></div>
                </div>
                <div class="space-y-2">
                    ${subjectsInPeriod.map(subject => {
                        const takenDiscipline = takenDisciplinesMap.get(subject.code);
                        let isCompleted = false;
                        if (takenDiscipline) {
                            const averageGrade = parseFloat(calculateAverage(takenDiscipline));
                            const allGradesFilled = takenDiscipline.grades && takenDiscipline.grades.length > 0 && takenDiscipline.grades.every(g => g.grade !== null);
                            if (!isNaN(averageGrade) && allGradesFilled && averageGrade >= passingGrade) {
                                isCompleted = true;
                            }
                        }

                        return `
                        <div class="flex items-center justify-between p-3 rounded-lg bg-surface border border-border group">
                            <div class="flex items-center gap-4">
                                ${isCompleted
                                    ? `<div class="w-6 h-6 rounded-full bg-success flex-shrink-0 flex items-center justify-center text-white" title="Disciplina Aprovada"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg></div>`
                                    : `<button data-action="mark-subject-completed" data-id='${subject.id}' data-name='${subject.name}' data-code='${subject.code}' class="w-6 h-6 rounded-full bg-bkg border border-border hover:bg-primary/20 flex-shrink-0" title="Marcar como concluída"></button>`
                                }
                                <div class="${isCompleted ? 'opacity-60' : ''}">
                                    <p class="font-semibold text-secondary flex items-baseline">
                                        ${subject.name}
                                        <span class="ml-2 text-xs font-mono text-subtle">(${subject.code})</span>
                                    </p>
                                </div>
                            </div>
                            <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <button data-action="edit-curriculum-subject" data-id="${subject.id}" class="p-2 rounded-full text-subtle hover:bg-bkg" title="Editar disciplina na grade">
                                    <svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                                </button>
                                <button data-action="view-curriculum-subject-details" data-id="${subject.id}" class="p-2 rounded-full text-subtle hover:bg-bkg" title="Ver detalhes">
                                    <svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
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

function updateEmptyState(icon, title, subtitle) {
    if (!dom.documentsEmptyState) return;
    const iconContainer = document.getElementById('documents-empty-state-icon');
    const titleEl = document.getElementById('documents-empty-state-title');
    const subtitleEl = document.getElementById('documents-empty-state-subtitle');

    const newIcon = `<svg class="w-16 h-16 mx-auto text-subtle/50" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>`;
    
    if(iconContainer) iconContainer.innerHTML = icon || newIcon;
    if(titleEl) titleEl.textContent = title;
    if(subtitleEl) subtitleEl.textContent = subtitle;

    dom.documentsEmptyState.classList.remove('hidden');
}

export async function renderDocumentsList(enrollmentId) {
    const listContainer = dom.documentsList;
    if (!listContainer || !dom.documentsEmptyState) return;
    
    listContainer.classList.add('hidden');
    const spinnerIcon = `<svg class="w-16 h-16 mx-auto text-primary animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
    updateEmptyState(spinnerIcon, 'A carregar documentos...', 'Por favor, aguarde.');

    try {
        const documents = await api.getDocuments(enrollmentId);
        const totalDocumentsCount = documents.length;

        const searchTerm = document.getElementById('document-search-input')?.value.toLowerCase() || '';
        const typeFilter = document.querySelector('[data-filter-key="type"] .filter-value')?.value || 'all';
        const sortOrder = document.querySelector('[data-filter-key="sort"] .filter-value')?.value || 'createdAt_desc';
        
        if (totalDocumentsCount === 0) {
            const emptyIcon = `<svg class="w-16 h-16 mx-auto text-subtle/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>`;
            const title = "Biblioteca Vazia";
            const subtitle = enrollmentId 
                ? "Ainda não foram adicionados documentos a esta matrícula."
                : "Ainda não foram adicionados documentos à biblioteca geral.";
            updateEmptyState(emptyIcon, title, subtitle);
            return;
        }

        const filteredDocuments = documents.filter(doc => {
            const matchesSearch = searchTerm ? doc.title.toLowerCase().includes(searchTerm) || (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(searchTerm))) : true;
            const matchesType = typeFilter !== 'all' ? doc.type === typeFilter : true;
            return matchesSearch && matchesType;
        });

        const [sortField, sortDirection] = sortOrder.split('_');
        filteredDocuments.sort((a, b) => {
            let valA, valB;
            if (sortField === 'createdAt') {
                valA = a.createdAt?.toDate() || new Date(0);
                valB = b.createdAt?.toDate() || new Date(0);
            } else {
                valA = a.title.toLowerCase();
                valB = b.title.toLowerCase();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        if (filteredDocuments.length === 0) {
            const noResultsIcon = `<svg class="w-16 h-16 mx-auto text-subtle/50" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>`;
            updateEmptyState(noResultsIcon, "Nenhum Documento Encontrado", "Tente ajustar seus filtros de pesquisa.");
        } else {
            dom.documentsEmptyState.classList.add('hidden');
            listContainer.innerHTML = '';
            listContainer.classList.remove('hidden');
            filteredDocuments.forEach(doc => {
                const card = createDocumentCard(doc);
                listContainer.appendChild(card);
            });
        }
    } catch (error) {
        console.error("Erro ao renderizar documentos:", error);
        const errorIcon = `<svg class="w-16 h-16 mx-auto text-danger" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>`;
        updateEmptyState(errorIcon, "Ocorreu um Erro", "Não foi possível carregar os documentos. Tente novamente.");
    }
}