document.addEventListener('DOMContentLoaded', () => {

    // 1. CATEGORY TOGGLE (Academic vs Non-Academic)
    const categoryBtns = document.querySelectorAll('.category-toggle .toggle-btn');
    const itemCards = document.querySelectorAll('.item-card');

    if (categoryBtns.length > 0) {
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                categoryBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const selectedCategory = btn.dataset.category;
                filterCatalog(selectedCategory, document.getElementById('statusFilter')?.value, document.getElementById('searchInput')?.value);
            });
        });
    }

    // 2. SEARCH & STATUS FILTERING
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');

    function filterCatalog(category = 'academic', status = 'all', searchQuery = '') {
        itemCards.forEach(card => {
            const cardCategory = card.dataset.category;
            const cardStatus = card.dataset.status;
            const itemName = card.querySelector('.item-name')?.textContent.toLowerCase() || '';

            const matchesCategory = cardCategory === category;
            const matchesStatus = status === 'all' || cardStatus === status;
            const matchesSearch = itemName.includes(searchQuery.toLowerCase().trim());

            if (matchesCategory && matchesStatus && matchesSearch) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const activeCategory = document.querySelector('.category-toggle .toggle-btn.active')?.dataset.category || 'academic';
            filterCatalog(activeCategory, statusFilter?.value, e.target.value);
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            const activeCategory = document.querySelector('.category-toggle .toggle-btn.active')?.dataset.category || 'academic';
            filterCatalog(activeCategory, e.target.value, searchInput?.value);
        });
    }

    // 3. FORM SUBMISSION REDIRECT
    const borrowForm = document.getElementById('borrowForm');
    if (borrowForm) {
        borrowForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Redirect to submission confirmation page
            window.location.href = 'request_submitted.html';
        });
    }

});

//==================================
document.addEventListener('DOMContentLoaded', () => {
    // --- SIDEBAR DRAWER TOGGLE ---
    const menuBtn = document.querySelector('.menu-btn');
    const sidebar = document.getElementById('sidebarDrawer');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');

    function openSidebar() {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.add('active');
            sidebarOverlay.classList.add('active');
        }
    }

    function closeSidebar() {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        }
    }

    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    // --- NOTIFICATION POPUP TOGGLE & FILTERING ---
    const notifBtn = document.getElementById('notifBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    const notifTabs = document.querySelectorAll('.notif-tab');
    const notifItems = document.querySelectorAll('.notif-item');

    if (notifBtn && notifDropdown) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close profile dropdown if open
            if (profileDropdown) profileDropdown.classList.remove('show');
            notifDropdown.classList.toggle('show');
        });
    }

    notifTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.stopPropagation();
            notifTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const filter = tab.dataset.tab;
            notifItems.forEach(item => {
                if (filter === 'all') {
                    item.style.display = 'block';
                } else if (filter === 'unread') {
                    item.style.display = item.classList.contains('unread') ? 'block' : 'none';
                } else if (filter === 'alerts') {
                    item.style.display = item.classList.contains('alert-item') ? 'block' : 'none';
                }
            });
        });
    });

    // Mark notification as read
    document.querySelectorAll('.mark-read-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.notif-item');
            if (card) {
                card.classList.remove('unread');
                btn.remove();
            }
        });
    });

    // --- PROFILE DROPDOWN TOGGLE ---
    const userProfile = document.getElementById('userProfileBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    if (userProfile && profileDropdown) {
        userProfile.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close notification dropdown if open
            if (notifDropdown) notifDropdown.classList.remove('show');
            profileDropdown.classList.toggle('show');
        });
    }

    // Close open menus when clicking outside
    document.addEventListener('click', () => {
        if (notifDropdown) notifDropdown.classList.remove('show');
        if (profileDropdown) profileDropdown.classList.remove('show');
    });

    // --- ITEM CATALOG SEARCH & STATUS FILTER ---
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const categoryBtns = document.querySelectorAll('.category-toggle .toggle-btn');
    const itemCards = document.querySelectorAll('.items-grid .item-card');

    let activeCategory = 'academic';

    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.dataset.category;
            filterItems();
        });
    });

    function filterItems() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const status = statusFilter ? statusFilter.value : 'all';

        itemCards.forEach(card => {
            const name = card.querySelector('.item-name')?.textContent.toLowerCase() || '';
            const code = card.querySelector('.item-code')?.textContent.toLowerCase() || '';
            const itemCat = card.dataset.category;
            const itemStatus = card.dataset.status;

            const matchesCategory = itemCat === activeCategory;
            const matchesSearch = name.includes(query) || code.includes(query);
            const matchesStatus = status === 'all' || itemStatus === status;

            if (matchesCategory && matchesSearch && matchesStatus) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    if (searchInput) searchInput.addEventListener('input', filterItems);
    if (statusFilter) statusFilter.addEventListener('change', filterItems);
});

//===============
document.addEventListener('DOMContentLoaded', () => {
    // --- SIDEBAR DRAWER TOGGLE ---
    const menuBtn = document.querySelector('.menu-btn');
    const sidebar = document.getElementById('sidebarDrawer');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');

    function openSidebar() {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.add('active');
            sidebarOverlay.classList.add('active');
        }
    }

    function closeSidebar() {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        }
    }

    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    // --- NOTIFICATION POPUP TOGGLE & FILTERING ---
    const notifBtn = document.getElementById('notifBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    const notifTabs = document.querySelectorAll('.notif-tab');
    const notifItems = document.querySelectorAll('.notif-item');

    if (notifBtn && notifDropdown) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (profileDropdown) profileDropdown.classList.remove('show');
            notifDropdown.classList.toggle('show');
        });
    }

    notifTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.stopPropagation();
            notifTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const filter = tab.dataset.tab;
            notifItems.forEach(item => {
                if (filter === 'all') {
                    item.style.display = 'block';
                } else if (filter === 'unread') {
                    item.style.display = item.classList.contains('unread') ? 'block' : 'none';
                } else if (filter === 'alerts') {
                    item.style.display = item.classList.contains('alert-item') ? 'block' : 'none';
                }
            });
        });
    });

    document.querySelectorAll('.mark-read-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.notif-item');
            if (card) {
                card.classList.remove('unread');
                btn.remove();
            }
        });
    });

    // --- PROFILE DROPDOWN TOGGLE ---
    const userProfile = document.getElementById('userProfileBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    if (userProfile && profileDropdown) {
        userProfile.addEventListener('click', (e) => {
            e.stopPropagation();
            if (notifDropdown) notifDropdown.classList.remove('show');
            profileDropdown.classList.toggle('show');
        });
    }

    document.addEventListener('click', () => {
        if (notifDropdown) notifDropdown.classList.remove('show');
        if (profileDropdown) profileDropdown.classList.remove('show');
    });

    // --- ITEM CATALOG SEARCH, CATEGORY & STATUS FILTER ---
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const categoryBtns = document.querySelectorAll('.category-toggle .toggle-btn');
    const itemCards = document.querySelectorAll('.items-grid .item-card');

    let activeCategory = 'academic';

    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.dataset.category;
            filterItems();
        });
    });

    function filterItems() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const status = statusFilter ? statusFilter.value : 'all';

        itemCards.forEach(card => {
            const name = card.querySelector('.item-name')?.textContent.toLowerCase() || '';
            const code = card.querySelector('.item-code')?.textContent.toLowerCase() || '';
            const itemCat = card.dataset.category;
            const itemStatus = card.dataset.status;

            const matchesCategory = itemCat === activeCategory;
            const matchesSearch = name.includes(query) || code.includes(query);
            const matchesStatus = status === 'all' || itemStatus === status;

            if (matchesCategory && matchesSearch && matchesStatus) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    if (searchInput) searchInput.addEventListener('input', filterItems);
    if (statusFilter) statusFilter.addEventListener('change', filterItems);
});