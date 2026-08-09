/**
 * ============================================
 *  BudgetPro — Settings & Wallet Management
 * ============================================
 */

const Settings = (() => {

    /* ---------- Render ---------- */
    function render() {
        populateBaseCurrency();
        renderWallets();
        renderRecurring();
        setupRecurringForm();
        setupThemeCustomizer();
        setupEventListeners();
        setupExportImport();
    }

    function populateBaseCurrency() {
        const select = document.getElementById('settings-base-currency');
        if (!select) return;
        select.innerHTML = '';
        
        Utils.CURRENCIES.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.code;
            opt.textContent = `${c.code} - ${c.name} (${c.symbol})`;
            select.appendChild(opt);
        });

        const currentBase = Utils.getBaseCurrencyCode();
        select.value = currentBase;
    }

    function renderWallets() {
        const list = document.getElementById('wallets-list');
        if (!list) return;
        
        const wallets = Storage.getWallets();
        list.innerHTML = '';

        wallets.forEach(w => {
            const item = document.createElement('div');
            item.className = 'glass-card';
            item.style.padding = '12px 16px';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';

            // Ensure legacy wallet currency ('৳' or 'Tk') maps properly or fallback
            let code = w.currency;
            if (code === '৳' || code === 'Tk') code = 'BDT'; // migration patch

            const currencyObj = Utils.CURRENCIES.find(c => c.code === code) || { symbol: w.currency };
            
            item.innerHTML = `
                <div>
                    <h4 style="margin:0; font-size:1rem; color:var(--text-primary);">${Utils.sanitizeHTML(w.name)}</h4>
                    <small style="color:var(--text-secondary);">${code} (${currencyObj.symbol})</small>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn-icon edit-wallet-btn" data-id="${w.id}" title="Edit Wallet">
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    ${wallets.length > 1 ? `
                    <button class="btn-icon delete-wallet-btn" data-id="${w.id}" title="Delete Wallet" style="color:var(--accent-danger);">
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                    ` : ''}
                </div>
            `;
            list.appendChild(item);
        });
    }

    function setupEventListeners() {
        const baseSelect = document.getElementById('settings-base-currency');
        if (baseSelect) {
            baseSelect.onchange = (e) => {
                Storage.updateSettings({ currency: e.target.value });
                Utils.showToast(`Base Currency updated to ${e.target.value}`, 'success');
                if (typeof App !== 'undefined' && App.refreshCurrentPage) App.refreshCurrentPage();
            };
        }

        // Add Wallet Button
        const addBtn = document.getElementById('btn-add-wallet');
        if (addBtn) {
            addBtn.onclick = () => {
                document.getElementById('modal-wallet-title').textContent = 'Add Wallet';
                document.getElementById('form-wallet').reset();
                document.getElementById('wallet-id').value = '';
                populateWalletCurrencyDropdown();
                document.getElementById('modal-wallet-overlay').classList.add('active');
            };
        }

        // Edit/Delete Buttons via Event Delegation
        const list = document.getElementById('wallets-list');
        if (list) {
            list.onclick = (e) => {
                const editBtn = e.target.closest('.edit-wallet-btn');
                const delBtn = e.target.closest('.delete-wallet-btn');

                if (editBtn) {
                    const id = editBtn.dataset.id;
                    const wallet = Storage.getWallets().find(w => w.id === id);
                    if (wallet) {
                        document.getElementById('modal-wallet-title').textContent = 'Edit Wallet';
                        document.getElementById('wallet-id').value = wallet.id;
                        document.getElementById('wallet-name').value = wallet.name;
                        populateWalletCurrencyDropdown();
                        
                        let code = wallet.currency;
                        if (code === '৳' || code === 'Tk') code = 'BDT';
                        document.getElementById('wallet-currency').value = code;
                        
                        document.getElementById('modal-wallet-overlay').classList.add('active');
                    }
                }

                if (delBtn) {
                    const id = delBtn.dataset.id;
                    if (confirm('Are you sure you want to delete this wallet?')) {
                        Storage.deleteWallet(id);
                        Utils.showToast('Wallet deleted', 'info');
                        renderWallets();
                        if (typeof App !== 'undefined') App.setupWalletSelector();
                    }
                }
            };
        }

        // Form Submit
        const form = document.getElementById('form-wallet');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const id = document.getElementById('wallet-id').value;
                const name = document.getElementById('wallet-name').value;
                const currency = document.getElementById('wallet-currency').value;

                Storage.saveWallet({ id, name, currency });
                Utils.showToast(id ? 'Wallet updated!' : 'Wallet created!', 'success');
                document.getElementById('modal-wallet-overlay').classList.remove('active');
                renderWallets();
                if (typeof App !== 'undefined') App.setupWalletSelector();
            };
        }
    }

    function populateWalletCurrencyDropdown() {
        const select = document.getElementById('wallet-currency');
        if (!select) return;
        select.innerHTML = '';
        Utils.CURRENCIES.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.code;
            opt.textContent = `${c.code} (${c.symbol})`;
            select.appendChild(opt);
        });
    }

    /* ========== RECURRING BILLS ========== */
    function renderRecurring() {
        const list = document.getElementById('recurring-list');
        if (!list) return;

        const recurring = Storage.getRecurringTransactions();
        if (recurring.length === 0) {
            list.innerHTML = '<div style="color:var(--text-tertiary); text-align:center; padding:10px;">No recurring bills setup.</div>';
            return;
        }

        list.innerHTML = recurring.map(r => {
            const wallet = Storage.getWallets().find(w => w.id === r.walletId);
            const wCurrency = wallet ? wallet.currency : 'BDT';
            const cat = Utils.getCategoryById(r.category);
            const amtStr = Utils.formatCurrencyRaw(r.amount, wCurrency, true);
            const statText = r.isActive ? 'Active' : 'Paused';
            
            return `
                <div class="wallet-item" style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-elevated); padding:12px; border-radius:8px;">
                    <div>
                        <div style="font-weight:600;">${cat.icon} ${cat.name} (${amtStr})</div>
                        <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px;">
                            ${r.frequency.charAt(0).toUpperCase() + r.frequency.slice(1)} 
                            &bull; Next: ${Utils.formatDate(r.nextDueDate)} 
                            &bull; Status: ${statText}
                        </div>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-outline btn-sm delete-rec-btn" data-id="${r.id}" style="color:var(--accent-danger); border-color:var(--accent-danger);">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function setupRecurringForm() {
        // Toggle Expense/Income
        const toggleBtns = document.querySelectorAll('#rec-type-toggle .toggle-btn');
        toggleBtns.forEach(btn => {
            btn.onclick = (e) => {
                toggleBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                if (typeof App !== 'undefined') App.populateTransactionCategories(e.target.dataset.type, 'rec-category');
            };
        });

        // Add bill click
        document.getElementById('btn-add-recurring').onclick = () => {
            document.getElementById('form-recurring').reset();
            document.getElementById('rec-id').value = '';
            
            // Populates
            if (typeof App !== 'undefined') App.populateTransactionCategories('expense', 'rec-category');
            
            const walletSelect = document.getElementById('rec-wallet');
            walletSelect.innerHTML = '';
            Storage.getWallets().forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.id;
                opt.textContent = w.name;
                walletSelect.appendChild(opt);
            });

            document.getElementById('modal-recurring-overlay').classList.add('active');
        };

        // Form submit
        const form = document.getElementById('form-recurring');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const type = document.querySelector('#rec-type-toggle .active').dataset.type;
                const id = document.getElementById('rec-id').value;
                const rec = {
                    id: id || undefined,
                    type,
                    amount: parseFloat(document.getElementById('rec-amount').value),
                    category: document.getElementById('rec-category').value,
                    walletId: document.getElementById('rec-wallet').value,
                    frequency: document.getElementById('rec-frequency').value,
                    nextDueDate: document.getElementById('rec-next-date').value,
                    note: document.getElementById('rec-note').value,
                    isActive: true
                };

                Storage.saveRecurringTransaction(rec);
                Utils.showToast('Recurring Bill saved!', 'success');
                document.getElementById('modal-recurring-overlay').classList.remove('active');
                renderRecurring();
            };
        }

        // Delete delegation
        document.getElementById('recurring-list').onclick = (e) => {
            const delBtn = e.target.closest('.delete-rec-btn');
            if (delBtn) {
                if(confirm('Delete this recurring bill?')) {
                    Storage.deleteRecurringTransaction(delBtn.dataset.id);
                    Utils.showToast('Deleted!', 'info');
                    renderRecurring();
                }
            }
        };
    }

    /* ========== THEME CUSTOMIZER ========== */
    function setupThemeCustomizer() {
        const currentTheme = Storage.getSettings().theme || 'dark';
        const currentAccent = Storage.getSettings().accentColor || 'purple';

        document.getElementById('theme-btn-dark').onclick = () => {
            Storage.updateSettings({ theme: 'dark' });
            if (typeof App !== 'undefined') App.applyTheme('dark');
        };
        document.getElementById('theme-btn-light').onclick = () => {
            Storage.updateSettings({ theme: 'light' });
            if (typeof App !== 'undefined') App.applyTheme('light');
        };

        const swatches = document.querySelectorAll('.accent-swatch');
        swatches.forEach(swatch => {
            swatch.onclick = () => {
                const color = swatch.dataset.accent;
                Storage.updateSettings({ accentColor: color });
                if (typeof App !== 'undefined') App.applyAccentColor(color);
                
                // Highlight active swatch
                swatches.forEach(s => s.style.border = 'none');
                swatch.style.border = '2px solid white';
                
                // Redraw charts if needed
                if(typeof App !== 'undefined') App.refreshCurrentPage();
            };
            if(swatch.dataset.accent === currentAccent) {
                swatch.style.border = '2px solid white';
            }
        });
    }

    /* ========== EXPORT & IMPORT ========== */
    function setupExportImport() {
        // JSON Export
        document.getElementById('btn-export-json').onclick = () => {
            const data = Storage.exportData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `budgetpro-export-${Utils.getTodayString()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            Utils.showToast('Data exported successfully!', 'success');
        };

        // PDF Export
        document.getElementById('btn-export-pdf').onclick = () => {
            if (!window.jspdf) {
                Utils.showToast('PDF Library not loaded', 'error');
                return;
            }
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            doc.setFontSize(20);
            doc.text("BudgetPro - Financial Report", 14, 22);
            
            doc.setFontSize(11);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
            
            const txs = Storage.getTransactions();
            const tableData = txs.map(t => {
                const c = Utils.getCategoryById(t.category);
                return [
                    Utils.formatDate(t.date),
                    t.type.toUpperCase(),
                    c.name,
                    t.amount.toString(),
                    t.note || ''
                ];
            });

            doc.autoTable({
                startY: 40,
                head: [['Date', 'Type', 'Category', 'Amount', 'Note']],
                body: tableData,
            });

            doc.save(`budgetpro-report-${Utils.getTodayString()}.pdf`);
            Utils.showToast('PDF exported successfully!', 'success');
        };

        // CSV/Excel Import
        document.getElementById('file-import-csv').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(evt) {
                const data = evt.target.result;
                let workbook;
                try {
                    workbook = XLSX.read(data, { type: 'binary' });
                } catch(err) {
                    Utils.showToast('Error reading file. Must be valid CSV/Excel.', 'error');
                    return;
                }
                
                const firstSheet = workbook.SheetNames[0];
                const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
                
                if (rows.length === 0) {
                    Utils.showToast('No data found in file', 'error');
                    return;
                }

                let importedCount = 0;
                rows.forEach(row => {
                    const type = (row.Type || row.type || 'expense').toString().toLowerCase();
                    const amount = parseFloat(row.Amount || row.amount || 0);
                    const date = row.Date || row.date || Utils.getTodayString();
                    const note = row.Note || row.note || 'Imported';
                    const catName = row.Category || row.category || 'Other';
                    
                    if(amount > 0) {
                        // Find matching category ID
                        const cat = Utils.CATEGORIES[type].find(c => c.name.toLowerCase() === catName.toLowerCase());
                        const catId = cat ? cat.id : Utils.CATEGORIES[type][0].id;

                        Storage.addTransaction({
                            type,
                            amount,
                            category: catId,
                            date,
                            note,
                            walletId: 'wallet_main' // Default to main wallet
                        });
                        importedCount++;
                    }
                });

                Utils.showToast(`Imported ${importedCount} transactions!`, 'success');
                if (typeof App !== 'undefined') App.refreshCurrentPage();
            };
            reader.readAsBinaryString(file);
        };
    }

    return { render };

})();
