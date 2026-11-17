// Working Scholar Inventory: live data from backend/2_working_scholar/catalog.php
// and the header notification bell from backend/api/notifications.php.
// Requires ../../api.js (Webventory.api / Webventory.esc) to be loaded first.
let inventoryData = [];
let currentCategory = 'Academic';
let activeItemId = null;
let notifications = [];
let notifFilter = 'all';

const esc = (v) => Webventory.esc(v);

// ------------------------------------------------------------ layout toggles
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('show');
    document.getElementById('sidebar-overlay').classList.toggle('show');
}

function toggleProfileDropdown() {
    closeAllDropdowns();
    document.getElementById('profile-dropdown').classList.toggle('show');
}

function toggleNotificationDropdown() {
    const menu = document.getElementById('notification-dropdown');
    const wasOpen = menu.classList.contains('show');
    closeAllDropdowns();
    if (!wasOpen) {
        menu.classList.add('show');
        loadNotifications();
    }
}

function closeAllDropdowns() {
    document.getElementById('profile-dropdown').classList.remove('show');
    document.getElementById('notification-dropdown').classList.remove('show');
}

// ------------------------------------------------------------ notifications
async function loadNotifications() {
    try {
        const data = await Webventory.api('api/notifications.php?filter=' + encodeURIComponent(notifFilter) + '&limit=20');
        notifications = data.notifications || [];
        updateBell(data.unread_count || 0);
    } catch (err) {
        if (err.message !== 'auth') notifications = [];
    }
    renderNotifications();
}

function updateBell(unread) {
    const dot = document.getElementById('notif-dot');
    if (dot) dot.style.display = unread > 0 ? 'block' : 'none';
}

function renderNotifications() {
    const container = document.getElementById('notif-list-container');
    if (!container) return;

    if (notifications.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 16px; font-size: 12px;">No notifications</div>';
        return;
    }

    container.innerHTML = notifications.map(n => `
        <div class="notif-card ${n.alert ? 'alert-card' : ''}" style="${n.is_read ? 'opacity:.6;' : ''}">
            <div>${esc(n.message)}</div>
            ${n.is_read ? '' : `<button class="mark-read-btn" onclick="markAsRead(${n.id})">Mark as read</button>`}
        </div>`).join('');
}

function switchNotifTab(tabName, evt) {
    notifFilter = tabName;
    document.querySelectorAll('.notif-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    if (evt && evt.target) evt.target.classList.add('active');
    loadNotifications();
}

async function markAsRead(id) {
    try {
        await Webventory.api('api/notifications.php', { method: 'POST', body: { action: 'read', id: id } });
    } catch (err) { /* keep the list as is */ }
    loadNotifications();
}

// ------------------------------------------------------------ profile badge
async function loadProfile() {
    try {
        const me = await Webventory.api('api/profile.php');
        const avatar = document.querySelector('.profile-section .avatar');
        if (avatar && me.full_name) {
            avatar.textContent = me.full_name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
        }
    } catch (err) { /* cosmetic only */ }
}

// ------------------------------------------------------------ inventory
async function loadInventory() {
    try {
        const data = await Webventory.api('2_working_scholar/catalog.php');
        inventoryData = data.items || [];
    } catch (err) {
        inventoryData = [];
        if (err.message !== 'auth') showTableMessage('Could not load inventory: ' + err.message);
        return;
    }
    renderTable();
}

function showTableMessage(msg) {
    document.getElementById('table-body').innerHTML =
        `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 32px; font-size: 13px;">${esc(msg)}</td></tr>`;
}

function switchCategory(category, evt) {
    currentCategory = category;
    document.querySelectorAll('.content-tab-btn').forEach(btn => btn.classList.remove('active'));
    evt.target.classList.add('active');
    renderTable();
}

// What the badge shows: the manual availability status wins; otherwise "Borrowed" when no stock is left.
function statusLabel(item) {
    if (item.availability_status && item.availability_status !== 'Available') return item.availability_status;
    return item.can_borrow ? 'Available' : 'Borrowed';
}

function renderTable() {
    const tbody = document.getElementById('table-body');
    const rows = inventoryData.filter(item => item.category === currentCategory);

    if (rows.length === 0) {
        showTableMessage('No inventory items found');
        return;
    }

    tbody.innerHTML = rows.map(item => {
        const label = statusLabel(item);
        const low = label.toLowerCase();
        let badgeClass = 'available';
        if (low === 'borrowed') badgeClass = 'borrowed';
        else if (low !== 'available') badgeClass = 'maintenance';

        return `<tr>
            <td>${esc(item.item_code || '—')}</td>
            <td><strong>${esc(item.name || '—')}</strong></td>
            <td>${esc(item.category || '—')}</td>
            <td>${esc(item.stock != null ? item.stock : 0)}</td>
            <td>${esc(item.item_condition || 'Good')}</td>
            <td><span class="badge-status ${badgeClass}">${esc(label)}</span></td>
            <td style="text-align: right;">
                <button class="btn btn-light" onclick="openStatusModal(${Number(item.id)})">Edit Status</button>
            </td>
        </tr>`;
    }).join('');
}

// ------------------------------------------------------------ status modal
function openStatusModal(id) {
    const item = inventoryData.find(i => Number(i.id) === id);
    if (!item) return;
    activeItemId = id;

    document.getElementById('modal-item-subtitle').innerText = `${item.name} · ${item.item_code}`;
    document.getElementById('new-status-select').value = item.availability_status || 'Available';

    document.getElementById('modal-overlay').classList.add('show');
    document.getElementById('status-modal').classList.add('show');
}

function closeModal() {
    activeItemId = null;
    document.getElementById('modal-overlay').classList.remove('show');
    document.getElementById('status-modal').classList.remove('show');
}

async function saveItemStatus() {
    if (activeItemId === null) return closeModal();
    const status = document.getElementById('new-status-select').value;
    try {
        await Webventory.api('2_working_scholar/catalog.php', {
            method: 'POST',
            body: { id: activeItemId, availability_status: status }
        });
        closeModal();
        await loadInventory();
    } catch (err) {
        if (err.message !== 'auth') alert('Could not update status: ' + err.message);
    }
}

// Close dropdowns when clicking outside
window.onclick = function (event) {
    if (!event.target.closest('.dropdown-container')) closeAllDropdowns();
};

window.onload = () => {
    loadInventory();
    loadProfile();
    loadNotifications();
    setInterval(loadInventory, 30000);
    setInterval(loadNotifications, 30000);
};