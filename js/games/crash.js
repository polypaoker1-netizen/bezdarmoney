/**
 * Crash Game Module
 */

const CrashGame = {
    isPlaying: false,
    currentMultiplier: 1.0,
    crashPoint: 0,
    betAmount: 0,
    startTime: 0,
    animationFrame: null,
    canvas: null,
    ctx: null,
    
    init() {
        this.setupCanvas();
        this.setupButtons();
    },
    
    setupCanvas() {
        this.canvas = document.getElementById('crash-canvas');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Initial draw
        this.drawGraph(1.0, false);
    },
    
    resizeCanvas() {
        if (!this.canvas) return;
        
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        
        if (!this.isPlaying) {
            this.drawGraph(1.0, false);
        }
    },
    
    setupButtons() {
        const startBtn = document.getElementById('crash-start-btn');
        const cashoutBtn = document.getElementById('crash-cashout-btn');
        
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startGame());
        }
        
        if (cashoutBtn) {
            cashoutBtn.addEventListener('click', () => this.cashout());
        }
    },
    
    async startGame() {
        if (this.isPlaying) return;
        
        const betInput = document.getElementById('crash-bet');
        this.betAmount = parseInt(betInput.value) || 0;
        
        if (!App.canBet(this.betAmount)) return;
        
        App.showLoading(true);
        
        try {
            const result = await API.startCrash(this.betAmount);
            
            this.crashPoint = result.crash_point;
            this.currentMultiplier = 1.0;
            this.isPlaying = true;
            this.startTime = Date.now();
            
            // Update UI
            document.getElementById('crash-controls').classList.add('hidden');
            document.getElementById('crash-playing').classList.remove('hidden');
            
            // Deduct bet
            App.updateBalance(-this.betAmount);
            
            App.hapticFeedback('medium');
            
            // Start animation
            this.animate();
            
        } catch (error) {
            App.showToast('Ошибка: ' + error.message, 'error');
        } finally {
            App.showLoading(false);
        }
    },
    
    animate() {
        if (!this.isPlaying) return;
        
        const elapsed = Date.now() - this.startTime;
        
        // Multiplier grows exponentially
        // Doubles every ~1 second
        this.currentMultiplier = Math.pow(1.0007, elapsed);
        this.currentMultiplier = Math.round(this.currentMultiplier * 100) / 100;
        
        // Check for crash
        if (this.currentMultiplier >= this.crashPoint) {
            this.crash();
            return;
        }
        
        // Update display
        this.updateDisplay();
        this.drawGraph(this.currentMultiplier, false);
        
        // Continue animation
        this.animationFrame = requestAnimationFrame(() => this.animate());
    },
    
    crash() {
        this.isPlaying = false;
        
        // Cancel animation
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        // Update display
        const multiplierEl = document.getElementById('crash-multiplier');
        if (multiplierEl) {
            multiplierEl.textContent = `${this.crashPoint.toFixed(2)}x`;
            multiplierEl.classList.add('crashed');
        }
        
        // Draw crashed graph
        this.drawGraph(this.crashPoint, true);
        
        App.showToast(`Краш на ${this.crashPoint.toFixed(2)}x!`, 'error');
        App.hapticFeedback('error');
        
        // Reset UI after delay
        setTimeout(() => this.resetGame(), 2000);
    },
    
    async cashout() {
        if (!this.isPlaying) return;
        
        // Stop animation immediately
        this.isPlaying = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        try {
            const result = await API.cashoutCrash();
            
            const winAmount = result.win_amount;
            App.updateBalance(winAmount);
            
            App.showToast(`Кэшаут: +${winAmount} (${this.currentMultiplier.toFixed(2)}x)`, 'success');
            App.hapticFeedback('success');
            
        } catch (error) {
            App.showToast('Ошибка: ' + error.message, 'error');
        }
        
        setTimeout(() => this.resetGame(), 1500);
    },
    
    resetGame() {
        const multiplierEl = document.getElementById('crash-multiplier');
        if (multiplierEl) {
            multiplierEl.textContent = '1.00x';
            multiplierEl.classList.remove('crashed');
        }
        
        document.getElementById('crash-controls').classList.remove('hidden');
        document.getElementById('crash-playing').classList.add('hidden');
        
        this.currentMultiplier = 1.0;
        this.crashPoint = 0;
        this.drawGraph(1.0, false);
    },
    
    updateDisplay() {
        const multiplierEl = document.getElementById('crash-multiplier');
        const cashoutAmountEl = document.getElementById('crash-cashout-amount');
        
        const potential = Math.floor(this.betAmount * this.currentMultiplier);
        
        if (multiplierEl) {
            multiplierEl.textContent = `${this.currentMultiplier.toFixed(2)}x`;
        }
        if (cashoutAmountEl) {
            cashoutAmountEl.textContent = potential;
        }
    },
    
    drawGraph(multiplier, crashed) {
        if (!this.ctx || !this.canvas) return;
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Background grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // Horizontal lines
        for (let i = 1; i <= 4; i++) {
            const y = height - (height / 5) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Draw curve
        const points = [];
        const maxX = multiplier > 2 ? multiplier * 50 : 100;
        
        for (let x = 0; x <= width; x += 2) {
            const progress = x / width;
            const m = Math.pow(1.0007, progress * (Date.now() - this.startTime || 1000));
            const y = height - (Math.min(m, 10) / 10) * height * 0.8;
            points.push({ x, y: Math.max(20, y) });
        }
        
        // Draw line
        ctx.beginPath();
        ctx.strokeStyle = crashed ? '#ff5252' : '#00c853';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (points.length > 0) {
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
        }
        
        ctx.stroke();
        
        // Gradient fill
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, crashed ? 'rgba(255, 82, 82, 0.1)' : 'rgba(0, 200, 83, 0.1)');
        gradient.addColorStop(1, crashed ? 'rgba(255, 82, 82, 0.3)' : 'rgba(0, 200, 83, 0.3)');
        
        ctx.beginPath();
        if (points.length > 0) {
            ctx.moveTo(points[0].x, height);
            for (let i = 0; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.lineTo(points[points.length - 1].x, height);
        }
        ctx.fillStyle = gradient;
        ctx.fill();
    }
};

window.CrashGame = CrashGame;
