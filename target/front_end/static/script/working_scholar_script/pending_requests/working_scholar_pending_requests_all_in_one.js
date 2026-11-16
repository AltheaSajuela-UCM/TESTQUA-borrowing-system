// // Working Scholar - Pending Requests (wired to the PHP backend)
// // Needs ../../static/script/api.js loaded BEFORE this file (see the HTML snippet).
// // Backend used:
// //   2_working_scholar/borrowing.php      (list pending, approve, reject)
// //   2_working_scholar/student_lookip.php (student verification + eligibility)
// //   api/notifications.php                (bell dropdown)

// const WS = window.Webventory;
// const esc = WS.esc;

// let pendingRequestsData = [];   // rows currently loaded from the server
// let activeRequest = null;       // row being processed
// let notifications = [];

// // ---------------------------------------------------------------- layout toggles
// function toggleSidebar() {
//     document.getElementById('sidebar').classList.toggle('show');
//     document.getElementById('sidebar-overlay').classList.toggle('show');
// }

// function toggleProfileDropdown() {
//     closeAllDropdowns();
//     document.getElementById('profile-dropdown').classList.toggle('show');
// }

// function toggleNotificationDropdown() {
//     closeAllDropdowns();
//     document.getElementById('notification-dropdown').classList.toggle('show');
//     renderNotifications('all');
// }

// function closeAllDropdowns() {
//     document.getElementById('profile-dropdown').classList.remove('show');
//     document.getElementById('notification-dropdown').classList.remove('show');
// }

// // ---------------------------------------------------------------- notifications
// async function loadNotifications() {
//     try {
//         const d = await WS.api('api/notifications.php?filter=all');
//         notifications = (d.notifications || []).map(n => ({
//             id: n.id, text: n.message, isAlert: n.alert, isRead: n.is_read
//         }));
//         document.getElementById('notif-dot').style.display = d.unread_count > 0 ? 'block' : 'none';
//         if (document.getElementById('notification-dropdown').classList.contains('show')) {
//             renderNotifications(currentNotifTab);
//         }
//     } catch (err) { /* server unreachable or logged out */ }
// }

// let currentNotifTab = 'all';

// function renderNotifications(filter) {
//     currentNotifTab = filter;
//     const container = document.getElementById('notif-list-container');
//     container.innerHTML = '';

//     let filtered = notifications;
//     if (filter === 'unread') filtered = notifications.filter(n => !n.isRead);
//     else if (filter === 'alerts') filtered = notifications.filter(n => n.isAlert);

//     if (filtered.length === 0) {
//         container.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:16px;font-size:12px;">No notifications</div>';
//         return;
//     }

//     filtered.forEach(n => {
//         const card = document.createElement('div');
//         card.className = 'notif-card ' + (n.isAlert ? 'alert-card' : '');
//         card.style.opacity = n.isRead ? '0.6' : '1';
//         card.innerHTML = '<div>' + esc(n.text) + '</div>' +
//             (n.isRead ? '' : '<button class="mark-read-btn" onclick="markAsRead(' + n.id + ')">Mark as read</button>');
//         container.appendChild(card);
//     });
// }

// function switchNotifTab(tabName) {
//     document.querySelectorAll('.notif-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
//     event.target.classList.add('active');
//     renderNotifications(tabName);
// }

// async function markAsRead(id) {
//     try {
//         await WS.api('api/notifications.php', { method: 'POST', body: { action: 'read', id: id } });
//     } catch (err) { /* ignore, the reload below shows the real state */ }
//     await loadNotifications();
//     renderNotifications(currentNotifTab);
// }

// // ---------------------------------------------------------------- view switching
// function switchView(viewId) {
//     document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
//     document.getElementById(viewId).classList.add('active');
// }

// function showListView() {
//     switchView('view-requests-list');
//     loadPending();
// }

// // ---------------------------------------------------------------- pending list
// async function loadPending() {
//     try {
//         const d = await WS.api('2_working_scholar/borrowing.php?status=pending');
//         pendingRequestsData = (d.borrowings || []).map(r => ({
//             id: Number(r.id),
//             transactionId: r.transaction_code,
//             studentName: r.borrower,
//             studentId: r.user_id_number,
//             item: r.item_name,
//             category: r.category,
//             date: String(r.requested_at || '').slice(0, 16).replace('T', ' '),
//             raw: r
//         }));
//         applyFilters();
//     } catch (err) {
//         if (err.message === 'auth') return;
//         document.getElementById('table-body').innerHTML =
//             '<tr><td colspan="7" style="text-align:center;color:#dc2626;padding:32px;font-size:13px;">' +
//             esc(err.message) + '</td></tr>';
//     }
// }

// function renderPendingTable(data) {
//     const tbody = document.getElementById('table-body');
//     const subtitle = document.getElementById('pending-subtitle');
//     tbody.innerHTML = '';

//     subtitle.innerText = data.length + ' request' + (data.length === 1 ? '' : 's') + ' awaiting processing';

//     if (data.length === 0) {
//         tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:32px;font-size:13px;">No pending requests found</td></tr>';
//         return;
//     }

//     data.forEach(row => {
//         const tr = document.createElement('tr');
//         tr.innerHTML =
//             '<td>' + esc(row.transactionId || '-') + '</td>' +
//             '<td><strong>' + esc(row.studentName || '-') + '</strong>' +
//                 '<div style="font-size:11px;color:#64748b;">' + esc(row.studentId || '') + '</div></td>' +
//             '<td><strong>' + esc(row.item || '-') + '</strong></td>' +
//             '<td>' + esc(row.category || '-') + '</td>' +
//             '<td>' + esc(row.date || '-') + '</td>' +
//             '<td><span class="badge-pending">Pending</span></td>' +
//             '<td style="text-align:right;"><button class="btn btn-primary" onclick="startProcessRequest(' + row.id + ')">Process</button></td>';
//         tbody.appendChild(tr);
//     });
// }

// function applyFilters() {
//     const searchVal = document.getElementById('search-filter').value.toLowerCase();
//     const categoryVal = document.getElementById('category-filter').value;

//     const filtered = pendingRequestsData.filter(row => {
//         const matchesCategory = (categoryVal === 'All' || row.category === categoryVal);
//         const matchesSearch =
//             (row.transactionId || '').toLowerCase().includes(searchVal) ||
//             (row.studentName || '').toLowerCase().includes(searchVal) ||
//             (row.studentId || '').toLowerCase().includes(searchVal) ||
//             (row.item || '').toLowerCase().includes(searchVal);
//         return matchesCategory && matchesSearch;
//     });

//     renderPendingTable(filtered);
// }

// // ---------------------------------------------------------------- process view
// function startProcessRequest(id) {
//     const row = pendingRequestsData.find(r => r.id === id);
//     if (!row) return;
//     activeRequest = row;
//     const r = row.raw;

//     // Student card (filled from the request, then confirmed by verifyStudent)
//     document.getElementById('verify-student-id').value = row.studentId || '';
//     document.getElementById('student-name-val').innerText = row.studentName || '-';
//     document.getElementById('student-id-meta').innerText = 'ID: ' + (r.user_id_number || '-') + (r.campus ? ' · ' + r.campus : '');
//     document.getElementById('student-mobile-meta').innerText = 'Mobile: ' + (r.mobile_number || '-');

//     // Request card
//     document.getElementById('item-title-val').innerText = r.item_name || '-';
//     document.getElementById('item-meta-val').innerText = (r.item_code || '') + ' · ' + (r.category || '');
//     document.getElementById('tx-id-val').innerText = r.transaction_code;
//     document.getElementById('tx-submitted-val').innerText = row.date || '-';

//     document.getElementById('release-time-input').value = new Date().toLocaleString();
//     document.getElementById('expected-return-input').value =
//         r.expected_return_date ? String(r.expected_return_date).replace(' ', 'T').slice(0, 16) : '';

//     // Only items that need a surrendered ID get the checkbox
//     const old = document.getElementById('id-surrender-wrap');
//     if (old) old.remove();
//     if (Number(r.requires_id_surrender) === 1) {
//         const wrap = document.createElement('div');
//         wrap.id = 'id-surrender-wrap';
//         wrap.className = 'form-group';
//         wrap.innerHTML = '<label style="display:flex;gap:8px;align-items:center;">' +
//             '<input type="checkbox" id="id-surrendered-check"> Student ID collected (required for this item)</label>';
//         const form = document.getElementById('form-complete-details');
//         form.insertBefore(wrap, form.querySelector('button.btn-block'));
//     }

//     resetDecisionUI();
//     switchView('view-process-request');
//     verifyStudent();
// }

// async function verifyStudent() {
//     const sid = document.getElementById('verify-student-id').value.trim();
//     if (!sid) return;
//     const badge = document.querySelector('#verified-student-info .badge-allowed');
//     let reasonEl = document.getElementById('eligibility-reason');
//     if (!reasonEl) {
//         reasonEl = document.createElement('p');
//         reasonEl.id = 'eligibility-reason';
//         reasonEl.style.cssText = 'font-size:12px;color:#dc2626;margin-top:8px;';
//         document.getElementById('verified-student-info').appendChild(reasonEl);
//     }
//     const setBadge = ok => {
//         badge.style.background = ok ? '' : '#fee2e2';
//         badge.style.color = ok ? '' : '#b91c1c';
//     };

//     try {
//         const q = '?student_id=' + encodeURIComponent(sid) +
//                   (activeRequest ? '&category=' + encodeURIComponent(activeRequest.category) : '');
//         const d = await WS.api('2_working_scholar/student_lookip.php' + q);
//         const s = d.student, e = d.eligibility || {};
//         document.getElementById('student-name-val').innerText = s.full_name;
//         document.getElementById('student-id-meta').innerText =
//             'ID: ' + s.id_number + (s.campus ? ' · ' + s.campus : '') + (s.academic_level ? ' · ' + s.academic_level : '');
//         document.getElementById('student-mobile-meta').innerText = 'Mobile: ' + (s.mobile_number || '-');
//         badge.innerText = e.allowed ? 'Allowed' : 'Not allowed';
//         setBadge(!!e.allowed);
//         reasonEl.innerText = e.allowed ? '' : (e.reason || '');
//     } catch (err) {
//         if (err.message === 'auth') return;
//         badge.innerText = 'Not found';
//         setBadge(false);
//         reasonEl.innerText = err.message;
//     }
// }

// // Wire the existing Search button (it used to just alert)
// document.querySelector('#verify-student-id').closest('.input-btn-group')
//     .querySelector('button').onclick = verifyStudent;

// // ---------------------------------------------------------------- decision UI
// function setDecision(type) {
//     const btnYes = document.getElementById('btn-decision-yes');
//     const btnNo = document.getElementById('btn-decision-no');
//     const formComplete = document.getElementById('form-complete-details');
//     const formIncomplete = document.getElementById('form-incomplete-details');

//     if (type === 'yes') {
//         btnYes.className = 'btn-toggle active-yes';
//         btnNo.className = 'btn-toggle';
//         formComplete.style.display = 'flex';
//         formIncomplete.style.display = 'none';
//     } else {
//         btnYes.className = 'btn-toggle';
//         btnNo.className = 'btn-toggle active-no';
//         formComplete.style.display = 'none';
//         formIncomplete.style.display = 'flex';
//     }
// }

// function resetDecisionUI() {
//     document.getElementById('btn-decision-yes').className = 'btn-toggle';
//     document.getElementById('btn-decision-no').className = 'btn-toggle';
//     document.getElementById('form-complete-details').style.display = 'none';
//     document.getElementById('form-incomplete-details').style.display = 'none';
// }

// // ---------------------------------------------------------------- modals
// function openAcceptModal() {
//     const returnVal = document.getElementById('expected-return-input').value;
//     if (!returnVal) {
//         alert('Set the expected return date and time first.');
//         return;
//     }
//     document.getElementById('modal-accept-student').innerText = document.getElementById('student-name-val').innerText;
//     document.getElementById('modal-accept-item').innerText = document.getElementById('item-title-val').innerText;
//     document.getElementById('modal-accept-release-time').innerText = document.getElementById('release-time-input').value;
//     document.getElementById('modal-accept-expected-return').innerText = new Date(returnVal).toLocaleString();

//     document.getElementById('modal-overlay').classList.add('show');
//     document.getElementById('accept-modal').classList.add('show');
// }

// function openRejectModal() {
//     document.getElementById('reject-reason-input').value = '';
//     const confirmBtn = document.getElementById('btn-confirm-reject');
//     confirmBtn.disabled = true;
//     confirmBtn.className = 'btn btn-danger-soft';

//     document.getElementById('modal-overlay').classList.add('show');
//     document.getElementById('reject-modal').classList.add('show');
// }

// function closeModals() {
//     document.getElementById('modal-overlay').classList.remove('show');
//     document.getElementById('accept-modal').classList.remove('show');
//     document.getElementById('reject-modal').classList.remove('show');
// }

// document.getElementById('reject-reason-input').addEventListener('input', function (e) {
//     const confirmBtn = document.getElementById('btn-confirm-reject');
//     const hasText = e.target.value.trim().length > 0;
//     confirmBtn.disabled = !hasText;
//     confirmBtn.className = 'btn btn-danger-soft' + (hasText ? ' active' : '');
// });

// // ---------------------------------------------------------------- confirm actions
// async function confirmAcceptSubmission() {
//     if (!activeRequest) return;
//     const btn = document.querySelector('#accept-modal .btn-primary');
//     const idBox = document.getElementById('id-surrendered-check');
//     btn.disabled = true;
//     try {
//         await WS.api('2_working_scholar/borrowing.php', {
//             method: 'POST',
//             body: {
//                 action: 'approve',
//                 transaction_id: activeRequest.id,
//                 student_id: document.getElementById('verify-student-id').value.trim(),
//                 details_complete: true,
//                 expected_return_date: document.getElementById('expected-return-input').value,
//                 item_condition: document.getElementById('item-condition').value,
//                 id_surrendered: idBox ? idBox.checked : false
//             }
//         });
//         closeModals();
//         switchView('view-accept-success');
//         loadNotifications();
//     } catch (err) {
//         if (err.message !== 'auth') alert(err.message);   // e.g. outside office hours, not allowed, out of stock
//     } finally {
//         btn.disabled = false;
//     }
// }

// async function confirmRejectSubmission() {
//     if (!activeRequest) return;
//     const btn = document.getElementById('btn-confirm-reject');
//     btn.disabled = true;
//     try {
//         await WS.api('2_working_scholar/borrowing.php', {
//             method: 'POST',
//             body: {
//                 action: 'reject',
//                 transaction_id: activeRequest.id,
//                 reject_reason: document.getElementById('reject-reason-input').value.trim()
//             }
//         });
//         closeModals();
//         switchView('view-reject-success');
//         loadNotifications();
//     } catch (err) {
//         if (err.message !== 'auth') alert(err.message);
//         btn.disabled = false;
//     }
// }

// // ---------------------------------------------------------------- init
// window.onclick = function (event) {
//     if (!event.target.closest('.dropdown-container')) closeAllDropdowns();
// };

// loadPending();
// loadNotifications();
// setInterval(() => {   // near real-time without refresh, only while the list is on screen
//     if (document.getElementById('view-requests-list').classList.contains('active')) loadPending();
//     loadNotifications();
// }, 15000);

// Working Scholar - Pending Requests (wired to the PHP backend)
// Needs ../../static/script/api.js loaded BEFORE this file (see the HTML snippet).

const WS = window.Webventory || {
    esc: str => (str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])),
    api: async (url, opts) => { console.warn('API mock context', url, opts); return {}; }
};
const esc = WS.esc;

let pendingRequestsData = [];   // rows currently loaded from the server
let activeRequest = null;       // row being processed
let notifications = [];
let currentNotifTab = 'all';

// ---------------------------------------------------------------- layout toggles
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
        renderNotifications(currentNotifTab);
    }
}

function closeAllDropdowns() {
    const p = document.getElementById('profile-dropdown');
    const n = document.getElementById('notification-dropdown');
    if (p) p.classList.remove('show');
    if (n) n.classList.remove('show');
}

// ---------------------------------------------------------------- notifications
async function loadNotifications() {
    try {
        const d = await WS.api('api/notifications.php?filter=all');
        notifications = (d.notifications || []).map(n => ({
            id: n.id, text: n.message, isAlert: n.alert, isRead: n.is_read
        }));
        const dot = document.getElementById('notif-dot');
        if (dot) dot.style.display = d.unread_count > 0 ? 'block' : 'none';
        const notifMenu = document.getElementById('notification-dropdown');
        if (notifMenu && notifMenu.classList.contains('show')) {
            renderNotifications(currentNotifTab);
        }
    } catch (err) { /* server unreachable or logged out */ }
}

function renderNotifications(filter) {
    currentNotifTab = filter;
    const container = document.getElementById('notif-list-container');
    if (!container) return;
    container.innerHTML = '';

    let filtered = notifications;
    if (filter === 'unread') filtered = notifications.filter(n => !n.isRead);
    else if (filter === 'alerts') filtered = notifications.filter(n => n.isAlert);

    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:16px;font-size:12px;">No notifications</div>';
        return;
    }

    filtered.forEach(n => {
        const card = document.createElement('div');
        card.className = 'notif-card ' + (n.isAlert ? 'alert-card' : '');
        card.style.opacity = n.isRead ? '0.6' : '1';
        card.innerHTML = '<div>' + esc(n.text) + '</div>' +
            (n.isRead ? '' : '<button class="mark-read-btn" onclick="markAsRead(' + n.id + ')">Mark as read</button>');
        container.appendChild(card);
    });
}

function switchNotifTab(tabName, evt) {
    document.querySelectorAll('.notif-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    if (evt && evt.target) {
        evt.target.classList.add('active');
    }
    renderNotifications(tabName);
}

async function markAsRead(id) {
    try {
        await WS.api('api/notifications.php', { method: 'POST', body: { action: 'read', id: id } });
    } catch (err) { /* ignore, the reload below shows the real state */ }
    await loadNotifications();
    renderNotifications(currentNotifTab);
}

// ---------------------------------------------------------------- view switching
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');
}

function showListView() {
    switchView('view-requests-list');
    loadPending();
}

// ---------------------------------------------------------------- pending list
async function loadPending() {
    try {
        const d = await WS.api('2_working_scholar/borrowing.php?status=pending');
        pendingRequestsData = (d.borrowings || []).map(r => ({
            id: Number(r.id),
            transactionId: r.transaction_code,
            studentName: r.borrower,
            studentId: r.user_id_number,
            item: r.item_name,
            category: r.category,
            date: String(r.requested_at || '').slice(0, 16).replace('T', ' '),
            raw: r
        }));
        applyFilters();
    } catch (err) {
        if (err.message === 'auth') return;
        const tbody = document.getElementById('table-body');
        if (tbody) {
            tbody.innerHTML =
                '<tr><td colspan="7" style="text-align:center;color:#dc2626;padding:32px;font-size:13px;">' +
                esc(err.message) + '</td></tr>';
        }
    }
}

function renderPendingTable(data) {
    const tbody = document.getElementById('table-body');
    const subtitle = document.getElementById('pending-subtitle');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (subtitle) {
        subtitle.innerText = data.length + ' request' + (data.length === 1 ? '' : 's') + ' awaiting processing';
    }

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:32px;font-size:13px;">No pending requests found</td></tr>';
        return;
    }

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML =
            '<td>' + esc(row.transactionId || '-') + '</td>' +
            '<td><strong>' + esc(row.studentName || '-') + '</strong>' +
                '<div style="font-size:11px;color:#64748b;">' + esc(row.studentId || '') + '</div></td>' +
            '<td><strong>' + esc(row.item || '-') + '</strong></td>' +
            '<td>' + esc(row.category || '-') + '</td>' +
            '<td>' + esc(row.date || '-') + '</td>' +
            '<td><span class="badge-pending">Pending</span></td>' +
            '<td style="text-align:right;"><button class="btn btn-primary" onclick="startProcessRequest(' + row.id + ')">Process</button></td>';
        tbody.appendChild(tr);
    });
}

function applyFilters() {
    const searchEl = document.getElementById('search-filter');
    const catEl = document.getElementById('category-filter');
    const searchVal = searchEl ? searchEl.value.toLowerCase() : '';
    const categoryVal = catEl ? catEl.value : 'All';

    const filtered = pendingRequestsData.filter(row => {
        const matchesCategory = (categoryVal === 'All' || row.category === categoryVal);
        const matchesSearch =
            (row.transactionId || '').toLowerCase().includes(searchVal) ||
            (row.studentName || '').toLowerCase().includes(searchVal) ||
            (row.studentId || '').toLowerCase().includes(searchVal) ||
            (row.item || '').toLowerCase().includes(searchVal);
        return matchesCategory && matchesSearch;
    });

    renderPendingTable(filtered);
}

// ---------------------------------------------------------------- process view
function startProcessRequest(id) {
    const row = pendingRequestsData.find(r => r.id === id);
    if (!row) return;
    activeRequest = row;
    const r = row.raw;

    // Student card
    document.getElementById('verify-student-id').value = row.studentId || '';
    document.getElementById('student-name-val').innerText = row.studentName || '-';
    document.getElementById('student-id-meta').innerText = 'ID: ' + (r.user_id_number || '-') + (r.campus ? ' · ' + r.campus : '');
    document.getElementById('student-mobile-meta').innerText = 'Mobile: ' + (r.mobile_number || '-');

    // Request card
    document.getElementById('item-title-val').innerText = r.item_name || '-';
    document.getElementById('item-meta-val').innerText = (r.item_code || '') + ' · ' + (r.category || '');
    document.getElementById('tx-id-val').innerText = r.transaction_code;
    document.getElementById('tx-submitted-val').innerText = row.date || '-';

    document.getElementById('release-time-input').value = new Date().toLocaleString();
    document.getElementById('expected-return-input').value =
        r.expected_return_date ? String(r.expected_return_date).replace(' ', 'T').slice(0, 16) : '';

    // ID surrender checkbox if applicable
    const old = document.getElementById('id-surrender-wrap');
    if (old) old.remove();
    if (Number(r.requires_id_surrender) === 1) {
        const wrap = document.createElement('div');
        wrap.id = 'id-surrender-wrap';
        wrap.className = 'form-group';
        wrap.innerHTML = '<label style="display:flex;gap:8px;align-items:center;">' +
            '<input type="checkbox" id="id-surrendered-check"> Student ID collected (required for this item)</label>';
        const form = document.getElementById('form-complete-details');
        if (form) form.insertBefore(wrap, form.querySelector('button.btn-block'));
    }

    resetDecisionUI();
    switchView('view-process-request');
    verifyStudent();
}

async function verifyStudent() {
    const sidEl = document.getElementById('verify-student-id');
    if (!sidEl) return;
    const sid = sidEl.value.trim();
    if (!sid) return;

    const badge = document.querySelector('#verified-student-info .badge-allowed');
    let reasonEl = document.getElementById('eligibility-reason');
    if (!reasonEl) {
        reasonEl = document.createElement('p');
        reasonEl.id = 'eligibility-reason';
        reasonEl.style.cssText = 'font-size:12px;color:#dc2626;margin-top:8px;';
        const box = document.getElementById('verified-student-info');
        if (box) box.appendChild(reasonEl);
    }

    const setBadge = (ok, text) => {
        if (!badge) return;
        badge.innerText = text;
        badge.style.background = ok ? '#d1fae5' : '#fee2e2';
        badge.style.color = ok ? '#065f46' : '#b91c1c';
    };

    try {
        const q = '?student_id=' + encodeURIComponent(sid) +
                  (activeRequest ? '&category=' + encodeURIComponent(activeRequest.category) : '');
        const d = await WS.api('2_working_scholar/student_lookip.php' + q);
        const s = d.student || {};
        const e = d.eligibility || {};

        document.getElementById('student-name-val').innerText = s.full_name || '-';
        document.getElementById('student-id-meta').innerText =
            'ID: ' + (s.id_number || '-') + (s.campus ? ' · ' + s.campus : '') + (s.academic_level ? ' · ' + s.academic_level : '');
        document.getElementById('student-mobile-meta').innerText = 'Mobile: ' + (s.mobile_number || '-');

        setBadge(!!e.allowed, e.allowed ? 'Allowed' : 'Not allowed');
        reasonEl.innerText = e.allowed ? '' : (e.reason || '');
    } catch (err) {
        if (err.message === 'auth') return;
        setBadge(false, 'Not found');
        reasonEl.innerText = err.message || 'Error looking up student ID';
    }
}

// ---------------------------------------------------------------- decision UI
function setDecision(type) {
    const btnYes = document.getElementById('btn-decision-yes');
    const btnNo = document.getElementById('btn-decision-no');
    const formComplete = document.getElementById('form-complete-details');
    const formIncomplete = document.getElementById('form-incomplete-details');

    if (type === 'yes') {
        if (btnYes) btnYes.className = 'btn-toggle active-yes';
        if (btnNo) btnNo.className = 'btn-toggle';
        if (formComplete) formComplete.style.display = 'flex';
        if (formIncomplete) formIncomplete.style.display = 'none';
    } else {
        if (btnYes) btnYes.className = 'btn-toggle';
        if (btnNo) btnNo.className = 'btn-toggle active-no';
        if (formComplete) formComplete.style.display = 'none';
        if (formIncomplete) formIncomplete.style.display = 'flex';
    }
}

function resetDecisionUI() {
    const btnYes = document.getElementById('btn-decision-yes');
    const btnNo = document.getElementById('btn-decision-no');
    const formComplete = document.getElementById('form-complete-details');
    const formIncomplete = document.getElementById('form-incomplete-details');
    if (btnYes) btnYes.className = 'btn-toggle';
    if (btnNo) btnNo.className = 'btn-toggle';
    if (formComplete) formComplete.style.display = 'none';
    if (formIncomplete) formIncomplete.style.display = 'none';
}

// ---------------------------------------------------------------- modals
function openAcceptModal() {
    const returnVal = document.getElementById('expected-return-input').value;
    if (!returnVal) {
        alert('Set the expected return date and time first.');
        return;
    }
    document.getElementById('modal-accept-student').innerText = document.getElementById('student-name-val').innerText;
    document.getElementById('modal-accept-item').innerText = document.getElementById('item-title-val').innerText;
    document.getElementById('modal-accept-release-time').innerText = document.getElementById('release-time-input').value;
    document.getElementById('modal-accept-expected-return').innerText = new Date(returnVal).toLocaleString();

    document.getElementById('modal-overlay').classList.add('show');
    document.getElementById('accept-modal').classList.add('show');
}

function openRejectModal() {
    document.getElementById('reject-reason-input').value = '';
    const confirmBtn = document.getElementById('btn-confirm-reject');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.className = 'btn btn-danger-soft';
    }

    document.getElementById('modal-overlay').classList.add('show');
    document.getElementById('reject-modal').classList.add('show');
}

function closeModals() {
    const overlay = document.getElementById('modal-overlay');
    const acceptM = document.getElementById('accept-modal');
    const rejectM = document.getElementById('reject-modal');
    if (overlay) overlay.classList.remove('show');
    if (acceptM) acceptM.classList.remove('show');
    if (rejectM) rejectM.classList.remove('show');
}

// ---------------------------------------------------------------- confirm actions
async function confirmAcceptSubmission() {
    if (!activeRequest) return;
    const btn = document.querySelector('#accept-modal .btn-primary');
    const idBox = document.getElementById('id-surrendered-check');
    if (btn) btn.disabled = true;

    try {
        await WS.api('2_working_scholar/borrowing.php', {
            method: 'POST',
            body: {
                action: 'approve',
                transaction_id: activeRequest.id,
                student_id: document.getElementById('verify-student-id').value.trim(),
                details_complete: true,
                expected_return_date: document.getElementById('expected-return-input').value,
                item_condition: document.getElementById('item-condition').value,
                id_surrendered: idBox ? idBox.checked : false
            }
        });
        closeModals();
        switchView('view-accept-success');
        loadNotifications();
    } catch (err) {
        if (err.message !== 'auth') alert(err.message);
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function confirmRejectSubmission() {
    if (!activeRequest) return;
    const btn = document.getElementById('btn-confirm-reject');
    if (btn) btn.disabled = true;

    try {
        await WS.api('2_working_scholar/borrowing.php', {
            method: 'POST',
            body: {
                action: 'reject',
                transaction_id: activeRequest.id,
                reject_reason: document.getElementById('reject-reason-input').value.trim()
            }
        });
        closeModals();
        switchView('view-reject-success');
        loadNotifications();
    } catch (err) {
        if (err.message !== 'auth') alert(err.message);
        if (btn) btn.disabled = false;
    }
}

// ---------------------------------------------------------------- init & listeners
document.addEventListener('DOMContentLoaded', () => {
    // Safely attach reject reason listener
    const rejectReasonInput = document.getElementById('reject-reason-input');
    if (rejectReasonInput) {
        rejectReasonInput.addEventListener('input', function (e) {
            const confirmBtn = document.getElementById('btn-confirm-reject');
            const hasText = e.target.value.trim().length > 0;
            if (confirmBtn) {
                confirmBtn.disabled = !hasText;
                confirmBtn.className = 'btn btn-danger-soft' + (hasText ? ' active' : '');
            }
        });
    }

    // Safely attach student search button listener
    const searchBtn = document.querySelector('#verify-student-id')?.closest('.input-btn-group')?.querySelector('button');
    if (searchBtn) {
        searchBtn.onclick = verifyStudent;
    }

    loadPending();
    loadNotifications();
});

window.onclick = function (event) {
    if (!event.target.closest('.dropdown-container')) closeAllDropdowns();
};

setInterval(() => {
    const listSec = document.getElementById('view-requests-list');
    if (listSec && listSec.classList.contains('active')) loadPending();
    loadNotifications();
}, 15000);