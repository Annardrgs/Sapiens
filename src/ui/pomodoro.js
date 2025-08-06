import { dom } from './dom.js';
import * as api from '../api/firestore.js';
import { notify } from './notifications.js';
import * as modals from './modals.js';
import { getState } from '../store/state.js';

// Importe TODOS os áudios aqui
import playSoundSrc from '../public/audio/play.mp3';
import breakSoundSrc from '../public/audio/break.mp3';
import endSoundSrc from '../public/audio/end.mp3';
import lightRainSoundSrc from '../public/audio/music/PMSFX_RAINVege_RAIN_LIGHT_DRIZLE_DRIPPY_18MRRAT_2441.mp3';
import stormSoundSrc from '../public/audio/music/PMSFX_STORM_RAIN_STEADY_THUNDER_2MRRAT_2446.mp3';
import forestNightSoundSrc from '../public/audio/music/zapsplat_nature_rain_medium_light_gradually_getting_heavier.mp3';
import waterfallSoundSrc from '../public/audio/music/zapsplat_nature_small_waterfall_water_flowing_through_rocks_110717.mp3';
import birdsSoundSrc from '../public/audio/music/PMSFX_AMBAir_Calm_Still_Exterior_Air_Birds_PCMD100_2LSV1_2448.mp3';
import lofiSoundSrc from '../public/audio/music/music_biiansu_no_sleep_for_busy_minds_016.mp3';
import starsSoundSrc from '../public/audio/music/music_zapsplat_among_the_stars.mp3';
import milkyWaySoundSrc from '../public/audio/music/music_zapsplat_milky_way.mp3';
import sunriseSoundSrc from '../public/audio/music/music_zapsplat_sunrise_105.mp3';
import dawnSoundSrc from '../public/audio/music/music_zapsplat_dawn_102.mp3';

let timerInterval = null;
let timeLeft = 25 * 60;
let isRunning = false;
let isPaused = false;
let isBreak = false;
let sessionStartTime = null;
let totalTimeElapsed = 0;
let currentDiscipline = null;

let studyDuration = 25 * 60;
let breakDuration = 5 * 60;

function createAudioElement(id, src, loop = false) {
    const audio = document.createElement('audio');
    audio.id = id;
    audio.src = src;
    audio.loop = loop;
    audio.preload = 'auto';
    document.body.appendChild(audio);
    return audio;
}

const sounds = {
    start: createAudioElement('start-sound', playSoundSrc),
    break: createAudioElement('break-sound', breakSoundSrc),
    finish: createAudioElement('finish-sound', endSoundSrc),
    ambient: {
        'light-rain': createAudioElement('ambient-light-rain', lightRainSoundSrc, true),
        'storm': createAudioElement('ambient-storm', stormSoundSrc, true),
        'forest-night': createAudioElement('ambient-forest-night', forestNightSoundSrc, true),
        'waterfall': createAudioElement('ambient-waterfall', waterfallSoundSrc, true),
        'birds': createAudioElement('ambient-birds', birdsSoundSrc, true),
        'lofi': createAudioElement('ambient-lofi', lofiSoundSrc, true),
        'stars': createAudioElement('ambient-stars', starsSoundSrc, true),
        'milky-way': createAudioElement('ambient-milky-way', milkyWaySoundSrc, true),
        'sunrise': createAudioElement('ambient-sunrise', sunriseSoundSrc, true),
        'dawn': createAudioElement('ambient-dawn', dawnSoundSrc, true),
    }
};

Object.values(sounds.ambient).forEach(sound => sound.loop = true);
let currentAmbientSound = null;

// Função de delay para controlar o tempo entre os sons
const delay = ms => new Promise(res => setTimeout(res, ms));

async function playSound(sound) {
    try {
        sound.currentTime = 0;
        await sound.play();
    } catch (e) {
        console.warn("Não foi possível tocar o som:", e);
    }
}

async function stopAmbientSound() {
    if (currentAmbientSound) {
        currentAmbientSound.pause();
        currentAmbientSound.currentTime = 0;
        currentAmbientSound = null;
        await delay(500); // Pequena pausa após parar o som ambiente
    }
}

function updateDisplay(isFloating = false) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const statusText = isBreak ? 'Pausa' : 'Foco';

    const displayEl = isFloating ? dom.floatingTimerDisplay : dom.pomodoroDisplay;
    const statusEl = isFloating ? dom.floatingTimerStatus : dom.pomodoroStatus;

    if (displayEl) displayEl.textContent = formattedTime;
    if (statusEl) statusEl.textContent = statusText;
}

async function saveSession() {
    if (totalTimeElapsed < 10) return; 
    const sessionData = {
        duration: Math.round(totalTimeElapsed),
        date: new Date().toLocaleDateString('pt-BR'),
        disciplineId: currentDiscipline ? currentDiscipline.id : null,
        disciplineName: currentDiscipline ? currentDiscipline.name : null,
    };
    try {
        await api.saveStudySession(sessionData);
        notify.success('Sessão de estudo salva!');
    } catch (err) {
        notify.error('Erro ao salvar sessão.');
    }
}

async function finishSession() {
    await stopAmbientSound(); // Para a música ambiente antes de tocar o som de finalização

    if (!isBreak) { 
        saveSession();
        isBreak = true;
        timeLeft = breakDuration;
        notify.info("Hora da pausa!");
        await playSound(sounds.break);
    } else { 
        isBreak = false;
        timeLeft = studyDuration;
        notify.success("Pausa terminada. Hora de focar!");
        await playSound(sounds.start);
    }
    
    totalTimeElapsed = 0;
    sessionStartTime = new Date();
    updateDisplay();
    updateDisplay(true);
}

function runTimer() {
    clearInterval(timerInterval); 
    timerInterval = setInterval(async () => {
        if (isPaused) return;

        timeLeft--;
        if (!isBreak) totalTimeElapsed++;
        
        updateDisplay();
        updateDisplay(true);

        if (timeLeft <= 0) {
            await finishSession();
        }
    }, 1000);
}

export async function startTimer(studyMinutes, breakMinutes, discipline, ambientSoundKey) {
    if (isRunning) return;
    
    studyDuration = studyMinutes * 60;
    breakDuration = breakMinutes * 60;
    timeLeft = studyDuration;
    isBreak = false;
    currentDiscipline = discipline;
    
    isRunning = true;
    isPaused = false;
    sessionStartTime = new Date();
    totalTimeElapsed = 0;

    dom.startPomodoroBtn.classList.add('hidden');
    dom.pausePomodoroBtn.classList.remove('hidden');
    dom.stopPomodoroBtn.classList.remove('hidden');

    await playSound(sounds.start);
    await delay(1000); // Espera 1 segundo antes de começar a música ambiente

    if (ambientSoundKey !== 'none' && sounds.ambient[ambientSoundKey]) {
        currentAmbientSound = sounds.ambient[ambientSoundKey];
        playSound(currentAmbientSound); // Não precisa de await aqui para a música tocar em fundo
    }

    updateDisplay();
    runTimer();
    updateFloatingTimerVisibility();
}

export async function togglePause() {
    if (!isRunning) return;
    isPaused = !isPaused;

    if (isPaused) {
        await stopAmbientSound();
        await playSound(sounds.break);
        dom.pausePomodoroBtn.innerHTML = `<svg class="w-8 h-8 pointer-events-none" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path></svg>`;
    } else {
        await playSound(sounds.start);
        await delay(1000);
        if (currentAmbientSound) playSound(currentAmbientSound);
        dom.pausePomodoroBtn.innerHTML = `<svg class="w-8 h-8 pointer-events-none" fill="currentColor" viewBox="0 0 20 20"><path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z"></path></svg>`;
    }
}

export function stopTimer() {
    if (!isRunning) return;
    isPaused = true; 
    
    const onConfirm = async () => {
        await stopAmbientSound();
        await playSound(sounds.finish);
        if (!isBreak) saveSession();
        resetTimer();
    };
    
    const onCancel = () => { 
        isPaused = false;
    };

    const message = isBreak ? "Deseja finalizar a sessão de pausa? O tempo de pausa não é salvo." : `Deseja salvar os ${Math.floor(totalTimeElapsed / 60)} minutos de foco no seu histórico?`;

    modals.showConfirmModal({
        title: 'Finalizar Sessão',
        message: message,
        confirmText: 'Finalizar',
        confirmClass: 'bg-primary',
        onConfirm: onConfirm,
        onCancel: onCancel // Passa a função de cancelamento para o modal
    });
}


export function resetTimer() {
    clearInterval(timerInterval);
    stopAmbientSound();
    isRunning = false;
    isPaused = false;
    isBreak = false;
    sessionStartTime = null;
    totalTimeElapsed = 0;
    timeLeft = 25 * 60; 
    currentDiscipline = null;
    
    dom.startPomodoroBtn.classList.remove('hidden');
    dom.pausePomodoroBtn.classList.add('hidden');
    dom.stopPomodoroBtn.classList.add('hidden');
    
    dom.pomodoroStatus.textContent = 'Pronto para focar?';
    updateDisplay();
    updateFloatingTimerVisibility();
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
        if (!acc[date]) acc[date] = { sessions: [], totalMinutes: 0 };
        acc[date].sessions.push(session);
        acc[date].totalMinutes += Math.floor(session.duration / 60);
        return acc;
    }, {});

    dom.studyHistoryList.innerHTML = Object.keys(sessionsByDate).map(date => {
        const { sessions, totalMinutes } = sessionsByDate[date];
        return `
            <div class="mb-4">
                <h4 class="font-bold text-secondary border-b border-border pb-1 mb-2">${date} - <span class="text-primary">${totalMinutes} minutos</span></h4>
                <div class="space-y-1">
                    ${sessions.map(s => {
                        const minutes = Math.floor(s.duration / 60);
                        const seconds = s.duration % 60;
                        const time = s.timestamp?.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) || '';
                        const disciplineLabel = s.disciplineName ? `<span class="text-xs font-semibold text-primary ml-2">• ${s.disciplineName}</span>` : '';
                        return `
                            <div class="flex justify-between items-center text-subtle text-sm p-2 rounded hover:bg-bkg">
                                <div>
                                    <span>${time} - ${minutes} min e ${seconds} seg</span>
                                    ${disciplineLabel}
                                </div>
                                <button data-action="delete-study-session" data-id="${s.id}" class="p-1 rounded-full text-danger/50 hover:text-danger hover:bg-danger/10">
                                    <svg class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        `;
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

export function updateFloatingTimerVisibility() {
    const isDashboard = window.location.pathname === '/dashboard' || window.location.pathname === '/';
    if (isRunning && !isDashboard) {
        if (dom.floatingTimer) dom.floatingTimer.classList.remove('hidden');
    } else {
        if (dom.floatingTimer) dom.floatingTimer.classList.add('hidden');
    }
}

export function initialize() {
    studyDuration = 25 * 60;
    resetTimer();

    const floatingTimer = dom.floatingTimer;
    if (!floatingTimer) return;

    let isDragging = false;
    let offsetX, offsetY;

    const onMouseDown = (e) => {
        if (e.target.closest('button')) return; 
        isDragging = true;
        const rect = floatingTimer.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        floatingTimer.style.cursor = 'grabbing';
    };

    const onMouseMove = (e) => {
        if (!isDragging) return;
        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;

        const container = document.body;
        const rect = floatingTimer.getBoundingClientRect();
        
        newX = Math.max(0, Math.min(newX, container.clientWidth - rect.width));
        newY = Math.max(0, Math.min(newY, container.clientHeight - rect.height));

        floatingTimer.style.left = `${newX}px`;
        floatingTimer.style.top = `${newY}px`;
        floatingTimer.style.bottom = 'auto';
        floatingTimer.style.right = 'auto';
    };

    const onMouseUp = () => {
        isDragging = false;
        floatingTimer.style.cursor = 'grab';
    };

    floatingTimer.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}