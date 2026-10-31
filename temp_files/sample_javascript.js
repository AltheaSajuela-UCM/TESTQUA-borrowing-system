document.addEventListener("DOMContentLoaded", () => {
    // Profile Dropdown Toggle Logic
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

    // Edit Account Settings Toggle Logic
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