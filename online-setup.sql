-- Online Multiplayer Setup for Math Duel

-- Drop existing policies and tables to recreate
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can insert their profile" ON users;
DROP POLICY IF EXISTS "Users can update their profile" ON users;
DROP POLICY IF EXISTS "Users can view invitations involving them" ON game_invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON game_invitations;
DROP POLICY IF EXISTS "Users can update invitations they received" ON game_invitations;

-- Drop existing tables
DROP TABLE IF EXISTS game_invitations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table for player profiles
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_invitations table for direct game requests
CREATE TABLE IF NOT EXISTS game_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, expired
    room_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes')
);

-- Update game_rooms table to include usernames
ALTER TABLE game_rooms 
ADD COLUMN IF NOT EXISTS player1_username TEXT,
ADD COLUMN IF NOT EXISTS player2_username TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);
CREATE INDEX IF NOT EXISTS idx_game_invitations_from_user ON game_invitations(from_user_id);
CREATE INDEX IF NOT EXISTS idx_game_invitations_to_user ON game_invitations(to_user_id);
CREATE INDEX IF NOT EXISTS idx_game_invitations_status ON game_invitations(status);

-- Enable RLS for new tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_invitations ENABLE ROW LEVEL SECURITY;

-- Simple policies without UUID comparison
CREATE POLICY "Users can view all users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their profile" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their profile" ON users
    FOR UPDATE USING (true);

CREATE POLICY "Users can view invitations" ON game_invitations
    FOR SELECT USING (true);

CREATE POLICY "Users can create invitations" ON game_invitations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update invitations" ON game_invitations
    FOR UPDATE USING (true);

-- Function to update user online status
CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen = NOW();
    NEW.is_online = true;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update user activity (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        CREATE TRIGGER update_user_activity_trigger
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_user_activity();
    END IF;
END $$;

-- Function to mark users as offline after inactivity
CREATE OR REPLACE FUNCTION mark_offline_users()
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET is_online = false 
    WHERE is_online = true 
    AND last_seen < NOW() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql;

-- Clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
    UPDATE game_invitations 
    SET status = 'expired' 
    WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
