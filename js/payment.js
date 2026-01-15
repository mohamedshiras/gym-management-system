// Payment Module
let allMembers = [];
let allPayments = [];
let currentMemberId = null;
let currentFilter = 'all';
let currentMonth = '';

// Initialize payments collection
const paymentsCollection = db.collection('payments');

document.addEventListener('DOMContentLoaded', () => {
    // Set current month
    const now = new Date();
    currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('monthSelect').value = currentMonth;
    document.getElementById('paymentDate').value = now.toISOString().split('T')[0];

    // Load data
    loadPaymentsData();

    // Setup event listeners
    setupPaymentEventListeners();
});

// Setup event listeners
function setupPaymentEventListeners() {
    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            renderPaymentsTable();
        });
    });

    // Month filter
    document.getElementById('filterBtn').addEventListener('click', () => {
        currentMonth = document.getElementById('monthSelect').value;
        loadPaymentsData();
    });

    // Search functionality
    document.getElementById('searchInput').addEventListener('input', (e) => {
        renderPaymentsTable(e.target.value);
    });

    // Modal controls
    document.getElementById('closeModal').addEventListener('click', closePaymentModal);
    document.getElementById('cancelBtn').addEventListener('click', closePaymentModal);
    document.getElementById('savePaymentBtn').addEventListener('click', savePayment);

    document.getElementById('closeHistoryModal').addEventListener('click', closeHistoryModal);
    document.getElementById('closeHistoryBtn').addEventListener('click', closeHistoryModal);

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });
}

// Load payments data
async function loadPaymentsData() {
    try {
        // Load members
        const membersSnapshot = await membersCollection.where('status', '==', 'active').get();
        allMembers = [];
        membersSnapshot.forEach(doc => {
            allMembers.push({ id: doc.id, ...doc.data() });
        });

        // Load payments for current month
        const paymentsSnapshot = await paymentsCollection.where('month', '==', currentMonth).get();
        allPayments = [];
        paymentsSnapshot.forEach(doc => {
            allPayments.push({ id: doc.id, ...doc.data() });
        });

        updateStats();
        renderPaymentsTable();
    } catch (error) {
        console.error('Error loading payments data:', error);
        Utils.showToast('Error loading data. Please refresh.', 'error');
    }
}

// Update payment statistics
function updateStats() {
    let totalExpected = 0;
    let totalCollected = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    const now = new Date();
    const [year, month] = currentMonth.split('-').map(Number);
    const isCurrentMonth = now.getFullYear() === year && (now.getMonth() + 1) === month;
    const isPastMonth = new Date(year, month - 1, 1) < new Date(now.getFullYear(), now.getMonth(), 1);

    allMembers.forEach(member => {
        const monthlyFee = member.monthlyPayment || (member.trainingType === 'weight-cardio' ? 2750 : 1750);
        totalExpected += monthlyFee;

        const payment = allPayments.find(p => p.memberId === member.id);
        if (payment) {
            totalCollected += payment.amount;
        } else {
            pendingCount++;
            if (isPastMonth || (isCurrentMonth && now.getDate() > 10)) {
                overdueCount++;
            }
        }
    });

    document.getElementById('totalExpectedRevenue').textContent = `Rs ${totalExpected.toLocaleString()}`;
    document.getElementById('totalCollected').textContent = `Rs ${totalCollected.toLocaleString()}`;
    document.getElementById('totalPending').textContent = `Rs ${(totalExpected - totalCollected).toLocaleString()}`;
    document.getElementById('overdueCount').textContent = overdueCount;
}

// Render payments table
function renderPaymentsTable(searchTerm = '') {
    const tbody = document.getElementById('paymentsTableBody');

    const now = new Date();
    const [year, month] = currentMonth.split('-').map(Number);
    const isCurrentMonth = now.getFullYear() === year && (now.getMonth() + 1) === month;
    const isPastMonth = new Date(year, month - 1, 1) < new Date(now.getFullYear(), now.getMonth(), 1);

    let filteredMembers = allMembers.filter(member => {
        const payment = allPayments.find(p => p.memberId === member.id);
        const isPaid = !!payment;
        const isOverdue = !isPaid && (isPastMonth || (isCurrentMonth && now.getDate() > 10));

        // Apply filter
        if (currentFilter === 'paid' && !isPaid) return false;
        if (currentFilter === 'pending' && isPaid) return false;
        if (currentFilter === 'overdue' && !isOverdue) return false;

        // Apply search
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            const memberId = (member.memberId || member.id || '').toLowerCase();
            return member.fullName.toLowerCase().includes(search) ||
                member.phone.includes(search) ||
                memberId.includes(search);
        }
        return true;
    });

    if (filteredMembers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fas fa-credit-card"></i>
                        <h3>No Members Found</h3>
                        <p>No members match the current filter</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    filteredMembers.forEach(member => {
        const payment = allPayments.find(p => p.memberId === member.id);
        const monthlyFee = member.monthlyPayment || (member.trainingType === 'weight-cardio' ? 2750 : 1750);
        const paidAmount = payment ? payment.amount : 0;
        const remainingBalance = monthlyFee - paidAmount;
        const isFullyPaid = paidAmount >= monthlyFee;
        const isPartiallyPaid = paidAmount > 0 && paidAmount < monthlyFee;
        const isOverdue = !isFullyPaid && (isPastMonth || (isCurrentMonth && now.getDate() > 10));

        let statusBadge = '';
        if (isFullyPaid) {
            statusBadge = '<span class="payment-badge paid">Paid</span>';
        } else if (isPartiallyPaid) {
            statusBadge = `<span class="payment-badge partial">Rs ${remainingBalance.toLocaleString()} Due</span>`;
        } else if (isOverdue) {
            statusBadge = '<span class="payment-badge overdue">Overdue</span>';
        } else {
            statusBadge = '<span class="payment-badge pending">Pending</span>';
        }

        const trainingTypeBadge = member.trainingType === 'weight-cardio'
            ? '<span class="training-type-badge cardio">Weight + Cardio</span>'
            : '<span class="training-type-badge weight">Weight Training</span>';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong style="color: var(--luminous-yellow);">#${member.memberId || member.id}</strong></td>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="user-avatar" style="width: 40px; height: 40px; font-size: 0.9rem;">
                        ${Utils.getInitials(member.fullName)}
                    </div>
                    <div>
                        <div style="font-weight: 500;">${member.fullName}</div>
                        <div style="font-size: 0.8rem; color: #888;">${member.phone}</div>
                    </div>
                </div>
            </td>
            <td>${trainingTypeBadge}</td>
            <td style="font-weight: 600;">Rs ${monthlyFee.toLocaleString()}${isPartiallyPaid ? `<div style="font-size: 0.75rem; color: #28a745;">Paid: Rs ${paidAmount.toLocaleString()}</div>` : ''}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="actions">
                    ${!isFullyPaid ? `
                        <button class="btn btn-primary btn-sm" onclick="openPaymentModal('${member.id}')" title="Record Payment">
                            <i class="fas fa-money-bill-wave"></i>
                        </button>
                    ` : `
                        <button class="btn btn-secondary btn-sm" disabled title="Fully Paid">
                            <i class="fas fa-check"></i>
                        </button>
                    `}
                    <button class="btn btn-secondary btn-sm" onclick="viewPaymentHistory('${member.id}')" title="View History">
                        <i class="fas fa-history"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Open payment modal
function openPaymentModal(memberId) {
    currentMemberId = memberId;
    const member = allMembers.find(m => m.id === memberId);

    if (!member) {
        Utils.showToast('Member not found', 'error');
        return;
    }

    const monthlyFee = member.monthlyPayment || (member.trainingType === 'weight-cardio' ? 2750 : 1750);
    const [year, month] = currentMonth.split('-');
    const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Check for existing partial payment
    const existingPayment = allPayments.find(p => p.memberId === memberId);
    const paidAmount = existingPayment ? existingPayment.amount : 0;
    const remainingBalance = monthlyFee - paidAmount;

    let paymentInfoHtml = `
        <div style="background: var(--medium-gray); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                <div class="user-avatar" style="width: 50px; height: 50px;">
                    ${Utils.getInitials(member.fullName)}
                </div>
                <div>
                    <h4 style="margin: 0;">${member.fullName}</h4>
                    <span style="color: var(--luminous-yellow);">#${member.memberId || member.id}</span>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
                <div>
                    <span style="color: #888;">Training Type:</span>
                    <strong>${member.trainingType === 'weight-cardio' ? 'Weight + Cardio' : 'Weight Training'}</strong>
                </div>
                <div>
                    <span style="color: #888;">Monthly Fee:</span>
                    <strong style="color: var(--luminous-yellow);">Rs ${monthlyFee.toLocaleString()}</strong>
                </div>
                <div style="grid-column: span 2;">
                    <span style="color: #888;">Payment For:</span>
                    <strong>${monthName}</strong>
                </div>
    `;

    if (paidAmount > 0) {
        paymentInfoHtml += `
                <div>
                    <span style="color: #888;">Already Paid:</span>
                    <strong style="color: #28a745;">Rs ${paidAmount.toLocaleString()}</strong>
                </div>
                <div>
                    <span style="color: #888;">Remaining Balance:</span>
                    <strong style="color: #ff9800;">Rs ${remainingBalance.toLocaleString()}</strong>
                </div>
        `;
    }

    paymentInfoHtml += `
            </div>
        </div>
    `;

    document.getElementById('memberPaymentInfo').innerHTML = paymentInfoHtml;

    document.getElementById('paymentMemberId').value = memberId;
    document.getElementById('paymentMonth').value = currentMonth;
    document.getElementById('paymentAmount').value = remainingBalance > 0 ? remainingBalance : monthlyFee;
    document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('paymentMethod').value = 'cash';
    document.getElementById('paymentNote').value = '';

    document.getElementById('paymentModal').classList.add('active');
}

// Close payment modal
function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
    currentMemberId = null;
}

// Save payment
async function savePayment() {
    const form = document.getElementById('paymentForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const saveBtn = document.getElementById('savePaymentBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';

    const memberId = document.getElementById('paymentMemberId').value;
    const paymentMonth = document.getElementById('paymentMonth').value;
    const newAmount = parseFloat(document.getElementById('paymentAmount').value);

    try {
        // Check if payment already exists for this month
        const existingPaymentSnapshot = await paymentsCollection
            .where('memberId', '==', memberId)
            .where('month', '==', paymentMonth)
            .get();

        if (!existingPaymentSnapshot.empty) {
            // Update existing payment by adding to the amount
            const existingDoc = existingPaymentSnapshot.docs[0];
            const existingData = existingDoc.data();
            const updatedAmount = existingData.amount + newAmount;

            await paymentsCollection.doc(existingDoc.id).update({
                amount: updatedAmount,
                paymentDate: document.getElementById('paymentDate').value,
                paymentMethod: document.getElementById('paymentMethod').value,
                note: existingData.note
                    ? `${existingData.note} | Additional: Rs ${newAmount.toLocaleString()} - ${document.getElementById('paymentNote').value.trim() || 'No note'}`
                    : document.getElementById('paymentNote').value.trim() || null,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            Utils.showToast(`Payment updated! Total paid: Rs ${updatedAmount.toLocaleString()}`, 'success');
        } else {
            // Create new payment record
            const paymentData = {
                memberId: memberId,
                month: paymentMonth,
                amount: newAmount,
                paymentDate: document.getElementById('paymentDate').value,
                paymentMethod: document.getElementById('paymentMethod').value,
                note: document.getElementById('paymentNote').value.trim() || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await paymentsCollection.add(paymentData);
            Utils.showToast('Payment recorded successfully!', 'success');
        }

        closePaymentModal();
        loadPaymentsData();
    } catch (error) {
        console.error('Error saving payment:', error);
        Utils.showToast('Error recording payment. Please try again.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Record Payment';
    }
}

// View payment history
async function viewPaymentHistory(memberId) {
    const member = allMembers.find(m => m.id === memberId);

    if (!member) {
        Utils.showToast('Member not found', 'error');
        return;
    }

    try {
        // Fetch payments without orderBy to avoid requiring composite index
        const paymentsSnapshot = await paymentsCollection
            .where('memberId', '==', memberId)
            .get();

        // Sort payments by month in descending order in JavaScript
        let payments = [];
        paymentsSnapshot.forEach(doc => {
            payments.push({ id: doc.id, ...doc.data() });
        });
        payments.sort((a, b) => b.month.localeCompare(a.month));

        // Limit to last 12 payments
        payments = payments.slice(0, 12);

        let historyHtml = `
            <div style="background: var(--medium-gray); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="user-avatar" style="width: 50px; height: 50px;">
                        ${Utils.getInitials(member.fullName)}
                    </div>
                    <div>
                        <h4 style="margin: 0;">${member.fullName}</h4>
                        <span style="color: var(--luminous-yellow);">#${member.memberId || member.id}</span>
                    </div>
                </div>
            </div>
        `;

        if (payments.length === 0) {
            historyHtml += `
                <div class="empty-state" style="padding: 40px;">
                    <i class="fas fa-history"></i>
                    <h3>No Payment History</h3>
                    <p>No payments have been recorded for this member yet.</p>
                </div>
            `;
        } else {
            historyHtml += '<div style="max-height: 400px; overflow-y: auto;">';
            payments.forEach(payment => {
                const [year, month] = payment.month.split('-');
                const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

                historyHtml += `
                    <div style="background: var(--dark-gray); padding: 15px; border-radius: 10px; margin-bottom: 10px; border: 1px solid var(--light-gray);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${monthName}</strong>
                                <div style="color: #888; font-size: 0.85rem;">Paid on ${Utils.formatDate(payment.paymentDate)}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 1.2rem; font-weight: 700; color: #28a745;">Rs ${payment.amount.toLocaleString()}</div>
                                <span style="background: rgba(40, 167, 69, 0.2); color: #28a745; padding: 3px 10px; border-radius: 5px; font-size: 0.75rem;">
                                    ${payment.paymentMethod.toUpperCase()}
                                </span>
                            </div>
                        </div>
                        ${payment.note ? `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--light-gray); color: #888; font-size: 0.85rem;"><i class="fas fa-sticky-note" style="margin-right: 5px;"></i>${payment.note}</div>` : ''}
                    </div>
                `;
            });
            historyHtml += '</div>';
        }

        document.getElementById('paymentHistoryContent').innerHTML = historyHtml;
        document.getElementById('historyModal').classList.add('active');
    } catch (error) {
        console.error('Error loading payment history:', error);
        Utils.showToast('Error loading payment history.', 'error');
    }
}

// Close history modal
function closeHistoryModal() {
    document.getElementById('historyModal').classList.remove('active');
}

// Make functions globally available
window.openPaymentModal = openPaymentModal;
window.viewPaymentHistory = viewPaymentHistory;
