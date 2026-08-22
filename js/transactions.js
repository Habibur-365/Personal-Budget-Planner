/**
 * ============================================
 *  Fund Manager — Transactions View
 * ============================================
 */

const Transactions = (() => {

    let currentSort = { field: 'date', direction: 'desc' };
    let currentFilters = { type: 'all', category: 'all', month: '', search: '' };
    let eventsBound = false;

    /* ---------- Render ---------- */
    function render() {
        populateCategoryFilter();
        populateMonthFilter();
        renderTransactions();
        setupEventListeners();
    }

    /* ---------- Populate Category Filter ---------- */
    function populateCategoryFilter() {
        const select = document.getElementById('filter-category');
        if (!select) return;

        const transactions = Storage.getTransactions();
        const usedCategoryIds = new Set();
        transactions.forEach(t => {
            if (t.category) {
                usedCategoryIds.add(t.category);
            }
        });

        const allCategories = [...Utils.EXPENSE_CATEGORIES, ...Utils.INCOME_CATEGORIES];
        const usedCategories = allCategories.filter(cat => usedCategoryIds.has(cat.id));

        // Keep only the "All Categories" option and rebuild
        select.innerHTML = '<option value="all">All Categories</option>';
        usedCategories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = `${cat.icon} ${cat.name}`;
            select.appendChild(opt);
        });

        if (currentFilters.category !== 'all' && !usedCategoryIds.has(currentFilters.category)) {
            currentFilters.category = 'all';
        }
        select.value = currentFilters.category || 'all';
    }

    /* ---------- Populate Month Filter ---------- */
    function populateMonthFilter() {
        const select = document.getElementById('filter-month');
        if (!select) return;

        const transactions = Storage.getTransactions();
        const months = new Set();
        
        transactions.forEach(t => {
            months.add(Utils.getMonthKey(t.date));
        });

        const sortedMonths = Array.from(months).sort().reverse();
        
        select.innerHTML = '<option value="">All Months</option>';
        sortedMonths.forEach(monthKey => {
            const opt = document.createElement('option');
            opt.value = monthKey;
            opt.textContent = Utils.formatMonthYear(monthKey);
            select.appendChild(opt);
        });

        select.value = currentFilters.month || '';
    }

    /* ---------- Get Filtered & Sorted Transactions ---------- */
    function getFilteredTransactions() {
        let transactions = Storage.getTransactions();

        // Search filter
        if (currentFilters.search) {
            const q = currentFilters.search.toLowerCase();
            transactions = transactions.filter(t => {
                const cat = Utils.getCategoryById(t.category);
                const displayCatName = t.customCategory || cat.name;
                return (
                    displayCatName.toLowerCase().includes(q) ||
                    (t.note && t.note.toLowerCase().includes(q)) ||
                    t.amount.toString().includes(q)
                );
            });
        }

        // Type filter
        if (currentFilters.type !== 'all') {
            transactions = transactions.filter(t => t.type === currentFilters.type);
        }

        // Category filter
        if (currentFilters.category !== 'all') {
            transactions = transactions.filter(t => t.category === currentFilters.category);
        }

        // Month filter
        if (currentFilters.month) {
            transactions = transactions.filter(t => Utils.getMonthKey(t.date) === currentFilters.month);
        }

        // Sort
        transactions.sort((a, b) => {
            let valA, valB;
            switch (currentSort.field) {
                case 'date':
                    valA = new Date(a.date);
                    valB = new Date(b.date);
                    break;
                case 'amount':
                    valA = a.amount;
                    valB = b.amount;
                    break;
                default:
                    valA = a.date;
                    valB = b.date;
            }
            if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return transactions;
    }

    /* ---------- Render Transaction List ---------- */
    function renderTransactions() {
        const tbody = document.getElementById('transactions-body');
        const emptyState = document.getElementById('transactions-empty');
        const tableWrap = document.querySelector('.transactions-table-wrap');
        const transactions = getFilteredTransactions();

        if (transactions.length === 0) {
            tbody.innerHTML = '';
            tableWrap.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            tableWrap.style.display = 'block';
            emptyState.style.display = 'none';
        }

        // Update Summary Cards
        const incomeTotal = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expenseTotal = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        
        const incomeCard = document.getElementById('tx-summary-income');
        const expenseCard = document.getElementById('tx-summary-expense');
        if (incomeCard) incomeCard.textContent = Utils.formatCurrency(incomeTotal);
        if (expenseCard) expenseCard.textContent = Utils.formatCurrency(expenseTotal);

        if (transactions.length === 0) return;

        tbody.innerHTML = transactions.map(tx => {
            const cat = Utils.getCategoryById(tx.category);
            const displayCatName = tx.customCategory || cat.name;
            const wallet = Storage.getWallets().find(w => w.id === tx.walletId);
            const wCurrency = wallet ? wallet.currency : 'BDT';
            const displayAmount = tx.originalAmount !== undefined ? tx.originalAmount : tx.amount;
            const formattedAmount = Utils.formatCurrencyRaw(displayAmount, wCurrency, true);

            return `
                <tr data-id="${tx.id}">
                    <td data-label="Date">${Utils.formatDate(tx.date)}</td>
                    <td data-label="Description">
                        <div class="tx-category-cell">
                            <span>${Utils.sanitizeHTML(displayCatName)}</span>
                        </div>
                    </td>
                    <td data-label="Type">
                        <span class="tx-type-badge ${tx.type}">${tx.type}</span>
                    </td>
                    <td data-label="Amount">
                        <span class="tx-amount ${tx.type}">${formattedAmount}</span>
                    </td>
                    <td class="col-note" data-label="Note">
                        <span class="tx-note-text">${Utils.sanitizeHTML(tx.note) || '—'}</span>
                    </td>
                    <td class="col-actions" data-label="Actions">
                        <div class="tx-actions">
                            <button class="tx-action-btn edit" data-id="${tx.id}" title="Edit">
                                ✎
                            </button>
                            <button class="tx-action-btn delete" data-id="${tx.id}" title="Delete">
                                ✕
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /* ---------- Event Listeners ---------- */
    function setupEventListeners() {
        if (eventsBound) return;
        eventsBound = true;

        // Search
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            currentFilters.search = e.target.value;
            renderTransactions();
        });

        // Filter: Type
        document.getElementById('filter-type').addEventListener('change', (e) => {
            currentFilters.type = e.target.value;
            renderTransactions();
        });

        // Filter: Category
        document.getElementById('filter-category').addEventListener('change', (e) => {
            currentFilters.category = e.target.value;
            renderTransactions();
        });

        // Filter: Month
        document.getElementById('filter-month').addEventListener('change', (e) => {
            currentFilters.month = e.target.value;
            renderTransactions();
        });

        // Sort
        document.querySelectorAll('.transactions-table th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.sort;
                if (currentSort.field === field) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.field = field;
                    currentSort.direction = 'desc';
                }

                // Update visual
                document.querySelectorAll('.transactions-table th.sortable').forEach(h => {
                    h.classList.remove('sort-asc', 'sort-desc');
                });
                th.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');

                renderTransactions();
            });
        });

        // Edit / Delete delegation
        document.getElementById('transactions-body').addEventListener('click', (e) => {
            const editBtn = e.target.closest('.tx-action-btn.edit');
            const deleteBtn = e.target.closest('.tx-action-btn.delete');

            if (editBtn) {
                openEditModal(editBtn.dataset.id);
            }
            if (deleteBtn) {
                confirmDelete(deleteBtn.dataset.id);
            }
        });

        // Export buttons
        document.getElementById('btn-export-pdf').addEventListener('click', exportToPDF);
        document.getElementById('btn-export-excel').addEventListener('click', exportToExcel);
    }

    /* ---------- Open Edit Modal ---------- */
    function openEditModal(id) {
        const tx = Storage.getAllTransactions().find(t => t.id === id);
        if (!tx) return;

        document.getElementById('modal-transaction-title').textContent = 'Edit Transaction';
        document.getElementById('tx-id').value = tx.id;
        const originalAmt = tx.originalAmount !== undefined ? tx.originalAmount : tx.amount;
        document.getElementById('tx-amount').value = originalAmt;
        document.getElementById('tx-date').value = tx.date;
        document.getElementById('tx-note').value = tx.note || '';

        // Set type toggle
        const toggleBtns = document.querySelectorAll('#tx-type-toggle .toggle-btn');
        toggleBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === tx.type);
        });

        // Populate and set category
        App.populateTransactionCategories(tx.type);
        document.getElementById('tx-category').value = tx.category;

        const customCategoryGroup = document.getElementById('tx-custom-category-group');
        const customCategoryInput = document.getElementById('tx-custom-category');
        if (customCategoryGroup && customCategoryInput) {
            if (tx.category === 'other_expense' || tx.category === 'other_income') {
                customCategoryGroup.style.display = 'block';
                customCategoryInput.required = true;
                customCategoryInput.value = tx.customCategory || '';
            } else {
                customCategoryGroup.style.display = 'none';
                customCategoryInput.required = false;
                customCategoryInput.value = '';
            }
        }

        App.openModal('modal-transaction-overlay');
    }

    /* ---------- Confirm Delete ---------- */
    function confirmDelete(id) {
        const tx = Storage.getAllTransactions().find(t => t.id === id);
        if (!tx) return;

        const cat = Utils.getCategoryById(tx.category);
        const originalAmt = tx.originalAmount !== undefined ? tx.originalAmount : tx.amount;
        const wallet = Storage.getWallets().find(w => w.id === tx.walletId);
        const wCurrency = wallet ? wallet.currency : 'BDT';
        const formattedAmount = Utils.formatCurrencyRaw(originalAmt, wCurrency, false);

        document.getElementById('confirm-message').textContent =
            `Are you sure you want to delete this ${tx.type} of ${formattedAmount} (${cat.name})? This action cannot be undone.`;

        const confirmBtn = document.getElementById('btn-confirm-action');
        confirmBtn.onclick = () => {
            Storage.deleteTransaction(id);
            App.closeModal('modal-confirm-overlay');
            Utils.showToast('Transaction deleted', 'success');
            App.refreshCurrentPage();
        };

        App.openModal('modal-confirm-overlay');
    }

    /* ---------- Refresh ---------- */
    function refresh() {
        populateCategoryFilter();
        populateMonthFilter();
        renderTransactions();
    }

    /* ---------- Export Helpers ---------- */
    function getExportData() {
        const transactions = getFilteredTransactions();
        return transactions.map(tx => {
            const cat = Utils.getCategoryById(tx.category);
            const displayCatName = tx.customCategory || cat.name;
            const wallet = Storage.getWallets().find(w => w.id === tx.walletId);
            const wCurrency = wallet ? wallet.currency : 'BDT';
            const displayAmount = tx.originalAmount !== undefined ? tx.originalAmount : tx.amount;
            return {
                date: Utils.formatDate(tx.date),
                category: displayCatName,
                note: tx.note || '',
                type: tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
                amount: displayAmount,
                amountFormatted: Utils.formatCurrencyRaw(displayAmount, wCurrency, true)
            };
        });
    }

    function getExportTitle() {
        const parts = ['Transactions'];
        if (currentFilters.type !== 'all') {
            parts.push(`(${currentFilters.type.charAt(0).toUpperCase() + currentFilters.type.slice(1)})`);
        }
        if (currentFilters.category !== 'all') {
            const cat = Utils.getCategoryById(currentFilters.category);
            parts.push(`- ${cat.name}`);
        }
        if (currentFilters.month) {
            parts.push(`- ${Utils.formatMonthYear(currentFilters.month)}`);
        }
        if (currentFilters.search) {
            parts.push(`[Search: "${currentFilters.search}"]`);
        }
        return parts.join(' ');
    }

    /* ---------- Export to PDF ---------- */
    function exportToPDF() {
        const data = getExportData();
        if (data.length === 0) {
            Utils.showToast('No transactions to export', 'error');
            return;
        }

        const title = getExportTitle();

        // Create a hidden HTML container for the PDF content
        const container = document.createElement('div');
        container.style.padding = '30px';
        container.style.fontFamily = "'Inter', sans-serif";
        container.style.color = '#1a1a2e';
        
        let tableRows = '';
        data.forEach(d => {
            const amountColor = d.type === 'Income' ? '#00b894' : '#d63031';
            const typeColor = d.type === 'Income' ? '#00b894' : '#d63031';
            tableRows += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px 8px;">${d.date}</td>
                    <td style="padding: 10px 8px;">${d.category}</td>
                    <td style="padding: 10px 8px; font-weight: bold; color: ${typeColor};">${d.type}</td>
                    <td style="padding: 10px 8px; text-align: right; color: ${amountColor};">${d.amountFormatted}</td>
                    <td style="padding: 10px 8px;">${d.note}</td>
                </tr>
            `;
        });

        // Compute summary
        const totalIncome = data.filter(d => d.type === 'Income').reduce((s, d) => s + d.amount, 0);
        const totalExpense = data.filter(d => d.type === 'Expense').reduce((s, d) => s + d.amount, 0);

        container.innerHTML = `
            <div style="margin-bottom: 30px;">
                <h1 style="font-size: 24px; margin: 0; color: #1a1a2e;">Fund Manager</h1>
                <h2 style="font-size: 16px; margin: 5px 0; color: #444;">${title}</h2>
                <p style="font-size: 12px; color: #888; margin: 0;">Generated: ${new Date().toLocaleString()}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px;">
                <thead>
                    <tr style="background-color: #7c5cfc; color: white; text-align: left;">
                        <th style="padding: 10px 8px;">Date</th>
                        <th style="padding: 10px 8px;">Description</th>
                        <th style="padding: 10px 8px;">Type</th>
                        <th style="padding: 10px 8px; text-align: right;">Amount</th>
                        <th style="padding: 10px 8px;">Note</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            
            <div style="font-size: 14px; font-weight: bold;">
                <p style="margin: 6px 0;">Total Transactions: ${data.length}</p>
                <p style="margin: 6px 0;">Total Income: ${Utils.formatCurrency(totalIncome)}</p>
                <p style="margin: 6px 0;">Total Expense: ${Utils.formatCurrency(totalExpense)}</p>
                <p style="margin: 6px 0;">Net Balance: ${Utils.formatCurrency(totalIncome - totalExpense)}</p>
            </div>
        `;

        const fileName = `HR_Fund_Manager_Transactions_${new Date().toISOString().slice(0, 10)}.pdf`;
        
        Utils.showToast('Generating PDF...', 'info');
        
        const opt = {
            margin:       15,
            filename:     fileName,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        html2pdf().set(opt).from(container).save().then(() => {
            Utils.showToast('PDF exported successfully!', 'success');
        }).catch(err => {
            console.error(err);
            Utils.showToast('Error generating PDF', 'error');
        });
    }

    /* ---------- Export to Excel ---------- */
    function exportToExcel() {
        const data = getExportData();
        if (data.length === 0) {
            Utils.showToast('No transactions to export', 'error');
            return;
        }

        const totalIncome = data.filter(d => d.type === 'Income').reduce((s, d) => s + d.amount, 0);
        const totalExpense = data.filter(d => d.type === 'Expense').reduce((s, d) => s + d.amount, 0);

        // Build worksheet data
        const wsData = [
            ['Fund Manager — Transaction Report'],
            [getExportTitle()],
            [`Generated: ${new Date().toLocaleString()}`],
            [],
            ['Date', 'Description', 'Type', 'Amount', 'Note'],
            ...data.map(d => [d.date, d.category, d.type, d.amount, d.note]),
            [],
            ['Summary'],
            ['Total Transactions', data.length],
            ['Total Income', totalIncome],
            ['Total Expense', totalExpense],
            ['Net Balance', totalIncome - totalExpense]
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Apply Premium Styles
        for (const key in ws) {
            if (key.startsWith('!')) continue;
            const cell = ws[key];
            const col = key.replace(/[0-9]/g, '');
            const row = parseInt(key.replace(/\D/g, '')) - 1;

            // Default Style
            cell.s = {
                font: { name: "Arial", sz: 10, color: { rgb: "333333" } },
                alignment: { vertical: "center", horizontal: "left" },
                border: {
                    top: { style: "thin", color: { rgb: "DDDDDD" } },
                    bottom: { style: "thin", color: { rgb: "DDDDDD" } },
                    left: { style: "thin", color: { rgb: "DDDDDD" } },
                    right: { style: "thin", color: { rgb: "DDDDDD" } }
                }
            };

            // Amount columns align right
            if (col === 'D' && row > 3) {
                cell.s.alignment.horizontal = "right";
            }

            // Header/Title Row
            if (row === 0) {
                cell.s.font = { name: "Arial", sz: 16, bold: true, color: { rgb: "FFFFFF" } };
                cell.s.fill = { fgColor: { rgb: "7C5CFC" } };
                cell.s.alignment.horizontal = "center";
                cell.s.border = {}; // No border
            }
            // Subtitle Rows
            else if (row === 1 || row === 2) {
                cell.s.font = { name: "Arial", sz: 10, italic: true, color: { rgb: "555555" } };
                cell.s.alignment.horizontal = "center";
                cell.s.border = {};
            }
            // Table Header Row
            else if (row === 4) {
                cell.s.font = { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } };
                cell.s.fill = { fgColor: { rgb: "7C5CFC" } };
            }
            // Data Rows - color coding Income/Expense
            else if (row >= 5 && row < 5 + data.length) {
                const typeCell = ws['C' + (row + 1)];
                if (typeCell && (col === 'C' || col === 'D')) {
                    const isIncome = typeCell.v === 'Income';
                    cell.s.font.color = { rgb: isIncome ? "00B464" : "DC3232" };
                    cell.s.font.bold = true;
                }
            }
            // Summary Header Row
            else if (row === 6 + data.length) {
                cell.s.font = { name: "Arial", sz: 12, bold: true, color: { rgb: "FFFFFF" } };
                cell.s.fill = { fgColor: { rgb: "22223B" } };
                // Merge fix for summary
                if (col === 'A') cell.s.alignment.horizontal = "center";
            }
            // Summary Data Rows
            else if (row >= 7 + data.length) {
                cell.s.font.bold = true;
                if (row === 10 + data.length) { // Net Balance row
                    cell.s.font.color = { rgb: "7C5CFC" };
                    cell.s.font.sz = 11;
                    cell.s.fill = { fgColor: { rgb: "F0F0FF" } };
                }
            }
        }

        // Column widths perfectly balanced to fill A4 width without spilling over
        ws['!cols'] = [
            { wch: 14 }, // Date
            { wch: 20 }, // Description
            { wch: 12 }, // Type
            { wch: 16 }, // Amount
            { wch: 22 }  // Note
        ];

        // Merge title row
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }
        ];

        const wb = XLSX.utils.book_new();
        ws['!pageSetup'] = { 
            paperSize: 9, 
            orientation: 'portrait',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0
        };
        // Some Excel versions read margins from here
        ws['!margins'] = { left: 0.25, right: 0.25, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 };
        // SheetJS fallback for fit to page
        ws['!fitToPage'] = true;

        XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

        const fileName = `HR_Fund_Manager_Transactions_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        Utils.showToast('Excel exported successfully!', 'success');
    }

    return { render, refresh, renderTransactions };

})();
