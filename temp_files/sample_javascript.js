// Elements Selection
const menuBtn = document.getElementById('menuBtn');
const sideMenu = document.getElementById('sideMenu');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const menuOverlay = document.getElementById('menuOverlay');

const notifDropdownWrapper = document.getElementById('notifDropdownWrapper');
const notificationBtn = document.getElementById('notificationBtn');

const profileDropdownWrapper = document.getElementById('profileDropdownWrapper');
const profileBtn = document.getElementById('profileBtn');

// 1. SIDE MENU (DRAWER) TOGGLE
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

// 2. NOTIFICATION DROPDOWN TOGGLE
notificationBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    profileDropdownWrapper.classList.remove('active'); // Close profile if open
    notifDropdownWrapper.classList.toggle('active');
});

// 3. PROFILE DROPDOWN TOGGLE
profileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notifDropdownWrapper.classList.remove('active'); // Close notification if open
    profileDropdownWrapper.classList.toggle('active');
});

// CLOSE ALL DROPDOWNS ON CLICK OUTSIDE
document.addEventListener('click', (e) => {
    if (!notifDropdownWrapper.contains(e.target)) {
        notifDropdownWrapper.classList.remove('active');
    }
    if (!profileDropdownWrapper.contains(e.target)) {
        profileDropdownWrapper.classList.remove('active');
    }
});

// 4. NOTIFICATION TAB FILTERING (All, Unread, Alerts)
const tabBtns = document.querySelectorAll('.tab-btn');
const notifCards = document.querySelectorAll('.notif-card');

tabBtns.forEach((tab) => {
    tab.addEventListener('click', () => {
        // Activate selected tab button
        tabBtns.forEach((btn) => btn.classList.remove('active'));
        tab.classList.add('active');

        const filter = tab.dataset.tab;

        // Filter notification cards
        notifCards.forEach((card) => {
            if (filter === 'all') {
                card.style.display = 'block';
            } else if (filter === 'unread') {
                card.style.display = card.classList.contains('is-unread') ? 'block' : 'none';
            } else if (filter === 'alerts') {
                card.style.display = card.dataset.type === 'alert' ? 'block' : 'none';
            }
        });
    });
});

// Mark as read click action
document.querySelectorAll('.mark-read-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
        const card = e.target.closest('.notif-card');
        card.classList.remove('is-unread');
        e.target.remove(); // Remove "Mark as read" button once read
    });
});