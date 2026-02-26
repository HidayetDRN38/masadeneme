// Supabase Configuration
const SUPABASE_URL = 'https://axhpyppiioqentbdygma.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4aHB5cHBpaW9xZW50YmR5Z21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDY2MDksImV4cCI6MjA4NzY4MjYwOX0.6AWTH0Bs6jCqG66zp3cQ3E9mrw14PChlXsQ1BGCOULA'; 
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);// Eski 4. satırı sil, bunu yapıştır:

}

// Game Room Management
class GameRoomManager {
    constructor() {
        this.currentRoom = null;
        this.playerId = this.generatePlayerId();
        this.subscriptions = [];
    }
    
    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }
    
    async createRoom() {
        try {
            const { data, error } = await supabase
                .from('game_rooms')
                .insert({
                    room_code: this.generateRoomCode(),
                    player1_id: this.playerId,
                    player2_id: null,
                    status: 'waiting',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (error) throw error;
            
            this.currentRoom = data;
            await this.subscribeToRoom(data.room_code);
            
            return data;
        } catch (error) {
            console.error('Error creating room:', error);
            return null;
        }
    }
    
    async joinRoom(roomCode) {
        try {
            const { data: room, error: fetchError } = await supabase
                .from('game_rooms')
                .select('*')
                .eq('room_code', roomCode)
                .eq('status', 'waiting')
                .single();
            
            if (fetchError) throw fetchError;
            
            if (!room) {
                throw new Error('Oda bulunamadı veya dolu');
            }
            
            const { data, error } = await supabase
                .from('game_rooms')
                .update({
                    player2_id: this.playerId,
                    status: 'ready'
                })
                .eq('id', room.id)
                .select()
                .single();
            
            if (error) throw error;
            
            this.currentRoom = data;
            await this.subscribeToRoom(roomCode);
            
            return data;
        } catch (error) {
            console.error('Error joining room:', error);
            return null;
        }
    }
    
    async subscribeToRoom(roomCode) {
        // Subscribe to real-time updates
        const subscription = supabase
            .channel(`room_${roomCode}`)
            .on('postgres_changes', 
                { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'game_rooms',
                    filter: `room_code=eq.${roomCode}`
                },
                (payload) => {
                    this.handleRoomUpdate(payload.new);
                }
            )
            .subscribe();
        
        this.subscriptions.push(subscription);
    }
    
    handleRoomUpdate(room) {
        this.currentRoom = room;
        
        // Update UI based on room status
        if (room.status === 'ready' && room.player2_id) {
            // Both players are ready
            if (window.gameUI) {
                window.gameUI.updatePlayerCount(2);
                window.gameUI.enableStartButton();
            }
        }
    }
    
    async sendGameAction(action, data = {}) {
        if (!this.currentRoom) return;
        
        try {
            const { error } = await supabase
                .from('game_moves')
                .insert({
                    room_id: this.currentRoom.id,
                    player_id: this.playerId,
                    move_type: action,
                    move_data: data,
                    created_at: new Date().toISOString()
                });
            
            if (error) throw error;
        } catch (error) {
            console.error('Error sending game action:', error);
        }
    }
    
    generateRoomCode() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }
    
    async leaveRoom() {
        if (this.currentRoom) {
            // Unsubscribe from all channels
            this.subscriptions.forEach(sub => sub.unsubscribe());
            this.subscriptions = [];
            
            // Update room status
            if (this.currentRoom.player1_id === this.playerId) {
                // Player 1 left, delete the room
                await supabase
                    .from('game_rooms')
                    .delete()
                    .eq('id', this.currentRoom.id);
            } else {
                // Player 2 left, reset room
                await supabase
                    .from('game_rooms')
                    .update({
                        player2_id: null,
                        status: 'waiting'
                    })
                    .eq('id', this.currentRoom.id);
            }
            
            this.currentRoom = null;
        }
    }
}

// Export for use in main game
window.GameRoomManager = GameRoomManager;
window.supabase = supabase;
