// Dropdown Menu
// OPEN
const dropdownMenuBtn = document.getElementById('menuBtn');
const dropdownMenu = dropdownMenuBtn.parentElement;
// CLOSE
const closeMenuBtn = document.getElementById('closeBtn');

// ============================================================================================================
// Notification
// OPEN
const dropdownNotificationBtn = document.getElementById('notificationBtn');
const dropdownNotification = dropdownNotificationBtn.parentElement;


// ?What?
// Toggle menu on button click
dropdownMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('active');
});
// Close dropdown when clicking anywhere outside of it
document.addEventListener('click', (e) => {
    if (!dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.remove('active');
    }
});

closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('active');
});

// ============================================================================================================
//Notification
dropdownNotificationBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownNotification.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (!dropdownNotification.contains(e.target)) {
        dropdownNotification.classList.remove('active');
    }
});

// ======================================
//Profile
const dropdownProfileBtn = document.getElementById('profileBtn');
const dropdownProfile = dropdownProfileBtn.parentElement;


dropdownProfileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownProfile.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (!dropdownProfile.contains(e.target)) {
        dropdownProfile.classList.remove('active');
    }
});

// Signal rani para makabalo ko na ni gana ra ang akoa script
// alert("Hello! This is a simple notification.");