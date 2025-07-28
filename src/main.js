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
import { showAuthScreen, showAppScreen, renderUserEmail, renderInitialEnrollments } from './ui/view.js';
import { initializeTheme } from './ui/theme.js';
import { initializeDOMElements } from './ui/dom.js';
import { setState } from './store/state.js';

// --- FLUXO DE INICIALIZAÇÃO ---

// 1. Injeta o HTML base e os modais na página.
injectHTML();

// 2. Seleciona e armazena todos os elementos do DOM. ESSENCIAL que isso aconteça aqui.
initializeDOMElements();

// 3. Inicializa os listeners que não dependem de login.
initializeAuthListeners();

// 4. Inicializa o tema (claro/escuro).
initializeTheme();

// 5. Listener principal que reage a mudanças no estado de autenticação.
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Se o usuário está logado:
    setState('user', user); // Armazena os dados do usuário no estado global.
    showAppScreen(); // Mostra a tela principal do aplicativo.

    // Inicializa os listeners do aplicativo (só uma vez).
    if (!window.appListenersInitialized) {
      initializeAppListeners();
      window.appListenersInitialized = true;
    }

    // Renderiza as informações do usuário e a lista inicial de matrículas.
    renderUserEmail(user.email);
    renderInitialEnrollments();

  } else {
    // Se o usuário não está logado:
    setState('user', null); // Limpa os dados do usuário.
    showAuthScreen(); // Mostra a tela de autenticação.
    window.appListenersInitialized = false; // Reseta a flag dos listeners.
  }
});
