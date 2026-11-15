// ==========================================
// Backend helpers (student portal)
// ==========================================
const STUDENT_API = '../../../../backend/3_student/';
const LOGIN_PAGE = '../../login_page/index.html';

function esc(v) {
    return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}
function txCode(id) { return 'TXN-' + String(id).padStart(5, '0'); }
function dateOnly(s) { return s ? String(s).slice(0, 10) : ''; }
function prettyTime(s) {
    if (!s) return '';
    const d = new Date(String(s).replace(' ', 'T'));
    return isNaN(d) ? String(s) : d.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
    });
}

// Calls a backend/3_student endpoint. Sends the user to login if the session is gone.
async function studentApi(file, options) {
    const res = await fetch(STUDENT_API + file, Object.assign({ credentials: 'same-origin' }, options || {}));
    if (res.status === 401 || res.status === 403) {
        window.location.replace(LOGIN_PAGE);
        throw new Error('auth');
    }
    let data = {};
    try { data = await res.json(); } catch (e) { /* non-JSON response */ }
    if (!res.ok) throw new Error(data.error || ('Request failed (' + res.status + ')'));
    return data;
}

// Notifications are built from transactions, so "read" is remembered in this browser.
function loadReadIds(owner) {
    try { return JSON.parse(localStorage.getItem('webventory_read_notifs_' + owner) || '[]'); }
    catch (e) { return []; }
}
function saveReadId(owner, id) {
    try {
        const ids = loadReadIds(owner);
        if (!ids.includes(id)) { ids.push(id); localStorage.setItem('webventory_read_notifs_' + owner, JSON.stringify(ids)); }
    } catch (e) { /* storage unavailable */ }
}

let borrowingHistoryData = [];
let notifications = [];
let notifOwner = '';

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
    saveReadId(notifOwner, id);
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

// Export (real PDF / CSV from the backend; respects the status filter and search box)
async function exportHistory(format) {
    const params = new URLSearchParams({ format: format });
    const status = document.getElementById('status-filter').value;
    const q = document.getElementById('search-filter').value.trim();
    if (status && status !== 'All') params.set('status', status);
    if (q) params.set('q', q);

    try {
        const res = await fetch(STUDENT_API + 'export.php?' + params.toString(), { credentials: 'same-origin' });
        if (!res.ok) {
            let msg = 'Export failed (' + res.status + ')';
            try { msg = (await res.json()).error || msg; } catch (e) { /* not JSON */ }
            alert(msg);
            return;
        }
        const blob = await res.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'my_borrowing_history.' + format;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch (err) {
        alert('Could not reach the server.');
    }
}

function exportTableToPDF() { exportHistory('pdf'); }
function exportTableToCSV() { exportHistory('csv'); }

// ==========================================
// Load real data
// ==========================================
function historyLabel(b) {
    if (b.status === 'returned') return (b.return_condition || 'Good') === 'Good' ? 'Completed' : 'Returned';
    return b.status.charAt(0).toUpperCase() + b.status.slice(1);
}

async function loadHistory() {
    const tbody = document.getElementById('table-body');
    try {
        const data = await studentApi('my_borrowings.php');
        // History = transactions that are finished: returned, rejected or cancelled.
        const past = (data.borrowings || []).filter(b => ['returned', 'rejected', 'cancelled'].includes(b.status));
        borrowingHistoryData = past.map(b => ({
            transactionId: txCode(b.id),
            item: esc(b.item_name),
            category: esc(b.category),
            dateBorrowed: dateOnly(b.status === 'returned' ? (b.processed_at || b.requested_at) : b.requested_at),
            dateReturned: dateOnly(b.returned_at),
            status: historyLabel(b)
        }));
        applyFilters();
    } catch (err) {
        if (err.message !== 'auth') {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #b91c1c; padding: 32px; font-size: 13px;">Could not load history: ${esc(err.message)}</td></tr>`;
        }
    }
}

async function loadNotifs() {
    try {
        const data = await studentApi('notifications.php');
        notifOwner = data.owner;
        const read = loadReadIds(notifOwner);
        notifications = (data.notifications || [])
            .filter(n => !read.includes(n.id))
            .map(n => ({ id: n.id, text: esc(n.message), type: 'unread', isAlert: !!n.alert }));
        document.getElementById('notif-dot').style.display = notifications.length ? '' : 'none';
    } catch (err) { /* keep the empty list */ }
}

loadHistory();
loadNotifs();

// "Open Notifications Page" in the bell dropdown
const openNotifBtn = document.querySelector('.btn-open-notif');
if (openNotifBtn) openNotifBtn.onclick = () => { window.location.href = 'student_notification.html'; };
