/**
 * @file Módulo para selecionar e exportar todos os elementos do DOM.
 */

export const dom = {};

export function initializeDOMElements() {
  if (Object.keys(dom).length) return;

  Object.assign(dom, {
    // Telas
    authScreen: document.getElementById('auth-screen'),
    appContainer: document.getElementById('app-container'),
    enrollmentsView: document.getElementById('enrollments-view'),
    dashboardView: document.getElementById('dashboard-view'),

    // Autenticação
    authForm: document.getElementById('auth-form'),
    authTitle: document.getElementById('auth-title'),
    authPrompt: document.getElementById('auth-prompt'),
    authSubmitBtn: document.getElementById('auth-submit-btn'),
    authEmailInput: document.getElementById('auth-email'),
    authPasswordInput: document.getElementById('auth-password'),
    togglePasswordBtn: document.getElementById('toggle-password-btn'),
    eyeIcon: document.querySelector('.eye-icon'),
    eyeSlashIcon: document.querySelector('.eye-slash-icon'),

    // Header
    logoutBtn: document.getElementById('logout-btn'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    sunIcon: document.getElementById('theme-sun-icon'),
    moonIcon: document.getElementById('theme-moon-icon'),
    userEmailDisplay: document.getElementById('user-email'),

    // Matrículas
    addEnrollmentBtn: document.getElementById('add-enrollment-btn'),
    enrollmentsList: document.getElementById('enrollments-list'),
    
    // Dashboard (original)
    backToEnrollmentsBtn: document.getElementById('back-to-enrollments-btn'),
    dashboardTitle: document.getElementById('dashboard-title'),
    dashboardSubtitle: document.getElementById('dashboard-subtitle'),
    periodSwitcher: document.getElementById('period-switcher'),
    newPeriodBtn: document.getElementById('new-period-btn'),

    // Disciplinas (original)
    addDisciplineBtn: document.getElementById('add-discipline-btn'),
    disciplinesList: document.getElementById('disciplines-list'),

    // Modais
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
    
    confirmDeleteModal: document.getElementById('confirm-delete-modal'),
    confirmDeleteMessage: document.getElementById('confirm-delete-message'),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
    cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
  });
}