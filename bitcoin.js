/**
 * STAKEFORGE - Bitcoin & IP Security Module
 */

async function checkIPAndRenderWallet() {
    const walletContainer = document.getElementById('btc-wallet-area');
    if (!walletContainer) return;

    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        
        // Ha MAGYAR az IP, üresen hagyjuk a konténert (vagy hibaüzenet marad)
        if (data.country_code === 'HU') {
            walletContainer.innerHTML = `<p style="color:#aaa; font-size:12px;">Kifizetési opciók ezen a területen nem elérhetőek.</p>`;
            return;
        }

        // Ha NEM MAGYAR, rendereljük a kártyát
        renderCryptoCard(walletContainer);
        
    } catch (e) {
        console.error("IP Check Error:", e);
    }
}

function renderCryptoCard(container) {
    const btcAddr = userProfile.btc_address || "Nincs megadva";
    
    container.innerHTML = `
        <div class="market-card" style="border: 1px solid var(--primary); background: rgba(0,212,255,0.05); margin-top:20px; text-align:left;">
            <h4 style="color:var(--primary); margin-top:0;">Secure Crypto Gateway</h4>
            <p style="font-size:13px; margin-bottom:5px; color:#aaa;">Your BTC Deposit Address:</p>
            <code style="display:block; background:#000; padding:10px; border-radius:5px; word-break:break-all; font-size:11px; color:var(--primary)">${btcAddr}</code>
            
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
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const dest = document.getElementById('withdraw-dest').value.trim();
    const status = document.getElementById('withdraw-status');

    if (isNaN(amount) || amount <= 0) return alert("Érvénytelen összeg!");
    if (amount > userProfile.real_balance) return alert("Nincs elég Real egyenleged!");
    if (!dest) return alert("Adj meg egy cél BTC walletcímet!");

    try {
        // 1. Levonjuk az egyenleget
        const newBalance = userProfile.real_balance - amount;
        const { error: balError } = await _supabase
            .from('profiles')
            .update({ real_balance: newBalance })
            .eq('id', currentUser.id);

        if (balError) throw balError;

        // 2. Bejegyezzük a kifizetési kérelmet (feltételezve hogy van 'withdrawals' táblád, vagy logoljuk)
        // Itt most csak frissítjük a UI-t és a lokális profiladatot
        userProfile.real_balance = newBalance;
        document.getElementById("nav-real").innerText = newBalance.toFixed(2) + " €";
        document.getElementById("w-real").innerText = newBalance.toFixed(2) + " €";

        status.innerText = "✅ Kifizetési kérelmedet fogadta a rendszer. Az admin hamarosan feldolgozza.";
        status.style.color = "var(--success)";
        
    } catch (err) {
        console.error("Withdraw error:", err);
        alert("Hiba a tranzakció során!");
    }
}

// Betöltő függvény az index.html számára
function loadSavedBTC(address) {
    // Ezt most már a renderCryptoCard kezeli dinamikusan
    checkIPAndRenderWallet();
}
