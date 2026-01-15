// Dashboard Module
document.addEventListener('DOMContentLoaded', () => {
    // Load dashboard data
    loadDashboardStats();
    loadRecentMembers();

    // Check for action parameter
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');

    if (action === 'add') {
        // Open add member modal if action is add
        window.location.href = 'members.html?action=add';
    }
});

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        // Get total members
        const membersSnapshot = await membersCollection.get();
        const totalMembers = membersSnapshot.size;
        document.getElementById('totalMembers').textContent = totalMembers;

        // Get active members
        const activeMembersSnapshot = await membersCollection.where('status', '==', 'active').get();
        const activeMembers = activeMembersSnapshot.size;
        document.getElementById('activeMembers').textContent = activeMembers;

        // Get today's schedules
        const today = new Date().toISOString().split('T')[0];
        const schedulesSnapshot = await schedulesCollection.where('date', '==', today).get();
        const todaySchedules = schedulesSnapshot.size;
        document.getElementById('todaySchedules').textContent = todaySchedules;

        // Get total admins
        const adminsSnapshot = await adminsCollection.get();
        const totalAdmins = adminsSnapshot.size;
        document.getElementById('totalAdmins').textContent = totalAdmins;

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        Utils.showToast('Error loading statistics', 'error');
    }
}

// Load recent members
async function loadRecentMembers() {
    const tbody = document.getElementById('recentMembersBody');

    try {
        const snapshot = await membersCollection
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        if (snapshot.empty) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">
                        <div class="empty-state" style="padding: 30px;">
                            <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 10px;"></i>
                            <p>No members yet</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const member = doc.data();
            const row = document.createElement('tr');

            const joinDate = member.createdAt ?
                Utils.formatDate(member.createdAt.toDate()) : 'N/A';

            row.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="user-avatar" style="width: 35px; height: 35px; font-size: 0.8rem;">
                            ${Utils.getInitials(member.fullName)}
                        </div>
                        ${member.fullName}
                    </div>
                </td>
                <td>${member.phone}</td>
                <td>${joinDate}</td>
                <td><span class="badge badge-${member.status === 'active' ? 'active' : 'inactive'}">${member.status}</span></td>
            `;
            tbody.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading recent members:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center" style="color: var(--danger);">
                    Error loading members
                </td>
            </tr>
        `;
    }
}
