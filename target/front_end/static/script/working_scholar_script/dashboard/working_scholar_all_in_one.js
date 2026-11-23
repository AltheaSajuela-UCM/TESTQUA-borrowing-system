// Elements Selection
const menuBtn = document.getElementById('menuBtn');
const leftEdgeHover = document.getElementById('left-edge-hover');
const sideMenu = document.getElementById('sideMenu');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const menuOverlay = document.getElementById('menuOverlay');

const notifDropdownWrapper = document.getElementById('notifDropdownWrapper');
const notifBtn = document.getElementById('notifBtn');
const notifPopup = document.getElementById('notifPopup');

const profileDropdownWrapper = document.getElementById('profileDropdownWrapper');
const profileBtn = document.getElementById('profileBtn');
const profilePopup = document.getElementById('profilePopup');

let sidebarCloseTimer = null;

// 1. SIDE MENU (DRAWER) TOGGLE & HOVER
function setSideMenuState(isOpen, persist = true, showOverlay = true) {
    clearTimeout(sidebarCloseTimer);
    if (sideMenu) sideMenu.classList.toggle('active', isOpen);
    if (menuOverlay) menuOverlay.classList.toggle('active', !!(isOpen && showOverlay));
    if (persist) {
        try {
            localStorage.setItem(SIDEBAR_STORAGE_KEY, isOpen ? 'true' : 'false');
        } catch (err) { /* storage unavailable */ }
    }
}

function openSideMenu() {
    setSideMenuState(true, true, true);
}

function closeSideMenu() {
    setSideMenuState(false, true, false);
}

function scheduleSideMenuClose() {
    clearTimeout(sidebarCloseTimer);
    sidebarCloseTimer = setTimeout(() => {
        const hoveringMenu = menuBtn && menuBtn.matches(':hover');
        const hoveringEdge = leftEdgeHover && leftEdgeHover.matches(':hover');
        const hoveringDrawer = sideMenu && sideMenu.matches(':hover');
        if (!hoveringMenu && !hoveringEdge && !hoveringDrawer) {
            setSideMenuState(false, false, false);
        }
    }, 150);
}

if (menuBtn) {
    menuBtn.addEventListener('mouseenter', () => setSideMenuState(true, false, false));
    menuBtn.addEventListener('mouseleave', scheduleSideMenuClose);
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSideMenu();
    });
}

if (leftEdgeHover) {
    leftEdgeHover.addEventListener('mouseenter', () => setSideMenuState(true, false, false));
    leftEdgeHover.addEventListener('mouseleave', scheduleSideMenuClose);
}

if (closeMenuBtn) {
    closeMenuBtn.addEventListener('click', closeSideMenu);
}

if (menuOverlay) {
    menuOverlay.addEventListener('click', closeSideMenu);
}

if (sideMenu) {
    sideMenu.addEventListener('mouseenter', () => clearTimeout(sidebarCloseTimer));
    sideMenu.addEventListener('mouseleave', scheduleSideMenuClose);

    sideMenu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.stopPropagation();
            try {
                localStorage.setItem(SIDEBAR_STORAGE_KEY, 'true');
            } catch (err) { /* storage unavailable */ }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        if (localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true') {
            openSideMenu();
        }
    } catch (err) { /* storage unavailable */ }
});

// 2. NOTIFICATION DROPDOWN TOGGLE
if (notifBtn && notifDropdownWrapper) {
    notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (profileDropdownWrapper) profileDropdownWrapper.classList.remove('active');
        notifDropdownWrapper.classList.toggle('active');
    });
}

// 3. PROFILE DROPDOWN TOGGLE
if (profileBtn && profileDropdownWrapper) {
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (notifDropdownWrapper) notifDropdownWrapper.classList.remove('active');
        profileDropdownWrapper.classList.toggle('active');
    });
}

// CLOSE ALL DROPDOWNS ON CLICK OUTSIDE
document.addEventListener('click', (e) => {
    if (notifDropdownWrapper && !notifDropdownWrapper.contains(e.target)) {
        notifDropdownWrapper.classList.remove('active');
    }
    if (profileDropdownWrapper && !profileDropdownWrapper.contains(e.target)) {
        profileDropdownWrapper.classList.remove('active');
    }
});

// 4. NOTIFICATION TAB FILTERING (All, Unread, Alerts)
const tabBtns = document.querySelectorAll('.tab-btn');
const notifCards = document.querySelectorAll('.notif-card');

if (tabBtns.length > 0) {
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
}

// Mark as read click action
document.querySelectorAll('.mark-read-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
        const card = e.target.closest('.notif-card');
        if (card) {
            card.classList.remove('is-unread');
            e.target.remove();
        }
    });
});

// ====================================
// 5. WORKING SCHOLAR GUIDE MODAL LOGIC (4 STEPS)
// ====================================
const wsGuideSteps = [
    {
        title: "Welcome, NONE!",
        desc: "You will use the Working Scholar Portal to process requests, release inventory, record returns, and assist students."
    },
    {
        title: "Process borrow requests",
        desc: "Open Process Requests, verify the transaction number, student name, ID, mobile number, item, and any notes. Choose Yes, Complete to approve or Incomplete to reject with a reason. Set the expected return schedule before approval."
    },
    {
        title: "Release the requested item",
        desc: "Retrieve the item from inventory, verify the transaction number as your reference, inspect its condition, and release it to the correct student."
    },
    {
        title: "Record an item return",
        desc: "Ask the student for the transaction number, inspect the returned item, choose its condition—including Lost or Damaged when applicable—and select Complete Return."
    }
];

let currentWsGuideStep = 0;

const viewGuideBtn = document.getElementById('viewGuideBtn');
const guideOverlay = document.getElementById('guideOverlay');
const guideExitBtn = document.getElementById('guideExitBtn');
const guideBackBtn = document.getElementById('guideBackBtn');
const guideNextBtn = document.getElementById('guideNextBtn');

const guideStepTag = document.getElementById('guideStepTag');
const guideTitle = document.getElementById('guideTitle');
const guideDesc = document.getElementById('guideDesc');

function updateWsGuideModal() {
    if (!guideStepTag || !guideTitle || !guideDesc || !guideBackBtn || !guideNextBtn) return;
    
    const step = wsGuideSteps[currentWsGuideStep];
    guideStepTag.textContent = `WORKING SCHOLAR GUIDE · STEP ${currentWsGuideStep + 1} OF ${wsGuideSteps.length}`;
    guideTitle.textContent = step.title;
    guideDesc.textContent = step.desc;

    // Button states
    guideBackBtn.disabled = currentWsGuideStep === 0;

    if (currentWsGuideStep === wsGuideSteps.length - 1) {
        guideNextBtn.textContent = "Finish guide";
    } else {
        guideNextBtn.textContent = "Next step";
    }
}

if (viewGuideBtn && guideOverlay) {
    viewGuideBtn.addEventListener('click', () => {
        currentWsGuideStep = 0;
        updateWsGuideModal();
        guideOverlay.classList.add('active');
    });
}

if (guideExitBtn && guideOverlay) {
    guideExitBtn.addEventListener('click', () => {
        guideOverlay.classList.remove('active');
    });
}

if (guideBackBtn) {
    guideBackBtn.addEventListener('click', () => {
        if (currentWsGuideStep > 0) {
            currentWsGuideStep--;
            updateWsGuideModal();
        }
    });
}

if (guideNextBtn && guideOverlay) {
    guideNextBtn.addEventListener('click', () => {
        if (currentWsGuideStep < wsGuideSteps.length - 1) {
            currentWsGuideStep++;
            updateWsGuideModal();
        } else {
            guideOverlay.classList.remove('active');
        }
    });
}