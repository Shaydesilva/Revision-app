import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = URL && KEY ? createClient(URL, KEY) : null

// ── AUTH ─────────────────────────────────────────────────────────
export async function signInWithEmail(email) {
  if (!supabase) return { error: 'No Supabase connection' }
  return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
}

export async function getSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data?.session
}

export async function onAuthChange(cb) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(session))
  return () => data.subscription.unsubscribe()
}

// ── CARDS ─────────────────────────────────────────────────────────
export async function loadCards(userId) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', userId)
    .order('introduced_day', { ascending: true })
  if (error) { console.error('loadCards:', error); return null }
  return data
}

export async function seedCards(userId, cards) {
  if (!supabase) return
  const rows = cards.map(c => ({ ...c, user_id: userId }))
  const { error } = await supabase.from('cards').upsert(rows, { onConflict: 'id,user_id' })
  if (error) console.error('seedCards:', error)
}

export async function updateCard(userId, cardId, updates) {
  if (!supabase) return
  const { error } = await supabase
    .from('cards')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', cardId)
    .eq('user_id', userId)
  if (error) console.error('updateCard:', error)
}

export async function insertCard(userId, card) {
  if (!supabase) return
  const { error } = await supabase.from('cards').insert({ ...card, user_id: userId })
  if (error) console.error('insertCard:', error)
}

// ── USER STATE ────────────────────────────────────────────────────
export async function loadUserState(userId) {
  if (!supabase) return null
  const { data } = await supabase.from('user_state').select('*').eq('user_id', userId).single()
  return data
}

export async function saveUserState(userId, state) {
  if (!supabase) return
  await supabase.from('user_state').upsert({ ...state, user_id: userId, updated_at: new Date().toISOString() })
}

// ── REVIEWS ───────────────────────────────────────────────────────
export async function logReview(userId, cardId, quality, mode, sessionId) {
  if (!supabase) return
  await supabase.from('card_reviews').insert({ user_id: userId, card_id: cardId, quality, mode, session_id: sessionId })
}
