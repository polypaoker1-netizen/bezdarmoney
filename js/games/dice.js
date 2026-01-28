/**
 * Dice Game Module
 */

const DiceGame = {
    isPlaying: false,
    
    init() {
        this.setupSlider();
        this.setupRollButton();
    },
    
    setupSlider() {
        const slider = document.getElementById('dice-slider');
        const targetDisplay = document.getElementById('dice-target');
        const chanceDisplay = document.getElementById('dice-chance');
        const multiplierDisplay = document.getElementById('dice-multiplier');
        
        if (!slider) return;
        
        const updateDisplay = () => {
            const target = parseInt(slider.value);
            const chance = target - 1;
            const multiplier = chance > 0 ? (98 / chance).toFixed(2) : 0;
            
            targetDisplay.textContent = target;
            chanceDisplay.textContent = `${chance}%`;
            multiplierDisplay.textContent = `${multiplier}x`;
            
            // Update slider gradient
            const percent = ((target - 2) / 96) * 100;
            slider.style.setProperty('--slider-value', `${percent}%`);
        };
        
        slider.addEventListener('input', updateDisplay);
        updateDisplay();
    },
    
    setupRollButton() {
        const rollBtn = document.getElementById('dice-roll-btn');
        if (!rollBtn) return;
        
        rollBtn.addEventListener('click', () => this.roll());
    },
    
    async roll() {
        if (this.isPlaying) return;
        
        const betInput = document.getElementById('dice-bet');
        const slider = document.getElementById('dice-slider');
        const resultDisplay = document.getElementById('dice-result');
        const rollBtn = document.getElementById('dice-roll-btn');
        
        const betAmount = parseInt(betInput.value) || 0;
        const target = parseInt(slider.value);
        
        if (!App.canBet(betAmount)) return;
        
        this.isPlaying = true;
        rollBtn.disabled = true;
        
        // Animate result
        resultDisplay.className = 'dice-result';
        resultDisplay.textContent = '?';
        
        // Rolling animation
        const rollAnimation = setInterval(() => {
            resultDisplay.textContent = Math.floor(Math.random() * 100) + 1;
        }, 50);
        
        App.hapticFeedback('medium');
        
        try {
            // Call API
            const result = await API.playDice(target, betAmount);
            
            // Stop animation
            clearInterval(rollAnimation);
            
            // Show result
            resultDisplay.textContent = result.roll;
            
            if (result.is_win) {
                resultDisplay.classList.add('win');
                App.updateBalance(result.win_amount - betAmount);
                App.showToast(`Выигрыш: +${result.win_amount}`, 'success');
                App.hapticFeedback('success');
            } else {
                resultDisplay.classList.add('lose');
                App.updateBalance(-betAmount);
                App.showToast(`Проигрыш: -${betAmount}`, 'error');
                App.hapticFeedback('error');
            }
        } catch (error) {
            clearInterval(rollAnimation);
            resultDisplay.textContent = '!';
            App.showToast('Ошибка: ' + error.message, 'error');
        } finally {
            this.isPlaying = false;
            rollBtn.disabled = false;
        }
    }
};

window.DiceGame = DiceGame;
