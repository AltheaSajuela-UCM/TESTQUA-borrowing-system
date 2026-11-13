// Clean initial state (empty array ready for backend integration)
let borrowedItemsData = [];
let currentFilter = 'All';
let activeItem = null;
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

// Switch View Helper
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

function showListView() {
    switchView('view-borrowed-list');
    renderTable(borrowedItemsData);
}

// Switch Filter Tabs (All, Borrowed, Overdue, Due Soon)
function switchFilter(filterName, evt) {
    currentFilter = filterName;
    document.querySelectorAll('.content-tab-btn').forEach(btn => btn.classList.remove('active'));
    evt.target.classList.add('active');
    renderTable(borrowedItemsData);
}

// Render Borrowed Items Table (Handles empty state gracefully)
function renderTable(data) {
    const tbody = document.getElementById('table-body');
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

    filtered.forEach((item, index) => {
        const isOverdue = (item.status || '').toLowerCase() === 'overdue';
        const statusClass = isOverdue ? 'overdue' : ((item.status || '').toLowerCase() === 'due soon' ? 'due-soon' : 'borrowed');

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
                    : `<button class="btn btn-light" onclick="openReturnProcessing(${index})">Process Return</button>`
                }
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Open Return Processing Workspace
function openReturnProcessing(index) {
    activeItem = borrowedItemsData[index] || {
        itemName: "Basic Calculator",
        itemCode: "AC-002",
        borrower: "Juan Santos Dela Cruz",
        transactionId: "TXN-221690"
    };

    document.getElementById('find-tx-input').value = activeItem.transactionId || "TXN-221690";
    document.getElementById('return-item-name').innerText = activeItem.itemName;
    document.getElementById('return-item-meta').innerText = `${activeItem.itemCode || 'AC-002'} · ${activeItem.borrower} · ${activeItem.transactionId || 'TXN-221690'}`;

    // Set current return timestamp
    const now = new Date();
    document.getElementById('return-time-val').value = now.toLocaleString();
    document.getElementById('late-notes').value = '';
    document.getElementById('return-condition-select').value = 'Good';

    switchView('view-return-processing');
}

// Complete Return Action
function completeReturn() {
    const condition = document.getElementById('return-condition-select').value;
    const timeVal = document.getElementById('return-time-val').value;
    const txId = document.getElementById('find-tx-input').value;

    document.getElementById('success-msg').innerText = `Transaction ${txId} was completed at ${timeVal}. Condition recorded as ${condition}.`;
    
    // Remove from active borrowed items list if present
    if (activeItem) {
        borrowedItemsData = borrowedItemsData.filter(i => i !== activeItem);
    }

    switchView('view-return-success');
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

// Close dropdowns when clicking outside
window.onclick = function(event) {
    if (!event.target.closest('.dropdown-container')) {
        closeAllDropdowns();
    }
};

// Initialize on page load with clean empty states
window.onload = () => {
    renderTable(borrowedItemsData);
};