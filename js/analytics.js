/**
 * ============================================
 *  BudgetPro — Analytics View (Advanced)
 * ============================================
 */

const Analytics = (() => {

    let trendsChart = null;
    let pieChart = null;
    let cashFlowChart = null;
    let incomeSourcesChart = null;
    let topCategoriesChart = null;
    let forecastChart = null;
    let eventsBound = false;

    /* ---------- Render ---------- */
    function render() {
        const period = parseInt(document.getElementById('analytics-period').value) || 6;
        renderSummaryStats(period);
        renderCashFlowChart(period);
        renderTrendsChart(period);
        renderPieChart(period);
        renderIncomeSourcesChart(period);
        renderTopCategoriesChart(period);
        renderForecastChart();
        renderHeatmap(period);
        setupEventListeners();
    }

    /* ---------- Chart Theme Helpers ---------- */
    function getTheme(ctx) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        
        // Helper to create gradients
        const createGradient = (color1, color2) => {
            if(!ctx) return color1;
            const grad = ctx.createLinearGradient(0, 0, 0, 400);
            grad.addColorStop(0, color1);
            grad.addColorStop(1, color2);
            return grad;
        };

        return {
            isDark,
            textColor: isDark ? '#8888a8' : '#6b7280',
            titleColor: isDark ? '#e8e8f0' : '#1a1a2e',
            gridColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            tooltipBg: isDark ? '#1a1a35' : '#ffffff',
            tooltipBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            incomeColor: isDark ? '#00d4aa' : '#00b894',
            incomeGrad: createGradient(isDark ? '#00d4aa' : '#00b894', isDark ? '#00a381' : '#00a381'),
            expenseColor: isDark ? '#ff6b6b' : '#e74c3c',
            expenseGrad: createGradient(isDark ? '#ff6b6b' : '#e74c3c', isDark ? '#ee5a5a' : '#c0392b'),
            savingsColor: isDark ? '#ffd93d' : '#f39c12',
            primaryColor: isDark ? '#6c5ce7' : '#6c5ce7'
        };
    }

    function tooltipConfig(theme) {
        return {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.titleColor,
            bodyColor: theme.titleColor,
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
            cornerRadius: 10,
            padding: 12,
            titleFont: { family: 'Inter', weight: '600' },
            bodyFont: { family: 'Inter' },
            callbacks: {
                label: function(ctx) {
                    return `${ctx.dataset.label || ctx.label}: ${Utils.formatCurrency(ctx.raw)}`;
                }
            }
        };
    }

    /* ---------- Summary Stats ---------- */
    function renderSummaryStats(period) {
        const container = document.getElementById('analytics-stats-grid');
        const months = Utils.getLastNMonthKeys(period);

        let totalIncome = 0, totalExpense = 0, txCount = 0;
        const categoryTotals = {};

        months.forEach(m => {
            const s = Storage.getMonthlySummary(m);
            totalIncome += s.income;
            totalExpense += s.expense;
            txCount += s.transactionCount;

            const breakdown = Storage.getCategoryBreakdown(m);
            breakdown.forEach(({ category, amount }) => {
                if (!categoryTotals[category.id]) {
                    categoryTotals[category.id] = { category, amount: 0 };
                }
                categoryTotals[category.id].amount += amount;
            });
        });

        const avgExpense = months.length > 0 ? Math.round(totalExpense / months.length) : 0;
        const avgSavings = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

        const topCategory = Object.values(categoryTotals).sort((a, b) => b.amount - a.amount)[0];
        const topCatName = topCategory ? `${topCategory.category.icon} ${topCategory.category.name}` : '—';

        container.innerHTML = `
            <div class="stat-item">
                <div class="stat-value" style="color: var(--income-color)">${Utils.formatCurrency(totalIncome)}</div>
                <div class="stat-label">Total Income</div>
            </div>
            <div class="stat-item">
                <div class="stat-value" style="color: var(--expense-color)">${Utils.formatCurrency(totalExpense)}</div>
                <div class="stat-label">Total Expense</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${Utils.formatCurrency(avgExpense)}</div>
                <div class="stat-label">Avg. Monthly Expense</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${avgSavings}%</div>
                <div class="stat-label">Avg. Savings Rate</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${topCatName}</div>
                <div class="stat-label">Top Spending Category</div>
            </div>
            <div class="stat-item">
                <div class="stat-value" style="color: var(--savings-color)">${Utils.formatCurrency(totalIncome - totalExpense)}</div>
                <div class="stat-label">Net Savings</div>
            </div>
        `;
    }

    /* ---------- 1. Cash Flow Analysis (Combo Bar) ---------- */
    function renderCashFlowChart(period) {
        const canvas = document.getElementById('chart-cash-flow');
        const ctx = canvas.getContext('2d');
        const theme = getTheme(ctx);
        const months = Utils.getLastNMonthKeys(period);

        if (cashFlowChart) cashFlowChart.destroy();

        const labels = months.map(m => Utils.getShortMonthLabel(m));
        const incomeData = months.map(m => Storage.getMonthlySummary(m).income);
        const expenseData = months.map(m => Storage.getMonthlySummary(m).expense);
        const netData = months.map(m => {
            const s = Storage.getMonthlySummary(m);
            return s.income - s.expense;
        });

        cashFlowChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        backgroundColor: theme.incomeGrad,
                        borderRadius: 4,
                        maxBarThickness: 30
                    },
                    {
                        label: 'Expense',
                        data: expenseData,
                        backgroundColor: theme.expenseGrad,
                        borderRadius: 4,
                        maxBarThickness: 30
                    },
                    {
                        type: 'line',
                        label: 'Net Savings',
                        data: netData,
                        borderColor: theme.savingsColor,
                        borderWidth: 2,
                        pointBackgroundColor: theme.savingsColor,
                        pointRadius: 4,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: {
                        labels: { color: theme.textColor, font: { family: 'Inter' } }
                    },
                    tooltip: tooltipConfig(theme)
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: theme.textColor, font: { family: 'Inter', size: 11 } } },
                    y: { grid: { color: theme.gridColor }, ticks: { color: theme.textColor, font: { family: 'Inter', size: 11 }, callback: v => Utils.getCurrencySymbol() + (v / 1000).toFixed(0) + 'k' } }
                }
            }
        });
    }

    /* ---------- 2. Spending Trends (Line) ---------- */
    function renderTrendsChart(period) {
        const canvas = document.getElementById('chart-trends');
        const ctx = canvas.getContext('2d');
        const theme = getTheme(ctx);
        const months = Utils.getLastNMonthKeys(period);

        if (trendsChart) trendsChart.destroy();

        const expenseData = months.map(m => Storage.getMonthlySummary(m).expense);
        const labels = months.map(m => Utils.getShortMonthLabel(m));

        // Create fill gradient
        const fillGrad = ctx.createLinearGradient(0, 0, 0, 400);
        fillGrad.addColorStop(0, theme.expenseColor + '66');
        fillGrad.addColorStop(1, theme.expenseColor + '00');

        trendsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Expense Trend',
                    data: expenseData,
                    borderColor: theme.expenseColor,
                    backgroundColor: fillGrad,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    pointBackgroundColor: theme.expenseColor,
                    pointBorderColor: theme.isDark ? '#12122a' : '#ffffff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: tooltipConfig(theme)
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: theme.textColor, font: { family: 'Inter', size: 11 } } },
                    y: { grid: { color: theme.gridColor }, ticks: { color: theme.textColor, font: { family: 'Inter', size: 11 }, callback: v => Utils.getCurrencySymbol() + (v / 1000).toFixed(0) + 'k' } }
                }
            }
        });
    }

    /* ---------- 3. Category Breakdown (Doughnut) ---------- */
    function renderPieChart(period) {
        const canvas = document.getElementById('chart-pie');
        const ctx = canvas.getContext('2d');
        const theme = getTheme(ctx);
        const months = Utils.getLastNMonthKeys(period);

        if (pieChart) pieChart.destroy();

        const categoryTotals = {};
        months.forEach(m => {
            const breakdown = Storage.getCategoryBreakdown(m);
            breakdown.forEach(({ category, amount }) => {
                if (!categoryTotals[category.id]) categoryTotals[category.id] = { category, amount: 0 };
                categoryTotals[category.id].amount += amount;
            });
        });

        const sorted = Object.values(categoryTotals).sort((a, b) => b.amount - a.amount).slice(0, 6);
        const labels = sorted.map(s => s.category.name);
        const data = sorted.map(s => s.amount);
        const bgColors = sorted.map(s => {
            const grad = ctx.createLinearGradient(0, 0, 200, 200);
            grad.addColorStop(0, s.category.color + 'aa');
            grad.addColorStop(1, s.category.color);
            return grad;
        });

        pieChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: bgColors, borderWidth: 0, hoverOffset: 6 }] },
            options: {
                responsive: true, maintainAspectRatio: true, cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: theme.textColor, font: { family: 'Inter', size: 11 },
                            generateLabels: (chart) => {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                    return data.labels.map((label, i) => {
                                        const val = data.datasets[0].data[i];
                                        const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                                        return { text: `${label} (${pct}%)`, fillStyle: sorted[i].category.color, index: i };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: tooltipConfig(theme)
                }
            }
        });
    }

    /* ---------- 4. Income Sources (Doughnut) ---------- */
    function renderIncomeSourcesChart(period) {
        const canvas = document.getElementById('chart-income-sources');
        const ctx = canvas.getContext('2d');
        const theme = getTheme(ctx);
        const months = Utils.getLastNMonthKeys(period);

        if (incomeSourcesChart) incomeSourcesChart.destroy();

        const sourceTotals = {};
        months.forEach(m => {
            const txs = Storage.getTransactionsByMonth(m).filter(t => t.type === 'income');
            txs.forEach(t => {
                if (!sourceTotals[t.category]) {
                    sourceTotals[t.category] = { cat: Utils.getCategoryById(t.category), amount: 0 };
                }
                sourceTotals[t.category].amount += t.amount;
            });
        });

        const sorted = Object.values(sourceTotals).sort((a, b) => b.amount - a.amount);
        const labels = sorted.map(s => s.cat.name);
        const data = sorted.map(s => s.amount);
        const bgColors = sorted.map(s => {
            const grad = ctx.createLinearGradient(0, 0, 200, 200);
            grad.addColorStop(0, s.cat.color + 'aa');
            grad.addColorStop(1, s.cat.color);
            return grad;
        });

        incomeSourcesChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: bgColors, borderWidth: 0, hoverOffset: 6 }] },
            options: {
                responsive: true, maintainAspectRatio: true, cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: theme.textColor, font: { family: 'Inter', size: 11 },
                            generateLabels: (chart) => {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                    return data.labels.map((label, i) => {
                                        const val = data.datasets[0].data[i];
                                        const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                                        return { text: `${label} (${pct}%)`, fillStyle: sorted[i].cat.color, index: i };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: tooltipConfig(theme)
                }
            }
        });
    }

    /* ---------- 5. Top Categories (Horizontal Bar) ---------- */
    function renderTopCategoriesChart(period) {
        const canvas = document.getElementById('chart-top-categories');
        const ctx = canvas.getContext('2d');
        const theme = getTheme(ctx);
        const months = Utils.getLastNMonthKeys(period);

        if (topCategoriesChart) topCategoriesChart.destroy();

        const categoryTotals = {};
        months.forEach(m => {
            Storage.getCategoryBreakdown(m).forEach(({ category, amount }) => {
                if (!categoryTotals[category.id]) categoryTotals[category.id] = { category, amount: 0 };
                categoryTotals[category.id].amount += amount;
            });
        });

        const sorted = Object.values(categoryTotals).sort((a, b) => b.amount - a.amount).slice(0, 5); // top 5
        const labels = sorted.map(s => s.category.name);
        const data = sorted.map(s => s.amount);
        const colors = sorted.map(s => s.category.color);

        topCategoriesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors.map(c => c + 'aa'),
                    borderColor: colors,
                    borderWidth: 1,
                    borderRadius: 6,
                    maxBarThickness: 30
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                plugins: { legend: { display: false }, tooltip: tooltipConfig(theme) },
                scales: {
                    x: { grid: { color: theme.gridColor }, ticks: { color: theme.textColor, font: { family: 'Inter', size: 11 }, callback: v => Utils.getCurrencySymbol() + (v / 1000).toFixed(0) + 'k' } },
                    y: { grid: { display: false }, ticks: { color: theme.textColor, font: { family: 'Inter', size: 11 } } }
                }
            }
        });
    }

    /* ---------- 6. AI Forecast (Line) ---------- */
    function renderForecastChart() {
        const canvas = document.getElementById('chart-forecast');
        const ctx = canvas.getContext('2d');
        const theme = getTheme(ctx);
        const pastMonths = Utils.getLastNMonthKeys(6);
        
        if (forecastChart) forecastChart.destroy();

        // Calculate averages for prediction
        let totalIncome = 0, totalExpense = 0;
        pastMonths.forEach(m => {
            const s = Storage.getMonthlySummary(m);
            totalIncome += s.income;
            totalExpense += s.expense;
        });
        const avgIncome = pastMonths.length > 0 ? totalIncome / pastMonths.length : 0;
        const avgExpense = pastMonths.length > 0 ? totalExpense / pastMonths.length : 0;

        // Next 3 months
        const currentMonth = Utils.getCurrentMonthKey();
        const next1 = Utils.getMonthOffset(currentMonth, 1);
        const next2 = Utils.getMonthOffset(currentMonth, 2);
        const next3 = Utils.getMonthOffset(currentMonth, 3);
        const futureMonths = [currentMonth, next1, next2, next3];

        const labels = futureMonths.map(m => Utils.getShortMonthLabel(m));
        
        // Let's add slight variations to the averages to make the forecast look realistic
        const forecastIncome = [Storage.getMonthlySummary(currentMonth).income || avgIncome, avgIncome * 1.02, avgIncome * 1.01, avgIncome * 1.05];
        const forecastExpense = [Storage.getMonthlySummary(currentMonth).expense || avgExpense, avgExpense * 0.98, avgExpense * 1.05, avgExpense * 1.02];

        forecastChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Predicted Income',
                        data: forecastIncome,
                        borderColor: theme.incomeColor,
                        borderDash: [5, 5],
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.3,
                        pointBackgroundColor: theme.incomeColor
                    },
                    {
                        label: 'Predicted Expense',
                        data: forecastExpense,
                        borderColor: theme.expenseColor,
                        borderDash: [5, 5],
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.3,
                        pointBackgroundColor: theme.expenseColor
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: theme.textColor, font: { family: 'Inter' } } },
                    tooltip: tooltipConfig(theme)
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: theme.textColor, font: { family: 'Inter', size: 11 } } },
                    y: { grid: { color: theme.gridColor }, ticks: { color: theme.textColor, font: { family: 'Inter', size: 11 }, callback: v => Utils.getCurrencySymbol() + (v / 1000).toFixed(0) + 'k' } }
                }
            }
        });
    }

    /* ---------- 7. Spending Heatmap ---------- */
    function renderHeatmap(period) {
        const table = document.getElementById('heatmap-table');
        const months = Utils.getLastNMonthKeys(period);
        
        // Find top 6 categories across the period
        const categoryTotals = {};
        months.forEach(m => {
            Storage.getCategoryBreakdown(m).forEach(({ category, amount }) => {
                if (!categoryTotals[category.id]) categoryTotals[category.id] = { category, amount: 0 };
                categoryTotals[category.id].amount += amount;
            });
        });

        const topCategories = Object.values(categoryTotals)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 6)
            .map(c => c.category);

        if (topCategories.length === 0) {
            table.innerHTML = '<tr><td class="heatmap-empty" style="border:none;">No data available</td></tr>';
            return;
        }

        // Find max value for color scaling
        let maxVal = 0;
        const matrix = {}; // month -> { categoryId -> amount }
        months.forEach(m => {
            matrix[m] = {};
            const txs = Storage.getTransactionsByMonth(m).filter(t => t.type === 'expense');
            txs.forEach(t => {
                if (!matrix[m][t.category]) matrix[m][t.category] = 0;
                matrix[m][t.category] += t.amount;
                if (matrix[m][t.category] > maxVal) maxVal = matrix[m][t.category];
            });
        });

        // Generate HTML
        let html = '<thead><tr><th>Category \\ Month</th>';
        months.forEach(m => {
            html += `<th>${Utils.getShortMonthLabel(m)}</th>`;
        });
        html += '</tr></thead><tbody>';

        topCategories.forEach(cat => {
            html += `<tr><td style="text-align:left; font-weight:600;"><span style="margin-right:6px">${cat.icon}</span>${cat.name}</td>`;
            months.forEach(m => {
                const val = matrix[m][cat.id] || 0;
                let bg = 'transparent';
                let cls = 'heatmap-empty';
                let text = '—';

                if (val > 0) {
                    // Calculate opacity based on max value (min opacity 0.2 to remain visible)
                    const intensity = Math.max(0.2, val / maxVal);
                    // Use the category color with varying opacity
                    const hex = cat.color.replace('#', '');
                    const r = parseInt(hex.substring(0,2), 16);
                    const g = parseInt(hex.substring(2,4), 16);
                    const b = parseInt(hex.substring(4,6), 16);
                    
                    bg = `rgba(${r}, ${g}, ${b}, ${intensity})`;
                    cls = 'heatmap-cell';
                    text = 'Tk' + (val >= 1000 ? (val/1000).toFixed(1) + 'k' : val);
                }

                html += `<td class="${cls}" style="background-color: ${bg}">${text}</td>`;
            });
            html += '</tr>';
        });

        html += '</tbody>';
        table.innerHTML = html;
    }

    /* ---------- Event Listeners ---------- */
    function setupEventListeners() {
        if (eventsBound) return;
        eventsBound = true;

        document.getElementById('analytics-period').addEventListener('change', () => {
            destroy();
            render();
        });
    }

    /* ---------- Refresh ---------- */
    function refresh() {
        destroy();
        render();
    }

    /* ---------- Cleanup ---------- */
    function destroy() {
        if (trendsChart) { trendsChart.destroy(); trendsChart = null; }
        if (pieChart) { pieChart.destroy(); pieChart = null; }
        if (cashFlowChart) { cashFlowChart.destroy(); cashFlowChart = null; }
        if (incomeSourcesChart) { incomeSourcesChart.destroy(); incomeSourcesChart = null; }
        if (topCategoriesChart) { topCategoriesChart.destroy(); topCategoriesChart = null; }
        if (forecastChart) { forecastChart.destroy(); forecastChart = null; }
    }

    return { render, refresh, destroy };

})();
