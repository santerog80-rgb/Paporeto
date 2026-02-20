/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║              PapoReto — config.js                           ║
 * ║   Configuração central + cliente Supabase + utilitários     ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * COMO CONFIGURAR:
 *   1. Crie um projeto em https://supabase.com
 *   2. Vá em Project Settings → API
 *   3. Copie a URL e a Anon Key
 *   4. Cole abaixo em SUPABASE_URL e SUPABASE_ANON_KEY
 *   OU configure no painel em configuracoes.html → Conexão
 */

// ─── SUPABASE CREDENTIALS ────────────────────────────────────────
const SUPABASE_URL   = localStorage.getItem('pr_url') || 'https://SEU_PROJETO.supabase.co';
const SUPABASE_ANON_KEY = localStorage.getItem('pr_key') || 'SUA_ANON_KEY';

// ─── APP METADATA ────────────────────────────────────────────────
const APP = {
  name: 'PapoReto',
  version: '1.0.0',
  build: '2025.01',
  demo_email: 'demo@paporeto.com',
  demo_password: '123456',
};

// ─── DEMO MODE ───────────────────────────────────────────────────
// Quando as credenciais não estão configuradas, o app roda em modo demo
// com dados fictícios armazenados no localStorage.
const IS_DEMO = SUPABASE_URL.includes('SEU_PROJETO') || !SUPABASE_URL || SUPABASE_URL.length < 20;

// ─── SUPABASE CLIENT ─────────────────────────────────────────────
let _sbClient = null;

function getSupabase() {
  if (_sbClient) return _sbClient;
  if (IS_DEMO) return null;
  if (!window.supabase) {
    console.warn('[PapoReto] Supabase SDK ainda não carregado.');
    return null;
  }
  _sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return _sbClient;
}

// Carrega o SDK do Supabase via CDN e chama callback quando pronto
function loadSupabaseSDK(callback) {
  if (IS_DEMO) { if (callback) callback(null); return; }
  if (window.supabase) { if (callback) callback(getSupabase()); return; }
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  script.onload = () => { if (callback) callback(getSupabase()); };
  script.onerror = () => { console.error('[PapoReto] Falha ao carregar SDK Supabase'); if (callback) callback(null); };
  document.head.appendChild(script);
}

// ─── SESSION MANAGER ─────────────────────────────────────────────
const Session = {
  get() {
    try { return JSON.parse(localStorage.getItem('pr_session') || 'null'); } catch { return null; }
  },
  set(data) { localStorage.setItem('pr_session', JSON.stringify(data)); },
  clear() { localStorage.removeItem('pr_session'); },
  require(redirectTo = 'login.html') {
    const s = this.get();
    if (!s || !s.id) { window.location.href = redirectTo; return null; }
    return s;
  },
};

// ─── PREFERENCES ─────────────────────────────────────────────────
const Prefs = {
  defaults: {
    notif_msgs: true, notif_groups: true, notif_status: false,
    notif_calls: true, notif_sound: true, notif_vibrate: true,
    notif_dnd: false, notif_volume: 80,
    priv_lastseen: true, priv_readreceipt: true,
    priv_typing: true, priv_online: true,
    priv_photo: 'all', priv_bio: 'contacts', priv_status: 'contacts',
    priv_groups: 'contacts',
    call_noise: true, call_echo: true, call_mirror: true,
    call_start_muted: false, call_vibrate: true, call_quality: 'auto',
    media_img: true, media_audio: true, media_video: false, media_docs: false,
    net_offline: true, net_save: false,
    compact: false, show_time: true, enter_send: true,
    font_size: 14, accent_color: '#00C16A', bubble_style: 'rounded',
    theme: 'dark',
  },
  get() {
    const stored = JSON.parse(localStorage.getItem('pr_prefs') || '{}');
    return { ...this.defaults, ...stored };
  },
  set(prefs) { localStorage.setItem('pr_prefs', JSON.stringify({ ...this.get(), ...prefs })); },
  getKey(key) { return this.get()[key] ?? this.defaults[key]; },
  setKey(key, val) { this.set({ [key]: val }); },
};

// ─── DEMO DATA ────────────────────────────────────────────────────
const DemoData = {
  contacts: [
    { id: 'u1', name: 'Amina Chissano',    phone: '+258841234567', online: true,  color: '#00C16A', initials: 'AC' },
    { id: 'u2', name: 'Carlos Mondlane',   phone: '+258851234567', online: false, color: '#58A6FF', initials: 'CM' },
    { id: 'u3', name: 'Fatima Nhavene',    phone: '+27831234567',  online: false, color: '#BC8CFF', initials: 'FN' },
    { id: 'u4', name: 'João Machava',      phone: '+351912345678', online: true,  color: '#FF8C42', initials: 'JM' },
    { id: 'u5', name: 'Sofia Zita',        phone: '+238971234567', online: false, color: '#FF4757', initials: 'SZ' },
    { id: 'u6', name: 'Miguel Munhequete', phone: '+258861234567', online: true,  color: '#00D4AA', initials: 'MM' },
  ],
  groups: [
    { id: 'g1', name: 'Família Maputo 🏠',  icon: '🏠', description: 'Grupo da família', member_ids: ['u1','u2','u3'] },
    { id: 'g2', name: 'Trabalho Dev 💻',    icon: '💻', description: 'Equipa de desenvolvimento', member_ids: ['u1','u4','u5','u6'] },
    { id: 'g3', name: 'Amigos do Bairro 🎉', icon: '🎉', description: 'Galera do bairro', member_ids: ['u2','u3','u4'] },
  ],
  statuses: [
    { id: 's1', user_id: 'u1', type: 'text', content: '🌅 Bom dia Maputo!', bg_color: '#0D2B1A', created_at: ago(1800), seen: false },
    { id: 's2', user_id: 'u2', type: 'text', content: '💻 Coding toda noite...', bg_color: '#0A1020', created_at: ago(7200), seen: true },
    { id: 's3', user_id: 'u4', type: 'text', content: '🔥 Novo projeto lançado!', bg_color: '#1A0D0D', created_at: ago(3600), seen: false },
    { id: 's4', user_id: 'u6', type: 'text', content: '📱 Usando o PapoReto!', bg_color: '#001A12', created_at: ago(900), seen: false },
  ],
  messages: {
    'user_u1': [
      { id: 'm1', sender_id: 'u1',       content: 'Olá! Tudo bem? 😊', type: 'text', created_at: ago(7200), read: true },
      { id: 'm2', sender_id: '__ME__',   content: 'Tudo ótimo! E você?', type: 'text', created_at: ago(7100), read: true },
      { id: 'm3', sender_id: 'u1',       content: 'Tudo bem! Vai na festa amanhã? 🎉', type: 'text', created_at: ago(3600), read: true },
      { id: 'm4', sender_id: '__ME__',   content: 'Com certeza! 🔥', type: 'text', created_at: ago(1800), read: true },
      { id: 'm5', sender_id: 'u1',       content: 'Ótimo, vejo você lá 😄', type: 'text', created_at: ago(900), read: false },
    ],
    'user_u2': [
      { id: 'm6', sender_id: 'u2', content: 'Precisamos conversar sobre o projeto.', type: 'text', created_at: ago(86400), read: false },
      { id: 'm7', sender_id: 'u2', content: 'Podes me ligar quando tiveres tempo?', type: 'text', created_at: ago(82000), read: false },
    ],
    'user_u4': [
      { id: 'm8', sender_id: '__ME__', content: 'Ei, viste o novo framework? 🚀', type: 'text', created_at: ago(43200), read: true },
      { id: 'm9', sender_id: 'u4',    content: 'Sim! Muito bom mesmo 💻', type: 'text', created_at: ago(40000), read: true },
    ],
    'group_g1': [
      { id: 'm10', sender_id: 'u1',     content: 'Bom dia a todos! 🌅', type: 'text', created_at: ago(10800), read: true },
      { id: 'm11', sender_id: 'u2',     content: 'Bom dia! ☀️', type: 'text', created_at: ago(9000), read: true },
      { id: 'm12', sender_id: '__ME__', content: 'Bom dia família! 🏠', type: 'text', created_at: ago(8000), read: true },
    ],
    'group_g2': [
      { id: 'm13', sender_id: 'u4',     content: 'Deploy feito com sucesso! 🚀', type: 'text', created_at: ago(14400), read: true },
      { id: 'm14', sender_id: '__ME__', content: '🎉🎉🎉', type: 'text', created_at: ago(13000), read: true },
    ],
  },
  callHistory: [
    { id: 'c1', contact: 'Amina Chissano',    type: 'voice', duration: '3:42', time: ago(3600),  missed: false, color: '#00C16A' },
    { id: 'c2', contact: 'Carlos Mondlane',   type: 'video', duration: '12:07',time: ago(7200),  missed: false, color: '#58A6FF' },
    { id: 'c3', contact: 'Fatima Nhavene',    type: 'voice', duration: '',    time: ago(86400), missed: true,  color: '#BC8CFF' },
    { id: 'c4', contact: 'João Machava',      type: 'voice', duration: '0:55', time: ago(172800),missed: false, color: '#FF8C42' },
    { id: 'c5', contact: 'Sofia Zita',        type: 'video', duration: '',    time: ago(259200),missed: true,  color: '#FF4757' },
  ],
};

function getDemoMessages(key, sessionId) {
  const msgs = DemoData.messages[key] || [];
  return msgs.map(m => ({ ...m, sender_id: m.sender_id === '__ME__' ? sessionId : m.sender_id }));
}

// ─── SUPABASE AUTH HELPERS ────────────────────────────────────────
const Auth = {
  async signUp(email, password, name, phone) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase não configurado');
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name, phone } } });
    if (error) throw error;
    if (data.user) {
      await sb.from('users').upsert({ id: data.user.id, name, email, phone, created_at: new Date().toISOString() });
    }
    return data;
  },

  async signIn(email, password) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase não configurado');
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const { data: profile } = await sb.from('users').select('*').eq('id', data.user.id).single();
    return { ...data, profile };
  },

  async signOut() {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    Session.clear();
    window.location.href = 'login.html';
  },

  async resetPassword(email) {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase não configurado');
    const { error } = await sb.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },
};

// ─── DATABASE HELPERS ─────────────────────────────────────────────
const DB = {
  // Users
  async getUsers(exclude_id) {
    const sb = getSupabase();
    if (!sb) return DemoData.contacts;
    const { data } = await sb.from('users').select('*').neq('id', exclude_id);
    return (data || []).map(u => ({ ...u, initials: getInitials(u.name), color: strColor(u.id) }));
  },

  async getUser(id) {
    const sb = getSupabase();
    if (!sb) return DemoData.contacts.find(u => u.id === id) || null;
    const { data } = await sb.from('users').select('*').eq('id', id).single();
    return data;
  },

  async updateUser(id, updates) {
    const sb = getSupabase();
    if (!sb) { Session.set({ ...Session.get(), ...updates }); return updates; }
    const { data, error } = await sb.from('users').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async updatePresence(id, online) {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from('users').update({ online, last_seen: new Date().toISOString() }).eq('id', id);
  },

  // Messages
  async getMessages(type, id, sessionId) {
    const sb = getSupabase();
    if (!sb) return getDemoMessages(`${type}_${id}`, sessionId);
    let query = sb.from('messages').select('*, reactions:message_reactions(*)');
    if (type === 'user') {
      query = query.or(`and(sender_id.eq.${sessionId},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${sessionId})`);
    } else {
      query = query.eq('group_id', id);
    }
    const { data } = await query.order('created_at', { ascending: true });
    return data || [];
  },

  async sendMessage(payload) {
    const sb = getSupabase();
    if (!sb) {
      const m = { ...payload, id: 'msg_' + Date.now(), created_at: new Date().toISOString(), read: false };
      return m;
    }
    const { data, error } = await sb.from('messages').insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async updateMessage(id, updates) {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from('messages').update(updates).eq('id', id);
  },

  async deleteMessage(id) {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from('messages').delete().eq('id', id);
  },

  async markRead(chatType, chatId, sessionId) {
    const sb = getSupabase();
    if (!sb) return;
    if (chatType === 'user') {
      await sb.from('messages').update({ read: true }).eq('sender_id', chatId).eq('receiver_id', sessionId).eq('read', false);
    } else {
      await sb.from('message_reads').upsert({ message_id: chatId, user_id: sessionId, read_at: new Date().toISOString() });
    }
  },

  // Groups
  async getGroups(userId) {
    const sb = getSupabase();
    if (!sb) return DemoData.groups;
    const { data } = await sb.from('group_members').select('group_id, groups(*)').eq('user_id', userId);
    return (data || []).map(d => d.groups).filter(Boolean);
  },

  async createGroup(name, description, icon, creatorId, memberIds) {
    const sb = getSupabase();
    const g = { name, description, icon, created_by: creatorId, created_at: new Date().toISOString() };
    if (!sb) {
      const newG = { ...g, id: 'g_' + Date.now(), member_ids: [creatorId, ...memberIds] };
      const groups = JSON.parse(localStorage.getItem('pr_groups') || '[]');
      groups.push(newG);
      localStorage.setItem('pr_groups', JSON.stringify(groups));
      return newG;
    }
    const { data: group, error } = await sb.from('groups').insert(g).select().single();
    if (error) throw error;
    const members = [creatorId, ...memberIds].map(uid => ({ group_id: group.id, user_id: uid, role: uid === creatorId ? 'admin' : 'member' }));
    await sb.from('group_members').insert(members);
    return group;
  },

  async deleteGroup(id) {
    const sb = getSupabase();
    if (!sb) {
      const groups = JSON.parse(localStorage.getItem('pr_groups') || '[]').filter(g => g.id !== id);
      localStorage.setItem('pr_groups', JSON.stringify(groups));
      return;
    }
    await sb.from('groups').delete().eq('id', id);
  },

  // Statuses
  async getStatuses() {
    const sb = getSupabase();
    if (!sb) return DemoData.statuses;
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data } = await sb.from('statuses').select('*, users(name, profile_url)').gte('created_at', cutoff).order('created_at', { ascending: false });
    return data || [];
  },

  async createStatus(payload) {
    const sb = getSupabase();
    if (!sb) {
      const s = { ...payload, id: 's_' + Date.now(), created_at: new Date().toISOString() };
      const statuses = JSON.parse(localStorage.getItem('pr_statuses') || '[]');
      statuses.unshift(s);
      localStorage.setItem('pr_statuses', JSON.stringify(statuses));
      return s;
    }
    const { data, error } = await sb.from('statuses').insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async markStatusSeen(statusId, viewerId) {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from('status_views').upsert({ status_id: statusId, viewer_id: viewerId, viewed_at: new Date().toISOString() });
  },

  // Reactions
  async toggleReaction(messageId, userId, emoji) {
    const sb = getSupabase();
    if (!sb) return;
    const { data: existing } = await sb.from('message_reactions').select('id').eq('message_id', messageId).eq('user_id', userId).eq('emoji', emoji).single();
    if (existing) {
      await sb.from('message_reactions').delete().eq('id', existing.id);
      return false;
    } else {
      await sb.from('message_reactions').insert({ message_id: messageId, user_id: userId, emoji });
      return true;
    }
  },

  // Storage / Media
  async uploadMedia(file, sessionId) {
    const sb = getSupabase();
    if (!sb) return URL.createObjectURL(file);
    const ext = file.name.split('.').pop();
    const path = `${sessionId}/${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('media').upload(path, file, { contentType: file.type });
    if (error) throw error;
    const { data: { publicUrl } } = sb.storage.from('media').getPublicUrl(path);
    return publicUrl;
  },

  // Blocked users
  async blockUser(userId, blockedId) {
    const sb = getSupabase();
    if (!sb) {
      const list = JSON.parse(localStorage.getItem('pr_blocked') || '[]');
      if (!list.find(b => b.id === blockedId)) list.push({ id: blockedId, blocked_at: new Date().toISOString() });
      localStorage.setItem('pr_blocked', JSON.stringify(list));
      return;
    }
    await sb.from('blocked_users').upsert({ user_id: userId, blocked_id: blockedId });
  },

  async unblockUser(userId, blockedId) {
    const sb = getSupabase();
    if (!sb) {
      const list = JSON.parse(localStorage.getItem('pr_blocked') || '[]').filter(b => b.id !== blockedId);
      localStorage.setItem('pr_blocked', JSON.stringify(list));
      return;
    }
    await sb.from('blocked_users').delete().eq('user_id', userId).eq('blocked_id', blockedId);
  },
};

// ─── REALTIME ────────────────────────────────────────────────────
const Realtime = {
  _channels: {},

  subscribeMessages(chatType, chatId, sessionId, onMessage) {
    const sb = getSupabase();
    if (!sb) return null;
    const key = `msgs_${chatType}_${chatId}`;
    this.unsubscribe(key);
    const filter = chatType === 'user' ? `receiver_id=eq.${sessionId}` : `group_id=eq.${chatId}`;
    const ch = sb.channel(key)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter }, p => onMessage(p.new))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, p => onMessage(p.new, 'update'))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, p => onMessage(p.old, 'delete'))
      .subscribe();
    this._channels[key] = ch;
    return ch;
  },

  subscribeTyping(chatId, sessionId, onTyping) {
    const sb = getSupabase();
    if (!sb) return null;
    const key = `typing_${chatId}`;
    this.unsubscribe(key);
    const ch = sb.channel(key)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'typing_status', filter: `chat_id=eq.${chatId}` }, p => {
        if (p.new && p.new.user_id !== sessionId) onTyping(p.new.typing, p.new.user_id);
      })
      .subscribe();
    this._channels[key] = ch;
    return ch;
  },

  subscribePresence(userId, onPresence) {
    const sb = getSupabase();
    if (!sb) return null;
    const key = `presence_${userId}`;
    this.unsubscribe(key);
    const ch = sb.channel(key)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` }, p => onPresence(p.new))
      .subscribe();
    this._channels[key] = ch;
    return ch;
  },

  async updateTyping(chatId, userId, isTyping) {
    const sb = getSupabase();
    if (!sb) return;
    await sb.from('typing_status').upsert({ chat_id: chatId, user_id: userId, typing: isTyping, updated_at: new Date().toISOString() });
  },

  unsubscribe(key) {
    if (this._channels[key]) {
      this._channels[key].unsubscribe();
      delete this._channels[key];
    }
  },

  unsubscribeAll() {
    Object.keys(this._channels).forEach(k => this.unsubscribe(k));
  },
};

// ─── NOTIFICATIONS ────────────────────────────────────────────────
const Notifications = {
  async request() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  },

  send(title, body, icon = '💬') {
    if (!Prefs.getKey('notif_msgs')) return;
    if (document.visibilityState === 'visible') return;
    if (Notification.permission !== 'granted') return;
    new Notification(title, { body, icon: '/favicon.ico', badge: '/favicon.ico' });
  },

  playSound() {
    if (!Prefs.getKey('notif_sound')) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  },
};

// ─── UTILITY FUNCTIONS ────────────────────────────────────────────
function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function strColor(s) {
  const palette = ['#00C16A','#58A6FF','#BC8CFF','#FF8C42','#FF4757','#00D4AA','#FFD700','#E040FB'];
  let hash = 0;
  for (const ch of (s || '')) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function ago(seconds) {
  return new Date(Date.now() - seconds * 1000).toISOString();
}

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (now - d < 172800000) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Hoje';
  if (now - d < 172800000) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

function fmtDuration(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function bytesHuman(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function storageSize() {
  let total = 0;
  for (const k in localStorage) {
    if (localStorage.hasOwnProperty(k) && k.startsWith('pr_')) {
      total += (localStorage[k] || '').length * 2;
    }
  }
  return bytesHuman(total);
}

// ─── TOAST ────────────────────────────────────────────────────────
function toast(icon, title, body = '', duration = 4000) {
  let wrap = document.getElementById('toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'toast-wrap';
    wrap.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.style.cssText = 'background:#111820;border:1px solid #1E2A38;border-left:4px solid #00C16A;border-radius:12px;padding:12px 14px;min-width:260px;max-width:340px;display:flex;align-items:flex-start;gap:10px;box-shadow:0 8px 30px rgba(0,0,0,.5);pointer-events:all;cursor:pointer;animation:toastIn .3s ease;transition:all .3s';
  t.innerHTML = `<style>@keyframes toastIn{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}</style>
    <div style="font-size:20px;flex-shrink:0;margin-top:1px">${icon}</div>
    <div>
      <div style="font-size:13px;font-weight:600;color:#E8F0F8">${title}</div>
      ${body ? `<div style="font-size:12px;color:#6B7F94;margin-top:2px">${body}</div>` : ''}
    </div>`;
  t.onclick = () => dismiss(t);
  wrap.appendChild(t);
  const dismiss = (el) => { el.style.opacity = '0'; el.style.transform = 'translateX(30px)'; setTimeout(() => el.remove(), 300); };
  setTimeout(() => dismiss(t), duration);
  return t;
}

// ─── APPLY ACCENT COLOR ───────────────────────────────────────────
function applyAccentColor(color) {
  if (!color) color = Prefs.getKey('accent_color');
  document.documentElement.style.setProperty('--green', color);
  document.documentElement.style.setProperty('--green-dark', shadeColor(color, -20));
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  document.documentElement.style.setProperty('--green-glow', `rgba(${r},${g},${b},0.2)`);
  document.documentElement.style.setProperty('--sent-bg', `rgba(${r},${g},${b},0.07)`);
  document.documentElement.style.setProperty('--sent-border', `rgba(${r},${g},${b},0.2)`);
}

function shadeColor(hex, percent) {
  let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  r = Math.min(255, Math.max(0, r + (r * percent / 100)));
  g = Math.min(255, Math.max(0, g + (g * percent / 100)));
  b = Math.min(255, Math.max(0, b + (b * percent / 100)));
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

// ─── INIT ─────────────────────────────────────────────────────────
// Aplica preferências globais assim que o script carrega
(function initConfig() {
  const prefs = Prefs.get();
  if (prefs.accent_color) applyAccentColor(prefs.accent_color);
})();

// Expõe tudo globalmente para os HTMLs
window.PR = { APP, IS_DEMO, Session, Prefs, Auth, DB, Realtime, Notifications, DemoData, getDemoMessages };
window.PR_UTILS = { getInitials, strColor, esc, ago, fmtTime, fmtDate, fmtDuration, bytesHuman, storageSize, applyAccentColor, toast };
