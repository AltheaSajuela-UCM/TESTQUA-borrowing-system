// Admin > Manage Inventory: wired to backend/1_admin/inventory.php (list, add item, borrowing rules,
// availability + stock), backend/1_admin/categories.php (category dropdown) and
// backend/api/notifications.php (bell). Page markup is unchanged.
// Put this file at: target/front_end/static/script/admin_script/inventory/admin_all_in_one.js
const BASE = '../../../../backend/';
const SIDEBAR_STORAGE_KEY = 'webventory_sidebar_open';

async function api(path, opts) {
    opts = opts || {};
    const init = { method: opts.method || 'GET', credentials: 'same-origin', headers: {} };
    if (opts.body !== undefined) {
        init.headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(opts.body);
    }
    const res = await fetch(BASE + path, init);
    let data = {};
    try { data = await res.json(); } catch (e) { /* non-JSON */ }
    if (!res.ok) throw new Error(data.error || ('Request failed (' + res.status + ')'));
    return data;
}

function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const STATUSES = ['Available', 'Borrowed', 'Under Maintenance', 'Damaged', 'Missing', 'Unavailable'];

let allItems = [];
let currentCategory = 'academic';
let currentRuleCategory = 'academic';
let currentAvailCategory = 'academic';
let selectedRuleItem = null;
let selectedAvailItem = null;
let sideMenuCloseTimer = null;

let notificationsData = [];
let currentNotifTab = 'all';

// tab key ('academic' / 'non-academic') -> category name stored in the database
function catName(key) { return key === 'academic' ? 'Academic' : 'Non-Academic'; }
function itemsFor(key) { return allItems.filter(i => i.category === catName(key)); }

// What the badge says. An "Available" item with no stock left reads as Borrowed.
function statusLabel(item) {
    if (item.availability_status === 'Available' && Number(item.stock) <= 0) return 'Borrowed';
    return item.availability_status;
}

function statusBadge(item) {
    const label = statusLabel(item);
    if (label === 'Available') return `<span class="status-badge status-available">${esc(label)}</span>`;
    if (label === 'Borrowed') return `<span class="status-badge status-borrowed">${esc(label)}</span>`;
    return `<span class="status-badge" style="background:#fef3c7;color:#92400e;">${esc(label)}</span>`;
}

// ---------------------------------------------------------------- load
async function loadItems() {
    try {
        const data = await api('1_admin/inventory.php');
        allItems = data.items || [];
    } catch (err) {
        allItems = [];
        document.getElementById('inventoryTableBody').innerHTML =
            `<tr><td colspan="6" class="empty-state">${esc(err.message)}</td></tr>`;
        return;
    }
    renderInventoryTable();
}

async function loadCategoryOptions() {
    const select = document.querySelector('#addItemModal select');   // first select = Category
    try {
        const data = await api('1_admin/categories.php');
        const names = (data.categories || []).map(c => c.name);
        if (names.length) {
            select.innerHTML = names.map(n => `<option>${esc(n)}</option>`).join('');
            const wanted = catName(currentCategory);
            if (names.includes(wanted)) select.value = wanted;
        }
    } catch (err) { /* keep the two default options */ }
}

// ---------------------------------------------------------------- inventory table
function renderInventoryTable() {
    const tableBody = document.getElementById('inventoryTableBody');
    const items = itemsFor(currentCategory);

    if (items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">No items found in this category.</td></tr>`;
        return;
    }

    tableBody.innerHTML = items.map(item => `
        <tr>
            <td style="font-weight: 500;">${esc(item.item_code)}</td>
            <td>${esc(item.name)}</td>
            <td>${esc(item.category)}</td>
            <td>${esc(item.stock)}</td>
            <td>${esc(item.item_condition)}</td>
            <td>${statusBadge(item)}</td>
        </tr>`).join('');
}

// ---------------------------------------------------------------- borrowing rules modal
function renderRulesList() {
    const rulesListContainer = document.getElementById('rulesListContainer');
    rulesListContainer.innerHTML = '';

    const items = itemsFor(currentRuleCategory);
    if (items.length === 0) {
        rulesListContainer.innerHTML = `<div class="empty-state">No items found in this category.</div>`;
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'rule-item-card';
        card.innerHTML = `
            <div class="rule-item-info">
                <div class="rule-item-icon">
                    <i class="fa-solid fa-box-archive" style="color: #2563eb; font-size: 12px;"></i>
                </div>
                <div class="rule-item-details">
                    <h4>${esc(item.name)}</h4>
                    <span>${esc(item.item_code)}</span>
                </div>
            </div>
            <i class="fa-solid fa-chevron-right rule-chevron"></i>
        `;
        card.addEventListener('click', () => openRuleEditView(item));
        rulesListContainer.appendChild(card);
    });
}

function openRuleEditView(item) {
    selectedRuleItem = item;
    document.getElementById('rulesModalMainTitle').textContent = "Update Borrowing Rules";
    document.getElementById('editItemName').textContent = item.name;
    document.getElementById('editItemCode').textContent = item.item_code;
    document.getElementById('checkWaiver').checked = Number(item.requires_waiver) === 1;
    document.getElementById('checkIdSurrender').checked = Number(item.requires_id_surrender) === 1;

    document.getElementById('rulesListView').classList.add('hidden');
    document.getElementById('ruleEditView').classList.remove('hidden');
}

function backToRulesList() {
    document.getElementById('rulesModalMainTitle').textContent = "Update Borrowing Rules";
    document.getElementById('ruleEditView').classList.add('hidden');
    document.getElementById('rulesListView').classList.remove('hidden');
}

async function saveRuleChanges() {
    if (!selectedRuleItem) { backToRulesList(); return; }
    try {
        await api('1_admin/inventory.php', {
            method: 'PUT',
            body: {
                id: selectedRuleItem.id,
                requires_waiver: document.getElementById('checkWaiver').checked ? 1 : 0,
                requires_id_surrender: document.getElementById('checkIdSurrender').checked ? 1 : 0
            }
        });
        alert(`Borrowing rules updated successfully for ${selectedRuleItem.name}!`);
        await loadItems();
        renderRulesList();
        backToRulesList();
    } catch (err) {
        alert(err.message);
    }
}

// ---------------------------------------------------------------- availability modal
function badgeClassFor(label) {
    return label === 'Available' ? 'status-available' : 'status-borrowed';
}

function renderAvailList() {
    const availListContainer = document.getElementById('availListContainer');
    availListContainer.innerHTML = '';

    const items = itemsFor(currentAvailCategory);
    if (items.length === 0) {
        availListContainer.innerHTML = `<div class="empty-state">No items found in this category.</div>`;
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'rule-item-card';
        card.innerHTML = `
            <div class="rule-item-info">
                <div class="rule-item-icon">
                    <i class="fa-solid fa-dice" style="color: #2563eb; font-size: 12px;"></i>
                </div>
                <div class="rule-item-details">
                    <h4>${esc(item.name)}</h4>
                    <span>${esc(item.item_code)}</span>
                </div>
            </div>
            ${statusBadge(item)}
        `;
        card.addEventListener('click', () => openAvailEditView(item));
        availListContainer.appendChild(card);
    });
}

function updateAvailPreview(label) {
    const badgePreview = document.getElementById('availEditBadgePreview');
    badgePreview.textContent = label;
    badgePreview.className = `status-badge ${badgeClassFor(label)}`;
}

function openAvailEditView(item) {
    selectedAvailItem = item;
    document.getElementById('availabilityModalTitle').textContent = "Update Availability";
    document.getElementById('availEditName').textContent = item.name;
    document.getElementById('availEditCode').textContent = item.item_code;

    const select = document.getElementById('availStatusSelect');
    select.innerHTML = STATUSES.map(s => `<option value="${s}">${s}</option>`).join('');
    select.value = item.availability_status;
    document.getElementById('availStockInput').value = item.stock;
    updateAvailPreview(statusLabel(item));

    document.getElementById('availListView').classList.add('hidden');
    document.getElementById('availEditView').classList.remove('hidden');
}

function backToAvailList() {
    document.getElementById('availabilityModalTitle').textContent = "Update Availability";
    document.getElementById('availEditView').classList.add('hidden');
    document.getElementById('availListView').classList.remove('hidden');
    renderAvailList();
}

async function saveAvailabilityChanges() {
    if (!selectedAvailItem) { backToAvailList(); return; }
    const stock = parseInt(document.getElementById('availStockInput').value, 10);
    if (isNaN(stock) || stock < 0) { alert('Stock must be 0 or more.'); return; }
    try {
        await api('1_admin/inventory.php', {
            method: 'PUT',
            body: {
                id: selectedAvailItem.id,
                availability_status: document.getElementById('availStatusSelect').value,
                stock: stock
            }
        });
        alert(`Availability updated successfully for ${selectedAvailItem.name}!`);
        await loadItems();
        backToAvailList();
    } catch (err) {
        alert(err.message);
    }
}

document.getElementById('availStatusSelect').addEventListener('change', (e) => {
    updateAvailPreview(e.target.value);
});

// ---------------------------------------------------------------- add item modal
// The modal's inputs have no ids, so they are found by position; a Stock field is added because
// the backend needs it (without stock a new item would start at 0 and show as unavailable).
const addItemBtn = document.getElementById('addItemBtn');
const addItemModal = document.getElementById('addItemModal');
const addNameInput = addItemModal.querySelectorAll('input')[0];
const addCategorySelect = addItemModal.querySelectorAll('select')[0];
const addCodeInput = addItemModal.querySelectorAll('input')[1];
const addConditionSelect = addItemModal.querySelectorAll('select')[1];

const stockGroup = document.createElement('div');
stockGroup.className = 'form-group';
stockGroup.innerHTML = '<label>Stock</label><input type="number" min="0" value="1" id="addStockInput">';
addItemModal.querySelector('.modal-form-actions').before(stockGroup);
const addStockInput = document.getElementById('addStockInput');

const addSubmitBtn = addItemModal.querySelector('.btn-primary');
addSubmitBtn.removeAttribute('onclick');          // it used to just close the modal
addSubmitBtn.addEventListener('click', submitAddItem);

async function submitAddItem() {
    const name = addNameInput.value.trim();
    const code = addCodeInput.value.trim();
    const stock = parseInt(addStockInput.value, 10);
    if (!name || !code) { alert('Item name and inventory code are required.'); return; }
    if (isNaN(stock) || stock < 0) { alert('Stock must be 0 or more.'); return; }

    try {
        await api('1_admin/inventory.php', {
            method: 'POST',
            body: {
                item_code: code,
                name: name,
                category: addCategorySelect.value,
                item_condition: addConditionSelect.value,
                stock: stock
            }
        });
        addNameInput.value = '';
        addCodeInput.value = '';
        addStockInput.value = '1';
        closeModal('addItemModal');
        await loadItems();
    } catch (err) {
        alert(err.message);
    }
}

// ---------------------------------------------------------------- tabs
const categoryTabBtns = document.querySelectorAll('.dashboard-body > .role-tabs .role-tab-btn');
categoryTabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        categoryTabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.getAttribute('data-category');
        renderInventoryTable();
    });
});

const rulesTabBtns = document.querySelectorAll('.rules-role-btn');
rulesTabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        rulesTabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentRuleCategory = e.target.getAttribute('data-rulecat');
        renderRulesList();
    });
});

const availTabBtns = document.querySelectorAll('.avail-role-btn');
availTabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        availTabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentAvailCategory = e.target.getAttribute('data-availcat');
        renderAvailList();
    });
});

// ---------------------------------------------------------------- notifications
async function loadNotifications() {
    try {
        const data = await api('api/notifications.php?filter=' + currentNotifTab);
        notificationsData = data.notifications || [];
        renderNotifications(data.unread_count);
    } catch (err) {
        notificationsData = [];
        renderNotifications(0);
    }
}

function renderNotifications(unreadCount) {
    const notifListContainer = document.getElementById('notifListContainer');
    const notifBadge = document.getElementById('notifBadge');
    notifListContainer.innerHTML = '';

    if (notificationsData.length === 0) {
        notifListContainer.innerHTML = `<div class="empty-notif">No notifications found.</div>`;
    } else {
        notificationsData.forEach(n => {
            const card = document.createElement('div');
            card.className = `notif-card ${n.alert ? 'is-alert' : ''}`;
            card.innerHTML = `
                <p>${esc(n.message)}</p>
                ${!n.is_read ? `<button class="mark-read-btn" onclick="markAsRead(${Number(n.id)})">Mark as read</button>` : '<span style="font-size: 10px; color: #94a3b8;">Read</span>'}
            `;
            notifListContainer.appendChild(card);
        });
    }

    if (unreadCount > 0) {
        notifBadge.textContent = unreadCount;
        notifBadge.style.display = 'flex';
    } else {
        notifBadge.style.display = 'none';
    }
}

async function markAsRead(id) {
    try {
        await api('api/notifications.php', { method: 'POST', body: { action: 'read', id: id } });
    } catch (err) { /* ignore */ }
    loadNotifications();
}

const notifTabBtns = document.querySelectorAll('.notif-popup .tab-btn');
notifTabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifTabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentNotifTab = e.target.getAttribute('data-tab');
        loadNotifications();
    });
});

// ---------------------------------------------------------------- menu, dropdowns, modals
const menuBtn = document.getElementById('menuBtn');
const leftEdgeHover = document.getElementById('leftEdgeHover');
const sideMenu = document.getElementById('sideMenu');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const menuOverlay = document.getElementById('menuOverlay');

function setSideMenuOpen(isOpen, persist = true) {
    clearTimeout(sideMenuCloseTimer);
    if (sideMenu) sideMenu.classList.toggle('active', isOpen);
    if (menuOverlay) menuOverlay.classList.toggle('active', isOpen);
    if (persist) {
        try {
            localStorage.setItem(SIDEBAR_STORAGE_KEY, isOpen ? 'true' : 'false');
        } catch (err) { /* storage unavailable */ }
    }
}

function openSideMenu() {
    setSideMenuOpen(true, true);
}

function closeSideMenu() {
    setSideMenuOpen(false, true);
}

function scheduleSideMenuClose() {
    clearTimeout(sideMenuCloseTimer);
    sideMenuCloseTimer = setTimeout(() => {
        const hoveringMenu = menuBtn && menuBtn.matches(':hover');
        const hoveringEdge = leftEdgeHover && leftEdgeHover.matches(':hover');
        const hoveringDrawer = sideMenu && sideMenu.matches(':hover');
        if (!hoveringMenu && !hoveringEdge && !hoveringDrawer) {
            setSideMenuOpen(false, false);
        }
    }, 150);
}

if (menuBtn) {
    menuBtn.addEventListener('mouseenter', () => setSideMenuOpen(true, false));
    menuBtn.addEventListener('mouseleave', scheduleSideMenuClose);
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSideMenu();
    });
}
if (leftEdgeHover) {
    leftEdgeHover.addEventListener('mouseenter', () => setSideMenuOpen(true, false));
    leftEdgeHover.addEventListener('mouseleave', scheduleSideMenuClose);
}
if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeSideMenu);
if (menuOverlay) menuOverlay.addEventListener('click', closeSideMenu);

if (sideMenu) {
    sideMenu.addEventListener('mouseenter', () => clearTimeout(sideMenuCloseTimer));
    sideMenu.addEventListener('mouseleave', scheduleSideMenuClose);

    sideMenu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.stopPropagation();
            try {
                localStorage.setItem(SIDEBAR_STORAGE_KEY, 'true');
            } catch (err) { /* storage unavailable */ }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        if (localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true') {
            setSideMenuOpen(true, true);
        }
    } catch (err) { /* storage unavailable */ }
});

const notifWrapper = document.getElementById('notifDropdownWrapper');
const notifBtn = document.getElementById('notifBtn');
const profileWrapper = document.getElementById('profileDropdownWrapper');
const profileBtn = document.getElementById('profileBtn');

notifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    profileWrapper.classList.remove('active');
    notifWrapper.classList.toggle('active');
    loadNotifications();
});

profileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notifWrapper.classList.remove('active');
    profileWrapper.classList.toggle('active');
});

document.addEventListener('click', () => {
    notifWrapper.classList.remove('active');
    profileWrapper.classList.remove('active');
});

const openRulesModal = document.getElementById('openRulesModal');
const rulesModal = document.getElementById('rulesModal');
const openAvailabilityModal = document.getElementById('openAvailabilityModal');
const availabilityModal = document.getElementById('availabilityModal');

addItemBtn.addEventListener('click', () => {
    addCategorySelect.value = catName(currentCategory);
    addItemModal.classList.remove('hidden');
});
openRulesModal.addEventListener('click', () => {
    backToRulesList();
    renderRulesList();
    rulesModal.classList.remove('hidden');
});
openAvailabilityModal.addEventListener('click', () => {
    backToAvailList();
    renderAvailList();
    availabilityModal.classList.remove('hidden');
});

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// ---------------------------------------------------------------- initial load
loadItems();
loadCategoryOptions();
loadNotifications();