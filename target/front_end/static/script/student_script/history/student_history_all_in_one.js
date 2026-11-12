// Clean initial state (empty arrays ready for backend integration)
let borrowingHistoryData = [];
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

// Render Table Data & Handle Empty States
function renderTable(data) {
    const tbody = document.getElementById('table-body');
    const recordCount = document.getElementById('record-count');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 32px; font-size: 13px;">No records found</td></tr>`;
        recordCount.innerText = `Showing 0 of 0 records`;
        return;
    }

    data.forEach(row => {
        let badgeClass = 'returned';
        const statusStr = (row.status || '').toLowerCase();
        if (statusStr === 'completed') badgeClass = 'completed';
        else if (statusStr === 'rejected') badgeClass = 'rejected';
        else if (statusStr === 'cancelled') badgeClass = 'cancelled';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.transactionId || '—'}</td>
            <td><strong>${row.item || '—'}</strong></td>
            <td>${row.category || '—'}</td>
            <td>${row.dateBorrowed || '—'}</td>
            <td>${row.dateReturned || '—'}</td>
            <td><span class="badge ${badgeClass}">${row.status || '—'}</span></td>
        `;
        tbody.appendChild(tr);
    });

    recordCount.innerText = `Showing ${data.length} of ${data.length} records`;
}

// Filter Functionality
function applyFilters() {
    const searchVal = document.getElementById('search-filter').value.toLowerCase();
    const statusVal = document.getElementById('status-filter').value;

    let filtered = borrowingHistoryData.filter(row => {
        const matchesStatus = (statusVal === 'All' || row.status === statusVal);
        const matchesSearch = (
            (row.transactionId || '').toLowerCase().includes(searchVal) ||
            (row.item || '').toLowerCase().includes(searchVal) ||
            (row.category || '').toLowerCase().includes(searchVal) ||
            (row.dateBorrowed || '').toLowerCase().includes(searchVal) ||
            (row.dateReturned || '').toLowerCase().includes(searchVal)
        );
        return matchesStatus && matchesSearch;
    });

    renderTable(filtered);
}

// Export functions placeholders
function exportTableToPDF() {
    alert("Exporting Borrowing History to PDF...");
}

function exportTableToCSV() {
    let csv = [];
    let rows = document.querySelectorAll("#history-table tr");
    
    for (let i = 0; i < rows.length; i++) {
        let row = [], cols = rows[i].querySelectorAll("td, th");
        for (let j = 0; j < cols.length; j++) {
            row.push('"' + cols[j].innerText.replace(/"/g, '""') + '"');
        }
        csv.push(row.join(","));
    }

    let csvFile = new Blob([csv.join("\n")], { type: "text/csv" });
    let downloadLink = document.createElement("a");
    downloadLink.download = "student_borrowing_history.csv";
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// Initialize on page load with empty state
window.onload = () => {
    renderTable(borrowingHistoryData);
};