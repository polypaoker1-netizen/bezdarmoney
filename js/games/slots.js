/**
 * Slots Game Module
 * 3x3 grid slots with rolling animation
 */

const SlotsGame = {
    isSpinning: false,
    symbols: ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '7️⃣'],
    reelCount: 3,
    rowCount: 3,
    spinDuration: 1500,
    reelStopDelay: 400,
    
    init() {
        this.setupSpinButton();
        this.renderInitialReels();
    },
    
    setupSpinButton() {
        const spinBtn = document.getElementById('slots-spin-btn');
        if (!spinBtn) return;
        
        spinBtn.addEventListener('click', () => this.spin());
    },
    
    renderInitialReels() {
        for (let i = 0; i < this.reelCount; i++) {
            this.updateReel(i, this.getRandomSymbols());
        }
    },
    
    getRandomSymbols() {
        const symbols = [];
        for (let i = 0; i < this.rowCount; i++) {
            symbols.push(this.randomSymbol());
        }
        return symbols;
    },
    
    randomSymbol() {
        return this.symbols[Math.floor(Math.random() * this.symbols.length)];
    },
    
    updateReel(reelIndex, symbols) {
        const reel = document.getElementById(`reel-${reelIndex}`);
        if (!reel) return;
        
        const inner = reel.querySelector('.reel-inner');
        if (!inner) return;
        
        inner.innerHTML = symbols.map(s => `<span>${s}</span>`).join('');
    },
    
    createSpinningStrip(inner) {
        // Generate extended strip of random symbols for rolling effect
        let html = '';
        for (let i = 0; i < 30; i++) {
            html += `<span>${this.randomSymbol()}</span>`;
        }
        inner.innerHTML = html;
    },
    
    async spin() {
        if (this.isSpinning) return;
        
        const betInput = document.getElementById('slots-bet');
        const spinBtn = document.getElementById('slots-spin-btn');
        const winAmountEl = document.getElementById('slots-win-amount');
        const betAmount = parseInt(betInput.value) || 0;
        
        if (!App.canBet(betAmount)) return;
        
        this.isSpinning = true;
        spinBtn.disabled = true;
        spinBtn.textContent = '🎰 КРУТИТСЯ...';
        
        // Reset win display
        if (winAmountEl) {
            winAmountEl.textContent = '0';
            winAmountEl.classList.remove('win', 'big-win');
        }
        
        // Start spinning animation with rolling effect
        for (let i = 0; i < this.reelCount; i++) {
            const reel = document.getElementById(`reel-${i}`);
            if (reel) {
                const inner = reel.querySelector('.reel-inner');
                if (inner) {
                    this.createSpinningStrip(inner);
                }
                reel.classList.add('spinning');
            }
        }
        
        App.hapticFeedback('medium');
        
        try {
            // Call API
            const result = await API.playSlots(betAmount);
            
            // Ensure minimum spin duration for visual effect
            await this.delay(this.spinDuration);
            
            // Stop reels one by one with delay
            for (let i = 0; i < this.reelCount; i++) {
                await this.stopReel(i, result.reels, this.reelStopDelay);
            }
            
            // Wait for animations to complete
            await this.delay(300);
            
            // Show result
            this.showResult(result, betAmount);
            
        } catch (error) {
            // Stop all reels immediately on error
            for (let i = 0; i < this.reelCount; i++) {
                const reel = document.getElementById(`reel-${i}`);
                if (reel) {
                    reel.classList.remove('spinning');
                }
            }
            App.showToast('Ошибка: ' + error.message, 'error');
        } finally {
            this.isSpinning = false;
            spinBtn.disabled = false;
            spinBtn.textContent = '🎰 КРУТИТЬ';
        }
    },
    
    async stopReel(reelIndex, reels, delay) {
        await this.delay(delay);
        
        const reel = document.getElementById(`reel-${reelIndex}`);
        if (!reel) return;
        
        reel.classList.remove('spinning');
        reel.classList.add('stopping');
        
        // Get column symbols from result (reels is 3x3 grid)
        const columnSymbols = [
            reels[0][reelIndex],
            reels[1][reelIndex],
            reels[2][reelIndex]
        ];
        
        this.updateReel(reelIndex, columnSymbols);
        
        // Remove stopping class after animation
        await this.delay(150);
        reel.classList.remove('stopping');
        
        App.hapticFeedback('light');
    },
    
    showResult(result, betAmount) {
        const winAmountEl = document.getElementById('slots-win-amount');
        
        if (result.is_win) {
            const winAmount = result.win_amount;
            
            // Update balance (win_amount includes original bet return)
            App.updateBalance(winAmount - betAmount);
            
            if (winAmountEl) {
                winAmountEl.textContent = `+${winAmount}`;
                
                // Check for big win (10x or more)
                if (winAmount >= betAmount * 10) {
                    winAmountEl.classList.add('big-win');
                    App.showToast(`🎉 ДЖЕКПОТ: +${winAmount}!`, 'success');
                    this.celebrateWin();
                } else {
                    winAmountEl.classList.add('win');
                    App.showToast(`Выигрыш: +${winAmount}`, 'success');
                }
            }
            
            App.hapticFeedback('success');
            
            // Highlight winning paylines
            this.highlightPaylines(result.paylines || result.winning_line);
            
        } else {
            // Loss
            App.updateBalance(-betAmount);
            
            if (winAmountEl) {
                winAmountEl.textContent = '0';
            }
            
            App.showToast(`Проигрыш: -${betAmount}`, 'error');
            App.hapticFeedback('error');
        }
    },
    
    highlightPaylines(paylines) {
        const reelsContainer = document.getElementById('slots-reels');
        if (!reelsContainer) return;
        
        // Add winning animation to reels
        const reels = document.querySelectorAll('.reel');
        reels.forEach(reel => {
            reel.classList.add('winner');
        });
        
        // Pulse animation on container
        reelsContainer.style.animation = 'winPulse 0.5s ease 3';
        
        setTimeout(() => {
            reels.forEach(reel => {
                reel.classList.remove('winner');
            });
            reelsContainer.style.animation = '';
        }, 2000);
    },
    
    celebrateWin() {
        // Create confetti effect for big wins
        const container = document.getElementById('screen-slots');
        if (!container) return;
        
        const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6eff', '#ffffff'];
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.animationDelay = Math.random() * 1 + 's';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            container.appendChild(confetti);
            
            // Remove confetti after animation
            setTimeout(() => confetti.remove(), 3000);
        }
    },
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

window.SlotsGame = SlotsGame;
