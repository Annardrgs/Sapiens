/**
 * @file Módulo para todas as interações com o Firestore.
 */

import { db, auth } from '../firebase.js';
import {
  collection,
  query,
  orderBy,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  increment,
  runTransaction,
} from 'firebase/firestore';

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

// --- PERÍODOS ---

export async function getPeriods(enrollmentId) {
    const userId = getCurrentUserId();
    if (!userId) return [];
    const q = query(collection(db, 'users', userId, 'enrollments', enrollmentId, 'periods'), orderBy('name', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    return updateDoc(doc(collectionRef, disciplineId), payload);
  } else {
    return addDoc(collectionRef, { ...payload, createdAt: serverTimestamp(), position: Date.now(), absences: 0 });
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
    const q = query(collection(db, 'users', userId, 'enrollments', enrollmentId, 'periods', disciplineId, 'absences'), orderBy('absenceDate', 'desc'));
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