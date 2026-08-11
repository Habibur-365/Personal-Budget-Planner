/**
 * ============================================
 *  HR Fund Manager — Dashboard View
 * ============================================
 */

const Dashboard = (() => {

    let incomeExpenseChart = null;
    let categoryChart = null;

    /* ---------- Render Dashboard ---------- */
    function render() {
        const monthKey = Utils.getCurrentMonthKey();
        renderSummaryCards(monthKey);
        renderIncomeExpenseChart(monthKey);
        renderCategorySpendingChart(monthKey);
        renderBudgetHealth(monthKey);
        renderRecentTransactions();
        renderUpcomingBills();
    }

    /* ---------- Summary Cards ---------- */
    function renderSummaryCards(monthKey) {
        const summary = Storage.getMonthlySummary(monthKey);

        Utils.animateCount(document.getElementById('dash-total-income'), summary.income);
        Utils.animateCount(document.getElementById('dash-total-expense'), summary.expense);
        Utils.animateCount(document.getElementById('dash-balance'), summary.balance);

        const savingsEl = document.getElementById('dash-savings-rate');
        savingsEl.textContent = summary.savingsRate + '%';

        // AI Insights Logic
        generateAIInsights(monthKey);
    }

    function generateAIInsights(monthKey) {
        const textEl = document.getElementById('ai-insight-text');
        if (!textEl) return;

        const currentSummary = Storage.getMonthlySummary(monthKey);
        const lastMonthKey = Utils.getMonthOffset(monthKey, -1);
        const lastSummary = Storage.getMonthlySummary(lastMonthKey);

        const currentBreakdown = Storage.getCategoryBreakdown(monthKey);
        const lastBreakdown = Storage.getCategoryBreakdown(lastMonthKey);

        let maxIncrease = { cat: null, diffPercent: 0 };
        currentBreakdown.forEach(cb => {
            const lb = lastBreakdown.find(l => l.category.id === cb.category.id);
            if (lb && lb.amount > 0) {
                const diff = Math.round(((cb.amount - lb.amount) / lb.amount) * 100);
                if (diff > maxIncrease.diffPercent) {
                    maxIncrease = { cat: cb.category, diffPercent: diff };
                }
            }
        });

        if (maxIncrease.diffPercent > 10) {
            textEl.innerHTML = `You spent <strong style="color:var(--accent-danger)">${maxIncrease.diffPercent}% more</strong> on ${maxIncrease.cat.name} this month. Try to reduce expenses here.`;
            return;
        }

        if (lastSummary.expense === 0) {
            textEl.textContent = "Great start! Keep tracking your expenses to see insights.";
            return;
        }

        const diffPercent = Math.round(((currentSummary.expense - lastSummary.expense) / lastSummary.expense) * 100);
        
        if (diffPercent > 0) {
            textEl.innerHTML = `You spent <strong style="color:var(--accent-danger)">${diffPercent}% more</strong> overall this month compared to last month.`;
        } else if (diffPercent < 0) {
            textEl.innerHTML = `Great job! You spent <strong style="color:var(--accent-success)">${Math.abs(diffPercent)}% less</strong> this month.`;
        } else {
            textEl.innerHTML = "Your spending is exactly on track with last month.";
        }
    }

    /* ---------- Income vs Expense Doughnut ---------- */
    function renderIncomeExpenseChart(monthKey) {
        const canvas = document.getElementById('chart-income-expense');
        const ctx = canvas.getContext('2d');
        const summary = Storage.getMonthlySummary(monthKey);

        if (incomeExpenseChart) {
            incomeExpenseChart.destroy();
        }

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#e8e8f0' : '#1a1a2e';

        const incGradient = ctx.createLinearGradient(0, 0, 0, 400);
        incGradient.addColorStop(0, isDark ? '#00d4aa' : '#00b894');
        incGradient.addColorStop(1, isDark ? '#00a381' : '#00a381');

        const expGradient = ctx.createLinearGradient(0, 0, 0, 400);
        expGradient.addColorStop(0, isDark ? '#ff6b6b' : '#e74c3c');
        expGradient.addColorStop(1, isDark ? '#ee5a5a' : '#c0392b');

        incomeExpenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Income', 'Expense'],
                datasets: [{
                    data: [summary.income, summary.expense],
                    backgroundColor: [incGradient, expGradient],
                    borderWidth: 0,
                    spacing: 4,
                    borderRadius: 6,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '72%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textColor,
                            padding: 16,
                            usePointStyle: true,
                            pointStyleWidth: 10,
                            font: { family: 'Inter', size: 12, weight: '500' },
                            generateLabels: (chart) => {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                    return data.labels.map((label, i) => {
                                        const val = data.datasets[0].data[i];
                                        const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                                        return {
                                            text: `${label} (${pct}%)`,
                                            fillStyle: isDark ? (i===0 ? '#00d4aa' : '#ff6b6b') : (i===0 ? '#00b894' : '#e74c3c'),
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1a1a35' : '#ffffff',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        borderWidth: 1,
                        cornerRadius: 10,
                        padding: 12,
                        titleFont: { family: 'Inter', weight: '600' },
                        bodyFont: { family: 'Inter' },
                        callbacks: {
                            label: function(ctx) {
                                return `${ctx.label}: ${Utils.formatCurrency(ctx.raw)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    /* ---------- Category Spending Bar Chart ---------- */
    function renderCategorySpendingChart(monthKey) {
        const canvas = document.getElementById('chart-category-spending');
        const ctx = canvas.getContext('2d');
        const breakdown = Storage.getCategoryBreakdown(monthKey);

        if (categoryChart) {
            categoryChart.destroy();
        }

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#8888a8' : '#6b7280';
        const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

        const labels = breakdown.map(b => b.category.name);
        const data = breakdown.map(b => b.amount);
        
        // Create gradients
        const bgColors = breakdown.map(b => {
            const grad = ctx.createLinearGradient(0, 0, 400, 0);
            grad.addColorStop(0, b.category.color + '66');
            grad.addColorStop(1, b.category.color + 'cc');
            return grad;
        });
        const borderColors = breakdown.map(b => b.category.color);

        categoryChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: 1,
                    borderRadius: 6,
                    maxBarThickness: 64,
                    barPercentage: 0.85,
                    categoryPercentage: 0.9
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? '#1a1a35' : '#ffffff',
                        titleColor: isDark ? '#e8e8f0' : '#1a1a2e',
                        bodyColor: isDark ? '#e8e8f0' : '#1a1a2e',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        borderWidth: 1,
                        cornerRadius: 10,
                        padding: 12,
                        titleFont: { family: 'Inter', weight: '600' },
                        bodyFont: { family: 'Inter' },
                        callbacks: {
                            label: function(ctx) {
                                return Utils.formatCurrency(ctx.raw);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: gridColor, drawBorder: false },
                        ticks: {
                            color: textColor,
                            font: { family: 'Inter', size: 11 },
                            callback: function(val) {
                                const sym = Utils.getCurrencySymbol();
                                return sym + (val / 1000).toFixed(0) + 'k';
                            }
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            color: textColor,
                            font: { family: 'Inter', size: 11 }
                        }
                    }
                }
            }
        });
    }

    /* ---------- Budget Health Ring ---------- */
    function renderBudgetHealth(monthKey) {
        const settings = Storage.getSettings();
        const summary = Storage.getMonthlySummary(monthKey);
        const target = settings.monthlyTarget || 0;

        const spent = summary.expense;
        const percentage = target > 0 ? Math.min(Math.round((spent / target) * 100), 100) : 0;
        const remaining = Math.max(target - spent, 0);

        // Update ring
        const ringFill = document.getElementById('budget-ring-fill');
        const circumference = 2 * Math.PI * 52; // r=52
        const offset = circumference - (percentage / 100) * circumference;

        ringFill.style.strokeDasharray = circumference;
        ringFill.style.strokeDashoffset = offset;

        // Color coding
        ringFill.classList.remove('warning', 'danger');
        if (percentage >= 90) {
            ringFill.classList.add('danger');
        } else if (percentage >= 70) {
            ringFill.classList.add('warning');
        }

        document.getElementById('budget-ring-percent').textContent = percentage + '%';
        document.getElementById('ring-spent').textContent = Utils.formatCurrency(spent);
        document.getElementById('ring-remaining').textContent = Utils.formatCurrency(remaining);
    }

    /* ---------- Recent Transactions ---------- */
    function renderRecentTransactions() {
        const container = document.getElementById('recent-transactions-list');
        const transactions = Storage.getTransactions()
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 6);

        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state small">
                    <p>No transactions yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = transactions.map(tx => {
            const cat = Utils.getCategoryById(tx.category);
            const displayCatName = tx.customCategory || cat.name;
            const displayAmount = tx.type === 'income' ? `+${Utils.formatCurrency(tx.amount)}` : `-${Utils.formatCurrency(tx.amount)}`;
            return `
                <div class="recent-item">
                    <div class="recent-item-icon">${cat.icon}</div>
                    <div class="recent-item-info">
                        <div class="recent-item-category-wrap">
                            <span class="recent-item-category">${Utils.sanitizeHTML(displayCatName)}</span>
                            <span class="recent-cat-badge" style="color: ${cat.color}; border-color: ${cat.color}40">${Utils.sanitizeHTML(displayCatName)}</span>
                        </div>
                        <div class="recent-item-note">${Utils.sanitizeHTML(tx.note) || '—'}</div>
                    </div>
                    <div class="recent-item-right">
                        <div class="recent-item-amount ${tx.type}">${displayAmount}</div>
                        <div class="recent-item-date">${Utils.formatDate(tx.date)}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /* ---------- Upcoming Bills ---------- */
    function renderUpcomingBills() {
        const list = document.getElementById('upcoming-bills-list');
        const card = document.getElementById('upcoming-bills-card');
        if (!list || !card) return;

        const upcoming = Storage.getUpcomingBills(7); // Next 7 days
        if (upcoming.length === 0) {
            card.style.display = 'none';
            return;
        }

        card.style.display = 'block';
        list.innerHTML = upcoming.map(r => {
            const cat = Utils.getCategoryById(r.category);
            const amtStr = Utils.formatCurrency(r.amount);
            
            // Calculate days left
            const today = new Date(Utils.getTodayString());
            const due = new Date(r.nextDueDate);
            const diffTime = due - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let daysText = diffDays === 0 ? '<span style="color:var(--accent-danger)">Due Today</span>' : 
                           diffDays === 1 ? '<span style="color:var(--accent-warning)">Due Tomorrow</span>' : 
                           `Due in ${diffDays} days`;

            return `
                <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-elevated); padding:12px; border-radius:8px; margin-bottom:8px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span class="tx-category-icon">${cat.icon}</span>
                        <div>
                            <div style="font-weight:600; color:var(--text-primary);">${cat.name}</div>
                            <div style="font-size:0.85rem; margin-top:2px;">${daysText}</div>
                        </div>
                    </div>
                    <div style="font-weight:600; color:var(--expense-color);">-${amtStr}</div>
                </div>
            `;
        }).join('');
    }

    /* ---------- Refresh ---------- */
    function refresh() {
        destroy();
        render();
    }

    /* ---------- Cleanup ---------- */
    function destroy() {
        if (incomeExpenseChart) { incomeExpenseChart.destroy(); incomeExpenseChart = null; }
        if (categoryChart) { categoryChart.destroy(); categoryChart = null; }
    }

    return { render, refresh, destroy };

})();
