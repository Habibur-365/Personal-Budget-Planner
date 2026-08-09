/**
 * ============================================
 *  BudgetPro — Transactions View
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
        const allCategories = [...Utils.EXPENSE_CATEGORIES, ...Utils.INCOME_CATEGORIES];

        // Keep only the "All Categories" option and rebuild
        select.innerHTML = '<option value="all">All Categories</option>';
        allCategories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = `${cat.icon} ${cat.name}`;
            select.appendChild(opt);
        });
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
            return;
        }

        tableWrap.style.display = 'block';
        emptyState.style.display = 'none';

        tbody.innerHTML = transactions.map(tx => {
            const cat = Utils.getCategoryById(tx.category);
            const displayCatName = tx.customCategory || cat.name;
            const wallet = Storage.getWallets().find(w => w.id === tx.walletId);
            const wCurrency = wallet ? wallet.currency : 'BDT';
            const displayAmount = tx.originalAmount !== undefined ? tx.originalAmount : tx.amount;
            const formattedAmount = Utils.formatCurrencyRaw(displayAmount, wCurrency, true);

            return `
                <tr data-id="${tx.id}">
                    <td>${Utils.formatDate(tx.date)}</td>
                    <td>
                        <div class="tx-category-cell">
                            <span class="tx-category-icon">${cat.icon}</span>
                            <span>${Utils.sanitizeHTML(displayCatName)}</span>
                        </div>
                    </td>
                    <td class="col-note">
                        <span class="tx-note-text">${Utils.sanitizeHTML(tx.note) || '—'}</span>
                    </td>
                    <td>
                        <span class="tx-type-badge ${tx.type}">${tx.type}</span>
                    </td>
                    <td>
                        <span class="tx-amount ${tx.type}">${formattedAmount}</span>
                    </td>
                    <td class="col-actions">
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

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        const title = getExportTitle();

        // Header
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('BudgetPro', 14, 15);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(title, 14, 22);

        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
        doc.setTextColor(0);

        // Compute summary
        const totalIncome = data.filter(d => d.type === 'Income').reduce((s, d) => s + d.amount, 0);
        const totalExpense = data.filter(d => d.type === 'Expense').reduce((s, d) => s + d.amount, 0);

        // Table
        const tableData = data.map(d => [d.date, d.category, d.note, d.type, d.amountFormatted]);

        doc.autoTable({
            head: [['Date', 'Category', 'Note', 'Type', 'Amount']],
            body: tableData,
            startY: 33,
            styles: {
                fontSize: 9,
                cellPadding: 4,
                lineColor: [220, 220, 220],
                lineWidth: 0.25
            },
            headStyles: {
                fillColor: [124, 92, 252],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'left'
            },
            alternateRowStyles: {
                fillColor: [245, 245, 250]
            },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 45 },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 25 },
                4: { cellWidth: 40, halign: 'right' }
            },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 3) {
                    const val = data.cell.raw;
                    if (val === 'Income') {
                        data.cell.styles.textColor = [0, 180, 100];
                        data.cell.styles.fontStyle = 'bold';
                    } else {
                        data.cell.styles.textColor = [220, 50, 50];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
                if (data.section === 'body' && data.column.index === 4) {
                    const val = data.cell.raw;
                    if (val.startsWith('+')) {
                        data.cell.styles.textColor = [0, 180, 100];
                    } else if (val.startsWith('-')) {
                        data.cell.styles.textColor = [220, 50, 50];
                    }
                }
            }
        });

        // Summary footer
        const finalY = doc.lastAutoTable.finalY + 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Transactions: ${data.length}`, 14, finalY);
        doc.text(`Total Income: ${Utils.formatCurrency(totalIncome)}`, 14, finalY + 6);
        doc.text(`Total Expense: ${Utils.formatCurrency(totalExpense)}`, 14, finalY + 12);
        doc.text(`Net Balance: ${Utils.formatCurrency(totalIncome - totalExpense)}`, 14, finalY + 18);

        const fileName = `BudgetPro_Transactions_${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(fileName);
        Utils.showToast('PDF exported successfully!', 'success');
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
            ['BudgetPro — Transaction Report'],
            [getExportTitle()],
            [`Generated: ${new Date().toLocaleString()}`],
            [],
            ['Date', 'Category', 'Note', 'Type', 'Amount'],
            ...data.map(d => [d.date, d.category, d.note, d.type, d.amount]),
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
            if (col === 'E' && row > 3) {
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
                const typeCell = ws['D' + (row + 1)];
                if (typeCell && (col === 'D' || col === 'E')) {
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
            { wch: 20 }, // Category
            { wch: 22 }, // Note
            { wch: 12 }, // Type
            { wch: 16 }  // Amount
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

        const fileName = `BudgetPro_Transactions_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        Utils.showToast('Excel exported successfully!', 'success');
    }

    return { render, refresh, renderTransactions };

})();
