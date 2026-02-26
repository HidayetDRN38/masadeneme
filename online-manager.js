// Online Multiplayer Manager
// Online Multiplayer Manager
// Config dosyasından gelen gerçek bağlantıyı bu dosyanın içine alıyoruz
const supabase = window.supabase;

if (!supabase) {
    console.error("Supabase bağlantısı kurulamadı! supabase-config.js dosyasını kontrol et.");
}
class OnlineGameManager {
    constructor() {
        this.currentUser = null;
        this.onlineUsers = [];
        this.invitations = [];
        this.subscriptions = [];
        this.heartbeatIntervalId = null;
    }
    
    async initializeUser(username) {
        try {
            // Check if user exists
            const { data: existingUser, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .single();
            
            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }
            
            let user;
            if (existingUser) {
                // Update existing user
                const { data, error } = await supabase
                    .from('users')
                    .update({
                        is_online: true,
                        last_seen: new Date().toISOString()
                    })
                    .eq('username', username)
                    .select()
                    .single();
                
                if (error) throw error;
                user = data;
            } else {
                // Create new user
                const { data, error } = await supabase
                    .from('users')
                    .insert({
                        username: username,
                        display_name: username,
                        is_online: true,
                        last_seen: new Date().toISOString()
                    })
                    .select()
                    .single();
                
                if (error) throw error;
                user = data;
            }
            
            this.currentUser = user;
            this.updateOnlineUsersUI();
            await this.setupRealtimeSubscriptions();
            this.startHeartbeat();
            return user;
        } catch (error) {
            console.error('Error initializing user:', error);
            return null;
        }
    }

    startHeartbeat() {
        if (!this.currentUser) return;
        if (this.heartbeatIntervalId) {
            clearInterval(this.heartbeatIntervalId);
        }

        this.heartbeatIntervalId = setInterval(async () => {
            try {
                await supabase
                    .from('users')
                    .update({
                        is_online: true,
                        last_seen: new Date().toISOString()
                    })
                    .eq('id', this.currentUser.id);
            } catch (error) {
                console.error('Heartbeat error:', error);
            }
        }, 30000);
    }
    
    async setupRealtimeSubscriptions() {
        // Subscribe to online users
        const usersSubscription = supabase
            .channel('online_users')
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'users'
                },
                (payload) => {
                    this.handleUserUpdate(payload);
                }
            )
            .subscribe();
        
        // Subscribe to game invitations
        const invitationsSubscription = supabase
            .channel('game_invitations')
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'game_invitations'
                },
                (payload) => {
                    this.handleInvitationUpdate(payload);
                }
            )
            .subscribe();
        
        this.subscriptions.push(usersSubscription, invitationsSubscription);
        
        // Load initial data
        await this.loadOnlineUsers();
        await this.loadInvitations();
    }
    
    async loadOnlineUsers() {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('is_online', true)
                .neq('username', this.currentUser?.username || '')
                .order('last_seen', { ascending: false });
            
            if (error) throw error;
            this.onlineUsers = data || [];
            this.updateOnlineUsersUI();
        } catch (error) {
            console.error('Error loading online users:', error);
        }
    }
    
    async loadInvitations() {
        try {
            const { data, error } = await supabase
                .from('game_invitations')
                .select('*')
                .eq('to_user_id', this.currentUser?.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            this.invitations = data || [];
            this.updateInvitationsUI();
        } catch (error) {
            console.error('Error loading invitations:', error);
        }
    }
    
    handleUserUpdate(payload) {
        const user = payload.new;
        if (!user) return;
        
        if (user.is_online && user.username !== this.currentUser?.username) {
            // Add or update online user
            const existingIndex = this.onlineUsers.findIndex(u => u.username === user.username);
            if (existingIndex >= 0) {
                this.onlineUsers[existingIndex] = user;
            } else {
                this.onlineUsers.push(user);
            }
        } else {
            // Remove offline user
            this.onlineUsers = this.onlineUsers.filter(u => u.username !== user.username);
        }
        
        this.updateOnlineUsersUI();
    }
    
    handleInvitationUpdate(payload) {
        const invitation = payload.new;
        
        if (invitation.to_user_id === this.currentUser?.id) {
            if (invitation.status === 'pending') {
                this.invitations.unshift(invitation);
                this.showInvitationNotification(invitation);
            } else {
                this.invitations = this.invitations.filter(inv => inv.id !== invitation.id);
            }
            this.updateInvitationsUI();
        }
    }
    
    async sendGameInvite(targetUsername) {
        try {
            // Get target user
            const { data: targetUser, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('username', targetUsername)
                .single();
            
            if (userError || !targetUser) {
                throw new Error('Kullanıcı bulunamadı');
            }
            
            // Create invitation
            const { data, error } = await supabase
                .from('game_invitations')
                .insert({
                    from_user_id: this.currentUser.id,
                    to_user_id: targetUser.id,
                    status: 'pending'
                })
                .select()
                .single();
            
            if (error) throw error;
            
            window.gameUI.showNotification(`${targetUsername} kullanıcısına oyun isteği gönderildi!`);
            return data;
        } catch (error) {
            console.error('Error sending invitation:', error);
            window.gameUI.showNotification('Oyun isteği gönderilemedi!', 'error');
            return null;
        }
    }
    
    async acceptInvitation(invitationId) {
        try {
            // Get invitation details
            const { data: invitation, error: fetchError } = await supabase
                .from('game_invitations')
                .select('*')
                .eq('id', invitationId)
                .single();
            
            if (fetchError) throw fetchError;
            
            // Create game room
            const roomCode = this.generateRoomCode();
            const { data: room, error: roomError } = await supabase
                .from('game_rooms')
                .insert({
                    room_code: roomCode,
                    player1_id: invitation.from_user_id,
                    player2_id: invitation.to_user_id,
                    player1_username: invitation.from_user_id, // Will be updated with actual username
                    player2_username: this.currentUser.username,
                    status: 'ready'
                })
                .select()
                .single();
            
            if (roomError) throw roomError;
            
            // Update invitation status
            await supabase
                .from('game_invitations')
                .update({
                    status: 'accepted',
                    room_code: roomCode
                })
                .eq('id', invitationId);
            
            // Start game
            window.gameUI.roomManager.currentRoom = room;
            window.gameUI.startGame();
            
            window.gameUI.showNotification('Oyun başlıyor!');
        } catch (error) {
            console.error('Error accepting invitation:', error);
            window.gameUI.showNotification('Oyun kabul edilemedi!', 'error');
        }
    }
    
    async rejectInvitation(invitationId) {
        try {
            await supabase
                .from('game_invitations')
                .update({ status: 'rejected' })
                .eq('id', invitationId);
            
            window.gameUI.showNotification('Oyun isteği reddedildi');
        } catch (error) {
            console.error('Error rejecting invitation:', error);
        }
    }
    
    showInvitationNotification(invitation) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-sm';
        notification.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <h4 class="font-bold">Oyun İsteği!</h4>
                <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <p class="text-sm mb-3">${invitation.from_user_id} size oyun isteği attı!</p>
            <div class="flex space-x-2">
                <button onclick="onlineGameManager.acceptInvitation('${invitation.id}')" class="bg-green-500 hover:bg-green-600 px-3 py-1 rounded text-sm">
                    Kabul Et
                </button>
                <button onclick="onlineGameManager.rejectInvitation('${invitation.id}')" class="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm">
                    Reddet
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 10 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }
    
    updateOnlineUsersUI() {
        const container = document.getElementById('onlineUsersList');
        if (!container) return;
        
        // Add current user at the top with red color
        const currentUserHTML = this.currentUser ? `
            <div class="online-user-item bg-red-500/20 backdrop-blur rounded-lg p-3 mb-2 border border-red-500/30">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                        <span class="text-red-300 font-medium">${this.currentUser.display_name || this.currentUser.username} (Sen)</span>
                    </div>
                    <div class="text-red-400 text-xs">MEVCUT</div>
                </div>
            </div>
        ` : '';
        
        // Add other online users with green color
        const otherUsersHTML = this.onlineUsers.map(user => `
            <div class="online-user-item bg-white/10 backdrop-blur rounded-lg p-3 mb-2 cursor-pointer hover:bg-white/20 transition-all duration-300" onclick="onlineGameManager.sendGameInvite('${user.username}')">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <span class="text-white font-medium">${user.display_name || user.username}</span>
                    </div>
                    <button class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm">
                        <i class="fas fa-gamepad mr-1"></i>
                        Davet Et
                    </button>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = currentUserHTML + otherUsersHTML;
    }
    
    updateInvitationsUI() {
        // Update invitations counter or list if needed
        const counter = document.getElementById('invitationsCounter');
        if (counter) {
            counter.textContent = this.invitations.length;
            counter.style.display = this.invitations.length > 0 ? 'block' : 'none';
        }
    }
    
    generateRoomCode() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }
    
    async disconnect() {
        // Mark user as offline
        if (this.currentUser) {
            await supabase
                .from('users')
                .update({ is_online: false })
                .eq('id', this.currentUser.id);
        }

        if (this.heartbeatIntervalId) {
            clearInterval(this.heartbeatIntervalId);
            this.heartbeatIntervalId = null;
        }
        
        // Unsubscribe from all channels
        this.subscriptions.forEach(sub => sub.unsubscribe());
        this.subscriptions = [];
    }
}

// Global instance
window.onlineGameManager = new OnlineGameManager();
