import { dom } from './dom.js';

function createNotification(message, type = 'success') {
    const container = dom.notificationContainer;
    if (!container) return;

    const colorClasses = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };

    const notification = document.createElement('div');
    notification.className = `p-4 rounded-md text-white font-semibold shadow-lg animate-fade-in ${colorClasses[type]}`;
    notification.textContent = message;

    container.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('animate-fade-out');
        notification.addEventListener('animationend', () => notification.remove());
    }, 3000); // A notificação some após 3 segundos
}

export const notify = {
    success: (message) => createNotification(message, 'success'),
    error: (message) => createNotification(message, 'error'),
    info: (message) => createNotification(message, 'info'),
};