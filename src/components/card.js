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
            <p class="text-sm text-subtle mt-4">Período: ${data.currentPeriod || 'Não definido'}</p>
        </div>
        <div class="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button data-id="${data.id}" title="Editar" class="edit-btn p-2 rounded-full hover:bg-bkg"><svg class="w-5 h-5 text-subtle pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
            <button data-id="${data.id}" title="Excluir" class="delete-btn p-2 rounded-full hover:bg-bkg"><svg class="w-5 h-5 text-danger pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
        </div>
    `;
    return card;
}

export function createDisciplineCard(data, isPeriodClosed = false) {
    const card = document.createElement('div');
    card.dataset.id = data.id;
    card.className = "relative bg-surface p-5 rounded-lg border border-border flex flex-col justify-between"; // Removido 'group' e 'cursor-grab'
    
    // --- Lógica de cálculo (sem alterações) ---
    const totalClasses = (data.workload && data.hoursPerClass) ? Math.floor(data.workload / data.hoursPerClass) : 0;
    const absenceLimit = totalClasses > 0 ? Math.floor(totalClasses * 0.25) : 0;
    const currentAbsencePercentage = absenceLimit > 0 ? (((data.absences || 0) / absenceLimit) * 100) : 0;
    
    let progressBarColor = 'bg-success';
    if (currentAbsencePercentage >= 75 && currentAbsencePercentage < 100) {
        progressBarColor = 'bg-yellow-500';
    } else if (currentAbsencePercentage >= 100) {
        progressBarColor = 'bg-danger';
    }

    // --- LÓGICA DE RENDERIZAÇÃO DE NOTAS (ATUALIZADA) ---
    let gradesHTML = `
        <div class="text-center py-4">
            <p class="text-sm text-subtle italic">Nenhuma avaliação configurada.</p>
        </div>
    `;

    let averageGrade = calculateAverage(data);

    if (data.gradeConfig && data.gradeConfig.evaluations && data.gradeConfig.evaluations.length > 0) {
        gradesHTML = `<div class="grid grid-cols-3 gap-2">` + data.gradeConfig.evaluations.map((evaluation, index) => {
            const gradeValue = (data.grades && data.grades[index] && data.grades[index].grade !== null) ? data.grades[index].grade : '';
            return `
                <div class="bg-bkg p-2 rounded-md">
                    <label ...>${evaluation.name}</label>
                    <input type="number" step="0.1" min="0" max="10" id="grade-${data.id}-${index}"  
                        data-discipline-id="${data.id}" data-grade-index="${index}"
                        class="grade-input w-full bg-transparent text-center font-semibold text-secondary outline-none" 
                        placeholder="-" value="${gradeValue}" ${isPeriodClosed ? 'disabled' : ''}>
                </div>
            `;
        }).join('') + `</div>`;

        if (data.grades) {
            let totalWeight = 0;
            let weightedSum = 0;
            data.gradeConfig.evaluations.forEach((evaluation, index) => {
                const gradeInfo = data.grades[index];
                if (gradeInfo && typeof gradeInfo.grade === 'number' && evaluation.weight > 0) {
                    weightedSum += gradeInfo.grade * (evaluation.weight / 100);
                    totalWeight += (evaluation.weight / 100);
                }
            });
            if (totalWeight > 0) {
                // Evita mostrar 0.00 se a média for 0
                averageGrade = (weightedSum / totalWeight).toFixed(2);
                if (parseFloat(averageGrade) === 0) averageGrade = "0";
            }
        }
    }

    const actionMenuHTML = `
      <div class="absolute top-3 right-3">
          <button data-id="${data.id}" class="discipline-menu-btn p-2 rounded-full hover:bg-bkg">
              <svg class="w-5 h-5 text-subtle pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
              </svg>
          </button>
          <div id="menu-${data.id}" class="hidden absolute right-0 mt-2 w-48 bg-bkg rounded-md shadow-lg z-20 border border-border">
              <a href="#" data-id="${data.id}" data-name="${data.name}" class="config-grades-btn block px-4 py-2 text-sm text-secondary hover:bg-surface">Configurar Avaliações</a>
              <a href="#" data-id="${data.id}" class="edit-discipline-btn block px-4 py-2 text-sm text-secondary hover:bg-surface">Editar Disciplina</a>
              <a href="#" data-id="${data.id}" class="delete-discipline-btn block px-4 py-2 text-sm text-danger hover:bg-surface">Excluir Disciplina</a>
          </div>
      </div>
    `;

    const absenceButtonsHTML = `
      <div class="flex justify-between items-center mt-2">
          <button data-id="${data.id}" data-name="${data.name}" class="absence-history-btn text-xs text-primary hover:underline">Histórico</button>
          <button data-id="${data.id}" data-name="${data.name}" class="add-absence-btn bg-primary text-bkg rounded-full w-6 h-6 flex items-center justify-center font-bold hover:opacity-80">+</button>
      </div>
    `;

    card.innerHTML = `
        <div>
            <div class="pr-10">
                <h4 class="font-bold text-secondary cursor-grab">${data.name}</h4>
                <p class="text-sm text-subtle">${data.teacher || 'Professor não definido'}</p>
                <p class="text-sm text-subtle mt-2">${data.location || 'Local não definido'}</p>
                <p class="text-xs text-primary mt-2 font-mono">${data.schedule || 'Horário não definido'}</p>
            </div>
            ${!isPeriodClosed ? actionMenuHTML : ''}
        </div>
        
        <div class="mt-4">
            <div class="flex justify-between items-center mb-2">
                <span class="text-xs font-medium text-subtle">Notas</span>
                <span class="average-grade-display text-sm font-bold text-secondary">Média: ${averageGrade}</span> 
            </div>
            ${gradesHTML}
        </div>

        <div class="mt-4 pt-4 border-t border-border">
            <div class="flex justify-between items-center mb-1">
                <span class="text-xs font-medium text-subtle">Faltas (aulas)</span>
                <span class="text-xs font-medium text-secondary">${data.absences || 0} de ${absenceLimit} permitidas</span>
            </div>
            <div class="w-full bg-bkg rounded-full h-2.5">
                <div class="${progressBarColor} h-2.5 rounded-full transition-all duration-300" style="width: ${currentAbsencePercentage > 100 ? 100 : currentAbsencePercentage}%"></div>
            </div>
            ${!isPeriodClosed ? absenceButtonsHTML : ''}
        </div>
    `;
    return card;
}

export function calculateAverage(data) {
    // Retorna N/A se não houver configuração ou notas para calcular
    if (!data.gradeConfig || !data.gradeConfig.evaluations || data.gradeConfig.evaluations.length === 0 || !data.grades) {
        return 'N/A';
    }

    let averageGrade = 'N/A';
    const { rule, evaluations } = data.gradeConfig;
    const { grades } = data;

    if (rule === 'weighted') {
        let totalWeight = 0;
        let weightedSum = 0;
        evaluations.forEach((evaluation, index) => {
            const gradeInfo = grades[index];
            if (gradeInfo && typeof gradeInfo.grade === 'number' && evaluation.weight > 0) {
                weightedSum += gradeInfo.grade * (evaluation.weight / 100);
                totalWeight += (evaluation.weight / 100);
            }
        });
        if (totalWeight > 0) {
            averageGrade = (weightedSum / totalWeight).toFixed(2);
        }
    } else if (rule === 'min-max') { // LÓGICA FALTANTE ADICIONADA AQUI
        let gradeSum = 0;
        let gradeCount = 0;
        grades.forEach(gradeInfo => {
            if (gradeInfo && typeof gradeInfo.grade === 'number') {
                gradeSum += gradeInfo.grade;
                gradeCount++;
            }
        });
        if (gradeCount > 0) {
            averageGrade = (gradeSum / gradeCount).toFixed(2);
        }
    }

    // Garante que a média 0.00 seja exibida corretamente
    if (parseFloat(averageGrade) === 0) return "0.00";

    return averageGrade;
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
        <button data-id="${data.id}" class="remove-absence-btn p-1 rounded-full hover:bg-surface"><svg class="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
    `;
    return item;
}