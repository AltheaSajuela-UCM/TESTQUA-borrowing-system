document.addEventListener("DOMContentLoaded", () => {
    // 1. Sidebar Toggle Logic
    const menuBtn = document.getElementById("menu-btn");
    const closeSidebarBtn = document.getElementById("close-sidebar-btn");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");

    if (menuBtn && sidebar && overlay) {
        menuBtn.addEventListener("click", () => {
            sidebar.classList.remove("closed");
            overlay.classList.remove("hidden");
        });

        const closeSidebar = () => {
            sidebar.classList.add("closed");
            overlay.classList.add("hidden");
        };

        if (closeSidebarBtn) closeSidebarBtn.addEventListener("click", closeSidebar);
        overlay.addEventListener("click", closeSidebar);
    }

    // 2. Profile Dropdown Toggle Logic
    const profileMenuBtn = document.getElementById("profile-menu-btn");
    const profileDropdown = document.getElementById("profile-dropdown");

    profileMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle("hidden");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", () => {
        if (!profileDropdown.classList.contains("hidden")) {
            profileDropdown.classList.add("hidden");
        }
    });

    // 3. Edit Account Settings Toggle Logic
    const editBtn = document.getElementById("edit-btn");
    const formInputs = document.querySelectorAll("#settings-form input");
    let isEditing = false;

    editBtn.addEventListener("click", () => {
        isEditing = !isEditing;
        
        formInputs.forEach(input => {
            input.disabled = !isEditing;
        });

        if (isEditing) {
            editBtn.textContent = "Save Changes";
            editBtn.style.backgroundColor = "#198754"; // Success green state
            formInputs[0].focus();
        } else {
            editBtn.textContent = "Edit Account Settings";
            editBtn.style.backgroundColor = "#0d6efd"; // Back to blue primary
            // Here you can add logic to save the updated data via API fetch
        }
    });
});