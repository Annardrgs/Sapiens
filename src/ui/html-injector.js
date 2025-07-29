/**
 * @file Módulo responsável por injetar o HTML principal e os modais no DOM.
 */

const mainHTML = `
  <div id="auth-screen">
    <div class="min-h-screen flex flex-col items-center justify-center bg-bkg p-4">
      <div class="w-full max-w-md p-8 space-y-6 bg-surface rounded-xl shadow-2xl border border-border">
        <div>
          <h2 id="auth-title" class="text-center text-3xl font-extrabold text-secondary">Acesse sua Conta</h2>
          <p id="auth-prompt" class="mt-2 text-center text-sm text-subtle"></p>
        </div>
        <form id="auth-form" class="space-y-6">
          <input type="email" id="auth-email" placeholder="Email" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md shadow-sm focus:ring-primary focus:border-primary placeholder-subtle">
          <div class="relative">
            <input type="password" id="auth-password" placeholder="Senha" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md shadow-sm focus:ring-primary focus:border-primary placeholder-subtle pr-12 appearance-none">
            <button type="button" id="toggle-password-btn" data-toggle-password class="absolute inset-y-0 right-0 px-4 flex items-center text-subtle hover:text-primary focus:outline-none rounded-r-md">
                <svg class="w-5 h-5 eye-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <svg class="w-5 h-5 eye-slash-icon hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" /></svg>
            </button>
          </div>
          <button id="auth-submit-btn" type="submit" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-bkg bg-primary hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary">
            Entrar
          </button>
        </form>
      </div>
    </div>
  </div>

  <div id="app-container" class="hidden">
    <header class="bg-surface shadow-md border-b border-border sticky top-0 z-40">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <h1 class="text-2xl font-bold text-secondary">Meu Planner</h1>
          <div class="flex items-center">
            <button id="theme-toggle-btn" class="mr-4 p-2 rounded-full text-subtle hover:text-secondary hover:bg-surface">
              <svg id="theme-sun-icon" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              <svg id="theme-moon-icon" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            </button>
            <span id="user-email" class="text-sm text-subtle mr-4"></span>
            <button id="logout-btn" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg shadow-md hover:opacity-90 transition-opacity">Sair</button>
          </div>
        </div>
      </div>
    </header>

    <main class="container mx-auto py-6 sm:px-6 lg:px-8">
      <div id="enrollments-view">
        <div class="px-4 py-6 sm:px-0">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-3xl font-bold text-secondary">Minhas Matrículas</h2>
            <button id="add-enrollment-btn" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg shadow-md hover:opacity-90 transition-opacity">
              + Adicionar Matrícula
            </button>
          </div>
          <div id="enrollments-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        </div>
        <div id="general-dashboard" class="px-4 py-6 sm:px-0 mt-8">
            <h2 class="text-2xl font-bold text-secondary mb-4">Resumo do Período Atual</h2>
            <div id="general-dashboard-content" class="space-y-8"></div>
        </div>
      </div>

      <div id="dashboard-view" class="hidden">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <div>
                  <button id="back-to-enrollments-btn" class="text-sm text-subtle hover:text-primary mb-2 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                      Voltar para Matrículas
                  </button>
                  <h2 id="dashboard-title" class="text-3xl font-bold text-secondary"></h2>
                  <p id="dashboard-subtitle" class="text-subtle"></p>
              </div>
              <div class="flex items-center space-x-2 mt-4 sm:mt-0">
                  <div class="flex items-center bg-surface rounded-lg shadow-sm border border-border">
                      <button id="prev-period-btn" class="p-2 rounded-md hover:bg-bkg disabled:opacity-50"><svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg></button>
                      <span id="current-period-name" class="font-bold text-secondary px-4 text-center w-28"></span>
                      <button id="next-period-btn" class="p-2 rounded-md hover:bg-bkg disabled:opacity-50"><svg class="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></button>
                  </div>
                  <button id="new-period-btn" class="bg-primary text-bkg font-bold py-2 px-4 rounded-lg flex items-center shadow-md hover:opacity-90">
                      Novo Período
                  </button>
                   <div class="relative">
                      <button id="manage-period-btn" class="p-2 rounded-lg hover:bg-surface" title="Opções do período">
                          <svg class="w-6 h-6 text-subtle pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                      </button>
                  </div>
              </div>
          </div>

          <div id="summary-cards-container" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"></div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div class="lg:col-span-1 flex flex-col gap-8">
                  <div>
                      <h3 class="text-2xl font-bold text-secondary mb-4">Agenda da Semana</h3>
                      <div id="weekly-agenda-container" class="space-y-4"></div>
                  </div>
                  <div>
                      <h3 class="text-2xl font-bold text-secondary mb-4">Calendário do Período</h3>
                      <div id="calendar-container" class="bg-surface p-4 rounded-xl shadow-lg border border-border"></div>
                  </div>
              </div>
              <div class="lg:col-span-2">
                  <div class="flex justify-between items-center mb-4">
                      <h3 class="text-2xl font-bold text-secondary">Disciplinas</h3>
                      <button id="add-discipline-btn" class="bg-primary text-bkg font-bold py-2 px-4 rounded-lg flex items-center shadow-md hover:opacity-90">
                          Adicionar Disciplina
                      </button>
                  </div>
                  <div id="disciplines-list" class="space-y-4"></div>
              </div>
          </div>
      </div>
    </main>
  </div>
`;

const modalHTML = `
  <div id="add-discipline-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-surface p-8 rounded-lg shadow-xl w-full max-w-xl border border-border">
      <h3 id="discipline-modal-title" class="text-2xl font-bold mb-6 text-secondary">Nova Disciplina</h3>
      <form id="add-discipline-form">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div class="md:col-span-2">
                <label for="discipline-name" class="block text-sm font-medium text-subtle mb-1">Nome da Disciplina*</label>
                <input type="text" id="discipline-name" placeholder="Ex: Cálculo I" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md">
            </div>
            <div>
                <label for="discipline-teacher" class="block text-sm font-medium text-subtle mb-1">Professor(a)</label>
                <input type="text" id="discipline-teacher" placeholder="Opcional" class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md">
            </div>
            <div>
                <label for="discipline-location" class="block text-sm font-medium text-subtle mb-1">Local</label>
                <input type="text" id="discipline-location" placeholder="Ex: Sala 203, Bloco A" class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md">
            </div>

            <div class="md:col-span-2">
                <label class="block text-sm font-medium text-subtle mb-1">Horários</label>
                <div id="schedules-container" class="space-y-2">
                    </div>
                <button type="button" id="add-schedule-btn" class="mt-2 text-sm text-primary hover:opacity-80 flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Adicionar Horário
                </button>
            </div>
            
            <div class="md:col-span-2 pt-2">
                <p class="text-sm font-medium text-subtle">Controle de Faltas</p>
                <small class="text-xs text-subtle/70">Usado para calcular o limite de 25% de faltas.</small>
            </div>
            <div>
                <label for="discipline-workload" class="block text-sm font-medium text-subtle mb-1">Carga Horária Total (em horas)*</label>
                <input type="number" id="discipline-workload" min="1" placeholder="Ex: 60" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md">
            </div>
            <div>
                <label for="discipline-hours-per-class" class="block text-sm font-medium text-subtle mb-1">Horas por Aula*</label>
                <input type="number" id="discipline-hours-per-class" min="1" placeholder="Ex: 2" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md">
            </div>
        </div>
        <div class="mt-8 flex justify-end space-x-4">
          <button type="button" id="cancel-discipline-btn" class="bg-subtle text-bkg font-semibold py-2 px-4 rounded-lg hover:opacity-80">Cancelar</button>
          <button type="submit" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg hover:opacity-90">Salvar</button>
        </div>
      </form>
    </div>
  </div>

  `;

export function injectHTML() {
    document.querySelector('#app').innerHTML = mainHTML;
    document.querySelector('#app').insertAdjacentHTML('beforeend', modalHTML);
}