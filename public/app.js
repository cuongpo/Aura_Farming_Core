// Telegram Web App initialization
let tg = window.Telegram.WebApp;
let user = tg.initDataUnsafe?.user;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Configure Telegram Web App
    tg.ready();
    tg.expand();
    
    // Set theme colors
    document.body.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
    document.body.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
    document.body.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
    document.body.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#007AFF');
    document.body.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
    document.body.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f8f9fa');
    document.body.style.setProperty('--tg-theme-section-separator-color', tg.themeParams.section_separator_color || '#e5e5e5');
    
    // Load user data and wallet info
    loadUserInfo();
    loadWalletData();
    loadQuestData();

    // Initialize tabs after a short delay to ensure DOM is ready
    setTimeout(() => {
        initializeTabs();
    }, 100);

    // Initialize tabs
    initializeTabs();
});

// Load user information
function loadUserInfo() {
    if (user) {
        // Set user avatar (first letter of first name)
        const avatar = document.getElementById('userAvatar');
        avatar.textContent = user.first_name ? user.first_name.charAt(0).toUpperCase() : '👤';
        
        // Set user name
        const userName = document.getElementById('userName');
        userName.textContent = user.first_name + (user.last_name ? ' ' + user.last_name : '');
        
        // Set user handle
        const userHandle = document.getElementById('userHandle');
        userHandle.textContent = user.username ? '@' + user.username : `User ${user.id}`;
    } else {
        // Fallback for testing outside Telegram
        document.getElementById('userName').textContent = 'Test User';
        document.getElementById('userHandle').textContent = '@testuser';
    }
}

// Load wallet data from the bot API
async function loadWalletData() {
    try {
        showLoading(true);
        
        // Get user ID for API call
        const userId = user?.id || '1354543512'; // Fallback to your admin ID for testing
        
        // Call bot API to get wallet info
        const response = await fetch(`/api/wallet/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': tg.initData || ''
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load wallet data');
        }
        
        const walletData = await response.json();
        
        // Update UI with wallet data
        document.getElementById('walletAddress').textContent = walletData.address;
        document.getElementById('ethBalance').textContent = `${walletData.ethBalance} ETH`;
        document.getElementById('usdtBalance').textContent = `${walletData.usdtBalance} mUSDT`;
        
    } catch (error) {
        console.error('Error loading wallet data:', error);
        showError('Failed to load wallet data. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Copy wallet address to clipboard
async function copyAddress() {
    const address = document.getElementById('walletAddress').textContent;
    
    try {
        await navigator.clipboard.writeText(address);
        
        // Show feedback
        const copyBtn = document.querySelector('.copy-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        copyBtn.style.background = '#2ed573';
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = 'var(--tg-theme-button-color, #007AFF)';
        }, 2000);
        
        // Haptic feedback
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
        
    } catch (error) {
        console.error('Failed to copy address:', error);
        showError('Failed to copy address');
    }
}

// Send transfer
async function sendTransfer() {
    const token = document.getElementById('tokenSelect').value;
    const toAddress = document.getElementById('toAddress').value.trim();
    const amount = document.getElementById('amount').value.trim();
    const message = document.getElementById('message').value.trim();
    
    // Validation
    if (!toAddress) {
        showError('Please enter a recipient address');
        return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
        showError('Please enter a valid amount');
        return;
    }
    
    // Basic address validation
    if (!toAddress.startsWith('0x') || toAddress.length !== 42) {
        showError('Please enter a valid Ethereum address');
        return;
    }
    
    try {
        showLoading(true);
        hideMessages();
        
        const userId = user?.id || '1354543512'; // Fallback to your admin ID for testing
        
        // Call bot API to execute transfer
        const response = await fetch('/api/transfer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': tg.initData || ''
            },
            body: JSON.stringify({
                userId: userId,
                token: token,
                toAddress: toAddress,
                amount: amount,
                message: message
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(`Transfer successful! Transaction: ${result.txHash}`);
            
            // Clear form
            document.getElementById('toAddress').value = '';
            document.getElementById('amount').value = '';
            document.getElementById('message').value = '';
            
            // Reload wallet data
            setTimeout(() => {
                loadWalletData();
            }, 2000);
            
            // Haptic feedback
            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('success');
            }
            
        } else {
            showError(result.error || 'Transfer failed');
            
            // Haptic feedback
            if (tg.HapticFeedback) {
                tg.HapticFeedback.notificationOccurred('error');
            }
        }
        
    } catch (error) {
        console.error('Transfer error:', error);
        showError('Transfer failed. Please try again.');
        
        // Haptic feedback
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('error');
        }
    } finally {
        showLoading(false);
    }
}

// Utility functions
function showLoading(show) {
    const loading = document.getElementById('loadingIndicator');
    const transferBtn = document.getElementById('transferBtn');
    
    if (show) {
        loading.style.display = 'block';
        transferBtn.disabled = true;
    } else {
        loading.style.display = 'none';
        transferBtn.disabled = false;
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 5000);
}

function hideMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}

// Handle back button
tg.onEvent('backButtonClicked', function() {
    tg.close();
});

// Show back button
tg.BackButton.show();

// Initialize tabs
function initializeTabs() {
    console.log('Initializing tabs...');

    // Ensure only wallet tab is active initially
    const tabContents = document.querySelectorAll('.tab-content');
    const tabButtons = document.querySelectorAll('.tab-button');

    tabContents.forEach(content => content.classList.remove('active'));
    tabButtons.forEach(button => button.classList.remove('active'));

    // Activate wallet tab
    const walletTab = document.getElementById('wallet-tab');
    const walletButton = document.querySelector('.tab-button[onclick*="wallet"]');

    if (walletTab) {
        walletTab.classList.add('active');
        console.log('Wallet tab activated');
    }

    if (walletButton) {
        walletButton.classList.add('active');
        console.log('Wallet button activated');
    }
}

// Tab navigation functions
function showTab(tabName) {
    console.log('Switching to tab:', tabName);

    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
        console.log('Hiding tab:', content.id);
    });

    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));

    // Show selected tab content
    const targetTab = document.getElementById(tabName + '-tab');
    if (targetTab) {
        targetTab.classList.add('active');
        console.log('Showing tab:', targetTab.id);
    } else {
        console.error('Tab not found:', tabName + '-tab');
    }

    // Add active class to clicked tab button
    if (event && event.target) {
        event.target.classList.add('active');
    }

    // Load quest data when quest tab is opened
    if (tabName === 'quest') {
        loadQuestData();
    }
}

// Load quest data
async function loadQuestData() {
    try {
        const userId = user?.id || '1354543512';

        // Get quest status
        const response = await fetch(`/api/quest/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': tg.initData || ''
            }
        });

        if (response.ok) {
            const questData = await response.json();
            updateQuestUI(questData);
        } else {
            console.error('Failed to load quest data');
        }
    } catch (error) {
        console.error('Error loading quest data:', error);
    }
}

// Update quest UI with data
function updateQuestUI(questData) {
    // Update quest status
    const questStatus = document.getElementById('questStatus');
    const questProgress = document.getElementById('questProgress');

    if (questData.quest.completed) {
        questStatus.textContent = '✅ Completed';
        questStatus.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
    } else {
        questStatus.textContent = '⏳ In Progress';
        questStatus.style.background = 'linear-gradient(135deg, #ffc107, #fd7e14)';
    }

    questProgress.textContent = `Messages today: ${questData.messageCount}`;

    // Update chest status
    const chestIcon = document.getElementById('chestIcon');
    const chestTitle = document.getElementById('chestTitle');
    const chestDescription = document.getElementById('chestDescription');
    const chestButton = document.getElementById('chestButton');

    if (questData.chest.opened) {
        chestIcon.textContent = '📦';
        chestTitle.textContent = 'Chest Opened';
        chestDescription.textContent = `Reward: ${questData.chest.reward_amount} AURA`;
        chestButton.textContent = 'Already Opened';
        chestButton.disabled = true;
    } else if (questData.chest.eligible) {
        chestIcon.textContent = '🎁';
        chestTitle.textContent = 'Chest Available';
        chestDescription.textContent = 'Open to get 0-5 AURA tokens';
        chestButton.textContent = 'Open Chest';
        chestButton.disabled = false;
    } else {
        chestIcon.textContent = '🔒';
        chestTitle.textContent = 'Chest Locked';
        chestDescription.textContent = 'Complete daily quest to unlock';
        chestButton.textContent = 'Locked';
        chestButton.disabled = true;
    }

    // Show claim button if there are unclaimed rewards
    const claimButton = document.getElementById('claimButton');
    if (questData.chest.opened && questData.chest.reward_amount > 0 && !questData.chest.transaction_hash) {
        claimButton.style.display = 'block';
    } else {
        claimButton.style.display = 'none';
    }

    // Load AURA balance
    loadAuraBalance();

    // Load quest history
    loadQuestHistory();
}

// Load AURA balance
async function loadAuraBalance() {
    try {
        const userId = user?.id || '1354543512';

        const response = await fetch(`/api/aura-balance/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': tg.initData || ''
            }
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('auraBalance').textContent = `${data.balance} AURA`;
        }
    } catch (error) {
        console.error('Error loading AURA balance:', error);
    }
}

// Open chest function
async function openChest() {
    try {
        const userId = user?.id || '1354543512';

        // Show loading state
        const chestButton = document.getElementById('chestButton');
        const originalText = chestButton.textContent;
        chestButton.textContent = '🎁 Opening...';
        chestButton.disabled = true;

        const response = await fetch(`/api/open-chest/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': tg.initData || ''
            }
        });

        if (response.ok) {
            const result = await response.json();

            // Show chest opening animation
            setTimeout(() => {
                if (result.reward > 0) {
                    alert(`🎉 Chest opened! You won ${result.reward} AURA tokens!`);
                } else {
                    alert('📦 Chest opened! Better luck tomorrow!');
                }

                // Reload quest data
                loadQuestData();
            }, 1000);

        } else {
            const error = await response.json();
            alert(`❌ ${error.error}`);
            chestButton.textContent = originalText;
            chestButton.disabled = false;
        }

    } catch (error) {
        console.error('Error opening chest:', error);
        alert('❌ Failed to open chest');
        chestButton.textContent = originalText;
        chestButton.disabled = false;
    }
}

// Claim AURA function
async function claimAura() {
    try {
        const userId = user?.id || '1354543512';

        // Show loading state
        const claimButton = document.getElementById('claimButton');
        claimButton.textContent = '⏳ Claiming...';
        claimButton.disabled = true;

        const response = await fetch(`/api/claim-aura/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': tg.initData || ''
            }
        });

        if (response.ok) {
            const result = await response.json();
            alert(`✅ AURA claimed successfully!\nTransaction: ${result.transactionHash}`);

            // Reload quest data and balances
            loadQuestData();
            loadWalletData();

        } else {
            const error = await response.json();
            alert(`❌ ${error.error}`);
        }

    } catch (error) {
        console.error('Error claiming AURA:', error);
        alert('❌ Failed to claim AURA');
    } finally {
        const claimButton = document.getElementById('claimButton');
        claimButton.textContent = 'Claim AURA Rewards';
        claimButton.disabled = false;
    }
}

// Load quest history
async function loadQuestHistory() {
    try {
        const userId = user?.id || '1354543512';

        const response = await fetch(`/api/quest-history/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': tg.initData || ''
            }
        });

        if (response.ok) {
            const history = await response.json();
            displayQuestHistory(history);
        }
    } catch (error) {
        console.error('Error loading quest history:', error);
    }
}

// Display quest history
function displayQuestHistory(history) {
    const historyContainer = document.getElementById('questHistory');

    if (!history || history.length === 0) {
        historyContainer.innerHTML = `
            <div style="text-align: center; color: var(--tg-theme-hint-color, #999999); padding: 20px;">
                No quest history yet. Complete daily quests to see your progress!
            </div>
        `;
        return;
    }

    historyContainer.innerHTML = history.map(day => {
        const date = new Date(day.quest_date).toLocaleDateString();
        const questIcon = day.completed ? '✅' : '❌';
        const chestIcon = day.opened ? '📦' : (day.completed ? '🎁' : '🔒');
        const reward = day.reward_amount || 0;

        return `
            <div class="history-item">
                <div>
                    <strong>${date}</strong><br>
                    <small style="color: var(--tg-theme-hint-color, #999999);">
                        ${questIcon} Quest ${chestIcon} Chest
                        ${reward > 0 ? `(+${reward} AURA)` : ''}
                    </small>
                </div>
                <div style="text-align: right;">
                    ${day.completed ? '✅' : '⏳'}
                </div>
            </div>
        `;
    }).join('');
}
