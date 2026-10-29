// Elements Selection
const menuBtn = document.getElementById('menuBtn');
const sideMenu = document.getElementById('sideMenu');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const menuOverlay = document.getElementById('menuOverlay');

const notifDropdownWrapper = document.getElementById('notifDropdownWrapper');
const notifBtn = document.getElementById('notifBtn');

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
notifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    profileDropdownWrapper.classList.remove('active');
    notifDropdownWrapper.classList.toggle('active');
});

// 3. PROFILE DROPDOWN TOGGLE
profileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notifDropdownWrapper.classList.remove('active');
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
        tabBtns.forEach((btn) => btn.classList.remove('active'));
        tab.classList.add('active');

        const filter = tab.dataset.tab;

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
        e.target.remove();
    });
});

// ====================================
// 5. ADMIN GUIDE MODAL LOGIC (7 STEPS)
// ====================================
const adminGuideSteps = [
    {
        title: "Welcome, System!",
        desc: "The Admin Portal gives you oversight of users, inventory, transactions, reports, history, and accountability."
    },
    {
        title: "Check and manage inventory",
        desc: "Review Academic and Non-Academic items, update stock, configure item rules, and change availability."
    },
    {
        title: "Monitor system statistics",
        desc: "Track total users, total items, active transactions, borrowing trends, overdue records, and activity from the Student and Working Scholar portals."
    },
    {
        title: "Manage Working Scholars",
        desc: "View and edit Working Scholar details. Add a Working Scholar using their ID number; linked profile details can be filled from their WS account once connected to live data."
    },
    {
        title: "Update borrowing rules",
        desc: "Apply universal care and return rules for all items. The Working Scholar decides the expected return date and time for each approved request."
    },
    {
        title: "Update availability",
        desc: "Availability changes take effect immediately and are reflected in both the Student and Working Scholar portals."
    },
    {
        title: "Add new inventory items",
        desc: "Create a new Academic or Non-Academic item and assign its inventory code, condition, stock, and availability."
    }
];

let currentGuideStep = 0;

const viewGuideBtn = document.getElementById('viewGuideBtn');
const guideOverlay = document.getElementById('guideOverlay');
const guideExitBtn = document.getElementById('guideExitBtn');
const guideBackBtn = document.getElementById('guideBackBtn');
const guideNextBtn = document.getElementById('guideNextBtn');

const guideStepTag = document.getElementById('guideStepTag');
const guideTitle = document.getElementById('guideTitle');
const guideDesc = document.getElementById('guideDesc');

function updateGuideModal() {
    const step = adminGuideSteps[currentGuideStep];
    guideStepTag.textContent = `ADMIN GUIDE · STEP ${currentGuideStep + 1} OF ${adminGuideSteps.length}`;
    guideTitle.textContent = step.title;
    guideDesc.textContent = step.desc;

    // Button states
    guideBackBtn.disabled = currentGuideStep === 0;

    if (currentGuideStep === adminGuideSteps.length - 1) {
        guideNextBtn.textContent = "Finish guide";
    } else {
        guideNextBtn.textContent = "Next step";
    }
}

viewGuideBtn.addEventListener('click', () => {
    currentGuideStep = 0;
    updateGuideModal();
    guideOverlay.classList.add('active');
});

guideExitBtn.addEventListener('click', () => {
    guideOverlay.classList.remove('active');
});

guideBackBtn.addEventListener('click', () => {
    if (currentGuideStep > 0) {
        currentGuideStep--;
        updateGuideModal();
    }
});

guideNextBtn.addEventListener('click', () => {
    if (currentGuideStep < adminGuideSteps.length - 1) {
        currentGuideStep++;
        updateGuideModal();
    } else {
        guideOverlay.classList.remove('active');
    }
});