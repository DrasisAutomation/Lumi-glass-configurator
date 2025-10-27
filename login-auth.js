// Authentication state observer
let isSigningIn = false;

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
});

// Check if user is already authenticated
function checkAuthStatus() {
    const user = auth.currentUser;
    
    if (user) {
        console.log('User already signed in:', user.email);
        redirectToApp();
    } else {
        showLoginForm();
    }
}

// Show login form
function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('loading-section').style.display = 'none';
}

// Show loading state
function showLoading(show) {
    if (show) {
        document.getElementById('loading-section').style.display = 'block';
        document.getElementById('login-form').style.display = 'none';
    } else {
        document.getElementById('loading-section').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
    }
}

// Handle form submission
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    signInWithEmail();
});

// Sign in with email and password
async function signInWithEmail() {
    if (isSigningIn) return;
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('login-btn');

    // Basic validation
    if (!email || !password) {
        showAuthError('Please enter both email and password.');
        return;
    }

    isSigningIn = true;
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing In...';
    showLoading(true);
    hideAuthError();

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('User signed in successfully:', user.email);
        redirectToApp();
        
    } catch (error) {
        console.error('Sign-in error:', error);
        
        let errorMessage = 'Sign-in failed. Please try again.';
        
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled.';
                break;
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed attempts. Please try again later.';
                break;
        }
        
        showAuthError(errorMessage);
    } finally {
        isSigningIn = false;
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
        showLoading(false);
    }
}

// Show authentication error
function showAuthError(message) {
    const errorElement = document.getElementById('auth-error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Auto-hide error after 5 seconds
    setTimeout(() => {
        hideAuthError();
    }, 5000);
}

// Hide authentication error
function hideAuthError() {
    const errorElement = document.getElementById('auth-error');
    errorElement.style.display = 'none';
}

// Redirect to main application
function redirectToApp() {
    // Store authentication token in sessionStorage
    sessionStorage.setItem('lumi_authenticated', 'true');
    sessionStorage.setItem('lumi_user', JSON.stringify({
        email: auth.currentUser.email,
        uid: auth.currentUser.uid,
        displayName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0]
    }));
    
    // Redirect to main app
    window.location.href = 'index.html';
}

// Listen for auth state changes
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('Auth state changed: User signed in', user.email);
    } else {
        console.log('Auth state changed: User signed out');
    }
});