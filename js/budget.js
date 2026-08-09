/**
 * ============================================
 *  BudgetPro — Budget View
 * ============================================
 */

const Budget = (() => {

    let currentMonth = Utils.getCurrentMonthKey();
    let eventsBound = false;

    /* ---------- Render ---------- */
    function render() {
        updateMonthLabel();
        renderOverview();
        renderCategoryBudgets();
        renderSavingsGoals();
        setupEventListeners();
    }

    /* ---------- Month Navigation ---------- */
    function updateMonthLabel() {
        document.getElementById('budget-month-label').textContent = Utils.formatMonthYear(currentMonth);
    }

    /* ---------- Overview Card ---------- */
    function renderOverview() {
        const settings = Storage.getSettings();
        const summary = Storage.getMonthlySummary(currentMonth);
        const target = settings.monthlyTarget || 0;
        const spent = summary.expense;
        const remaining = Math.max(target - spent, 0);
        const percentage = target > 0 ? Math.min(Math.round((spent / target) * 100), 100) : 0;

        document.getElementById('monthly-target-display').textContent = Utils.formatCurrency(target);
        document.getElementById('target-spent-label').textContent = `Spent: ${Utils.formatCurrency(spent)}`;
        document.getElementById('target-remaining-label').textContent = `Remaining: ${Utils.formatCurrency(remaining)}`;

        const fill = document.getElementById('target-progress-fill');
        fill.style.width = `${percentage}%`;
        fill.classList.remove('warning', 'danger');
        if (percentage >= 90) fill.classList.add('danger');
        else if (percentage >= 70) fill.classList.add('warning');
    }

    /* ---------- Category Budget Cards ---------- */
    function renderCategoryBudgets() {
        const container = document.getElementById('budget-categories-grid');
        const budgets = Storage.getBudgetsByMonth(currentMonth);

        if (budgets.length === 0) {
            container.innerHTML = `
                <div class="budget-empty">
                    <p>No category budgets set for this month.</p>
                    <p style="margin-top:8px;font-size:0.82rem;">Click "Add Budget" to get started.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = budgets.map((budget, i) => {
            const cat = Utils.getCategoryById(budget.categoryId);
            const spent = Storage.getCategorySpentInMonth(budget.categoryId, currentMonth);
            const percentage = budget.amount > 0 ? Math.min(Math.round((spent / budget.amount) * 100), 100) : 0;
            const remaining = Math.max(budget.amount - spent, 0);

            let colorClass = 'green';
            let statusClass = 'on-track';
            let statusText = 'On Track';

            if (percentage >= 90) {
                colorClass = 'red';
                statusClass = 'over-budget';
                statusText = spent > budget.amount ? 'Over Budget!' : 'Almost Spent';
            } else if (percentage >= 70) {
                colorClass = 'yellow';
                statusClass = 'warning';
                statusText = 'Watch Out';
            }

            return `
                <div class="budget-cat-card" style="animation-delay: ${i * 60}ms">
                    <div class="budget-cat-header">
                        <div class="budget-cat-info">
                            <div class="budget-cat-icon">${cat.icon}</div>
                            <span class="budget-cat-name">${budget.customCategory ? Utils.sanitizeHTML(budget.customCategory) : cat.name}</span>
                        </div>
                        <div class="budget-cat-actions">
                            <button class="tx-action-btn edit" data-cat="${budget.categoryId}" title="Edit Budget">✎</button>
                            <button class="tx-action-btn delete" data-cat="${budget.categoryId}" title="Remove Budget">✕</button>
                        </div>
                    </div>
                    <div class="budget-cat-amounts">
                        <span>Spent: <strong>${Utils.formatCurrency(spent)}</strong></span>
                        <span>Budget: <strong>${Utils.formatCurrency(budget.amount)}</strong></span>
                    </div>
                    <div class="budget-progress-bar">
                        <div class="budget-progress-fill ${colorClass}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="budget-cat-amounts">
                        <span>Remaining: ${Utils.formatCurrency(remaining)}</span>
                        <span class="budget-cat-status ${statusClass}">${statusText} (${percentage}%)</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /* ---------- Savings Goals ---------- */
    function renderSavingsGoals() {
        const container = document.getElementById('goals-grid');
        if (!container) return;

        const goals = Storage.getSavingsGoals();

        if (goals.length === 0) {
            container.innerHTML = `
                <div class="budget-empty" style="grid-column: 1/-1">
                    <p>No savings goals set yet.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = goals.map(goal => {
            const percentage = goal.target > 0 ? Math.min(Math.round((goal.saved / goal.target) * 100), 100) : 0;
            return `
                <div class="glass-card" style="padding: 16px; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <h4 style="font-size: 0.9rem; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                            <span style="width:12px; height:12px; border-radius:50%; background:${goal.color}"></span>
                            ${Utils.sanitizeHTML(goal.name)}
                        </h4>
                        <div>
                            <button class="tx-action-btn edit-goal" data-id="${goal.id}" title="Edit Goal">✎</button>
                            <button class="tx-action-btn delete-goal" data-id="${goal.id}" title="Remove Goal">✕</button>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 6px;">
                        <span>Saved: ${Utils.formatCurrency(goal.saved)}</span>
                        <span>Target: ${Utils.formatCurrency(goal.target)}</span>
                    </div>
                    <div class="budget-progress-bar">
                        <div class="budget-progress-fill" style="width: ${percentage}%; background: ${goal.color};"></div>
                    </div>
                    <div style="text-align: right; font-size: 0.75rem; margin-top: 4px; color: var(--text-secondary)">
                        ${percentage}% Complete
                    </div>
                </div>
            `;
        }).join('');
    }

    /* ---------- Event Listeners ---------- */
    function setupEventListeners() {
        if (eventsBound) return;
        eventsBound = true;

        // Month navigation
        document.getElementById('budget-prev-month').addEventListener('click', () => {
            currentMonth = Utils.getMonthOffset(currentMonth, -1);
            updateMonthLabel();
            renderOverview();
            renderCategoryBudgets();
        });

        document.getElementById('budget-next-month').addEventListener('click', () => {
            currentMonth = Utils.getMonthOffset(currentMonth, 1);
            updateMonthLabel();
            renderOverview();
            renderCategoryBudgets();
        });

        // Set target
        document.getElementById('btn-set-target').addEventListener('click', () => {
            const settings = Storage.getSettings();
            document.getElementById('target-amount-input').value = settings.monthlyTarget || '';
            App.openModal('modal-target-overlay');
        });

        // Save target form
        document.getElementById('form-target').addEventListener('submit', (e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('target-amount-input').value);
            if (isNaN(amount) || amount < 0) {
                Utils.showToast('Please enter a valid amount', 'error');
                return;
            }
            Storage.updateSettings({ monthlyTarget: amount });
            App.closeModal('modal-target-overlay');
            Utils.showToast('Monthly target updated!', 'success');
            App.refreshCurrentPage();
        });

        // Add budget button
        document.getElementById('btn-add-budget').addEventListener('click', () => {
            document.getElementById('modal-budget-title').textContent = 'Add Category Budget';
            document.getElementById('budget-edit-id').value = '';
            document.getElementById('budget-amount-input').value = '';
            document.getElementById('budget-custom-category').value = '';
            document.getElementById('budget-custom-category-group').style.display = 'none';
            document.getElementById('budget-custom-category').required = false;

            // Populate category dropdown with expense categories
            const select = document.getElementById('budget-category-select');
            select.innerHTML = '';
            const existingBudgets = Storage.getBudgetsByMonth(currentMonth);
            const existingCatIds = existingBudgets.map(b => b.categoryId);

            Utils.EXPENSE_CATEGORIES.forEach(cat => {
                if (!existingCatIds.includes(cat.id)) {
                    const opt = document.createElement('option');
                    opt.value = cat.id;
                    opt.textContent = `${cat.icon} ${cat.name}`;
                    select.appendChild(opt);
                }
            });

            if (select.options.length === 0) {
                Utils.showToast('All categories already have budgets!', 'info');
                return;
            }

            App.openModal('modal-budget-overlay');
        });

        // Custom category toggle for budget
        const budgetCategorySelect = document.getElementById('budget-category-select');
        if (budgetCategorySelect) {
            budgetCategorySelect.addEventListener('change', (e) => {
                const group = document.getElementById('budget-custom-category-group');
                const input = document.getElementById('budget-custom-category');
                if (e.target.value === 'other_expense') {
                    group.style.display = 'block';
                    input.required = true;
                } else {
                    group.style.display = 'none';
                    input.required = false;
                }
            });
        }

        // Budget form submit
        document.getElementById('form-budget').addEventListener('submit', (e) => {
            e.preventDefault();
            const categoryId = document.getElementById('budget-category-select').value;
            const amount = parseFloat(document.getElementById('budget-amount-input').value);
            
            let customCategory = null;
            if (categoryId === 'other_expense') {
                customCategory = document.getElementById('budget-custom-category').value.trim();
                if (!customCategory) {
                    Utils.showToast('Please enter a custom category name', 'error');
                    return;
                }
            }

            if (!categoryId || isNaN(amount) || amount <= 0) {
                Utils.showToast('Please fill all fields correctly', 'error');
                return;
            }

            Storage.setBudget(categoryId, currentMonth, amount, customCategory);
            App.closeModal('modal-budget-overlay');
            Utils.showToast('Budget saved!', 'success');
            App.refreshCurrentPage();
        });

        // Edit / Delete budget delegation
        document.getElementById('budget-categories-grid').addEventListener('click', (e) => {
            const editBtn = e.target.closest('.tx-action-btn.edit');
            const deleteBtn = e.target.closest('.tx-action-btn.delete');

            if (editBtn) {
                const catId = editBtn.dataset.cat;
                const budget = Storage.getBudgetsByMonth(currentMonth).find(b => b.categoryId === catId);
                if (!budget) return;

                const cat = Utils.getCategoryById(catId);
                document.getElementById('modal-budget-title').textContent = `Edit Budget: ${cat.name}`;
                document.getElementById('budget-edit-id').value = catId;
                document.getElementById('budget-amount-input').value = budget.amount;

                const select = document.getElementById('budget-category-select');
                select.innerHTML = `<option value="${catId}">${cat.icon} ${cat.name}</option>`;
                select.value = catId;
                
                const customGroup = document.getElementById('budget-custom-category-group');
                const customInput = document.getElementById('budget-custom-category');
                if (catId === 'other_expense') {
                    customGroup.style.display = 'block';
                    customInput.required = true;
                    customInput.value = budget.customCategory || '';
                } else {
                    customGroup.style.display = 'none';
                    customInput.required = false;
                    customInput.value = '';
                }

                App.openModal('modal-budget-overlay');
            }

            if (deleteBtn) {
                const catId = deleteBtn.dataset.cat;
                const cat = Utils.getCategoryById(catId);

                document.getElementById('confirm-title').textContent = 'Remove Budget';
                document.getElementById('confirm-message').textContent =
                    `Remove the budget limit for "${cat.name}" this month?`;

                const confirmBtn = document.getElementById('btn-confirm-action');
                confirmBtn.textContent = 'Remove';
                confirmBtn.onclick = () => {
                    Storage.deleteBudget(catId, currentMonth);
                    App.closeModal('modal-confirm-overlay');
                    Utils.showToast('Budget removed', 'success');
                    App.refreshCurrentPage();
                };

                App.openModal('modal-confirm-overlay');
            }
        });

        // Savings Goals
        const btnAddGoal = document.getElementById('btn-add-goal');
        if (btnAddGoal) {
            btnAddGoal.addEventListener('click', () => {
                document.getElementById('modal-goal-title').textContent = 'Add Savings Goal';
                document.getElementById('form-goal').reset();
                document.getElementById('goal-edit-id').value = '';
                App.openModal('modal-goal-overlay');
            });
        }

        const formGoal = document.getElementById('form-goal');
        if (formGoal) {
            formGoal.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = document.getElementById('goal-edit-id').value;
                const name = document.getElementById('goal-name-input').value.trim();
                const target = parseFloat(document.getElementById('goal-target-input').value);
                const saved = parseFloat(document.getElementById('goal-saved-input').value) || 0;

                if (!name || isNaN(target) || target <= 0) {
                    Utils.showToast('Please fill all required fields correctly', 'error');
                    return;
                }

                const goalData = { name, target, saved };
                if (id) {
                    goalData.id = id;
                    // Preserve color
                    const existing = Storage.getSavingsGoals().find(g => g.id === id);
                    if (existing) goalData.color = existing.color;
                }

                Storage.saveSavingsGoal(goalData);
                App.closeModal('modal-goal-overlay');
                Utils.showToast('Savings goal saved!', 'success');
                renderSavingsGoals();
            });
        }

        const goalsGrid = document.getElementById('goals-grid');
        if (goalsGrid) {
            goalsGrid.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.edit-goal');
                const deleteBtn = e.target.closest('.delete-goal');

                if (editBtn) {
                    const goal = Storage.getSavingsGoals().find(g => g.id === editBtn.dataset.id);
                    if (goal) {
                        document.getElementById('modal-goal-title').textContent = 'Edit Goal';
                        document.getElementById('goal-edit-id').value = goal.id;
                        document.getElementById('goal-name-input').value = goal.name;
                        document.getElementById('goal-target-input').value = goal.target;
                        document.getElementById('goal-saved-input').value = goal.saved;
                        App.openModal('modal-goal-overlay');
                    }
                }

                if (deleteBtn) {
                    const id = deleteBtn.dataset.id;
                    document.getElementById('confirm-title').textContent = 'Remove Goal';
                    document.getElementById('confirm-message').textContent = 'Are you sure you want to remove this savings goal?';
                    const confirmBtn = document.getElementById('btn-confirm-action');
                    confirmBtn.textContent = 'Remove';
                    confirmBtn.onclick = () => {
                        Storage.deleteSavingsGoal(id);
                        App.closeModal('modal-confirm-overlay');
                        Utils.showToast('Goal removed', 'success');
                        renderSavingsGoals();
                    };
                    App.openModal('modal-confirm-overlay');
                }
            });
        }
    }

    /* ---------- Refresh ---------- */
    function refresh() {
        renderOverview();
        renderCategoryBudgets();
        renderSavingsGoals();
    }

    return { render, refresh };

})();
