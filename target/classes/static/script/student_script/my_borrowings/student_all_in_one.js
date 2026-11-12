// Notifications Data Store
const notifications = [
  { id: 1, text: "Chess is overdue. Return it to the SAO Office immediately.", type: "alert", unread: true },
  { id: 2, text: "Henry approved your Scientific Calculator request.", type: "general", unread: true },
  { id: 3, text: "Your return schedule was set for 5:00 PM.", type: "general", unread: true }
];

let currentTab = 'all';

// Render Notifications
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
    return;
  }

  filtered.forEach(n => {
    const item = document.createElement('div');
    const isAlert = n.type === 'alert';
    item.className = `notif-item ${isAlert ? 'alert' : ''}`;
    
    item.innerHTML = `
      <p>${n.text}</p>
      ${n.unread ? `<button onclick="markAsRead(${n.id})" class="mark-read-btn">Mark as read</button>` : '<span style="font-size: 10px; color: #9ca3af;">Read</span>'}
    `;
    listContainer.appendChild(item);
  });

  // Update badge count
  const unreadCount = notifications.filter(n => n.unread).length;
  const badge = document.getElementById('notif-badge');
  badge.innerText = unreadCount;
  badge.style.display = unreadCount > 0 ? 'flex' : 'none';
}

function markAsRead(id) {
  const notif = notifications.find(n => n.id === id);
  if (notif) notif.unread = false;
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

// Table Actions (View, Receipt, Cancel)
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

function openReceipt(item, code, date) {
  alert(`Generating receipt for ${item} (${code}) borrowed on ${date}...`);
}

function cancelRequest(btn) {
  if (confirm('Are you sure you want to cancel this borrow request?')) {
    const row = btn.closest('tr');
    row.style.transition = 'opacity 0.3s ease';
    row.style.opacity = '0';
    setTimeout(() => row.remove(), 300);
  }
}

// Initial render
renderNotifications();