/**
 * @file Módulo para criar componentes de UI reutilizáveis, como cards.
 */
export function createEnrollmentCard(data) {
    const card = document.createElement('div');
    card.dataset.id = data.id;
    card.className = "relative bg-surface p-6 rounded-lg shadow-lg border border-border hover:border-primary transition-all group cursor-pointer";
    card.innerHTML = `
        <div class="pr-10">
            <h4 class="text-xl font-bold text-secondary">${data.course}</h4>
            <p class="text-subtle">${data.institution}</p>
            <p class="text-sm text-subtle mt-4">Período: ${data.displayPeriod || 'N/A'}</p>
        </div>
        <div class="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button data-action="edit-enrollment" data-id="${data.id}" title="Editar" class="p-2 rounded-full hover:bg-bkg"><svg class="w-5 h-5 text-subtle pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
            <button data-action="delete-enrollment" data-id="${data.id}" title="Excluir" class="p-2 rounded-full hover:bg-bkg"><svg class="w-5 h-5 text-danger pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
        </div>
    `;
    return card;
}

/**
 * Cria o HTML para um card de disciplina com a nova estrutura expansível.
 */
export function createDisciplineCard(discipline, enrollmentData, isPeriodClosed = false) {
    const card = document.createElement('div');
    card.className = 'relative bg-surface border border-border rounded-xl shadow-sm transition-all duration-300 ease-in-out hover:border-primary group';
    card.dataset.id = discipline.id;
    card.dataset.action = 'view-discipline-details';

    const currentAbsences = discipline.absences || 0;
    const hasExceededAbsences = discipline.failedByAbsence === true;

    let averageGrade = calculateAverage(discipline);
    const passingGrade = enrollmentData.passingGrade || 7.0;
    
    let status = { text: 'N/A', color: 'subtle' };

    if (hasExceededAbsences) {
        status = { text: 'Reprovado por Falta', color: 'danger' };
    } else if (averageGrade !== 'N/A') {
        const numericAverage = parseFloat(averageGrade);
        const allGradesFilled = discipline.grades && discipline.grades.every(g => g.grade !== null);
        if (numericAverage >= passingGrade) status = { text: 'Aprovado', color: 'success' };
        else if (allGradesFilled) status = { text: 'Reprovado', color: 'danger' };
        else status = { text: 'Em Andamento', color: 'warning' };
    }
    
    card.innerHTML = `
        <div class="p-4 cursor-pointer">
            <div class="flex items-start justify-between">
                <div class="flex items-center gap-4 pr-16">
                    <span class="w-2 h-10 rounded-full flex-shrink-0" style="background-color: ${discipline.color || '#4f46e5'}"></span>
                    <div>
                        <h4 class="text-xl font-bold text-secondary flex items-baseline">
                            ${discipline.name}
                            ${discipline.code ? `<span class="ml-2 text-xs font-mono text-subtle">(${discipline.code})</span>` : ''}
                        </h4>
                        <p class="text-sm text-subtle">${discipline.schedules?.map(s => `${s.day} ${s.startTime}-${s.endTime}`).join(', ') || 'Horário indefinido'}</p>
                    </div>
                </div>
            </div>
            <div class="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                    <span class="text-xs font-bold text-subtle">Faltas</span>
                    <p class="font-bold text-lg text-secondary">${currentAbsences}</p>
                </div>
                <div>
                    <span class="text-xs font-bold text-subtle">Média</span>
                    <p class="font-bold text-lg text-secondary">${averageGrade}</p>
                </div>
                <div>
                    <span class="text-xs font-bold text-subtle">Status</span>
                    <p class="font-bold text-lg text-${status.color}">${status.text}</p>
                </div>
            </div>
        </div>

        <div class="absolute top-3 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button data-action="edit-discipline" data-id="${discipline.id}" title="Editar Disciplina" class="p-2 rounded-full hover:bg-bkg text-subtle hover:text-primary">
                <svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button data-action="delete-discipline" data-id="${discipline.id}" title="Excluir Disciplina" class="p-2 rounded-full hover:bg-bkg text-subtle hover:text-danger">
                <svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        </div>
    `;
    return card;
}

export function renderGradesChart(container, discipline) {
    if (!container || !discipline.grades || discipline.grades.length === 0) {
        container.innerHTML = `<p class="text-xs text-subtle self-center text-center">Nenhuma nota para exibir.</p>`;
        return;
    }

    container.innerHTML = discipline.grades.map(gradeInfo => {
        const grade = (gradeInfo && gradeInfo.grade !== null) ? parseFloat(gradeInfo.grade) : 0;
        const heightPercentage = Math.max(grade * 10, 0);
        const gradeLabel = (gradeInfo && gradeInfo.grade !== null) ? grade.toFixed(1) : '-';

        return `
            <div class="grade-chart-bar-wrapper" title="${gradeInfo.name}: ${gradeLabel}">
                <div class="grade-chart-bar" style="height: ${heightPercentage}%">
                    <span class="grade-chart-value">${gradeLabel}</span>
                </div>
                <span class="text-xs text-subtle mt-1 truncate w-full">${gradeInfo.name}</span>
            </div>
        `;
    }).join('');
}

function populateGradesInputs(container, discipline, isPeriodClosed) {
    if (!container) return;
    if (!discipline.gradeConfig || !discipline.gradeConfig.evaluations || discipline.gradeConfig.evaluations.length === 0) {
        container.innerHTML = `<div class="col-span-full"><p class="text-sm text-subtle italic">Nenhuma avaliação configurada.</p></div>`;
        return;
    }
    container.innerHTML = discipline.gradeConfig.evaluations.map((evaluation, index) => {
        const gradeValue = (discipline.grades && discipline.grades[index] && discipline.grades[index].grade !== null) ? discipline.grades[index].grade : '';
        return `
            <div class="bg-bkg p-2 rounded-md border border-border">
                <label class="text-xs text-subtle block text-center truncate" title="${evaluation.name}">${evaluation.name}</label>
                <input type="number" step="0.1" min="0" max="10" 
                    data-discipline-id="${discipline.id}" data-grade-index="${index}"
                    class="grade-input w-full bg-transparent text-center font-semibold text-secondary outline-none" 
                    placeholder="-" value="${gradeValue}" ${isPeriodClosed ? 'disabled' : ''}>
            </div>
        `;
    }).join('');
}

export function calculateAverage(data) {
    if (data.failedByAbsence) {
        return '0.00';
    }
    
    if (!data.grades || data.grades.length === 0) {
        return 'N/A';
    }

    if (data.gradeConfig && data.gradeConfig.evaluations && data.gradeConfig.evaluations.length > 0) {
        let averageGrade = 'N/A';
        const { rule, evaluations } = data.gradeConfig;
        const { grades } = data;

        if (rule === 'weighted') {
            let totalWeight = 0;
            let weightedSum = 0;
            evaluations.forEach((evaluation, index) => {
                const gradeInfo = grades[index];
                const grade = (gradeInfo && typeof gradeInfo.grade === 'number') ? gradeInfo.grade : 0;
                
                if (evaluation.weight > 0) {
                    weightedSum += grade * (evaluation.weight / 100);
                    totalWeight += (evaluation.weight / 100);
                }
            });
            if (totalWeight > 0) averageGrade = (weightedSum / totalWeight).toFixed(2);

        } else { // Média Aritmética
            let gradeSum = 0;
            let gradeCount = evaluations.length;
            if(gradeCount === 0) return 'N/A';
            
            grades.forEach(gradeInfo => {
                const grade = (gradeInfo && typeof gradeInfo.grade === 'number') ? gradeInfo.grade : 0;
                gradeSum += grade;
            });
            averageGrade = (gradeSum / gradeCount).toFixed(2);
        }
        
        return parseFloat(averageGrade) === 0 ? "0.00" : averageGrade;
    }

    const finalGrade = data.grades[0]?.grade;
    if (typeof finalGrade === 'number') {
        return finalGrade.toFixed(2);
    }

    return 'N/A';
}

function getNextClassInfo(schedules) {
    if (!schedules || schedules.length === 0) return 'Horário não definido';

    const dayMap = { 'Dom': 0, 'Seg': 1, 'Ter': 2, 'Qua': 3, 'Qui': 4, 'Sex': 5, 'Sab': 6 };
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    let nextClass = null;

    // Procura por aulas nos próximos 7 dias
    for (let i = 0; i < 7; i++) {
        const dayToCheck = (currentDay + i) % 7;
        const classesToday = schedules
            .filter(s => dayMap[s.day] === dayToCheck)
            .map(s => {
                const [h, m] = s.startTime.split(':').map(Number);
                return { ...s, totalMinutes: h * 60 + m, dayOffset: i };
            })
            .sort((a, b) => a.totalMinutes - b.totalMinutes);

        for (const classInfo of classesToday) {
            // Se for hoje, verifica se a aula ainda não passou
            if (i === 0 && classInfo.totalMinutes <= currentTime) {
                continue;
            }
            nextClass = classInfo;
            break;
        }
        if (nextClass) break;
    }

    if (!nextClass) return 'Sem aulas futuras';

    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    if (nextClass.dayOffset === 0) return `Hoje, ${nextClass.startTime}`;
    if (nextClass.dayOffset === 1) return `Amanhã, ${nextClass.startTime}`;
    return `${dayNames[dayMap[nextClass.day]]}, ${nextClass.startTime}`;
}

export function createAbsenceHistoryItem(data) {
    const item = document.createElement('div');
    item.className = "flex items-start justify-between bg-bkg p-3 rounded-md border border-border";
    const absenceDate = new Date(data.absenceDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    item.innerHTML = `
        <div>
            <p class="font-semibold text-secondary">${absenceDate}</p>
            <p class="text-sm text-subtle">${data.justification || 'Sem justificativa'}</p>
        </div>
        <button data-id="${data.id}" class="remove-absence-btn p-1 rounded-full hover:bg-surface text-danger">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
        </button>
    `;
    return item;
}

export function createSummaryCard({ title, value, icon }) {
    const iconMap = {
        book: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.25278C12 6.25278 10.8333 4 8.5 4C5.5 4 3 6.5 3 9.5C3 12.5 6 15.5 12 21.5C18 15.5 21 12.5 21 9.5C21 6.5 18.5 4 15.5 4C13.1667 4 12 6.25278 12 6.25278Z"></path></svg>`,
        calendar: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3M16 7V3M4 11H20M21 8V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V8C3 6.89543 3.89543 6 5 6H19C20.1046 6 21 6.89543 21 8Z"></path></svg>`,
        'user-minus': `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 21V19C17 16.7909 15.2091 15 13 15H5C2.79086 15 1 16.7909 1 19V21M17 11L23 11M9 11C6.23858 11 4 8.76142 4 6C4 3.23858 6.23858 1 9 1C11.7614 1 14 3.23858 14 6C14 8.76142 11.7614 11 9 11Z"></path></svg>`,
        'check-circle': `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"></path></svg>`,
        'academic-cap': `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" /></svg>`
    };

    return `
        <div class="bg-surface p-4 rounded-xl border border-border flex items-start gap-4">
            <div class="p-2 bg-primary/10 text-primary rounded-lg">
                ${iconMap[icon] || ''}
            </div>
            <div>
                <h4 class="text-sm font-bold text-subtle">${title}</h4>
                <p class="text-2xl font-bold text-secondary">${value}</p>
            </div>
        </div>
    `;
}

const fileIconSVG = `<svg class="w-12 h-12 text-subtle/50" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>`;

export function createDocumentCard(doc) {
    const card = document.createElement('div');
    card.className = "bg-surface rounded-lg shadow-md border border-border group relative overflow-hidden";
    
    let previewContent = fileIconSVG; // Ícone padrão
    const fileType = doc.fileType || '';

    if (doc.fileUrl) {
        // Se for uma imagem, cria uma miniatura recortada.
        if (fileType.startsWith('image/')) {
            const thumbnailUrl = doc.fileUrl.replace('/upload/', '/upload/w_400,h_300,c_fill,q_auto/');
            previewContent = `<img src="${thumbnailUrl}" alt="${doc.title}" class="w-full h-full object-cover">`;
        }
        // Se for um PDF, gera uma imagem da primeira página.
        else if (fileType === 'application/pdf') {
            const pdfPreviewUrl = doc.fileUrl.replace(/\.pdf$/i, '.jpg').replace('/upload/', '/upload/w_400,h_300,c_fill,q_auto/');
            previewContent = `<img src="${pdfPreviewUrl}" alt="Preview de ${doc.title}" class="w-full h-full object-cover">`;
        }
    }
    
    card.innerHTML = `
      <a href="${doc.fileUrl}" target="_blank" class="block h-32 bg-bkg flex items-center justify-center overflow-hidden">
        ${previewContent}
      </a>
      <div class="p-4">
        <h5 class="font-bold text-secondary truncate" title="${doc.title}">${doc.title}</h5>
        <p class="text-sm text-primary font-semibold">${doc.type}</p>
        <div class="mt-2 flex flex-wrap gap-1">
          ${(doc.tags || []).map(tag => `<span class="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">${tag}</span>`).join('')}
        </div>
      </div>
      <div class="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <a href="${doc.fileUrl}" target="_blank" title="Ver" class="p-2 rounded-full bg-surface/80 hover:bg-surface text-secondary backdrop-blur-sm"><svg class.w-5.h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></a>
          <button data-action="delete-document" data-id="${doc.id}" title="Excluir" class="p-2 rounded-full bg-surface/80 hover:bg-surface text-danger backdrop-blur-sm"><svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
      </div>
    `;
    return card;
}