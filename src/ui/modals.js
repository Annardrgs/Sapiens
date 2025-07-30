/**
 * @file Módulo para gerenciar a lógica de todos os modais.
 */

import { dom } from './dom.js';
import { setState, getState } from '../store/state.js';
import * as api from '../api/firestore.js';

// --- FUNÇÕES AUXILIARES PARA MODAIS ---
export function addScheduleField(schedule = {}) {
    if (!dom.addDisciplineForm) return;
    const container = dom.addDisciplineForm.querySelector('#schedules-container');
    if (!container) return;
    const field = document.createElement('div');
    field.className = 'schedule-field grid grid-cols-[1fr,auto,auto,auto] gap-2 items-center animate-fade-in';
    field.innerHTML = `<select name="schedule-day" class="w-full px-3 py-2 bg-bkg text-secondary border border-border rounded-md"><option value="Seg">Segunda</option><option value="Ter">Terça</option><option value="Qua">Quarta</option><option value="Qui">Quinta</option><option value="Sex">Sexta</option><option value="Sab">Sábado</option><option value="Dom">Domingo</option></select><input type="time" name="schedule-start" required class="px-3 py-2 bg-bkg text-secondary border border-border rounded-md"><input type="time" name="schedule-end" required class="px-3 py-2 bg-bkg text-secondary border border-border rounded-md"><button type="button" class="remove-schedule-btn text-danger p-2 rounded-full hover:bg-danger/10"><svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>`;
    field.querySelector('[name="schedule-day"]').value = schedule.day || 'Seg';
    field.querySelector('[name="schedule-start"]').value = schedule.startTime || '';
    field.querySelector('[name="schedule-end"]').value = schedule.endTime || '';
    field.querySelector('.remove-schedule-btn').addEventListener('click', () => field.remove());
    container.appendChild(field);
}

export function addGradeField() {
    if (!dom.configGradesForm || !dom.gradesContainer) return;
    const rule = dom.configGradesForm.querySelector('#grade-calculation-rule').value;
    const gradeField = document.createElement('div');
    gradeField.className = 'flex items-center space-x-2 animate-fade-in';
    const baseInputClasses = "w-full px-3 py-2 bg-bkg text-secondary border border-border rounded-md";
    let fieldsHTML = (rule === 'weighted') ? `<input type="text" name="name" placeholder="Nome (ex: P1)" class="${baseInputClasses}"><input type="number" name="weight" min="1" max="100" placeholder="Peso (%)" class="${baseInputClasses} w-32">` : `<input type="text" name="name" placeholder="Nome (ex: Prova 1)" class="${baseInputClasses}">`;
    gradeField.innerHTML = `${fieldsHTML}<button type="button" class="remove-field-btn text-danger p-2 rounded-full hover:bg-danger/10"><svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>`;
    gradeField.querySelector('.remove-field-btn').addEventListener('click', () => { gradeField.remove(); updateWeightsSum(); });
    dom.gradesContainer.appendChild(gradeField);
}

export function updateWeightsSum() {
    if (!dom.configGradesForm || !dom.gradesContainer) return;
    const rule = dom.configGradesForm.querySelector('#grade-calculation-rule').value;
    const summaryContainer = dom.configGradesForm.querySelector('#grades-summary');
    if (rule !== 'weighted') { if (summaryContainer) summaryContainer.innerHTML = ''; return; }
    let totalWeight = 0;
    dom.gradesContainer.querySelectorAll('[name="weight"]').forEach(input => totalWeight += Number(input.value) || 0);
    const colorClass = totalWeight === 100 ? 'text-success' : (totalWeight > 100 ? 'text-danger' : 'text-subtle');
    if (summaryContainer) summaryContainer.innerHTML = `<p class="text-sm font-bold ${colorClass}">Soma dos Pesos: ${totalWeight}%</p>`;
}

export function renderGradeFields() {
    if (dom.gradesContainer) dom.gradesContainer.innerHTML = '';
    updateWeightsSum();
    addGradeField();
}

// --- FUNÇÕES DE CONTROLE DE MODAL ---
function showModal(modalElement) { if (modalElement) modalElement.classList.remove('hidden'); }
function hideModal(modalElement) { if (modalElement) modalElement.classList.add('hidden'); }

export function showEnrollmentModal(enrollmentId = null) {
  if (!dom.addEnrollmentModal || !dom.addEnrollmentForm || !dom.enrollmentModalTitle) return;
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
            dom.addEnrollmentForm.querySelector('#enrollment-passing-grade').value = data.passingGrade || '';
            
            // LÓGICA ATUALIZADA para selecionar o botão de rádio correto
            const modality = data.modality || 'Presencial';
            const radioToCheck = dom.addEnrollmentForm.querySelector(`input[name="enrollment-modality"][value="${modality}"]`);
            if (radioToCheck) {
                radioToCheck.checked = true;
            }
        }
    });
  } else {
    dom.enrollmentModalTitle.textContent = "Nova Matrícula";
    // Garante que 'Presencial' seja o padrão ao criar uma nova
    dom.addEnrollmentForm.querySelector('#modality-presencial').checked = true;
  }
  showModal(dom.addEnrollmentModal);
}


export async function showDisciplineModal(disciplineId = null) {
  if (!dom.addDisciplineModal || !dom.addDisciplineForm || !dom.disciplineModalTitle) return;
  const { activeEnrollmentId, activePeriodId } = getState();
  setState('editingDisciplineId', disciplineId);
  dom.addDisciplineForm.reset();
  const schedulesContainer = dom.addDisciplineForm.querySelector('#schedules-container');
  if (schedulesContainer) schedulesContainer.innerHTML = '';
  const enrollmentSnap = await api.getEnrollment(activeEnrollmentId);
  const isEAD = enrollmentSnap.exists() && enrollmentSnap.data().modality === 'EAD';
  const campusInput = dom.addDisciplineForm.querySelector('#discipline-campus');
  if (isEAD) { campusInput.value = 'Remoto'; campusInput.disabled = true; } 
  else { campusInput.disabled = false; }
  if (disciplineId) {
    dom.disciplineModalTitle.textContent = "Editar Disciplina";
    api.getDiscipline(activeEnrollmentId, activePeriodId, disciplineId).then(docSnap => {
        if(docSnap.exists()) {
            const data = docSnap.data();
            dom.addDisciplineForm.querySelector('#discipline-name').value = data.name || '';
            dom.addDisciplineForm.querySelector('#discipline-teacher').value = data.teacher || '';
            if (!isEAD) campusInput.value = data.campus || '';
            dom.addDisciplineForm.querySelector('#discipline-location').value = data.location || '';
            dom.addDisciplineForm.querySelector('#discipline-workload').value = data.workload || '';
            dom.addDisciplineForm.querySelector('#discipline-hours-per-class').value = data.hoursPerClass || '';
            if (data.schedules && Array.isArray(data.schedules)) data.schedules.forEach(schedule => addScheduleField(schedule));
        }
    });
  } else {
    dom.disciplineModalTitle.textContent = "Nova Disciplina";
    if (!isEAD) campusInput.value = '';
    addScheduleField();
  }
  showModal(dom.addDisciplineModal);
}

export function showPeriodModal() { if (!dom.addPeriodModal || !dom.addPeriodForm) return; dom.addPeriodForm.reset(); showModal(dom.addPeriodModal); }
export function showAbsenceModal(disciplineId, disciplineName) { if (!dom.addAbsenceModal || !dom.addAbsenceForm) return; const { activeEnrollmentId, activePeriodId } = getState(); setState('currentDisciplineForAbsence', { enrollmentId: activeEnrollmentId, periodId: activePeriodId, disciplineId }); dom.addAbsenceForm.reset(); dom.addAbsenceForm.querySelector('#absence-date').valueAsDate = new Date(); showModal(dom.addAbsenceModal); }
export function showAbsenceHistoryModal(disciplineId, disciplineName) { if (!dom.absenceHistoryModal || !dom.absenceHistoryTitle) return; const { activeEnrollmentId, activePeriodId } = getState(); setState('currentDisciplineForAbsence', { enrollmentId: activeEnrollmentId, periodId: activePeriodId, disciplineId }); dom.absenceHistoryTitle.textContent = `Histórico de Faltas - ${disciplineName}`; showModal(dom.absenceHistoryModal); }
export async function showPeriodOptionsModal() { if (!dom.periodOptionsModal) return; const { periods, activePeriodIndex } = getState(); const currentPeriod = periods[activePeriodIndex]; if (!currentPeriod) return; if (dom.periodOptionsTitle) dom.periodOptionsTitle.textContent = `Opções de "${currentPeriod.name}"`; if (dom.periodOptionsForm) { dom.periodOptionsForm.querySelector('#period-start-date').value = currentPeriod.startDate || ''; dom.periodOptionsForm.querySelector('#period-end-date').value = currentPeriod.endDate || ''; } if (dom.viewCalendarLink) { if (currentPeriod.calendarUrl) { dom.viewCalendarLink.href = currentPeriod.calendarUrl; dom.viewCalendarLink.classList.remove('hidden'); } else { dom.viewCalendarLink.classList.add('hidden'); } } if (dom.endPeriodBtn && dom.reopenPeriodBtn) { if (currentPeriod.status === 'closed') { dom.endPeriodBtn.classList.add('hidden'); dom.reopenPeriodBtn.classList.remove('hidden'); } else { dom.endPeriodBtn.classList.remove('hidden'); dom.reopenPeriodBtn.classList.add('hidden'); } } showModal(dom.periodOptionsModal); }
export function showConfirmDeleteModal(item) { if (!dom.confirmDeleteModal || !dom.confirmDeleteMessage) return; setState('itemToDelete', item); let message = "Tem certeza?"; if (item.type === 'enrollment') message = "Excluir esta matrícula removerá todos os seus períodos e disciplinas."; else if (item.type === 'period') message = "Excluir este período removerá todas as suas disciplinas."; dom.confirmDeleteMessage.textContent = message; showModal(dom.confirmDeleteModal); }
export function showConfigGradesModal(disciplineId, disciplineName) { if (!dom.configGradesModal || !dom.configGradesTitle || !dom.configGradesForm) return; const { activeEnrollmentId, activePeriodId } = getState(); setState('currentDisciplineForGrades', { enrollmentId: activeEnrollmentId, periodId: activePeriodId, disciplineId }); dom.configGradesTitle.textContent = `Avaliações de ${disciplineName}`; showModal(dom.configGradesModal); dom.configGradesForm.querySelector('#grade-calculation-rule').dispatchEvent(new Event('change')); }
export function showPdfViewerModal(url) { if (!dom.pdfViewerModal || !dom.pdfViewerIframe) return; dom.pdfViewerIframe.src = url; showModal(dom.pdfViewerModal); }

export function hideEnrollmentModal() { hideModal(dom.addEnrollmentModal); }
export function hideDisciplineModal() { hideModal(dom.addDisciplineModal); }
export function hidePeriodModal() { hideModal(dom.addPeriodModal); }
export function hideAbsenceModal() { hideModal(dom.addAbsenceModal); }
export function hideAbsenceHistoryModal() { hideModal(dom.absenceHistoryModal); }
export function hideConfirmDeleteModal() { setState('itemToDelete', null); hideModal(dom.confirmDeleteModal); }
export function hideConfigGradesModal() { hideModal(dom.configGradesModal); }
export function hidePeriodOptionsModal() { hideModal(dom.periodOptionsModal); }
export function hidePdfViewerModal() { if (dom.pdfViewerIframe) dom.pdfViewerIframe.src = ''; hideModal(dom.pdfViewerModal); }