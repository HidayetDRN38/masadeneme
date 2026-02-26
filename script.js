// Matematik Duello Game Script


class MathDuelGame {
    constructor() {
        this.currentQuestion = 0;
        this.playerCount = 1;
        this.maxPlayers = 2;
        this.roomManager = null;
        this.isOnline = false;
        
        this.questions = [
            {
                question: "15 + 27 = ?",
                answers: ["42", "38", "45", "52"],
                correct: 0
            },
            {
                question: "8 × 7 = ?",
                answers: ["54", "56", "58", "62"],
                correct: 1
            },
            {
                question: "144 ÷ 12 = ?",
                answers: ["10", "11", "12", "13"],
                correct: 2
            },
            {
                question: "√64 = ?",
                answers: ["6", "7", "8", "9"],
                correct: 2
            },
            {
                question: "3² + 4² = ?",
                answers: ["24", "25", "26", "27"],
                correct: 1
            }
        ];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initializeAnimations();
        
        // Initialize room manager if Supabase is available
        if (typeof GameRoomManager !== 'undefined') {
            this.roomManager = new GameRoomManager();
            this.isOnline = true;
        } else {
            // Fallback to offline mode
            this.playerCount = 0; // Başlangıçta 0 oyuncu
            this.updatePlayerCount();
        }
    }
    
    setupEventListeners() {
        // Login screen events
        const usernameInput = document.getElementById('usernameInput');
        const loginBtn = document.getElementById('loginBtn');
        const usernameError = document.getElementById('usernameError');
        
        // Username validation
        usernameInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            const errorDiv = document.getElementById('usernameError');
            
            if (value.length < 4) {
                errorDiv.textContent = 'En az 4 karakter girmelisiniz!';
                errorDiv.classList.remove('hidden');
                loginBtn.disabled = true;
            } else if (value.length > 20) {
                errorDiv.textContent = 'En fazla 20 karakter girebilirsiniz!';
                errorDiv.classList.remove('hidden');
                loginBtn.disabled = true;
            } else {
                errorDiv.classList.add('hidden');
                loginBtn.disabled = false;
            }
        });
        
        // Login button
        loginBtn.addEventListener('click', () => {
            this.handleLogin();
        });
        
        // Enter key for login
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });
        
        // Start game button
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        // Next question button
        document.getElementById('nextQuestionBtn').addEventListener('click', () => {
            this.nextQuestion();
        });
        
        // Restart button
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });
        
        // Dice button
        document.getElementById('diceBtn').addEventListener('click', () => {
            this.showDiceScreen();
        });
        
        // Back to waiting button
        document.getElementById('backToWaitingBtn').addEventListener('click', () => {
            this.backToWaitingScreen();
        });
        
        // Back from dice button
        document.getElementById('backFromDiceBtn').addEventListener('click', () => {
            this.backToGameScreen();
        });
        
        // Back from no questions button
        document.getElementById('backFromNoQuestionsBtn').addEventListener('click', () => {
            this.backToGameScreen();
        });
        
        // Answer buttons
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.checkAnswer(e.target);
            });
        });
        
        // Dice containers
        document.querySelectorAll('.dice-container').forEach(container => {
            container.addEventListener('click', (e) => {
                this.rollDice(container);
            });
        });
    }
    
    handleLogin() {
        const usernameInput = document.getElementById('usernameInput');
        const username = usernameInput.value.trim();
        const errorDiv = document.getElementById('usernameError');
        
        // Validate username
        if (username.length < 4) {
            errorDiv.textContent = 'En az 4 karakter girmelisiniz!';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        if (username.length > 20) {
            errorDiv.textContent = 'En fazla 20 karakter girebilirsiniz!';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        // Hide error
        errorDiv.classList.add('hidden');
        
        // Initialize online game manager
        if (this.isOnline && window.onlineGameManager) {
            window.onlineGameManager.initializeUser(username).then(user => {
                if (user) {
                    this.currentUser = user;
                    this.showLobbyScreen();
                } else {
                    errorDiv.textContent = 'Giriş başarısız! Tekrar deneyin.';
                    errorDiv.classList.remove('hidden');
                }
            });
        } else {
            // Fallback for offline mode
            this.currentUser = { username: username };
            this.showLobbyScreen();
        }
    }
    
    showLobbyScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const lobbyScreen = document.getElementById('lobbyScreen');
        const currentUserDisplay = document.getElementById('currentUserDisplay');
        
        // Update current user display
        currentUserDisplay.textContent = this.currentUser.username;
        
        // Animate transition
        const tl = gsap.timeline();
        
        tl.to(loginScreen, {
            duration: 0.5,
            opacity: 0,
            scale: 0.8,
            ease: "power2.inOut"
        });
        
        tl.set(loginScreen, { display: "none" });
        tl.set(lobbyScreen, { display: "block" });
        
        tl.from(lobbyScreen, {
            duration: 0.8,
            opacity: 0,
            scale: 0.8,
            ease: "back.out(1.7)"
        });
        
        // Update player count
        this.playerCount = 1;
        this.updatePlayerCount();

        if (this.isOnline && window.onlineGameManager) {
            window.onlineGameManager.updateOnlineUsersUI();
            window.onlineGameManager.loadOnlineUsers();
        }
        
        // Enable start button for testing
        setTimeout(() => {
            this.enableStartButton();
        }, 2000);
    }
    
    async createRoom() {
        if (!this.roomManager) return;
        
        const room = await this.roomManager.createRoom();
        if (room) {
            document.getElementById('roomCode').textContent = room.room_code;
            this.showNotification('Oda oluşturuldu! Kod: ' + room.room_code);
            this.playerCount = 1; // Sadece 1 oyuncu
            this.updatePlayerCount();
            this.enableStartButton(); // Tek başına da başlayabilsin
            
            // Setup opponent action listener
            this.setupOpponentActionListener();
        } else {
            this.showNotification('Oda oluşturulamadı!', 'error');
        }
    }
    
    showJoinRoomInput() {
        const inputDiv = document.getElementById('joinRoomInput');
        inputDiv.classList.toggle('hidden');
        if (!inputDiv.classList.contains('hidden')) {
            document.getElementById('roomCodeInput').focus();
        }
    }
    
    async joinRoom() {
        if (!this.roomManager) return;
        
        const roomCode = document.getElementById('roomCodeInput').value.toUpperCase().trim();
        if (!roomCode || roomCode.length !== 6) {
            this.showNotification('Geçerli bir oda kodu girin!', 'error');
            return;
        }
        
        const room = await this.roomManager.joinRoom(roomCode);
        if (room) {
            document.getElementById('roomCode').textContent = room.room_code;
            this.showNotification('Odaya katıldınız!');
            this.playerCount = 2;
            this.updatePlayerCount();
            this.enableStartButton();
            
            // Setup opponent action listener
            this.setupOpponentActionListener();
        } else {
            this.showNotification('Odaya katılamadı!', 'error');
        }
    }
    
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 ${
            type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        gsap.from(notification, {
            x: 100,
            opacity: 0,
            duration: 0.3
        });
        
        setTimeout(() => {
            gsap.to(notification, {
                x: 100,
                opacity: 0,
                duration: 0.3,
                onComplete: () => notification.remove()
            });
        }, 3000);
    }
    
    initializeAnimations() {
        // GSAP Timeline for entrance animations
        const tl = gsap.timeline();
        
        // Animate waiting screen
        tl.from("#waitingScreen > div", {
            duration: 1,
            scale: 0.8,
            opacity: 0,
            ease: "back.out(1.7)"
        });
        
        // Animate floating elements
        gsap.to(".floating", {
            y: -20,
            duration: 2,
            repeat: -1,
            yoyo: true,
            ease: "power1.inOut"
        });
        
        // Animate pulse elements
        gsap.to(".pulse-glow", {
            boxShadow: "0 0 40px rgba(147, 51, 234, 0.8)",
            duration: 2,
            repeat: -1,
            yoyo: true,
            ease: "power1.inOut"
        });
    }
    
    simulatePlayerJoin() {
        // Simulate second player joining after 3 seconds
        setTimeout(() => {
            this.playerCount = 2;
            this.updatePlayerCount();
            this.enableStartButton();
        }, 3000);
    }
    
    updatePlayerCount() {
        const playerCountEl = document.getElementById('playerCount');
        const progressBar = document.getElementById('progressBar');
        const dots = document.querySelectorAll('.flex.justify-center.space-x-2 > div');
        
        // Doğru oyuncu sayısını göster: mevcut/2
        playerCountEl.textContent = `${this.playerCount}/2`;
        progressBar.style.width = `${(this.playerCount / 2) * 100}%`;
        
        // Update player status dots
        dots.forEach((dot, index) => {
            if (index < this.playerCount) {
                dot.classList.remove('bg-gray-400');
                dot.classList.add('bg-green-400');
            } else {
                dot.classList.remove('bg-green-400');
                dot.classList.add('bg-gray-400');
            }
        });
        
        // Animate the update
        gsap.from(playerCountEl, {
            scale: 1.2,
            duration: 0.3,
            ease: "back.out(1.7)"
        });
    }
    
    enableStartButton() {
        const startBtn = document.getElementById('startGameBtn');
        startBtn.disabled = false;
        
        // Add celebration animation
        gsap.to(startBtn, {
            scale: 1.05,
            duration: 0.5,
            repeat: 3,
            yoyo: true,
            ease: "power1.inOut"
        });
    }
    
    startGame() {
        // 3D flip animation from lobby to game screen
        const tl = gsap.timeline();
        
        tl.to("#lobbyScreen > div", {
            duration: 0.5,
            rotateY: 90,
            opacity: 0,
            ease: "power2.inOut"
        });
        
        tl.set("#lobbyScreen", { display: "none" });
        tl.set("#gameScreen", { display: "block" });
        
        tl.from("#gameScreen > div > div", {
            duration: 0.5,
            rotateY: -90,
            opacity: 0,
            ease: "power2.inOut"
        });
        
        this.currentQuestion = 0;
        this.loadQuestion();
    }
    
    loadQuestion() {
        const question = this.questions[this.currentQuestion];
        const questionEl = document.getElementById('mathQuestion');
        const questionNumberEl = document.getElementById('questionNumber');
        const answerBtns = document.querySelectorAll('.answer-btn');
        
        // Update question number and dots
        questionNumberEl.textContent = this.currentQuestion + 1;
        this.updateProgressDots();
        
        // Animate question change
        const tl = gsap.timeline();
        tl.to("#mathCard", {
            duration: 0.3,
            rotateY: 90,
            ease: "power2.inOut"
        });
        
        tl.call(() => {
            questionEl.textContent = question.question;
            answerBtns.forEach((btn, index) => {
                btn.textContent = question.answers[index];
                btn.dataset.answer = index;
                btn.classList.remove('correct-answer', 'wrong-answer');
            });
        });
        
        tl.to("#mathCard", {
            duration: 0.3,
            rotateY: 0,
            ease: "power2.inOut"
        });
        
        // Animate answer buttons entrance
        gsap.from(".answer-btn", {
            duration: 0.5,
            scale: 0,
            opacity: 0,
            stagger: 0.1,
            ease: "back.out(1.7)",
            delay: 0.6
        });
    }
    
    updateProgressDots() {
        for (let i = 1; i <= 5; i++) {
            const dot = document.getElementById(`dot${i}`);
            if (i <= this.currentQuestion + 1) {
                dot.classList.remove('bg-white/30');
                dot.classList.add('bg-white');
            } else {
                dot.classList.remove('bg-white');
                dot.classList.add('bg-white/30');
            }
        }
    }
    
    checkAnswer(selectedBtn) {
        const question = this.questions[this.currentQuestion];
        const selectedAnswer = parseInt(selectedBtn.dataset.answer);
        const answerBtns = document.querySelectorAll('.answer-btn');
        
        // Disable all buttons
        answerBtns.forEach(btn => {
            btn.disabled = true;
            btn.style.cursor = 'not-allowed';
        });
        
        // Show correct and wrong answers
        answerBtns.forEach((btn, index) => {
            if (index === question.correct) {
                btn.classList.add('correct-answer');
                this.createParticles(btn, 'success');
            } else if (index === selectedAnswer && index !== question.correct) {
                btn.classList.add('wrong-answer');
                this.createParticles(btn, 'error');
            }
        });
        
        // Auto advance after 1.5 seconds
        setTimeout(() => {
            this.nextQuestion();
        }, 1500);
    }
    
    createParticles(element, type) {
        const colors = type === 'success' 
            ? ['#10b981', '#059669', '#047857'] 
            : ['#ef4444', '#dc2626', '#b91c1c'];
        
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = '50%';
            particle.style.top = '50%';
            particle.style.width = '8px';
            particle.style.height = '8px';
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.borderRadius = '50%';
            
            const angle = (i * 45) * Math.PI / 180;
            const distance = 50 + Math.random() * 50;
            particle.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
            
            element.appendChild(particle);
            
            setTimeout(() => particle.remove(), 4000);
        }
    }
    
    nextQuestion() {
        this.currentQuestion++;
        
        if (this.currentQuestion < this.questions.length) {
            this.loadQuestion();
        } else {
            this.showGameOver();
        }
    }
    
    showGameOver() {
        const tl = gsap.timeline();
        
        tl.to("#gameScreen > div > div", {
            duration: 0.5,
            rotateY: 90,
            opacity: 0,
            scale: 0.8,
            ease: "power2.inOut"
        });
        
        tl.set("#gameScreen", { display: "none" });
        tl.set("#gameOverScreen", { display: "block" });
        
        tl.from("#gameOverScreen > div", {
            duration: 0.8,
            rotateY: -90,
            opacity: 0,
            scale: 0.8,
            ease: "back.out(1.7)"
        });
        
        // Animate trophy
        gsap.from("#gameOverScreen .fa-trophy", {
            duration: 1,
            scale: 0,
            rotation: 360,
            ease: "back.out(1.7)",
            delay: 0.5
        });
        
        // Create celebration particles
        this.createCelebrationParticles();
    }
    
    createCelebrationParticles() {
        const colors = ['#fbbf24', '#f59e0b', '#d97706', '#92400e'];
        const container = document.getElementById('gameOverScreen');
        
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.top = Math.random() * 100 + '%';
                particle.style.width = '6px';
                particle.style.height = '6px';
                particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                particle.style.borderRadius = '50%';
                particle.style.animationDuration = (3 + Math.random() * 2) + 's';
                
                container.appendChild(particle);
                
                setTimeout(() => particle.remove(), 5000);
            }, i * 100);
        }
    }
    
    restartGame() {
        // Reset all game state without page reload
        this.currentQuestion = 0;
        this.playerCount = 1;
        
        // Hide all screens
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('gameOverScreen').style.display = 'none';
        document.getElementById('diceScreen').style.display = 'none';
        document.getElementById('noMoreQuestionsScreen').style.display = 'none';
        
        // Show waiting screen
        document.getElementById('waitingScreen').style.display = 'block';
        
        // Reset player count display
        this.updatePlayerCount();
        
        // Disable start button
        const startBtn = document.getElementById('startGameBtn');
        startBtn.disabled = true;
        
        // Reset progress dots
        for (let i = 1; i <= 5; i++) {
            const dot = document.getElementById(`dot${i}`);
            dot.classList.remove('bg-white');
            dot.classList.add('bg-white/30');
        }
        
        // Simulate player joining again
        setTimeout(() => {
            this.playerCount = 2;
            this.updatePlayerCount();
            this.enableStartButton();
        }, 2000);
        
        // Add entrance animation
        gsap.from("#waitingScreen > div", {
            duration: 0.8,
            scale: 0.8,
            opacity: 0,
            ease: "back.out(1.7)"
        });
    }
    
    showDiceScreen() {
        // Diğer oyuncuya zar atıldığı bildirimini gönder
        if (this.isOnline && this.roomManager && this.roomManager.currentRoom) {
            this.sendGameAction('dice_rolling');
        }
        
        const tl = gsap.timeline();
        
        tl.to("#gameScreen > div > div", {
            duration: 0.5,
            rotateY: 90,
            opacity: 0,
            scale: 0.8,
            ease: "power2.inOut"
        });
        
        tl.set("#gameScreen", { display: "none" });
        tl.set("#diceScreen", { display: "block" });
        
        tl.from("#diceScreen > div", {
            duration: 0.8,
            rotateY: -90,
            opacity: 0,
            scale: 0.8,
            ease: "back.out(1.7)"
        });
        
        // Start dice spinning animation
        this.animateDice();
    }
    
    sendGameAction(action, data = {}) {
        if (this.isOnline && this.roomManager) {
            this.roomManager.sendGameAction(action, data);
        }
    }
    
    // Listen for opponent actions
    setupOpponentActionListener() {
        if (!this.isOnline || !this.roomManager) return;
        
        // Subscribe to game moves for real-time updates
        supabase
            .channel(`game_moves_${this.roomManager.currentRoom?.id}`)
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'game_moves',
                    filter: `room_id=eq.${this.roomManager.currentRoom?.id}`
                },
                (payload) => {
                    this.handleOpponentAction(payload.new);
                }
            )
            .subscribe();
    }
    
    handleOpponentAction(move) {
        // Don't handle our own actions
        if (move.player_id === this.roomManager.playerId) return;
        
        switch (move.move_type) {
            case 'dice_rolling':
                this.showOpponentDiceNotification();
                break;
            case 'answer':
                // Handle opponent answer
                break;
            case 'next_question':
                // Handle opponent next question
                break;
        }
    }
    
    showOpponentDiceNotification() {
        const notification = document.createElement('div');
        notification.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-white px-8 py-6 rounded-2xl shadow-2xl z-50 text-center';
        notification.innerHTML = `
            <div class="flex items-center justify-center mb-4">
                <i class="fas fa-dice text-4xl animate-spin"></i>
            </div>
            <h3 class="text-xl font-bold mb-2">Diğer Oyuncu Zar Atıyor</h3>
            <p class="text-sm">Lütfen bekleyin...</p>
        `;
        
        document.body.appendChild(notification);
        
        gsap.from(notification, {
            scale: 0,
            opacity: 0,
            duration: 0.3,
            ease: "back.out(1.7)"
        });
        
        // 3 saniye sonra kaldır
        setTimeout(() => {
            gsap.to(notification, {
                scale: 0,
                opacity: 0,
                duration: 0.3,
                onComplete: () => notification.remove()
            });
        }, 3000);
    }
    
    animateDice() {
        document.querySelectorAll('.dice').forEach(dice => {
            const icon = dice.querySelector('i');
            gsap.to(icon, {
                rotation: 360,
                duration: 2,
                repeat: -1,
                ease: "linear"
            });
        });
    }
    
    rollDice(container) {
        const difficulty = container.dataset.difficulty;
        const dice = container.querySelector('.dice');
        const icon = dice.querySelector('i');
        
        // Stop all dice spinning
        document.querySelectorAll('.dice i').forEach(diceIcon => {
            gsap.killTweensOf(diceIcon);
        });
        
        // Create screen overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 9999;
            display: flex;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(10px);
        `;
        
        // Create enlarged dice for animation
        const enlargedDice = document.createElement('div');
        enlargedDice.className = `dice ${dice.className.replace('dice ', '')}`;
        enlargedDice.style.cssText = `
            width: 200px;
            height: 200px;
            border-radius: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            position: relative;
            transform: scale(0);
        `;
        
        const diceIcon = document.createElement('i');
        diceIcon.className = icon.className;
        diceIcon.style.cssText = `
            color: white;
            font-size: 80px;
        `;
        
        enlargedDice.appendChild(diceIcon);
        overlay.appendChild(enlargedDice);
        document.body.appendChild(overlay);
        
        const tl = gsap.timeline();
        
        // Scale in the enlarged dice
        tl.to(enlargedDice, {
            scale: 1,
            duration: 0.5,
            ease: "back.out(1.7)"
        });
        
        // Create light beam from top
        const lightBeam = document.createElement('div');
        lightBeam.style.cssText = `
            position: absolute;
            top: -300px;
            left: 50%;
            transform: translateX(-50%);
            width: 6px;
            height: 600px;
            background: linear-gradient(to bottom, 
                transparent 0%, 
                rgba(255, 255, 255, 0.1) 20%,
                rgba(255, 255, 255, 0.9) 50%,
                rgba(255, 255, 255, 0.1) 80%,
                transparent 100%
            );
            opacity: 0;
            pointer-events: none;
            z-index: 10000;
        `;
        
        overlay.appendChild(lightBeam);
        
        // Activate light beam
        tl.to(lightBeam, {
            opacity: 1,
            duration: 0.3
        });
        
        // Spin the dice dramatically
        tl.to(diceIcon, {
            rotation: "+=1080",
            duration: 2,
            ease: "power2.inOut"
        }, "-=0.2");
        
        // Fade out light beam
        tl.to(lightBeam, {
            opacity: 0,
            duration: 0.5,
            delay: 0.5
        });
        
        // Scale out and remove overlay
        tl.to(enlargedDice, {
            scale: 0,
            duration: 0.5,
            ease: "back.in(1.7)"
        });
        
        tl.call(() => {
            document.body.removeChild(overlay);
            // Show no more questions screen
            this.showNoMoreQuestionsScreen();
        });
    }
    
    createLightBeam(dice) {
        const beam = document.createElement('div');
        beam.style.position = 'absolute';
        beam.style.top = '-100px';
        beam.style.left = '50%';
        beam.style.transform = 'translateX(-50%)';
        beam.style.width = '2px';
        beam.style.height = '200px';
        beam.style.background = 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.8), transparent)';
        beam.style.zIndex = '1000';
        beam.style.pointerEvents = 'none';
        
        dice.style.position = 'relative';
        dice.appendChild(beam);
        
        const tl = gsap.timeline();
        tl.to(beam, {
            opacity: 1,
            duration: 0.2
        });
        tl.to(beam, {
            opacity: 0,
            duration: 0.3,
            delay: 0.5
        });
        tl.call(() => beam.remove());
    }
    
    showNoMoreQuestionsScreen() {
        const tl = gsap.timeline();
        
        tl.to("#diceScreen > div", {
            duration: 0.5,
            rotateY: 90,
            opacity: 0,
            scale: 0.8,
            ease: "power2.inOut"
        });
        
        tl.set("#diceScreen", { display: "none" });
        tl.set("#noMoreQuestionsScreen", { display: "block" });
        
        tl.from("#noMoreQuestionsScreen > div", {
            duration: 0.8,
            rotateY: -90,
            opacity: 0,
            scale: 0.8,
            ease: "back.out(1.7)"
        });
    }
    
    backToGameScreen() {
        const tl = gsap.timeline();
        
        // Hide current screen
        let currentScreen = '#noMoreQuestionsScreen';
        if (document.getElementById('diceScreen').style.display !== 'none') {
            currentScreen = '#diceScreen';
        }
        
        tl.to(`${currentScreen} > div`, {
            duration: 0.5,
            rotateY: 90,
            opacity: 0,
            scale: 0.8,
            ease: "power2.inOut"
        });
        
        tl.set(currentScreen, { display: "none" });
        tl.set("#gameScreen", { display: "block" });
        
        tl.from("#gameScreen > div > div", {
            duration: 0.5,
            rotateY: -90,
            opacity: 0,
            scale: 0.8,
            ease: "back.out(1.7)"
        });
        
        // Restart dice animation if coming from dice screen
        if (currentScreen === '#diceScreen') {
            setTimeout(() => this.animateDice(), 1000);
        }
        
        // Ensure question is properly loaded
        if (this.currentQuestion >= 0 && this.currentQuestion < this.questions.length) {
            this.loadQuestion();
        }
    }
    
    backToWaitingScreen() {
        const tl = gsap.timeline();
        
        tl.to("#gameScreen > div > div", {
            duration: 0.5,
            rotateY: 90,
            opacity: 0,
            scale: 0.8,
            ease: "power2.inOut"
        });
        
        tl.set("#gameScreen", { display: "none" });
        tl.set("#lobbyScreen", { display: "block" });
        
        tl.from("#lobbyScreen > div", {
            duration: 0.5,
            rotateY: -90,
            opacity: 0,
            scale: 0.8,
            ease: "back.out(1.7)"
        });
        
        // Reset game state
        this.currentQuestion = 0;
        this.playerCount = 1;
        this.updatePlayerCount();
        
        // Disable start button
        const startBtn = document.getElementById('startGameBtn');
        startBtn.disabled = true;

        if (this.isOnline && window.onlineGameManager) {
            window.onlineGameManager.updateOnlineUsersUI();
            window.onlineGameManager.loadOnlineUsers();
        }
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const game = new MathDuelGame();
    
    // Make game instance globally available for UI updates
    window.gameUI = game;
});

// Add some interactive hover effects
document.addEventListener('mousemove', (e) => {
    const cards = document.querySelectorAll('.preserve-3d > div');
    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        const angleX = (y / rect.height) * 10;
        const angleY = (x / rect.width) * -10;
        
        card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg)`;
    });
});

// Gyroscope effect for mobile devices
