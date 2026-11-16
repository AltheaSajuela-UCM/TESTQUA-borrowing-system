// Clean initial state awaiting database binding
let notificationsData = [];
let currentFilter = 'all';

// Layout Toggles
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('show');
    if (overlay) overlay.classList.toggle('show');
}

function toggleProfileDropdown() {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

// Filter Tab Switcher
function switchFilter(filterName, evt) {
    currentFilter = filterName;
    document.querySelectorAll('.content-tab-btn').forEach(btn => btn.classList.remove('active'));
    if (evt && evt.target) evt.target.classList.add('active');
    renderNotifications(notificationsData);
}

// Render Notifications List (Defaults to NONE if array is empty)
function renderNotifications(data) {
    const container = document.getElementById('notifications-list');
    if (!container) return;
    container.innerHTML = '';

    let filtered = data;
    if (currentFilter === 'unread') {
        filtered = data.filter(n => n.isUnread);
    } else if (currentFilter === 'alerts') {
        filtered = data.filter(n => n.isAlert);
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 48px; font-size: 13px;">NONE</div>`;
        return;
    }

    filtered.forEach(notif => {
        const card = document.createElement('div');
        card.className = `notif-item-card ${notif.isAlert ? 'alert-item' : ''}`;
        card.innerHTML = `
            <div class="notif-content">
                <strong>${notif.title || 'Notification'}</strong>
                <span>${notif.text || '—'}</span>
                <span class="notif-timestamp">${notif.timestamp || '—'}</span>
            </div>
            ${notif.isUnread ? `<button class="btn-sm-action" onclick="markAsRead(${notif.id})">Mark as read</button>` : '<span style="font-size:11px; color:#64748b;">Read</span>'}
        `;
        container.appendChild(card);
    });
}

function markAsRead(id) {
    notificationsData = notificationsData.map(n => n.id === id ? { ...n, isUnread: false } : n);
    renderNotifications(notificationsData);
}

function markAllAsRead() {
    notificationsData = notificationsData.map(n => ({ ...n, isUnread: false }));
    renderNotifications(notificationsData);
}

window.onclick = function(event) {
    if (!event.target.closest('.dropdown-container')) {
        const dropdown = document.getElementById('profile-dropdown');
        if (dropdown) dropdown.classList.remove('show');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    renderNotifications(notificationsData);
});

function toggleNotificationDropdown() {
    const dropdown = document.getElementById('notification-dropdown');
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profileDropdown) profileDropdown.classList.remove('show');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}
