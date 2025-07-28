/**
 * @file Módulo para funções de autenticação com o Firebase.
 */

import { auth, db } from '../firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

/**
 * Registra um novo usuário com email e senha.
 * @param {string} email - O email do usuário.
 * @param {string} password - A senha do usuário.
 * @returns {Promise<UserCredential>}
 */
export async function signUp(email, password) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  // Cria um documento para o novo usuário no Firestore.
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email,
    name: email.split('@')[0],
    createdAt: new Date(),
  });
  return userCredential;
}

/**
 * Autentica um usuário existente com email e senha.
 * @param {string} email - O email do usuário.
 * @param {string} password - A senha do usuário.
 * @returns {Promise<UserCredential>}
 */
export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Desconecta o usuário atual.
 * @returns {Promise<void>}
 */
export function logOut() {
  return signOut(auth);
}