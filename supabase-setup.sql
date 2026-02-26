-- Supabase SQL Setup for Math Duel Game

-- Drop existing policies and tables to recreate
DROP POLICY IF EXISTS "Anyone can view game rooms" ON game_rooms;
DROP POLICY IF EXISTS "Anyone can insert game rooms" ON game_rooms;
DROP POLICY IF EXISTS "Players can update their own rooms" ON game_rooms;
DROP POLICY IF EXISTS "Players can delete rooms they created" ON game_rooms;
DROP POLICY IF EXISTS "Anyone can view game moves" ON game_moves;
DROP POLICY IF EXISTS "Players can insert moves in their rooms" ON game_moves;

-- Drop existing tables
DROP TABLE IF EXISTS game_moves CASCADE;
DROP TABLE IF EXISTS game_rooms CASCADE;

-- Create game_rooms table
CREATE TABLE IF NOT EXISTS game_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_code TEXT UNIQUE NOT NULL,
    player1_id TEXT NOT NULL,
    player2_id TEXT,
    status TEXT NOT NULL DEFAULT 'waiting', -- waiting, ready, playing, finished
    current_question INTEGER DEFAULT 0,
    player1_score INTEGER DEFAULT 0,
    player2_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_moves table for real-time game actions
CREATE TABLE IF NOT EXISTS game_moves (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,
    move_type TEXT NOT NULL, -- answer, next_question, roll_dice
    move_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_rooms_room_code ON game_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms(status);
CREATE INDEX IF NOT EXISTS idx_game_moves_room_id ON game_moves(room_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_created_at ON game_moves(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;

-- Create policies for game_rooms
CREATE POLICY "Anyone can view game rooms" ON game_rooms
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert game rooms" ON game_rooms
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Players can update their own rooms" ON game_rooms
    FOR UPDATE USING (
        player1_id = auth.uid()::text OR 
        player2_id = auth.uid()::text
    );

CREATE POLICY "Players can delete rooms they created" ON game_rooms
    FOR DELETE USING (player1_id = auth.uid()::text);

-- Create policies for game_moves
CREATE POLICY "Anyone can view game moves" ON game_moves
    FOR SELECT USING (true);

CREATE POLICY "Players can insert moves in their rooms" ON game_moves
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM game_rooms 
            WHERE id = room_id 
            AND (player1_id = auth.uid()::text OR player2_id = auth.uid()::text)
        )
    );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updated_at
CREATE TRIGGER update_game_rooms_updated_at 
    BEFORE UPDATE ON game_rooms 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
