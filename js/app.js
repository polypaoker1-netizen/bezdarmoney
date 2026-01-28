/**
 * Main Application - Casino WebApp
 */

const App = {
    // State
    state: {
        user: null,
        balance: 0,
        currentScreen: 'home',
        isLoading: false
    },
    
    // Telegram WebApp instance
    tg: null,
    
    /**
     * Initialize the application
     */
    async init() {
        // Initialize Telegram WebApp
        this.tg = window.Telegram?.WebApp;
        
        if (this.tg) {
            this.tg.ready();
            this.tg.expand();
            
            // Apply Telegram theme
            this.applyTheme();
            
            // Setup back button
            this.tg.BackButton.onClick(() => this.goBack());
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load user data
        await this.loadUserData();
        
        // Initialize games
        this.initGames();
        
        console.log('Casino WebApp initialized');
    },
    
    /**
     * Apply Telegram theme colors
     */
    applyTheme() {
        if (!this.tg) return;
        
        const root = document.documentElement;
        const theme = this.tg.themeParams;
        
        if (theme.bg_color) {
            root.style.setProperty('--tg-theme-bg-color', theme.bg_color);
        }
        if (theme.text_color) {
            root.style.setProperty('--tg-theme-text-color', theme.text_color);
        }
        if (theme.hint_color) {
            root.style.setProperty('--tg-theme-hint-color', theme.hint_color);
        }
        if (theme.link_color) {
            root.style.setProperty('--tg-theme-link-color', theme.link_color);
        }
        if (theme.button_color) {
            root.style.setProperty('--tg-theme-button-color', theme.button_color);
        }
        if (theme.button_text_color) {
            root.style.setProperty('--tg-theme-button-text-color', theme.button_text_color);
        }
        if (theme.secondary_bg_color) {
            root.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color);
        }
    },
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Game cards
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', () => {
                const game = card.dataset.game;
                this.navigateTo(game);
                this.hapticFeedback('light');
            });
        });
        
        // Wallet button
        document.getElementById('wallet-btn')?.addEventListener('click', () => {
            this.navigateTo('wallet');
            this.hapticFeedback('light');
        });
        
        // History button
        document.getElementById('history-btn')?.addEventListener('click', () => {
            this.navigateTo('history');
            this.loadHistory();
            this.hapticFeedback('light');
        });
        
        // Stats button
        document.getElementById('stats-btn')?.addEventListener('click', () => {
            this.navigateTo('stats');
            this.loadStats();
            this.hapticFeedback('light');
        });
        
        // Back button
        document.getElementById('back-btn')?.addEventListener('click', () => {
            this.goBack();
            this.hapticFeedback('light');
        });
        
        // Deposit buttons
        document.querySelectorAll('.deposit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const stars = parseInt(btn.dataset.stars);
                this.handleDeposit(stars);
                this.hapticFeedback('medium');
            });
        });
        
        // Withdraw button
        document.getElementById('withdraw-btn')?.addEventListener('click', () => {
            const amount = parseInt(document.getElementById('withdraw-amount').value);
            if (amount >= 100) {
                this.handleWithdraw(amount);
            } else {
                this.showToast('Минимальная сумма: 100', 'error');
            }
        });
        
        // Bet adjustment buttons
        document.querySelectorAll('.bet-adjust').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const container = e.target.closest('.bet-input-container');
                const input = container?.querySelector('.bet-input');
                const action = btn.dataset.action;
                if (input && action) {
                    this.adjustBet(input, action);
                    this.hapticFeedback('light');
                }
            });
        });
        
        // Bet preset buttons
        document.querySelectorAll('.bet-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.closest('.bet-section');
                const input = section?.querySelector('.bet-input');
                const amount = btn.dataset.amount;
                if (input) {
                    if (amount === 'max') {
                        input.value = this.state.balance;
                    } else {
                        input.value = amount;
                    }
                    this.hapticFeedback('light');
                }
            });
        });
    },
    
    /**
     * Initialize game modules
     */
    initGames() {
        if (window.DiceGame) DiceGame.init();
        if (window.RouletteGame) RouletteGame.init();
        if (window.MinesGame) MinesGame.init();
        if (window.CrashGame) CrashGame.init();
        if (window.SlotsGame) SlotsGame.init();
    },
    
    /**
     * Load user data from API
     */
    async loadUserData() {
        try {
            this.showLoading(true);
            
            // Try to get profile from API
            const profile = await API.getProfile();
            this.state.user = profile;
            this.state.balance = profile.balance || 0;
            
            this.updateBalanceDisplay();
        } catch (error) {
            console.error('Failed to load user data:', error);
            // Use default balance for demo
            this.state.balance = 1000;
            this.updateBalanceDisplay();
        } finally {
            this.showLoading(false);
        }
    },
    
    /**
     * Update balance display
     */
    updateBalanceDisplay() {
        const balanceEl = document.getElementById('balance-amount');
        const walletBalanceEl = document.getElementById('wallet-balance');
        
        if (balanceEl) {
            balanceEl.textContent = this.formatNumber(this.state.balance);
        }
        if (walletBalanceEl) {
            walletBalanceEl.textContent = this.formatNumber(this.state.balance);
        }
    },
    
    /**
     * Format number with spaces
     */
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    },
    
    /**
     * Navigate to a screen
     */
    navigateTo(screen) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
        });
        
        // Show target screen
        const targetScreen = document.getElementById(`screen-${screen}`);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
        
        // Update header
        this.updateHeader(screen);
        
        // Update state
        this.state.currentScreen = screen;
        
        // Show/hide Telegram back button
        if (this.tg && screen !== 'home') {
            this.tg.BackButton.show();
        } else if (this.tg) {
            this.tg.BackButton.hide();
        }
        
        // Show/hide internal back button and logo
        const backBtn = document.getElementById('back-btn');
        const logo = document.getElementById('logo');
        if (backBtn) {
            backBtn.classList.toggle('hidden', screen === 'home');
        }
        if (logo) {
            logo.style.display = screen === 'home' ? 'flex' : 'none';
        }
        
        // Reinitialize Lucide icons for the new screen
        if (window.lucide) {
            setTimeout(() => lucide.createIcons(), 10);
        }
    },
    
    /**
     * Go back to home
     */
    goBack() {
        this.navigateTo('home');
    },
    
    /**
     * Update header based on screen
     */
    updateHeader(screen) {
        const titles = {
            home: 'CASINO',
            dice: 'Dice',
            roulette: 'Рулетка',
            mines: 'Mines',
            crash: 'Crash',
            slots: 'Slots',
            wallet: 'Кошелёк',
            history: 'История',
            stats: 'Статистика'
        };
        
        const titleEl = document.getElementById('page-title');
        if (titleEl) {
            titleEl.textContent = titles[screen] || '🎰 Казино';
        }
    },
    
    /**
     * Adjust bet amount
     */
    adjustBet(input, action) {
        let value = parseInt(input.value) || 0;
        
        switch (action) {
            case 'half':
                value = Math.max(1, Math.floor(value / 2));
                break;
            case 'double':
                value = Math.min(this.state.balance, value * 2);
                break;
        }
        
        input.value = value;
    },
    
    /**
     * Handle deposit (Stars purchase)
     */
    async handleDeposit(stars) {
        try {
            this.showLoading(true);
            
            // Get invoice link from API
            const { invoice_url } = await API.getInvoiceLink(stars);
            
            // Open invoice in Telegram
            if (this.tg) {
                this.tg.openInvoice(invoice_url, (status) => {
                    if (status === 'paid') {
                        this.showToast('Оплата успешна!', 'success');
                        this.loadUserData(); // Refresh balance
                    } else if (status === 'cancelled') {
                        this.showToast('Оплата отменена', 'info');
                    } else if (status === 'failed') {
                        this.showToast('Ошибка оплаты', 'error');
                    }
                });
            } else {
                // Fallback for browser testing
                window.open(invoice_url, '_blank');
            }
        } catch (error) {
            this.showToast('Ошибка: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    },
    
    /**
     * Handle withdrawal request
     */
    async handleWithdraw(amount) {
        try {
            if (amount > this.state.balance) {
                this.showToast('Недостаточно средств', 'error');
                return;
            }
            
            this.showLoading(true);
            
            await API.requestWithdrawal(amount);
            
            this.showToast('Заявка на вывод создана', 'success');
            this.loadUserData(); // Refresh balance
        } catch (error) {
            this.showToast('Ошибка: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    },
    
    /**
     * Load game history
     */
    async loadHistory() {
        try {
            const history = await API.getGameHistory(20);
            this.renderHistory(history);
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    },
    
    /**
     * Render history list
     */
    renderHistory(history) {
        const container = document.getElementById('history-list');
        if (!container) return;
        
        if (!history || history.length === 0) {
            container.innerHTML = `
                <div class="history-empty">
                    <i data-lucide="inbox"></i>
                    <span>Нет игр</span>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }
        
        container.innerHTML = history.map(game => `
            <div class="history-item">
                <div class="history-icon">
                    <i data-lucide="${this.getGameIcon(game.game_type)}"></i>
                </div>
                <div class="history-info">
                    <div class="history-game">${this.getGameName(game.game_type)}</div>
                    <div class="history-time">${this.formatTime(game.created_at)}</div>
                </div>
                <div class="history-result">
                    <div class="history-amount ${game.win_amount > 0 ? 'win' : 'loss'}">
                        ${game.win_amount > 0 ? '+' : ''}${this.formatNumber(game.win_amount - game.bet_amount)}
                    </div>
                    <div class="history-multiplier">${game.multiplier.toFixed(2)}x</div>
                </div>
            </div>
        `).join('');
        
        // Reinitialize Lucide icons
        if (window.lucide) lucide.createIcons();
    },
    
    /**
     * Load statistics
     */
    async loadStats() {
        try {
            const history = await API.getHistory();
            
            const totalGames = history.length;
            const wins = history.filter(g => g.win_amount > 0).length;
            const profit = history.reduce((sum, g) => sum + (g.win_amount - g.bet_amount), 0);
            const bestWin = Math.max(...history.map(g => g.win_amount), 0);
            
            document.getElementById('stats-total-games').textContent = totalGames;
            document.getElementById('stats-wins').textContent = wins;
            document.getElementById('stats-profit').textContent = (profit >= 0 ? '+' : '') + this.formatNumber(profit);
            document.getElementById('stats-best-win').textContent = this.formatNumber(bestWin);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    },
    
    /**
     * Get game icon name for Lucide
     */
    getGameIcon(gameType) {
        const icons = {
            dice: 'dices',
            roulette: 'circle-dot',
            mines: 'bomb',
            crash: 'trending-up',
            slots: 'cherry'
        };
        return icons[gameType] || 'gamepad-2';
    },
    
    /**
     * Get game display name
     */
    getGameName(gameType) {
        const names = {
            dice: 'Dice',
            roulette: 'Рулетка',
            mines: 'Mines',
            crash: 'Crash',
            slots: 'Slots'
        };
        return names[gameType] || gameType;
    },
    
    /**
     * Format timestamp
     */
    formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleString('ru-RU', { 
            day: 'numeric', 
            month: 'short', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    },
    
    /**
     * Update balance after game
     */
    updateBalance(change) {
        this.state.balance += change;
        this.updateBalanceDisplay();
    },
    
    /**
     * Check if user can bet
     */
    canBet(amount) {
        if (amount <= 0) {
            this.showToast('Введите ставку', 'error');
            return false;
        }
        if (amount > this.state.balance) {
            this.showToast('Недостаточно средств', 'error');
            return false;
        }
        return true;
    },
    
    /**
     * Show/hide loading overlay
     */
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.toggle('hidden', !show);
        }
        this.state.isLoading = show;
    },
    
    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const icons = {
            success: 'check-circle',
            error: 'alert-circle',
            info: 'info'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i data-lucide="${icons[type] || 'info'}"></i>
            <span class="toast-message">${message}</span>
        `;
        
        container.appendChild(toast);
        
        // Initialize icon
        if (window.lucide) lucide.createIcons();
        
        // Remove after animation
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 200);
        }, 3000);
        
        // Haptic feedback
        if (type === 'error') {
            this.hapticFeedback('error');
        } else if (type === 'success') {
            this.hapticFeedback('success');
        }
    },
    
    /**
     * Trigger haptic feedback
     */
    hapticFeedback(type) {
        if (!this.tg?.HapticFeedback) return;
        
        switch (type) {
            case 'light':
                this.tg.HapticFeedback.impactOccurred('light');
                break;
            case 'medium':
                this.tg.HapticFeedback.impactOccurred('medium');
                break;
            case 'heavy':
                this.tg.HapticFeedback.impactOccurred('heavy');
                break;
            case 'success':
                this.tg.HapticFeedback.notificationOccurred('success');
                break;
            case 'error':
                this.tg.HapticFeedback.notificationOccurred('error');
                break;
            case 'warning':
                this.tg.HapticFeedback.notificationOccurred('warning');
                break;
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Export for use in game modules
window.App = App;
