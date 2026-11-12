// Clean initial state (empty arrays ready for backend data / user interaction)
let auditData = [];
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
        let roleClass = 'student';
        const roleStr = (row.role || '').toLowerCase();
        if (roleStr === 'ws') roleClass = 'ws';
        else if (roleStr === 'admin') roleClass = 'admin';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.timestamp || '—'}</td>
            <td><strong>${row.user || '—'}</strong></td>
            <td><span class="badge ${roleClass}">${row.role || '—'}</span></td>
            <td>${row.action || '—'}</td>
            <td>${row.entity || '—'}</td>
            <td>${row.id || '—'}</td>
            <td>${row.details || '—'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Filter Functionality
function applyFilters() {
    const searchVal = document.getElementById('search-filter').value.toLowerCase();
    const dateVal = document.getElementById('date-filter').value.trim();
    const actionVal = document.getElementById('action-filter').value;

    let filtered = auditData.filter(row => {
        const matchesAction = (actionVal === 'All Actions' || row.action === actionVal);
        const matchesDate = (dateVal === '' || row.timestamp.includes(dateVal));
        const matchesSearch = (
            (row.user || '').toLowerCase().includes(searchVal) ||
            (row.entity || '').toLowerCase().includes(searchVal) ||
            (row.id || '').toLowerCase().includes(searchVal) ||
            (row.details || '').toLowerCase().includes(searchVal) ||
            (row.timestamp || '').toLowerCase().includes(searchVal)
        );
        return matchesAction && matchesDate && matchesSearch;
    });

    renderTable(filtered);
}

// Export Table to CSV function
function exportTableToCSV() {
    let csv = [];
    let rows = document.querySelectorAll("#audit-table tr");
    
    for (let i = 0; i < rows.length; i++) {
        let row = [], cols = rows[i].querySelectorAll("td, th");
        for (let j = 0; j < cols.length; j++) {
            row.push('"' + cols[j].innerText.replace(/"/g, '""') + '"');
        }
        csv.push(row.join(","));
    }

    let csvFile = new Blob([csv.join("\n")], { type: "text/csv" });
    let downloadLink = document.createElement("a");
    downloadLink.download = "webventory_audit_trail.csv";
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// Initialize on page load with empty state
window.onload = () => {
    renderTable(auditData);
};