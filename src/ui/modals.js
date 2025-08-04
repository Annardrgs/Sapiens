/**
 * @file Módulo para gerenciar a lógica de todos os modais.
 */

import { dom } from './dom.js';
import { setState, getState } from '../store/state.js';
import * as api from '../api/firestore.js';
import { renderGradesChart } from '../components/card.js';

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
        
        // Preenche o modal com os dados
        dom.detailDisciplineName.textContent = discipline.name;
        dom.detailDisciplineTeacher.textContent = discipline.teacher || 'Professor não definido';

        // Renderiza o gráfico dentro do novo modal
        renderGradesChart(dom.detailGradeChartContainer, discipline);
        
        // Passa o ID da disciplina para o botão "Configurar Avaliações"
        dom.detailConfigGradesBtn.dataset.id = discipline.id;
        dom.detailConfigGradesBtn.dataset.name = discipline.name;

        // Esconde o botão se o período estiver encerrado
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
            dom.addEnrollmentForm.querySelector('#enrollment-period').value = data.currentPeriod;
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
    paletteContainer.innerHTML = ''; // Limpa a paleta

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

  // Referências aos elementos do formulário
  const campusInput = dom.addDisciplineForm.querySelector('#discipline-campus');
  const locationInput = dom.addDisciplineForm.querySelector('#discipline-location');
  const workloadInput = dom.addDisciplineForm.querySelector('#discipline-workload');
  const hoursPerClassInput = dom.addDisciplineForm.querySelector('#discipline-hours-per-class');
  const schedulesSection = dom.addDisciplineForm.querySelector('#schedules-container').parentElement; // Pega a div que contém os horários

  // Lógica para ajustar o formulário para EAD
  if (isEAD) {
    campusInput.value = 'Remoto';
    campusInput.disabled = true;
    locationInput.disabled = true;
    schedulesSection.classList.add('hidden'); // Esconde a seção de horários
    workloadInput.required = false; // Torna campos opcionais
    hoursPerClassInput.required = false;
  } else {
    campusInput.disabled = false;
    locationInput.disabled = false;
    schedulesSection.classList.remove('hidden'); // Mostra a seção de horários
    workloadInput.required = true; // Torna campos obrigatórios
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
        addScheduleField(); // Adiciona um campo de horário por padrão para presencial
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

    // Atualiza o subtítulo com o nome do período
    if (dom.periodOptionsSubtitle) dom.periodOptionsSubtitle.textContent = currentPeriod.name; 
    
    // Preenche as datas
    if (dom.periodOptionsForm) { 
        dom.periodOptionsForm.querySelector('#period-start-date').value = currentPeriod.startDate || ''; 
        dom.periodOptionsForm.querySelector('#period-end-date').value = currentPeriod.endDate || ''; 
    } 

    // Lógica para exibir o estado do calendário (com ou sem arquivo)
    const uploadView = document.getElementById('calendar-upload-view');
    const uploadedView = document.getElementById('calendar-uploaded-view');
    const fileNameSpan = document.getElementById('calendar-file-name');
    const viewLink = document.getElementById('view-calendar-link');

    if (currentPeriod.calendarUrl) {
        uploadView.classList.add('hidden');
        uploadedView.classList.remove('hidden');
        // Extrai um nome de arquivo mais amigável da URL
        fileNameSpan.textContent = currentPeriod.calendarUrl.split('/').pop().slice(0, 30) + '...';
        viewLink.href = currentPeriod.calendarUrl;
    } else {
        uploadView.classList.remove('hidden');
        uploadedView.classList.add('hidden');
    }
    
    // Controla a visibilidade dos botões de encerrar/reabrir
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

export async function showConfigGradesModal(disciplineId) { // Agora recebe apenas o ID
    if (!dom.configGradesModal || !dom.configGradesForm) return;

    const { activeEnrollmentId, activePeriodId } = getState();
    setState('currentDisciplineForGrades', { enrollmentId: activeEnrollmentId, periodId: activePeriodId, disciplineId });
    
    dom.configGradesForm.reset();
    dom.gradesContainer.innerHTML = 'Carregando...';
    showModal(dom.configGradesModal); // Mostra o modal enquanto carrega

    const disciplineSnap = await api.getDiscipline(activeEnrollmentId, activePeriodId, disciplineId);
    if (disciplineSnap.exists()) {
        const discipline = disciplineSnap.data();
        const config = discipline.gradeConfig;
        
        // Define o título com o nome correto
        dom.configGradesTitle.textContent = `Avaliações de ${discipline.name}`;
        dom.gradesContainer.innerHTML = ''; // Limpa o "Carregando..."

        if (config && config.evaluations) {
            dom.configGradesForm.querySelector('#grade-calculation-rule').value = config.rule || 'weighted';
            config.evaluations.forEach(ev => {
                addGradeField(ev);
            });
        }
    }
    
    if (dom.gradesContainer.children.length === 0) {
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

    // Popula o dropdown de disciplinas
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

    // CORREÇÃO: Busca os elementos a partir do MODAL, não do FORMULÁRIO
    const titleEl = dom.addEventModal.querySelector('#event-modal-title');
    const deleteBtn = dom.addEventModal.querySelector('#delete-event-btn');
    
    if (eventId) { // MODO EDIÇÃO
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
    } else { // MODO CRIAÇÃO
        if (titleEl) titleEl.textContent = 'Novo Evento';
        if (deleteBtn) deleteBtn.classList.add('hidden');
        dom.addEventForm.querySelector('#event-date').value = dateStr || new Date().toISOString().split('T')[0];
        renderEventColorPalette('#d946ef');
    }

    showModal(dom.addEventModal);
}

/**
 * Exibe um modal de confirmação genérico.
 * @param {object} options - As opções para o modal.
 * @param {string} options.title - O título do modal.
 * @param {string} options.message - A mensagem de confirmação.
 * @param {string} options.confirmText - O texto para o botão de confirmação.
 * @param {string} [options.confirmClass='bg-danger'] - A classe de cor para o botão de confirmação.
 * @param {Function} options.onConfirm - A função a ser executada ao confirmar.
 */
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