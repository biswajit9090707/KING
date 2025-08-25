// Check if user is logged in
function checkAuth() {
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('login.html');
    
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            if (isLoginPage) {
                // If on login page, redirect to dashboard
                window.location.href = 'index.html';
            } else {
                // Update UI for logged in user
                if (document.getElementById('adminEmail')) {
                    document.getElementById('adminEmail').textContent = user.email;
                }
            }
        } else {
            // User is not signed in
            if (!isLoginPage) {
                // If not on login page, redirect to login
                window.location.href = 'login.html';
            }
        }
    });
}

// Handle login form submission
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');
    const logoutBtn = document.getElementById('logout');
    
    // Check authentication status when page loads
    checkAuth();
    
    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Simple admin credentials (in a real app, use Firebase Authentication properly)
            const ADMIN_EMAIL = 'admin@example.com';
            const ADMIN_PASSWORD = 'admin123';
            
            if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
                // In a real app, you would use Firebase Authentication here
                // For this example, we'll just redirect to the dashboard
                window.location.href = 'index.html';
            } else {
                errorMessage.textContent = 'Invalid email or password';
                errorMessage.style.display = 'block';
            }
        });
    }
    
    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            firebase.auth().signOut().then(() => {
                window.location.href = 'login.html';
            }).catch((error) => {
                console.error('Logout Error:', error);
            });
        });
    }
});
