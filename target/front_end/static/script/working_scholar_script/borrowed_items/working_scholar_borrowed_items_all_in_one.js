// Clean initial state ready for backend PHP API integration
let borrowedItemsData = [];
let currentFilter = 'All';
let notifications = [];

// Layout Toggles
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('show');
    if (overlay) overlay.classList.toggle('show');
}

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

// Notifications
function renderNotifications(filter) {
    const container = document.getElementById('notif-list-container');
    if (!container) return;
    container.innerHTML = '';

    let filtered = notifications;
    if (filter === 'unread') filtered = notifications.filter(n => !n.isRead);
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

function switchNotifTab(tabName, evt) {
    document.querySelectorAll('.notif-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    if (evt && evt.target) evt.target.classList.add('active');
    renderNotifications(tabName);
}

function markAsRead(id) {
    notifications = notifications.filter(n => n.id !== id);
    renderNotifications('all');
}

// Filter Tabs (All, Borrowed, Overdue, Due Soon)
function switchFilter(filterName, evt) {
    currentFilter = filterName;
    document.querySelectorAll('.content-tab-btn').forEach(btn => btn.classList.remove('active'));
    if (evt && evt.target) evt.target.classList.add('active');
    renderTable(borrowedItemsData);
}

// Render Borrowed Items Table (Pure Empty State Ready for Backend)
function renderTable(data) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    let filtered = data;
    if (currentFilter === 'Borrowed') {
        filtered = data.filter(item => (item.status || '').toLowerCase() === 'borrowed');
    } else if (currentFilter === 'Overdue') {
        filtered = data.filter(item => (item.status || '').toLowerCase() === 'overdue');
    } else if (currentFilter === 'Due Soon') {
        filtered = data.filter(item => (item.status || '').toLowerCase() === 'due soon');
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 32px; font-size: 13px;">No borrowed items found</td></tr>`;
        return;
    }

    filtered.forEach((item) => {
        const isOverdue = (item.status || '').toLowerCase() === 'overdue';
        const statusClass = isOverdue ? 'overdue' : ((item.status || '').toLowerCase() === 'due soon' ? 'due-soon' : 'borrowed');
        const txId = item.transactionId || 'TXN-103';

        const tr = document.createElement('tr');
        if (isOverdue) tr.className = 'row-overdue';

        tr.innerHTML = `
            <td><strong>${item.itemName || '—'}</strong></td>
            <td>${item.borrower || '—'}</td>
            <td>${item.dateBorrowed || '—'}</td>
            <td style="${isOverdue ? 'color: #dc2626; font-weight: 600;' : ''}">${item.dueDate || '—'}</td>
            <td><span class="badge-status ${statusClass}">${item.status || 'Borrowed'}</span></td>
            <td style="text-align: right;">
                ${isOverdue 
                    ? `<button class="btn-danger-sm" onclick="alert('Sending overdue reminder for ${item.itemName}')">Send: Return overdue ${item.itemName}</button>` 
                    : `<a href="working_scholar_return_processing.html?tx=${encodeURIComponent(txId)}" class="btn btn-light" style="text-decoration:none; display:inline-block;">Process Return</a>`
                }
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Export CSV
function exportTableToCSV() {
    let csv = [];
    let rows = document.querySelectorAll("#borrowed-table tr");
    
    for (let i = 0; i < rows.length; i++) {
        let row = [], cols = rows[i].querySelectorAll("td, th");
        for (let j = 0; j < cols.length; j++) {
            row.push('"' + cols[j].innerText.replace(/"/g, '""') + '"');
        }
        csv.push(row.join(","));
    }

    let csvFile = new Blob([csv.join("\n")], { type: "text/csv" });
    let downloadLink = document.createElement("a");
    downloadLink.download = "borrowed_items_monitoring.csv";
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

window.onclick = function(event) {
    if (!event.target.closest('.dropdown-container')) {
        closeAllDropdowns();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    renderTable(borrowedItemsData);
});