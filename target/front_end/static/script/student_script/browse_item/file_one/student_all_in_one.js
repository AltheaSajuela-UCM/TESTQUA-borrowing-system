document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SIDEBAR DRAWER TOGGLE ---
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

    // --- 2. DROPDOWN ELEMENTS ---
    const notifBtn = document.getElementById('notifBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    const notifTabs = document.querySelectorAll('.notif-tab');
    const notifItems = document.querySelectorAll('.notif-item');

    const userProfile = document.getElementById('userProfileBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    // --- 3. NOTIFICATION POPUP TOGGLE & FILTERING ---
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

    // --- 4. PROFILE DROPDOWN TOGGLE ---
    if (userProfile && profileDropdown) {
        userProfile.addEventListener('click', (e) => {
            e.stopPropagation();
            if (notifDropdown) notifDropdown.classList.remove('show');
            profileDropdown.classList.toggle('show');
        });
    }

    // Close open menus when clicking outside
    document.addEventListener('click', () => {
        if (notifDropdown) notifDropdown.classList.remove('show');
        if (profileDropdown) profileDropdown.classList.remove('show');
    });

    // --- 5. ITEM CATALOG SEARCH & FILTER ---
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

    // --- 6. DYNAMIC INLINE DETAILS VIEW TOGGLE (Works for both Available and Borrowed) ---
    const catalogView = document.getElementById('catalogView');
    const detailsView = document.getElementById('detailsView');
    const backToCatalogLink = document.getElementById('backToCatalogLink');
    const backBtn = document.getElementById('backBtn');

    // Detail elements to populate dynamically
    const detailItemName = document.getElementById('detailItemName');
    const detailItemDesc = document.getElementById('detailItemDesc');
    const detailBreadcrumb = document.getElementById('detailBreadcrumb');
    const detailCategory = document.getElementById('detailCategory');
    const detailCode = document.getElementById('detailCode');
    const detailCondition = document.getElementById('detailCondition');
    const detailWaiver = document.getElementById('detailWaiver');
    const detailIdSurrender = document.getElementById('detailIdSurrender');
    const detailStatusContainer = document.getElementById('detailStatusContainer');
    const detailActionBtn = document.getElementById('detailActionBtn');
    const detailImageBox = document.getElementById('detailImageBox');

    itemCards.forEach(card => {
        const triggerBtn = card.querySelector('.view-details-trigger');
        if (triggerBtn) {
            triggerBtn.addEventListener('click', (e) => {
                e.preventDefault();

                // Extract data from the selected card
                const name = card.querySelector('.item-name')?.textContent || '';
                const code = card.querySelector('.item-code')?.textContent || '';
                const category = card.dataset.category === 'academic' ? 'Academic' : 'Non-Academic';
                const status = card.dataset.status;
                const description = card.dataset.description || '';
                const condition = card.dataset.condition || 'Good';
                const waiver = card.dataset.waiver || 'No';
                const idSurrender = card.dataset.idSurrender || 'No';
                const imageHtml = card.querySelector('.item-image-placeholder').innerHTML;

                // Populate details view
                if (detailItemName) detailItemName.textContent = name;
                if (detailItemDesc) detailItemDesc.textContent = description;
                if (detailBreadcrumb) detailBreadcrumb.textContent = `Home / Items / ${name}`;
                if (detailCategory) detailCategory.textContent = category;
                if (detailCode) detailCode.textContent = code;
                if (detailCondition) detailCondition.textContent = condition;
                if (detailWaiver) detailWaiver.textContent = waiver;
                if (detailIdSurrender) detailIdSurrender.textContent = idSurrender;
                if (detailImageBox) detailImageBox.innerHTML = imageHtml;

                // Handle status badge & action button depending on whether the item is available or borrowed
                if (detailStatusContainer) {
                    if (status === 'available') {
                        detailStatusContainer.innerHTML = `<span class="status-badge available">Available</span>`;
                        if (detailActionBtn) {
                            detailActionBtn.textContent = 'Borrow This Item';
                            detailActionBtn.className = 'btn-primary';
                            detailActionBtn.disabled = false;
                        }
                    } else {
                        detailStatusContainer.innerHTML = `<span class="status-badge borrowed">Borrowed</span>`;
                        if (detailActionBtn) {
                            detailActionBtn.textContent = 'Unavailable';
                            detailActionBtn.className = 'btn-disabled';
                            detailActionBtn.disabled = true;
                        }
                    }
                }

                // Switch views smoothly
                if (catalogView && detailsView) {
                    catalogView.style.display = 'none';
                    detailsView.style.display = 'block';
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }
    });

    function showCatalog(e) {
        if (e) e.preventDefault();
        if (catalogView && detailsView) {
            detailsView.style.display = 'none';
            catalogView.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    if (backToCatalogLink) backToCatalogLink.addEventListener('click', showCatalog);
    if (backBtn) backBtn.addEventListener('click', showCatalog);

});