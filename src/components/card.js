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
            <p class="text-sm text-subtle mt-4">Período: ${data.currentPeriod || 'N/A'}</p>
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
// ASSINATURA DA FUNÇÃO CORRIGIDA PARA ACEITAR 'enrollmentData'
export function createDisciplineCard(discipline, enrollmentData, isPeriodClosed = false) {
    const card = document.createElement('div');
    card.className = 'bg-surface border border-border rounded-xl shadow-sm transition-all duration-300 ease-in-out';
    card.dataset.id = discipline.id;

    const workload = Number(discipline.workload) || 0;
    const hoursPerClass = Number(discipline.hoursPerClass) || 1;
    const totalClasses = workload > 0 && hoursPerClass > 0 ? Math.floor(workload / hoursPerClass) : 0;
    const absenceLimit = totalClasses > 0 ? Math.floor(totalClasses * 0.25) : 0;
    const currentAbsences = discipline.absences || 0;
    const absencePercentage = absenceLimit > 0 ? (currentAbsences / absenceLimit) * 100 : 0;
    
    let absenceStatus = 'green';
    if (absencePercentage > 66.66) absenceStatus = 'red';
    else if (absencePercentage > 33.33) absenceStatus = 'yellow';

    const colorMap = {
        green: '#22c55e', yellow: '#f59e0b', red: '#ef4444',
    };
    const progressBarColor = colorMap[absenceStatus];

    const averageGrade = calculateAverage(discipline);
    
    // Agora 'enrollmentData' está definido e pode ser usado
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
        <div class="card-header p-4 cursor-pointer">
            <div class="flex items-start justify-between">
                <div class="flex items-center gap-4">
                    <span class="w-2 h-10 rounded-full flex-shrink-0 cursor-grab" style="background-color: ${discipline.color || '#4f46e5'}"></span>
                    <div>
                        <h4 class="text-xl font-bold text-secondary">${discipline.name}</h4>
                        <p class="text-sm text-subtle">${discipline.schedules?.map(s => `${s.day} ${s.startTime}-${s.endTime}`).join(', ') || 'Horário não definido'}</p>
                    </div>
                </div>
                <div class="relative">
                    <button data-action="toggle-menu" class="text-subtle hover:text-primary p-1 rounded-full"><svg class="w-6 h-6 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg></button>
                    <div id="menu-${discipline.id}" class="menu-options hidden absolute right-0 mt-2 w-48 bg-bkg rounded-md shadow-lg z-20 border border-border">
                        <a href="#" data-action="edit-discipline" class="block px-4 py-2 text-sm text-secondary hover:bg-surface">Editar Disciplina</a>
                        <a href="#" data-action="config-grades" data-name="${discipline.name}" class="block px-4 py-2 text-sm text-secondary hover:bg-surface">Configurar Avaliações</a>
                        <a href="#" data-action="delete-discipline" class="block px-4 py-2 text-sm text-danger hover:bg-surface">Excluir Disciplina</a>
                    </div>
                </div>
            </div>
            <div class="mt-4 space-y-3">
                <div>
                    <div class="flex justify-between text-sm font-medium text-subtle mb-1"><span>Faltas</span><span>${currentAbsences} de ${absenceLimit}</span></div>
                    <div class="w-full bg-bkg rounded-full h-2.5"><div class="h-2.5 rounded-full" style="width: ${Math.min(absencePercentage, 100)}%; background-color: ${progressBarColor};"></div></div>
                </div>
                <div class="flex justify-between text-sm font-medium text-subtle">
                    <span>Média</span><span class="font-bold">${averageGrade}</span>
                </div>
                <div class="flex justify-between text-sm font-medium text-subtle">
                    <span>Status</span><span class="font-bold text-${status.color}">${status.text}</span>
                </div>
            </div>
        </div>
        <div class="details-content overflow-hidden max-h-0 transition-all duration-500 ease-in-out">
            <div class="border-t border-border p-4 space-y-4">
                <div class="text-sm space-y-1"><p><strong class="text-subtle">Professor:</strong> ${discipline.teacher || 'Não definido'}</p><p><strong class="text-subtle">Local:</strong> ${discipline.location || 'Não definido'}</p></div>
                <div><div class="flex items-center justify-between"><h5 class="font-bold text-md text-secondary">Faltas</h5>${!isPeriodClosed ? `<button data-action="add-absence" data-name="${discipline.name}" class="bg-primary text-bkg rounded-full w-6 h-6 flex items-center justify-center font-bold hover:opacity-80 text-lg">+</button>` : ''}</div><div class="mt-2"><button data-action="history-absence" data-name="${discipline.name}" class="text-link">Ver Histórico</button></div></div>
                <div><h5 class="font-bold text-md text-secondary mb-2">Notas</h5><div class="grades-container grid grid-cols-2 md:grid-cols-3 gap-2"></div></div>
            </div>
        </div>
    `;
    populateGradesInputs(card.querySelector('.grades-container'), discipline, isPeriodClosed);
    return card;
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