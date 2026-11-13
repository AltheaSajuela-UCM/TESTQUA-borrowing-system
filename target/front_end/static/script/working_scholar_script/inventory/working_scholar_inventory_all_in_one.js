// Clean initial state (empty array ready for backend integration)
let inventoryData = [];
let currentCategory = 'Academic';
let activeItemIndex = null;
let notifications = [];

// Toggle Sidebar Navigation Drawer
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('show');
    document.getElementById('sidebar-overlay').classList.toggle('show');
}

// Toggle Profile Dropdown
function toggleProfileDropdown() {
    closeAllDropdowns();
    document.getElementById('profile-dropdown').classList.toggle('show');
}

// Toggle Notification Dropdown
function toggleNotificationDropdown() {
    closeAllDropdowns();
    document.getElementById('notification-dropdown').classList.toggle('show');
    renderNotifications('all');
}

function closeAllDropdowns() {
    document.getElementById('profile-dropdown').classList.remove('show');
    document.getElementById('notification-dropdown').classList.remove('show');
}

function renderNotifications(filter) {
    const container = document.getElementById('notif-list-container');
    container.innerHTML = '';

    let filtered = notifications;
    if (filter === 'unread') filtered = notifications.filter(n => n.type === 'unread');
    else if (filter === 'alerts') filtered = notifications.filter(n => n.isAlert);

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 16px; font-size: 12px;">No notifications</div>`;
        return;
    }

    filtered.forEach(notif => {
        const card = document.createElement('div');
        card.className = `notif-card ${notif.isAlert ? 'alert-card' : ''}`;
        card.innerHTML = `
            <div>${notif.text}</div>
            <button class="mark-read-btn" onclick="markAsRead(${notif.id})">Mark as read</button>
        `;
        container.appendChild(card);
    });
}

function switchNotifTab(tabName) {
    document.querySelectorAll('.notif-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderNotifications(tabName);
}

function markAsRead(id) {
    notifications = notifications.filter(n => n.id !== id);
    if (notifications.length === 0) document.getElementById('notif-dot').style.display = 'none';
    renderNotifications('all');
}

// Switch Category Tab
function switchCategory(category, evt) {
    currentCategory = category;
    document.querySelectorAll('.content-tab-btn').forEach(btn => btn.classList.remove('active'));
    evt.target.classList.add('active');
    renderTable();
}

// Render Table Data (Handles empty state gracefully)
function renderTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    const filtered = inventoryData.filter(item => item.category === currentCategory);

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 32px; font-size: 13px;">No inventory items found</td></tr>`;
        return;
    }

    filtered.forEach((item, index) => {
        const statusLower = (item.status || 'available').toLowerCase();
        let badgeClass = 'available';
        if (statusLower.includes('borrowed')) badgeClass = 'borrowed';
        else if (statusLower.includes('maintenance') || statusLower.includes('damaged') || statusLower.includes('missing')) badgeClass = 'maintenance';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.code || '—'}</td>
            <td><strong>${item.name || '—'}</strong></td>
            <td>${item.category || '—'}</td>
            <td>${item.stock || 0}</td>
            <td>${item.condition || 'Good'}</td>
            <td><span class="badge-status ${badgeClass}">${item.status || 'Available'}</span></td>
            <td style="text-align: right;">
                <button class="btn btn-light" onclick="openStatusModal(${index})">Edit Status</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Modal Controls
function openStatusModal(index) {
    activeItemIndex = index;
    const item = inventoryData[index] || { name: "Scientific Calculator", code: "AC-001", status: "Borrowed" };

    document.getElementById('modal-item-subtitle').innerText = `${item.name} · ${item.code}`;
    document.getElementById('new-status-select').value = item.status || 'Available';

    document.getElementById('modal-overlay').classList.add('show');
    document.getElementById('status-modal').classList.add('show');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('show');
    document.getElementById('status-modal').classList.remove('show');
}

function saveItemStatus() {
    if (activeItemIndex !== null) {
        const newStatus = document.getElementById('new-status-select').value;
        inventoryData[activeItemIndex].status = newStatus;
    }
    closeModal();
    renderTable();
}

// Close dropdowns when clicking outside
window.onclick = function(event) {
    if (!event.target.closest('.dropdown-container')) {
        closeAllDropdowns();
    }
};

// Initialize on page load with clean empty states
window.onload = () => {
    renderTable();
};