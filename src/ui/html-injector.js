/**
 * @file Módulo responsável por injetar o HTML principal e os modais no DOM.
 */

const mainHTML = `
  <!-- TELA DE AUTENTICAÇÃO -->
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
            <button type="button" id="toggle-password-btn" class="absolute inset-y-0 right-0 px-4 flex items-center text-subtle hover:text-primary focus:outline-none rounded-r-md">
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

  <!-- CONTAINER PRINCIPAL DO APP -->
  <div id="app-container" class="hidden">
    <header class="bg-surface shadow-md border-b border-border sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- TELA 1: LISTA DE MATRÍCULAS -->
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
      </div>

      <!-- TELA 2: PAINEL DA MATRÍCULA -->
      <div id="dashboard-view" class="hidden">
        <div class="px-4 py-6 sm:px-0">
          <button id="back-to-enrollments-btn" class="mb-6 text-sm text-primary hover:opacity-80 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Voltar para Matrículas
          </button>
          <h2 id="dashboard-title" class="text-3xl font-bold text-secondary"></h2>
          <p id="dashboard-subtitle" class="text-subtle mt-1"></p>

          <div class="mt-6 flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <label for="period-switcher" class="text-sm font-medium text-subtle">Período Letivo:</label>
              <select id="period-switcher" class="bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary"></select>
            </div>
            <button id="new-period-btn" class="bg-primary text-bkg text-sm font-semibold py-2 px-3 rounded-lg shadow-md hover:opacity-90 transition-opacity">
              + Novo Período
            </button>
          </div>
          
          <div class="mt-8 border-t border-border pt-8">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold text-secondary">Disciplinas</h3>
                <button id="add-discipline-btn" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg shadow-md hover:opacity-90 transition-opacity">
                  + Adicionar Disciplina
                </button>
            </div>
            <div id="disciplines-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
          </div>
        </div>
      </div>
    </main>
    <footer class="text-center py-4 mt-8 border-t border-border">
        <p class="text-sm text-subtle">&copy; ${new Date().getFullYear()} Meu Planner Acadêmico. Todos os direitos reservados.</p>
    </footer>
  </div>
`;

const modalHTML = `
  <div id="add-enrollment-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-surface p-8 rounded-lg shadow-xl w-full max-w-md border border-border">
      <h3 id="enrollment-modal-title" class="text-2xl font-bold mb-6 text-secondary">Nova Matrícula</h3>
      <form id="add-enrollment-form">
        <div class="space-y-4">
          <input type="text" id="enrollment-course" placeholder="Nome do Curso (ex: Ciência da Computação)" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary">
          <input type="text" id="enrollment-institution" placeholder="Instituição de Ensino" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary">
          <input type="text" id="enrollment-period" placeholder="Período Inicial (ex: 2025.1)" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary">
        </div>
        <div class="mt-8 flex justify-end space-x-4">
          <button type="button" id="cancel-enrollment-btn" class="bg-subtle text-bkg font-semibold py-2 px-4 rounded-lg hover:opacity-80">Cancelar</button>
          <button type="submit" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg hover:opacity-90">Salvar</button>
        </div>
      </form>
    </div>
  </div>

  <div id="confirm-delete-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-surface p-8 rounded-lg shadow-xl w-full max-w-sm border border-border">
      <h3 class="text-xl font-bold text-secondary">Confirmar Exclusão</h3>
      <p id="confirm-delete-message" class="text-subtle mt-2">Tem certeza que deseja excluir? Esta ação não pode ser desfeita.</p>
      <div class="mt-6 flex justify-end space-x-4">
        <button id="cancel-delete-btn" class="bg-subtle text-bkg font-semibold py-2 px-4 rounded-lg hover:opacity-80">Cancelar</button>
        <button id="confirm-delete-btn" class="bg-danger text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90">Excluir</button>
      </div>
    </div>
  </div>

  <div id="add-discipline-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-surface p-8 rounded-lg shadow-xl w-full max-w-md border border-border">
      <h3 id="discipline-modal-title" class="text-2xl font-bold mb-6 text-secondary">Nova Disciplina</h3>
      <form id="add-discipline-form">
        <div class="space-y-4">
          <input type="text" id="discipline-name" placeholder="Nome da Disciplina" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary">
          <input type="text" id="discipline-code" placeholder="Código (opcional)" class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary">
          <input type="text" id="discipline-teacher" placeholder="Professor(a) (opcional)" class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary">
          <input type="text" id="discipline-location" placeholder="Local (sala, prédio, etc.)" class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary">
          <input type="text" id="discipline-schedule" placeholder="Horários (ex: Seg 10-12h, Qua 10-12h)" class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary">
          <div class="flex items-center space-x-4">
            <input type="number" id="discipline-workload" placeholder="C.H. Total (horas)" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary">
            <input type="number" id="discipline-hours-per-class" placeholder="Horas por aula" value="2" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary">
          </div>
        </div>
        <div class="mt-8 flex justify-end space-x-4">
          <button type="button" id="cancel-discipline-btn" class="bg-subtle text-bkg font-semibold py-2 px-4 rounded-lg hover:opacity-80">Cancelar</button>
          <button type="submit" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg hover:opacity-90">Salvar</button>
        </div>
      </form>
    </div>
  </div>

  <div id="add-absence-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-surface p-8 rounded-lg shadow-xl w-full max-w-md border border-border">
      <h3 class="text-2xl font-bold mb-6 text-secondary">Registrar Falta</h3>
      <form id="add-absence-form">
        <div class="space-y-4">
          <div>
            <label for="absence-date" class="block text-sm font-medium text-subtle mb-1">Data da Falta</label>
            <input type="date" id="absence-date" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary">
          </div>
          <div>
            <label for="absence-justification" class="block text-sm font-medium text-subtle mb-1">Justificativa (opcional)</label>
            <textarea id="absence-justification" placeholder="Ex: Consulta médica" rows="3" class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary"></textarea>
          </div>
        </div>
        <div class="mt-8 flex justify-end space-x-4">
          <button type="button" id="cancel-absence-btn" class="bg-subtle text-bkg font-semibold py-2 px-4 rounded-lg hover:opacity-80">Cancelar</button>
          <button type="submit" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg hover:opacity-90">Salvar Falta</button>
        </div>
      </form>
    </div>
  </div>

  <div id="absence-history-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-surface p-8 rounded-lg shadow-xl w-full max-w-lg border border-border flex flex-col" style="max-height: 90vh;">
      <h3 id="absence-history-title" class="text-2xl font-bold mb-4 text-secondary">Histórico de Faltas</h3>
      <div id="absence-history-list" class="flex-grow overflow-y-auto pr-4 -mr-4">
        <!-- Lista de faltas será renderizada aqui -->
      </div>
      <button type="button" id="close-absence-history-btn" class="mt-6 w-full bg-subtle text-bkg font-semibold py-2 px-4 rounded-lg hover:opacity-80">Fechar</button>
    </div>
  </div>

  <div id="add-period-modal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-surface p-8 rounded-lg shadow-xl w-full max-w-md border border-border">
      <h3 class="text-2xl font-bold mb-6 text-secondary">Novo Período Letivo</h3>
      <form id="add-period-form">
        <div class="space-y-4">
          <input type="text" id="period-name" placeholder="Nome do Período (ex: 2025.2)" required class="w-full px-4 py-3 bg-bkg text-secondary border border-border rounded-md focus:ring-primary focus:border-primary">
        </div>
        <div class="mt-8 flex justify-end space-x-4">
          <button type="button" id="cancel-period-btn" class="bg-subtle text-bkg font-semibold py-2 px-4 rounded-lg hover:opacity-80">Cancelar</button>
          <button type="submit" class="bg-primary text-bkg font-semibold py-2 px-4 rounded-lg hover:opacity-90">Criar Período</button>
        </div>
      </form>
    </div>
  </div>
`;

export function injectHTML() {
    document.querySelector('#app').innerHTML = mainHTML;
    document.querySelector('#app').insertAdjacentHTML('beforeend', modalHTML);
}