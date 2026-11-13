// Clean initial state (empty array ready for backend data integration)
let pendingRequestsData = [];
let activeRequestIndex = null;
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

// View Switching Navigation
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

function showListView() {
    switchView('view-requests-list');
    renderPendingTable(pendingRequestsData);
}

// Render Table Data (Handles empty state gracefully)
function renderPendingTable(data) {
    const tbody = document.getElementById('table-body');
    const subtitle = document.getElementById('pending-subtitle');
    tbody.innerHTML = '';

    subtitle.innerText = `${data.length} request${data.length === 1 ? '' : 's'} awaiting processing`;

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 32px; font-size: 13px;">No pending requests found</td></tr>`;
        return;
    }

    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.transactionId || '—'}</td>
            <td>
                <strong>${row.studentName || '—'}</strong>
                <div style="font-size: 11px; color: #64748b;">${row.studentId || ''}</div>
            </td>
            <td><strong>${row.item || '—'}</strong></td>
            <td>${row.category || '—'}</td>
            <td>${row.date || '—'}</td>
            <td><span class="badge-pending">Pending</span></td>
            <td style="text-align: right;">
                <button class="btn btn-primary" onclick="startProcessRequest(${index})">Process</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Filtering Functionality
function applyFilters() {
    const searchVal = document.getElementById('search-filter').value.toLowerCase();
    const categoryVal = document.getElementById('category-filter').value;

    let filtered = pendingRequestsData.filter(row => {
        const matchesCategory = (categoryVal === 'All' || row.category === categoryVal);
        const matchesSearch = (
            (row.transactionId || '').toLowerCase().includes(searchVal) ||
            (row.studentName || '').toLowerCase().includes(searchVal) ||
            (row.studentId || '').toLowerCase().includes(searchVal) ||
            (row.item || '').toLowerCase().includes(searchVal)
        );
        return matchesCategory && matchesSearch;
    });

    renderPendingTable(filtered);
}

// Open Process View for specific record
function startProcessRequest(index) {
    activeRequestIndex = index;
    const itemData = pendingRequestsData[index] || {
        transactionId: "TXN-221690",
        studentName: "Juan Santos Dela Cruz",
        studentId: "20240001",
        studentMeta: "ID: 20240001 · UC-MAIN · College",
        mobile: "Mobile: 09171234567",
        item: "Basic Calculator",
        itemMeta: "AC-002 · Academic",
        submitted: "2026-11-11"
    };

    // Populate Student verification card
    document.getElementById('verify-student-id').value = itemData.studentId;
    document.getElementById('student-name-val').innerText = itemData.studentName;
    document.getElementById('student-id-meta').innerText = itemData.studentMeta;
    document.getElementById('student-mobile-meta').innerText = itemData.mobile;

    // Populate Request details card
    document.getElementById('item-title-val').innerText = itemData.item;
    document.getElementById('item-meta-val').innerText = itemData.itemMeta;
    document.getElementById('tx-id-val').innerText = itemData.transactionId;
    document.getElementById('tx-submitted-val').innerText = itemData.submitted;

    // Set default release timestamp to now
    const now = new Date();
    document.getElementById('release-time-input').value = now.toLocaleString();

    // Reset decision buttons & hidden forms
    resetDecisionUI();

    switchView('view-process-request');
}

// Decision Toggle (Yes/No)
function setDecision(type) {
    const btnYes = document.getElementById('btn-decision-yes');
    const btnNo = document.getElementById('btn-decision-no');
    const formComplete = document.getElementById('form-complete-details');
    const formIncomplete = document.getElementById('form-incomplete-details');

    if (type === 'yes') {
        btnYes.className = 'btn-toggle active-yes';
        btnNo.className = 'btn-toggle';
        formComplete.style.display = 'flex';
        formIncomplete.style.display = 'none';
    } else {
        btnYes.className = 'btn-toggle';
        btnNo.className = 'btn-toggle active-no';
        formComplete.style.display = 'none';
        formIncomplete.style.display = 'flex';
    }
}

function resetDecisionUI() {
    document.getElementById('btn-decision-yes').className = 'btn-toggle';
    document.getElementById('btn-decision-no').className = 'btn-toggle';
    document.getElementById('form-complete-details').style.display = 'none';
    document.getElementById('form-incomplete-details').style.display = 'none';
}

// Modals Control
function openAcceptModal() {
    document.getElementById('modal-accept-student').innerText = document.getElementById('student-name-val').innerText;
    document.getElementById('modal-accept-item').innerText = document.getElementById('item-title-val').innerText;
    document.getElementById('modal-accept-release-time').innerText = document.getElementById('release-time-input').value;

    const returnVal = document.getElementById('expected-return-input').value;
    document.getElementById('modal-accept-expected-return').innerText = returnVal ? new Date(returnVal).toLocaleString() : '13/11/2026 05:00 pm';

    document.getElementById('modal-overlay').classList.add('show');
    document.getElementById('accept-modal').classList.add('show');
}

function openRejectModal() {
    document.getElementById('reject-reason-input').value = '';
    const confirmBtn = document.getElementById('btn-confirm-reject');
    confirmBtn.disabled = true;
    confirmBtn.className = 'btn btn-danger-soft';

    document.getElementById('modal-overlay').classList.add('show');
    document.getElementById('reject-modal').classList.add('show');
}

function closeModals() {
    document.getElementById('modal-overlay').classList.remove('show');
    document.getElementById('accept-modal').classList.remove('show');
    document.getElementById('reject-modal').classList.remove('show');
}

// Enable Reject button when reason is entered
document.getElementById('reject-reason-input').addEventListener('input', function(e) {
    const confirmBtn = document.getElementById('btn-confirm-reject');
    if (e.target.value.trim().length > 0) {
        confirmBtn.disabled = false;
        confirmBtn.className = 'btn btn-danger-soft active';
    } else {
        confirmBtn.disabled = true;
        confirmBtn.className = 'btn btn-danger-soft';
    }
});

// Confirm Modal Actions
function confirmAcceptSubmission() {
    closeModals();
    if (activeRequestIndex !== null) {
        pendingRequestsData.splice(activeRequestIndex, 1);
    }
    switchView('view-accept-success');
}

function confirmRejectSubmission() {
    closeModals();
    if (activeRequestIndex !== null) {
        pendingRequestsData.splice(activeRequestIndex, 1);
    }
    switchView('view-reject-success');
}

// Close dropdowns when clicking outside
window.onclick = function(event) {
    if (!event.target.closest('.dropdown-container')) {
        closeAllDropdowns();
    }
};

// Initialize on page load with clean empty states
window.onload = () => {
    renderPendingTable(pendingRequestsData);
};