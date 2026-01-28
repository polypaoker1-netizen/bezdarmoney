/**
 * API Service for Casino WebApp
 * Handles all communication with the backend
 */

const API = {
    baseUrl: '/api',  // Change to your API URL in production
    
    /**
     * Get Telegram initData for authentication
     */
    getInitData() {
        return window.Telegram?.WebApp?.initData || '';
    },
    
    /**
     * Make authenticated API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': this.getInitData(),
            ...options.headers
        };
        
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || data.message || 'API Error');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    /**
     * GET request
     */
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },
    
    /**
     * POST request
     */
    async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },
    
    // ==========================================
    // User Endpoints
    // ==========================================
    
    async getProfile() {
        return this.get('/users/me');
    },
    
    async getBalance() {
        return this.get('/users/balance');
    },
    
    async updateClientSeed(seed) {
        return this.post('/users/client-seed', { client_seed: seed });
    },
    
    async rotateServerSeed() {
        return this.post('/users/rotate-seed', {});
    },
    
    // ==========================================
    // Game Endpoints
    // ==========================================
    
    // Dice
    async playDice(target, betAmount) {
        return this.post('/games/dice', {
            target,
            bet_amount: betAmount
        });
    },
    
    // Roulette
    async playRoulette(betType, betNumber, betAmount) {
        return this.post('/games/roulette', {
            bet_type: betType,
            bet_number: betNumber,
            bet_amount: betAmount
        });
    },
    
    // Mines
    async startMines(minesCount, betAmount) {
        return this.post('/games/mines/start', {
            mines_count: minesCount,
            bet_amount: betAmount
        });
    },
    
    async revealMine(cell) {
        return this.post('/games/mines/reveal', {
            cell
        });
    },
    
    async cashoutMines() {
        return this.post('/games/mines/cashout', {});
    },
    
    // Crash
    async startCrash(betAmount) {
        return this.post('/games/crash/start', {
            bet_amount: betAmount
        });
    },
    
    async cashoutCrash() {
        return this.post('/games/crash/cashout', {});
    },
    
    // Slots
    async playSlots(betAmount) {
        return this.post('/games/slots', {
            bet_amount: betAmount
        });
    },
    
    // ==========================================
    // Payment Endpoints
    // ==========================================
    
    async getInvoiceLink(stars) {
        return this.post('/payments/create-invoice', {
            stars_amount: stars
        });
    },
    
    async requestWithdrawal(amount) {
        return this.post('/payments/withdraw', {
            amount
        });
    },
    
    // ==========================================
    // History
    // ==========================================
    
    async getGameHistory(limit = 20) {
        return this.get(`/users/history?limit=${limit}`);
    }
};

// Export for use in other modules
window.API = API;
