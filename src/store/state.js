/**
 * @file Módulo para gerenciar o estado global da aplicação.
 */

const state = {
    user: null,
    authMode: 'login', // 'login' or 'signup'
    
    enrollments: [],
    activeEnrollmentId: null,
    activeEnrollment: null, // Chave adicionada

    periods: [],
    activePeriodIndex: 0,
    get activePeriodId() {
        return this.periods[this.activePeriodIndex]?.id || null;
    },

    disciplines: [],
    
    editingEnrollmentId: null,
    editingDisciplineId: null,
    editingCurriculumSubjectId: null,
    editingDocumentId: null,
    itemToDelete: null,
    subjectToComplete: null,

    currentDisciplineForGrades: null,
    currentDisciplineForAbsence: null,

    onConfirmAction: null,

    calendarMarkedForDeletion: false,
    returnToCompleteSubjectModal: false,
    subjectDataForReturn: null,
};

const observers = new Set();

export function subscribe(fn) {
    observers.add(fn);
}

export function setState(key, value) {
    const descriptor = Object.getOwnPropertyDescriptor(state, key);

    // Impede a tentativa de definir uma propriedade que é apenas um getter (somente leitura)
    if (descriptor && descriptor.get && !descriptor.set) {
        console.warn(`A propriedade "${key}" é calculada automaticamente e não pode ser definida diretamente.`);
        return;
    }

    if (Object.prototype.hasOwnProperty.call(state, key)) {
        state[key] = value;
        observers.forEach(observer => observer(state));
    } else {
        console.warn(`A chave "${key}" não existe no estado inicial.`);
    }
}

export function getState() {
    return state;
}