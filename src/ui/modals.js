/**
 * @file Módulo para gerenciar a lógica de todos os modais.
 */

import { dom } from './dom.js';
import { setState, getState } from '../store/state.js';
import * as api from '../api/firestore.js';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase.js';
import { renderGradesChart, calculateAverage } from '../components/card.js';

// --- FUNÇÕES DE CONTROLE DE MODAL (GENÉRICAS) ---
function showModal(modalElement) { if (modalElement) modalElement.classList.remove('hidden'); }
function hideModal(modalElement) { if (modalElement) modalElement.classList.add('hidden'); }

// --- FUNÇÕES AUXILIARES PARA FORMULÁRIOS NOS MODAIS ---
export function addScheduleField(schedule = {}) {
    if (!dom.addDisciplineForm) return;
    const container = dom.addDisciplineForm.querySelector('#schedules-container');
    if (!container) return;

    const field = document.createElement('div');
    field.className = 'schedule-field grid grid-cols-[1fr,auto,auto,auto] gap-2 items-center animate-fade-in';
    
    // Lista de dias da semana para o dropdown
    const days = [
        { value: 'Seg', text: 'Segunda' }, { value: 'Ter', text: 'Terça' },
        { value: 'Qua', text: 'Quarta' }, { value: 'Qui', text: 'Quinta' },
        { value: 'Sex', text: 'Sexta' }, { value: 'Sab', text: 'Sábado' },
        { value: 'Dom', text: 'Domingo' }
    ];
    const selectedDay = schedule.day || 'Seg';
    const selectedDayText = days.find(d => d.value === selectedDay)?.text || 'Segunda';

    field.innerHTML = `
        <div class="relative" data-dropdown-container>
            <input type="hidden" name="schedule-day" value="${selectedDay}">
            <button type="button" data-action="toggle-dropdown" class="custom-dropdown-button">
                <span class="selected-value truncate">${selectedDayText}</span>
                <svg class="w-5 h-5 text-subtle ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"></path></svg>
            </button>
            <div data-dropdown-panel class="custom-dropdown-panel hidden">
                <ul class="custom-dropdown-list">
                    ${days.map(day => `<li data-action="select-dropdown-item" data-value="${day.value}" class="${day.value === selectedDay ? 'selected' : ''}">${day.text}</li>`).join('')}
                </ul>
            </div>
        </div>
        <input type="time" name="schedule-start" required class="px-3 py-2 bg-bkg text-secondary border border-border rounded-md" value="${schedule.startTime || ''}">
        <input type="time" name="schedule-end" required class="px-3 py-2 bg-bkg text-secondary border border-border rounded-md" value="${schedule.endTime || ''}">
        <button type="button" class="remove-schedule-btn text-danger p-2 rounded-full hover:bg-danger/10">
            <svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
    `;
    
    field.querySelector('.remove-schedule-btn').addEventListener('click', () => field.remove());
    container.appendChild(field);
}

export async function showDisciplineDetailModal(disciplineId) {
    if (!dom.disciplineDetailModal) return;

    const { activeEnrollmentId, activePeriodId, periods, activePeriodIndex } = getState();
    const isPeriodClosed = periods[activePeriodIndex]?.status === 'closed';

    const disciplineSnap = await api.getDiscipline(activeEnrollmentId, activePeriodId, disciplineId);
    if (disciplineSnap.exists()) {
        const discipline = { id: disciplineSnap.id, ...disciplineSnap.data() };
        
        dom.detailDisciplineName.textContent = discipline.name;
        dom.detailDisciplineTeacher.textContent = discipline.teacher || 'Professor não definido';

        renderGradesChart(dom.detailGradeChartContainer, discipline);
        
        dom.detailConfigGradesBtn.dataset.id = discipline.id;
        dom.detailConfigGradesBtn.dataset.name = discipline.name;

        dom.detailConfigGradesBtn.classList.toggle('hidden', isPeriodClosed);
        
        showModal(dom.disciplineDetailModal);
    }
}

export function hideDisciplineDetailModal() {
    hideModal(dom.disciplineDetailModal);
}

export function addGradeField(evaluation = {}) {
    if (!dom.configGradesForm || !dom.gradesContainer) return;
    const rule = dom.configGradesForm.querySelector('#grade-calculation-rule').value;
    const gradeField = document.createElement('div');
    gradeField.className = 'flex items-center space-x-2 animate-fade-in';
    const baseInputClasses = "w-full px-3 py-2 bg-bkg text-secondary border border-border rounded-md";
    
    let fieldsHTML = (rule === 'weighted') 
        ? `<input type="text" name="name" placeholder="Nome (ex: P1)" class="${baseInputClasses}" value="${evaluation.name || ''}">
           <input type="number" name="weight" min="1" max="100" placeholder="Peso (%)" class="${baseInputClasses} w-32" value="${evaluation.weight || ''}">` 
        : `<input type="text" name="name" placeholder="Nome (ex: Prova 1)" class="${baseInputClasses}" value="${evaluation.name || ''}">`;
    
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


// --- FUNÇÕES DE VISIBILIDADE DOS MODAIS ---

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
            dom.addEnrollmentForm.querySelector('#enrollment-passing-grade').value = data.passingGrade || '';
            const modality = data.modality || 'Presencial';
            const radioToCheck = dom.addEnrollmentForm.querySelector(`input[name="enrollment-modality"][value="${modality}"]`);
            if (radioToCheck) radioToCheck.checked = true;
        }
    });
  } else {
    dom.enrollmentModalTitle.textContent = "Nova Matrícula";
    dom.addEnrollmentForm.querySelector('#modality-presencial').checked = true;
  }
  showModal(dom.addEnrollmentModal);
}

function renderColorPalette(selectedColor) {
    const paletteContainer = dom.addDisciplineForm.querySelector('#discipline-color-palette');
    const colorInput = dom.addDisciplineForm.querySelector('#discipline-color-input');
    if (!paletteContainer || !colorInput) return;

    const colors = ['#6366f1', '#8b5cf6', '#d946ef', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981', '#14b8a6', '#0ea5e9', '#ec4899'];
    paletteContainer.innerHTML = '';

    colors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.dataset.color = color;
        if (color === selectedColor) {
            swatch.classList.add('selected');
        }
        paletteContainer.appendChild(swatch);
    });

    colorInput.value = selectedColor;
}

export async function showDisciplineModal(disciplineId = null) {
  if (!dom.addDisciplineModal || !dom.addDisciplineForm || !dom.disciplineModalTitle) return;
  const { activeEnrollmentId } = getState();
  setState('editingDisciplineId', disciplineId);
  dom.addDisciplineForm.reset();
  const schedulesContainer = dom.addDisciplineForm.querySelector('#schedules-container');
  if (schedulesContainer) schedulesContainer.innerHTML = '';
  
  const enrollmentSnap = await api.getEnrollment(activeEnrollmentId);
  const isEAD = enrollmentSnap.exists() && enrollmentSnap.data().modality === 'EAD';
 
  // Seleciona os novos elementos e os existentes
  const absenceControlSection = document.getElementById('absence-control-section');
  const disciplineNotesSection = document.getElementById('discipline-notes-section');
  const notesInput = document.getElementById('discipline-notes');
  const campusInput = dom.addDisciplineForm.querySelector('#discipline-campus');
  const locationInput = dom.addDisciplineForm.querySelector('#discipline-location');
  const workloadInput = document.getElementById('discipline-workload');
  const hoursPerClassInput = document.getElementById('discipline-hours-per-class');
  const schedulesSection = dom.addDisciplineForm.querySelector('#schedules-container').parentElement;
 
  if (isEAD) {
    campusInput.value = 'Remoto';
    campusInput.disabled = true;
    locationInput.disabled = true;
    schedulesSection.classList.add('hidden');
    if (absenceControlSection) absenceControlSection.classList.add('hidden');
    if (disciplineNotesSection) disciplineNotesSection.classList.remove('hidden');
    if (workloadInput) workloadInput.required = false;
    if (hoursPerClassInput) hoursPerClassInput.required = false;
  } else {
    campusInput.disabled = false;
    locationInput.disabled = false;
    schedulesSection.classList.remove('hidden');
    if (absenceControlSection) absenceControlSection.classList.remove('hidden');
    if (disciplineNotesSection) disciplineNotesSection.classList.add('hidden');
    if (workloadInput) workloadInput.required = true;
    if (hoursPerClassInput) hoursPerClassInput.required = true;
  }

  if (disciplineId) {
    dom.disciplineModalTitle.textContent = "Editar Disciplina";
    const { activePeriodId } = getState();
    api.getDiscipline(activeEnrollmentId, activePeriodId, disciplineId).then(docSnap => {
        if(docSnap.exists()) {
            const data = docSnap.data();
            dom.addDisciplineForm.querySelector('#discipline-name').value = data.name || '';
            dom.addDisciplineForm.querySelector('#discipline-code').value = data.code || '';
            dom.addDisciplineForm.querySelector('#discipline-teacher').value = data.teacher || '';
            if (!isEAD) campusInput.value = data.campus || '';
            locationInput.value = data.location || '';
            if(workloadInput) workloadInput.value = data.workload || '';
            if(hoursPerClassInput) hoursPerClassInput.value = data.hoursPerClass || '';
            if (!isEAD && data.schedules && Array.isArray(data.schedules)) {
                data.schedules.forEach(schedule => addScheduleField(schedule));
            }
            if (isEAD && notesInput) {
                notesInput.value = data.notes || '';
            }
            renderColorPalette(data.color || '#6366f1');
        }
    });
  } else {
    dom.disciplineModalTitle.textContent = "Nova Disciplina";
    if (!isEAD) {
        campusInput.value = '';
        addScheduleField();
    }
    if (isEAD && notesInput) notesInput.value = '';
    locationInput.value = '';
    renderColorPalette('#6366f1');
  }
  showModal(dom.addDisciplineModal);
}

export function showPeriodModal() { 
    if (!dom.addPeriodModal || !dom.addPeriodForm) return; 
    dom.addPeriodForm.reset(); 
    showModal(dom.addPeriodModal); 
}

export function showAbsenceModal(disciplineId, disciplineName) { 
    if (!dom.addAbsenceModal || !dom.addAbsenceForm) return; 
    const { activeEnrollmentId, activePeriodId } = getState(); 
    setState('currentDisciplineForAbsence', { enrollmentId: activeEnrollmentId, periodId: activePeriodId, disciplineId }); 
    dom.addAbsenceForm.reset(); 
    dom.addAbsenceForm.querySelector('#absence-date').valueAsDate = new Date(); 
    showModal(dom.addAbsenceModal); 
}

export function showAbsenceHistoryModal(disciplineId, disciplineName) { 
    if (!dom.absenceHistoryModal || !dom.absenceHistoryTitle) return; 
    const { activeEnrollmentId, activePeriodId } = getState(); 
    setState('currentDisciplineForAbsence', { enrollmentId: activeEnrollmentId, periodId: activePeriodId, disciplineId }); 
    dom.absenceHistoryTitle.textContent = `Histórico de Faltas - ${disciplineName}`; 
    showModal(dom.absenceHistoryModal); 
}

export async function showPeriodOptionsModal() { 
    if (!dom.periodOptionsModal) return; 
    
    const { periods, activePeriodIndex } = getState(); 
    const currentPeriod = periods[activePeriodIndex]; 
    if (!currentPeriod) return; 

    if (dom.periodOptionsSubtitle) dom.periodOptionsSubtitle.textContent = currentPeriod.name; 
    
    if (dom.periodOptionsForm) { 
        dom.periodOptionsForm.querySelector('#period-start-date').value = currentPeriod.startDate || ''; 
        dom.periodOptionsForm.querySelector('#period-end-date').value = currentPeriod.endDate || ''; 
    } 

    const uploadView = document.getElementById('calendar-upload-view');
    const uploadedView = document.getElementById('calendar-uploaded-view');
    const fileNameSpan = document.getElementById('calendar-file-name');
    const viewLink = document.getElementById('view-calendar-link');

    if (currentPeriod.calendarUrl) {
        uploadView.classList.add('hidden');
        uploadedView.classList.remove('hidden');
        fileNameSpan.textContent = currentPeriod.calendarUrl.split('/').pop().slice(0, 30) + '...';
        viewLink.href = currentPeriod.calendarUrl;
    } else {
        uploadView.classList.remove('hidden');
        uploadedView.classList.add('hidden');
    }
    
    if (dom.endPeriodBtn && dom.reopenPeriodBtn) { 
        if (currentPeriod.status === 'closed') { 
            dom.endPeriodBtn.classList.add('hidden'); 
            dom.reopenPeriodBtn.classList.remove('hidden'); 
        } else { 
            dom.endPeriodBtn.classList.remove('hidden'); 
            dom.reopenPeriodBtn.classList.add('hidden'); 
        } 
    } 
    
    showModal(dom.periodOptionsModal); 
}

export async function showConfigGradesModal(disciplineId, periodId) {
    if (!dom.configGradesModal || !dom.configGradesForm) return;

    const { activeEnrollmentId } = getState();
    setState('currentDisciplineForGrades', { enrollmentId: activeEnrollmentId, periodId: periodId, disciplineId });
    
    dom.configGradesForm.reset();
    if (dom.gradesContainer) dom.gradesContainer.innerHTML = 'Carregando...';
    showModal(dom.configGradesModal);

    try {
        const disciplineSnap = await api.getDiscipline(activeEnrollmentId, periodId, disciplineId);
        if (disciplineSnap.exists()) {
            const discipline = disciplineSnap.data();
            const config = discipline.gradeConfig;
            
            if (dom.configGradesTitle) dom.configGradesTitle.textContent = `Avaliações de ${discipline.name}`;
            if (dom.gradesContainer) dom.gradesContainer.innerHTML = '';

            if (config && config.evaluations) {
                dom.configGradesForm.querySelector('#grade-calculation-rule').value = config.rule || 'weighted';
                config.evaluations.forEach(ev => {
                    addGradeField(ev);
                });
            }
        } else {
            if (dom.gradesContainer) dom.gradesContainer.innerHTML = '<p class="text-subtle text-center">Disciplina não encontrada.</p>';
        }
    } catch(error) {
        console.error("Erro ao buscar disciplina no modal de avaliações:", error);
        if (dom.gradesContainer) dom.gradesContainer.innerHTML = '<p class="text-danger text-center">Ocorreu um erro ao carregar os dados.</p>';
    }
    
    if (dom.gradesContainer && dom.gradesContainer.children.length === 0 && dom.gradesContainer.textContent === '') {
        addGradeField();
    }
    updateWeightsSum();
}

export function showPdfViewerModal(url) { 
    if (!dom.pdfViewerModal || !dom.pdfViewerIframe) return; 
    dom.pdfViewerIframe.src = url; 
    showModal(dom.pdfViewerModal); 
}

// --- INÍCIO DA MODIFICAÇÃO 1 ---
// Função movida para fora e paleta de cores unificada
function renderEventColorPalette(selectedColor) {
    const paletteContainer = dom.addEventForm.querySelector('#event-color-palette');
    const colorInput = dom.addEventForm.querySelector('#event-color-input');
    if (!paletteContainer || !colorInput) return;

    // Paleta de cores agora é a mesma da disciplina
    const colors = ['#6366f1', '#8b5cf6', '#d946ef', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981', '#14b8a6', '#0ea5e9', '#ec4899'];
    paletteContainer.innerHTML = '';
    colors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.dataset.color = color;
        if (color === selectedColor) swatch.classList.add('selected');
        paletteContainer.appendChild(swatch);
    });
    colorInput.value = selectedColor;
}
// --- FIM DA MODIFICAÇÃO 1 ---

export async function showEventModal(eventId = null, dateStr = null) {
    if (!dom.addEventModal || !dom.addEventForm) return;
    
    dom.addEventForm.reset();
    const { activeEnrollmentId, activePeriodId } = getState();

    const disciplineList = dom.addEventForm.querySelector('#event-discipline-list');
    const disciplines = await api.getDisciplines(activeEnrollmentId, activePeriodId);
    disciplineList.innerHTML = `<li data-action="select-dropdown-item" data-value="none" class="selected">Nenhuma matéria relacionada</li>`;
    disciplines.forEach(d => {
        const li = document.createElement('li');
        li.dataset.action = 'select-dropdown-item';
        li.dataset.value = d.id;
        li.textContent = d.name;
        disciplineList.appendChild(li);
    });

    const titleEl = dom.addEventModal.querySelector('#event-modal-title');
    const deleteBtn = dom.addEventModal.querySelector('#delete-event-btn');

    if (eventId) {
        if (titleEl) titleEl.textContent = 'Editar Evento';
        if (deleteBtn) deleteBtn.classList.remove('hidden');
        
        const eventSnap = await api.getCalendarEvent(eventId, { enrollmentId: activeEnrollmentId, periodId: activePeriodId });
        if (eventSnap.exists()) {
            const data = eventSnap.data();
            dom.addEventForm.querySelector('#event-id').value = eventId;
            dom.addEventForm.querySelector('#event-title').value = data.title || '';
            dom.addEventForm.querySelector('#event-date').value = data.date || '';

            const disciplineItem = disciplineList.querySelector(`[data-value="${data.relatedDisciplineId || 'none'}"]`);
            if (disciplineItem) selectDropdownItem(disciplineItem);

            const categoryItem = dom.addEventForm.querySelector(`#event-category-list [data-value="${data.category || 'Prova'}"]`);
            if (categoryItem) selectDropdownItem(categoryItem);

            const reminderItem = dom.addEventForm.querySelector(`#event-reminder-list [data-value="${data.reminder || 'none'}"]`);
            if (reminderItem) selectDropdownItem(reminderItem);

            renderEventColorPalette(data.color || '#d946ef');
        }
    } else {
        if (titleEl) titleEl.textContent = 'Novo Evento';
        if (deleteBtn) deleteBtn.classList.add('hidden');
        dom.addEventForm.querySelector('#event-date').value = dateStr || new Date().toISOString().split('T')[0];
        
        const defaultCategory = dom.addEventForm.querySelector('#event-category-list [data-value="Prova"]');
        if (defaultCategory) selectDropdownItem(defaultCategory);

        const defaultReminder = dom.addEventForm.querySelector('#event-reminder-list [data-value="none"]');
        if (defaultReminder) selectDropdownItem(defaultReminder);
        
        if (dom.disciplineDashboardView && !dom.disciplineDashboardView.classList.contains('hidden')) {
            const { activeDisciplineId } = getState();
            if (activeDisciplineId) {
                const disciplineItem = disciplineList.querySelector(`[data-value="${activeDisciplineId}"]`);
                if (disciplineItem) {
                    selectDropdownItem(disciplineItem);
                }
            }
        } else {
            const noneItem = disciplineList.querySelector(`[data-value="none"]`);
            if(noneItem) selectDropdownItem(noneItem);
        }
    }

    showModal(dom.addEventModal);
}

export function showConfirmModal({ title, message, confirmText, confirmClass = 'bg-danger', onConfirm, onCancel }) {
    if (!dom.confirmModal || !dom.confirmModalTitle || !dom.confirmModalMessage || !dom.confirmModalConfirmBtn) return;
    
    setState('onConfirmAction', onConfirm);
    setState('onCancelAction', onCancel || null);

    dom.confirmModalTitle.textContent = title;
    dom.confirmModalMessage.textContent = message;
    dom.confirmModalConfirmBtn.textContent = confirmText;
    
    dom.confirmModalConfirmBtn.className = 'font-semibold py-2 px-4 rounded-lg text-white';
    dom.confirmModalConfirmBtn.classList.add(confirmClass);
    
    showModal(dom.confirmModal);
}

export async function showPomodoroSettingsModal() {
    if (!dom.pomodoroSettingsModal) return;

    let { activeEnrollmentId, activePeriodId } = getState();
    const disciplineList = dom.pomodoroSettingsForm.querySelector('#pomodoro-discipline-list');
    
    if (disciplineList) {
        disciplineList.innerHTML = `<li data-action="select-dropdown-item" data-value="none">Nenhuma disciplina</li>`;
    }
    
    if (!activeEnrollmentId) {
        const enrollments = await api.getEnrollments();
        if (enrollments.length > 0) {
            const firstEnrollment = enrollments[0];
            activeEnrollmentId = firstEnrollment.id;
            activePeriodId = firstEnrollment.activePeriodId;
        }
    }
    
    if (activeEnrollmentId && activePeriodId && disciplineList) {
        const disciplines = await api.getDisciplines(activeEnrollmentId, activePeriodId);
        disciplines.forEach(d => {
            const li = document.createElement('li');
            li.dataset.action = 'select-dropdown-item';
            li.dataset.value = d.id;
            li.textContent = d.name;
            disciplineList.appendChild(li);
        });
    }

    dom.pomodoroSettingsForm.reset();
    dom.pomodoroSettingsForm.querySelector('#pomodoro-study-time').value = 25;
    dom.pomodoroSettingsForm.querySelector('#pomodoro-break-time').value = 5;
    
    document.querySelectorAll('#pomodoro-settings-modal [data-dropdown-container]').forEach(container => {
        const firstItem = container.querySelector('li');
        if (firstItem) {
            selectDropdownItem(firstItem);
        }
    });

    showModal(dom.pomodoroSettingsModal);
}


// --- FUNÇÕES PARA ESCONDER MODAIS ---
export function hideEnrollmentModal() { hideModal(dom.addEnrollmentModal); }
export function hideDisciplineModal() { hideModal(dom.addDisciplineModal); }
export function hidePeriodModal() { hideModal(dom.addPeriodModal); }
export function hideAbsenceModal() { hideModal(dom.addAbsenceModal); }
export function hideAbsenceHistoryModal() { hideModal(dom.absenceHistoryModal); }
export function hideConfigGradesModal() { hideModal(dom.configGradesModal); }
export function hidePeriodOptionsModal() { hideModal(dom.periodOptionsModal); }
export function hidePdfViewerModal() { if (dom.pdfViewerIframe) dom.pdfViewerIframe.src = ''; hideModal(dom.pdfViewerModal); }
export function hideEventModal() { hideModal(dom.addEventModal); }
export function hidePomodoroSettingsModal() { hideModal(dom.pomodoroSettingsModal); }

export function hideConfirmModal() {
    setState('itemToDelete', null);
    setState('onConfirmAction', null);
    setState('onCancelAction', null);
    hideModal(dom.confirmModal);
}

export async function showCurriculumSubjectModal(subjectId = null) {
    if (!dom.addCurriculumSubjectModal) return;
    const form = dom.addCurriculumSubjectForm;
    form.reset();
    setState('editingCurriculumSubjectId', subjectId);

    if (subjectId) {
        const { activeEnrollmentId } = getState();
        const subjectRef = doc(db, 'users', auth.currentUser.uid, 'enrollments', activeEnrollmentId, 'curriculum', subjectId);
        const subjectSnap = await getDoc(subjectRef);

        if (subjectSnap.exists()) {
            const data = subjectSnap.data();
            form.querySelector('#curriculum-subject-name').value = data.name || '';
            form.querySelector('#curriculum-subject-code').value = data.code || '';
            form.querySelector('#curriculum-subject-period').value = data.period || '';
        }
    }

    showModal(dom.addCurriculumSubjectModal);
}

export function hideCurriculumSubjectModal() { hideModal(dom.addCurriculumSubjectModal); }

export async function showMarkAsCompletedModal(subject) {
    if (!dom.markAsCompletedModal) return;
    const form = dom.markAsCompletedForm;
    form.reset();
    setState('subjectToComplete', subject);

    dom.markAsCompletedTitle.textContent = `Concluir "${subject.name}"`;

    const periodList = form.querySelector('#completed-in-period-list');
    const { periods } = getState();
    periodList.innerHTML = '<li data-action="select-dropdown-item" data-value="" class="selected">Selecione o período</li>';
    
    periods.forEach(p => {
        const li = document.createElement('li');
        li.dataset.action = 'select-dropdown-item';
        li.dataset.value = p.id;
        li.textContent = p.name;
        periodList.appendChild(li);
    });

    const createNewLi = document.createElement('li');
    createNewLi.dataset.action = 'select-dropdown-item';
    createNewLi.dataset.value = '--create-new--';
    createNewLi.textContent = '+ Criar novo período...';
    periodList.appendChild(createNewLi);

    periodList.addEventListener('click', (e) => {
        const item = e.target.closest('[data-action="select-dropdown-item"]');
        if (item && item.dataset.value === '--create-new--') {
            setState('returnToCompleteSubjectModal', true);
            setState('subjectDataForReturn', subject);
            hideMarkAsCompletedModal();
            showPeriodModal();
        }
    });

    if(dom.equivalentCodeContainer) dom.equivalentCodeContainer.classList.add('hidden');
    showModal(dom.markAsCompletedModal);
}

export function hideMarkAsCompletedModal() { hideModal(dom.markAsCompletedModal); }

export async function showCurriculumSubjectDetailsModal(subjectId) {
    if (!dom.curriculumSubjectDetailsModal) return;

    const { activeEnrollmentId } = getState();
    
    const enrollmentSnap = await api.getEnrollment(activeEnrollmentId);
    if (!enrollmentSnap.exists()) return;
    const enrollmentData = enrollmentSnap.data();
    const passingGrade = enrollmentData.passingGrade || 7.0;

    const subjectRef = doc(db, 'users', auth.currentUser.uid, 'enrollments', activeEnrollmentId, 'curriculum', subjectId);
    const subjectSnapPromise = getDoc(subjectRef);
    const allTakenDisciplinesPromise = api.getAllTakenDisciplines(activeEnrollmentId);
    const [subjectSnap, allTakenDisciplines] = await Promise.all([subjectSnapPromise, allTakenDisciplinesPromise]);

    if (!subjectSnap.exists()) return;

    const subject = { id: subjectSnap.id, ...subjectSnap.data() };
    dom.detailsSubjectName.textContent = subject.name;
    dom.detailsSubjectCode.textContent = subject.code;

    const takenDiscipline = allTakenDisciplines.find(d => d.code === subject.code);
    
    let statusHTML = '<span class="font-bold text-warning">Pendente</span>';
    if (takenDiscipline) {
        const averageGrade = parseFloat(calculateAverage(takenDiscipline));
        const allGradesFilled = takenDiscipline.grades && takenDiscipline.grades.length > 0 && takenDiscipline.grades.every(g => g.grade !== null);
        if (allGradesFilled && !isNaN(averageGrade)) {
            if (averageGrade >= passingGrade) {
                statusHTML = '<span class="font-bold text-success">Aprovada</span>';
            } else {
                statusHTML = '<span class="font-bold text-danger">Reprovada</span>';
            }
        } else {
            statusHTML = '<span class="font-bold text-yellow-500">Em Andamento</span>';
        }
    }

    let detailsHTML = `
        <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div class="font-semibold text-subtle">Período Sugerido:</div>
            <div class="text-secondary">${subject.period ? `${subject.period}º Período` : 'Não definido'}</div>

            <div class="font-semibold text-subtle">Status:</div>
            <div>${statusHTML}</div>
        </div>
    `;

    if (takenDiscipline) {
        const averageGrade = calculateAverage(takenDiscipline);
        detailsHTML += `
            <hr class="border-border my-4">
            <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div class="font-semibold text-subtle">Cursada no Período:</div>
                <div class="text-secondary">${takenDiscipline.periodName || 'N/A'}</div>

                <div class="font-semibold text-subtle">Média Final:</div>
                <div class="text-secondary font-bold">
                    <span class="cursor-pointer hover:opacity-75 p-1 -m-1"
                          data-action="edit-completed-subject-grade"
                          data-discipline-id="${takenDiscipline.id}"
                          data-period-id="${takenDiscipline.periodId}"
                          data-subject-id="${subject.id}">
                        ${averageGrade}
                    </span>
                </div>
            </div>
        `;

        if (takenDiscipline.completionDetails?.isEquivalent) {
            detailsHTML += `
                <div class="mt-4 text-sm p-3 bg-bkg rounded-md border border-border">
                    <p class="font-semibold text-subtle">Concluída por Equivalência</p>
                    <p class="text-secondary">Código da disciplina original: ${takenDiscipline.completionDetails.equivalentCode || 'Não informado'}</p>
                </div>
            `;
        }
        if (takenDiscipline.completionDetails?.notes) {
            detailsHTML += `
                <div class="mt-4 text-sm">
                    <p class="font-semibold text-subtle mb-1">Observações:</p>
                    <p class="text-secondary p-3 bg-bkg rounded-md border border-border whitespace-pre-wrap">${takenDiscipline.completionDetails.notes}</p>
                </div>
            `;
        }
    }
    
    dom.detailsSubjectContent.innerHTML = detailsHTML;
    showModal(dom.curriculumSubjectDetailsModal);
}

export function hideCurriculumSubjectDetailsModal() { hideModal(dom.curriculumSubjectDetailsModal); }

// --- FUNÇÕES DO DROPDOWN PERSONALIZADO ---

export function toggleDropdown(container) {
    const panel = container.querySelector('[data-dropdown-panel]');
    if (panel) {
        panel.classList.toggle('hidden');
    }
}

export function selectDropdownItem(itemElement) {
    if (!itemElement) {
        return; 
    }

    const container = itemElement.closest('[data-dropdown-container]');
    if (!container) return;

    const value = itemElement.dataset.value;
    const text = itemElement.textContent;

    const hiddenInput = container.querySelector('input[type="hidden"]');
    const selectedValueSpan = container.querySelector('.selected-value');
    const panel = container.querySelector('[data-dropdown-panel]');
    
    if (hiddenInput) hiddenInput.value = value;
    if (selectedValueSpan) selectedValueSpan.textContent = text;
    
    const list = container.querySelector('.custom-dropdown-list');
    if (list) {
        list.querySelector('.selected')?.classList.remove('selected');
        itemElement.classList.add('selected');
    }

    if (panel) panel.classList.add('hidden');

    // --- INÍCIO DA MODIFICAÇÃO 2 ---
    // Se o item selecionado for uma disciplina no modal de eventos, atualiza a cor.
    if (itemElement.closest('#event-discipline-list')) {
        const disciplineId = itemElement.dataset.value;
        const disciplines = getState().disciplines || [];
        const discipline = disciplines.find(d => d.id === disciplineId);
        
        // Usa a cor da disciplina se encontrada, senão, uma cor padrão para eventos.
        const newColor = discipline?.color || '#d946ef'; 
        
        // Re-renderiza a paleta de cores para refletir a nova seleção.
        renderEventColorPalette(newColor);
    }
    // --- FIM DA MODIFICAÇÃO 2 ---
}

export async function showDocumentModal(documentId = null) {
    if (!dom.addDocumentModal) return;
    const form = dom.addDocumentForm;
    form.reset();
    setState('editingDocumentId', documentId);

    form.querySelectorAll('[data-dropdown-container]').forEach(container => {
        const firstItem = container.querySelector('li');
        if (firstItem) selectDropdownItem(firstItem);
    });

    const { activeEnrollmentId } = getState();
    const disciplineList = document.getElementById('modal-discipline-list');
    if (disciplineList) disciplineList.innerHTML = '<li data-action="select-dropdown-item" data-value="none" class="selected">Nenhuma</li>';

    try {
        const enrollments = activeEnrollmentId ? [getState().activeEnrollment] : await api.getEnrollments();
        if (!enrollments || enrollments.length === 0) {
            showModal(dom.addDocumentModal);
            return;
        }

        for (const enrollment of enrollments) {
            if (!enrollment || !enrollment.id) continue;
            
            const periods = await api.getPeriods(enrollment.id);
            const activePeriod = periods.find(p => p.id === enrollment.activePeriodId) || periods[0];

            if (activePeriod && disciplineList) {
                const disciplines = await api.getDisciplines(enrollment.id, activePeriod.id);
                disciplines.forEach(d => {
                    const li = document.createElement('li');
                    li.dataset.action = 'select-dropdown-item';
                    li.dataset.value = d.id;
                    li.dataset.enrollmentId = enrollment.id;
                    li.dataset.periodId = activePeriod.id;
                    li.textContent = activeEnrollmentId ? d.name : `${d.name} (${enrollment.course})`;
                    disciplineList.appendChild(li);
                });
            }
        }
    } catch (error) {
        console.error("Erro ao carregar disciplinas para o modal:", error);
        notify.error("Não foi possível carregar as disciplinas.");
    }
    
    showModal(dom.addDocumentModal);
}


export function hideDocumentModal() {
    hideModal(dom.addDocumentModal);
}