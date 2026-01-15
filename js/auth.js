// Authentication Module
const Auth = {
    // Current admin session
    currentAdmin: null,

    // Check if user is logged in
    isLoggedIn: () => {
        const session = localStorage.getItem('adminSession');
        if (session) {
            Auth.currentAdmin = JSON.parse(session);
            return true;
        }
        return false;
    },

    // Login function
    login: async (username, password) => {
        try {
            const hashedPassword = await Utils.hashPassword(password);

            // Query Firestore for matching admin
            const snapshot = await adminsCollection
                .where('username', '==', username)
                .where('password', '==', hashedPassword)
                .where('status', '==', 'active')
                .get();

            if (snapshot.empty) {
                throw new Error('Invalid username or password');
            }

            const adminDoc = snapshot.docs[0];
            const adminData = {
                id: adminDoc.id,
                ...adminDoc.data()
            };

            // Remove password from session data
            delete adminData.password;

            // Store session
            localStorage.setItem('adminSession', JSON.stringify(adminData));
            Auth.currentAdmin = adminData;

            return adminData;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    // Logout function
    logout: () => {
        localStorage.removeItem('adminSession');
        Auth.currentAdmin = null;
        window.location.href = 'login.html';
    },

    // Get current admin
    getCurrentAdmin: () => {
        if (!Auth.currentAdmin) {
            const session = localStorage.getItem('adminSession');
            if (session) {
                Auth.currentAdmin = JSON.parse(session);
            }
        }
        return Auth.currentAdmin;
    },

    // Check auth and redirect
    requireAuth: () => {
        if (!Auth.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    // Check if any admin exists in the database
    checkAdminExists: async () => {
        try {
            const snapshot = await adminsCollection.limit(1).get();
            return !snapshot.empty;
        } catch (error) {
            console.error('Error checking admin existence:', error);
            return false;
        }
    }
};

// Login Page Handler
document.addEventListener('DOMContentLoaded', async () => {
    // Check if on login page
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        // If already logged in, redirect to dashboard
        if (Auth.isLoggedIn()) {
            window.location.href = 'dashboard.html';
            return;
        }

        // Check if any admin exists
        const adminExists = await Auth.checkAdminExists();
        const alertContainer = document.getElementById('alertContainer');

        if (!adminExists) {
            alertContainer.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>No admin accounts exist. Please create an admin directly in Firebase Firestore.</span>
                </div>
            `;
        }

        // Password toggle
        const togglePassword = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('password');

        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', () => {
                const type = passwordInput.type === 'password' ? 'text' : 'password';
                passwordInput.type = type;
                togglePassword.querySelector('i').classList.toggle('fa-eye');
                togglePassword.querySelector('i').classList.toggle('fa-eye-slash');
            });
        }

        // Login form submit
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const loginBtn = document.getElementById('loginBtn');
            const alertContainer = document.getElementById('alertContainer');

            // Clear previous alerts
            alertContainer.innerHTML = '';

            // Disable button
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<span class="loading-spinner"></span> Signing In...';

            try {
                await Auth.login(username, password);

                // Show success message
                alertContainer.innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-check-circle"></i>
                        <span>Login successful! Redirecting...</span>
                    </div>
                `;

                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } catch (error) {
                alertContainer.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle"></i>
                        <span>${error.message}</span>
                    </div>
                `;

                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            }
        });
    }

    // Setup common elements for authenticated pages
    if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('index.html')) {
        setupAuthenticatedPage();
    }
});

// Setup authenticated page elements
function setupAuthenticatedPage() {
    // Check authentication
    if (!Auth.requireAuth()) return;

    const admin = Auth.getCurrentAdmin();

    // Update user display
    const adminNameEl = document.getElementById('adminName');
    const userDisplayName = document.getElementById('userDisplayName');
    const userAvatar = document.getElementById('userAvatar');

    if (admin) {
        if (adminNameEl) adminNameEl.textContent = admin.name || 'Admin';
        if (userDisplayName) userDisplayName.textContent = admin.name || 'Admin';
        if (userAvatar) userAvatar.textContent = Utils.getInitials(admin.name || 'Admin');
    }

    // Logout handlers
    const logoutBtn = document.getElementById('logoutBtn');
    const dropdownLogout = document.getElementById('dropdownLogout');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    }

    if (dropdownLogout) {
        dropdownLogout.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    }

    // Profile dropdown toggle
    const userProfileBtn = document.getElementById('userProfileBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    if (userProfileBtn && profileDropdown) {
        userProfileBtn.addEventListener('click', () => {
            profileDropdown.classList.toggle('active');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userProfileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('active');
            }
        });
    }

    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 1024) {
                if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                    sidebar.classList.remove('active');
                }
            }
        });
    }
}

// Export for use in other files
window.Auth = Auth;
