const dropdownBtn = document.getElementById('dropdownBtn');
const dropdown = dropdownBtn.parentElement;

// Toggle menu on button click
dropdownBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // Prevents click event from bubbling up to document
  dropdown.classList.toggle('active');
});

// Close dropdown when clicking anywhere outside of it
document.addEventListener('click', (e) => {
  if (!dropdown.contains(e.target)) {
    dropdown.classList.remove('active');
  }
});