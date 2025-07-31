/**
 * @file Módulo para selecionar e exportar todos os elementos do DOM.
 */

export const dom = {};

export function initializeDOMElements() {
  if (Object.keys(dom).length > 0) return;

  Object.assign(dom, {
    // --- Telas e Contêineres Principais ---
    appContainer: document.getElementById('app-container'),
    authScreen: document.getElementById('auth-screen'),
    enrollmentsView: document.getElementById('enrollments-view'),
    dashboardView: document.getElementById('dashboard-view'),

    // --- Autenticação ---
    authForm: document.getElementById('auth-form'),
    authTitle: document.getElementById('auth-title'),
    authPrompt: document.getElementById('auth-prompt'),
    authSubmitBtn: document.getElementById('auth-submit-btn'),
    authEmailInput: document.getElementById('auth-email'),
    authPasswordInput: document.getElementById('auth-password'),
    eyeIcon: document.querySelector('.eye-icon'),
    eyeSlashIcon: document.querySelector('.eye-slash-icon'),
    
    // --- Header ---
    logoutBtn: document.getElementById('logout-btn'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    sunIcon: document.getElementById('theme-sun-icon'),
    moonIcon: document.getElementById('theme-moon-icon'),
    userEmailDisplay: document.getElementById('user-email'),

    // --- Tela de Matrículas ---
    addEnrollmentBtn: document.getElementById('add-enrollment-btn'),
    enrollmentsList: document.getElementById('enrollments-list'),
    generalDashboard: document.getElementById('general-dashboard'),
    generalDashboardContent: document.getElementById('general-dashboard-content'),
    
    // --- Tela do Dashboard ---
    backToEnrollmentsBtn: document.getElementById('back-to-enrollments-btn'),
    dashboardTitle: document.getElementById('dashboard-title'),
    dashboardSubtitle: document.getElementById('dashboard-subtitle'),
    summaryCardsContainer: document.getElementById('summary-cards-container'),
    weeklyAgendaContainer: document.getElementById('weekly-agenda-container'),
    calendarContainer: document.getElementById('calendar-container'),
    addDisciplineBtn: document.getElementById('add-discipline-btn'),
    disciplinesList: document.getElementById('disciplines-list'),
    
    // --- Elementos do Navegador de Período ---
    newPeriodBtn: document.getElementById('new-period-btn'),
    prevPeriodBtn: document.getElementById('prev-period-btn'),
    nextPeriodBtn: document.getElementById('next-period-btn'),
    currentPeriodName: document.getElementById('current-period-name'),
    managePeriodBtn: document.getElementById('manage-period-btn'),
    
    // --- Modais e Formulários ---
    addEnrollmentModal: document.getElementById('add-enrollment-modal'),
    addEnrollmentForm: document.getElementById('add-enrollment-form'),
    enrollmentModalTitle: document.getElementById('enrollment-modal-title'),
    cancelEnrollmentBtn: document.getElementById('cancel-enrollment-btn'),
    addDisciplineModal: document.getElementById('add-discipline-modal'),
    addDisciplineForm: document.getElementById('add-discipline-form'),
    disciplineModalTitle: document.getElementById('discipline-modal-title'),
    cancelDisciplineBtn: document.getElementById('cancel-discipline-btn'),
    addPeriodModal: document.getElementById('add-period-modal'),
    addPeriodForm: document.getElementById('add-period-form'),
    cancelPeriodBtn: document.getElementById('cancel-period-btn'),
    addAbsenceModal: document.getElementById('add-absence-modal'),
    addAbsenceForm: document.getElementById('add-absence-form'),
    cancelAbsenceBtn: document.getElementById('cancel-absence-btn'),
    absenceHistoryModal: document.getElementById('absence-history-modal'),
    absenceHistoryTitle: document.getElementById('absence-history-title'),
    absenceHistoryList: document.getElementById('absence-history-list'),
    closeAbsenceHistoryBtn: document.getElementById('close-absence-history-btn'),
    confirmModal: document.getElementById('confirm-modal'),
    confirmModalTitle: document.getElementById('confirm-modal-title'),
    confirmModalMessage: document.getElementById('confirm-modal-message'),
    confirmModalConfirmBtn: document.getElementById('confirm-modal-confirm-btn'),
    confirmModalCancelBtn: document.getElementById('confirm-modal-cancel-btn'),
    addEventModal: document.getElementById('add-event-modal'),
    addEventForm: document.getElementById('add-event-form'),
    cancelEventBtn: document.getElementById('cancel-event-btn'),
    configGradesModal: document.getElementById('config-grades-modal'),
    configGradesForm: document.getElementById('config-grades-form'),
    configGradesTitle: document.getElementById('config-grades-title'),
    gradesContainer: document.getElementById('grades-container'),
    addGradeFieldBtn: document.getElementById('add-grade-field-btn'),
    cancelConfigGradesBtn: document.getElementById('cancel-config-grades-btn'),
    periodOptionsModal: document.getElementById('period-options-modal'),
    periodOptionsForm: document.getElementById('period-options-form'),
    periodOptionsTitle: document.getElementById('period-options-title'),
    viewCalendarLink: document.getElementById('view-calendar-link'),
    endPeriodBtn: document.getElementById('end-period-btn'),
    reopenPeriodBtn: document.getElementById('reopen-period-btn'),
    deletePeriodBtn: document.getElementById('delete-period-btn'),
    pdfViewerModal: document.getElementById('pdf-viewer-modal'),
    pdfViewerIframe: document.getElementById('pdf-viewer-iframe'),
    closePdfViewerBtn: document.getElementById('close-pdf-viewer-btn'),
    disciplineDetailModal: document.getElementById('discipline-detail-modal'),
    closeDisciplineDetailBtn: document.getElementById('close-discipline-detail-btn'),
    detailDisciplineName: document.getElementById('detail-discipline-name'),
    detailDisciplineTeacher: document.getElementById('detail-discipline-teacher'),
    detailConfigGradesBtn: document.getElementById('detail-config-grades-btn'),
    detailGradeChartContainer: document.getElementById('detail-grade-chart-container'),
     // --- Dashboard da Disciplina ---
    disciplineDashboardView: document.getElementById('discipline-dashboard-view'),
    backToMainDashboardBtn: document.getElementById('back-to-main-dashboard-btn'),
    disciplineDashTitle: document.getElementById('discipline-dash-title'),
    disciplineDashSubtitle: document.getElementById('discipline-dash-subtitle'),
    evaluationsList: document.getElementById('evaluations-list'),
    disciplineDashConfigGradesBtn: document.getElementById('discipline-dash-config-grades-btn'),
    disciplinePerformanceChart: document.getElementById('discipline-performance-chart'),
  });
}