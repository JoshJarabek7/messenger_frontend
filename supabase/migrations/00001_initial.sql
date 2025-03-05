-- ChatGenius Database Schema

-- Enable pgvector extension for embedding support
CREATE EXTENSION IF NOT EXISTS "vector";

-- USER MANAGEMENT TABLES
CREATE TABLE "public"."users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "username" TEXT NOT NULL UNIQUE,
  "display_name" TEXT,
  "avatar_url" TEXT,
  "bio" TEXT,
  "status" TEXT DEFAULT 'offline', -- 'online', 'offline', 'away'
  "last_seen" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "ai_persona_prompt" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "username_format" CHECK (username ~* '^[a-z0-9_]{3,20}$')
);

CREATE UNIQUE INDEX users_username_idx ON "public"."users" USING btree ("username");
CREATE UNIQUE INDEX users_email_idx ON "public"."users" USING btree ("email");

-- ORGANIZATION TABLES
CREATE TABLE "public"."organizations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "avatar_url" TEXT,
  "owner_id" UUID NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "slug_format" CHECK (slug ~* '^[a-z0-9-]{3,30}$'),
  CONSTRAINT fk_owner FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX organizations_slug_idx ON "public"."organizations" USING btree ("slug");

CREATE TABLE "public"."organization_members" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT fk_organization FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
  CONSTRAINT unique_org_user UNIQUE ("organization_id", "user_id")
);

CREATE INDEX organization_members_user_id_idx ON "public"."organization_members" USING btree ("user_id");
CREATE INDEX organization_members_organization_id_idx ON "public"."organization_members" USING btree ("organization_id");

-- CHANNEL TABLES
CREATE TABLE "public"."channels" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "organization_id" UUID NOT NULL,
  "is_public" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT fk_organization FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
  CONSTRAINT unique_channel_slug_per_org UNIQUE ("organization_id", "slug"),
  CONSTRAINT "channel_slug_format" CHECK (slug ~* '^[a-z0-9-]{2,30}$')
);

CREATE INDEX channels_organization_id_idx ON "public"."channels" USING btree ("organization_id");

-- DIRECT MESSAGE TABLES
CREATE TABLE "public"."direct_message_conversations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL, -- Add organization reference to make DMs org-specific
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT fk_organization FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE
);

CREATE TABLE "public"."direct_message_participants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "conversation_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT fk_conversation FOREIGN KEY ("conversation_id") REFERENCES "public"."direct_message_conversations"("id") ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
  CONSTRAINT unique_conversation_user UNIQUE ("conversation_id", "user_id")
);

CREATE INDEX direct_message_participants_conversation_id_idx ON "public"."direct_message_participants" USING btree ("conversation_id");
CREATE INDEX direct_message_participants_user_id_idx ON "public"."direct_message_participants" USING btree ("user_id");

-- MESSAGE TABLES
CREATE TABLE "public"."messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "content" TEXT NOT NULL,
  "sender_id" UUID NOT NULL,
  "channel_id" UUID,
  "conversation_id" UUID,
  "parent_message_id" UUID, -- For threads
  "is_ai_generated" BOOLEAN NOT NULL DEFAULT false,
  "content_embedding" vector(1536), -- For OpenAI text-embedding-3-large
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT fk_sender FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
  CONSTRAINT fk_channel FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE CASCADE,
  CONSTRAINT fk_conversation FOREIGN KEY ("conversation_id") REFERENCES "public"."direct_message_conversations"("id") ON DELETE CASCADE,
  CONSTRAINT fk_parent_message FOREIGN KEY ("parent_message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE,
  CONSTRAINT channel_or_conversation CHECK (
    (channel_id IS NOT NULL AND conversation_id IS NULL) OR
    (channel_id IS NULL AND conversation_id IS NOT NULL)
  )
);

CREATE INDEX messages_channel_id_idx ON "public"."messages" USING btree ("channel_id");
CREATE INDEX messages_conversation_id_idx ON "public"."messages" USING btree ("conversation_id");
CREATE INDEX messages_parent_message_id_idx ON "public"."messages" USING btree ("parent_message_id");
CREATE INDEX messages_sender_id_idx ON "public"."messages" USING btree ("sender_id");
CREATE INDEX messages_content_embedding_idx ON "public"."messages" USING ivfflat (content_embedding vector_cosine_ops);

-- FILE ATTACHMENTS
CREATE TABLE "public"."file_attachments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "message_id" UUID NOT NULL,
  "file_path" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_type" TEXT NOT NULL,
  "file_size" BIGINT NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT fk_message FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE
);

CREATE INDEX file_attachments_message_id_idx ON "public"."file_attachments" USING btree ("message_id");

-- REACTIONS
CREATE TABLE "public"."reactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "message_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "emoji" TEXT NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT fk_message FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
  CONSTRAINT unique_user_reaction_per_message UNIQUE ("message_id", "user_id", "emoji")
);

CREATE INDEX reactions_message_id_idx ON "public"."reactions" USING btree ("message_id");

-- ORGANIZATION AND CHANNEL EMBEDDINGS FOR SEARCH
CREATE TABLE "public"."organization_embeddings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "content" TEXT NOT NULL, -- Combined name + description + other metadata
  "embedding" vector(1536), -- For OpenAI text-embedding-3-large
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT fk_organization FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE
);

CREATE INDEX organization_embeddings_embedding_idx ON "public"."organization_embeddings" USING ivfflat (embedding vector_cosine_ops);

CREATE TABLE "public"."channel_embeddings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "channel_id" UUID NOT NULL,
  "content" TEXT NOT NULL, -- Combined name + description + other metadata
  "embedding" vector(1536), -- For OpenAI text-embedding-3-large
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT fk_channel FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE CASCADE
);

CREATE INDEX channel_embeddings_embedding_idx ON "public"."channel_embeddings" USING ivfflat (embedding vector_cosine_ops);

-- NOTIFICATIONS
CREATE TABLE "public"."notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "type" TEXT NOT NULL, -- 'mention', 'reaction', 'new_message', etc.
  "message_id" UUID,
  "sender_id" UUID,
  "channel_id" UUID,
  "conversation_id" UUID,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT fk_user FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
  CONSTRAINT fk_message FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE,
  CONSTRAINT fk_sender FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE SET NULL,
  CONSTRAINT fk_channel FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE CASCADE,
  CONSTRAINT fk_conversation FOREIGN KEY ("conversation_id") REFERENCES "public"."direct_message_conversations"("id") ON DELETE CASCADE
);

CREATE INDEX notifications_user_id_idx ON "public"."notifications" USING btree ("user_id");

-- Create table for user embeddings for vector search
CREATE TABLE "public"."user_embeddings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "content" TEXT NOT NULL, -- Combined username, display_name, bio, etc.
  "embedding" vector(1536), -- For OpenAI text-embedding-3-large
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT fk_user FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
);

CREATE INDEX user_embeddings_embedding_idx ON "public"."user_embeddings" USING ivfflat (embedding vector_cosine_ops);
CREATE UNIQUE INDEX user_embeddings_user_id_idx ON "public"."user_embeddings" (user_id);

-- RLS POLICIES
-- Enable Row Level Security
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."channels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."direct_message_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."direct_message_participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."file_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."reactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."organization_embeddings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."channel_embeddings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_embeddings" ENABLE ROW LEVEL SECURITY;

-- Enable maximum broadcast capability for realtime subscriptions
-- First create the publication if it doesn't exist with ALL tables and for ALL operations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_catalog.pg_publication 
    WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime FOR ALL TABLES WITH (publish = 'insert,update,delete');
  ELSE
    -- Make sure the existing publication is set to ALL operations
    ALTER PUBLICATION supabase_realtime SET (publish = 'insert,update,delete');
    
    -- Make sure all tables are added to the publication
    -- This might error out if tables are already in the publication, but that's okay
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE ' || 
        string_agg(quote_ident(schemaname) || '.' || quote_ident(tablename), ', ') 
      FROM pg_tables 
      WHERE schemaname = 'public';
    EXCEPTION WHEN OTHERS THEN 
      RAISE NOTICE 'Tables might already be in publication, continuing...';
    END;
  END IF;
END
$$;

-- Make sure the schema config has realtime enabled for ALL tables
COMMENT ON TABLE "public"."users" IS E'@supabase.enable_realtime=true';
COMMENT ON TABLE "public"."channels" IS E'@supabase.enable_realtime=true';
COMMENT ON TABLE "public"."direct_message_participants" IS E'@supabase.enable_realtime=true';
COMMENT ON TABLE "public"."direct_message_conversations" IS E'@supabase.enable_realtime=true';
COMMENT ON TABLE "public"."messages" IS E'@supabase.enable_realtime=true';
COMMENT ON TABLE "public"."reactions" IS E'@supabase.enable_realtime=true';
COMMENT ON TABLE "public"."organizations" IS E'@supabase.enable_realtime=true';
COMMENT ON TABLE "public"."organization_members" IS E'@supabase.enable_realtime=true';
COMMENT ON TABLE "public"."notifications" IS E'@supabase.enable_realtime=true';
COMMENT ON TABLE "public"."file_attachments" IS E'@supabase.enable_realtime=true';
COMMENT ON TABLE "public"."organization_embeddings" IS E'@supabase.enable_realtime=true';
COMMENT ON TABLE "public"."channel_embeddings" IS E'@supabase.enable_realtime=true';
COMMENT ON TABLE "public"."user_embeddings" IS E'@supabase.enable_realtime=true';

-- Ultra-permissive RLS policies for demo purposes
-- Users table policies
CREATE POLICY "Unrestricted access to users" ON "public"."users" USING (true);
CREATE POLICY "Anyone can select users" ON "public"."users" FOR SELECT USING (true);
CREATE POLICY "Anyone can insert users" ON "public"."users" FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update users" ON "public"."users" FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete users" ON "public"."users" FOR DELETE USING (true);
CREATE POLICY "Service can insert users" ON "public"."users" FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Anonymous can insert users" ON "public"."users" FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Organizations policies
CREATE POLICY "Anyone can select organizations" ON "public"."organizations" FOR SELECT USING (true);
CREATE POLICY "Anyone can insert organizations" ON "public"."organizations" FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update organizations" ON "public"."organizations" FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete organizations" ON "public"."organizations" FOR DELETE USING (true);

-- Channels policies
CREATE POLICY "Anyone can select channels" ON "public"."channels" FOR SELECT USING (true);
CREATE POLICY "Anyone can insert channels" ON "public"."channels" FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update channels" ON "public"."channels" FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete channels" ON "public"."channels" FOR DELETE USING (true);

-- Organization members policies
CREATE POLICY "Anyone can select org_members" ON "public"."organization_members" FOR SELECT USING (true);
CREATE POLICY "Anyone can insert org_members" ON "public"."organization_members" FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update org_members" ON "public"."organization_members" FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete org_members" ON "public"."organization_members" FOR DELETE USING (true);

-- Direct message conversations policies
CREATE POLICY "Anyone can select conversations" ON "public"."direct_message_conversations" FOR SELECT USING (true);
CREATE POLICY "Anyone can insert conversations" ON "public"."direct_message_conversations" FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update conversations" ON "public"."direct_message_conversations" FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete conversations" ON "public"."direct_message_conversations" FOR DELETE USING (true);

-- Direct message participants policies
CREATE POLICY "Anyone can select participants" ON "public"."direct_message_participants" FOR SELECT USING (true);
CREATE POLICY "Anyone can insert participants" ON "public"."direct_message_participants" FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update participants" ON "public"."direct_message_participants" FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete participants" ON "public"."direct_message_participants" FOR DELETE USING (true);

-- Messages policies
CREATE POLICY "Anyone can select messages" ON "public"."messages" FOR SELECT USING (true);
CREATE POLICY "Anyone can insert messages" ON "public"."messages" FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update messages" ON "public"."messages" FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete messages" ON "public"."messages" FOR DELETE USING (true);

-- Notifications policies
CREATE POLICY "Anyone can select notifications" ON "public"."notifications" FOR SELECT USING (true);
CREATE POLICY "Anyone can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update notifications" ON "public"."notifications" FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete notifications" ON "public"."notifications" FOR DELETE USING (true);

-- File attachments policies
CREATE POLICY "Anyone can select file_attachments" ON "public"."file_attachments" FOR SELECT USING (true);
CREATE POLICY "Anyone can insert file_attachments" ON "public"."file_attachments" FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update file_attachments" ON "public"."file_attachments" FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete file_attachments" ON "public"."file_attachments" FOR DELETE USING (true);

-- Reactions policies
CREATE POLICY "Anyone can select reactions" ON "public"."reactions" FOR SELECT USING (true);
CREATE POLICY "Anyone can insert reactions" ON "public"."reactions" FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update reactions" ON "public"."reactions" FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete reactions" ON "public"."reactions" FOR DELETE USING (true);

-- Embedding policies (organization)
CREATE POLICY "Anyone can select org_embeddings" ON "public"."organization_embeddings" FOR SELECT USING (true);
CREATE POLICY "Anyone can insert org_embeddings" ON "public"."organization_embeddings" FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update org_embeddings" ON "public"."organization_embeddings" FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete org_embeddings" ON "public"."organization_embeddings" FOR DELETE USING (true);

-- Embedding policies (channel)
CREATE POLICY "Anyone can select channel_embeddings" ON "public"."channel_embeddings" FOR SELECT USING (true);
CREATE POLICY "Anyone can insert channel_embeddings" ON "public"."channel_embeddings" FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update channel_embeddings" ON "public"."channel_embeddings" FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete channel_embeddings" ON "public"."channel_embeddings" FOR DELETE USING (true);

-- Embedding policies (user)
CREATE POLICY "Anyone can select user_embeddings" ON "public"."user_embeddings" FOR SELECT USING (true);
CREATE POLICY "Anyone can insert user_embeddings" ON "public"."user_embeddings" FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update user_embeddings" ON "public"."user_embeddings" FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete user_embeddings" ON "public"."user_embeddings" FOR DELETE USING (true);

-- FUNCTIONS & TRIGGERS

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update timestamp triggers
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON "public"."users"
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON "public"."organizations"
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_channels_updated_at
BEFORE UPDATE ON "public"."channels"
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON "public"."messages"
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to automatically create owner as member when creating org
CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add the owner, not every user
  INSERT INTO "public"."organization_members" (organization_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER add_owner_as_member_trigger
AFTER INSERT ON "public"."organizations"
FOR EACH ROW EXECUTE FUNCTION add_owner_as_member();

-- Function to update user status on sign-in and create profile if needed
CREATE OR REPLACE FUNCTION update_user_status_on_signin()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user exists in public.users
  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    -- Update existing user
    UPDATE public.users
    SET status = 'online', last_seen = now()
    WHERE id = NEW.id;
  ELSE
    -- Insert new user record if it doesn't exist
    INSERT INTO public.users (id, email, username, status, last_seen)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
      'online',
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for auth.users to update status on sign in
CREATE TRIGGER update_user_status_on_signin_trigger
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION update_user_status_on_signin();

-- Function to handle message mentions
CREATE OR REPLACE FUNCTION process_message_mentions()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_user RECORD;
  mention_pattern TEXT;
  mention_matches RECORD;
BEGIN
  -- Find all @username mentions in the message
  mention_pattern := '@([a-zA-Z0-9_]{3,20})';
  
  -- Using regexp_matches with the 'g' flag can cause issues
  -- Instead, use a cursor-based approach to find all mentions
  FOR mention_matches IN SELECT (regexp_matches(NEW.content, mention_pattern, 'g'))[1] AS username LOOP
    -- Find the mentioned user
    SELECT * INTO mentioned_user FROM "public"."users"
    WHERE username = mention_matches.username;
    
    -- If user exists, create notification
    IF mentioned_user.id IS NOT NULL THEN
      INSERT INTO "public"."notifications" (
        user_id, type, message_id, sender_id, 
        channel_id, conversation_id
      )
      VALUES (
        mentioned_user.id, 'mention', NEW.id, NEW.sender_id, 
        NEW.channel_id, NEW.conversation_id
      );
      
      -- If user is offline and not AI-generated message, trigger AI response
      -- Implementation will be added with Edge Functions
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER process_message_mentions_trigger
AFTER INSERT ON "public"."messages"
FOR EACH ROW EXECUTE FUNCTION process_message_mentions();

-- Create the auth schema if it doesn't exist yet (for non-Supabase environments)
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
$$ LANGUAGE SQL STABLE;

-- Before deleting a message that might be a parent, handle its child messages
CREATE OR REPLACE FUNCTION before_delete_message()
RETURNS TRIGGER AS $$
BEGIN
  -- If any child messages reference this message as parent, 
  -- set their parent_message_id to NULL instead of deleting them
  UPDATE public.messages
  SET parent_message_id = NULL
  WHERE parent_message_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before message deletion
CREATE TRIGGER before_delete_message_trigger
BEFORE DELETE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION before_delete_message();

-- Function to check channel slug availability
CREATE OR REPLACE FUNCTION check_channel_slug_availability(org_id UUID, channel_slug TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.channels 
    WHERE organization_id = org_id AND slug = channel_slug
  );
END;
$$;

-- Create a function to delete an organization by its ID
CREATE OR REPLACE FUNCTION delete_organization(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  success BOOLEAN;
BEGIN
  -- Delete the organization
  DELETE FROM public.organizations WHERE id = org_id;
  GET DIAGNOSTICS success = ROW_COUNT;
  
  RETURN success > 0;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting organization: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Create a function to directly delete conversations with proper error handling
CREATE OR REPLACE FUNCTION delete_direct_message_conversation(conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  success BOOLEAN;
BEGIN
  -- Since we've set up CASCADE DELETE, we only need to delete the conversation
  -- and all related records will be automatically deleted
  DELETE FROM public.direct_message_conversations WHERE id = conversation_id;
  GET DIAGNOSTICS success = ROW_COUNT;
  
  RETURN success > 0;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting conversation: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Create a function to delete a user with all their data
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  success BOOLEAN;
BEGIN
  -- Since we've set up CASCADE DELETE, we only need to delete the user
  -- and all related records will be automatically deleted
  DELETE FROM public.users WHERE id = user_id;
  GET DIAGNOSTICS success = ROW_COUNT;
  
  RETURN success > 0;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting user: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Channel delete function
CREATE OR REPLACE FUNCTION delete_channel(channel_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  success BOOLEAN;
BEGIN
  -- Since we've set up CASCADE DELETE, we only need to delete the channel
  -- and all related records will be automatically deleted
  DELETE FROM public.channels WHERE id = channel_id;
  GET DIAGNOSTICS success = ROW_COUNT;
  
  RETURN success > 0;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting channel: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Delete message function with cascading
CREATE OR REPLACE FUNCTION delete_message(message_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  success BOOLEAN;
BEGIN
  -- Since we've set up CASCADE DELETE, we only need to delete the message
  -- and all related records will be automatically deleted
  DELETE FROM public.messages WHERE id = message_id;
  GET DIAGNOSTICS success = ROW_COUNT;
  
  RETURN success > 0;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting message: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Function to add a reaction with proper RLS handling
CREATE OR REPLACE FUNCTION add_reaction(
  message_id_input UUID,
  user_id_input UUID,
  emoji_input TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  reaction_id UUID;
BEGIN
  -- Insert the reaction
  INSERT INTO public.reactions (message_id, user_id, emoji)
  VALUES (message_id_input, user_id_input, emoji_input)
  RETURNING id INTO reaction_id;
  
  RETURN reaction_id;
EXCEPTION
  WHEN unique_violation THEN
    -- If the reaction already exists, just return null
    RETURN null;
END;
$$;

-- Function to delete a reaction with proper RLS handling
CREATE OR REPLACE FUNCTION delete_reaction(
  reaction_id UUID,
  user_id_input UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  deleted BOOLEAN;
BEGIN
  -- Delete the reaction but only if it belongs to the user
  WITH deleted_rows AS (
    DELETE FROM public.reactions
    WHERE id = reaction_id AND user_id = user_id_input
    RETURNING *
  )
  SELECT EXISTS (SELECT 1 FROM deleted_rows) INTO deleted;
  
  RETURN deleted;
END;
$$;

-- Function for direct SQL execution (for admin operations)
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS void AS $$
BEGIN
  EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search for users using their embeddings
CREATE OR REPLACE FUNCTION search_users(
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int,
  organization_id uuid
)
RETURNS TABLE (
  id uuid,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First check if we even have any user embeddings
  IF NOT EXISTS (SELECT 1 FROM user_embeddings LIMIT 1) THEN
    -- Return empty result if no embeddings exist
    RETURN;
  END IF;

  -- Execute the vector search only if we have embeddings
  RETURN QUERY
  SELECT
    u.id,
    CASE 
      WHEN ue.embedding IS NULL THEN 0 -- Fallback if embedding is NULL
      ELSE 1 - (ue.embedding <=> query_embedding) -- Calculate similarity
    END as similarity
  FROM
    organization_members om
  JOIN
    users u ON om.user_id = u.id
  LEFT JOIN
    user_embeddings ue ON u.id = ue.user_id
  WHERE
    om.organization_id = organization_id AND -- Only users within this organization
    (
      -- Include results even if embedding is NULL to avoid empty results
      (ue.embedding IS NULL) OR
      (1 - (ue.embedding <=> query_embedding) > similarity_threshold)
    )
  ORDER BY
    similarity DESC
  LIMIT
    match_count;
END;
$$;

-- Function to search for organizations using their embeddings
CREATE OR REPLACE FUNCTION search_organizations(
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First check if we even have any embeddings
  IF NOT EXISTS (SELECT 1 FROM organization_embeddings LIMIT 1) THEN
    -- Return empty result if no embeddings exist
    RETURN;
  END IF;

  -- Execute the vector search only if we have embeddings
  RETURN QUERY
  SELECT
    o.id,
    CASE 
      WHEN oe.embedding IS NULL THEN 0 -- Fallback if embedding is NULL
      ELSE 1 - (oe.embedding <=> query_embedding) -- Calculate similarity
    END as similarity
  FROM
    organizations o
  LEFT JOIN
    organization_embeddings oe ON o.id = oe.organization_id
  WHERE
    -- Include results even if embedding is NULL to avoid empty results
    (oe.embedding IS NULL) OR
    (1 - (oe.embedding <=> query_embedding) > similarity_threshold)
  ORDER BY
    similarity DESC
  LIMIT
    match_count;
END;
$$;

-- Use individual grant statements instead of DO block for permissions
-- Grant schema usage
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant table privileges
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant sequence privileges
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant function privileges
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;

-- Skip explicit vector extension grants as this seems to cause issues
-- The functions and objects needed will be accessible anyway through the 
-- ALL PRIVILEGES grants above

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true);

-- Set security policy for the attachments bucket
CREATE POLICY "Allow public access to attachments" ON storage.objects
FOR SELECT USING (bucket_id = 'attachments');

-- Allow any authenticated user to upload attachments
CREATE POLICY "Allow authenticated users to upload attachments" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');

-- For demo purposes, allow all updates and deletes to make testing easier
CREATE POLICY "Allow updates to attachments" ON storage.objects
FOR UPDATE USING (bucket_id = 'attachments');

CREATE POLICY "Allow deletes to attachments" ON storage.objects
FOR DELETE USING (bucket_id = 'attachments');