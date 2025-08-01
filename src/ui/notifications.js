import { dom } from './dom.js';

function createNotification(message, type = 'success') {
    const container = dom.notificationContainer;
    if (!container) {
        console.error('Contêiner de notificação não encontrado no DOM.');
        return;
    }

    const colorClasses = {
        success: 'bg-success', // Usando suas cores do tema
        error: 'bg-danger',
        info: 'bg-blue-500'
    };

    const notification = document.createElement('div');
    notification.className = `p-4 rounded-lg text-white font-semibold shadow-lg ${colorClasses[type]}`;
    notification.textContent = message;
    
    // Aplica animação de entrada
    notification.classList.add('animate-fade-in-down');
    container.appendChild(notification);

    // Configura o tempo para remover a notificação
    setTimeout(() => {
        // Aplica animação de saída
        notification.classList.remove('animate-fade-in-down');
        notification.classList.add('animate-fade-out-up');
        
        // Remove o elemento do DOM após a animação de saída terminar
        notification.addEventListener('animationend', () => {
            notification.remove();
        });
    }, 3000); // O toast fica visível por 3 segundos
}

export const notify = {
    success: (message) => createNotification(message, 'success'),
    error: (message) => createNotification(message, 'error'),
    info: (message) => createNotification(message, 'info'),
};