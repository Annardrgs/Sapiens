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
            <button data-action="edit-enrollment" title="Editar" class="p-2 rounded-full hover:bg-bkg"><svg class="w-5 h-5 text-subtle pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
            <button data-action="delete-enrollment" title="Excluir" class="p-2 rounded-full hover:bg-bkg"><svg class="w-5 h-5 text-danger pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
        </div>
    `;
    return card;
}

/**
 * Cria o HTML para um card de disciplina com a nova estrutura expansível.
 */
export function createDisciplineCard(discipline, enrollmentData, isPeriodClosed = false) {
    const card = document.createElement('div');
    // Adicionamos a classe 'group' para controlar o hover dos botões
    card.className = 'relative bg-surface border border-border rounded-xl shadow-sm transition-all duration-300 ease-in-out hover:border-primary group';
    card.dataset.id = discipline.id;
    // Adicionamos data-action para o clique principal
    card.dataset.action = 'view-discipline-details';

    const currentAbsences = discipline.absences || 0;
    const averageGrade = calculateAverage(discipline);
    const passingGrade = enrollmentData.passingGrade || 7.0;
    
    let status = { text: 'N/A', color: 'subtle' };
    if (averageGrade !== 'N/A') {
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
            <button data-action="edit-discipline" title="Editar Disciplina" class="p-2 rounded-full hover:bg-bkg text-subtle hover:text-primary">
                <svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            <button data-action="delete-discipline" title="Excluir Disciplina" class="p-2 rounded-full hover:bg-bkg text-subtle hover:text-danger">
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
        const heightPercentage = Math.max(grade * 10, 0); // Garante que a altura não seja negativa
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
    if (!data.gradeConfig || !data.gradeConfig.evaluations || !data.grades) {
        return 'N/A';
    }

    let averageGrade = 'N/A';
    const { rule, evaluations } = data.gradeConfig;
    const { grades } = data;
    
    // Verifica se existe pelo menos uma avaliação configurada
    if (evaluations.length === 0) {
        return 'N/A';
    }

    if (rule === 'weighted') {
        let totalWeight = 0;
        let weightedSum = 0;
        evaluations.forEach((evaluation, index) => {
            const gradeInfo = grades[index];
            // Trata a nota não preenchida (null/undefined) como 0
            const grade = (gradeInfo && typeof gradeInfo.grade === 'number') ? gradeInfo.grade : 0;
            
            if (evaluation.weight > 0) {
                weightedSum += grade * (evaluation.weight / 100);
                totalWeight += (evaluation.weight / 100);
            }
        });
        if (totalWeight > 0) averageGrade = (weightedSum / totalWeight).toFixed(2);

    } else { // Média Aritmética
        let gradeSum = 0;
        let gradeCount = evaluations.length; // Usa o total de avaliações como divisor
        if(gradeCount === 0) return 'N/A';
        
        grades.forEach(gradeInfo => {
            // Trata a nota não preenchida como 0
            const grade = (gradeInfo && typeof gradeInfo.grade === 'number') ? gradeInfo.grade : 0;
            gradeSum += grade;
        });
        averageGrade = (gradeSum / gradeCount).toFixed(2);
    }
    
    return parseFloat(averageGrade) === 0 ? "0.00" : averageGrade;
}

export function createAbsenceHistoryItem(data) {
    const item = document.createElement('div');
    item.className = "flex items-start justify-between bg-bkg p-3 rounded-md border border-border";
    const absenceDate = new Date(data.absenceDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    item.innerHTML = `
        <div><p class="font-semibold text-secondary">${absenceDate}</p><p class="text-sm text-subtle">${data.justification || 'Sem justificativa'}</p></div>
        <button data-id="${data.id}" class="remove-absence-btn p-1 rounded-full hover:bg-surface"><svg class="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
    `;
    return item;
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