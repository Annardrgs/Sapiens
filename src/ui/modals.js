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
    field.innerHTML = `<select name="schedule-day" class="w-full px-3 py-2 bg-bkg text-secondary border border-border rounded-md custom-select"><option value="Seg">Segunda</option><option value="Ter">Terça</option><option value="Qua">Quarta</option><option value="Qui">Quinta</option><option value="Sex">Sexta</option><option value="Sab">Sábado</option><option value="Dom">Domingo</option></select><input type="time" name="schedule-start" required class="px-3 py-2 bg-bkg text-secondary border border-border rounded-md"><input type="time" name="schedule-end" required class="px-3 py-2 bg-bkg text-secondary border border-border rounded-md"><button type="button" class="remove-schedule-btn text-danger p-2 rounded-full hover:bg-danger/10"><svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>`;
    field.querySelector('[name="schedule-day"]').value = schedule.day || 'Seg';
    field.querySelector('[name="schedule-start"]').value = schedule.startTime || '';
    field.querySelector('[name="schedule-end"]').value = schedule.endTime || '';
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

  const campusInput = dom.addDisciplineForm.querySelector('#discipline-campus');
  const locationInput = dom.addDisciplineForm.querySelector('#discipline-location');
  const workloadInput = dom.addDisciplineForm.querySelector('#discipline-workload');
  const hoursPerClassInput = dom.addDisciplineForm.querySelector('#discipline-hours-per-class');
  const schedulesSection = dom.addDisciplineForm.querySelector('#schedules-container').parentElement;

  if (isEAD) {
    campusInput.value = 'Remoto';
    campusInput.disabled = true;
    locationInput.disabled = true;
    schedulesSection.classList.add('hidden');
    workloadInput.required = false;
    hoursPerClassInput.required = false;
  } else {
    campusInput.disabled = false;
    locationInput.disabled = false;
    schedulesSection.classList.remove('hidden');
    workloadInput.required = true;
    hoursPerClassInput.required = true;
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
            workloadInput.value = data.workload || '';
            hoursPerClassInput.value = data.hoursPerClass || '';
            if (!isEAD && data.schedules && Array.isArray(data.schedules)) {
                data.schedules.forEach(schedule => addScheduleField(schedule));
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
    dom.gradesContainer.innerHTML = 'Carregando...';
    showModal(dom.configGradesModal);

    try {
        const disciplineSnap = await api.getDiscipline(activeEnrollmentId, periodId, disciplineId);
        if (disciplineSnap.exists()) {
            const discipline = disciplineSnap.data();
            const config = discipline.gradeConfig;
            
            dom.configGradesTitle.textContent = `Avaliações de ${discipline.name}`;
            dom.gradesContainer.innerHTML = '';

            if (config && config.evaluations) {
                dom.configGradesForm.querySelector('#grade-calculation-rule').value = config.rule || 'weighted';
                config.evaluations.forEach(ev => {
                    addGradeField(ev);
                });
            }
        } else {
            dom.gradesContainer.innerHTML = '<p class="text-subtle text-center">Disciplina não encontrada.</p>';
        }
    } catch(error) {
        console.error("Erro ao buscar disciplina no modal de avaliações:", error);
        dom.gradesContainer.innerHTML = '<p class="text-danger text-center">Ocorreu um erro ao carregar os dados.</p>';
    }
    
    if (dom.gradesContainer.children.length === 0 && dom.gradesContainer.textContent === '') {
        addGradeField();
    }
    updateWeightsSum();
}

export function showPdfViewerModal(url) { 
    if (!dom.pdfViewerModal || !dom.pdfViewerIframe) return; 
    dom.pdfViewerIframe.src = url; 
    showModal(dom.pdfViewerModal); 
}

function renderEventColorPalette(selectedColor) {
    const paletteContainer = dom.addEventForm.querySelector('#event-color-palette');
    const colorInput = dom.addEventForm.querySelector('#event-color-input');
    if (!paletteContainer || !colorInput) return;

    const colors = ['#d946ef', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#6366f1'];
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

export async function showEventModal(eventId = null, dateStr = null) {
    if (!dom.addEventModal || !dom.addEventForm) return;
    
    dom.addEventForm.reset();
    const { activeEnrollmentId, activePeriodId } = getState();

    const disciplineSelect = dom.addEventForm.querySelector('#event-discipline');
    const disciplines = await api.getDisciplines(activeEnrollmentId, activePeriodId);
    disciplineSelect.innerHTML = `<option value="none">Nenhuma matéria relacionada</option>`;
    disciplines.forEach(d => {
        const option = document.createElement('option');
        option.value = d.id;
        option.textContent = d.name;
        option.dataset.color = d.color || '#6b7280';
        disciplineSelect.appendChild(option);
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
            dom.addEventForm.querySelector('#event-category').value = data.category || 'Prova';
            dom.addEventForm.querySelector('#event-discipline').value = data.relatedDisciplineId || 'none';
            dom.addEventForm.querySelector('#event-reminder').value = data.reminder || 'none';
            renderEventColorPalette(data.color || '#d946ef');
        }
    } else {
        if (titleEl) titleEl.textContent = 'Novo Evento';
        if (deleteBtn) deleteBtn.classList.add('hidden');
        dom.addEventForm.querySelector('#event-date').value = dateStr || new Date().toISOString().split('T')[0];
        renderEventColorPalette('#d946ef');
    }

    showModal(dom.addEventModal);
}

export function showConfirmModal({ title, message, confirmText, confirmClass = 'bg-danger', onConfirm }) {
    if (!dom.confirmModal || !dom.confirmModalTitle || !dom.confirmModalMessage || !dom.confirmModalConfirmBtn) return;
    
    setState('onConfirmAction', onConfirm);

    dom.confirmModalTitle.textContent = title;
    dom.confirmModalMessage.textContent = message;
    dom.confirmModalConfirmBtn.textContent = confirmText;
    
    dom.confirmModalConfirmBtn.className = 'font-semibold py-2 px-4 rounded-lg text-white';
    dom.confirmModalConfirmBtn.classList.add(confirmClass);
    
    showModal(dom.confirmModal);
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

export function hideConfirmModal() {
    setState('itemToDelete', null);
    setState('onConfirmAction', null);
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

    const periodSelect = form.querySelector('#completed-in-period');
    const { periods } = getState();
    periodSelect.innerHTML = '<option value="">Selecione o período</option>';
    
    periods.forEach(p => {
        const option = new Option(p.name, p.id);
        periodSelect.appendChild(option);
    });

    const createNewOption = new Option('+ Criar novo período...', '--create-new--');
    periodSelect.add(createNewOption);

    periodSelect.addEventListener('change', (e) => {
        if (e.target.value === '--create-new--') {
            setState('returnToCompleteSubjectModal', true);
            setState('subjectDataForReturn', subject);
            hideMarkAsCompletedModal();
            showPeriodModal();
        }
    });

    dom.equivalentCodeContainer.classList.add('hidden');
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