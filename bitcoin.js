/**
 * STAKEFORGE - Bitcoin Address Grabber & IP Security
 */

async function checkIPAndRenderWallet() {
    const walletContainer = document.getElementById('btc-wallet-area');
    if (!walletContainer) return;

    if (!userProfile) {
        setTimeout(checkIPAndRenderWallet, 500);
        return;
    }

    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        
        // IP Ellenőrzés
        if (data.country_code === 'HU') {
            walletContainer.innerHTML = `<p style="color:#aaa; font-size:12px; margin-top:10px;">Kifizetési opciók ezen a területen nem elérhetőek.</p>`;
            return;
        }

        // Ha van a profiljában cím, azt mutatjuk. 
        // Ha nincs (NULL), megpróbálunk egyet szerezni a poolból.
        if (!userProfile.btc_address) {
            await grabAddressFromPool();
        }

        renderCryptoCard(walletContainer);
        
    } catch (e) {
        console.error("IP Check Error:", e);
    }
}

async function grabAddressFromPool() {
    console.log("Cím igénylése a poolból...");
    
    try {
        // 1. Megkeressük a legelső szabad címet
        const { data: freeAddrs, error: fetchError } = await _supabase
            .from('btc_pool')
            .select('*')
            .eq('is_assigned', false)
            .limit(1);

        if (fetchError || !freeAddrs || freeAddrs.length === 0) {
            console.error("Nincs szabad BTC cím a poolban!");
            return;
        }

        const selectedRecord = freeAddrs[0];

        // 2. Lefoglaljuk a címet a poolban
        const { error: updatePoolError } = await _supabase
            .from('btc_pool')
            .update({ 
                is_assigned: true, 
                assigned_to: currentUser.id,
                assigned_at: new Date().toISOString()
            })
            .eq('id', selectedRecord.id);

        if (updatePoolError) throw updatePoolError;

        // 3. Beírjuk a felhasználó profiljába is a címet
        const { error: updateProfileError } = await _supabase
            .from('profiles')
            .update({ btc_address: selectedRecord.address })
            .eq('id', currentUser.id);

        if (updateProfileError) throw updateProfileError;

        // 4. Frissítjük a lokális memóriát, hogy azonnal látszódjon
        userProfile.btc_address = selectedRecord.address;
        console.log("Sikeres címkiosztás:", selectedRecord.address);

    } catch (err) {
        console.error("Grabber hiba:", err);
    }
}

function renderCryptoCard(container) {
    // Ha még a grabber után is NULL (pl. elfogyott a pool), hibaüzenet
    const btcAddr = userProfile.btc_address || "Nincs elérhető cím (Pool empty)";
    
    container.innerHTML = `
        <div class="market-card" style="border: 1px solid var(--primary); background: rgba(0,212,255,0.05); margin-top:20px; text-align:left;">
            <h4 style="color:var(--primary); margin-top:0;">Secure Crypto Gateway</h4>
            
            <p style="font-size:13px; margin-bottom:5px; color:#aaa;">Your Personal BTC Deposit Address:</p>
            <code style="display:block; background:#000; padding:10px; border-radius:5px; word-break:break-all; font-size:11px; color:var(--primary); border: 1px dashed var(--primary)">
                ${btcAddr}
            </code>
            <small style="font-size:9px; color:#666; display:block; margin-top:5px;">Ezt a címet csak te használod. A befizetés 3 megerősítés után íródik jóvá.</small>
            
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
    if (!dest) return alert("Kérlek add meg a címet, ahová küldjük a pénzt!");

    try {
        status.innerText = "Processing...";
        const newBalance = userProfile.real_balance - amount;
        
        // Levonjuk az összeget
        const { error } = await _supabase
            .from('profiles')
            .update({ real_balance: newBalance })
            .eq('id', currentUser.id);

        if (error) throw error;

        userProfile.real_balance = newBalance;
        document.getElementById("nav-real").innerText = newBalance.toFixed(2) + " €";
        document.getElementById("w-real").innerText = newBalance.toFixed(2) + " €";

        status.innerText = "✅ Request sent! Admin will process it shortly.";
        status.style.color = "var(--success)";
        
    } catch (err) {
        status.innerText = "❌ Transaction failed.";
    }
}

// Az index.html hívja meg
function loadSavedBTC(address) {
    checkIPAndRenderWallet();
}
