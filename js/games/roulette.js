/**
 * Roulette Game Module
 */

const RouletteGame = {
    isSpinning: false,
    selectedBet: null,
    selectedNumber: null,
    
    init() {
        this.setupBetButtons();
    },
    
    setupBetButtons() {
        // Bet type buttons
        document.querySelectorAll('.roulette-bet').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (this.isSpinning) return;
                
                const betType = btn.dataset.bet;
                
                // Handle number bet
                if (betType === 'number') {
                    const numberInput = document.getElementById('roulette-number');
                    const num = parseInt(numberInput.value);
                    
                    if (isNaN(num) || num < 0 || num > 36) {
                        App.showToast('Введите число от 0 до 36', 'error');
                        return;
                    }
                    
                    this.selectedNumber = num;
                }
                
                // Deselect others
                document.querySelectorAll('.roulette-bet').forEach(b => {
                    b.classList.remove('selected');
                });
                
                // Select this one
                btn.classList.add('selected');
                this.selectedBet = betType;
                
                App.hapticFeedback('light');
                
                // Auto-spin
                this.spin();
            });
        });
    },
    
    async spin() {
        if (this.isSpinning || !this.selectedBet) return;
        
        const betInput = document.getElementById('roulette-bet');
        const wheel = document.getElementById('roulette-wheel');
        const resultDisplay = document.getElementById('roulette-result');
        
        const betAmount = parseInt(betInput.value) || 0;
        
        if (!App.canBet(betAmount)) return;
        
        this.isSpinning = true;
        
        // Start spinning animation
        wheel.style.transition = 'none';
        wheel.style.transform = 'rotate(0deg)';
        
        // Force reflow
        wheel.offsetHeight;
        
        wheel.classList.add('spinning');
        resultDisplay.textContent = '?';
        
        App.hapticFeedback('medium');
        
        try {
            // Call API
            const result = await API.playRoulette(
                this.selectedBet,
                this.selectedNumber,
                betAmount
            );
            
            // Calculate final rotation to land on result
            const numberPositions = {
                0: 0, 32: 10, 15: 20, 19: 30, 4: 40, 21: 50, 2: 60, 25: 70,
                17: 80, 34: 90, 6: 100, 27: 110, 13: 120, 36: 130, 11: 140,
                30: 150, 8: 160, 23: 170, 10: 180, 5: 190, 24: 200, 16: 210,
                33: 220, 1: 230, 20: 240, 14: 250, 31: 260, 9: 270, 22: 280,
                18: 290, 29: 300, 7: 310, 28: 320, 12: 330, 35: 340, 3: 350, 26: 360
            };
            
            const targetAngle = numberPositions[result.result_number] || 0;
            const totalRotation = 1800 + targetAngle; // 5 full rotations + final position
            
            // Stop spinning class and animate to final position
            wheel.classList.remove('spinning');
            wheel.style.transition = 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
            wheel.style.transform = `rotate(${totalRotation}deg)`;
            
            // Wait for animation
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Show result
            resultDisplay.textContent = result.result_number;
            
            // Color the result
            if (result.result_color === 'green') {
                resultDisplay.style.color = '#00c853';
            } else if (result.result_color === 'red') {
                resultDisplay.style.color = '#ff5252';
            } else {
                resultDisplay.style.color = '#ffffff';
            }
            
            if (result.is_win) {
                App.updateBalance(result.win_amount - betAmount);
                App.showToast(`Выигрыш: +${result.win_amount}`, 'success');
                App.hapticFeedback('success');
            } else {
                App.updateBalance(-betAmount);
                App.showToast(`Проигрыш: -${betAmount}`, 'error');
                App.hapticFeedback('error');
            }
            
        } catch (error) {
            wheel.classList.remove('spinning');
            App.showToast('Ошибка: ' + error.message, 'error');
        } finally {
            this.isSpinning = false;
            this.selectedBet = null;
            this.selectedNumber = null;
            
            // Deselect bet buttons
            document.querySelectorAll('.roulette-bet').forEach(b => {
                b.classList.remove('selected');
            });
        }
    }
};

window.RouletteGame = RouletteGame;
