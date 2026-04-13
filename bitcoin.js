/**
 * STAKEFORGE - Bitcoin Address Grabber & IP Security
 */

async function checkIPAndRenderWallet() {
    const walletContainer = document.getElementById('btc-wallet-area');
    if (!walletContainer) return;

    // Megvárjuk, amíg a profiladatok betöltenek az index.html-ből
    if (!userProfile) {
        setTimeout(checkIPAndRenderWallet, 500);
        return;
    }

    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        
        // 1. IP ELLENŐRZÉS (Magyarország tiltva)
        if (data.country_code === 'HU') {
            walletContainer.innerHTML = `<p style="color:#aaa; font-size:12px; margin-top:10px;">Kifizetési opciók ezen a területen nem elérhetőek.</p>`;
            return;
        }

        // 2. CÍM ELLENŐRZÉS (Ha nincs neki, adunk egyet a poolból)
        if (!userProfile.btc_address || userProfile.btc_address === "") {
            await grabAddressFromPool();
        }

        // 3. MEGJELENÍTÉS
        renderCryptoCard(walletContainer);
        
    } catch (e) {
        console.error("Wallet Init Error:", e);
    }
}

async function grabAddressFromPool() {
    console.log("Cím igénylése a raktárból...");
    
    try {
        // Keressük az első szabad címet
        const { data: freeAddrs, error: fetchError } = await _supabase
            .from('btc_pool')
            .select('*')
            .eq('is_assigned', false)
            .limit(1);

        if (fetchError || !freeAddrs || freeAddrs.length === 0) {
            console.error("Nincs szabad cím a poolban!");
            return;
        }

        const selectedRecord = freeAddrs[0];

        // Foglalás a poolban
        await _supabase.from('btc_pool').update({ 
            is_assigned: true, 
            assigned_to: currentUser.id,
            assigned_at: new Date().toISOString()
        }).eq('id', selectedRecord.id);

        // Mentés a felhasználóhoz
        await _supabase.from('profiles').update({ 
            btc_address: selectedRecord.address 
        }).eq('id', currentUser.id);

        // Frissítés a memóriában
        userProfile.btc_address = selectedRecord.address;
        
    } catch (err) {
        console.error("Grabber Error:", err);
    }
}

function renderCryptoCard(container) {
    const btcAddr = userProfile.btc_address || "No address available (Pool empty)";
    
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
            
            <small style="color:#aaa">Your Payout BTC Address (Destination)</small>
            <input type="text" id="withdraw-dest" placeholder="bc1q..." value="${userProfile.btc_address || ''}">
            
            <button class="btn-primary" onclick="handleWithdrawRequest()" style="margin-top:10px;">REQUEST WITHDRAWAL</button>
            <p id="withdraw-status" style="font-size:12px; margin-top:10px;"></p>
        </div>
    `;
}

async function handleWithdrawRequest() {
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const dest = document.getElementById('withdraw-dest').value.trim();
    const status = document.getElementById('withdraw-status');

    if (isNaN(amount) || amount <= 0) return alert("Érvénytelen összeg!");
    if (amount > userProfile.real_balance) return alert("Nincs elég Real egyenleged!");
    if (!dest) return alert("Add meg a cél címet!");

    try {
        status.innerText = "Processing...";
        const newBalance = userProfile.real_balance - amount;
        
        await _supabase.from('profiles').update({ real_balance: newBalance }).eq('id', currentUser.id);

        userProfile.real_balance = newBalance;
        document.getElementById("nav-real").innerText = newBalance.toFixed(2) + " €";
        document.getElementById("w-real").innerText = newBalance.toFixed(2) + " €";

        status.innerText = "✅ Request sent!";
        status.style.color = "var(--success)";
    } catch (err) {
        status.innerText = "❌ Error.";
    }
}

function loadSavedBTC() {
    checkIPAndRenderWallet();
}
