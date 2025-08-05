import { dom } from './dom.js';
import * as api from '../api/firestore.js';
import { notify } from './notifications.js';

let timerInterval = null;
let timeLeft = 25 * 60; // 25 minutos em segundos
let isRunning = false;
let sessionStartTime = null;

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    dom.pomodoroDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function finishSession() {
    const endTime = new Date();
    const duration = Math.round((endTime - sessionStartTime) / 1000); // duração em segundos

    if (duration > 10) { // Salva apenas se a sessão durou mais de 10 segundos
        const sessionData = {
            duration: duration,
            date: new Date().toLocaleDateString('pt-BR')
        };
        api.saveStudySession(sessionData)
            .then(() => notify.success('Sessão de estudo salva!'))
            .catch(err => notify.error('Erro ao salvar sessão.'));
    }

    resetTimer();
    new Audio('https://www.soundjay.com/buttons/sounds/button-1.mp3').play();
}

export function startTimer() {
    if (isRunning) return;
    isRunning = true;
    sessionStartTime = new Date();
    dom.startPomodoroBtn.disabled = true;
    dom.pausePomodoroBtn.disabled = false;

    timerInterval = setInterval(() => {
        timeLeft--;
        updateDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            finishSession();
        }
    }, 1000);
}

export function pauseTimer() {
    if (!isRunning) return;
    isRunning = false;
    clearInterval(timerInterval);
    dom.startPomodoroBtn.disabled = false;
    dom.pausePomodoroBtn.disabled = true;
}

export function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    timeLeft = 25 * 60;
    updateDisplay();
    dom.startPomodoroBtn.disabled = false;
    dom.pausePomodoroBtn.disabled = true;
}

export async function showHistoryModal() {
    if (!dom.studyHistoryModal) return;
    
    dom.studyHistoryList.innerHTML = '<p class="text-subtle text-center">Carregando histórico...</p>';
    dom.studyHistoryModal.classList.remove('hidden');

    const history = await api.getStudyHistory();

    if (history.length === 0) {
        dom.studyHistoryList.innerHTML = '<p class="text-subtle text-center">Nenhuma sessão registrada ainda.</p>';
        return;
    }
    
    const sessionsByDate = history.reduce((acc, session) => {
        const date = session.timestamp?.toDate().toLocaleDateString('pt-BR') || 'Data desconhecida';
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(session);
        return acc;
    }, {});

    dom.studyHistoryList.innerHTML = Object.keys(sessionsByDate).map(date => {
        const totalMinutes = sessionsByDate[date].reduce((sum, s) => sum + Math.floor(s.duration / 60), 0);
        return `
            <div class="mb-4">
                <h4 class="font-bold text-secondary border-b border-border pb-1 mb-2">${date} - <span class="text-primary">${totalMinutes} minutos</span></h4>
                <div class="space-y-1">
                    ${sessionsByDate[date].map(s => {
                        const minutes = Math.floor(s.duration / 60);
                        const seconds = s.duration % 60;
                        const time = s.timestamp?.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) || '';
                        return `<p class="text-subtle text-sm">${time} - ${minutes} min e ${seconds} seg</p>`;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

export function hideHistoryModal() {
    if (dom.studyHistoryModal) {
        dom.studyHistoryModal.classList.add('hidden');
    }
}