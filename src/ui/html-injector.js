/**
 * @file Módulo responsável por injetar o HTML principal e os modais no DOM.
 */

const mainHTML = `
  <div id="auth-screen">
    <div class="min-h-screen flex flex-col items-center justify-center bg-bkg p-4"><div class="w-full max-w-md p-8 space-y-6 bg-surface rounded-xl shadow-2xl border border-border"><div><h2 id="auth-title" class="text-center text-3xl font-extrabold text-secondary">Acesse sua Conta</h2><p id="auth-prompt" class="mt-2 text-center text-sm text-subtle"></p></div><form id="auth-form" class="space-y-6"><input type="email" id="auth-email" placeholder="Email" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md shadow-sm"><div class="relative"><input type="password" id="auth-password" placeholder="Senha" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md shadow-sm pr-12 appearance-none"><button type="button" id="toggle-password-btn" data-toggle-password class="absolute inset-y-0 right-0 px-4 flex items-center text-subtle hover:text-primary"><svg class="w-5 h-5 eye-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg><svg class="w-5 h-5 eye-slash-icon hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" /></svg></button></div><button id="auth-submit-btn" type="submit" class="w-full flex justify-center py-3 px-4 rounded-md shadow-sm text-sm font-bold text-bkg bg-primary hover:opacity-90">Entrar</button></form></div></div>
  </div>

  <div id="app-container" class="hidden">
    <header class="bg-surface shadow-md border-b border-border sticky top-0 z-40"><div class="container mx-auto px-4 sm:px-6 lg:px-8"><div class="flex items-center justify-between h-16"><h1 class="text-2xl font-bold text-secondary">Meu Planner</h1><div class="flex items-center"><button id="theme-toggle-btn" class="mr-4 p-2 rounded-full text-subtle hover:text-secondary hover:bg-surface"><svg id="theme-sun-icon" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg><svg id="theme-moon-icon" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg></button><span id="user-email" class="text-sm text-subtle mr-4"></span><button id="logout-btn" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg shadow-md hover:opacity-90">Sair</button></div></div></div></header>
    
    <main class="container mx-auto py-6 sm:px-6 lg:px-8">
      
      <div id="enrollments-view">
        <div class="px-4 py-6 sm:px-0"><div class="flex justify-between items-center mb-6"><h2 class="text-3xl font-bold text-secondary">Minhas Matrículas</h2><button id="add-enrollment-btn" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg shadow-md hover:opacity-90">+ Adicionar Matrícula</button></div><div id="enrollments-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div></div>
        <div id="general-dashboard" class="hidden px-4 py-6 sm:px-0 mt-8"><h2 class="text-2xl font-bold text-secondary mb-4">Resumo do Período Atual</h2><div id="general-dashboard-content" class="space-y-8"></div></div>
      </div>
      
      <div id="dashboard-view" class="hidden">
        <div class="dashboard-header"><button id="back-to-enrollments-btn" class="back-button"><svg class="w-6 h-6 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg></button><div><h2 id="dashboard-title" class="text-3xl font-bold text-secondary"></h2><p id="dashboard-subtitle" class="text-subtle"></p></div></div>
        <div class="flex items-center justify-end mb-6 space-x-2"><div class="flex items-center bg-surface rounded-lg shadow-sm border border-border"><button id="prev-period-btn" class="p-2 rounded-md hover:bg-bkg disabled:opacity-25 disabled:cursor-not-allowed"><svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 19l-7-7 7-7"></path></svg></button><span id="current-period-name" class="font-bold text-secondary px-4 text-center w-28"></span><button id="next-period-btn" class="p-2 rounded-md hover:bg-bkg disabled:opacity-25 disabled:cursor-not-allowed"><svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 5l7 7-7 7"></path></svg></button></div><button id="new-period-btn" class="bg-primary text-bkg font-bold py-2 px-4 rounded-lg shadow-md hover:opacity-90">Novo Período</button><div class="relative"><button id="manage-period-btn" class="p-2 rounded-lg hover:bg-surface" title="Opções"><svg class="w-6 h-6 text-subtle pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg></button></div></div>
        <div id="summary-cards-container" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"></div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8"><div class="lg:col-span-1 flex flex-col gap-8"><div><h3 class="text-2xl font-bold text-secondary mb-4">Agenda</h3><div id="weekly-agenda-container" class="space-y-4"></div></div><div><h3 class="text-2xl font-bold text-secondary mb-4">Calendário</h3><div id="calendar-container" class="bg-surface p-4 rounded-xl shadow-lg border border-border"></div></div></div><div class="lg:col-span-2"><div class="flex justify-between items-center mb-4"><h3 class="text-2xl font-bold text-secondary">Disciplinas</h3><button id="add-discipline-btn" class="bg-primary text-bkg font-bold py-2 px-4 rounded-lg shadow-md hover:opacity-90">Adicionar</button></div><div id="disciplines-list" class="space-y-4"></div></div></div>
      </div>

      <div id="discipline-dashboard-view" class="hidden">
        <div class="flex items-center gap-4 mb-6">
          <button data-action="back-to-main-dashboard" class="p-2 rounded-full text-subtle hover:bg-surface">
            <svg class="w-6 h-6 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h2 id="discipline-dash-title" class="text-3xl font-bold text-secondary"></h2>
            <p id="discipline-dash-subtitle" class="text-subtle"></p>
          </div>
        </div>
        <div id="discipline-stats-container" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"></div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="lg:col-span-2 space-y-8">
            <section id="performance-section">
              <h3 class="text-xl font-bold text-secondary mb-4">Desempenho Geral</h3>
              <div class="relative bg-surface p-4 rounded-xl border border-border h-72">
                <canvas id="discipline-performance-chart"></canvas>
              </div>
            </section>
          </div>
          <div class="lg:col-span-1 space-y-8">
            <section id="absences-section"></section>
            <section id="evaluations-section">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-secondary">Avaliações</h3>
                <button data-action="manage-evaluations" class="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-md hover:bg-primary/20">
                  Gerenciar
                </button>
              </div>
              <div id="evaluations-list" class="space-y-3"></div>
            </section>
          </div>
        </div>
      </div>

    </main>
  </div>
`;

const modalHTML = `
  <div id="add-enrollment-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"><div class="bg-surface p-8 rounded-lg shadow-xl w-full max-w-md border border-border"><h3 id="enrollment-modal-title" class="text-2xl font-bold mb-6 text-secondary">Nova Matrícula</h3><form id="add-enrollment-form"><div class="space-y-4"><input type="text" id="enrollment-course" placeholder="Nome do Curso" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md"><input type="text" id="enrollment-institution" placeholder="Instituição de Ensino" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md"><div><label class="block text-sm font-medium text-subtle mb-2">Modalidade</label><div class="flex items-center gap-6" role="radiogroup" id="enrollment-modality-group"><div class="flex items-center"><input type="radio" id="modality-presencial" name="enrollment-modality" value="Presencial" checked class="h-4 w-4 text-primary border-subtle focus:ring-primary"><label for="modality-presencial" class="ml-2 block text-sm text-secondary">Presencial</label></div><div class="flex items-center"><input type="radio" id="modality-ead" name="enrollment-modality" value="EAD" class="h-4 w-4 text-primary border-subtle focus:ring-primary"><label for="modality-ead" class="ml-2 block text-sm text-secondary">EAD</label></div></div></div><div class="grid grid-cols-2 gap-4"><input type="text" id="enrollment-period" placeholder="Período Inicial" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md"><input type="number" step="0.1" id="enrollment-passing-grade" placeholder="Média" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md"></div></div><div class="mt-8 flex justify-end space-x-4"><button type="button" id="cancel-enrollment-btn" class="bg-subtle text-bkg font-semibold py-2 px-4 rounded-lg">Cancelar</button><button type="submit" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg">Salvar</button></div></form></div></div>
  <div id="add-period-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"><div class="bg-surface p-8 rounded-lg shadow-xl w-full max-w-md border border-border"><h3 class="text-2xl font-bold mb-6 text-secondary">Novo Período Letivo</h3><form id="add-period-form" class="space-y-4"><div><label for="period-name" class="block text-sm font-medium text-subtle mb-1">Nome</label><input type="text" id="period-name" placeholder="Ex: 2025.2" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md"></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label for="period-start-date-new" class="block text-sm font-medium text-subtle mb-1">Início</label><input type="date" id="period-start-date-new" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md"></div><div><label for="period-end-date-new" class="block text-sm font-medium text-subtle mb-1">Fim</label><input type="date" id="period-end-date-new" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md"></div></div><div class="mt-8 flex justify-end space-x-4"><button type="button" id="cancel-period-btn" class="bg-subtle text-bkg font-semibold py-2 px-4 rounded-lg">Cancelar</button><button type="submit" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg">Criar</button></div></form></div></div>
  <div id="add-discipline-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"><div class="bg-surface p-8 rounded-lg shadow-xl w-full max-w-xl border border-border"><h3 id="discipline-modal-title" class="text-2xl font-bold mb-6 text-secondary">Nova Disciplina</h3><form id="add-discipline-form"><div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"><div class="md:col-span-2"><label for="discipline-name" class="block text-sm font-medium text-subtle mb-1">Nome*</label><input type="text" id="discipline-name" placeholder="Ex: Cálculo I" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md"></div><div><label for="discipline-teacher" class="block text-sm font-medium text-subtle mb-1">Professor(a)</label><input type="text" id="discipline-teacher" placeholder="Opcional" class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md"></div><div><label for="discipline-campus" class="block text-sm font-medium text-subtle mb-1">Campus</label><input type="text" id="discipline-campus" placeholder="Ex: Gragoatá" class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md"></div><div class="md:col-span-2"><label for="discipline-location" class="block text-sm font-medium text-subtle mb-1">Local/Sala</label><input type="text" id="discipline-location" placeholder="Ex: Sala 203" class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md"></div><div class="md:col-span-2"><label class="block text-sm font-medium text-subtle mb-1">Cor</label><div id="discipline-color-palette" class="flex flex-wrap justify-center gap-3 p-2 bg-bkg rounded-md border border-border"></div><input type="hidden" id="discipline-color-input"></div><div class="md:col-span-2"><label class="block text-sm font-medium text-subtle mb-1">Horários</label><div id="schedules-container" class="space-y-2"></div><button type="button" id="add-schedule-btn" class="mt-2 text-sm text-primary hover:opacity-80 flex items-center"><svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>Adicionar</button></div><div class="md:col-span-2 pt-2"><p class="text-sm font-medium text-subtle">Controle de Faltas</p><small class="text-xs text-subtle/70">Usado para calcular o limite de faltas.</small></div><div><label for="discipline-workload" class="block text-sm font-medium text-subtle mb-1">Carga Horária (h)*</label><input type="number" id="discipline-workload" min="1" placeholder="Ex: 60" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md"></div><div><label for="discipline-hours-per-class" class="block text-sm font-medium text-subtle mb-1">Horas por Aula*</label><input type="number" id="discipline-hours-per-class" min="1" placeholder="Ex: 2" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md"></div></div><div class="mt-8 flex justify-end space-x-4"><button type="button" id="cancel-discipline-btn" class="bg-subtle text-bkg font-semibold py-2 px-4 rounded-lg">Cancelar</button><button type="submit" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg">Salvar</button></div></form></div></div>
  <div id="config-grades-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"><div class="bg-surface p-8 rounded-lg shadow-xl w-full max-w-lg border border-border"><h3 id="config-grades-title" class="text-2xl font-bold mb-6 text-secondary">Avaliações</h3><form id="config-grades-form" class="space-y-4"><div><label for="grade-calculation-rule" class="block text-sm font-medium text-subtle mb-1">Tipo de Média</label><select id="grade-calculation-rule" class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md custom-select"><option value="weighted">Média Ponderada</option><option value="arithmetic">Média Aritmética</option></select></div><div id="grades-container" class="space-y-3"></div><div id="grades-summary" class="text-right"></div><button type="button" id="add-grade-field-btn" class="text-sm text-primary hover:opacity-80 flex items-center"><svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>Adicionar</button><div class="mt-8 flex justify-end space-x-4"><button type="button" id="cancel-config-grades-btn" class="bg-subtle text-bkg font-semibold py-2 px-4 rounded-lg">Cancelar</button><button type="submit" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg">Salvar</button></div></form></div></div>
  <div id="add-absence-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"><div class="bg-surface p-8 rounded-lg shadow-xl w-full max-w-md border border-border"><h3 class="text-2xl font-bold mb-6 text-secondary">Registrar Falta</h3><form id="add-absence-form"><div class="space-y-4"><div><label for="absence-date" class="block text-sm font-medium text-subtle mb-1">Data</label><input type="date" id="absence-date" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md"></div><div><label for="absence-justification" class="block text-sm font-medium text-subtle mb-1">Justificativa</label><textarea id="absence-justification" placeholder="Opcional" rows="3" class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md"></textarea></div></div><div class="mt-8 flex justify-end space-x-4"><button type="button" id="cancel-absence-btn" class="bg-subtle text-bkg font-semibold py-2 px-4 rounded-lg">Cancelar</button><button type="submit" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg">Salvar</button></div></form></div></div>
  <div id="absence-history-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"><div class="bg-surface p-8 rounded-lg shadow-xl w-full max-w-lg border border-border flex flex-col" style="max-height: 90vh;"><h3 id="absence-history-title" class="text-2xl font-bold mb-4 text-secondary">Histórico de Faltas</h3><div id="absence-history-list" class="flex-grow overflow-y-auto pr-4 -mr-4"></div><button type="button" id="close-absence-history-btn" class="mt-6 w-full bg-subtle text-bkg font-semibold py-2 px-4 rounded-lg">Fechar</button></div></div>
  
  <div id="confirm-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
    <div class="bg-surface p-8 rounded-lg shadow-xl w-full max-w-sm border border-border">
      <h3 id="confirm-modal-title" class="text-xl font-bold text-secondary"></h3>
      <p id="confirm-modal-message" class="text-subtle mt-2"></p>
      <div class="mt-6 flex justify-end space-x-4">
        <button id="confirm-modal-cancel-btn" class="bg-subtle text-bkg font-semibold py-2 px-4 rounded-lg">Cancelar</button>
        <button id="confirm-modal-confirm-btn" class="font-semibold py-2 px-4 rounded-lg text-white"></button>
      </div>
    </div>
  </div>

   <div id="period-options-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-surface p-8 rounded-lg shadow-xl w-full max-w-lg border border-border">
      <div>
        <h3 class="text-2xl font-bold text-secondary">Gerenciar Período</h3>
        <p id="period-options-subtitle" class="text-subtle"></p>
      </div>
      
      <form id="period-options-form" class="mt-6">
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="period-start-date" class="block text-sm font-medium text-subtle mb-1">Início</label>
              <input type="date" id="period-start-date" class="w-full px-3 py-2 bg-bkg text-secondary border border-border rounded-md">
            </div>
            <div>
              <label for="period-end-date" class="block text-sm font-medium text-subtle mb-1">Fim</label>
              <input type="date" id="period-end-date" class="w-full px-3 py-2 bg-bkg text-secondary border border-border rounded-md">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-subtle mb-1">Calendário Acadêmico</label>
            <input type="file" id="period-calendar-file" accept=".pdf,.jpg,.jpeg,.png" class="hidden">
            <div id="calendar-upload-view">
                <label for="period-calendar-file" class="w-full cursor-pointer text-center px-4 py-2 text-sm rounded-md border border-dashed border-border hover:bg-bkg flex items-center justify-center gap-2">
                    <svg class="w-4 h-4 text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Anexar arquivo
                </label>
            </div>
            <div id="calendar-uploaded-view" class="hidden flex items-center justify-between p-2 bg-bkg rounded-md border border-border">
                <span id="calendar-file-name" class="text-sm text-secondary truncate ml-2"></span>
                <div>
                    <a href="#" target="_blank" id="view-calendar-link" class="text-sm text-primary hover:underline px-2">Ver</a>
                    <button type="button" id="remove-calendar-btn" class="text-sm text-danger hover:underline px-2">Remover</button>
                </div>
            </div>
          </div>
        </div>
      </form>
      
      <div class="mt-6 pt-4 border-t border-border">
        <div class="p-4 rounded-lg border border-danger/50 bg-danger/10">
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <h3 class="text-sm font-bold text-danger">⚠️</h3>
                </div>
                <div class="ml-3">
                    <h3 class="text-sm font-bold text-danger">Zona de Perigo</h3>
                    <div class="mt-2 text-sm text-danger/80">
                        <p>As ações abaixo são permanentes. Tenha cuidado.</p>
                    </div>
                    <div class="mt-4 flex space-x-4">
                        <button type="button" id="end-period-btn" class="flex-1 justify-center text-center px-3 py-2 text-sm font-semibold text-warning bg-transparent border border-warning rounded-md hover:bg-warning/10">Encerrar Período</button>
                        <button type="button" id="delete-period-btn" class="flex-1 justify-center text-center px-3 py-2 text-sm font-semibold text-danger bg-transparent border border-danger rounded-md hover:bg-danger/10">Deletar Período</button>
                    </div>
                </div>
            </div>
        </div>
        <button type="button" id="reopen-period-btn" class="hidden w-full mt-4 text-center px-3 py-2 text-sm font-semibold text-secondary border border-border rounded-md hover:bg-bkg">Reabrir Período</button>
      </div>
      
      <div class="mt-8 flex justify-end space-x-4">
        <button type="button" data-action="cancel" class="bg-subtle text-bkg font-semibold py-2 px-4 rounded-lg">Cancelar</button>
        <button type="submit" form="period-options-form" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg">Salvar Alterações</button>
      </div>
    </div>
  </div>

  <div id="pdf-viewer-modal" class="hidden fixed inset-0 bg-black bg-opacity-85 flex items-center justify-center z-50 p-4"><div class="bg-surface w-full h-full max-w-4xl max-h-[90vh] rounded-lg shadow-xl flex flex-col border border-border"><div class="flex justify-between items-center p-4 border-b border-border"><h3 class="text-xl font-bold text-secondary">Calendário</h3><button id="close-pdf-viewer-btn" class="p-2 rounded-full hover:bg-bkg"><svg class="w-6 h-6 text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button></div><div class="flex-grow p-2"><iframe id="pdf-viewer-iframe" class="w-full h-full border-0" src=""></iframe></div></div></div>
  
  <div id="add-event-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-surface p-8 rounded-lg shadow-xl w-full max-w-md border border-border">
      <h3 class="text-2xl font-bold mb-6 text-secondary">Adicionar Evento</h3>
      <form id="add-event-form" class="space-y-4">
        <input type="hidden" id="event-date">
        <div>
          <label for="event-title" class="block text-sm font-medium text-subtle mb-1">Título do Evento</label>
          <input type="text" id="event-title" placeholder="Ex: Prova de Cálculo" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md">
        </div>
        <div>
            <label for="event-color" class="block text-sm font-medium text-subtle mb-1">Cor</label>
            <input type="color" id="event-color" value="#ef4444" class="w-full h-10 px-1 py-1 bg-bkg border border-border rounded-md">
        </div>
        <div class="mt-8 flex justify-end space-x-4">
          <button type="button" id="cancel-event-btn" class="bg-subtle text-bkg font-semibold py-2 px-4 rounded-lg">Cancelar</button>
          <button type="submit" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg">Salvar</button>
        </div>
      </form>
    </div>
  </div>

  <div id="discipline-detail-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
    <div class="bg-surface w-full max-w-3xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col border border-border">
      <div class="flex justify-between items-center p-4 border-b border-border flex-shrink-0">
        <div>
          <h3 id="detail-discipline-name" class="text-2xl font-bold text-secondary"></h3>
          <p id="detail-discipline-teacher" class="text-sm text-subtle"></p>
        </div>
        <button id="close-discipline-detail-btn" class="p-2 rounded-full hover:bg-bkg">
          <svg class="w-6 h-6 text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div class="flex-grow p-6 overflow-y-auto space-y-8">
        <section>
          <div class="flex justify-between items-center mb-4">
            <h4 class="text-xl font-bold text-secondary">Desempenho das Avaliações</h4>
            <button id="detail-config-grades-btn" class="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-md hover:bg-primary/20">
              Configurar Avaliações
            </button>
          </div>
          <div id="detail-grade-chart-container" class="grade-chart-container h-48 p-4 rounded-lg flex items-end justify-around gap-4">
            </div>
        </section>

        </div>
    </div>
  </div>
`;

export function injectHTML() {
    document.querySelector('#app').innerHTML = mainHTML;
    document.querySelector('#app').insertAdjacentHTML('beforeend', modalHTML);
}