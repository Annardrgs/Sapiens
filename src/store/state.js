/**
 * @file Módulo para gerenciamento do estado global da aplicação.
 */

const state = {
  user: null,
  authMode: 'login', // 'login' ou 'signup'
  
  // IDs ativos para navegação
  activeEnrollmentId: null,
  activePeriodId: null,
  
  // IDs para edição
  editingEnrollmentId: null,
  editingDisciplineId: null,

  // Objetos para operações em modais
  itemToDelete: null,
  currentDisciplineForAbsence: null,
  currentDisciplineForGrades: null,

  // Lista de períodos para navegação
  periods: [],
  activePeriodIndex: -1,
};

/**
 * Obtém o estado atual.
 * @returns {object} O objeto de estado completo.
 */
export function getState() {
  return state;
}

/**
 * Define um valor para uma chave específica no estado.
 * @param {string} key - A chave do estado a ser modificada.
 * @param {*} value - O novo valor para a chave.
 */
export function setState(key, value) {
  if (key in state) {
    state[key] = value;
  } else {
    console.warn(`A chave "${key}" não existe no estado inicial.`);
  }
}