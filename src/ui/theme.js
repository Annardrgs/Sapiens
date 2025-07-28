/**
 * @file Módulo para gerenciar o tema da aplicação (claro/escuro).
 */

import { dom } from './dom.js'; // Importa o objeto DOM compartilhado

/**
 * Aplica o tema escolhido ao documento.
 * @param {string} theme - O tema a ser aplicado ('dark' ou 'light').
 */
export function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    dom.sunIcon.classList.remove('hidden');
    dom.moonIcon.classList.add('hidden');
  } else {
    document.documentElement.classList.remove('dark');
    dom.sunIcon.classList.add('hidden');
    dom.moonIcon.classList.remove('hidden');
  }
}

/**
 * Alterna entre o tema claro e escuro e salva a preferência.
 */
export function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  const newTheme = isDark ? 'light' : 'dark';
  localStorage.setItem('theme', newTheme);
  applyTheme(newTheme);
}

/**
 * Inicializa o tema com base na preferência salva ou do sistema.
 */
export function initializeTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
  applyTheme(initialTheme);
}
