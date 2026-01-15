// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBX_ve1OQfRxeTv_SntGyCfkSQFyZLlci4",
    authDomain: "dsp-y-zone.firebaseapp.com",
    projectId: "dsp-y-zone",
    storageBucket: "dsp-y-zone.firebasestorage.app",
    messagingSenderId: "228795312076",
    appId: "1:228795312076:web:7d67685a2724f3e0c55f69",
    measurementId: "G-4CH7CQGF81"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Collections references
const membersCollection = db.collection('members');
const schedulesCollection = db.collection('schedules');
const adminsCollection = db.collection('admins');
const attendanceCollection = db.collection('attendance');
const settingsCollection = db.collection('settings');

// Utility Functions
const Utils = {
    // Format date to display format
    formatDate: (date) => {
        if (!date) return 'N/A';
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    // Format time
    formatTime: (time) => {
        if (!time) return 'N/A';
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    },

    // Get initials from name
    getInitials: (name) => {
        if (!name) return 'U';
        const names = name.trim().split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[names.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    },

    // Calculate age from DOB
    calculateAge: (dob) => {
        if (!dob) return 'N/A';
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    },

    // Show toast notification
    showToast: (message, type = 'success') => {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.borderLeftColor = type === 'success' ? '#28a745' :
            type === 'error' ? '#dc3545' :
                type === 'warning' ? '#ffc107' : '#17a2b8';

        const icon = type === 'success' ? 'check-circle' :
            type === 'error' ? 'exclamation-circle' :
                type === 'warning' ? 'exclamation-triangle' : 'info-circle';

        toast.innerHTML = `
            <i class="fas fa-${icon}" style="color: ${toast.style.borderLeftColor}"></i>
            <span>${message}</span>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Hash password (simple hash for demo - in production use proper hashing)
    hashPassword: async (password) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    // Generate unique ID
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Generate sequential member ID (0001-9999)
    generateMemberId: async () => {
        try {
            const settingsDoc = await settingsCollection.doc('memberCounter').get();
            let nextId = 1;

            if (settingsDoc.exists) {
                nextId = (settingsDoc.data().lastId || 0) + 1;
            }

            if (nextId > 9999) {
                throw new Error('Maximum member ID reached (9999)');
            }

            // Update the counter
            await settingsCollection.doc('memberCounter').set({ lastId: nextId });

            // Format as 4-digit string
            return nextId.toString().padStart(4, '0');
        } catch (error) {
            console.error('Error generating member ID:', error);
            throw error;
        }
    },

    // Get today's date in YYYY-MM-DD format
    getTodayDate: () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }
};

// Export for use in other files
window.Utils = Utils;
window.db = db;
window.membersCollection = membersCollection;
window.schedulesCollection = schedulesCollection;
window.adminsCollection = adminsCollection;
window.attendanceCollection = attendanceCollection;
window.settingsCollection = settingsCollection;
