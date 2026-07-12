// ═══════════ GLOBALS ═══════════
function resolveApiBase() {
    if (window.WALLET_API_BASE) {
        return window.WALLET_API_BASE.replace(/\/$/, "");
    }

    if (
        window.location &&
        window.location.hostname &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ) {
        return "http://127.0.0.1:8000";
    }

    return "https://web-production-cec3d.up.railway.app";
}

const WALLET_API_URL = `${resolveApiBase()}/api`;

// ═══════════ CRYPTO PRICE TICKER ═══════════

async function fetchCryptoPrices() {
    try {
        const response = await fetch(`${WALLET_API_URL}/prices`);
        if (!response.ok) throw new Error('Network response was not ok');
        const result = await response.json();
        const displayNames = {
            BTC: 'BTC',
            ETH: 'ETH',
            TRX: 'TRX',
            BNB: 'BNB',
            DOGE: 'DOGE',
            SOL: 'Solana'
        };
        
        return result.data.map(coin => {
            const price = parseFloat(coin.prices[0].value);
            
            // Format price based on its value
            const formattedPrice = price < 1 
                ? price.toFixed(4) 
                : price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                
            return {
                name: displayNames[coin.symbol] || coin.symbol,
                price: formattedPrice,
                trendText: 'LIVE',
                trendClass: 'price-live'
            };
        });
    } catch (error) {
        console.error('Error fetching crypto prices:', error);
        // Fallback data if API fails
        return [
            { name: 'BTC', price: '62,438.20', trendText: 'LIVE', trendClass: 'price-live' },
            { name: 'ETH', price: '3,412.55', trendText: 'LIVE', trendClass: 'price-live' },
            { name: 'TRX', price: '0.1285', trendText: 'LIVE', trendClass: 'price-live' },
            { name: 'BNB', price: '582.10', trendText: 'LIVE', trendClass: 'price-live' },
            { name: 'DOGE', price: '0.1234', trendText: 'LIVE', trendClass: 'price-live' },
            { name: 'Solana', price: '165.75', trendText: 'LIVE', trendClass: 'price-live' }
        ];
    }
}

function buildTickerHTML(data) {
    return data.map(coin => {
        return `
            <span class="ticker-item">
                <span class="coin-name">${coin.name}</span>
                $${coin.price}
                <span class="${coin.trendClass || 'price-live'}">${coin.trendText || 'LIVE'}</span>
            </span>
            <span class="ticker-separator"></span>
        `;
    }).join('');
}

function buildTickerGroupHTML(data, repeatCount) {
    return `
        <div class="ticker-group">
            ${Array.from({ length: repeatCount }, () => buildTickerHTML(data)).join('')}
        </div>
    `;
}

function initTicker(tickerData) {
    const track = document.querySelector('.ticker-track');
    if (!track) return;
    
    if (!tickerData) return;
    const tickerBar = track.parentElement;
    const viewportWidth = tickerBar?.clientWidth || window.innerWidth;

    track.innerHTML = buildTickerGroupHTML(tickerData, 1) + buildTickerGroupHTML(tickerData, 1);

    const firstGroup = track.querySelector('.ticker-group');
    const baseGroupWidth = firstGroup ? firstGroup.scrollWidth : 0;
    const targetGroupWidth = Math.ceil(viewportWidth * 1.25);

    if (baseGroupWidth > 0 && baseGroupWidth < targetGroupWidth) {
        const repeatCount = Math.max(2, Math.ceil(targetGroupWidth / baseGroupWidth));
        const repeatedGroupHTML = buildTickerGroupHTML(tickerData, repeatCount);
        track.innerHTML = repeatedGroupHTML + repeatedGroupHTML;
    }
}

// ═══════════ MOBILE MENU TOGGLE ═══════════

function initMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', () => {
        menu.classList.toggle('hidden');
        // Animate hamburger → X
        const icon = btn.querySelector('svg');
        if (menu.classList.contains('hidden')) {
            icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>';
        } else {
            icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>';
        }
    });
}

// ═══════════ USER PROFILE ═══════════

let currentUserProfile = null;
let profitIntervalId = null;
let currentTrxPrice = 0.1285;

async function loadUserProfile(cryptoPrices) {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const response = await fetch(`${WALLET_API_URL}/user/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            currentUserProfile = await response.json();
            
            // Get live crypto prices to find TRX price
            let trxPrice = 0.1285; // Fallback
            if (cryptoPrices) {
                const trxData = cryptoPrices.find(c => c.name === 'TRX');
                if (trxData) {
                    // Remove any commas from formatted price and parse float
                    trxPrice = parseFloat(trxData.price.replace(/,/g, ''));
                }
            }
            currentTrxPrice = trxPrice;

            // Update Dashboard UI
            const trxBal = currentUserProfile.balance_trx || 0;
            const dbProfit = currentUserProfile.total_profit || 0;
            const cachedProfit = parseFloat(localStorage.getItem('cached_profit') || 0);
            
            // Use whichever profit is higher: the DB (if they were offline and background task ran) 
            // or the cached one (if they refreshed between 5-minute background ticks)
            let profit = Math.max(dbProfit, cachedProfit);
            currentUserProfile.available_profit = profit;
            currentUserProfile.first_withdraw_done = Boolean(currentUserProfile.first_withdraw_done);

            const profitDay = currentUserProfile.profit_per_day || 0;
            
            // Total balance is just TRX balance * current price
            const totalUSD = trxBal * trxPrice; 

            const trxBalEl = document.getElementById('trx-balance');
            const profitEl = document.getElementById('total-profit');
            const profitDayEl = document.getElementById('trx-profit-day');
            const totalBalEl = document.getElementById('total-balance');
            const navBalEl = document.querySelector('#nav-balance span:last-child');
            const addressDisplay = document.getElementById('wallet-address-display');

            if (trxBalEl) trxBalEl.textContent = trxBal.toFixed(6);
            if (profitEl) profitEl.textContent = profit.toFixed(6) + '$';
            if (profitDayEl) profitDayEl.textContent = profitDay.toFixed(2) + '$';
            
            const formattedTotal = totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            if (totalBalEl) totalBalEl.innerHTML = `${formattedTotal} <span class="text-2xl sm:text-3xl text-gray-500 font-semibold">$</span>`;
            if (navBalEl) navBalEl.textContent = formattedTotal + '$';
            
            if (addressDisplay) addressDisplay.textContent = currentUserProfile.trx_address || 'Address not found';

            const refCountDisplay = document.getElementById('referrals-count-display');
            if (refCountDisplay) refCountDisplay.textContent = currentUserProfile.referrals_count || 0;
            
            const refCodeDisplay = document.getElementById('ref-code-display');
            if (currentUserProfile.referral_code) {
                localStorage.setItem("referral_code", currentUserProfile.referral_code);
                if (refCodeDisplay) refCodeDisplay.textContent = currentUserProfile.referral_code;
            }

            // Live Profit Updater (every 5 seconds)
            if (profitDay > 0) {
                // Initial save just in case
                localStorage.setItem('cached_profit', profit);

                if (profitIntervalId) {
                    clearInterval(profitIntervalId);
                }
                
                profitIntervalId = setInterval(() => {
                    const profitPer5Sec = (profitDay / 86400) * 5;
                    profit += profitPer5Sec;
                    localStorage.setItem('cached_profit', profit);
                    
                    if (profitEl) {
                        profitEl.textContent = profit.toFixed(6) + '$';
                    }
                }, 5000);
            } else if (profitIntervalId) {
                clearInterval(profitIntervalId);
                profitIntervalId = null;
            }
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
    }
}

// ═══════════ BUTTON INTERACTIONS ═══════════

function initButtons() {
    const sendBtn = document.getElementById('btn-send');
    const receiveBtn = document.getElementById('btn-receive');
    const withdrawProfitBtn = document.getElementById('btn-withdraw-profit');

    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            const balance = currentUserProfile?.balance_trx || 0;
            if (balance === 0) {
                showToast("You have insufficient balance");
            } else {
                const depDateStr = currentUserProfile?.first_deposit_date;
                const depDate = depDateStr ? new Date(depDateStr) : null;

                if (!depDate || isNaN(depDate.getTime())) {
                    showToast("We are on maintenance. Please wait!");
                    return;
                }

                const unlockDate = new Date(depDate);
                unlockDate.setMonth(unlockDate.getMonth() + 1);

                if (new Date() >= unlockDate) {
                    showToast("We are on maintenance. Please wait!");
                } else {
                    const options = { year: 'numeric', month: 'short', day: 'numeric' };
                    showToast(`You can withdraw your actual balance at ${unlockDate.toLocaleDateString(undefined, options)}`);
                }
            }
        });
    }

    // Receive Modal Logic
    const receiveModal = document.getElementById('receive-modal');
    const receiveBackdrop = document.getElementById('receive-modal-backdrop');
    const receiveContent = document.getElementById('receive-modal-content');
    const closeReceiveBtn = document.getElementById('btn-close-receive');
    const copyBtn = document.getElementById('btn-copy-address');

    if (receiveBtn && receiveModal) {
        receiveBtn.addEventListener('click', () => {
            receiveModal.classList.remove('hidden');
            receiveModal.classList.add('flex');
            
            // Generate QR Code if address exists and QR is empty
            const qrContainer = document.getElementById("qrcode");
            const address = currentUserProfile?.trx_address;
            
            if (address && qrContainer.innerHTML === "") {
                new QRCode(qrContainer, {
                    text: address,
                    width: 192,
                    height: 192,
                    colorDark : "#0a0e1a",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H
                });
            }
            
            // Animate in
            requestAnimationFrame(() => {
                receiveBackdrop.classList.remove('opacity-0');
                receiveContent.classList.remove('opacity-0', 'scale-95');
            });
        });
    }

    const closeReceiveModal = () => {
        receiveBackdrop.classList.add('opacity-0');
        receiveContent.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            receiveModal.classList.add('hidden');
            receiveModal.classList.remove('flex');
        }, 300);
    };

    if (closeReceiveBtn && receiveModal) {
        closeReceiveBtn.addEventListener('click', closeReceiveModal);
        receiveBackdrop.addEventListener('click', closeReceiveModal);
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const address = currentUserProfile?.trx_address;
            if (!address) return;
            navigator.clipboard.writeText(address).then(() => {
                showToast('Address copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy', err);
            });
        });
    }

    if (withdrawProfitBtn) {
        withdrawProfitBtn.addEventListener('click', withdrawProfit);
    }
}

// ═══════════ TOAST NOTIFICATION ═══════════

function showToast(message) {
    // Remove existing toast
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: linear-gradient(135deg, #1c2140, #141828);
        border: 1px solid rgba(108, 92, 231, 0.3);
        color: #e2e8f0;
        padding: 12px 24px;
        border-radius: 12px;
        font-size: 0.875rem;
        font-weight: 500;
        z-index: 9999;
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(108,92,231,0.1);
        backdrop-filter: blur(12px);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Force a browser reflow to ensure initial state applies before transition
    void toast.offsetWidth;

    // Animate in
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    // Auto remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// ═══════════ INIT ═══════════

document.addEventListener('DOMContentLoaded', async () => {
    initMobileMenu();
    initButtons();
    
    const path = window.location.pathname;
    const isWalletPage = path.endsWith('wallet.html');
    const isHistoryPage = path.includes('history.html');
    const isReferralPage = path.includes('referrals.html');
    
    if (isWalletPage) {
        const track = document.querySelector('.ticker-track');
        if (track) track.innerHTML = '<span class="ticker-item text-gray-500">Loading live prices...</span>';
        
        const cryptoPrices = await fetchCryptoPrices();
        
        initTicker(cryptoPrices);
        await loadUserProfile(cryptoPrices);
    } else if (isReferralPage) {
        // Only fetch /me to get referral counts, no need for crypto prices
        await loadUserProfile();
    }
    
    if (isHistoryPage) {
        loadHistory();
    }
});

let tickerResizeTimer = null;
window.addEventListener('resize', () => {
    if (tickerResizeTimer) {
        clearTimeout(tickerResizeTimer);
    }

    tickerResizeTimer = setTimeout(async () => {
        const track = document.querySelector('.ticker-track');
        if (!track || !track.children.length) return;

        const cryptoPrices = await fetchCryptoPrices();
        initTicker(cryptoPrices);
    }, 150);
});

// ═══════════ WITHDRAW PROFIT LOGIC ═══════════

function getWithdrawableProfit() {
    if (!currentUserProfile) return 0;
    return Number(currentUserProfile.available_profit ?? currentUserProfile.total_profit ?? 0);
}

window.withdrawProfit = function() {
    if (!currentUserProfile || typeof currentUserProfile.total_profit !== 'number') {
        showToast('Profile not loaded yet.', 'error');
        return;
    }

    if (currentUserProfile.first_withdraw_done) {
        showToast('Please wait for us to varify your profit', 'error');
        return;
    }

    if (getWithdrawableProfit() <= 0) {
        showToast('No profit available to withdraw.', 'error');
        return;
    }

    const modal = document.getElementById('withdraw-profit-modal');
    if (modal) {
        // Reset view
        document.getElementById('withdraw-profit-form-container').classList.remove('hidden');
        document.getElementById('withdraw-profit-success').classList.add('hidden');
        document.getElementById('withdraw-profit-success').classList.remove('flex');
        
        document.getElementById('withdraw-profit-address').value = '';
        document.getElementById('withdraw-profit-amount').value = '';
        
        const btn = document.getElementById('withdraw-profit-submit-btn');
        btn.innerHTML = 'Withdraw';
        btn.disabled = false;

        modal.classList.remove('hidden');
        // Small delay to allow CSS transition to work
        setTimeout(() => {
            modal.classList.remove('opacity-0');
        }, 10);
    }
}

window.closeWithdrawProfitModal = function() {
    const modal = document.getElementById('withdraw-profit-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
}

window.submitWithdrawProfit = async function() {
    if (currentUserProfile?.first_withdraw_done) {
        showToast('Please wait for us to varify your profit', 'error');
        return;
    }

    const address = document.getElementById('withdraw-profit-address').value.trim();
    const amountStr = document.getElementById('withdraw-profit-amount').value.trim();
    const amountUsd = parseFloat(amountStr);
    const normalizedAmountUsd = Math.round(amountUsd * 100) / 100;
    const availableProfit = getWithdrawableProfit();

    if (!address) {
        showToast('Please enter a Tron address', 'error');
        return;
    }
    if (isNaN(amountUsd) || normalizedAmountUsd !== 200) {
        showToast('Withdrawal amount must be exactly $200', 'error');
        return;
    }
    if (amountUsd > availableProfit) {
        showToast('Amount exceeds your total profit', 'error');
        return;
    }

    showToast('Withdrawal submitted. Check status in history.');

    const btn = document.getElementById('withdraw-profit-submit-btn');
    btn.disabled = true;
    btn.innerHTML = `
        <svg class="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    `;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${WALLET_API_URL}/withdraw-profit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                to_address: address,
                amount_usd: amountUsd
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Show Success Animation
            document.getElementById('withdraw-profit-form-container').classList.add('hidden');
            const successDiv = document.getElementById('withdraw-profit-success');
            successDiv.classList.remove('hidden');
            successDiv.classList.add('flex');
            successDiv.querySelector('p')?.replaceChildren(document.createTextNode(data.message || 'Withdrawal queued. Check status in history.'));

            // Reload history/profile later so the pending row is visible if the user stays on this page
            await loadUserProfile();
        } else {
            console.error('Withdrawal failed with server response:', data);
            showToast(data.detail || 'Withdrawal failed', 'error');
            btn.disabled = false;
            btn.innerHTML = 'Withdraw';
        }
    } catch (error) {
        console.error('Network or parsing error:', error);
        showToast('Network error occurred', 'error');
        btn.disabled = false;
        btn.innerHTML = 'Withdraw';
    }
}

// ═══════════ HISTORY LOGIC ═══════════

async function loadHistory() {
    const container = document.getElementById('history-container');
    if (!container) return;
    
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${WALLET_API_URL}/history`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const history = data.history || [];
            
            if (history.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-12">
                        <p class="text-gray-500">No transactions found.</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = history.map(tx => {
                const date = new Date(tx.created_at);
                const dateString = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                
                const isCompleted = tx.status === 'completed';
                const isPending = tx.status === 'pending';
                const isReceived = tx.type === 'received_trx' || tx.direction === 'incoming';
                const statusColor = isCompleted ? 'text-emerald-400' : (isPending ? 'text-yellow-400' : 'text-red-400');
                const hoverColor = isCompleted ? 'hover:border-emerald-500/30' : (isPending ? 'hover:border-yellow-500/30' : 'hover:border-red-500/30');
                const iconBg = isCompleted ? 'bg-emerald-500/20' : (isPending ? 'bg-yellow-500/20' : 'bg-red-500/20');
                const title = isReceived ? 'Received TRX' : 'Withdraw Profit';
                const counterpartyLabel = isReceived ? 'From' : 'To';
                const counterpartyAddress = isReceived ? (tx.from_address || 'Unknown sender') : (tx.to_address || 'Unknown address');
        const formatAmount = (value) => {
            if (typeof value !== 'number') return null;
            return value < 1 ? value.toFixed(6) : value.toFixed(2);
        };
        const amountUsd = formatAmount(tx.amount_usd);
        const amountTrx = typeof tx.amount_trx === 'number' ? tx.amount_trx.toFixed(4) : null;
                const amountPrefix = isReceived ? '+' : '-';
                const iconPath = isReceived
                    ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>'
                    : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>';
                
                let reasonHtml = '';
                if (!isCompleted && !isPending && tx.error) {
                    reasonHtml = `<p class="text-[10px] text-red-400/80 mt-1 italic">${tx.error}</p>`;
                }
                
                return `
                <div class="wallet-card relative rounded-3xl overflow-hidden border border-brand-border/40 bg-brand-card p-4 transition-colors">
                    <div class="pattern-overlay absolute inset-0 pointer-events-none opacity-[0.04]"></div>
                    
                    <div class="relative z-10">
                        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-brand-surface/50 backdrop-blur-sm border border-brand-border/30 rounded-xl p-4 transition-colors ${hoverColor} gap-4 sm:gap-0">
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 rounded-full ${iconBg} flex items-center justify-center ${statusColor} shrink-0">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        ${iconPath}
                                    </svg>
                                </div>
                                <div>
                                    <p class="font-bold text-white text-sm">${title}</p>
                                    <p class="text-xs text-gray-500">${dateString}</p>
                                    <p class="text-[10px] text-gray-600 mt-1 break-all" title="${counterpartyAddress}">${counterpartyLabel}: ${counterpartyAddress}</p>
                                    ${reasonHtml}
                                </div>
                            </div>
                            <div class="text-left sm:text-right">
                                ${amountUsd ? `<p class="font-bold text-white">${amountPrefix} ${amountUsd} $</p>` : ''}
                                ${amountTrx ? `<p class="text-xs text-gray-400 mt-0.5">${amountPrefix} ${amountTrx} TRX</p>` : ''}
                                <p class="text-xs font-mono mt-1 ${statusColor} uppercase tracking-wider">${tx.status}</p>
                            </div>
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        } else {
            container.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-red-400 text-sm">Failed to load history (Server returned ${response.status}).</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error fetching history:', error);
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-red-400 text-sm">Failed to load history.</p>
            </div>
        `;
    }
}
