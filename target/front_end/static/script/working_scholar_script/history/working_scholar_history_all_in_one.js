// Clean initial state (empty array ready for backend integration)
let historyData = [];
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

// Render History Table Data (Handles empty state gracefully)
function renderTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 32px; font-size: 13px;">No history records found</td></tr>`;
        return;
    }

    data.forEach(row => {
        const actionStr = row.action || '';
        const actionClass = actionStr.toLowerCase() === 'rejected' ? 'action-rejected' : '';

                const esc = Webventory.esc;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${esc(row.dateTime || '—')}</td>
            <td><span class="badge-type">${esc(row.type || 'Borrow Request')}</span></td>
            <td><strong>${esc(row.student || '—')}</strong></td>
            <td>${esc(row.item || '—')}</td>
            <td><span class="${actionClass}">${esc(actionStr)}</span></td>
        `;  
        tbody.appendChild(tr);
    });
}

// Filter Functionality
function applyFilters() {
    const typeVal = document.getElementById('type-filter').value;
    const dateVal = document.getElementById('date-filter').value;
    const searchVal = document.getElementById('search-filter').value.toLowerCase();

    let filtered = historyData.filter(row => {
        const matchesType = (typeVal === 'All' || row.type === typeVal);
        const matchesDate = (!dateVal || (row.dateTime || '').includes(dateVal));
        const matchesSearch = (
            (row.dateTime || '').toLowerCase().includes(searchVal) ||
            (row.type || '').toLowerCase().includes(searchVal) ||
            (row.student || '').toLowerCase().includes(searchVal) ||
            (row.item || '').toLowerCase().includes(searchVal) ||
            (row.action || '').toLowerCase().includes(searchVal)
        );
        return matchesType && matchesDate && matchesSearch;
    });

    renderTable(filtered);
}

// Close dropdowns when clicking outside
window.onclick = function(event) {
    if (!event.target.closest('.dropdown-container')) {
        closeAllDropdowns();
    }
};

// Initialize on page load with clean empty states
// Load the activity log from the backend, then render it (filters work on this list)
async function loadHistory() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 32px; font-size: 13px;">Loading history…</td></tr>`;
    try {
        const data = await Webventory.api('2_working_scholar/history.php');
        historyData = (data.history || []).map(r => ({
            dateTime: r.date_time,
            type: r.type,
            student: r.student,
            item: r.item,
            action: r.action
        }));
        applyFilters();
    } catch (err) {
        if (err.message === 'auth') return;
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #dc2626; padding: 32px; font-size: 13px;">Could not load history: ${Webventory.esc(err.message)}</td></tr>`;
    }
}

window.onload = loadHistory;