// Hash password using Web Crypto API (SHA-256) 
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Generate a random token 
function generateToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Show, clear inline error message
function showError(message) {
    const errorEl = document.getElementById('form-error');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function clearError() {
    const errorEl = document.getElementById('form-error');
    errorEl.textContent = '';
    errorEl.style.display = 'none';
}

//  REGISTER

// Show/hide organizer-only fields based on selected account type
function toggleOrganizerFields() {
    const isOrganizer = document.getElementById('type-organizer').checked;
    const fields = document.getElementById('organizer-fields');
    const location = document.getElementById('location');
    const eventType = document.getElementById('event-type');

    if (isOrganizer) {
        fields.style.display = 'block';
        location.required = true;
        eventType.required = true;
    } else {
        fields.style.display = 'none';
        location.required = false;
        eventType.required = false;
    }
}

// Main register handler
async function handleRegister() {
    clearError();

    const firstName = document.getElementById('first-name').value.trim();
    const lastName = document.getElementById('last-name').value.trim();
    const email = document.getElementById('email-address').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const userType = document.querySelector('input[name="user-type"]:checked').value;

    // Validation
    if (!firstName || !lastName) {
        showError('Please enter your first and last name.');
        return;
    }

    if (!email) {
        showError('Please enter your email address.');
        return;
    }

    if (password.length < 8) {
        showError('Password must be at least 8 characters long.');
        return;
    }

    if (password !== confirmPassword) {
        showError('Passwords do not match. Please try again.');
        return;
    }

    // Check if email is already registered
    const existingUsers = JSON.parse(localStorage.getItem('wo_users') || '[]');
    const emailExists = existingUsers.some(u => u.email === email);
    if (emailExists) {
        showError('An account with this email address already exists.');
        return;
    }

    // Organizer-specific validation
    let location = '';
    let telephone = '';
    let eventType = '';

    if (userType === 'organizer') {
        location = document.getElementById('location').value.trim();
        telephone = document.getElementById('telephone').value.trim();
        eventType = document.getElementById('event-type').value;

        if (!location) {
            showError('Please enter your location.');
            return;
        }
        if (!eventType) {
            showError('Please select an event type.');
            return;
        }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Build user object
    const newUser = {
        id: generateToken(),
        firstName,
        lastName,
        email,
        passwordHash: hashedPassword,
        userType,
        createdAt: new Date().toISOString(),
        ...(userType === 'organizer' && {
            location,
            telephone,
            eventType,
        }),
    };

    // Save to localStorage
    existingUsers.push(newUser);
    localStorage.setItem('wo_users', JSON.stringify(existingUsers));

    // Success
    alert('Account successfully created! You can now log in.');
    window.location.href = 'login.html';
}

//  FORGOT PASSWORD

// Main reset password handler
async function handleResetPassword() {
    const errorEl = document.getElementById('form-error');
    const successEl = document.getElementById('form-success');

    // Clear previous messages
    errorEl.style.display = 'none';
    errorEl.textContent = '';
    successEl.style.display = 'none';
    successEl.textContent = '';

    const email = document.getElementById('email-address').value.trim().toLowerCase();
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validation
    if (!email) {
        errorEl.textContent = 'Please enter your email address.';
        errorEl.style.display = 'block';
        return;
    }

    if (newPassword.length < 8) {
        errorEl.textContent = 'New password must be at least 8 characters long.';
        errorEl.style.display = 'block';
        return;
    }

    if (newPassword !== confirmPassword) {
        errorEl.textContent = 'Passwords do not match. Please try again.';
        errorEl.style.display = 'block';
        return;
    }

    // Check if account with this email exists
    const existingUsers = JSON.parse(localStorage.getItem('wo_users') || '[]');
    const userIndex = existingUsers.findIndex(u => u.email === email);

    if (userIndex === -1) {
        errorEl.textContent = 'No account found with this email address.';
        errorEl.style.display = 'block';
        return;
    }

    // Check if new password is the same as the old one
    const newHashedPassword = await hashPassword(newPassword);
    if (newHashedPassword === existingUsers[userIndex].passwordHash) {
        errorEl.textContent = 'New password cannot be the same as your current password.';
        errorEl.style.display = 'block';
        return;
    }

    // Update password in localStorage
    existingUsers[userIndex].passwordHash = newHashedPassword;
    localStorage.setItem('wo_users', JSON.stringify(existingUsers));

    // Show success and redirect to login after short delay
    successEl.textContent = 'Password successfully updated! Redirecting to log in...';
    successEl.style.display = 'block';
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 2000);
}


// Pre-fill email if "Remember me" was used previously
window.addEventListener('DOMContentLoaded', () => {
    const remembered = localStorage.getItem('wo_remember_email');
    if (remembered && document.getElementById('email-address')) {
        document.getElementById('email-address').value = remembered;
        const rememberCheckbox = document.getElementById('remember-me');
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }
});

// Main login handler
async function handleLogin() {
    clearError();

    const email = document.getElementById('email-address').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me').checked;

    if (!email) {
        showError('Please enter your email address.');
        return;
    }

    if (!password) {
        showError('Please enter your password.');
        return;
    }

    // Find user by email
    const existingUsers = JSON.parse(localStorage.getItem('wo_users') || '[]');
    const user = existingUsers.find(u => u.email === email);

    if (!user) {
        showError('No account found with this email address.');
        return;
    }

    // Verify password
    const hashedInput = await hashPassword(password);
    if (hashedInput !== user.passwordHash) {
        showError('Incorrect password. Please try again.');
        return;
    }

    // Handle "Remember me"
    if (rememberMe) {
        localStorage.setItem('wo_remember_email', email);
    } else {
        localStorage.removeItem('wo_remember_email');
    }

    // Create session and store it
    const session = {
        token: generateToken(),
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        loggedInAt: new Date().toISOString(),
    };
    localStorage.setItem('wo_session', JSON.stringify(session));

    // Redirect to homepage
    window.location.href = 'index.html';
}