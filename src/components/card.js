/**
 * Calcula e retorna o status de uma disciplina.
 * @param {object} discipline - O objeto da disciplina.
 * @param {object} enrollmentData - Os dados da matrícula.
 * @returns {string} O status ('N/A', 'Em Andamento', 'Aprovado', 'Reprovado').
 */
export function getDisciplineStatus(discipline, enrollmentData) {
    const passingGrade = enrollmentData.passingGrade || 7.0;
    const evaluationsExist = discipline.gradeConfig && discipline.gradeConfig.evaluations && discipline.gradeConfig.evaluations.length > 0;

    if (!evaluationsExist) {
        return 'N/A';
    }

    const allGradesFilled = discipline.grades && discipline.gradeConfig.evaluations.every(evaluation => {
        const gradeEntry = discipline.grades.find(g => g.name === evaluation.name);
        return gradeEntry && gradeEntry.grade !== null && gradeEntry.grade !== undefined;
    });

    if (allGradesFilled) {
        const averageGrade = calculateAverage(discipline);
        if (averageGrade !== 'N/A') {
            return parseFloat(averageGrade) >= passingGrade ? 'Aprovado' : 'Reprovado';
        }
    }
    
    return 'Em Andamento';
}

function toggleOptionsMenu(event) {
    event.stopPropagation();
    const menuButton = event.currentTarget;
    const menuId = menuButton.getAttribute('aria-controls');
    const menu = document.getElementById(menuId);

    if (menu) {
        document.querySelectorAll('.menu-options:not(.hidden)').forEach(openMenu => {
            if (openMenu.id !== menuId) {
                openMenu.classList.add('hidden');
            }
        });
        menu.classList.toggle('hidden');
    }
}

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
            <button data-action="edit-enrollment" data-id="${data.id}" title="Editar" class="p-2 rounded-full hover:bg-bkg"><svg class="w-5 h-5 text-subtle pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002 2V7a2 2 0 00-2-2h-5l-2-2H9L7 5H6z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.121-2.121a2.5 2.5 0 013.536 0l-9.192 9.192a2.5 2.5 0 01-1.768.732H5v-2.828a2.5 2.5 0 01.732-1.768l9.192-9.192z"></path></svg></button>
            <button data-action="delete-enrollment" data-id="${data.id}" title="Excluir" class="p-2 rounded-full hover:bg-bkg"><svg class="w-5 h-5 text-subtle pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
        </div>
    `;
    return card;
}

/**
 * Cria o elemento HTML para um card de disciplina.
 * @param {object} discipline - O objeto da disciplina.
 * @param {object} enrollmentData - Os dados da matrícula associada.
 * @param {boolean} isPeriodClosed - Se o período está encerrado.
 * @returns {HTMLElement} O elemento do card da disciplina.
 */
export function createDisciplineCard(discipline, enrollmentData, isPeriodClosed, periodId) {
    const card = document.createElement('div');
    card.className = 'relative bg-surface p-4 rounded-xl shadow-md border border-border flex flex-col';
    card.dataset.id = discipline.id;

    const averageGrade = calculateAverage(discipline);
    const absences = discipline.absences || 0;

    // --- LÓGICA DE STATUS CORRIGIDA ---
    const statusText = getDisciplineStatus(discipline, enrollmentData);
    const statusColors = {
        'N/A': 'text-subtle',
        'Em Andamento': 'text-warning',
        'Aprovado': 'text-success',
        'Reprovado': 'text-danger',
    };
    const statusColor = statusColors[statusText];
    // --- FIM DA LÓGICA DE STATUS ---

    let subtitleHTML = '';
    const isEAD = enrollmentData.modality === 'EAD';
    if (isEAD) {
        subtitleHTML = discipline.notes ? discipline.notes : 'Horário indefinido';
    } else {
        if (discipline.schedules && discipline.schedules.length > 0) {
            subtitleHTML = discipline.schedules.map(s => `${s.day} ${s.startTime}-${s.endTime}`).join(' | ');
        } else {
            subtitleHTML = 'Horário a definir';
        }
    }

    const menuId = `menu-${discipline.id}`;

    card.innerHTML = `
        <div data-action="view-discipline-details" data-id="${discipline.id}" class="cursor-pointer group flex-grow">
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-3 min-w-0">
                    <span class="w-1.5 h-10 rounded-full flex-shrink-0" style="background-color: ${discipline.color || '#6366f1'};"></span>
                    <div class="min-w-0">
                        <h4 class="font-bold text-secondary truncate group-hover:text-primary transition-colors">${discipline.name}</h4>
                        <p class="text-sm text-subtle truncate">${subtitleHTML}</p>
                    </div>
                </div>
                <button aria-controls="${menuId}" class="menu-toggle-btn p-2 rounded-full text-subtle hover:bg-bkg flex-shrink-0 z-10" title="Opções">
                    <svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" /></svg>
                </button>
            </div>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center border-t border-border pt-3 mt-auto">
            <div>
                <span class="block text-xs font-bold text-subtle uppercase">Faltas</span>
                <span class="block text-xl font-bold text-secondary">${absences}</span>
            </div>
            <div>
                <span class="block text-xs font-bold text-subtle uppercase">Média</span>
                <span class="block text-xl font-bold text-secondary">${averageGrade}</span>
            </div>
            <div>
                <span class="block text-xs font-bold text-subtle uppercase">Status</span>
                <span class="block text-xl font-bold ${statusColor}">${statusText}</span>
            </div>
        </div>

        <div id="${menuId}" class="menu-options hidden absolute right-4 top-12 mt-2 w-48 bg-surface rounded-md shadow-lg ring-1 ring-border ring-opacity-5 z-20">
            <div class="py-1">
                ${!isPeriodClosed ? `
                <button data-action="manage-evaluations" data-id="${discipline.id}" data-period-id="${periodId}" class="w-full text-left p-2 rounded-md hover:bg-bkg text-secondary text-sm flex items-center gap-2">
                    <svg class="w-4 h-4 text-subtle" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0M3.75 18H7.5m3-6h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0M3.75 12H7.5" /></svg>
                    Gerenciar Avaliações
                </button>
                <button data-action="edit-discipline" data-id="${discipline.id}" class="w-full text-left p-2 rounded-md hover:bg-bkg text-secondary text-sm flex items-center gap-2">
                    <svg class="w-4 h-4 text-subtle" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                    Editar Disciplina
                </button>
                <div class="my-1 h-px bg-border"></div>
                <button data-action="delete-discipline" data-id="${discipline.id}" class="w-full text-left p-2 rounded-md hover:bg-bkg text-danger text-sm flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                    Excluir
                </button>
                ` : '<p class="text-xs text-subtle text-center p-2">Período encerrado</p>' }
            </div>
        </div>
    `;

    card.querySelector('.menu-toggle-btn').addEventListener('click', toggleOptionsMenu);
    
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

export function calculateAverage(discipline) {
    if (!discipline || !discipline.grades || discipline.grades.length === 0) {
        return 'N/A';
    }

    const rule = discipline.gradeConfig?.rule || 'arithmetic';
    const evaluations = discipline.gradeConfig?.evaluations || [];
    const grades = discipline.grades || [];
    const filledGrades = grades.filter(g => g.grade !== null && g.grade !== undefined);

    if (filledGrades.length === 0) {
        return 'N/A';
    }

    if (rule === 'arithmetic') {
        const sum = filledGrades.reduce((acc, curr) => acc + parseFloat(curr.grade), 0);
        return (sum / filledGrades.length).toFixed(2);
    } else if (rule === 'weighted') {
        let totalWeight = 0;
        const weightedSum = filledGrades.reduce((acc, curr) => {
            const evaluation = evaluations.find(ev => ev.name === curr.name);
            const weight = evaluation ? parseFloat(evaluation.weight) : 0;
            if (weight > 0) {
                totalWeight += weight;
                return acc + (parseFloat(curr.grade) * weight);
            }
            return acc;
        }, 0);

        return totalWeight > 0 ? (weightedSum / totalWeight).toFixed(2) : 'N/A';
    } else if (rule === 'soma') {
        const sum = filledGrades.reduce((acc, curr) => acc + parseFloat(curr.grade), 0);
        return sum.toFixed(2);
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

export function createAbsenceHistoryItem(item) {
    const itemEl = document.createElement('div');
    itemEl.className = 'flex justify-between items-center p-3 rounded-lg hover:bg-bkg transition-colors';
    const date = item.absenceDate ? new Date(item.absenceDate.replace(/-/g, '/')).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Data inválida';
    itemEl.innerHTML = `
        <div>
            <p class="font-semibold text-secondary">${date}</p>
            <p class="text-sm text-subtle italic">${item.justification || 'Sem justificativa'}</p>
        </div>
        <button data-id="${item.id}" class="remove-absence-btn p-2 rounded-full text-danger/60 hover:text-danger hover:bg-danger/10">
            <svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
    `;
    return itemEl;
}

export function createSummaryCard(data) {
    const icons = {
        'academic-cap': `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" /></svg>`,
        'calendar': `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>`,
        'user-minus': `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`,
        'check-circle': `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`
    };
    return `
        <div class="bg-surface p-4 rounded-lg shadow-sm border border-border flex items-center space-x-4">
            <div class="bg-primary/10 text-primary p-3 rounded-full">
                ${icons[data.icon] || ''}
            </div>
            <div>
                <p class="text-sm font-bold text-subtle">${data.title}</p>
                <p class="text-2xl font-extrabold text-secondary">${data.value}</p>
            </div>
        </div>
    `;
}

const fileIconSVG = `<svg class="w-12 h-12 text-subtle/50" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>`;

export function createDocumentCard(doc) {
    const card = document.createElement('div');
    card.className = "relative bg-surface rounded-lg shadow-md border border-border overflow-hidden group transition-all hover:shadow-xl hover:border-primary";

    let previewHTML = '';
    if (doc.fileType?.startsWith('image/')) {
        previewHTML = `<img src="${doc.fileUrl}" alt="${doc.title}" class="w-full h-40 object-cover">`;
    } else {
        const fileTypeInitial = (doc.type || 'DOC').substring(0, 3).toUpperCase();
        previewHTML = `
            <div class="w-full h-40 bg-bkg flex items-center justify-center">
                <span class="text-4xl font-black text-subtle/50">${fileTypeInitial}</span>
            </div>
        `;
    }

    card.innerHTML = `
      ${previewHTML}
      <div class="p-4">
        <h5 class="font-bold text-secondary truncate" title="${doc.title}">${doc.title}</h5>
        <p class="text-sm text-primary font-semibold">${doc.type}</p>
        <div class="mt-2 flex flex-wrap gap-1">
          ${(doc.tags || []).map(tag => `<span class="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">${tag}</span>`).join('')}
        </div>
      </div>
      <div class="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <a href="${doc.fileUrl}" target="_blank" title="Ver" class="p-2 rounded-full bg-surface/80 hover:bg-surface text-secondary backdrop-blur-sm"><svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></a>
          <button data-action="delete-document" data-id="${doc.id}" title="Excluir" class="p-2 rounded-full bg-surface/80 hover:bg-surface text-danger backdrop-blur-sm"><svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
      </div>
    `;
    return card;
}