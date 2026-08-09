/**
 * ============================================
 *  BudgetPro — Utility Functions
 * ============================================
 */

const Utils = (() => {

    /* ---------- Currency & Exchange Rates ---------- */
    const CURRENCIES = [
        { code: 'USD', symbol: '$', rate: 1, name: 'US Dollar' },
        { code: 'BDT', symbol: 'Tk', rate: 120, name: 'Bangladeshi Taka' },
        { code: 'EUR', symbol: '€', rate: 0.92, name: 'Euro' },
        { code: 'GBP', symbol: '£', rate: 0.78, name: 'British Pound' },
        { code: 'INR', symbol: '₹', rate: 83, name: 'Indian Rupee' },
        { code: 'CAD', symbol: 'C$', rate: 1.36, name: 'Canadian Dollar' },
        { code: 'AUD', symbol: 'A$', rate: 1.50, name: 'Australian Dollar' }
    ];

    function convertCurrency(amount, fromCode, toCode) {
        if (fromCode === toCode) return amount;
        const from = CURRENCIES.find(c => c.code === fromCode);
        const to = CURRENCIES.find(c => c.code === toCode);
        if (!from || !to) return amount;
        // Convert to USD first, then to target
        const amountInUSD = amount / from.rate;
        return amountInUSD * to.rate;
    }

    function getBaseCurrencyCode() {
        if (typeof Storage !== 'undefined') {
            const settings = Storage.getSettings();
            return settings.currency || 'BDT'; // Default fallback
        }
        return 'BDT';
    }

    function getCurrencySymbol() {
        if (typeof Storage !== 'undefined') {
            const activeId = Storage.getActiveWalletId();
            if (activeId !== 'all') {
                const wallet = Storage.getWallets().find(w => w.id === activeId);
                // wallet.currency might be a symbol or code, let's treat it as code moving forward
                if (wallet) {
                    const c = CURRENCIES.find(x => x.code === wallet.currency || x.symbol === wallet.currency);
                    return c ? c.symbol : wallet.currency;
                }
            } else {
                try {
                    const settings = Storage.getSettings();
                    if (settings && settings.currency) {
                        const c = CURRENCIES.find(x => x.code === settings.currency);
                        return c ? c.symbol : 'Tk';
                    }
                } catch (e) { }
            }
        }
        return 'Tk';
    }

    function formatCurrency(amount, showSign = false) {
        const abs = Math.abs(amount);
        const formatted = abs.toLocaleString('en-IN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        const sign = showSign ? (amount >= 0 ? '+' : '-') : (amount < 0 ? '-' : '');
        const sym = getCurrencySymbol();
        return `${sign}${sym}${formatted}`;
    }

    function formatCurrencyRaw(amount, code, showSign = false) {
        const abs = Math.abs(amount);
        const formatted = abs.toLocaleString('en-IN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        const sign = showSign ? (amount >= 0 ? '+' : '-') : (amount < 0 ? '-' : '');
        const c = CURRENCIES.find(x => x.code === code || x.symbol === code);
        const sym = c ? c.symbol : code;
        return `${sign}${sym}${formatted}`;
    }

    /* ---------- Date Formatting ---------- */
    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function formatMonthYear(dateStr) {
        const d = new Date(dateStr + '-01');
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    function getCurrentMonthKey() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    function getMonthKey(date) {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    function getMonthOffset(monthKey, offset) {
        const [year, month] = monthKey.split('-').map(Number);
        const d = new Date(year, month - 1 + offset, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    function getLastNMonthKeys(n) {
        const months = [];
        const now = new Date();
        for (let i = n - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
        return months;
    }

    function getShortMonthLabel(monthKey) {
        const d = new Date(monthKey + '-01');
        return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }

    function getTodayString() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function getHeaderDateString() {
        return new Date().toLocaleDateString('en-US', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    /* ---------- UUID ---------- */
    function generateId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback for older environments
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /* ---------- XSS Sanitization ---------- */
    function sanitizeHTML(str) {
        if (!str) return '';
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    /* ---------- Debounce ---------- */
    function debounce(fn, delay = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    /* ---------- Toast Notifications ---------- */
    function showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('toast-show');
        });

        setTimeout(() => {
            toast.classList.remove('toast-show');
            toast.classList.add('toast-hide');
            setTimeout(() => toast.remove(), 400);
        }, duration);
    }

    /* ---------- Animated Counter ---------- */
    function animateCount(element, target, duration = 600) {
        const start = parseInt(element.textContent.replace(/[^0-9-]/g, '')) || 0;
        const diff = target - start;
        if (diff === 0) {
            element.textContent = formatCurrency(target);
            return;
        }
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + diff * eased);
            element.textContent = formatCurrency(current);
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        requestAnimationFrame(update);
    }

    /* ---------- Category Definitions ---------- */
    const EXPENSE_CATEGORIES = [
        { id: 'food', name: 'Food & Dining', icon: '🍽️', color: '#ff6b6b' },
        { id: 'transport', name: 'Transport', icon: '🚗', color: '#ffa502' },
        { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#e056a0' },
        { id: 'bills', name: 'Bills & Utilities', icon: '📄', color: '#7c6ff0' },
        { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#ff4757' },
        { id: 'health', name: 'Health & Fitness', icon: '🏥', color: '#2ed573' },
        { id: 'education', name: 'Education', icon: '📚', color: '#1e90ff' },
        { id: 'rent', name: 'Rent & Housing', icon: '🏠', color: '#ff7eb3' },
        { id: 'grocery', name: 'Groceries', icon: '🛒', color: '#00d4aa' },
        { id: 'personal', name: 'Personal Care', icon: '💆', color: '#c56cf0' },
        { id: 'other_expense', name: 'Other Expense', icon: '📌', color: '#8888a8' }
    ];

    const INCOME_CATEGORIES = [
        { id: 'salary', name: 'Salary', icon: '💼', color: '#00d4aa' },
        { id: 'freelance', name: 'Freelance', icon: '💻', color: '#1e90ff' },
        { id: 'investment', name: 'Investment', icon: '📈', color: '#ffd93d' },
        { id: 'gift', name: 'Gift', icon: '🎁', color: '#ff6b6b' },
        { id: 'other_income', name: 'Other Income', icon: '💰', color: '#7c6ff0' }
    ];

    function getCategoryById(id) {
        return [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find(c => c.id === id) ||
            { id: 'unknown', name: 'Unknown', icon: '❓', color: '#8888a8' };
    }

    function getCategoriesByType(type) {
        return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    }

    /* ---------- Chart Colors ---------- */
    const CHART_COLORS = [
        '#6c5ce7', '#00d4aa', '#ff6b6b', '#ffd93d', '#1e90ff',
        '#ff7eb3', '#ffa502', '#2ed573', '#c56cf0', '#e056a0',
        '#7c6ff0', '#ff4757'
    ];

    function getChartColors(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(CHART_COLORS[i % CHART_COLORS.length]);
        }
        return colors;
    }

    /* ---------- Public API ---------- */
    return {
        CURRENCIES,
        convertCurrency,
        getBaseCurrencyCode,
        getCurrencySymbol,
        formatCurrency,
        formatCurrencyRaw,
        formatDate,
        formatMonthYear,
        getCurrentMonthKey,
        getMonthKey,
        getMonthOffset,
        getLastNMonthKeys,
        getShortMonthLabel,
        getTodayString,
        getHeaderDateString,
        generateId,
        debounce,
        showToast,
        animateCount,
        EXPENSE_CATEGORIES,
        INCOME_CATEGORIES,
        getCategoryById,
        getCategoriesByType,
        CATEGORIES: {
            expense: EXPENSE_CATEGORIES,
            income: INCOME_CATEGORIES
        },
        CHART_COLORS,
        getChartColors,
        sanitizeHTML
    };

})();
