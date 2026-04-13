/**
 * STAKEFORGE - Secure BTC Module (CSP Friendly)
 */

async function checkIPAndRenderWallet() {
    const walletContainer = document.getElementById('btc-wallet-area');
    if (!walletContainer) return;

    // JAVÍTÁS: Függvényt adunk át, nem stringet, így a CSP nem blokkolja
    if (typeof userProfile === 'undefined' || !userProfile) {
        setTimeout(() => {
            checkIPAndRenderWallet();
        }, 500);
        return;
    }

    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        
        // Szigorú IP ellenőrzés
        if (data.country_code === 'HU') {
            walletContainer.innerHTML = `<p style="color:var(--danger); font-size:13px; margin-top:15px; font-weight:bold;">⚠️ Funkciók korlátozva (HU).</p>`;
            return;
        }

        // Cím kiosztás
        if (!userProfile.btc_address) {
            await grabAddressFromPool();
        }

        renderCryptoCard(walletContainer);
        
    } catch (e) {
        console.error("Wallet Load Error:", e);
    }
}

async function grabAddressFromPool() {
    try {
        const { data: freeAddrs, error: fetchError } = await _supabase
            .from('btc_pool')
            .select('*')
            .eq('is_assigned', false)
            .limit(1);

        if (fetchError || !freeAddrs || freeAddrs.length === 0) return;

        const selectedRecord = freeAddrs[0];

        await _supabase.from('btc_pool').update({ 
            is_assigned: true, 
            assigned_to: currentUser.id,
            assigned_at: new Date().toISOString()
        }).eq('id', selectedRecord.id);

        await _supabase.from('profiles').update({ 
            btc_address: selectedRecord.address 
        }).eq('id', currentUser.id);

        userProfile.btc_address = selectedRecord.address;
    } catch (err) {
        console.error("Pool Error:", err);
    }
}

function renderCryptoCard(container) {
    const btcAddr = userProfile.btc_address || "No address found.";
    
    container.innerHTML = `
        <div class="market-card" style="border: 1px solid var(--primary); background: rgba(0,212,255,0.05); margin-top:20px; text-align:left;">
            <h4 style="color:var(--primary); margin-top:0;">Secure Crypto Gateway</h4>
            
            <p style="font-size:13px; margin-bottom:5px; color:#aaa;">Your Personal BTC Deposit Address:</p>
            <code style="display:block; background:#000; padding:10px; border-radius:5px; word-break:break-all; font-size:11px; color:var(--primary); border: 1px dashed var(--primary)">
                ${btcAddr}
            </code>
            
            <hr style="border:0; border-top:1px solid var(--border); margin:20px 0;">
            
            <h4 style="margin-bottom:10px;">Withdraw Funds</h4>
            <small style="color:#aaa">Amount (€)</small>
            <input type="number" id="withdraw-amount" placeholder="0.00" style="margin-bottom:10px;">
            
            <small style="color:#aaa">Destination BTC Wallet</small>
            <input type="text" id="withdraw-dest" placeholder="bc1q..." value="">
            
            <button class="btn-primary" id="btn-withdraw">REQUEST WITHDRAWAL</button>
            <p id="withdraw-status" style="font-size:12px; margin-top:10px;"></p>
        </div>
    `;

    // Eseménykezelő hozzáadása (szintén CSP barát megoldás)
    document.getElementById('btn-withdraw').onclick = handleWithdrawRequest;
}

async function handleWithdrawRequest() {
    const amountInput = document.getElementById('withdraw-amount');
    const destInput = document.getElementById('withdraw-dest');
    const status = document.getElementById('withdraw-status');
    
    const amount = parseFloat(amountInput.value);
    const dest = destInput.value.trim();

    if (isNaN(amount) || amount <= 0) return alert("Érvénytelen összeg!");
    if (amount > userProfile.real_balance) return alert("Nincs elég Real egyenleged!");
    if (!dest) return alert("Add meg a cél BTC címet!");

    try {
        status.innerText = "Processing...";
        
        // 1. Mentés a withdrawals-ba
        const { error: reqErr } = await _supabase
            .from('withdrawals')
            .insert([{
                user_id: currentUser.id,
                username: currentUser.username,
                amount: amount,
                btc_address: dest,
                status: 'pending'
            }]);

        if (reqErr) throw reqErr;

        // 2. Levonás a profilból
        const newBalance = userProfile.real_balance - amount;
        const { error: profErr } = await _supabase
            .from('profiles')
            .update({ real_balance: newBalance })
            .eq('id', currentUser.id);

        if (profErr) throw profErr;

        userProfile.real_balance = newBalance;
        document.getElementById("nav-real").innerText = newBalance.toFixed(2) + " €";
        document.getElementById("w-real").innerText = newBalance.toFixed(2) + " €";

        status.innerText = "✅ Request sent!";
        status.style.color = "var(--success)";
        amountInput.value = ""; 

    } catch (err) {
        console.error("Hiba:", err);
        status.innerText = "❌ Error: " + err.message;
    }
}

function loadSavedBTC() {
    checkIPAndRenderWallet();
}
