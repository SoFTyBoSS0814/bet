/**
 * STAKEFORGE - Bitcoin & IP Security Module (FIXED)
 */

async function checkIPAndRenderWallet() {
    const walletContainer = document.getElementById('btc-wallet-area');
    if (!walletContainer) return;

    // Várunk egy kicsit, hogy a userProfile biztosan betöltsön az index.html-ből
    if (!userProfile) {
        setTimeout(checkIPAndRenderWallet, 500);
        return;
    }

    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        
        // Debug: konzolon láthatod, mit észlelt a rendszer
        console.log("Detected Country:", data.country_code);

        if (data.country_code === 'HU') {
            walletContainer.innerHTML = `<p style="color:#aaa; font-size:12px; margin-top:10px;">Kifizetési opciók ezen a területen nem elérhetőek.</p>`;
            return;
        }

        // Ha NEM Magyarország, akkor kirajzoljuk
        renderCryptoCard(walletContainer);
        
    } catch (e) {
        console.error("IP Check Error:", e);
        walletContainer.innerHTML = "Hiba az IP ellenőrzés során.";
    }
}

function renderCryptoCard(container) {
    // Ha az adatbázisban nincs BTC cím, egy alapértelmezett üzenetet írunk ki
    const btcAddr = userProfile.btc_address && userProfile.btc_address !== "" 
                    ? userProfile.btc_address 
                    : "Nincs BTC cím beállítva (Admin szükséges)";
    
    container.innerHTML = `
        <div class="market-card" style="border: 1px solid var(--primary); background: rgba(0,212,255,0.05); margin-top:20px; text-align:left;">
            <h4 style="color:var(--primary); margin-top:0;">Secure Crypto Gateway</h4>
            <p style="font-size:13px; margin-bottom:5px; color:#aaa;">Your BTC Deposit Address:</p>
            <code id="display-btc-addr" style="display:block; background:#000; padding:10px; border-radius:5px; word-break:break-all; font-size:11px; color:var(--primary)">${btcAddr}</code>
            
            <hr style="border:0; border-top:1px solid var(--border); margin:20px 0;">
            
            <h4 style="margin-bottom:10px;">Withdraw Funds</h4>
            <small style="color:#aaa">Amount (€)</small>
            <input type="number" id="withdraw-amount" placeholder="0.00" style="margin-bottom:10px;">
            
            <small style="color:#aaa">Destination BTC Wallet</small>
            <input type="text" id="withdraw-dest" placeholder="bc1q..." value="${userProfile.btc_address || ''}">
            
            <button class="btn-primary" onclick="handleWithdrawRequest()" style="margin-top:10px;">REQUEST WITHDRAWAL</button>
            <p id="withdraw-status" style="font-size:12px; margin-top:10px;"></p>
        </div>
    `;
}

async function handleWithdrawRequest() {
    const amountInput = document.getElementById('withdraw-amount');
    const destInput = document.getElementById('withdraw-dest');
    const status = document.getElementById('withdraw-status');
    
    const amount = parseFloat(amountInput.value);
    const dest = destInput.value.trim();

    if (isNaN(amount) || amount <= 0) {
        alert("Érvénytelen összeg!");
        return;
    }
    if (amount > userProfile.real_balance) {
        alert("Nincs elég Real egyenleged!");
        return;
    }
    if (!dest) {
        alert("Adj meg egy cél címet!");
        return;
    }

    try {
        status.innerText = "Processing...";
        
        const newBalance = userProfile.real_balance - amount;
        const { error } = await _supabase
            .from('profiles')
            .update({ real_balance: newBalance })
            .eq('id', currentUser.id);

        if (error) throw error;

        // UI frissítés
        userProfile.real_balance = newBalance;
        document.getElementById("nav-real").innerText = newBalance.toFixed(2) + " €";
        document.getElementById("w-real").innerText = newBalance.toFixed(2) + " €";

        status.innerText = "✅ Request sent! Admin will process it shortly.";
        status.style.color = "var(--success)";
        amountInput.value = "";
        
    } catch (err) {
        console.error("Withdraw error:", err);
        status.innerText = "❌ Transaction failed.";
        status.style.color = "var(--danger)";
    }
}

// Ezt hívja az index.html
function loadSavedBTC(address) {
    checkIPAndRenderWallet();
}
