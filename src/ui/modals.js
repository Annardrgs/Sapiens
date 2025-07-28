/**
 * @file Módulo para gerenciar a lógica de todos os modais.
 */

import { dom } from './dom.js'; // Importa o objeto DOM compartilhado
import { setState, getState } from '../store/state.js';
import * as api from '../api/firestore.js';

function showModal(modalElement) {
  modalElement.classList.remove('hidden');
}

function hideModal(modalElement) {
  modalElement.classList.add('hidden');
}

// --- MODAL DE MATRÍCULA ---

export function showEnrollmentModal(enrollmentId = null) {
  setState('editingEnrollmentId', enrollmentId);
  dom.addEnrollmentForm.reset();
  
  if (enrollmentId) {
    dom.enrollmentModalTitle.textContent = "Editar Matrícula";
    api.getEnrollment(enrollmentId).then(docSnap => {
        if(docSnap.exists()) {
            const data = docSnap.data();
            dom.addEnrollmentForm.querySelector('#enrollment-course').value = data.course;
            dom.addEnrollmentForm.querySelector('#enrollment-institution').value = data.institution;
            dom.addEnrollmentForm.querySelector('#enrollment-period').value = data.currentPeriod;
        }
    });
  } else {
    dom.enrollmentModalTitle.textContent = "Nova Matrícula";
  }
  showModal(dom.addEnrollmentModal);
}

export function hideEnrollmentModal() {
  hideModal(dom.addEnrollmentModal);
}

// --- MODAL DE DISCIPLINA ---

export function showDisciplineModal(disciplineId = null) {
  setState('editingDisciplineId', disciplineId);
  dom.addDisciplineForm.reset();

  if (disciplineId) {
    dom.disciplineModalTitle.textContent = "Editar Disciplina";
    const { activeEnrollmentId, activePeriodId } = getState();
    api.getDiscipline(activeEnrollmentId, activePeriodId, disciplineId).then(docSnap => {
        if(docSnap.exists()) {
            const data = docSnap.data();
            dom.addDisciplineForm.querySelector('#discipline-name').value = data.name;
            dom.addDisciplineForm.querySelector('#discipline-code').value = data.code || '';
            dom.addDisciplineForm.querySelector('#discipline-teacher').value = data.teacher || '';
            dom.addDisciplineForm.querySelector('#discipline-location').value = data.location || '';
            dom.addDisciplineForm.querySelector('#discipline-schedule').value = data.schedule || '';
            dom.addDisciplineForm.querySelector('#discipline-workload').value = data.workload || '';
            dom.addDisciplineForm.querySelector('#discipline-hours-per-class').value = data.hoursPerClass || '';
        }
    });
  } else {
    dom.disciplineModalTitle.textContent = "Nova Disciplina";
  }
  showModal(dom.addDisciplineModal);
}

export function hideDisciplineModal() {
  hideModal(dom.addDisciplineModal);
}

// --- MODAL DE PERÍODO ---

export function showPeriodModal() {
    dom.addPeriodForm.reset();
    showModal(dom.addPeriodModal);
}

export function hidePeriodModal() {
    hideModal(dom.addPeriodModal);
}

// --- MODAL DE FALTA ---

export function showAbsenceModal(disciplineId, disciplineName) {
    const { activeEnrollmentId, activePeriodId } = getState();
    setState('currentDisciplineForAbsence', { enrollmentId: activeEnrollmentId, periodId: activePeriodId, disciplineId });
    dom.addAbsenceForm.reset();
    dom.addAbsenceForm.querySelector('#absence-date').valueAsDate = new Date();
    showModal(dom.addAbsenceModal);
}

export function hideAbsenceModal() {
    hideModal(dom.addAbsenceModal);
}

// --- MODAL DE HISTÓRICO DE FALTAS ---

export function showAbsenceHistoryModal(disciplineId, disciplineName) {
    const { activeEnrollmentId, activePeriodId } = getState();
    setState('currentDisciplineForAbsence', { enrollmentId: activeEnrollmentId, periodId: activePeriodId, disciplineId });
    dom.absenceHistoryTitle.textContent = `Histórico de Faltas - ${disciplineName}`;
    showModal(dom.absenceHistoryModal);
}

export function hideAbsenceHistoryModal() {
    hideModal(dom.absenceHistoryModal);
}

// --- MODAL DE CONFIRMAÇÃO DE EXCLUSÃO ---

export function showConfirmDeleteModal(item) {
  setState('itemToDelete', item);
  let message = "Tem certeza que deseja excluir? Esta ação não pode ser desfeita.";

  if (item.type === 'enrollment') {
    message = "Tem certeza que deseja excluir esta matrícula? Todos os períodos e disciplinas associados serão perdidos.";
  } else if (item.type === 'discipline') {
    message = "Tem certeza que deseja excluir esta disciplina?";
  } else if (item.type === 'period') {
    message = "Tem certeza que deseja excluir este período? TODAS as disciplinas contidas nele serão perdidas permanentemente.";
  }
  
  dom.confirmDeleteMessage.textContent = message;
  showModal(dom.confirmDeleteModal);
}

export function hideConfirmDeleteModal() {
  setState('itemToDelete', null);
  hideModal(dom.confirmDeleteModal);
}
