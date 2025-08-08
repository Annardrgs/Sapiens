/**
 * @file Módulo para todas as interações com o Firestore.
 */

import { db, auth } from '../firebase.js';
import {
  collection, query, orderBy, getDocs, getDoc, doc, addDoc, updateDoc,
  deleteDoc, writeBatch, serverTimestamp, increment, runTransaction, where, deleteField,
} from 'firebase/firestore';
import { cloudinaryConfig } from '../firebase.js';

const getCurrentUserId = () => auth.currentUser?.uid;

// --- MATRÍCULAS ---

export async function getEnrollments() {
  const userId = getCurrentUserId();
  if (!userId) return [];
  const q = query(collection(db, 'users', userId, 'enrollments'), orderBy('position', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export function getEnrollment(id) {
    const userId = getCurrentUserId();
    if (!userId) return null;
    return getDoc(doc(db, 'users', userId, 'enrollments', id));
}

export async function saveEnrollment(payload, id = null) {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("Usuário não autenticado.");

  if (id) {
    // Edição
    const docRef = doc(db, 'users', userId, 'enrollments', id);
    return updateDoc(docRef, payload);
  } else {
    // Criação com batch
    const batch = writeBatch(db);
    const newEnrollmentRef = doc(collection(db, 'users', userId, 'enrollments'));
    const newPeriodRef = doc(collection(newEnrollmentRef, 'periods'));

    batch.set(newEnrollmentRef, {
      ...payload,
      createdAt: serverTimestamp(),
      position: Date.now(),
      activePeriodId: newPeriodRef.id
    });
    batch.set(newPeriodRef, { name: payload.currentPeriod, status: 'active', createdAt: new Date() });
    return batch.commit();
  }
}

export function deleteEnrollment(id) {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  return deleteDoc(doc(db, 'users', userId, 'enrollments', id));
}

export async function updateEnrollmentsOrder(items) {
    const userId = getCurrentUserId();
    if (!userId) return;
    const batch = writeBatch(db);
    items.forEach((item, index) => {
        const docRef = doc(db, 'users', userId, 'enrollments', item.dataset.id);
        batch.update(docRef, { position: index });
    });
    await batch.commit();
}

export async function saveGrade(grade, gradeIndex, { enrollmentId, periodId, disciplineId }) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");

    const disciplineRef = doc(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId, 'disciplines', disciplineId);

    return runTransaction(db, async (transaction) => {
        const disciplineSnap = await transaction.get(disciplineRef);
        if (!disciplineSnap.exists()) {
            throw "Disciplina não encontrada!";
        }

        const disciplineData = disciplineSnap.data();
        const grades = disciplineData.grades || [];

        if (grades.length > gradeIndex) {
            grades[gradeIndex].grade = grade;
        } else {
            const gradeName = disciplineData.gradeConfig?.evaluations[gradeIndex]?.name || 'Média Final';
            grades[gradeIndex] = { name: gradeName, grade: grade };
        }
        
        transaction.update(disciplineRef, { grades: grades });
    });
}

// --- PERÍODOS ---

export async function getPeriods(enrollmentId) {
    const userId = getCurrentUserId();
    if (!userId) return [];

    const q = query(collection(db, 'users', userId, 'enrollments', enrollmentId, 'periods'), orderBy('startDate', 'asc'));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createPeriod(enrollmentId, periodData) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    
    const periodsRef = collection(db, 'users', userId, 'enrollments', enrollmentId, 'periods');
    
    const newPeriodDoc = await addDoc(periodsRef, {
        ...periodData,
        status: 'active',
        createdAt: new Date()
    });

    await updateActivePeriod(enrollmentId, newPeriodDoc.id);
    return newPeriodDoc;
}

export function updateActivePeriod(enrollmentId, periodId) {
    const userId = getCurrentUserId();
    if (!userId) return;
    const enrollmentRef = doc(db, 'users', userId, 'enrollments', enrollmentId);
    return updateDoc(enrollmentRef, { activePeriodId: periodId });
}

export async function deletePeriod(enrollmentId, periodId) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");

    const batch = writeBatch(db);

    const disciplinesRef = collection(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId, 'disciplines');
    const disciplinesSnap = await getDocs(disciplinesRef);
    disciplinesSnap.forEach(doc => {
        batch.delete(doc.ref);
    });

    const periodRef = doc(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId);
    batch.delete(periodRef);

    const enrollmentRef = doc(db, 'users', userId, 'enrollments', enrollmentId);
    const enrollmentSnap = await getDoc(enrollmentRef);
    if (enrollmentSnap.exists() && enrollmentSnap.data().activePeriodId === periodId) {
        const remainingPeriods = await getPeriods(enrollmentId);
        const newActivePeriodId = remainingPeriods.length > 0 ? remainingPeriods[0].id : null;
        batch.update(enrollmentRef, { activePeriodId: newActivePeriodId });
    }

    return batch.commit();
}

export function updatePeriodStatus(enrollmentId, periodId, status) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const periodRef = doc(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId);
    return updateDoc(periodRef, { status: status });
}

// --- DISCIPLINAS ---

export async function getDisciplines(enrollmentId, periodId) {
  const userId = getCurrentUserId();
  if (!userId || !periodId) return [];
  const q = query(collection(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId, 'disciplines'), orderBy('position', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function isDisciplineCodeUnique(enrollmentId, code, currentDisciplineId = null) {
    const userId = getCurrentUserId();
    if (!userId || !code) return true;

    const periods = await getPeriods(enrollmentId);
    
    const disciplinePromises = periods.map(period => getDisciplines(enrollmentId, period.id));

    const disciplinesByPeriod = await Promise.all(disciplinePromises);

    const allDisciplines = disciplinesByPeriod.flat();

    const duplicate = allDisciplines.find(discipline => 
        String(discipline.code) === code && discipline.id !== currentDisciplineId
    );

    return !duplicate;
}

export function getDiscipline(enrollmentId, periodId, disciplineId) {
    console.log('%c[API] Função getDiscipline chamada com:', 'color: green; font-weight: bold', { enrollmentId, periodId, disciplineId });
    
    const userId = getCurrentUserId();
    if (!userId) return null;

    if (!enrollmentId || !periodId || !disciplineId) {
        console.error('[API] ERRO: Um dos IDs necessários para buscar a disciplina está faltando.');
        return Promise.reject('ID inválido fornecido para getDiscipline.');
    }

    return getDoc(doc(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId, 'disciplines', disciplineId));
}

export function saveDiscipline(payload, { enrollmentId, periodId, disciplineId = null }) {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const collectionRef = collection(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId, 'disciplines');

  if (disciplineId) {
    return updateDoc(doc(collectionRef, disciplineId), payload);
  } else {
    const newDiscipline = { 
        ...payload, 
        createdAt: serverTimestamp(), 
        position: Date.now(), 
        absences: 0,
    };
    return addDoc(collectionRef, newDiscipline);
  }
}

export function deleteDiscipline(enrollmentId, periodId, disciplineId) {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  return deleteDoc(doc(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId, 'disciplines', disciplineId));
}

export async function updateDisciplinesOrder(items, { enrollmentId, periodId }) {
    const userId = getCurrentUserId();
    if (!userId) return;
    const batch = writeBatch(db);
    items.forEach((item, index) => {
        const docRef = doc(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId, 'disciplines', item.dataset.id);
        batch.update(docRef, { position: index });
    });
    await batch.commit();
}

// --- FALTAS ---

export async function getAbsenceHistory(enrollmentId, periodId, disciplineId) {
    const userId = getCurrentUserId();
    if (!userId) return [];
    const q = query(collection(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId, 'disciplines', disciplineId, 'absences'), orderBy('absenceDate', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export function addAbsence(payload, { enrollmentId, periodId, disciplineId }) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const disciplineRef = doc(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId, 'disciplines', disciplineId);
    const absencesRef = collection(disciplineRef, 'absences');

    return runTransaction(db, async (transaction) => {
        const disciplineSnap = await transaction.get(disciplineRef);
        if (!disciplineSnap.exists()) {
            throw new Error("Disciplina não encontrada.");
        }
        const disciplineData = disciplineSnap.data();

        // Lógica de reprovação por falta
        const newAbsences = (disciplineData.absences || 0) + 1;
        const workload = Number(disciplineData.workload) || 0;
        const hoursPerClass = Number(disciplineData.hoursPerClass) || 1;
        const totalClasses = workload > 0 && hoursPerClass > 0 ? Math.floor(workload / hoursPerClass) : 0;
        const absenceLimit = totalClasses > 0 ? Math.floor(totalClasses * 0.25) : 0;

        const updatePayload = { absences: increment(1) };

        if (absenceLimit > 0 && newAbsences > absenceLimit) {
            updatePayload.failedByAbsence = true;
            // Zera as notas se reprovado por falta
            if (disciplineData.grades && disciplineData.grades.length > 0) {
                updatePayload.grades = disciplineData.grades.map(g => ({ ...g, grade: 0 }));
            }
        }

        transaction.set(doc(absencesRef), payload);
        transaction.update(disciplineRef, updatePayload);
    });
}

export function removeAbsence(absenceId, { enrollmentId, periodId, disciplineId }) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const disciplineRef = doc(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId, 'disciplines', disciplineId);
    const absenceRef = doc(disciplineRef, 'absences', absenceId);

    return runTransaction(db, async (transaction) => {
        const disciplineSnap = await transaction.get(disciplineRef);
        if (!disciplineSnap.exists()) {
            throw new Error("Disciplina não encontrada.");
        }
        const disciplineData = disciplineSnap.data();

        // Lógica para reverter reprovação por falta
        const newAbsences = (disciplineData.absences || 1) - 1;
        const workload = Number(disciplineData.workload) || 0;
        const hoursPerClass = Number(disciplineData.hoursPerClass) || 1;
        const totalClasses = workload > 0 && hoursPerClass > 0 ? Math.floor(workload / hoursPerClass) : 0;
        const absenceLimit = totalClasses > 0 ? Math.floor(totalClasses * 0.25) : 0;

        const updatePayload = { absences: increment(-1) };

        if (disciplineData.failedByAbsence && newAbsences <= absenceLimit) {
            updatePayload.failedByAbsence = false;
            // As notas permanecem zeradas, o usuário deve re-inserir se desejar.
        }

        transaction.delete(absenceRef);
        transaction.update(disciplineRef, updatePayload);
    });
}

/**
 * Faz o upload de um arquivo para o Cloudinary.
 * @param {File} file O arquivo a ser enviado.
 * @returns {Promise<string>} A URL de download do arquivo.
 */
export async function uploadPeriodCalendar(file) {
    const { cloudName, uploadPreset } = cloudinaryConfig;
    if (!cloudName || !uploadPreset) {
        throw new Error("Configuração do Cloudinary não encontrada.");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('resource_type', 'auto');

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Erro no upload para o Cloudinary:", errorData);
        throw new Error('Falha no upload para o Cloudinary.');
    }

    const data = await response.json();

    // CORREÇÃO CRÍTICA: Garante que a URL use o tipo de recurso correto
    if (data.resource_type === 'raw') {
        return data.secure_url.replace('/image/upload/', '/raw/upload/');
    }

    return data.secure_url;
}

/**
 * Atualiza os detalhes de um período (datas, URL do calendário).
 * @param {string} enrollmentId ID da matrícula.
 * @param {string} periodId ID do período.
 * @param {object} payload Os dados a serem atualizados.
 * @returns {Promise<void>}
 */
export function updatePeriodDetails(enrollmentId, periodId, payload) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const periodRef = doc(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId);
    return updateDoc(periodRef, payload);
}

export function saveCalendarEvent(payload, { enrollmentId, periodId }) {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const collectionRef = collection(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId, 'events');
  return addDoc(collectionRef, payload);
}

export async function getCalendarEvents(enrollmentId, periodId) {
  const userId = getCurrentUserId();
  if (!userId || !periodId) return [];
  const q = query(collection(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId, 'events'));
  const snapshot = await getDocs(q);
  
  // Formata para o padrão que o FullCalendar espera, mas inclui todos os outros dados
  return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
          ...data, // <<< ADICIONE ESTA LINHA para incluir todos os campos (reminder, category, etc.)
          id: doc.id,
          start: data.date, // Garante que o FullCalendar use o campo 'date' como 'start'
          allDay: true,
          backgroundColor: data.color || '#ef4444',
          borderColor: data.color || '#ef4444'
      }
  });
}

/**
 * Obtém o documento de um usuário.
 * @returns {Promise<DocumentSnapshot>}
 */
export function getUserDoc() {
    const userId = getCurrentUserId();
    if (!userId) return null;
    return getDoc(doc(db, 'users', userId));
}

/**
 * Adiciona IDs de lembretes à lista de dispensados do usuário.
 * @param {string[]} reminderIds - Array com os IDs dos eventos a serem marcados como lidos.
 * @returns {Promise<void>}
 */
export function dismissReminders(reminderIds) {
    const userId = getCurrentUserId();
    if (!userId || reminderIds.length === 0) return;
    const userRef = doc(db, 'users', userId);
    return updateDoc(userRef, {
        dismissedReminderIds: arrayUnion(...reminderIds)
    });
}

export function getCalendarEvent(eventId, { enrollmentId, periodId }) {
    const userId = getCurrentUserId();
    if (!userId) return null;
    return getDoc(doc(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId, 'events', eventId));
}

export function updateCalendarEvent(eventId, payload, { enrollmentId, periodId }) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const eventRef = doc(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId, 'events', eventId);
    return updateDoc(eventRef, payload);
}

export function deleteCalendarEvent(eventId, { enrollmentId, periodId }) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const eventRef = doc(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId, 'events', eventId);
    return deleteDoc(eventRef);
}

/**
 * Salva o token do Firebase Cloud Messaging (FCM) de um dispositivo para o usuário.
 * @param {string} token - O token do dispositivo a ser salvo.
 */
export async function saveFcmToken(token) {
    const userId = getCurrentUserId();
    if (!userId) return;

    // Salva o token em uma subcoleção para evitar conflitos e permitir múltiplos dispositivos
    const tokenRef = doc(db, `users/${userId}/fcmTokens`, token);
    await setDoc(tokenRef, { createdAt: serverTimestamp() });
}

// --- TO-DO LIST ---

/**
 * Retorna a data atual no formato YYYY-MM-DD.
 * @returns {string} A data formatada.
 */
function getTodayDateString() {
    const today = new Date();
    return today.toLocaleDateString('en-CA'); // Formato YYYY-MM-DD
}

export async function getTodosForToday() {
    const userId = getCurrentUserId();
    if (!userId) return [];
    const todayStr = getTodayDateString();
    
    const todosRef = collection(db, 'users', userId, 'todos');
    // CORREÇÃO: Ordena primeiro por 'completed' (false vem primeiro) e depois por data de criação.
    const q = query(todosRef, where("date", "==", todayStr), orderBy("completed", "asc"), orderBy("createdAt", "desc"));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export function addTodo(text) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const todosRef = collection(db, 'users', userId, 'todos');

    return addDoc(todosRef, {
        text: text,
        completed: false,
        isPinned: false,
        date: getTodayDateString(),
        createdAt: serverTimestamp()
    });
}

export function updateTodoPinnedStatus(todoId, isPinned) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const todoRef = doc(db, 'users', userId, 'todos', todoId);
    return updateTodo(todoId, { isPinned });
}

export function updateTodoStatus(todoId, completed) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const todoRef = doc(db, 'users', userId, 'todos', todoId);
    return updateTodo(todoId, { completed });
}

export function deleteTodo(todoId) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const todoRef = doc(db, 'users', userId, 'todos', todoId);
    return deleteDoc(todoRef);
}

export function updateTodoText(todoId, newText) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const todoRef = doc(db, 'users', userId, 'todos', todoId);
    return updateDoc(todoRef, { text: newText });
}

// --- GRADE CURRICULAR (CHECKLIST) ---

export async function getCurriculumSubjects(enrollmentId) {
    const userId = getCurrentUserId();
    if (!userId) return [];
    const q = query(collection(db, 'users', userId, 'enrollments', enrollmentId, 'curriculum'), orderBy('period', 'asc'), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export function saveCurriculumSubject(payload, { enrollmentId, subjectId = null }) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const collectionRef = collection(db, 'users', userId, 'enrollments', enrollmentId, 'curriculum');

    if (subjectId) {
        return updateDoc(doc(collectionRef, subjectId), payload);
    } else {
        return addDoc(collectionRef, payload);
    }
}

export async function getAllTakenDisciplines(enrollmentId) {
    const userId = getCurrentUserId();
    if (!userId) return [];
    
    const periods = await getPeriods(enrollmentId);
    if (periods.length === 0) return [];

    const allDisciplinesPromises = periods.map(async (p) => {
        const disciplines = await getDisciplines(enrollmentId, p.id);
        // Adiciona a informação do período a cada disciplina
        return disciplines.map(d => ({ ...d, periodId: p.id, periodName: p.name }));
    });
    
    const disciplinesByPeriod = await Promise.all(allDisciplinesPromises);
    return disciplinesByPeriod.flat();
}

// --- SESSÕES DE ESTUDO (POMODORO) ---

export function saveStudySession(sessionData) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const sessionsRef = collection(db, 'users', userId, 'studySessions');
    return addDoc(sessionsRef, {
        ...sessionData,
        timestamp: serverTimestamp()
    });
}

export async function getStudyHistory() {
    const userId = getCurrentUserId();
    if (!userId) return [];
    const q = query(collection(db, 'users', userId, 'studySessions'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export function deleteStudySession(sessionId) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const sessionRef = doc(db, 'users', userId, 'studySessions', sessionId);
    return deleteDoc(sessionRef);
}


export async function getAllUpcomingEvents() {
    const userId = getCurrentUserId();
    if (!userId) return [];

    const enrollments = await getEnrollments();
    if (enrollments.length === 0) return [];

    let allEvents = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Mapeia todas as disciplinas de todos os períodos primeiro para consulta rápida
    const disciplinesMap = new Map();
    for (const enrollment of enrollments) {
        const periods = await getPeriods(enrollment.id);
        for (const period of periods) {
            const disciplines = await getDisciplines(enrollment.id, period.id);
            disciplines.forEach(d => {
                disciplinesMap.set(d.id, d.name);
            });
        }
    }

    for (const enrollment of enrollments) {
        if (enrollment.activePeriodId) {
            const events = await getCalendarEvents(enrollment.id, enrollment.activePeriodId);
            const futureEvents = events
                .filter(e => new Date(e.start.replace(/-/g, '/')) >= today)
                .map(e => ({ 
                    ...e, 
                    courseName: enrollment.course,
                    // Adiciona o nome da disciplina usando o mapa
                    disciplineName: e.relatedDisciplineId ? disciplinesMap.get(e.relatedDisciplineId) : null
                }));
            allEvents.push(...futureEvents);
        }
    }

    // Ordena todos os eventos por data
    allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

    return allEvents;
}

// --- FUNÇÕES DE DOCUMENTOS ---

/**
 * Salva os metadados de um documento na coleção principal de documentos do usuário.
 * @param {object} payload Os dados do documento.
 * @param {string|null} documentId (Opcional) ID do documento para edição.
 */
export async function saveDocument(payload, documentId = null) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    
    // CAMINHO CORRETO E FINAL: Salva sempre na coleção 'documents' do usuário.
    const collectionPath = `users/${userId}/documents`;
    const collectionRef = collection(db, collectionPath);

    if (documentId) {
        return updateDoc(doc(collectionRef, documentId), payload);
    } else {
        return addDoc(collectionRef, { ...payload, userId, createdAt: serverTimestamp() });
    }
}

/**
 * Busca documentos. Se um enrollmentId for fornecido, filtra por ele.
 * Se não, busca todos os documentos do usuário.
 * @param {string|null} enrollmentId (Opcional) ID da matrícula para filtrar.
 */
export async function getDocuments(enrollmentId = null) {
    const userId = getCurrentUserId();
    if (!userId) return [];

    // CAMINHO CORRETO E FINAL: Busca sempre na coleção 'documents' do usuário.
    const collectionRef = collection(db, 'users', userId, 'documents');
    let q;

    if (enrollmentId) {
        // Busca apenas os documentos da matrícula específica
        q = query(collectionRef, where('enrollmentId', '==', enrollmentId), orderBy('createdAt', 'desc'));
    } else {
        // Busca TODOS os documentos do usuário (para a biblioteca geral)
        q = query(collectionRef, orderBy('createdAt', 'desc'));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Deleta um documento da coleção principal.
 * @param {string} documentId ID do documento no Firestore.
 */
export async function deleteDocument(documentId) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");

    // O caminho agora está correto para a nova estrutura.
    const docRef = doc(db, `users/${userId}/documents`, documentId);
    
    // Apenas deleta o registro do banco de dados.
    await deleteDoc(docRef);
}

/**
 * Faz o upload de um arquivo para o Cloudinary de forma genérica.
 * @param {File} file O arquivo a ser enviado.
 * @returns {Promise<object>} Um objeto com a URL segura e o tipo de recurso.
 */
export async function uploadFileToCloudinary(file) {
    const { cloudName, uploadPreset } = cloudinaryConfig;
    if (!cloudName || !uploadPreset) {
        throw new Error("Configuração do Cloudinary não encontrada. Verifique seu arquivo .env.");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('resource_type', 'auto');

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        // Log detalhado do erro no console para depuração
        console.error("ERRO DETALHADO DO CLOUDINARY:", errorData);
        throw new Error(`Falha no upload para o Cloudinary: ${errorData.error.message}`);
    }

    const data = await response.json();
    return {
        url: data.secure_url,
        publicId: data.public_id, // Adicione esta linha
        resourceType: data.resource_type
    };
}

/**
 * Apaga todos os TODOs do usuário que são de dias anteriores ao dia atual.
 */
export async function cleanupOldTodos() {
    const userId = getCurrentUserId();
    if (!userId) return;
    const todayStr = getTodayDateString();

    try {
        const todosRef = collection(db, 'users', userId, 'todos');
        
        const q = query(todosRef, where("date", "<", todayStr), where("isPinned", "==", false));
        
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log("Nenhuma tarefa antiga para limpar.");
            return;
        }

        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`${snapshot.size} tarefas antigas foram removidas com sucesso.`);

    } catch (error) {
        console.error("Erro ao limpar tarefas antigas:", error);
    }
}

export function updateTodo(todoId, payload) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const todoRef = doc(db, 'users', userId, 'todos', todoId);
    return updateDoc(todoRef, payload);
}

export function createBatch() {
    return writeBatch(db);
}

export function commitBatch(batch) {
    return batch.commit();
}

export function addEventToBatch(batch, eventData, { enrollmentId, periodId }) {
    const userId = getCurrentUserId();
    if (!userId) return;
    
    const eventRef = doc(collection(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId, 'events'));
    
    const payload = {
        title: eventData.title,
        date: eventData.date,
        category: eventData.category || "Evento",
        color: eventData.category === "Feriado" ? "#ef4444" : "#14b8a6",
        reminder: "1d",
        allDay: true,
    };
    batch.set(eventRef, payload);
}

export function deleteFieldValue() {
    return deleteField();
}