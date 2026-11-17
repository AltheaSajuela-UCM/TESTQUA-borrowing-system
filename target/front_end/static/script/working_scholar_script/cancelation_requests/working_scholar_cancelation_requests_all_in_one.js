// Clean initial state (empty array ready for backend integration)
let cancelationRequestsData = [];
let activeCancelationIndex = null;
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

// Render Table Data (Handles empty state gracefully)
function renderTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 32px; font-size: 13px;">No cancellation requests found</td></tr>`;
        return;
    }

    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.requestId || '—'}</td>
            <td>
                <strong>${row.studentName || '—'}</strong>
                <div style="font-size: 11px; color: #64748b;">${row.studentId || ''}</div>
            </td>
            <td>
                <strong>${row.item || '—'}</strong>
                <div style="font-size: 11px; color: #64748b;">${row.itemCode || ''}</div>
            </td>
            <td>${row.dateRequested || '—'}</td>
            <td>${row.reason || '—'}</td>
            <td style="text-align: right;">
                <button class="btn btn-primary" onclick="openAcceptModal(${index})">Accept Cancellation</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Modal Controls
function openAcceptModal(index) {
    activeCancellationIndex = index;
    const itemData = cancellationRequestsData[index] || {
        studentName: "Pedro Cruz",
        item: "Scrabble"
    };

    document.getElementById('modal-subtitle').innerText = `Confirm that ${itemData.studentName}'s request to cancel borrowing ${itemData.item} will be accepted.`;

    document.getElementById('modal-overlay').classList.add('show');
    document.getElementById('accept-modal').classList.add('show');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('show');
    document.getElementById('accept-modal').classList.remove('show');
}

function confirmAcceptCancellation() {
    if (activeCancellationIndex !== null) {
        cancellationRequestsData.splice(activeCancellationIndex, 1);
    }
    closeModal();
    renderTable(cancellationRequestsData);
}

// Close dropdowns when clicking outside
window.onclick = function(event) {
    if (!event.target.closest('.dropdown-container')) {
        closeAllDropdowns();
    }
};

// Initialize on page load with clean empty states
window.onload = () => {
    renderTable(cancellationRequestsData);
};