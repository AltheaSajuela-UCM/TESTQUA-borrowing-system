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

// Overdue badge style (the page CSS only has pending / borrowed)
(function () {
  const st = document.createElement('style');
  st.textContent = '.status-overdue{background-color:#fee2e2;color:#b91c1c}';
  document.head.appendChild(st);
})();

// ---------- Notifications (real data) ----------
let notifications = [];
let notifOwner = '';
let currentTab = 'all';

function renderNotifications() {
  const listContainer = document.getElementById('notif-list');
  listContainer.innerHTML = '';

  let filtered = notifications;
  if (currentTab === 'unread') {
    filtered = notifications.filter(n => n.unread);
  } else if (currentTab === 'alerts') {
    filtered = notifications.filter(n => n.type === 'alert');
  }

  if (filtered.length === 0) {
    listContainer.innerHTML = '<div style="text-align: center; color: #9ca3af; padding: 16px; font-size: 12px;">No notifications found</div>';
  }

  filtered.forEach(n => {
    const item = document.createElement('div');
    item.className = `notif-item ${n.type === 'alert' ? 'alert' : ''}`;
    item.innerHTML = `
      <p>${esc(n.text)}</p>
      ${n.unread ? `<button onclick="markAsRead(${n.id})" class="mark-read-btn">Mark as read</button>` : '<span style="font-size: 10px; color: #9ca3af;">Read</span>'}
    `;
    listContainer.appendChild(item);
  });

  const unreadCount = notifications.filter(n => n.unread).length;
  const badge = document.getElementById('notif-badge');
  badge.innerText = unreadCount;
  badge.style.display = unreadCount > 0 ? 'flex' : 'none';
}

function markAsRead(id) {
  const notif = notifications.find(n => n.id === id);
  if (notif) { notif.unread = false; saveReadId(notifOwner, id); }
  renderNotifications();
}

async function loadNotifications() {
  try {
    const data = await studentApi('notifications.php');
    notifOwner = data.owner;
    const read = loadReadIds(notifOwner);
    notifications = (data.notifications || []).map(n => ({
      id: n.id, text: n.message, type: n.alert ? 'alert' : 'general', unread: !read.includes(n.id)
    }));
  } catch (err) { /* keep the empty list */ }
  renderNotifications();
}

// Toggle Notification Popover
const notifBtn = document.getElementById('notif-btn');
const notifPopover = document.getElementById('notif-popover');
notifBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  notifPopover.classList.toggle('hidden');
  document.getElementById('profile-menu').classList.add('hidden');
  renderNotifications();
});

// Keep clicks inside the popover from closing it (mark-as-read re-renders the list)
notifPopover.addEventListener('click', (e) => e.stopPropagation());

const openNotifPageBtn = notifPopover.querySelector('.footer-btn');
if (openNotifPageBtn) openNotifPageBtn.addEventListener('click', () => { window.location.href = 'student_notification.html'; });

// Tab Switching
document.querySelectorAll('.notif-tab').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.notif-tab').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentTab = e.target.getAttribute('data-tab');
    renderNotifications();
  });
});

// Toggle Profile Dropdown
const profileBtn = document.getElementById('profile-btn');
const profileMenu = document.getElementById('profile-menu');
profileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  profileMenu.classList.toggle('hidden');
  notifPopover.classList.add('hidden');
});

// Slide-out Drawer Navigation
const openMenuBtn = document.getElementById('open-menu-btn');
const closeDrawerBtn = document.getElementById('close-drawer-btn');
const drawerBackdrop = document.getElementById('drawer-backdrop');
const drawerContent = document.getElementById('drawer-content');

function openDrawer() {
  drawerBackdrop.classList.remove('hidden');
  drawerContent.classList.remove('drawer-closed');
}

function closeDrawer() {
  drawerBackdrop.classList.add('hidden');
  drawerContent.classList.add('drawer-closed');
}

openMenuBtn.addEventListener('click', openDrawer);
closeDrawerBtn.addEventListener('click', closeDrawer);
drawerBackdrop.addEventListener('click', closeDrawer);

// Close dropdowns on outside click
window.addEventListener('click', () => {
  notifPopover.classList.add('hidden');
  profileMenu.classList.add('hidden');
});

// ---------- My Borrowings table (real data) ----------
let borrowings = [];
const tbody = document.getElementById('borrowings-body');

function statusInfo(b) {
  if (b.status === 'pending') return { label: 'Pending', cls: 'status-pending' };
  if (Number(b.is_overdue) === 1) return { label: 'Overdue', cls: 'status-overdue' };
  return { label: 'Borrowed', cls: 'status-borrowed' };
}

function borrowedOn(b) { return dateOnly(b.processed_at || b.requested_at) || '—'; }
function dueOn(b) { return dateOnly(b.expected_return_date) || 'Set by WS'; }

function renderBorrowings() {
  // This page shows what is still open: pending requests and items currently out.
  const open = borrowings.filter(b => b.status === 'pending' || b.status === 'active');

  if (open.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:24px;font-size:13px;">No active borrowings or pending requests.</td></tr>';
    return;
  }

  tbody.innerHTML = open.map(b => {
    const s = statusInfo(b);
    return `
      <tr>
        <td class="font-medium">${esc(b.item_name)}</td>
        <td class="text-muted">${esc(b.item_code)}</td>
        <td>${esc(borrowedOn(b))}</td>
        <td class="font-medium">${esc(dueOn(b))}</td>
        <td><span class="status-badge ${s.cls}">${s.label}</span></td>
        <td class="text-right actions-cell">
          <button class="action-btn" data-action="view" data-id="${b.id}">View</button>
          <button class="action-btn" data-action="receipt" data-id="${b.id}">Receipt</button>
          ${b.status === 'pending' ? `<button class="action-btn cancel-btn" data-action="cancel" data-id="${b.id}">Cancel Request</button>` : ''}
        </td>
      </tr>`;
  }).join('');
}

async function loadBorrowings() {
  try {
    const data = await studentApi('my_borrowings.php');
    borrowings = data.borrowings || [];
    renderBorrowings();
  } catch (err) {
    if (err.message !== 'auth') {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#b91c1c;padding:24px;font-size:13px;">Could not load your borrowings: ${esc(err.message)}</td></tr>`;
    }
  }
}

tbody.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const b = borrowings.find(x => x.id === Number(btn.dataset.id));
  if (!b) return;
  if (btn.dataset.action === 'view') {
    openModal(b.item_name, b.item_code, borrowedOn(b), dueOn(b), statusInfo(b).label);
  } else if (btn.dataset.action === 'receipt') {
    openReceipt(b);
  } else if (btn.dataset.action === 'cancel') {
    cancelRequest(b);
  }
});

// Details modal (the markup is in the page; closeModal() is called from its Close button)
function openModal(item, code, borrowed, due, status) {
  document.getElementById('modal-item').innerText = item;
  document.getElementById('modal-code').innerText = code;
  document.getElementById('modal-borrowed').innerText = borrowed;
  document.getElementById('modal-due').innerText = due;
  document.getElementById('modal-status').innerText = status;
  document.getElementById('detail-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('detail-modal').classList.add('hidden');
}

// Printable receipt with the transaction number the student shows at the SAO Office
function openReceipt(b) {
  const w = window.open('', '_blank', 'width=480,height=640');
  if (!w) { alert('Please allow pop-ups to view the receipt.'); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${esc(txCode(b.id))}</title></head>
    <body style="font-family:Arial,sans-serif;padding:24px;color:#111827">
      <h2 style="margin:0 0 4px">Webventory Borrow Receipt</h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:13px">Present this to the Working Scholar at the SAO Office.</p>
      <p><strong>Transaction No.:</strong> ${esc(txCode(b.id))}</p>
      <p><strong>Item:</strong> ${esc(b.item_name)} (${esc(b.item_code)})</p>
      <p><strong>Category:</strong> ${esc(b.category)}</p>
      <p><strong>Requested:</strong> ${esc(dateOnly(b.requested_at))}</p>
      <p><strong>Due date:</strong> ${esc(dueOn(b))}</p>
      <p><strong>Status:</strong> ${esc(statusInfo(b).label)}</p>
      <button onclick="window.print()" style="margin-top:16px;padding:8px 16px">Print</button>
    </body></html>`);
  w.document.close();
}

async function cancelRequest(b) {
  if (!confirm('Are you sure you want to cancel this borrow request?')) return;
  try {
    await studentApi('my_borrowings.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction_id: b.id, action: 'cancel' })
    });
    await Promise.all([loadBorrowings(), loadNotifications()]);
  } catch (err) {
    if (err.message !== 'auth') alert('Could not cancel: ' + err.message);
  }
}

// Initial load
renderNotifications();
loadBorrowings();
loadNotifications();
