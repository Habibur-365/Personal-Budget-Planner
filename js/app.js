/**
 * ============================================
 *  Fund Manager — Main Application Controller
 * ============================================
 */

const App = (() => {

    let currentPage = 'dashboard';
    let initialized = false;

    /* ========== INITIALIZATION ========== */
    function init() {
        if (initialized) return;
        initialized = true;

        // Seed default data on first run
        Storage.seedDefaultData();

        // Process Recurring Bills
        Storage.processRecurringDues();
        checkUpcomingBillsNotification();

        // Load saved settings (theme and accent color)
        const settings = Storage.getSettings();
        applyTheme(settings.theme || 'dark');
        applyAccentColor(settings.accentColor || 'purple');

        // Set header date
        document.getElementById('header-date').textContent = Utils.getHeaderDateString();

        // Setup all event listeners
        setupNavigation();
        setupThemeToggle();
        setupModalClose();
        setupWalletSelector();
        setupTransactionForm();
        setupFAB();
        setupMobileMenu();
        setupNotifications();

        // Navigate to initial page
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        navigateTo(hash);
    }

    function checkUpcomingBillsNotification() {
        const upcoming = Storage.getUpcomingBills(3); // Next 3 days
        if (upcoming.length > 0) {
            // Check if we already notified today to prevent spam
            const lastNotifDate = localStorage.getItem('bp_last_bill_notif');
            const today = Utils.getTodayString();
            if (lastNotifDate !== today) {
                Storage.addNotification(`You have ${upcoming.length} upcoming bill(s) due within 3 days.`);
                localStorage.setItem('bp_last_bill_notif', today);
            }
        }
    }

    /* ========== NAVIGATION ========== */
    function setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item, .bottom-nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                navigateTo(page);
                closeMobileMenu();
            });
        });

        // "View All" link on dashboard
        document.querySelectorAll('[data-page]').forEach(link => {
            if (!link.classList.contains('nav-item') && !link.classList.contains('bottom-nav-item')) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    navigateTo(link.dataset.page);
                });
            }
        });

        // Handle browser back/forward
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.replace('#', '') || 'dashboard';
            if (hash !== currentPage) {
                navigateTo(hash, false);
            }
        });
    }

    function navigateTo(page, pushState = true) {
        const validPages = ['dashboard', 'transactions', 'budget', 'analytics', 'settings', 'calendar'];
        if (!validPages.includes(page)) page = 'dashboard';

        // Destroy previous charts
        if (currentPage === 'dashboard') Dashboard.destroy();
        if (currentPage === 'analytics') Analytics.destroy();

        currentPage = page;

        // Update nav (sidebar & bottom nav)
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Show correct page
        document.querySelectorAll('.page').forEach(section => {
            section.classList.toggle('active', section.id === `page-${page}`);
        });

        // Update title
        const titles = {
            dashboard: 'Dashboard',
            transactions: 'Transactions',
            budget: 'Budget Goals',
            analytics: 'Analytics',
            calendar: 'Calendar',
            settings: 'Settings'
        };
        document.getElementById('page-title').textContent = titles[page];

        // Update hash
        if (pushState) {
            window.location.hash = page;
        }

        // Render page content
        renderPage(page);
    }

    function renderPage(page) {
        if (page === 'dashboard') Dashboard.render();
        else if (page === 'transactions') Transactions.render();
        else if (page === 'budget') Budget.render();
        else if (page === 'analytics') Analytics.render();
        else if (page === 'settings') Settings.render();
        else if (page === 'calendar') {
            if (typeof Calendar !== 'undefined') Calendar.render();
        }
    }

    function refreshCurrentPage() {
        if (currentPage === 'dashboard') Dashboard.refresh();
        else if (currentPage === 'transactions') Transactions.refresh();
        else if (currentPage === 'budget') Budget.refresh();
        else if (currentPage === 'analytics') {
            if (typeof Analytics.refresh === 'function') Analytics.refresh();
            else Analytics.render();
        }
        else if (currentPage === 'settings') Settings.render();
        else if (currentPage === 'calendar') {
            if (typeof Calendar !== 'undefined') Calendar.refresh();
        }
    }

    /* ========== THEME ========== */
    function setupThemeToggle() {
        document.getElementById('theme-toggle').addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            Storage.updateSettings({ theme: next });

            // Re-render current page to update chart colors
            refreshCurrentPage();
        });
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const label = document.querySelector('.toggle-label');
        if (label) {
            label.textContent = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
        }
    }

    function applyAccentColor(color) {
        document.documentElement.setAttribute('data-accent', color);
    }

    /* ========== WALLET SELECTOR ========== */
    function setupWalletSelector() {
        const headerSelect = document.getElementById('header-wallet-select');
        if (!headerSelect) return;

        function populate() {
            const wallets = Storage.getWallets();
            headerSelect.innerHTML = '<option value="all">All Wallets</option>';
            wallets.forEach(w => {
                const opt = document.createElement('option');
                opt.value = w.id;
                opt.textContent = w.name;
                headerSelect.appendChild(opt);
            });
            headerSelect.value = Storage.getActiveWalletId();
        }

        populate();

        // Use onchange instead of addEventListener to prevent duplicate handlers
        headerSelect.onchange = (e) => {
            Storage.setActiveWalletId(e.target.value);
            refreshCurrentPage();
        };
    }

    /* ========== MODAL MANAGEMENT ========== */
    function openModal(overlayId) {
        const overlay = document.getElementById(overlayId);
        if (overlay) {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal(overlayId) {
        const overlay = document.getElementById(overlayId);
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    function setupModalClose() {
        // Close buttons
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                closeModal(btn.dataset.close);
            });
        });

        // Click outside modal
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeModal(overlay.id);
                }
            });
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(overlay => {
                    closeModal(overlay.id);
                });
            }
        });
    }

    /* ---------- Transaction Form ---------- */
    function setupTransactionForm() {
        const form = document.getElementById('form-transaction');
        const typeToggle = document.getElementById('tx-type-toggle');
        let currentType = 'expense';

        // Set up Wallet dropdown
        const walletSelect = document.getElementById('tx-wallet');

        function updateWalletDropdown() {
            if (!walletSelect) return;
            const wallets = Storage.getWallets();
            walletSelect.innerHTML = wallets.map(w => `<option value="${w.id}">${Utils.sanitizeHTML(w.name)}</option>`).join('');
            
            const activeId = Storage.getActiveWalletId();
            if (activeId !== 'all') {
                walletSelect.value = activeId;
            } else if (wallets.length > 0) {
                walletSelect.value = wallets[0].id;
            }
        }

        if (typeToggle) {
            typeToggle.addEventListener('click', (e) => {
                if (e.target.classList.contains('toggle-btn')) {
                    document.querySelectorAll('#tx-type-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    currentType = e.target.dataset.type;
                    populateTransactionCategories(currentType);
                    
                    const categorySelect = document.getElementById('tx-category');
                    if (categorySelect) {
                        const ev = new Event('change');
                        categorySelect.dispatchEvent(ev);
                    }
                }
            });
        }

        if (form) {
            const categorySelect = document.getElementById('tx-category');
            const customCategoryGroup = document.getElementById('tx-custom-category-group');
            const customCategoryInput = document.getElementById('tx-custom-category');
            if (categorySelect && customCategoryGroup && customCategoryInput) {
                categorySelect.addEventListener('change', (e) => {
                    if (e.target.value === 'other_expense' || e.target.value === 'other_income') {
                        customCategoryGroup.style.display = 'block';
                        customCategoryInput.required = true;
                    } else {
                        customCategoryGroup.style.display = 'none';
                        customCategoryInput.required = false;
                        customCategoryInput.value = '';
                    }
                });
            }

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = document.getElementById('tx-id').value;
                const amount = document.getElementById('tx-amount').value;
                const category = document.getElementById('tx-category').value;
                const customCategory = customCategoryInput ? customCategoryInput.value.trim() : '';
                const date = document.getElementById('tx-date').value;
                const note = document.getElementById('tx-note').value;
                const walletId = walletSelect ? walletSelect.value : undefined;

                const parsedAmount = parseFloat(amount);
                if (!amount || isNaN(parsedAmount) || parsedAmount <= 0 || !category || !date) {
                    Utils.showToast('Please fill all required fields with valid values. Amount must be greater than 0.', 'error');
                    return;
                }

                const data = { type: currentType, amount, category, customCategory, date, note, walletId };

                if (id) {
                    Storage.updateTransaction(id, data);
                    Utils.showToast('Transaction updated successfully!', 'success');
                } else {
                    Storage.addTransaction(data);
                    Utils.showToast('Transaction added successfully!', 'success');
                }

                closeModal('modal-transaction-overlay');
                // Refresh all data-driven pages so dashboard, transactions, budget, analytics all stay in sync
                Dashboard.render();
                if (typeof Transactions !== 'undefined' && Transactions.refresh) Transactions.refresh();
                if (typeof Budget !== 'undefined' && Budget.refresh) Budget.refresh();
                if (typeof Analytics !== 'undefined' && Analytics.refresh) Analytics.refresh();
                if (typeof Calendar !== 'undefined' && Calendar.refresh) Calendar.refresh();
            });
        }

        // Initialize categories & wallets
        populateTransactionCategories(currentType);
        updateWalletDropdown();

        // Listen for Add button globally
        document.querySelectorAll('.btn-add').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('modal-transaction-title').textContent = 'Add Transaction';
                form.reset();
                document.getElementById('tx-id').value = '';
                document.getElementById('tx-date').value = Utils.getTodayString();
                
                // reset type
                document.querySelectorAll('#tx-type-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
                const expenseBtn = document.querySelector('#tx-type-toggle .toggle-btn[data-type="expense"]');
                if(expenseBtn) expenseBtn.classList.add('active');
                currentType = 'expense';
                populateTransactionCategories(currentType);
                updateWalletDropdown();

                const customCategoryGroup = document.getElementById('tx-custom-category-group');
                const customCategoryInput = document.getElementById('tx-custom-category');
                if (customCategoryGroup) customCategoryGroup.style.display = 'none';
                if (customCategoryInput) {
                    customCategoryInput.required = false;
                    customCategoryInput.value = '';
                }

                openModal('modal-transaction-overlay');
            });
        });
    }

    function populateTransactionCategories(type, targetId = 'tx-category') {
        const select = document.getElementById(targetId);
        if (!select) return;
        const categories = Utils.getCategoriesByType(type);
        select.innerHTML = '';
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = `${cat.icon} ${cat.name}`;
            select.appendChild(opt);
        });
    }



    /* ========== FAB (Mobile Add Button) ========== */
    function setupFAB() {
        document.getElementById('fab-add').addEventListener('click', () => {
            const addBtn = document.getElementById('btn-add-transaction');
            if (addBtn) addBtn.click();
        });
    }

    /* ========== MOBILE MENU ========== */
    function setupMobileMenu() {
        document.getElementById('menu-toggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
            document.getElementById('sidebar-overlay').classList.toggle('active');
        });

        document.getElementById('sidebar-overlay').addEventListener('click', closeMobileMenu);
    }

    function closeMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if(sidebar) sidebar.classList.remove('open');
        if(overlay) overlay.classList.remove('active');
    }

    /* ========== NOTIFICATIONS ========== */
    function setupNotifications() {
        const notifBtn = document.getElementById('btn-notifications');
        const dropdown = document.getElementById('notif-dropdown');
        if (!notifBtn || !dropdown) return;

        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
            if (dropdown.classList.contains('active')) {
                Storage.markNotificationsRead();
                updateNotificationBadge();
                renderNotifications();
            }
        });

        document.addEventListener('click', (e) => {
            if (!notifBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });

        updateNotificationBadge();
        renderNotifications();
    }

    function updateNotificationBadge() {
        const badge = document.getElementById('notif-badge');
        if (!badge) return;
        const unreadCount = Storage.getNotifications().filter(n => !n.read).length;
        if (unreadCount > 0) {
            badge.style.display = 'flex';
            badge.textContent = unreadCount;
        } else {
            badge.style.display = 'none';
        }
    }

    function renderNotifications() {
        const list = document.getElementById('notif-list');
        if (!list) return;
        
        const notifs = Storage.getNotifications().sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (notifs.length === 0) {
            list.innerHTML = '<div style="padding:16px; text-align:center; color:var(--text-tertiary)">No notifications</div>';
            return;
        }

        list.innerHTML = notifs.map(n => `
            <div class="notif-item ${n.read ? '' : 'unread'}">
                <div style="margin-bottom:4px">${n.text}</div>
                <div style="font-size:0.7rem; opacity:0.6">${Utils.formatDate(n.date)}</div>
            </div>
        `).join('');
    }

    /* ========== PUBLIC API ========== */
    return {
        init,
        navigateTo,
        refreshCurrentPage,
        openModal,
        closeModal,
        populateTransactionCategories,
        setupWalletSelector,
        applyTheme,
        applyAccentColor
    };

})();

/* ========== START THE APP ========== */
document.addEventListener('DOMContentLoaded', () => {
    if (!window.FirebaseApp) {
        App.init();
        return;
    }

    // Wait for Firebase Auth state
    FirebaseApp.auth.onAuthStateChanged((user) => {
        const loginOverlay = document.getElementById('modal-login-overlay');
        const userProfile = document.getElementById('user-profile');
        
        if (user) {
            // User is logged in
            if(loginOverlay) loginOverlay.style.display = 'none';
            if(userProfile) {
                userProfile.style.display = 'block';
                const avatar = document.getElementById('user-avatar');
                const dropdownAvatar = document.getElementById('dropdown-avatar');
                const dropdownName = document.getElementById('dropdown-user-name');
                const dropdownEmail = document.getElementById('dropdown-user-email');
                
                const photoURL = user.photoURL || 'icons/icon-72.png';
                if(avatar) avatar.src = photoURL;
                if(dropdownAvatar) dropdownAvatar.src = photoURL;
                if(dropdownName) dropdownName.textContent = user.displayName || 'User';
                if(dropdownEmail) dropdownEmail.textContent = user.email || '';
            }
            
            // Sync data from firestore then init app
            Storage.syncFromFirebase(user).then(() => {
                App.init();
            });
            
        } else {
            // User is logged out
            if(loginOverlay) loginOverlay.style.display = 'flex';
            if(userProfile) userProfile.style.display = 'none';
        }
    });

    // Profile dropdown toggle
    const avatarBtn = document.getElementById('user-avatar-btn');
    const userDropdown = document.getElementById('user-dropdown');
    if (avatarBtn && userDropdown) {
        avatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
            if (!userDropdown.contains(e.target) && !avatarBtn.contains(e.target)) {
                userDropdown.classList.remove('active');
            }
        });
    }

    const btnLogin = document.getElementById('btn-login-google');
    if(btnLogin) {
        btnLogin.addEventListener('click', () => {
            FirebaseApp.auth.signInWithPopup(FirebaseApp.googleProvider).catch(err => {
                Utils.showToast('Login Failed: ' + err.message, 'error');
            });
        });
    }

    const btnLogout = document.getElementById('btn-logout');
    if(btnLogout) {
        btnLogout.addEventListener('click', () => {
            FirebaseApp.auth.signOut().then(() => {
                Storage.clearAll(); // Clear local data on logout
                location.reload();
            });
        });
    }
});
