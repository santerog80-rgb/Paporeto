# 💬 PapoReto

**A plataforma de mensagens para quem fala direto ao ponto.**

Mensagens em tempo real, grupos, status, chamadas de voz e vídeo — tudo num só lugar, seguro e rápido. Construído com HTML/CSS/JS puro + [Supabase](https://supabase.com) como backend.

---

## 📸 Páginas

| Arquivo | Descrição |
|---|---|
| `index.html` | Landing page / apresentação do produto |
| `login.html` | Entrar na conta |
| `cadastro.html` | Criar conta nova (3 etapas) |
| `chat.html` | Interface principal de chat |
| `grupo.html` | Criar e gerir grupos |
| `status.html` | Publicar e ver stories/status |
| `chamada.html` | Chamadas de voz e vídeo (WebRTC) |
| `perfil.html` | Perfil do utilizador e preferências |
| `configuracoes.html` | Configurações avançadas (Supabase, notificações, privacidade) |
| `config.js` | **Núcleo do sistema** — cliente Supabase, helpers, dados demo |
| `supabase_schema.sql` | Schema completo do banco de dados |

---

## 🚀 Como começar

### Opção A — Modo Demo (sem configuração)

Abra `index.html` num browser. O app funcionará com dados locais fictícios.

**Credenciais de acesso demo:**
```
Email:  demo@paporeto.com
Senha:  123456
```

### Opção B — Supabase Real (produção)

#### 1. Criar projeto Supabase

1. Vá a [supabase.com](https://supabase.com) e crie uma conta gratuita
2. Crie um novo projeto e aguarde o aprovisionamento (~2 minutos)

#### 2. Aplicar o schema

1. No painel do Supabase, vá a **SQL Editor** → **New Query**
2. Cole o conteúdo de `supabase_schema.sql`
3. Clique **Run** (ou `Ctrl+Enter`)

#### 3. Configurar as credenciais

**Via interface (recomendado):**
1. Abra o app no browser
2. Vá a `configuracoes.html` → secção **Conexão**
3. Cole a **URL do projeto** e a **Anon Key**
4. Clique **Guardar config**

**Via `config.js` (para deploy):**
```js
// config.js — linhas 12-13
const SUPABASE_URL    = 'https://SEU_PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

> As credenciais são encontradas em: **Project Settings → API → Project URL** e **anon public**

#### 4. Configurar Storage (para media)

No painel Supabase → **Storage → New Bucket** — os buckets são criados automaticamente pelo SQL, mas se precisar manualmente:

| Bucket | Público | Uso |
|---|---|---|
| `media` | ✅ | Imagens, vídeos, documentos de chat |
| `avatars` | ✅ | Fotos de perfil e ícones de grupo |
| `status-media` | ✅ | Media de stories/status |

#### 5. Activar Realtime

No painel: **Database → Replication → supabase_realtime** — confirme que as tabelas `messages`, `typing_status`, `users`, `statuses`, `calls` estão activas.

---

## 🏗️ Estrutura do Banco de Dados

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│    users    │────<│    messages      │>────│    groups    │
│─────────────│     │──────────────────│     │──────────────│
│ id (uuid)   │     │ id (uuid)        │     │ id (uuid)    │
│ name        │     │ sender_id → users│     │ name         │
│ email       │     │ receiver_id→users│     │ description  │
│ phone       │     │ group_id → groups│     │ icon         │
│ bio         │     │ content          │     │ created_by   │
│ profile_url │     │ type (enum)      │     └──────────────┘
│ online      │     │ read             │           │
│ last_seen   │     │ edited / deleted │     ┌─────────────────┐
└─────────────┘     └──────────────────┘     │  group_members  │
       │                    │                │─────────────────│
       │            ┌───────────────────┐    │ group_id → groups│
       │            │ message_reactions │    │ user_id → users │
       │            │─────────────────  │    │ role (enum)     │
       │            │ message_id        │    └─────────────────┘
       │            │ user_id → users   │
       │            │ emoji             │
       │            └───────────────────┘
       │
  ┌────────────┐     ┌──────────────────┐     ┌──────────────────┐
  │  statuses  │     │  typing_status   │     │     calls        │
  │────────────│     │──────────────────│     │──────────────────│
  │ user_id    │     │ chat_id (text)   │     │ caller_id → users│
  │ type (enum)│     │ user_id → users  │     │ receiver_id      │
  │ content    │     │ typing (bool)    │     │ type (voice/video)│
  │ bg_color   │     └──────────────────│     │ status (enum)    │
  │ expires_at │                        │     │ duration_sec     │
  └────────────┘                        │     └──────────────────┘
```

### Tabelas completas

| Tabela | Descrição |
|---|---|
| `users` | Perfis de utilizadores |
| `groups` | Grupos de chat |
| `group_members` | Membros dos grupos (com role: admin/moderator/member) |
| `messages` | Mensagens de DM e grupos |
| `message_reads` | Leitura de mensagens em grupos |
| `message_reactions` | Reações emoji às mensagens |
| `typing_status` | Estado "a digitar..." em tempo real |
| `calls` | Histórico de chamadas de voz e vídeo |
| `statuses` | Stories/status (expiram em 24h) |
| `status_views` | Quem viu cada status |
| `blocked_users` | Utilizadores bloqueados |
| `archived_chats` | Conversas arquivadas |
| `push_tokens` | Tokens para notificações push |

---

## ⚙️ config.js — API de Referência

O ficheiro `config.js` exporta tudo via `window.PR` e `window.PR_UTILS`.

### `PR.Session`
```js
PR.Session.get()           // Retorna a sessão atual ou null
PR.Session.set(data)       // Guarda sessão no localStorage
PR.Session.clear()         // Remove a sessão
PR.Session.require(url)    // Retorna sessão ou redireciona para url
```

### `PR.Prefs`
```js
PR.Prefs.get()             // Retorna todas as preferências (com defaults)
PR.Prefs.set({ key: val }) // Merge e guarda preferências
PR.Prefs.getKey('notif_msgs') // Retorna preferência individual
PR.Prefs.setKey('theme', 'dark')
```

### `PR.Auth`
```js
await PR.Auth.signUp(email, password, name, phone) // Criar conta
await PR.Auth.signIn(email, password)               // Entrar
await PR.Auth.signOut()                             // Sair (limpa sessão e redireciona)
await PR.Auth.resetPassword(email)                  // Recuperar senha
```

### `PR.DB`
```js
// Utilizadores
await PR.DB.getUsers(excludeId)
await PR.DB.getUser(id)
await PR.DB.updateUser(id, { name, bio, phone })
await PR.DB.updatePresence(id, online)

// Mensagens
await PR.DB.getMessages(type, chatId, sessionId) // type = 'user' | 'group'
await PR.DB.sendMessage({ sender_id, content, type, receiver_id? , group_id? })
await PR.DB.updateMessage(id, { content, edited: true })
await PR.DB.deleteMessage(id)
await PR.DB.markRead(chatType, chatId, sessionId)

// Grupos
await PR.DB.getGroups(userId)
await PR.DB.createGroup(name, description, icon, creatorId, memberIds)
await PR.DB.deleteGroup(id)

// Status
await PR.DB.getStatuses()
await PR.DB.createStatus({ user_id, type, content, bg_color })
await PR.DB.markStatusSeen(statusId, viewerId)

// Reações
await PR.DB.toggleReaction(messageId, userId, emoji) // retorna true se adicionado

// Media
await PR.DB.uploadMedia(file, sessionId) // retorna URL pública

// Bloqueios
await PR.DB.blockUser(userId, blockedId)
await PR.DB.unblockUser(userId, blockedId)
```

### `PR.Realtime`
```js
PR.Realtime.subscribeMessages(type, chatId, sessionId, onMessage)
PR.Realtime.subscribeTyping(chatId, sessionId, onTyping)
PR.Realtime.subscribePresence(userId, onPresence)
await PR.Realtime.updateTyping(chatId, userId, isTyping)
PR.Realtime.unsubscribe(key)
PR.Realtime.unsubscribeAll()
```

### `PR.Notifications`
```js
await PR.Notifications.request()    // Pede permissão ao browser
PR.Notifications.send(title, body)  // Envia notificação (se app não estiver em foco)
PR.Notifications.playSound()        // Toca som de notificação via WebAudio API
```

### `PR_UTILS`
```js
PR_UTILS.getInitials(name)     // 'João Machava' → 'JM'
PR_UTILS.strColor(str)         // hash → cor hex consistente
PR_UTILS.esc(str)              // escape HTML
PR_UTILS.ago(seconds)          // Data no passado (para dados demo)
PR_UTILS.fmtTime(iso)          // 'Hoje 14:30' / 'Ontem' / '12/03'
PR_UTILS.fmtDate(iso)          // 'Hoje' / 'Ontem' / 'Terça-feira, 12 de março'
PR_UTILS.fmtDuration(seconds)  // 180 → '03:00'
PR_UTILS.bytesHuman(bytes)     // 1500 → '1.5 KB'
PR_UTILS.storageSize()         // Tamanho total do localStorage pr_*
PR_UTILS.applyAccentColor(hex) // Aplica cor de destaque globalmente
PR_UTILS.toast(icon, title, body) // Mostra notificação na interface
```

### `loadSupabaseSDK(callback)`
Carrega o SDK do Supabase via CDN e chama o callback quando pronto.
```js
loadSupabaseSDK((sb) => {
  // sb é o cliente Supabase ou null em modo demo
  const client = PR.getSupabase(); // alternativa
});
```

---

## 🔒 Segurança (RLS)

Todas as tabelas têm **Row Level Security** activado. As políticas garantem:

- Utilizadores só leem/escrevem os seus próprios dados
- Mensagens de DM só são visíveis para remetente e destinatário
- Mensagens de grupo só são visíveis para membros do grupo
- Status expirados são automaticamente filtrados
- Bloqueios são privados por utilizador

---

## 📡 Tempo Real

O PapoReto usa **Supabase Realtime** (WebSocket) para:

- ✅ Novas mensagens (INSERT em `messages`)
- ✅ Mensagens editadas/apagadas (UPDATE/DELETE)
- ✅ Indicador "a digitar..." (UPDATE em `typing_status`)
- ✅ Presença online/offline (UPDATE em `users`)
- ✅ Novos status (INSERT em `statuses`)
- ✅ Reações (INSERT em `message_reactions`)

---

## 📞 Chamadas (WebRTC)

A página `chamada.html` demonstra a interface de chamadas. Para chamadas reais entre utilizadores é necessário:

1. **Servidor de sinalização** — o Supabase Realtime pode ser usado para trocar SDP/ICE candidates
2. **STUN/TURN server** — para atravessar NAT (ex: [Twilio STUN/TURN](https://www.twilio.com/stun-turn) ou [Coturn](https://github.com/coturn/coturn))
3. **`getUserMedia()`** — já implementado na demo para câmera e microfone

---

## 🚢 Deploy

### GitHub Pages (estático)
```bash
# Coloque todos os ficheiros num repositório público
# Vá a Settings → Pages → Source: main branch /root
```

### Netlify / Vercel
```bash
# Arraste a pasta com todos os ficheiros para netlify.com/drop
# ou conecte o repositório GitHub
```

### Self-hosted
Qualquer servidor HTTP estático serve (Nginx, Apache, Caddy).

> **Nota:** Não é necessário Node.js, PHP ou qualquer backend próprio. O Supabase serve como backend completo.

---

## 🌍 Suporte Internacional de Telefones

O formulário de registo suporta:

| País | Código | Formato |
|---|---|---|
| 🇲🇿 Moçambique | +258 | 9 dígitos (84/85/86/87) |
| 🇿🇦 África do Sul | +27 | 9-10 dígitos |
| 🇵🇹 Portugal | +351 | 9 dígitos |
| 🇧🇷 Brasil | +55 | 10-11 dígitos |
| 🇺🇸 EUA/Canadá | +1 | 10 dígitos |
| 🇦🇴 Angola | +244 | 9 dígitos |
| 🇨🇻 Cabo Verde | +238 | 7 dígitos |
| 🇬🇧 Reino Unido | +44 | 10 dígitos |

---

## 🛠️ Tecnologias

| Tecnologia | Uso |
|---|---|
| **HTML5 / CSS3** | Interface, animações, layouts responsive |
| **JavaScript ES2022** | Lógica de negócio, async/await |
| **Supabase** | Auth, PostgreSQL, Storage, Realtime |
| **WebRTC** | Chamadas de voz e vídeo peer-to-peer |
| **Web Notifications API** | Notificações do browser |
| **Web Audio API** | Sons de notificação |
| **Sora** (Google Fonts) | Tipografia principal |
| **Space Mono** (Google Fonts) | Dados técnicos, timestamps |

---

## 🗂️ Estrutura de Ficheiros

```
paporeto/
├── config.js              ← NÚCLEO: Supabase, helpers, dados demo
├── supabase_schema.sql    ← Schema completo do banco de dados
├── README.md              ← Esta documentação
│
├── index.html             ← Landing page
├── login.html             ← Autenticação
├── cadastro.html          ← Registo de nova conta
├── chat.html              ← Interface principal de mensagens
├── grupo.html             ← Gestão de grupos
├── status.html            ← Stories / Status (24h)
├── chamada.html           ← Chamadas de voz e vídeo
├── perfil.html            ← Perfil do utilizador
└── configuracoes.html     ← Configurações avançadas
```

---

## 🐛 Resolução de Problemas

**"Supabase não configurado" / modo demo activo mas não quero**
→ Verifique as credenciais em `configuracoes.html` → Conexão → teste a ligação

**Mensagens não aparecem em tempo real**
→ Vá ao painel Supabase → Database → Replication → verifique se `messages` está na publicação `supabase_realtime`

**Erro de CORS nas chamadas à API**
→ No painel Supabase → Settings → API → adicione o seu domínio em "Additional Allowed Origins"

**Upload de media não funciona**
→ Verifique se os buckets `media`, `avatars`, `status-media` existem e têm as políticas de storage corretas

**"JWT expired" / token expirado**
→ O `autoRefreshToken: true` no config.js trata disso automaticamente. Se persistir, o utilizador precisa fazer login novamente.

---

## 📄 Licença

MIT — Livre para uso pessoal e comercial.

---

*PapoReto v1.0.0 — Feito com ❤️ para quem fala direto ao ponto.*
