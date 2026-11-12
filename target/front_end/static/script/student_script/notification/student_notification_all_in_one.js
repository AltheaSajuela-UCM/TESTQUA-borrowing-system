// Clean initial state (empty arrays ready for backend integration)
let notifications = [];
let currentFilter = 'all';

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

// Toggle Notification Dropdown in Header
function toggleNotificationDropdown() {
    closeAllDropdowns();
    document.getElementById('notification-dropdown').classList.toggle('show');
    renderHeaderNotifications('all');
}

// Close All Dropdowns
function closeAllDropdowns() {
    document.getElementById('profile-dropdown').classList.remove('show');
    document.getElementById('notification-dropdown').classList.remove('show');
}

// Render Header Dropdown Notifications
function renderHeaderNotifications(filter) {
    const container = document.getElementById('header-notif-list-container');
    container.innerHTML = '';

    let filtered = notifications;
    if (filter === 'unread') {
        filtered = notifications.filter(n => n.type === 'unread');
    } else if (filter === 'alerts') {
        filtered = notifications.filter(n => n.isAlert);
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 16px; font-size: 12px;">No notifications</div>`;
        return;
    }

    filtered.forEach(notif => {
        const card = document.createElement('div');
        card.className = `notif-card-dropdown ${notif.isAlert ? 'alert-card' : ''}`;
        card.innerHTML = `
            <div>${notif.message}</div>
            <button class="mark-read-btn" onclick="markAsRead(${notif.id})">Mark as read</button>
        `;
        container.appendChild(card);
    });
}

// Switch Header Notification Tab
function switchHeaderNotifTab(tabName) {
    event.target.parentElement.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderHeaderNotifications(tabName);
}

// Switch Page Body Notification Tab
function switchPageTab(tabName, evt) {
    currentFilter = tabName;
    document.querySelectorAll('.content-tab-btn').forEach(btn => btn.classList.remove('active'));
    evt.target.classList.add('active');
    renderPageNotifications();
}

// Render Main Page Notifications Body
function renderPageNotifications() {
    const container = document.getElementById('notifications-container');
    container.innerHTML = '';

    let filtered = notifications;
    if (currentFilter === 'unread') {
        filtered = notifications.filter(n => n.type === 'unread');
    } else if (currentFilter === 'alerts') {
        filtered = notifications.filter(n => n.isAlert);
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 48px; font-size: 13px;">No notifications found</div>`;
        return;
    }

    filtered.forEach(notif => {
        const card = document.createElement('div');
        card.className = `notif-card-body ${notif.isAlert ? 'alert-card' : ''}`;
        card.innerHTML = `
            <div class="notif-content-left">
                <span class="notif-icon">${notif.icon || '🔔'}</span>
                <div class="notif-text-group">
                    <div class="notif-message">${notif.message}</div>
                    <div class="notif-time">${notif.time}</div>
                </div>
            </div>
            <button class="btn-mark-read" onclick="markAsRead(${notif.id})">Mark read</button>
        `;
        container.appendChild(card);
    });
}

// Mark notification as read
function markAsRead(id) {
    notifications = notifications.filter(n => n.id !== id);
    if (notifications.length === 0) {
        document.getElementById('notif-dot').style.display = 'none';
    }
    renderHeaderNotifications('all');
    renderPageNotifications();
}

// Close dropdowns when clicking outside
window.onclick = function(event) {
    if (!event.target.closest('.dropdown-container')) {
        closeAllDropdowns();
    }
};

// Initialize on page load with empty state
window.onload = () => {
    renderPageNotifications();
};