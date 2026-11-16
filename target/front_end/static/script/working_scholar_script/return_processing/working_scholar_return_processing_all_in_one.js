// Standalone Return Processing JavaScript logic
let notifications = [];

// Sidebar Navigation
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('show');
    if (overlay) overlay.classList.toggle('show');
}

// Dropdowns
function toggleProfileDropdown() {
    closeAllDropdowns();
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

function toggleNotificationDropdown() {
    closeAllDropdowns();
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
        renderNotifications('all');
    }
}

function closeAllDropdowns() {
    const p = document.getElementById('profile-dropdown');
    const n = document.getElementById('notification-dropdown');
    if (p) p.classList.remove('show');
    if (n) n.classList.remove('show');
}

// Notifications handling
function renderNotifications(filter) {
    const container = document.getElementById('notif-list-container');
    if (!container) return;
    container.innerHTML = '';

    let filtered = notifications;
    if (filter === 'unread') filtered = notifications.filter(n => !n.isRead);
    else if (filter === 'alerts') filtered = notifications.filter(n => n.isAlert);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="notif-card">
                <div>A new borrowing request is waiting for review.</div>
                <button class="mark-read-btn" onclick="markAsRead(1)">Mark as read</button>
            </div>
            <div class="notif-card alert-card">
                <div>An overdue reminder needs to be sent.</div>
                <button class="mark-read-btn" onclick="markAsRead(2)">Mark as read</button>
            </div>
        `;
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

function switchNotifTab(tabName, evt) {
    document.querySelectorAll('.notif-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    if (evt && evt.target) evt.target.classList.add('active');
    renderNotifications(tabName);
}

function markAsRead(id) {
    notifications = notifications.filter(n => n.id !== id);
    renderNotifications('all');
}

// View switching
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');
}

// Read URL parameters on page load
function initReturnPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const tx = urlParams.get('tx') || 'TXN-103';

    const txInput = document.getElementById('find-tx-input');
    if (txInput) txInput.value = tx;

    if (tx === 'TXN-103') {
        document.getElementById('return-item-name').innerText = 'Chess';
        document.getElementById('return-item-meta').innerText = 'NA-003 · Pedro Cruz · TXN-103';
        const badge = document.getElementById('return-status-badge');
        if (badge) {
            badge.innerText = 'Overdue';
            badge.className = 'badge-status overdue';
        }
    } else {
        document.getElementById('return-item-name').innerText = 'Basic Calculator';
        document.getElementById('return-item-meta').innerText = `AC-002 · Student · ${tx}`;
        const badge = document.getElementById('return-status-badge');
        if (badge) {
            badge.innerText = 'Borrowed';
            badge.className = 'badge-status borrowed';
        }
    }

    // Dynamic return timestamp
    const now = new Date();
    const timeEl = document.getElementById('return-time-val');
    if (timeEl) timeEl.value = now.toLocaleString();
}

function searchTransaction() {
    const tx = document.getElementById('find-tx-input').value.trim();
    if (!tx) {
        alert('Please enter a transaction ID.');
        return;
    }
    document.getElementById('return-item-meta').innerText = `AC-002 · Student · ${tx}`;
    alert(`Searching transaction details for ${tx}...`);
}

function completeReturn() {
    const condition = document.getElementById('return-condition-select').value;
    const timeVal = document.getElementById('return-time-val').value;
    const txId = document.getElementById('find-tx-input').value;

    const msg = document.getElementById('success-msg');
    if (msg) {
        msg.innerText = `Transaction ${txId} was completed at ${timeVal}. Condition recorded as ${condition}.`;
    }

    switchView('view-return-success');
}

window.onclick = function(event) {
    if (!event.target.closest('.dropdown-container')) {
        closeAllDropdowns();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initReturnPage();
});