import { supabase } from './supabaseClient.js';

/**
 * Return the current auth session or null.
 */
export async function getSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) {
    console.error('getSession error', error);
    return null;
  }
  return session;
}

/**
 * Sign in an existing user with email & password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ data: any, error: any }>}
 */
export async function login(email, password) {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

/**
 * Register a new user with email & password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ data: any, error: any }>}
 */
export async function register(email, password) {
  return await supabase.auth.signUp({
    email,
    password,
  });
}

/**
 * Sign the current user out.
 * @returns {Promise<{ data: any, error: any }>}
 */
export async function logout() {
  return await supabase.auth.signOut();
}

/**
 * Listen for auth state changes and invoke the given callback with the
 * current session (or null) whenever an event occurs.
 * Returns the subscription object with a ``unsubscribe`` method.
 *
 * @param {(session: import('@supabase/supabase-js').Session | null) => void} callback
 */
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return subscription
}
