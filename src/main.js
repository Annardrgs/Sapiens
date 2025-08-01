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
  renderEnrollments 
} from './ui/view.js';
import { initializeTheme } from './ui/theme.js';
import { initializeDOMElements } from './ui/dom.js';
import { setState } from './store/state.js';
import * as view from './ui/view.js';

// --- FLUXO DE INICIALIZAÇÃO ---

// 1. Injeta o HTML base e os modais na página.
injectHTML();

// 2. Seleciona e armazena todos os elementos do DOM. ESSENCIAL que isso aconteça aqui.
initializeDOMElements();

// 3. Inicializa os listeners que não dependem de login.
initializeAuthListeners();

// 4. Inicializa o tema (claro/escuro).
initializeTheme();

async function renderInitialView() {
  showEnrollmentsView();
  await renderEnrollments();
}

// 5. Listener principal que reage a mudanças no estado de autenticação.
onAuthStateChanged(auth, (user) => {
  if (user) {
    setState('user', user);
    showAppScreen();
    view.checkAndRenderNotifications();

    if (!window.appListenersInitialized) {
      initializeAppListeners();
      window.appListenersInitialized = true;
    }

    renderUserEmail(user.email);
    renderInitialView();

  } else {
    setState('user', null);
    showAuthScreen();
    window.appListenersInitialized = false;
  }
});