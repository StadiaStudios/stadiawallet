// --- Configuration for Tailwind CSS (moved from HTML head) ---
// This ensures the custom font family is available for Tailwind classes.
tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        }
    }
}

// --- CONFIGURATION AND UTILITIES ---

const LOCAL_STORAGE_KEY = 'cashTrackerTransactions';
const CASH_APP_SETTING_KEY = 'cashTrackerCashAppEnabled';
// NEW: Local Storage Key for Full Name
const FULL_NAME_SETTING_KEY = 'cashTrackerFullName';

const MAX_DISPLAY_TRANSACTIONS = 4;
// Access DOM elements
const appRoot = document.getElementById('app-root');
const modalContainer = document.getElementById('modal-container');

// Currency formatter
const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
});

// --- ICON IMPLEMENTATION (Replacing lucide-react) ---
// Generates the required SVG markup for each icon, ensuring they look perfect.
const getIconSVG = (name, size = 24, strokeWidth = 2, color = 'currentColor') => {
    let path = '';
    // Using standard Lucide paths
    switch (name) {
        case 'Plus':
            path = '<path d="M5 12h14" /><path d="M12 5v14" />';
            break;
        case 'X':
            path = '<path d="M18 6 6 18" /><path d="m6 6 12 12" />';
            break;
        case 'Trash2': // Used in list, size 16
            path = '<path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M10 11v6" /><path d="M14 11v6" />';
            break;
        case 'ArrowUpCircle': // Used in list, size 18
            path = '<circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4"/><path d="M12 16V8"/>';
            break;
        case 'ArrowDownCircle': // Used in list, size 18
            path = '<circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="m8 12 4 4 4-4"/>';
            break;
        case 'Loader': // Used for loading spinner
            path = '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>';
            break;
        case 'AlignJustify': // Used for 'View All', size 16
            path = '<line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/>';
            break;
        default:
            return '';
    }
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
            ${path}
        </svg>
    `;
};

// Settings Icon (Square PNG Placeholder)
const getSettingsIcon = () => {
    // Placeholder URL for a square PNG image of a gear/settings icon
    // Using a specific placeholder size (24x24) and setting it to dark gray
    const imageUrl = 'assets/settings.png';
    return `
        <img 
            src="${imageUrl}" 
            alt="Settings" 
            class="w-6 h-6 object-cover rounded-md" 
            onerror="this.onerror=null; this.src='assets/settings.png';"
        />
    `;
};

// --- STATE & INITIALIZATION ---

const AppState = {
    transactions: [],
    isModalOpen: false,
    isAllTransactionsModalOpen: false,
    isSettingsModalOpen: false,
    isLoading: true,
    isCashAppEnabled: false,
    // NEW: User Full Name
    fullName: '',
    isConfirmModalOpen: false,
    transactionToDeleteId: null,
    // Temporary state for the Add Transaction Modal
    addModalState: {
        amount: '',
        description: '',
        type: 'income',
        isCashApp: false,
    },
    // Temporary state for the Settings Modal (for input field)
    settingsModalState: {
        fullNameInput: ''
    }
};

/**
 * Loads transactions from localStorage.
 */
const getInitialTransactions = () => {
    try {
        const data = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (data) {
            const parsed = JSON.parse(data);
            const transactions = parsed.map(t => ({
                ...t,
                isCashApp: t.isCashApp === true,
                timestamp: new Date(t.timestamp),
                amount: parseFloat(t.amount || 0),
            }));
            transactions.sort((a, b) => b.timestamp - a.timestamp);
            return transactions;
        }
    } catch (error) {
        console.error("Error loading data from local storage:", error);
    }
    return [];
};

/**
 * Loads settings (Cash App toggle and Full Name) from localStorage.
 */
const getInitialSettings = () => {
    let settings = {};
    try {
        const cashApp = localStorage.getItem(CASH_APP_SETTING_KEY);
        settings.isCashAppEnabled = cashApp === 'true';
    } catch (error) {
        console.error("Error loading Cash App setting:", error);
        settings.isCashAppEnabled = false;
    }
    
    // NEW: Load Full Name
    try {
        const fullName = localStorage.getItem(FULL_NAME_SETTING_KEY);
        settings.fullName = fullName || '';
    } catch (error) {
        console.error("Error loading Full Name setting:", error);
        settings.fullName = '';
    }
    
    return settings;
};

/**
 * Saves transactions to localStorage.
 */
const saveTransactionsToLocalStorage = (transactions) => {
    try {
        const dataToSave = transactions.map(t => ({
            ...t,
            timestamp: t.timestamp.toISOString(),
        }));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
        console.error("Error saving data to local storage:", error);
    }
};

/**
 * Saves Cash App setting to localStorage.
 */
const saveCashAppSettingToLocalStorage = (isEnabled) => {
    try {
        localStorage.setItem(CASH_APP_SETTING_KEY, isEnabled ? 'true' : 'false');
    } catch (error) {
        console.error("Error saving Cash App setting:", error);
    }
};

/**
 * NEW: Saves Full Name setting to localStorage.
 */
const saveFullNameToLocalStorage = (fullName) => {
    try {
        localStorage.setItem(FULL_NAME_SETTING_KEY, fullName.trim());
    } catch (error) {
        console.error("Error saving Full Name setting:", error);
    }
};

// --- ACTIVITY IMPORT/EXPORT ---

// Download current transactions as a .txt file
const handleDownloadActivity = () => {
    try {
        const data = JSON.stringify(AppState.transactions, null, 2);
        const blob = new Blob([data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'wallet_activity.txt';
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting activity:', error);
    }
};

// Import transactions from a selected .txt file
const handleImportActivity = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            if (!Array.isArray(parsed)) throw new Error('Invalid file format');
            
            // Rebuild timestamps as Date objects
            const imported = parsed.map(t => ({
                ...t,
                timestamp: new Date(t.timestamp)
            }));
            
            // Merge with existing transactions
            const merged = [...imported, ...AppState.transactions];
            handleUpdateTransactions(merged);
            alert('Activity imported successfully!');
        } catch (error) {
            alert('Failed to import activity file. Please check the file format.');
            console.error(error);
        }
    };
    reader.readAsText(file);
};


// --- CORE LOGIC ---

/**
 * Calculates the total balances, including the new grand total.
 */
// app.js

/**
 * Calculates the total balances, including the new grand total.
 */
const calculateBalances = (transactions) => {
    let totalBalance = 0; // Cash
    let cashAppBalance = 0; // Card
    let totalIncome = 0; // NEW: Total Income

    transactions.forEach(t => {
        const amount = parseFloat(t.amount);
        const effect = t.type === 'income' ? amount : -amount;

        // NEW: Calculate total income
        if (t.type === 'income') {
            totalIncome += amount;
        }
        
        if (t.isCashApp) {
            cashAppBalance += effect;
        } else {
            totalBalance += effect;
        }
    });
    
    const grandTotalBalance = totalBalance + cashAppBalance; // New calculation
    
    // Return the new totalIncome along with balances
    return { totalBalance, cashAppBalance, grandTotalBalance, totalIncome };
};

/**
 * Updates state and triggers a re-render.
 * NOTE: This function must be globally accessible for HTML onclick handlers.
 */
const updateState = (newState) => {
    // Apply new state
    Object.assign(AppState, newState);

    // Re-render only the necessary components
    renderApp();
    renderModals();
};

/**
 * Renders only the modal currently open, but preserves cursor position on active inputs.
 * NOTE: This function must be globally accessible for HTML onclick handlers.
 */
const reRenderOnlyModal = () => {
    let activeElementId = null;
    let cursorPosition = null;

    // 1. --- PRE-RENDER: Save state for cursor position ---
    if (AppState.isModalOpen || AppState.isSettingsModalOpen) {
        const activeElement = document.activeElement;
        
        // Check if the focused element is one of the inputs we need to track
        if (activeElement && activeElement.id) {
            const trackableIds = ['modal-amount', 'modal-description', 'settings-full-name'];
            if (trackableIds.includes(activeElement.id)) {
                activeElementId = activeElement.id;
                // Save the current cursor position
                cursorPosition = activeElement.selectionStart;
            }
        }
    }

    // 2. --- RENDER: Rebuild the modal HTML (Destroys and recreates inputs) ---
    renderModals();

    // 3. --- POST-RENDER: Restore focus and cursor position ---
    // Use setTimeout(..., 0) to ensure the newly rendered HTML elements are fully in the DOM
    setTimeout(() => {
        if (activeElementId) {
            const newActiveElement = document.getElementById(activeElementId);
            if (newActiveElement) {
                // Restore focus to the newly created input
                newActiveElement.focus();
                
                // Restore cursor position
                if (cursorPosition !== null && newActiveElement.setSelectionRange) {
                    newActiveElement.setSelectionRange(cursorPosition, cursorPosition);
                }
            }
        }
    }, 0);
}

// --- ACTION HANDLERS ---

const handleUpdateTransactions = (updatedTransactions) => {
    updatedTransactions.sort((a, b) => b.timestamp - a.timestamp);
    saveTransactionsToLocalStorage(updatedTransactions);
    updateState({ transactions: updatedTransactions });
}

/**
 * Handles toggling the Cash App setting.
 * NOTE: This function must be globally accessible for HTML onclick handlers.
 */
const handleToggleCashAppSetting = () => {
    const newState = !AppState.isCashAppEnabled;
    saveCashAppSettingToLocalStorage(newState);
    updateState({ isCashAppEnabled: newState });
};

/**
 * NEW: Handles saving the full name.
 * NOTE: This function must be globally accessible for HTML onclick handlers.
 */
const handleSaveFullName = (e) => {
    e.preventDefault();
    const fullName = AppState.settingsModalState.fullNameInput.trim();
    saveFullNameToLocalStorage(fullName);
    
    // Update main state and close modal
    updateState({ 
        fullName: fullName,
        isSettingsModalOpen: false, // Close modal after saving
    });
};

const handleAddTransaction = () => {
    // Read state directly from the non-re-rendering inputs
    const amount = document.getElementById('modal-amount').value;
    const description = document.getElementById('modal-description').value;
    
    // Use current AppState for type and CashApp toggle status
    const { type, isCashApp } = AppState.addModalState;
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
        return console.error("Please enter a valid amount greater than zero.");
    }

    const newId = Date.now().toString();
    const transactionToAdd = {
        id: newId,
        timestamp: new Date(),
        amount: numAmount,
        type: type,
        description: description.trim(),
        isCashApp: AppState.isCashAppEnabled ? isCashApp : false,
    };

    const updatedTransactions = [transactionToAdd, ...AppState.transactions];
    
    // Reset modal state
    AppState.addModalState = { amount: '', description: '', type: 'income', isCashApp: false };

    handleUpdateTransactions(updatedTransactions);
    updateState({ isModalOpen: false });
};

// Refactored to initiate the custom confirmation modal
/**
 * Handles initiating the deletion confirmation flow.
 * NOTE: This function must be globally accessible for HTML onclick handlers.
 */
const handleDeleteTransaction = (id) => {
    updateState({
        transactionToDeleteId: id,
        isConfirmModalOpen: true
    });
};

// Function to execute the deletion
/**
 * Handles confirming and executing the transaction deletion.
 * NOTE: This function must be globally accessible for HTML onclick handlers.
 */
const handleConfirmDelete = () => {
    if (AppState.transactionToDeleteId) {
        const updatedTransactions = AppState.transactions.filter(t => t.id !== AppState.transactionToDeleteId);
        handleUpdateTransactions(updatedTransactions);

        // Close modal and reset state
        updateState({
            isConfirmModalOpen: false,
            transactionToDeleteId: null,
        });
    }
};

// Function to cancel the deletion
/**
 * Handles cancelling the transaction deletion.
 * NOTE: This function must be globally accessible for HTML onclick handlers.
 */
const handleCancelDelete = () => {
    updateState({
        isConfirmModalOpen: false,
        transactionToDeleteId: null,
    });
};

// --- RENDERING FUNCTIONS (DOM Manipulation) ---

/**
 * Renders the list of transactions.
 */
const renderTransactionList = (transactions, containerId, isFullList = false) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Add space-y-3 for card spacing if not already present (needed for the main list)
    if (container.id === 'transaction-list-container' && !container.classList.contains('space-y-3')) {
        container.classList.add('space-y-3');
    }


    if (transactions.length === 0) {
        container.innerHTML = `
            <p class="text-gray-500 text-center py-8">
                No transactions yet. Tap the '+' to get started!
            </p>
        `;
        return;
    }

    container.innerHTML = transactions.map(t => {
        const isIncome = t.type === 'income';
        const sign = isIncome ? '+' : '-';
        // Updated text colors for light mode
        const colorClass = isIncome ? 'text-green-600' : 'text-red-600';
        const iconBgClass = isIncome ? 'bg-green-500' : 'bg-red-500';
        const icon = isIncome ? getIconSVG('ArrowUpCircle', 18, 2, 'white') : getIconSVG('ArrowDownCircle', 18, 2, 'white');
        const description = t.description.trim() || "N/A";
        const dateString = t.timestamp.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

        return `
            <!-- Updated card background and shadow for light mode -->
            <div class="flex items-center justify-between p-3 bg-white rounded-xl shadow-md transition-all border border-gray-200">
                <div class="flex items-center space-x-3 min-w-0">
                    <div class="p-2 rounded-full flex-shrink-0 ${iconBgClass} text-white">
                        ${icon}
                    </div>
                    <div class="min-w-0">
                        <p class="font-semibold text-gray-800 text-base truncate">${description}</p>
                        <p class="text-xs text-gray-500 flex items-center space-x-2">
                            <span>${dateString}</span>
                            ${t.isCashApp ? 
                                // Updated Card badge style
                                `<span class="text-xs font-bold text-green-600 bg-gray-200 px-1.5 py-0.5 rounded-full">CARD</span>` : ''
                            }
                        </p>
                    </div>
                </div>
                <div class="flex items-center space-x-3 flex-shrink-0">
                    <p class="font-bold text-base sm:text-lg ${colorClass}">
                        ${sign}${formatter.format(t.amount)}
                    </p>
                    <button
                        onclick="handleDeleteTransaction('${t.id}')"
                        class="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                        title="Delete transaction"
                    >
                        <!-- Setting icon color explicitly for light mode contrast -->
                        ${getIconSVG('Trash2', 16, 2, 'rgb(156 163 175)')} 
                    </button>
                </div>
            </div>
        `;
    }).join('');
};

/**
 * Renders the Add Transaction Modal.
 */
const renderAddTransactionModal = () => {
    const { amount, description, type, isCashApp } = AppState.addModalState;
    const isIncome = type === 'income';
    const typeColor = isIncome ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700';

    modalContainer.innerHTML = `
        <!-- Updated modal content background for light mode -->
        <div id="add-modal" class="fixed inset-0 modal-bg flex justify-center items-end sm:items-center z-50 p-4">
            <div class="bg-white w-full max-w-md rounded-xl p-6 shadow-2xl">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-bold text-gray-800">New Transaction</h2>
                    <button onclick="updateState({ isModalOpen: false })" class="text-gray-500 hover:text-gray-800 transition-colors">
                        ${getIconSVG('X', 24, 2, 'currentColor')}
                    </button>
                </div>
                <form id="add-form" class="space-y-4">
                    <div class="flex space-x-4">
                        <button
                            type="button"
                            onclick="
                                AppState.addModalState.type = 'income'; 
                                reRenderOnlyModal();
                            "
                            class="flex-1 p-3 rounded-lg font-semibold transition-colors ${
                                isIncome 
                                    ? 'bg-green-500 text-white shadow-lg' 
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }"
                        >
                            Deposit
                        </button>
                        <button
                            type="button"
                            onclick="
                                AppState.addModalState.type = 'expense'; 
                                reRenderOnlyModal();
                            "
                            class="flex-1 p-3 rounded-lg font-semibold transition-colors ${
                                !isIncome 
                                    ? 'bg-red-500 text-white shadow-lg' 
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }"
                        >
                            Spend
                        </button>
                    </div>

                    ${AppState.isCashAppEnabled ? `
                        <!-- Updated switch background colors -->
                        <div class="flex items-center justify-between p-3 bg-gray-100 rounded-lg border border-gray-200">
                            <label class="text-gray-800 font-medium">Affects Card Balance</label>
                            <button
                                type="button"
                                onclick="
                                    AppState.addModalState.isCashApp = !AppState.addModalState.isCashApp;
                                    reRenderOnlyModal();
                                "
                                class="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${isCashApp ? 'bg-green-600' : 'bg-gray-400'}"
                            >
                                <span
                                    aria-hidden="true"
                                    class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${isCashApp ? 'translate-x-5' : 'translate-x-0'}"
                                ></span>
                            </button>
                        </div>
                    ` : ''}

                    <div>
                        <label for="modal-amount" class="block text-sm font-medium text-gray-600 mb-1">Amount ($)</label>
                        <!-- Updated input styles for light mode -->
                        <input
                            id="modal-amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            value="${amount}"
                            oninput="AppState.addModalState.amount = this.value"
                            class="w-full p-3 bg-white border border-gray-300 text-gray-800 rounded-lg focus:ring-green-500 focus:border-green-500 placeholder-gray-400 shadow-sm"
                            placeholder="100.00"
                        />
                    </div>
                    <div>
                        <label for="modal-description" class="block text-sm font-medium text-gray-600 mb-1">Description (Optional)</label>
                        <!-- Updated input styles for light mode -->
                        <input
                            id="modal-description"
                            type="text"
                            value="${description}"
                            oninput="AppState.addModalState.description = this.value"
                            class="w-full p-3 bg-white border border-gray-300 text-gray-800 rounded-lg focus:ring-green-500 focus:border-green-500 placeholder-gray-400 shadow-sm"
                            placeholder="Groceries, Paycheck, etc."
                        />
                    </div>
                    <button
                        type="submit"
                        class="w-full p-3 mt-6 text-white font-bold rounded-lg transition-all shadow-lg ${typeColor}"
                    >
                        Record ${isIncome ? 'Deposit' : 'Spending'}
                    </button>
                </form>
            </div>
        </div>
    `;
    // Attach submit handler separately
    document.getElementById('add-form').addEventListener('submit', (e) => {
        e.preventDefault();
        handleAddTransaction();
    });
    // Focus on the amount input automatically
    // NOTE: Cursor position restore logic is now handled in reRenderOnlyModal for better UX on input.
    if (!document.activeElement.id.startsWith('modal-')) {
        document.getElementById('modal-amount').focus();
    }
};

/**
 * Renders the All Transactions Modal (grouped by month).
 */
const renderAllTransactionsModal = () => {
    // Group transactions by Month and Year (similar logic to React useMemo)
    const groupedTransactions = AppState.transactions.reduce((groups, transaction) => {
        const date = transaction.timestamp;
        const monthYear = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });

        if (!groups[monthYear]) {
            groups[monthYear] = [];
        }
        groups[monthYear].push(transaction);
        return groups;
    }, {});

    const sortedMonths = Object.keys(groupedTransactions);
    sortedMonths.sort((a, b) => new Date(b) - new Date(a)); // Newest month first

    const content = sortedMonths.length === 0 ? `
        <p class="text-gray-500 text-center py-8">
            No transactions in history.
        </p>
    ` : sortedMonths.map(monthYear => `
        <div class="mb-8">
            <!-- Updated colors for sticky header -->
            <h4 class="text-lg font-extrabold text-gray-800 sticky top-0 bg-white py-3 z-10 border-b-2 border-green-500 mb-3 -mx-2 px-2">
                ${monthYear} Activity
            </h4>
            <!-- Space-y-3 added here for full history list card spacing -->
            <div id="list-${monthYear}" class="space-y-3"></div>
        </div>
    `).join('');

    modalContainer.innerHTML = `
        <!-- Updated modal content background for light mode -->
        <div id="all-tx-modal" class="fixed inset-0 modal-bg flex justify-center items-center z-50 p-4">
            <div class="bg-white w-full max-w-lg h-full sm:h-auto sm:max-h-[90vh] rounded-xl p-6 shadow-2xl flex flex-col">
                <div class="flex justify-between items-center mb-6 flex-shrink-0">
                    <h2 class="text-2xl font-bold text-gray-800">Full Activity History</h2>
                    <button onclick="updateState({ isAllTransactionsModalOpen: false })" class="text-gray-500 hover:text-gray-800 transition-colors">
                        ${getIconSVG('X', 28, 2, 'currentColor')}
                    </button>
                </div>
                <div id="all-tx-list-container" class="flex-grow overflow-y-auto pr-2">
                    ${content}
                </div>
            </div>
        </div>
    `;
    // Render individual lists after the modal structure is in place
    sortedMonths.forEach(monthYear => {
        renderTransactionList(groupedTransactions[monthYear], `list-${monthYear}`, true);
    });
};

/**
 * Renders the Settings Modal.
 */
const renderSettingsModal = () => {
    const isToggled = AppState.isCashAppEnabled;
    // Set initial input value when modal opens
    if (!AppState.isSettingsModalOpen) {
        AppState.settingsModalState.fullNameInput = AppState.fullName;
    }
    const currentFullName = AppState.settingsModalState.fullNameInput;

    modalContainer.innerHTML = `
        <!-- Updated modal content background for light mode -->
        <div id="settings-modal" class="fixed inset-0 modal-bg flex justify-center items-end sm:items-center z-50 p-4">
            <div class="bg-white w-full max-w-md rounded-xl p-6 shadow-2xl">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-bold text-gray-800">App Settings</h2>
                    <button onclick="updateState({ isSettingsModalOpen: false })" class="text-gray-500 hover:text-gray-800 transition-colors">
                        ${getIconSVG('X', 24, 2, 'currentColor')}
                    </button>
                </div>
                <div class="space-y-6 border-t border-gray-200 pt-4">

                    <!-- NEW: Full Name Input -->
                    <form id="full-name-form" class="space-y-2">
                        <div>
                            <label for="settings-full-name" class="block text-sm font-medium text-gray-600 mb-1">
                                Full Name
                            </label>
                            <input
                                id="settings-full-name"
                                type="text"
                                value="${currentFullName}"
                                oninput="AppState.settingsModalState.fullNameInput = this.value; reRenderOnlyModal();"
                                class="w-full p-3 bg-white border border-gray-300 text-gray-800 rounded-lg focus:ring-green-500 focus:border-green-500 placeholder-gray-400 shadow-sm"
                                placeholder="Enter your full name"
                            />
                        </div>
                        <button
                            type="submit"
                            class="w-full p-3 text-white font-bold rounded-lg transition-all shadow-lg bg-gray-600 hover:bg-gray-700 disabled:opacity-100"
                            ${currentFullName.trim() === AppState.fullName.trim() ? 'disabled' : ''}
                        >
                            Save Name
                        </button>
                    </form>

                    <!-- Download / Import Activity -->
<div class="border-t border-gray-200 pt-6">
    <h3 class="text-lg font-semibold text-gray-800 mb-3">Activity Backup</h3>
    <div class="space-y-3">
        <button
            onclick="handleDownloadActivity()"
            class="w-full p-3 text-white font-bold rounded-lg bg-gray-600 hover:bg-gray-700 shadow-md transition-all"
        >
            Download Activity
        </button>
        <label class="w-full block">
            <input
                type="file"
                accept=".txt"
                onchange="handleImportActivity(event)"
                class="hidden"
                id="import-file-input"
            />
            <span
                onclick="document.getElementById('import-file-input').click()"
                class="w-full inline-block text-center p-3 text-white font-bold rounded-lg bg-gray-600 hover:bg-gray-700 shadow-md transition-all cursor-pointer"
            >
                Import Activity
            </span>
        </label>
    </div>
    <p class="text-sm text-gray-500 mt-2">
        Download your transaction history as a backup, or import it later to restore.
    </p>
</div>

                    
                    <!-- Cash App Toggle Switch -->
                    <div class="border-t border-gray-200 pt-6">
                        <div class="flex items-center justify-between p-3 bg-gray-100 rounded-lg border border-gray-200">
                            <label class="text-gray-800 font-medium">Enable Card Balance Tracker</label>
                            <button
                                type="button"
                                onclick="handleToggleCashAppSetting()"
                                class="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${isToggled ? 'bg-green-600' : 'bg-gray-400'}"
                            >
                                <span
                                    aria-hidden="true"
                                    class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${isToggled ? 'translate-x-5' : 'translate-x-0'}"
                                ></span>
                            </button>
                        </div>
                        <p class="text-sm text-gray-500 mt-2">
                            When enabled, a separate <strong>Card Balance</strong> will be tracked and displayed on the Dashboard.
                        </p>
                    </div>
<br>
<span>V1.2.3 (Beta)</span>

                </div>
            </div>
        </div>
    `;
    
    // Attach submit handler for the name form
    document.getElementById('full-name-form').addEventListener('submit', handleSaveFullName);
};

/**
 * Renders the Confirmation Modal.
 */
const renderConfirmationModal = () => {
    modalContainer.innerHTML = `
        <!-- Updated modal content background for light mode -->
        <div class="fixed inset-0 modal-bg flex justify-center items-center z-50 p-4">
            <div class="bg-white w-full max-w-sm rounded-xl p-6 shadow-2xl">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Confirm Action</h3>
                <p class="text-gray-600 mb-6">Are you sure you want to permanently delete this transaction?</p>
                <div class="flex justify-end space-x-3">
                    <button
                        onclick="handleCancelDelete()"
                        class="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
                    >
                        Cancel
                    </button>
                    <button
                        onclick="handleConfirmDelete()"
                        class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold shadow-md"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `;
};

/**
 * Renders the main application structure and content.
 */
const renderApp = () => {
    const { totalBalance, cashAppBalance, grandTotalBalance } = calculateBalances(AppState.transactions);
    const { fullName } = AppState;

    // Limited recent transactions for main view
    const recentTransactions = AppState.transactions.slice(0, MAX_DISPLAY_TRANSACTIONS);

    const isTotalPositive = totalBalance >= 0;
    const isCashAppPositive = cashAppBalance >= 0;
    const isGrandTotalPositive = grandTotalBalance >= 0;

    // NEW: Logged in status text
    const loggedInText = fullName.trim() 
        ? `<p class="text-xs text-gray-500 text-left -mt-2 mb-2">Logged in as <strong>${fullName}</strong></p>`
        : `<p class="text-xs text-gray-500 text-left -mt-2 mb-2">Logged in as <strong>Guest</strong></p>`;


    const contentHTML = `
        <!-- Left Column (Balances & Header) - Takes full width on mobile/tablet, 1st column on desktop -->
        <div class="lg:col-span-1">
            <!-- Header - Full width, not contained by max-w-md on desktop now -->
            <header class="py-4 flex justify-between items-center lg:pt-0">
                <h1 class="text-3xl font-extrabold text-green-600 mb-2">
                    Wallet
                </h1>
                <button
                    onclick="updateState({ isSettingsModalOpen: true })"
                    class="p-2 text-gray-500 hover:text-green-600 transition-colors rounded-full"
                    title="Settings"
                >
                    <!-- Using the square PNG placeholder for settings icon -->
                    ${getSettingsIcon()}
                </button>
            </header>
            
            <!-- NEW: Logged In Status -->
            ${loggedInText}

            <!-- Updated text color for light mode -->
            <p class="text-sm text-gray-500 text-left lg:text-left mb-6">
                Private data stored in your browser.
            </p>

            <!-- Balance Cards Container -->
            <div class="space-y-4 mb-8">
                
           

                <!-- NEW: Grand Total Balance Card (Conditional Display) -->
                ${AppState.isCashAppEnabled ? `
                    <div class="bg-green-600 p-6 rounded-2xl shadow-xl border-b-4 border-green-500">
                        <p class="text-sm font-medium text-green-200 mb-2 uppercase tracking-widest">
                            Total Balance (Cash + Card)
                        </p>
                        <h2 class="text-5xl font-extrabold break-all text-white">
                            ${formatter.format(grandTotalBalance)}
                        </h2>
                        <p class="mt-2 text-sm font-semibold text-white">
                            ${isGrandTotalPositive ? '' : 'Warning: Total Negative'}
                        </p>
                    </div>
                ` : ''}

                 <div class="bg-[white] p-6 rounded-2xl shadow-xl border border-blue-200 border-b-4 border-blue-500">
              <p class="text-sm font-medium text-gray-500 mb-2 uppercase tracking-widest">
              <span class="text-lg font-extrabold text-blue-600">NETWORTH</span>
                       
              </p>
                  <h2 class="text-4xl font-extrabold break-all text-gray-800">
                       ${formatter.format(calculateBalances(AppState.transactions).totalIncome)}
                     </h2>
                
                     </div>

                <!-- Cash Balance Card (Non-Card) -->
                <!-- Updated card background for light mode -->
                <div class="bg-white p-6 rounded-2xl shadow-xl transition-all duration-500 border border-gray-200 ${isTotalPositive ? 'border-b-4 border-green-500' : 'border-b-4 border-red-500'}">
                    <p class="text-sm font-medium text-gray-500 mb-2 uppercase tracking-widest">
                        Cash Balance
                    </p>
                    <h2 class="text-5xl font-extrabold break-all text-gray-800">
                        ${formatter.format(totalBalance)}
                    </h2>
                    <p class="mt-2 text-sm font-semibold ${isTotalPositive ? 'text-green-600' : 'text-red-600'}">
                        ${isTotalPositive ? 'In the Green' : 'In the Red'}
                    </p>
                </div>

                <!-- Card Balance Card (Conditional Display) -->
                <!-- Updated card background for light mode -->
                ${AppState.isCashAppEnabled ? `
                    <div class="bg-white p-6 rounded-2xl shadow-xl transition-all duration-500 border border-gray-200 ${isCashAppPositive ? 'border-b-4 border-green-500' : 'border-b-4 border-red-500'}">
                        <p class="text-sm font-medium text-gray-500 mb-2 uppercase tracking-widest flex items-center space-x-2">
                            <span class="text-lg font-extrabold text-green-600">CARD</span>
                            <span>Balance</span>
                        </p>
                        <h2 class="text-4xl font-extrabold break-all text-gray-700">
                            ${formatter.format(cashAppBalance)}
                        </h2>
                    </div>
                ` : ''}
            </div>
        </div>

        <!-- Right Column (Activity List) - Takes full width on mobile/tablet, 2nd column on desktop -->
        <div class="lg:col-span-1 lg:mt-[5.75rem]"> <!-- Added margin top to align list title with balances on desktop -->
            <!-- Transaction History Section -->
            <!-- Updated border color and text color -->
            <div class="flex justify-between items-center mb-4 border-b border-gray-300 pb-2">
                <h3 class="text-xl font-bold text-gray-800">
                    Recent Activity
                </h3>
                ${AppState.transactions.length > MAX_DISPLAY_TRANSACTIONS ? `
                    <button
                        onclick="updateState({ isAllTransactionsModalOpen: true })"
                        class="flex items-center space-x-1 text-sm font-semibold text-green-600 hover:text-green-500 transition-colors"
                    >
                        <!-- Setting icon color explicitly for light mode contrast -->
                        ${getIconSVG('AlignJustify', 16, 2, 'currentColor')} 
                        <span>View All (${AppState.transactions.length})</span>
                    </button>
                ` : ''}
            </div>

            <div id="transaction-list-container" class="lg:max-h-[70vh] lg:overflow-y-auto lg:pr-2">
                ${AppState.isLoading ? `
                    <div class="flex justify-center items-center h-40">
                        <!-- Setting icon color explicitly for light mode contrast -->
                        ${getIconSVG('Loader', 32, 3, 'rgb(59 130 246)')} 
                    </div>
                ` : ''}
            </div>
        </div>

        <!-- Floating Action Button (FAB) -->
        <button
            onclick="updateState({ isModalOpen: true })"
            class="fixed bottom-6 right-6 p-4 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-all active:scale-95 transform z-40"
            title="Add new transaction"
        >
            ${getIconSVG('Plus', 28, 3, 'white')}
        </button>
    `;

    appRoot.innerHTML = contentHTML;

    // Only render list after loading is complete
    if (!AppState.isLoading) {
        renderTransactionList(recentTransactions, 'transaction-list-container');
    }
};

/**
 * Renders the currently open modal.
 */
const renderModals = () => {
    modalContainer.innerHTML = '';
    if (AppState.isModalOpen) {
        renderAddTransactionModal();
    } else if (AppState.isAllTransactionsModalOpen) {
        renderAllTransactionsModal();
    } else if (AppState.isSettingsModalOpen) {
        renderSettingsModal();
    } else if (AppState.isConfirmModalOpen) {
        renderConfirmationModal();
    }
};

// --- INITIALIZATION ---
window.onload = () => {
    // Load data asynchronously (simulating a slight delay)
    setTimeout(() => {
        const loadedSettings = getInitialSettings();
        const loadedTransactions = getInitialTransactions();
        
        // Initialize the temporary settings state with the loaded name
        AppState.settingsModalState.fullNameInput = loadedSettings.fullName;
        
        updateState({
            transactions: loadedTransactions,
            isCashAppEnabled: loadedSettings.isCashAppEnabled,
            // NEW: Set initial fullName state
            fullName: loadedSettings.fullName,
            isLoading: false
        });
    }, 300);
    
    // Initial render while loading
    renderApp();
};

// --- Global Export for HTML 'onclick' Attributes ---
// These functions must be explicitly attached to the window object 
// for the inline HTML onclick attributes to work when the script is external.
window.updateState = updateState;
window.reRenderOnlyModal = reRenderOnlyModal;
window.handleToggleCashAppSetting = handleToggleCashAppSetting;
window.handleSaveFullName = handleSaveFullName; // NEW: Export handler
window.handleDownloadActivity = handleDownloadActivity;
window.handleImportActivity = handleImportActivity;
window.handleDeleteTransaction = handleDeleteTransaction;
window.handleConfirmDelete = handleConfirmDelete;
window.handleCancelDelete = handleCancelDelete;
