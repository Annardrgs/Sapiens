/**
 * @file Módulo para todas as interações com o Firestore.
 */

import { db, auth } from '../firebase.js';
import {
  collection, query, orderBy, getDocs, getDoc, doc, addDoc, updateDoc,
  deleteDoc, writeBatch, serverTimestamp, increment, runTransaction,
} from 'firebase/firestore';
import { cloudinaryConfig } from '../firebase.js';

const getCurrentUserId = () => auth.currentUser?.uid;

function getRandomColor() {
    const colors = [
        '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981', 
        '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', 
        '#a855f7', '#d946ef', '#ec4899'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

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

export async function getActivePeriodDataForAllEnrollments() {
  const userId = getCurrentUserId();
  if (!userId) return [];

  // 1. Pega todas as matrículas
  const enrollments = await getEnrollments();
  const dashboardData = [];

  // 2. Itera sobre cada matrícula para buscar os dados do período ativo
  for (const enrollment of enrollments) {
    if (enrollment.activePeriodId) {
      // Busca o documento do período para pegar o nome
      const periodRef = doc(db, 'users', userId, 'enrollments', enrollment.id, 'periods', enrollment.activePeriodId);
      const periodSnap = await getDoc(periodRef);
      const periodName = periodSnap.exists() ? periodSnap.data().name : 'Período ativo';

      // Busca as disciplinas do período ativo
      const disciplines = await getDisciplines(enrollment.id, enrollment.activePeriodId);

      dashboardData.push({
        enrollmentId: enrollment.id,
        course: enrollment.course,
        institution: enrollment.institution,
        periodId: enrollment.activePeriodId,
        periodName: periodName,
        disciplines: disciplines,
      });
    }
  }

  return dashboardData;
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

        // Garante que o array de notas tenha o tamanho certo
        if (grades.length > gradeIndex) {
            grades[gradeIndex].grade = grade;
        } else {
            // Isso pode ser ajustado conforme necessário, mas por segurança, não deve acontecer se a config estiver certa
            grades[gradeIndex] = { name: `Av. ${gradeIndex + 1}`, grade: grade };
        }

        transaction.update(disciplineRef, { grades: grades });
    });
}

// --- PERÍODOS ---

export async function getPeriods(enrollmentId) {
    const userId = getCurrentUserId();
    if (!userId) return [];
    const q = query(collection(db, 'users', userId, 'enrollments', enrollmentId, 'periods'), orderBy('name', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Obtém um único documento de período.
 * @param {string} enrollmentId - O ID da matrícula.
 * @param {string} periodId - O ID do período.
 * @returns {Promise<DocumentSnapshot>}
 */
export function getPeriod(enrollmentId, periodId) {
    const userId = getCurrentUserId();
    if (!userId) return null;
    const periodRef = doc(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId);
    return getDoc(periodRef);
}

export async function createPeriod(enrollmentId, periodName) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const periodsRef = collection(db, 'users', userId, 'enrollments', enrollmentId, 'periods');
    const newPeriodDoc = await addDoc(periodsRef, {
        name: periodName,
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

    // 1. Encontrar e deletar todas as disciplinas dentro do período
    const disciplinesRef = collection(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId, 'disciplines');
    const disciplinesSnap = await getDocs(disciplinesRef);
    disciplinesSnap.forEach(doc => {
        batch.delete(doc.ref);
    });

    // 2. Deletar o próprio período
    const periodRef = doc(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId);
    batch.delete(periodRef);

    // 3. Opcional: Atualizar o período ativo da matrícula se o período deletado era o ativo
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
    return updateDoc(periodRef, { status: status }); // status pode ser 'active' ou 'closed'
}

// --- DISCIPLINAS ---

export async function getDisciplines(enrollmentId, periodId) {
  const userId = getCurrentUserId();
  if (!userId || !periodId) return [];
  const q = query(collection(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId, 'disciplines'), orderBy('position', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export function getDiscipline(enrollmentId, periodId, disciplineId) {
    const userId = getCurrentUserId();
    if (!userId) return null;
    return getDoc(doc(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId, 'disciplines', disciplineId));
}

export function saveDiscipline(payload, { enrollmentId, periodId, disciplineId = null }) {
  const userId = getCurrentUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const collectionRef = collection(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId, 'disciplines');

  if (disciplineId) {
    // Atualiza uma disciplina existente
    return updateDoc(doc(collectionRef, disciplineId), payload);
  } else {
    // Cria uma nova disciplina
    const newDiscipline = { 
        ...payload, 
        createdAt: serverTimestamp(), 
        position: Date.now(), 
        absences: 0,
        color: getRandomColor()
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
        transaction.set(doc(absencesRef), payload);
        transaction.update(disciplineRef, { absences: increment(1) });
    });
}

export function removeAbsence(absenceId, { enrollmentId, periodId, disciplineId }) {
    const userId = getCurrentUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const disciplineRef = doc(db, 'users', userId, 'enrollments', enrollmentId, 'periods', periodId, 'disciplines', disciplineId);
    const absenceRef = doc(disciplineRef, 'absences', absenceId);

    return runTransaction(db, async (transaction) => {
        transaction.delete(absenceRef);
        transaction.update(disciplineRef, { absences: increment(-1) });
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