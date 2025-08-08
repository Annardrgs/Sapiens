/**
 * @file Ponto de entrada principal do aplicativo.
 * Responsável por inicializar a aplicação, gerenciar o estado de autenticação
 * e orquestrar os outros módulos.
 */

import './style.css';
import { auth } from './firebase.js';
import { onAuthStateChanged } from "firebase/auth";
import { injectHTML } from './ui/html-injector.js';
import { initializeAuthListeners, initializeAppListeners } from './listeners.js';
import { 
  showAuthScreen, 
  showAppScreen, 
  renderUserEmail, 
  showEnrollmentsView,
  showDashboardView,
  showDisciplineDashboard,
  showGradesReportView,
  showCourseChecklistView,
  showDocumentsView
} from './ui/view.js';
import { initializeTheme } from './ui/theme.js';
import { initializeDOMElements } from './ui/dom.js';
import { setState, getState } from './store/state.js';
import * as view from './ui/view.js';
import * as pomodoro from './ui/pomodoro.js';
import { notify } from './ui/notifications.js';
import * as firestoreApi from './api/firestore.js';

// --- ROTEAMENTO ---

const routes = {
  '/': showEnrollmentsView,
  '/dashboard': showDashboardView,
  '/discipline': showDisciplineDashboard,
  '/grades': showGradesReportView,
  '/checklist': showCourseChecklistView,
  '/documents': showDocumentsView,
};

async function handleRouteChange() {
    pomodoro.updateFloatingTimerVisibility(); // Adicionado para controlar o timer flutuante
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    
    const routeAction = routes[path] || routes['/'];
    
    const enrollmentId = params.get('enrollmentId');
    const disciplineId = params.get('disciplineId');

    if (auth.currentUser) {
        if (path === '/dashboard' && enrollmentId) {
            await routeAction(enrollmentId);
        } else if (path === '/discipline' && enrollmentId && disciplineId) {
            await routeAction({ enrollmentId, disciplineId });
        } else if ((path === '/grades' || path === '/checklist' || path === '/documents') && enrollmentId) {
            await routeAction(enrollmentId);
        } else {
            await routeAction();
        }
    }
}

export function navigate(path) {
    window.history.pushState({}, "", path);
    handleRouteChange();
}

// --- FLUXO DE INICIALIZAÇÃO ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("[DEBUG] DOM carregado. Iniciando Sapiens...");
    injectHTML();
    initializeDOMElements();
    initializeAuthListeners();
    initializeTheme();
    console.log("[DEBUG] Módulos principais inicializados.");

    // PONTO DE VERIFICAÇÃO 2: Confirma que o listener de autenticação está sendo configurado.
    console.log("[DEBUG] Configurando o listener de autenticação (onAuthStateChanged)...");
    
    onAuthStateChanged(auth, async (user) => {
      // PONTO DE VERIFICAÇÃO 3: Se esta mensagem aparecer, o Firebase se comunicou com sucesso.
      console.log("[DEBUG] Callback de autenticação disparado. Status do usuário:", user ? "Logado" : "Deslogado");

      const loadingOverlay = document.getElementById('loading-overlay');
      if (loadingOverlay) {
          loadingOverlay.classList.add('hidden');
      }

      try {
        if (user) {
          setState('user', user);
          showAppScreen();
          await firestoreApi.cleanupOldTodos();
          
          if (!window.appListenersInitialized) {
            initializeAppListeners();
            window.appListenersInitialized = true;
          }

          renderUserEmail(user.email);
          await handleRouteChange();
          await view.checkAndRenderNotifications();

        } else {
          setState('user', null);
          navigate('/');
          showAuthScreen();
          window.appListenersInitialized = false;
        }
      } catch (error) {
        console.error("Erro crítico durante a inicialização:", error);
        notify.error("Ocorreu um erro inesperado. Por favor, recarregue a página.");
      }
    });

    window.addEventListener('popstate', handleRouteChange);
});