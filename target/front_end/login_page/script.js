let currentRole = 'student'; 
let authMode = 'create';     
let currentStep = 1;

// Restrict inputs to digits only
function validateNumericInput(inputElement) {
    inputElement.value = inputElement.value.replace(/[^0-9]/g, '');
}

function setAppView(role) {
    currentRole = role;
    
    const buttons = document.querySelectorAll('.switcher-btn');
    buttons.forEach(btn => btn.classList.remove('active-switcher'));
    event.target.classList.add('active-switcher');

    const roleBadge = document.getElementById('roleBadge');
    const authTabsContainer = document.getElementById('authTabsContainer');

    if (role === 'student') {
        roleBadge.textContent = 'Student';
        roleBadge.className = 'role-badge student-badge';
        authTabsContainer.style.display = 'flex';
        switchAuthTab('create');
    } 
    else if (role === 'working-scholar') {
        roleBadge.textContent = 'Working Scholar';
        roleBadge.className = 'role-badge scholar-badge';
        authTabsContainer.style.display = 'none';
        switchAuthTab('signin');
    } 
    else if (role === 'admin') {
        roleBadge.textContent = 'Administrator';
        roleBadge.className = 'role-badge admin-badge';
        authTabsContainer.style.display = 'none';
        switchAuthTab('signin');
    }
}

function switchAuthTab(mode) {
    authMode = mode;
    const tabCreate = document.getElementById('tabCreateAccount');
    const tabSignIn = document.getElementById('tabSignIn');
    const stepWizard = document.getElementById('stepWizardContainer');
    const formStudentCreate = document.getElementById('formStudentCreate');
    const formSignIn = document.getElementById('formSignIn');
    const viewAccountCreated = document.getElementById('viewAccountCreated');
    const footerPrompt = document.getElementById('footerPrompt');
    const footerActionLink = document.getElementById('footerActionLink');
    const cardFooterText = document.getElementById('cardFooterText');

    viewAccountCreated.style.display = 'none';
    cardFooterText.style.display = 'block';

    if (mode === 'create' && currentRole === 'student') {
        if (tabCreate) tabCreate.classList.add('active');
        if (tabSignIn) tabSignIn.classList.remove('active');
        stepWizard.style.display = 'block';
        formStudentCreate.style.display = 'block';
        formSignIn.style.display = 'none';
        footerPrompt.textContent = 'Already have an account?';
        footerActionLink.textContent = 'Sign in';
        goToStep(1);
    } else {
        if (tabCreate) tabCreate.classList.remove('active');
        if (tabSignIn) tabSignIn.classList.add('active');
        stepWizard.style.display = 'none';
        formStudentCreate.style.display = 'none';
        formSignIn.style.display = 'block';
        footerPrompt.textContent = currentRole === 'student' ? "Don't have an account?" : '';
        footerActionLink.textContent = currentRole === 'student' ? 'Create Account' : '';
    }
}

/* STEP VALIDATIONS */
function validateStep1AndNext() {
    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const studentId = document.getElementById('regStudentId').value.trim();
    const contact = document.getElementById('regContact').value.trim();

    if (!firstName) {
        alert('Please enter your First Name.');
        return;
    }
    if (!lastName) {
        alert('Please enter your Last Name.');
        return;
    }
    if (studentId.length !== 8) {
        alert('Student ID must be exactly 8 digits.');
        return;
    }
    if (contact.length < 10) {
        alert('Please enter a valid Contact Number (e.g. 09000000000).');
        return;
    }

    goToStep(2);
}

function validateStep2AndNext() {
    const pass = document.getElementById('regPassword').value;
    const confirmPass = document.getElementById('regConfirmPassword').value;

    if (pass.length < 8) {
        alert('Password must be at least 8 characters long.');
        return;
    }
    if (pass !== confirmPass) {
        alert('Passwords do not match. Please try again.');
        return;
    }

    goToStep(3);
}

function goToStep(stepNumber) {
    currentStep = stepNumber;

    document.getElementById('createStep1').style.display = stepNumber === 1 ? 'block' : 'none';
    document.getElementById('createStep2').style.display = stepNumber === 2 ? 'block' : 'none';
    document.getElementById('createStep3').style.display = stepNumber === 3 ? 'block' : 'none';

    const titles = { 1: 'Your Details', 2: 'Password', 3: 'Review and Confirm' };
    document.getElementById('stepCounterText').textContent = `STEP ${stepNumber} OF 3`;
    document.getElementById('stepTitleText').textContent = titles[stepNumber];

    for (let i = 1; i <= 3; i++) {
        const item = document.getElementById(`wizardStep${i}`);
        const icon = document.getElementById(`stepIcon${i}`);

        if (i < stepNumber) {
            item.className = 'step-item completed';
            icon.innerHTML = '&#10003;';
        } else if (i === stepNumber) {
            item.className = 'step-item active';
            icon.textContent = i;
        } else {
            item.className = 'step-item';
            icon.textContent = i;
        }
    }

    document.getElementById('stepDivider1').className = stepNumber >= 2 ? 'step-divider active' : 'step-divider';
    document.getElementById('stepDivider2').className = stepNumber >= 3 ? 'step-divider active' : 'step-divider';

    if (stepNumber === 3) {
        const fName = document.getElementById('regFirstName').value.trim();
        const mName = document.getElementById('regMiddleName').value.trim();
        const lName = document.getElementById('regLastName').value.trim();
        const full = `${fName} ${mName ? mName + ' ' : ''}${lName}`.trim();

        document.getElementById('revFullName').textContent = full;
        document.getElementById('revStudentId').textContent = document.getElementById('regStudentId').value;
        document.getElementById('revContact').textContent = document.getElementById('regContact').value;
    }
}

function showAccountCreatedSuccess() {
    document.getElementById('formStudentCreate').style.display = 'none';
    document.getElementById('stepWizardContainer').style.display = 'none';

    const fName = document.getElementById('regFirstName').value.trim();
    const mName = document.getElementById('regMiddleName').value.trim();
    const lName = document.getElementById('regLastName').value.trim();
    const full = `${fName} ${mName ? mName + ' ' : ''}${lName}`.trim();

    document.getElementById('successFullName').textContent = full;
    document.getElementById('successStudentId').textContent = document.getElementById('regStudentId').value;

    document.getElementById('viewAccountCreated').style.display = 'block';
}

function toggleAuthModeFromFooter(e) {
    e.preventDefault();
    if (currentRole !== 'student') return;
    if (authMode === 'create') {
        switchAuthTab('signin');
    } else {
        switchAuthTab('create');
    }
}

function togglePasswordVisibility(inputId, icon) {
    const passwordInput = document.getElementById(inputId);
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function openTermsModal(e) {
    e.preventDefault();
    document.getElementById('termsModal').style.display = 'flex';
}

function closeTermsModal() {
    document.getElementById('termsModal').style.display = 'none';
}

function acceptTerms() {
    document.getElementById('termsCheckbox').checked = true;
    closeTermsModal();
}

function handleFormSubmit(e) {
    e.preventDefault();
    if (authMode === 'create') {
        if (!document.getElementById('termsCheckbox').checked) {
            alert('Please agree to the Terms and Conditions to complete your registration.');
            return;
        }
        showAccountCreatedSuccess();
    } else {
        const idVal = document.getElementById('signInId').value.trim();
        if (idVal.length !== 8) {
            alert('ID Number must be exactly 8 digits.');
            return;
        }
        alert('Signed in successfully as ' + currentRole.toUpperCase() + '!');
    }
}