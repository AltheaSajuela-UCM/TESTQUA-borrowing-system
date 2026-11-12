// Clean initial state (empty arrays ready for backend data / user interaction)
let accountabilityCases = [];
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

// Close All Dropdowns
function closeAllDropdowns() {
    document.getElementById('profile-dropdown').classList.remove('show');
    document.getElementById('notification-dropdown').classList.remove('show');
}

// Render Notifications based on tab
function renderNotifications(filter) {
    const container = document.getElementById('notif-list-container');
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
        card.className = `notif-card ${notif.isAlert ? 'alert-card' : ''}`;
        card.innerHTML = `
            <div>${notif.text}</div>
            <button class="mark-read-btn" onclick="markAsRead(${notif.id})">Mark as read</button>
        `;
        container.appendChild(card);
    });
}

// Switch Notification Tab
function switchNotifTab(tabName) {
    document.querySelectorAll('.notif-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderNotifications(tabName);
}

// Mark notification as read
function markAsRead(id) {
    notifications = notifications.filter(n => n.id !== id);
    if (notifications.length === 0) {
        document.getElementById('notif-dot').style.display = 'none';
    }
    renderNotifications('all');
}

// Close dropdowns when clicking outside
window.onclick = function(event) {
    if (!event.target.closest('.dropdown-container')) {
        closeAllDropdowns();
    }
};

// Render Table Data (Handles empty state gracefully)
function renderTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 32px; font-size: 13px;">No records found</td></tr>`;
        return;
    }

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.caseId || '—'}</td>
            <td>${row.student || '—'}</td>
            <td>${row.item || '—'}</td>
            <td><span class="badge lost">${row.type || 'Lost'}</span></td>
            <td><span class="badge open">${row.status || 'Open'}</span></td>
            <td>${row.date || '—'}</td>
            <td style="text-align: right; padding-right: 24px;">
                <button class="btn-sm" onclick="openViewModal('${row.caseId}')">View</button>
                <button class="btn-primary-sm" onclick="openResolveModal('${row.caseId}')" style="margin-left: 6px;">Resolve</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Modal Control Functions
function openViewModal(caseId) {
    // Find case data or fallback defaults
    const caseData = accountabilityCases.find(c => c.caseId === caseId) || {
        caseId: caseId,
        student: "Pedro Cruz",
        item: "Uno Cards",
        type: "Lost",
        status: "Open"
    };

    document.getElementById('view-modal-title').innerText = `${caseData.caseId} Details`;
    document.getElementById('view-student').value = caseData.student;
    document.getElementById('view-item').value = caseData.item;
    document.getElementById('view-type').value = caseData.type;
    document.getElementById('view-status').value = caseData.status;

    document.getElementById('modal-overlay').classList.add('show');
    document.getElementById('view-modal').classList.add('show');
}

function openResolveModal(caseId) {
    document.getElementById('resolve-modal-title').innerText = `Resolve Case ${caseId}`;
    document.getElementById('resolve-notes').value = '';
    document.getElementById('check-replacement').checked = false;
    document.getElementById('check-clear-flag').checked = false;

    document.getElementById('modal-overlay').classList.add('show');
    document.getElementById('resolve-modal').classList.add('show');
}

function closeModals() {
    document.getElementById('modal-overlay').classList.remove('show');
    document.getElementById('view-modal').classList.remove('show');
    document.getElementById('resolve-modal').classList.remove('show');
}

function submitResolve() {
    // Add logic here to submit resolution to backend
    alert("Case resolved successfully!");
    closeModals();
}

// Initialize on page load with empty state
window.onload = () => {
    renderTable(accountabilityCases);
};