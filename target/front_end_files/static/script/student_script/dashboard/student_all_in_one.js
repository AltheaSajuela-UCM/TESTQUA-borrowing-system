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

// ==========================================
// 5. "HOW BORROWING WORKS" GUIDE MODAL LOGIC
// ==========================================
const guideModalOverlay = document.getElementById('guideModalOverlay');
const openGuideBtn = document.getElementById('openGuideBtn');
const guideExitBtn = document.getElementById('guideExitBtn');
const guideBackBtn = document.getElementById('guideBackBtn');
const guideNextBtn = document.getElementById('guideNextBtn');

const guideStepTitle = document.getElementById('guideStepTitle');
const guideTitle = document.getElementById('guideTitle');
const guideDescription = document.getElementById('guideDescription');
const guideBoxText = document.getElementById('guideBoxText');
const progressBars = document.querySelectorAll('.guide-progress-bars .progress-bar');

const guideSteps = [
    {
        step: "STEP 1 OF 6",
        title: "Welcome to Webventory, Juan!",
        description: "Webventory is your Student Portal for requesting, claiming, managing, and returning items from the Student Affairs Office.",
        boxText: "This quick guide will show you the complete borrowing process before you begin.",
        nextText: "Next step"
    },
    {
        step: "STEP 2 OF 6",
        title: "Create a borrowing request",
        description: "Choose Academic or Non-Academic, select the item you want, review the automatically filled details, then confirm the request or exit.",
        boxText: "You can review your request before submitting it.",
        nextText: "Next step"
    },
    {
        step: "STEP 3 OF 6",
        title: "Claim your item at the SAO Office",
        description: "Proceed to the SAO Office at the Alicia Gotianuy Building, beside the Scholarship Office.",
        boxText: "Take a screenshot or picture of your transaction number and present it to the Working Scholar. Handle every borrowed item with care.",
        nextText: "Next step"
    },
    {
        step: "STEP 4 OF 6",
        title: "Cancel a pending request",
        description: "Open Cancel Borrow Request, select the pending item, then confirm the cancellation or go back.",
        boxText: "Cancellation is only available after a request has been submitted and before the item is released.",
        nextText: "Next step"
    },
    {
        step: "STEP 5 OF 6",
        title: "Return the borrowed item",
        description: "Bring the item back to the SAO Office at the Alicia Gotianuy Building, beside the Scholarship Office, and present your transaction number.",
        boxText: "Items must be complete and must not be damaged or lost, especially board games and other Non-Academic items.",
        nextText: "Next step"
    },
    {
        step: "STEP 6 OF 6",
        title: "What to do when an item is overdue",
        description: "Return the item to the SAO Office as soon as possible. Present the borrowed item together with your transaction number, student ID, and name to the Working Scholar.",
        boxText: "Webventory will notify you when a borrowed item becomes overdue, or when an item is removed from the catalog or becomes unavailable.",
        nextText: "Start borrowing"
    }
];

let currentGuideStep = 0;

function updateGuideModal() {
    const data = guideSteps[currentGuideStep];
    guideStepTitle.textContent = `BORROWING GUIDE · ${data.step}`;
    guideTitle.textContent = data.title;
    guideDescription.textContent = data.description;
    guideBoxText.textContent = data.boxText;
    guideNextBtn.textContent = data.nextText;

    // Buttons state
    guideBackBtn.disabled = currentGuideStep === 0;

    // Progress bar fills
    progressBars.forEach((bar, index) => {
        if (index <= currentGuideStep) {
            bar.classList.add('active');
        } else {
            bar.classList.remove('active');
        }
    });
}

openGuideBtn.addEventListener('click', () => {
    currentGuideStep = 0;
    updateGuideModal();
    guideModalOverlay.classList.remove('hidden');
});

function closeGuideModal() {
    guideModalOverlay.classList.add('hidden');
}

guideExitBtn.addEventListener('click', closeGuideModal);

guideNextBtn.addEventListener('click', () => {
    if (currentGuideStep < guideSteps.length - 1) {
        currentGuideStep++;
        updateGuideModal();
    } else {
        closeGuideModal(); // Finished all steps
    }
});

guideBackBtn.addEventListener('click', () => {
    if (currentGuideStep > 0) {
        currentGuideStep--;
        updateGuideModal();
    }
});