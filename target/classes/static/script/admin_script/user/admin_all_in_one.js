// Empty Data Sets for Users
const studentsData = [];
const scholarsData = [];

// Empty Data Set for Notifications (Set empty array `[]` to test empty state)
let notificationsData = [];

let currentRole = 'students';
let currentNotifTab = 'all';

// Render Table Function
function renderTable() {
    const tableBody = document.getElementById('userTableBody');
    const colId = document.getElementById('col-id');
    const colExtra = document.getElementById('col-extra');
    tableBody.innerHTML = '';

    if (currentRole === 'students') {
        colId.textContent = "Student ID";
        colExtra.textContent = "Academic Level";
        
        if (studentsData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">No students found in the system.</td></tr>`;
        }
    } else {
        colId.textContent = "Scholar ID";
        colExtra.textContent = "Assigned Dept";
        
        if (scholarsData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">No SAO Working Scholars found in the system.</td></tr>`;
        }
    }
}

// Render Notifications Function (Handling Empty State & Tabs)
function renderNotifications() {
    const notifListContainer = document.getElementById('notifListContainer');
    const notifBadge = document.getElementById('notifBadge');
    notifListContainer.innerHTML = '';

    let filtered = notificationsData;
    if (currentNotifTab === 'unread') {
        filtered = notificationsData.filter(n => n.unread);
    } else if (currentNotifTab === 'alerts') {
        filtered = notificationsData.filter(n => n.type === 'alert');
    }

    if (filtered.length === 0) {
        notifListContainer.innerHTML = `<div class="empty-notif">No notifications found.</div>`;
    } else {
        filtered.forEach(n => {
            const card = document.createElement('div');
            card.className = `notif-card ${n.type === 'alert' ? 'is-alert' : ''}`;
            card.innerHTML = `
                <p>${n.text}</p>
                ${n.unread ? `<button class="mark-read-btn" onclick="markAsRead(${n.id})">Mark as read</button>` : '<span style="font-size: 10px; color: #94a3b8;">Read</span>'}
            `;
            notifListContainer.appendChild(card);
        });
    }

    // Badge Count
    const unreadCount = notificationsData.filter(n => n.unread).length;
    if (unreadCount > 0) {
        notifBadge.textContent = unreadCount;
        notifBadge.style.display = 'flex';
    } else {
        notifBadge.style.display = 'none';
    }
}

function markAsRead(id) {
    const item = notificationsData.find(n => n.id === id);
    if (item) item.unread = false;
    renderNotifications();
}

// Role Tab Switching
const roleTabBtns = document.querySelectorAll('.role-tab-btn');
roleTabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        roleTabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentRole = e.target.getAttribute('data-role');
        renderTable();
    });
});

// Notification Tab Switching
const notifTabBtns = document.querySelectorAll('.notif-popup .tab-btn');
notifTabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        notifTabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentNotifTab = e.target.getAttribute('data-tab');
        renderNotifications();
    });
});

// Side Drawer Navigation
const menuBtn = document.getElementById('menuBtn');
const sideMenu = document.getElementById('sideMenu');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const menuOverlay = document.getElementById('menuOverlay');

function openSideMenu() {
    sideMenu.classList.add('active');
    menuOverlay.classList.add('active');
}

function closeSideMenu() {
    sideMenu.classList.remove('active');
    menuOverlay.classList.remove('active');
}

menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openSideMenu();
});
closeMenuBtn.addEventListener('click', closeSideMenu);
menuOverlay.addEventListener('click', closeSideMenu);

// Dropdown Toggles (Notifications & Profile)
const notifWrapper = document.getElementById('notifDropdownWrapper');
const notifBtn = document.getElementById('notifBtn');
const profileWrapper = document.getElementById('profileDropdownWrapper');
const profileBtn = document.getElementById('profileBtn');

notifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    profileWrapper.classList.remove('active');
    notifWrapper.classList.toggle('active');
    renderNotifications();
});

profileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notifWrapper.classList.remove('active');
    profileWrapper.classList.toggle('active');
});

document.addEventListener('click', () => {
    notifWrapper.classList.remove('active');
    profileWrapper.classList.remove('active');
});

// Initial Renders
renderTable();
renderNotifications();