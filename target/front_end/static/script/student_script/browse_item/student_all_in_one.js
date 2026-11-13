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

    // --- 5. ITEM CATALOG (loaded from the backend) ---
    const API_URL   = '../../../../backend/3_student/browse.php';
    const LOGIN_URL = '../../login_page/index.html';

    const searchInput  = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const categoryBtns = document.querySelectorAll('.category-toggle .toggle-btn');
    const itemsGrid    = document.getElementById('itemsGrid');

    let allItems = [];
    let activeCategory = 'academic';
    let selectedItem = null;

    function esc(value) {
        const d = document.createElement('div');
        d.textContent = value == null ? '' : value;
        return d.innerHTML;
    }
    function catKey(category) { return category === 'Academic' ? 'academic' : 'non-academic'; }
    function yesNo(v) { return (v === 1 || v === '1' || v === true) ? 'Yes' : 'No'; }

    async function loadItems() {
        try {
            const res = await fetch(API_URL, { credentials: 'same-origin' });
            if (res.status === 401 || res.status === 403) {
                window.location.replace(LOGIN_URL);
                return;
            }
            const data = await res.json();
            allItems = data.items || [];
        } catch (err) {
            itemsGrid.innerHTML = '<p style="padding:16px;color:#64748b;">Could not load items. Is XAMPP running?</p>';
            return;
        }
        renderItems();
    }

    function renderItems() {
        const query  = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const status = statusFilter ? statusFilter.value : 'all';

        const shown = allItems.filter(it =>
            catKey(it.category) === activeCategory &&
            (it.name.toLowerCase().includes(query) || it.item_code.toLowerCase().includes(query)) &&
            (status === 'all' || it.status === status)
        );

        if (shown.length === 0) {
            itemsGrid.innerHTML = '<p style="padding:16px;color:#64748b;">No items found.</p>';
            return;
        }

        itemsGrid.innerHTML = shown.map(it => {
            const image = it.category === 'Academic'
                ? '<div class="placeholder-graphic"><div class="graphic-block green"></div><div class="graphic-block magenta"></div><div class="graphic-block cyan"></div></div>'
                : '<div style="font-size: 28px;">🎲</div>';
            const badge = it.status === 'available'
                ? '<span class="status-badge available">Available</span>'
                : '<span class="status-badge borrowed">Borrowed</span>';
            return `
                <div class="item-card" data-category="${catKey(it.category)}" data-status="${esc(it.status)}">
                    <div class="item-image-placeholder">${image}</div>
                    <div class="item-card-body">
                        <div class="card-top-info">
                            <span class="item-name">${esc(it.name)}</span>
                            ${badge}
                        </div>
                        <div class="item-code">${esc(it.item_code)}</div>
                        <button type="button" class="btn-primary view-details-trigger" data-id="${esc(it.id)}">View Details</button>
                    </div>
                </div>`;
        }).join('');

        itemsGrid.querySelectorAll('.view-details-trigger').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                showDetails(allItems.find(i => String(i.id) === btn.dataset.id));
            });
        });
    }

    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.dataset.category;
            renderItems();
        });
    });
    if (searchInput) searchInput.addEventListener('input', renderItems);
    if (statusFilter) statusFilter.addEventListener('change', renderItems);

    // --- 6. DETAILS VIEW + BORROW REQUEST ---
    const catalogView = document.getElementById('catalogView');
    const detailsView = document.getElementById('detailsView');
    const backToCatalogLink = document.getElementById('backToCatalogLink');
    const backBtn = document.getElementById('backBtn');

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

    // Expected-return-date picker, added next to the Borrow button
    let returnWrap = null;
    let returnDateInput = null;
    if (detailActionBtn) {
        const actions = detailActionBtn.parentElement;
        returnWrap = document.createElement('div');
        returnWrap.style.margin = '12px 0';
        returnWrap.innerHTML =
            '<label for="returnDate" style="display:block;font-size:13px;margin-bottom:4px;">Expected return date</label>' +
            '<input type="date" id="returnDate" style="padding:8px;border:1px solid #cbd5e1;border-radius:6px;">';
        actions.parentElement.insertBefore(returnWrap, actions);
        returnDateInput = returnWrap.querySelector('#returnDate');

        const t = new Date();
        t.setDate(t.getDate() + 1);
        returnDateInput.min = t.getFullYear() + '-' +
            String(t.getMonth() + 1).padStart(2, '0') + '-' +
            String(t.getDate()).padStart(2, '0');
    }

    function showDetails(item) {
        if (!item) return;
        selectedItem = item;

        detailItemName.textContent = item.name;
        detailItemDesc.textContent = item.description || '';
        detailBreadcrumb.textContent = `Home / Items / ${item.name}`;
        detailCategory.textContent = item.category;
        detailCode.textContent = item.item_code;
        detailCondition.textContent = item.item_condition || 'Good';
        detailWaiver.textContent = yesNo(item.requires_waiver);
        detailIdSurrender.textContent = yesNo(item.requires_id_surrender);
        detailImageBox.innerHTML = item.category === 'Academic'
            ? '<div class="placeholder-graphic"><div class="graphic-block green"></div><div class="graphic-block magenta"></div><div class="graphic-block cyan"></div></div>'
            : '<div style="font-size: 28px;">🎲</div>';

        const available = item.status === 'available';
        detailStatusContainer.innerHTML = available
            ? '<span class="status-badge available">Available</span>'
            : '<span class="status-badge borrowed">Borrowed</span>';
        detailActionBtn.textContent = available ? 'Borrow This Item' : 'Unavailable';
        detailActionBtn.className = available ? 'btn-primary' : 'btn-disabled';
        detailActionBtn.disabled = !available;
        if (returnWrap) returnWrap.style.display = available ? 'block' : 'none';
        if (returnDateInput) returnDateInput.value = '';

        catalogView.style.display = 'none';
        detailsView.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function showCatalog(e) {
        if (e) e.preventDefault();
        detailsView.style.display = 'none';
        catalogView.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (backToCatalogLink) backToCatalogLink.addEventListener('click', showCatalog);
    if (backBtn) backBtn.addEventListener('click', showCatalog);

    if (detailActionBtn) {
        detailActionBtn.addEventListener('click', async () => {
            if (!selectedItem || selectedItem.status !== 'available') return;
            if (!returnDateInput.value) {
                alert('Please choose an expected return date.');
                return;
            }
            detailActionBtn.disabled = true;
            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        item_id: selectedItem.id,
                        expected_return_date: returnDateInput.value
                    })
                });
                const data = await res.json();
                if (res.ok) {
                    alert('Borrow request submitted. A working scholar will review it.');
                    await loadItems();
                    showCatalog();
                } else {
                    alert(data.error || 'Could not submit the request.');
                    detailActionBtn.disabled = false;
                }
            } catch (err) {
                alert('Could not reach the server.');
                detailActionBtn.disabled = false;
            }
        });
    }

    loadItems();
});