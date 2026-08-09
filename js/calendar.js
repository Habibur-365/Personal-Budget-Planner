/**
 * ============================================
 *  BudgetPro — Calendar View
 * ============================================
 */

const Calendar = (() => {

    let currentMonthDate = new Date();

    /* ---------- Render ---------- */
    function render() {
        const monthKey = Utils.getMonthKey(currentMonthDate);
        document.getElementById('cal-month-label').textContent = Utils.formatMonthYear(monthKey);
        renderGrid(monthKey);
        setupEventListeners();
    }

    function renderGrid(monthKey) {
        const grid = document.getElementById('calendar-grid');
        if (!grid) return;

        const [year, month] = monthKey.split('-').map(Number);
        
        // First day of month
        const firstDay = new Date(year, month - 1, 1).getDay(); // 0 (Sun) to 6 (Sat)
        const daysInMonth = new Date(year, month, 0).getDate();

        // Use getTransactions (which auto-filters by active wallet)
        const txs = Storage.getTransactions().filter(t => Utils.getMonthKey(t.date) === monthKey);

        let html = '';

        // Empty cells for previous month
        for (let i = 0; i < firstDay; i++) {
            html += `<div class="cal-cell empty"></div>`;
        }

        const todayKey = Utils.getTodayString();

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === todayKey;

            const dayTxs = txs.filter(t => t.date === dateStr);
            const income = dayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            const expense = dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

            let dotsHtml = '';
            if (income > 0) dotsHtml += `<div class="cal-dot income" title="Income: ${Utils.formatCurrency(income)}">${Utils.formatCurrency(income)}</div>`;
            if (expense > 0) dotsHtml += `<div class="cal-dot expense" title="Expense: ${Utils.formatCurrency(expense)}">-${Utils.formatCurrency(expense, false).replace(Utils.getCurrencySymbol(), '')}</div>`;

            html += `
                <div class="cal-cell ${isToday ? 'today' : ''}" data-date="${dateStr}">
                    <div class="cal-date">${day}</div>
                    <div class="cal-dots">${dotsHtml}</div>
                </div>
            `;
        }

        grid.innerHTML = html;
    }

    function setupEventListeners() {
        const prevBtn = document.getElementById('cal-prev-month');
        const nextBtn = document.getElementById('cal-next-month');
        
        const handlePrev = () => {
            currentMonthDate.setMonth(currentMonthDate.getMonth() - 1);
            render();
        };
        const handleNext = () => {
            currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
            render();
        };

        prevBtn.replaceWith(prevBtn.cloneNode(true));
        nextBtn.replaceWith(nextBtn.cloneNode(true));

        document.getElementById('cal-prev-month').addEventListener('click', handlePrev);
        document.getElementById('cal-next-month').addEventListener('click', handleNext);
    }

    function refresh() {
        render();
    }

    return { render, refresh };

})();
