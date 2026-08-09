/**
 * ============================================
 *  BudgetPro — Storage Module (LocalStorage)
 * ============================================
 */

const Storage = (() => {

    const KEYS = {
        TRANSACTIONS: 'bp_transactions',
        BUDGETS: 'bp_budgets',
        SETTINGS: 'bp_settings',
        INITIALIZED: 'bp_initialized',
        GOALS: 'bp_goals',
        NOTIFICATIONS: 'bp_notifications',
        WALLETS: 'bp_wallets',
        ACTIVE_WALLET: 'bp_active_wallet',
        RECURRING: 'bp_recurring'
    };

    /* ---------- Generic Helpers ---------- */
    function _get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Storage read error:', e);
            return null;
        }
    }

    function _set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Storage write error:', e);
        }
    }

    /* ========== WALLETS ========== */
    function getWallets() {
        let wallets = _get(KEYS.WALLETS);
        if (!wallets || wallets.length === 0) {
            // Migration for existing users: Create default wallet
            const mainWallet = {
                id: 'wallet_main',
                name: 'Main Wallet',
                currency: 'BDT',
                color: '#6c5ce7',
                balance: 0
            };
            _set(KEYS.WALLETS, [mainWallet]);
            setActiveWalletId('all');

            // Migrate old transactions
            const txs = _get(KEYS.TRANSACTIONS) || [];
            let modified = false;
            txs.forEach(t => {
                if (!t.walletId) {
                    t.walletId = 'wallet_main';
                    modified = true;
                }
            });
            if (modified) _set(KEYS.TRANSACTIONS, txs);
            
            return [mainWallet];
        }
        return wallets;
    }

    function saveWallet(wallet) {
        const wallets = getWallets();
        if (wallet.id) {
            const idx = wallets.findIndex(w => w.id === wallet.id);
            if (idx > -1) wallets[idx] = wallet;
            else wallets.push(wallet);
        } else {
            wallet.id = 'wallet_' + Date.now();
            wallets.push(wallet);
        }
        _set(KEYS.WALLETS, wallets);
        return wallet;
    }

    function deleteWallet(id) {
        let wallets = getWallets().filter(w => w.id !== id);
        _set(KEYS.WALLETS, wallets);
        if (getActiveWalletId() === id) {
            setActiveWalletId('all');
        }
    }

    function getActiveWalletId() {
        return localStorage.getItem(KEYS.ACTIVE_WALLET) || 'all';
    }

    function setActiveWalletId(id) {
        localStorage.setItem(KEYS.ACTIVE_WALLET, id);
    }

    /* ========== TRANSACTIONS ========== */
    function getAllTransactions() {
        return _get(KEYS.TRANSACTIONS) || [];
    }

    function getTransactions() {
        const activeId = getActiveWalletId();
        let txs = getAllTransactions();
        
        if (activeId !== 'all') {
            txs = txs.filter(t => t.walletId === activeId);
        } else {
            // Convert everything to base currency for global aggregation
            const baseCode = getSettings().currency || 'BDT';
            const wallets = _get(KEYS.WALLETS) || [];
            txs = txs.map(t => {
                const w = wallets.find(w => w.id === t.walletId);
                const wCurrency = w ? (w.currency === '৳' || w.currency === 'Tk' ? 'BDT' : w.currency) : 'BDT';
                const converted = { ...t };
                converted.originalAmount = t.amount;
                converted.amount = Utils.convertCurrency(t.amount, wCurrency, baseCode);
                return converted;
            });
        }

        return txs.sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });
    }

    function addTransaction(data) {
        const transactions = getAllTransactions();
        const tx = {
            id: Utils.generateId(),
            walletId: data.walletId || (getActiveWalletId() !== 'all' ? getActiveWalletId() : 'wallet_main'),
            type: data.type,         // 'income' or 'expense'
            amount: parseFloat(data.amount),
            category: data.category,
            customCategory: data.customCategory || '',
            date: data.date,
            note: data.note || '',
            createdAt: new Date().toISOString()
        };
        // Fix for fallback walletId if active is 'all' and no walletId provided
        if (tx.walletId === 'all') tx.walletId = 'wallet_main';
        
        transactions.push(tx);
        _set(KEYS.TRANSACTIONS, transactions);
        return tx;
    }

    function updateTransaction(id, data) {
        const transactions = getAllTransactions();
        const idx = transactions.findIndex(t => t.id === id);
        if (idx === -1) return null;
        transactions[idx] = {
            ...transactions[idx],
            walletId: data.walletId || transactions[idx].walletId,
            type: data.type,
            amount: parseFloat(data.amount),
            category: data.category,
            customCategory: data.customCategory !== undefined ? data.customCategory : (transactions[idx].customCategory || ''),
            date: data.date,
            note: data.note || '',
            updatedAt: new Date().toISOString()
        };
        _set(KEYS.TRANSACTIONS, transactions);
        return transactions[idx];
    }

    function deleteTransaction(id) {
        const transactions = getAllTransactions().filter(t => t.id !== id);
        _set(KEYS.TRANSACTIONS, transactions);
    }

    function getTransactionsByMonth(monthKey) {
        return getTransactions().filter(t => Utils.getMonthKey(t.date) === monthKey);
    }

    /* ========== BUDGETS ========== */
    function getBudgets() {
        return _get(KEYS.BUDGETS) || [];
    }

    function setBudget(categoryId, monthKey, amount, customCategory = null) {
        const budgets = getBudgets();
        const idx = budgets.findIndex(b => b.categoryId === categoryId && b.month === monthKey);
        if (idx >= 0) {
            budgets[idx].amount = parseFloat(amount);
            if (customCategory) budgets[idx].customCategory = customCategory;
            else delete budgets[idx].customCategory;
        } else {
            const newBudget = {
                id: Utils.generateId(),
                categoryId,
                month: monthKey,
                amount: parseFloat(amount)
            };
            if (customCategory) newBudget.customCategory = customCategory;
            budgets.push(newBudget);
        }
        _set(KEYS.BUDGETS, budgets);
    }

    function deleteBudget(categoryId, monthKey) {
        const budgets = getBudgets().filter(b => !(b.categoryId === categoryId && b.month === monthKey));
        _set(KEYS.BUDGETS, budgets);
    }

    function getBudgetsByMonth(monthKey) {
        return getBudgets().filter(b => b.month === monthKey);
    }

    function getCategorySpentInMonth(categoryId, monthKey) {
        return getTransactionsByMonth(monthKey)
            .filter(t => t.type === 'expense' && t.category === categoryId)
            .reduce((sum, t) => sum + t.amount, 0);
    }

    /* ========== SAVINGS GOALS ========== */
    function getSavingsGoals() {
        return _get(KEYS.GOALS) || [];
    }

    function saveSavingsGoal(goal) {
        const goals = getSavingsGoals();
        if (goal.id) {
            const index = goals.findIndex(g => g.id === goal.id);
            if (index > -1) goals[index] = goal;
            else goals.push(goal);
        } else {
            goal.id = 'goal_' + Date.now();
            if (!goal.color) {
                const colors = ['#00d4aa', '#6c5ce7', '#ff6b6b', '#ffd93d', '#f39c12', '#00b894'];
                goal.color = colors[goals.length % colors.length];
            }
            goals.push(goal);
        }
        _set(KEYS.GOALS, goals);
    }

    function deleteSavingsGoal(id) {
        const goals = getSavingsGoals().filter(g => g.id !== id);
        _set(KEYS.GOALS, goals);
    }

    /* ========== NOTIFICATIONS ========== */
    function getNotifications() {
        return _get(KEYS.NOTIFICATIONS) || [];
    }

    function addNotification(text) {
        const notifs = getNotifications();
        notifs.unshift({
            id: 'notif_' + Date.now(),
            text,
            date: new Date().toISOString(),
            read: false
        });
        // Keep max 50 notifications
        if (notifs.length > 50) notifs.length = 50;
        _set(KEYS.NOTIFICATIONS, notifs);
    }

    function markNotificationsRead() {
        const notifications = getNotifications();
        notifications.forEach(n => n.read = true);
        _set(KEYS.NOTIFICATIONS, notifications);
    }

    /* ========== RECURRING TRANSACTIONS ========== */
    function getRecurringTransactions() {
        return _get(KEYS.RECURRING) || [];
    }

    function saveRecurringTransaction(item) {
        const list = getRecurringTransactions();
        if (item.id) {
            const idx = list.findIndex(r => r.id === item.id);
            if (idx > -1) list[idx] = item;
            else list.push(item);
        } else {
            item.id = 'rec_' + Date.now();
            list.push(item);
        }
        _set(KEYS.RECURRING, list);
        return item;
    }

    function deleteRecurringTransaction(id) {
        const list = getRecurringTransactions().filter(r => r.id !== id);
        _set(KEYS.RECURRING, list);
    }

    function processRecurringDues() {
        const list = getRecurringTransactions();
        const today = Utils.getTodayString();
        let changed = false;

        list.forEach(rec => {
            if (!rec.isActive) return;
            // Generate transactions for all due dates up to today
            while (rec.nextDueDate && rec.nextDueDate <= today) {
                // Create the actual transaction
                addTransaction({
                    type: rec.type || 'expense',
                    amount: rec.amount,
                    category: rec.category,
                    date: rec.nextDueDate,
                    note: rec.note ? `[Auto] ${rec.note}` : '[Auto] Recurring',
                    walletId: rec.walletId || 'wallet_main'
                });

                // Advance nextDueDate
                const d = new Date(rec.nextDueDate);
                if (rec.frequency === 'daily') d.setDate(d.getDate() + 1);
                else if (rec.frequency === 'weekly') d.setDate(d.getDate() + 7);
                else d.setMonth(d.getMonth() + 1); // monthly default

                rec.nextDueDate = d.toISOString().split('T')[0];
                changed = true;
            }
        });

        if (changed) _set(KEYS.RECURRING, list);
    }

    function getUpcomingBills(days = 7) {
        const list = getRecurringTransactions().filter(r => r.isActive);
        const today = new Date();
        const cutoff = new Date(today);
        cutoff.setDate(cutoff.getDate() + days);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        const todayStr = Utils.getTodayString();

        return list.filter(r => r.nextDueDate && r.nextDueDate >= todayStr && r.nextDueDate <= cutoffStr)
                   .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
    }

    /* ========== SETTINGS ========== */
    const DEFAULT_SETTINGS = {
        currency: 'BDT',
        theme: 'dark',
        monthlyTarget: 0,
        accentColor: 'purple'
    };

    function getSettings() {
        return { ...DEFAULT_SETTINGS, ...(_get(KEYS.SETTINGS) || {}) };
    }

    function updateSettings(partial) {
        const settings = getSettings();
        _set(KEYS.SETTINGS, { ...settings, ...partial });
    }

    /* ========== MONTHLY SUMMARY ========== */
    function getMonthlySummary(monthKey) {
        const txs = getTransactionsByMonth(monthKey);
        const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        return {
            income,
            expense,
            balance: income - expense,
            savingsRate: income > 0 ? Math.round(((income - expense) / income) * 100) : 0,
            transactionCount: txs.length
        };
    }

    function getCategoryBreakdown(monthKey) {
        const txs = getTransactionsByMonth(monthKey).filter(t => t.type === 'expense');
        const breakdown = {};
        txs.forEach(t => {
            if (!breakdown[t.category]) {
                breakdown[t.category] = 0;
            }
            breakdown[t.category] += t.amount;
        });
        return Object.entries(breakdown)
            .map(([categoryId, amount]) => ({
                category: Utils.getCategoryById(categoryId),
                amount
            }))
            .sort((a, b) => b.amount - a.amount);
    }

    /* ========== EXPORT / IMPORT ========== */
    function exportData() {
        const data = {
            version: 2,
            exportDate: new Date().toISOString(),
            wallets: getWallets(),
            transactions: getAllTransactions(),
            budgets: getBudgets(),
            settings: getSettings(),
            goals: getSavingsGoals(),
            notifications: getNotifications(),
            recurring: getRecurringTransactions()
        };
        return JSON.stringify(data, null, 2);
    }

    function importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!data.transactions || !Array.isArray(data.transactions)) {
                throw new Error('Invalid data format');
            }
            _set(KEYS.TRANSACTIONS, data.transactions);
            if (data.wallets) _set(KEYS.WALLETS, data.wallets);
            if (data.budgets) _set(KEYS.BUDGETS, data.budgets);
            if (data.settings) _set(KEYS.SETTINGS, data.settings);
            if (data.goals) _set(KEYS.GOALS, data.goals);
            if (data.notifications) _set(KEYS.NOTIFICATIONS, data.notifications);
            if (data.recurring) _set(KEYS.RECURRING, data.recurring);
            return true;
        } catch (e) {
            console.error('Import error:', e);
            return false;
        }
    }

    function clearAll() {
        localStorage.removeItem(KEYS.TRANSACTIONS);
        localStorage.removeItem(KEYS.BUDGETS);
        localStorage.removeItem(KEYS.SETTINGS);
        localStorage.removeItem(KEYS.INITIALIZED);
        localStorage.removeItem(KEYS.GOALS);
        localStorage.removeItem(KEYS.NOTIFICATIONS);
        localStorage.removeItem(KEYS.WALLETS);
        localStorage.removeItem(KEYS.ACTIVE_WALLET);
    }

    /* ========== SEED DATA ========== */
    function seedDefaultData() {
        if (_get(KEYS.INITIALIZED)) return;

        const now = new Date();
        const currentMonth = Utils.getCurrentMonthKey();
        const lastMonth = Utils.getMonthOffset(currentMonth, -1);
        const twoMonthsAgo = Utils.getMonthOffset(currentMonth, -2);
        const threeMonthsAgo = Utils.getMonthOffset(currentMonth, -3);
        const fourMonthsAgo = Utils.getMonthOffset(currentMonth, -4);
        const fiveMonthsAgo = Utils.getMonthOffset(currentMonth, -5);

        function randomDay(monthKey) {
            const [y, m] = monthKey.split('-').map(Number);
            const maxDay = monthKey === currentMonth ? now.getDate() : new Date(y, m, 0).getDate();
            const day = Math.floor(Math.random() * maxDay) + 1;
            return `${monthKey}-${String(day).padStart(2, '0')}`;
        }

        // Seed Default Wallet
        const mainWallet = {
            id: 'wallet_main',
            name: 'Main Wallet',
            currency: 'BDT',
            color: '#6c5ce7',
            balance: 0 // starting balance, or just calculated
        };
        _set(KEYS.WALLETS, [mainWallet]);
        setActiveWalletId('all');

        // Initial Transactions
        const sampleTransactions = [
            // Current month
            { walletId: 'wallet_main', type: 'income', amount: 65000, category: 'salary', date: `${currentMonth}-01`, note: 'Monthly Salary' },
            { walletId: 'wallet_main', type: 'income', amount: 15000, category: 'freelance', date: randomDay(currentMonth), note: 'Web design project' },
            { walletId: 'wallet_main', type: 'expense', amount: 4500, category: 'food', date: randomDay(currentMonth), note: 'Restaurant dinners' },
            { walletId: 'wallet_main', type: 'expense', amount: 2200, category: 'transport', date: randomDay(currentMonth), note: 'Uber rides' },
            { walletId: 'wallet_main', type: 'expense', amount: 8500, category: 'rent', date: `${currentMonth}-05`, note: 'Monthly rent' },
            { walletId: 'wallet_main', type: 'expense', amount: 3200, category: 'grocery', date: randomDay(currentMonth), note: 'Weekly groceries' },
            { walletId: 'wallet_main', type: 'expense', amount: 1500, category: 'entertainment', date: randomDay(currentMonth), note: 'Movie & snacks' },
            { walletId: 'wallet_main', type: 'expense', amount: 2800, category: 'bills', date: randomDay(currentMonth), note: 'Electricity & Internet' },
            { walletId: 'wallet_main', type: 'expense', amount: 3500, category: 'shopping', date: randomDay(currentMonth), note: 'New clothes' },
            { walletId: 'wallet_main', type: 'expense', amount: 1200, category: 'health', date: randomDay(currentMonth), note: 'Gym membership' },

            // Last month
            { walletId: 'wallet_main', type: 'income', amount: 65000, category: 'salary', date: `${lastMonth}-01`, note: 'Monthly Salary' },
            { walletId: 'wallet_main', type: 'income', amount: 8000, category: 'freelance', date: randomDay(lastMonth), note: 'Logo design' },
            { walletId: 'wallet_main', type: 'expense', amount: 5200, category: 'food', date: randomDay(lastMonth), note: 'Dining out' },
            { walletId: 'wallet_main', type: 'expense', amount: 1800, category: 'transport', date: randomDay(lastMonth), note: 'Bus & CNG' },
            { walletId: 'wallet_main', type: 'expense', amount: 8500, category: 'rent', date: `${lastMonth}-05`, note: 'Monthly rent' },
            { walletId: 'wallet_main', type: 'expense', amount: 4100, category: 'grocery', date: randomDay(lastMonth), note: 'Groceries' },
            { walletId: 'wallet_main', type: 'expense', amount: 2000, category: 'entertainment', date: randomDay(lastMonth), note: 'Netflix & games' },
            { walletId: 'wallet_main', type: 'expense', amount: 3100, category: 'bills', date: randomDay(lastMonth), note: 'Utilities' },
            { walletId: 'wallet_main', type: 'expense', amount: 6000, category: 'education', date: randomDay(lastMonth), note: 'Online course' },
            { walletId: 'wallet_main', type: 'expense', amount: 1200, category: 'health', date: randomDay(lastMonth), note: 'Gym' },

            // 2 months ago
            { walletId: 'wallet_main', type: 'income', amount: 65000, category: 'salary', date: `${twoMonthsAgo}-01`, note: 'Monthly Salary' },
            { walletId: 'wallet_main', type: 'income', amount: 12000, category: 'freelance', date: randomDay(twoMonthsAgo), note: 'App development' },
            { walletId: 'wallet_main', type: 'expense', amount: 3800, category: 'food', date: randomDay(twoMonthsAgo), note: 'Food expenses' },
            { walletId: 'wallet_main', type: 'expense', amount: 2500, category: 'transport', date: randomDay(twoMonthsAgo), note: 'Travel' },
            { walletId: 'wallet_main', type: 'expense', amount: 8500, category: 'rent', date: `${twoMonthsAgo}-05`, note: 'Monthly rent' },
            { walletId: 'wallet_main', type: 'expense', amount: 3600, category: 'grocery', date: randomDay(twoMonthsAgo), note: 'Groceries' },
            { walletId: 'wallet_main', type: 'expense', amount: 4500, category: 'shopping', date: randomDay(twoMonthsAgo), note: 'Electronics' },
            { walletId: 'wallet_main', type: 'expense', amount: 2900, category: 'bills', date: randomDay(twoMonthsAgo), note: 'Utilities' },

            // 3 months ago
            { walletId: 'wallet_main', type: 'income', amount: 60000, category: 'salary', date: `${threeMonthsAgo}-01`, note: 'Monthly Salary' },
            { walletId: 'wallet_main', type: 'expense', amount: 4200, category: 'food', date: randomDay(threeMonthsAgo), note: 'Dining' },
            { walletId: 'wallet_main', type: 'expense', amount: 8500, category: 'rent', date: `${threeMonthsAgo}-05`, note: 'Monthly rent' },
            { walletId: 'wallet_main', type: 'expense', amount: 2800, category: 'grocery', date: randomDay(threeMonthsAgo), note: 'Groceries' },
            { walletId: 'wallet_main', type: 'expense', amount: 3500, category: 'bills', date: randomDay(threeMonthsAgo), note: 'Utilities' },
            { walletId: 'wallet_main', type: 'expense', amount: 1500, category: 'personal', date: randomDay(threeMonthsAgo), note: 'Haircut & grooming' },

            // 4 months ago
            { walletId: 'wallet_main', type: 'income', amount: 60000, category: 'salary', date: `${fourMonthsAgo}-01`, note: 'Monthly Salary' },
            { walletId: 'wallet_main', type: 'income', amount: 5000, category: 'gift', date: randomDay(fourMonthsAgo), note: 'Birthday gift' },
            { walletId: 'wallet_main', type: 'expense', amount: 3900, category: 'food', date: randomDay(fourMonthsAgo), note: 'Food' },
            { walletId: 'wallet_main', type: 'expense', amount: 8500, category: 'rent', date: `${fourMonthsAgo}-05`, note: 'Rent' },
            { walletId: 'wallet_main', type: 'expense', amount: 3200, category: 'grocery', date: randomDay(fourMonthsAgo), note: 'Groceries' },
            { walletId: 'wallet_main', type: 'expense', amount: 7000, category: 'shopping', date: randomDay(fourMonthsAgo), note: 'Furniture' },
            { walletId: 'wallet_main', type: 'expense', amount: 2500, category: 'bills', date: randomDay(fourMonthsAgo), note: 'Utilities' },

            // 5 months ago
            { walletId: 'wallet_main', type: 'income', amount: 60000, category: 'salary', date: `${fiveMonthsAgo}-01`, note: 'Monthly Salary' },
            { walletId: 'wallet_main', type: 'expense', amount: 4800, category: 'food', date: randomDay(fiveMonthsAgo), note: 'Food expenses' },
            { walletId: 'wallet_main', type: 'expense', amount: 8500, category: 'rent', date: `${fiveMonthsAgo}-05`, note: 'Rent' },
            { walletId: 'wallet_main', type: 'expense', amount: 3400, category: 'grocery', date: randomDay(fiveMonthsAgo), note: 'Groceries' },
            { walletId: 'wallet_main', type: 'expense', amount: 2000, category: 'transport', date: randomDay(fiveMonthsAgo), note: 'Rides' },
            { walletId: 'wallet_main', type: 'expense', amount: 3000, category: 'bills', date: randomDay(fiveMonthsAgo), note: 'Utilities' },
        ];

        const transactions = sampleTransactions.map(t => ({
            ...t,
            id: Utils.generateId(),
            createdAt: new Date().toISOString()
        }));

        _set(KEYS.TRANSACTIONS, transactions);

        // Seed budgets for current month
        const sampleBudgets = [
            { categoryId: 'food', month: currentMonth, amount: 6000 },
            { categoryId: 'transport', month: currentMonth, amount: 3000 },
            { categoryId: 'shopping', month: currentMonth, amount: 5000 },
            { categoryId: 'bills', month: currentMonth, amount: 4000 },
            { categoryId: 'entertainment', month: currentMonth, amount: 2000 },
            { categoryId: 'grocery', month: currentMonth, amount: 5000 },
            { categoryId: 'rent', month: currentMonth, amount: 9000 },
            { categoryId: 'health', month: currentMonth, amount: 2000 },
        ].map(b => ({ ...b, id: Utils.generateId() }));

        _set(KEYS.BUDGETS, sampleBudgets);

        // Seed Goals
        _set(KEYS.GOALS, [
            { id: 'goal_1', name: 'Emergency Fund', target: 50000, saved: 15000, color: '#00d4aa' },
            { id: 'goal_2', name: 'New Laptop', target: 120000, saved: 40000, color: '#6c5ce7' }
        ]);

        // Seed Notifications
        _set(KEYS.NOTIFICATIONS, [
            { id: 'notif_1', text: 'You spent 20% more on Food this month.', date: new Date().toISOString(), read: false },
            { id: 'notif_2', text: 'Emergency Fund goal is 30% complete!', date: new Date(Date.now() - 86400000).toISOString(), read: true }
        ]);

        // Default settings
        _set(KEYS.SETTINGS, {
            currency: 'BDT',
            theme: 'dark',
            monthlyTarget: 40000
        });

        _set(KEYS.INITIALIZED, true);
    }

    /* ---------- Public API ---------- */
    return {
        init: seedDefaultData,
        getTransactions,
        getAllTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        getTransactionsByMonth,
        getBudgets,
        setBudget,
        deleteBudget,
        getBudgetsByMonth,
        getCategorySpentInMonth,
        getSavingsGoals,
        saveSavingsGoal,
        deleteSavingsGoal,
        getNotifications,
        addNotification,
        markNotificationsRead,
        getRecurringTransactions,
        saveRecurringTransaction,
        deleteRecurringTransaction,
        processRecurringDues,
        getUpcomingBills,
        getWallets,
        saveWallet,
        deleteWallet,
        getActiveWalletId,
        setActiveWalletId,
        getSettings,
        updateSettings,
        getMonthlySummary,
        getCategoryBreakdown,
        exportData,
        importData,
        clearAll,
        seedDefaultData
    };

})();
