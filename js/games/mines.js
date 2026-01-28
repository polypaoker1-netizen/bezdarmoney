/**
 * Mines Game Module
 */

const MinesGame = {
    isPlaying: false,
    minesCount: 5,
    revealed: [],
    minePositions: [],
    currentMultiplier: 1.0,
    betAmount: 0,
    
    init() {
        this.setupMinesCount();
        this.setupStartButton();
        this.setupCashoutButton();
        this.renderGrid();
    },
    
    setupMinesCount() {
        document.querySelectorAll('.mines-count-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isPlaying) return;
                
                document.querySelectorAll('.mines-count-btn').forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                
                this.minesCount = parseInt(btn.dataset.count);
                App.hapticFeedback('light');
            });
        });
    },
    
    setupStartButton() {
        const startBtn = document.getElementById('mines-start-btn');
        if (!startBtn) return;
        
        startBtn.addEventListener('click', () => this.startGame());
    },
    
    setupCashoutButton() {
        const cashoutBtn = document.getElementById('mines-cashout-btn');
        if (!cashoutBtn) return;
        
        cashoutBtn.addEventListener('click', () => this.cashout());
    },
    
    renderGrid() {
        const grid = document.getElementById('mines-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        for (let i = 0; i < 25; i++) {
            const cell = document.createElement('button');
            cell.className = 'mine-cell';
            cell.dataset.cell = i;
            cell.textContent = '';
            
            cell.addEventListener('click', () => {
                if (!this.isPlaying) return;
                if (this.revealed.includes(i)) return;
                
                this.revealCell(i);
            });
            
            grid.appendChild(cell);
        }
    },
    
    async startGame() {
        const betInput = document.getElementById('mines-bet');
        this.betAmount = parseInt(betInput.value) || 0;
        
        if (!App.canBet(this.betAmount)) return;
        
        App.showLoading(true);
        
        try {
            const result = await API.startMines(this.minesCount, this.betAmount);
            
            // Reset state
            this.revealed = [];
            this.minePositions = []; // Hidden until game over
            this.currentMultiplier = 1.0;
            this.isPlaying = true;
            
            // Update UI
            this.updateDisplay();
            this.resetGridVisual();
            
            // Hide setup, show actions
            document.getElementById('mines-setup').classList.add('hidden');
            document.getElementById('mines-actions').classList.remove('hidden');
            
            // Update balance (bet deducted)
            App.updateBalance(-this.betAmount);
            
            App.hapticFeedback('medium');
            
        } catch (error) {
            App.showToast('Ошибка: ' + error.message, 'error');
        } finally {
            App.showLoading(false);
        }
    },
    
    async revealCell(cellIndex) {
        if (!this.isPlaying) return;
        if (this.revealed.includes(cellIndex)) return;
        
        App.hapticFeedback('light');
        
        try {
            const result = await API.revealMine(cellIndex);
            
            this.revealed.push(cellIndex);
            
            const cell = document.querySelector(`[data-cell="${cellIndex}"]`);
            cell.classList.add('revealed');
            
            if (result.is_mine) {
                // Hit a mine - game over
                cell.classList.add('mine');
                cell.textContent = '💥';
                
                this.isPlaying = false;
                this.minePositions = result.mine_positions || [];
                
                // Reveal all mines
                this.revealAllMines();
                
                App.showToast(`Бум! Проигрыш: -${this.betAmount}`, 'error');
                App.hapticFeedback('error');
                
                this.endGame();
            } else {
                // Safe cell
                cell.classList.add('safe');
                cell.textContent = '💎';
                
                this.currentMultiplier = result.multiplier;
                this.updateDisplay();
                
                App.hapticFeedback('success');
                
                // Check if all safe cells revealed
                if (this.revealed.length >= 25 - this.minesCount) {
                    // Auto cashout
                    this.cashout();
                }
            }
            
        } catch (error) {
            App.showToast('Ошибка: ' + error.message, 'error');
        }
    },
    
    async cashout() {
        if (!this.isPlaying) return;
        if (this.revealed.length === 0) {
            App.showToast('Откройте хотя бы одну ячейку', 'error');
            return;
        }
        
        App.showLoading(true);
        
        try {
            const result = await API.cashoutMines();
            
            this.isPlaying = false;
            this.minePositions = result.mine_positions || [];
            
            // Reveal all mines
            this.revealAllMines();
            
            // Add winnings
            App.updateBalance(result.win_amount);
            
            App.showToast(`Выигрыш: +${result.win_amount}`, 'success');
            App.hapticFeedback('success');
            
            this.endGame();
            
        } catch (error) {
            App.showToast('Ошибка: ' + error.message, 'error');
        } finally {
            App.showLoading(false);
        }
    },
    
    revealAllMines() {
        this.minePositions.forEach(pos => {
            if (!this.revealed.includes(pos)) {
                const cell = document.querySelector(`[data-cell="${pos}"]`);
                if (cell) {
                    cell.classList.add('revealed', 'mine');
                    cell.textContent = '💣';
                }
            }
        });
    },
    
    resetGridVisual() {
        document.querySelectorAll('.mine-cell').forEach(cell => {
            cell.className = 'mine-cell';
            cell.textContent = '';
        });
    },
    
    updateDisplay() {
        const multiplierEl = document.getElementById('mines-multiplier');
        const potentialEl = document.getElementById('mines-potential');
        const cashoutAmountEl = document.getElementById('mines-cashout-amount');
        
        const potential = Math.floor(this.betAmount * this.currentMultiplier);
        
        if (multiplierEl) multiplierEl.textContent = `${this.currentMultiplier.toFixed(2)}x`;
        if (potentialEl) potentialEl.textContent = potential;
        if (cashoutAmountEl) cashoutAmountEl.textContent = potential;
    },
    
    endGame() {
        // Show setup, hide actions
        document.getElementById('mines-setup').classList.remove('hidden');
        document.getElementById('mines-actions').classList.add('hidden');
        
        // Reset after delay
        setTimeout(() => {
            if (!this.isPlaying) {
                this.resetGridVisual();
                this.currentMultiplier = 1.0;
                this.updateDisplay();
            }
        }, 3000);
    }
};

window.MinesGame = MinesGame;
