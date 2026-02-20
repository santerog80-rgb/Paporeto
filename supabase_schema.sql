-- ╔══════════════════════════════════════════════════════════════════╗
-- ║           PapoReto — Supabase Schema Completo                  ║
-- ║   Execute este arquivo no SQL Editor do seu projeto Supabase   ║
-- ║   Project Settings → SQL Editor → New Query → Cole e Execute   ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ─── EXTENSÕES ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUM TYPES ───────────────────────────────────────────────────
CREATE TYPE message_type AS ENUM ('text', 'image', 'video', 'audio', 'file', 'sticker', 'system');
CREATE TYPE call_type     AS ENUM ('voice', 'video');
CREATE TYPE call_status   AS ENUM ('ringing', 'connected', 'ended', 'missed', 'declined', 'busy');
CREATE TYPE member_role   AS ENUM ('admin', 'moderator', 'member');
CREATE TYPE status_type   AS ENUM ('text', 'image', 'video');

-- ─── TABELA: users ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT        NOT NULL,
  email         TEXT        UNIQUE,
  phone         TEXT        UNIQUE,
  bio           TEXT        DEFAULT '',
  profile_url   TEXT,
  online        BOOLEAN     DEFAULT FALSE,
  last_seen     TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'Perfis de utilizadores do PapoReto';

-- Trigger: updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── TABELA: groups ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.groups (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL,
  description TEXT        DEFAULT '',
  icon        TEXT        DEFAULT '👥',
  icon_url    TEXT,
  created_by  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── TABELA: group_members ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_members (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id   UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role       member_role DEFAULT 'member',
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_user ON public.group_members(user_id);
CREATE INDEX idx_group_members_group ON public.group_members(group_id);

-- ─── TABELA: messages ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id   UUID          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID          REFERENCES public.users(id) ON DELETE CASCADE,  -- NULL se for grupo
  group_id    UUID          REFERENCES public.groups(id) ON DELETE CASCADE,  -- NULL se for DM
  content     TEXT          NOT NULL DEFAULT '',
  type        message_type  DEFAULT 'text',
  file_name   TEXT,         -- nome original do ficheiro
  file_size   BIGINT,       -- tamanho em bytes
  reply_to    UUID          REFERENCES public.messages(id) ON DELETE SET NULL,
  edited      BOOLEAN       DEFAULT FALSE,
  deleted     BOOLEAN       DEFAULT FALSE,
  read        BOOLEAN       DEFAULT FALSE,
  created_at  TIMESTAMPTZ   DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   DEFAULT NOW(),
  CONSTRAINT msg_target_check CHECK (
    (receiver_id IS NOT NULL AND group_id IS NULL) OR
    (receiver_id IS NULL AND group_id IS NOT NULL)
  )
);

CREATE INDEX idx_messages_sender    ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver  ON public.messages(receiver_id);
CREATE INDEX idx_messages_group     ON public.messages(group_id);
CREATE INDEX idx_messages_created   ON public.messages(created_at DESC);

CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── TABELA: message_reads (para grupos) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.message_reads (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  read_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- ─── TABELA: message_reactions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji      TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX idx_reactions_message ON public.message_reactions(message_id);

-- ─── TABELA: typing_status ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.typing_status (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id    TEXT        NOT NULL,  -- "user_UUID" ou "group_UUID"
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  typing     BOOLEAN     DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chat_id, user_id)
);

CREATE TRIGGER typing_updated_at
  BEFORE UPDATE ON public.typing_status
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── TABELA: calls ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.calls (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  caller_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id  UUID        REFERENCES public.users(id) ON DELETE CASCADE,  -- NULL se grupo
  group_id     UUID        REFERENCES public.groups(id) ON DELETE CASCADE,
  type         call_type   DEFAULT 'voice',
  status       call_status DEFAULT 'ringing',
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  connected_at TIMESTAMPTZ,
  ended_at     TIMESTAMPTZ,
  duration_sec INTEGER     DEFAULT 0
);

CREATE INDEX idx_calls_caller   ON public.calls(caller_id);
CREATE INDEX idx_calls_receiver ON public.calls(receiver_id);
CREATE INDEX idx_calls_started  ON public.calls(started_at DESC);

-- ─── TABELA: statuses ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.statuses (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       status_type DEFAULT 'text',
  content    TEXT        NOT NULL,
  media_url  TEXT,
  bg_color   TEXT        DEFAULT '#0D2B1A',
  caption    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX idx_statuses_user    ON public.statuses(user_id);
CREATE INDEX idx_statuses_expires ON public.statuses(expires_at);

-- ─── TABELA: status_views ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.status_views (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  status_id  UUID        NOT NULL REFERENCES public.statuses(id) ON DELETE CASCADE,
  viewer_id  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  viewed_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(status_id, viewer_id)
);

-- ─── TABELA: blocked_users ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, blocked_id)
);

-- ─── TABELA: archived_chats ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.archived_chats (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  chat_id    TEXT        NOT NULL,  -- "user_UUID" ou "group_UUID"
  archived   BOOLEAN     DEFAULT TRUE,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, chat_id)
);

-- ─── TABELA: push_tokens ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token       TEXT        NOT NULL UNIQUE,
  platform    TEXT        DEFAULT 'web',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_status   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_views    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_chats  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens     ENABLE ROW LEVEL SECURITY;

-- ── users ──────────────────────────────────────────────────────────
CREATE POLICY "users_select_all"    ON public.users FOR SELECT USING (TRUE);
CREATE POLICY "users_insert_own"    ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own"    ON public.users FOR UPDATE USING (auth.uid() = id);

-- ── groups ─────────────────────────────────────────────────────────
CREATE POLICY "groups_select_member" ON public.groups FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = id AND gm.user_id = auth.uid())
);
CREATE POLICY "groups_insert_auth"  ON public.groups FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "groups_update_admin" ON public.groups FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = id AND gm.user_id = auth.uid() AND gm.role = 'admin')
);
CREATE POLICY "groups_delete_admin" ON public.groups FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = id AND gm.user_id = auth.uid() AND gm.role = 'admin')
);

-- ── group_members ──────────────────────────────────────────────────
CREATE POLICY "gm_select_member" ON public.group_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())
);
CREATE POLICY "gm_insert_admin" ON public.group_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.role = 'admin')
  OR (SELECT created_by FROM public.groups g WHERE g.id = group_id) = auth.uid()
);
CREATE POLICY "gm_delete_self_or_admin" ON public.group_members FOR DELETE USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.role = 'admin')
);

-- ── messages ───────────────────────────────────────────────────────
CREATE POLICY "msg_select" ON public.messages FOR SELECT USING (
  sender_id = auth.uid() OR receiver_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = messages.group_id AND gm.user_id = auth.uid())
);
CREATE POLICY "msg_insert" ON public.messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
);
CREATE POLICY "msg_update_own" ON public.messages FOR UPDATE USING (sender_id = auth.uid());
CREATE POLICY "msg_delete_own" ON public.messages FOR DELETE USING (sender_id = auth.uid());

-- ── message_reactions ──────────────────────────────────────────────
CREATE POLICY "react_select" ON public.message_reactions FOR SELECT USING (TRUE);
CREATE POLICY "react_insert" ON public.message_reactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "react_delete" ON public.message_reactions FOR DELETE USING (user_id = auth.uid());

-- ── typing_status ──────────────────────────────────────────────────
CREATE POLICY "typing_select" ON public.typing_status FOR SELECT USING (TRUE);
CREATE POLICY "typing_upsert" ON public.typing_status FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "typing_update" ON public.typing_status FOR UPDATE USING (user_id = auth.uid());

-- ── calls ──────────────────────────────────────────────────────────
CREATE POLICY "calls_select" ON public.calls FOR SELECT USING (
  caller_id = auth.uid() OR receiver_id = auth.uid()
);
CREATE POLICY "calls_insert" ON public.calls FOR INSERT WITH CHECK (caller_id = auth.uid());
CREATE POLICY "calls_update" ON public.calls FOR UPDATE USING (
  caller_id = auth.uid() OR receiver_id = auth.uid()
);

-- ── statuses ───────────────────────────────────────────────────────
CREATE POLICY "statuses_select"   ON public.statuses FOR SELECT USING (expires_at > NOW());
CREATE POLICY "statuses_insert"   ON public.statuses FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "statuses_delete"   ON public.statuses FOR DELETE USING (user_id = auth.uid());

-- ── status_views ───────────────────────────────────────────────────
CREATE POLICY "sv_select" ON public.status_views FOR SELECT USING (
  viewer_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.statuses s WHERE s.id = status_id AND s.user_id = auth.uid())
);
CREATE POLICY "sv_insert" ON public.status_views FOR INSERT WITH CHECK (viewer_id = auth.uid());

-- ── blocked_users ──────────────────────────────────────────────────
CREATE POLICY "blocked_select" ON public.blocked_users FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "blocked_insert" ON public.blocked_users FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "blocked_delete" ON public.blocked_users FOR DELETE USING (user_id = auth.uid());

-- ── archived_chats ─────────────────────────────────────────────────
CREATE POLICY "archived_select" ON public.archived_chats FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "archived_upsert" ON public.archived_chats FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "archived_update" ON public.archived_chats FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "archived_delete" ON public.archived_chats FOR DELETE USING (user_id = auth.uid());

-- ── push_tokens ────────────────────────────────────────────────────
CREATE POLICY "push_select" ON public.push_tokens FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "push_insert" ON public.push_tokens FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_delete" ON public.push_tokens FOR DELETE USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
-- TRIGGER: Criar perfil de utilizador após auth.users signup
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ═══════════════════════════════════════════════════════════════════
-- FUNCTION: Limpar status expirados (chamar via cron ou manualmente)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION cleanup_expired_statuses()
RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM public.statuses WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════
-- FUNCTION: Contar mensagens não lidas por utilizador
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_unread_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) FROM public.messages
    WHERE receiver_id = p_user_id AND read = FALSE AND deleted = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- (Execute no painel Supabase → Storage → New Bucket)
-- ═══════════════════════════════════════════════════════════════════
-- Bucket: media        (público, max 50MB por ficheiro)
-- Bucket: avatars      (público, max 5MB por ficheiro)
-- Bucket: status-media (público, max 20MB por ficheiro)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('media',        'media',        TRUE, 52428800, ARRAY['image/*','video/*','audio/*','application/pdf','application/zip']),
  ('avatars',      'avatars',      TRUE,  5242880, ARRAY['image/*']),
  ('status-media', 'status-media', TRUE, 20971520, ARRAY['image/*','video/*'])
ON CONFLICT (id) DO NOTHING;

-- RLS para Storage
CREATE POLICY "media_read_all"   ON storage.objects FOR SELECT USING (bucket_id IN ('media','avatars','status-media'));
CREATE POLICY "media_insert_auth" ON storage.objects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND bucket_id IN ('media','avatars','status-media'));
CREATE POLICY "media_delete_own" ON storage.objects FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);

-- ═══════════════════════════════════════════════════════════════════
-- REALTIME — Activar tabelas para tempo real
-- ═══════════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.statuses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;

-- ═══════════════════════════════════════════════════════════════════
-- DADOS DE EXEMPLO (opcional — remova em produção)
-- ═══════════════════════════════════════════════════════════════════
-- Os dados demo são geridos pelo config.js no frontend (DemoData).
-- Em modo Supabase real, os dados são inseridos pelos próprios utilizadores.

-- ─── FIM DO SCHEMA ───────────────────────────────────────────────
-- Versão: 1.0.0 | PapoReto | Compatível com Supabase v2
