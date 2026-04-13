/**
 * STAKEFORGE - BTC Module (Clean Install)
 */

async function checkIPAndRenderWallet() {
    const walletContainer = document.getElementById('btc-wallet-area');
    if (!walletContainer) return;

    // Profil adatok bevárása biztonságosan
    if (typeof userProfile === 'undefined' || !userProfile) {
        setTimeout(() => checkIPAndRenderWallet(), 500);
        return;
    }

    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        
        // IP Ellenőrzés
        if (data.country_code === 'HU') {
            walletContainer.innerHTML = `<p style="color:var(--danger); font-size:13px; margin-top:15px; font-weight:bold;">⚠️ Funkciók korlátozva (HU).</p>`;
            return;
        }

        // Ha nincs címe, kérünk egyet a poolból
        if (!userProfile.btc_address) {
            await grabAddressFromPool();
        }

        renderCryptoCard(walletContainer);
        
    } catch (e) {
        console.error("Hiba a betöltéskor:", e);
    }
}

async function grabAddressFromPool() {
    try {
        // Első szabad cím lekérése
        const { data: freeAddrs, error: fetchError } = await _supabase
            .from('btc_pool')
            .select('*')
            .eq('is_assigned', false)
            .limit(1);

        if (fetchError || !freeAddrs || freeAddrs.length === 0) {
            console.warn("A BTC pool üres!");
            return;
        }

        const target = freeAddrs[0];

        // Foglalás a poolban
        await _supabase.from('btc_pool').update({ 
            is_assigned: true, 
            assigned_to: currentUser.id,
            assigned_at: new Date().toISOString()
        }).eq('id', target.id);

        // Profil frissítése
        await _supabase.from('profiles').update({ 
            btc_address: target.address 
        }).eq('id', currentUser.id);

        // Helyi változó frissítése
        userProfile.btc_address = target.address;
    } catch (err) {
        console.error("Pool hiba:", err);
    }
}

function renderCryptoCard(container) {
    const btcAddr = userProfile.btc_address || "Nincs elérhető cím.";
    
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
            
            <small style="color:#aaa">Target BTC Wallet Address</small>
            <input type="text" id="withdraw-dest" placeholder="bc1q..." style="margin-bottom:10px;">
            
            <button class="btn-primary" id="withdraw-btn">REQUEST WITHDRAWAL</button>
            <p id="withdraw-status" style="font-size:12px; margin-top:10px;"></p>
        </div>
    `;

    // CSP-kompatibilis eseménykezelés
    const btn = document.getElementById('withdraw-btn');
    if (btn) btn.onclick = handleWithdrawRequest;
}

async function handleWithdrawRequest() {
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const dest = document.getElementById('withdraw-dest').value.trim();
    const status = document.getElementById('withdraw-status');

    if (isNaN(amount) || amount <= 0 || !dest) return alert("Kérlek adj meg minden adatot!");
    if (amount > userProfile.real_balance) return alert("Nincs elég egyenleged!");

    try {
        status.innerText = "Processing...";
        status.style.color = "var(--primary)";

        // 1. Kérelem rögzítése
        const { error: insErr } = await _supabase.from('withdrawals').insert([{
            user_id: currentUser.id,
            username: currentUser.username,
            amount: amount,
            btc_address: dest
        }]);

        if (insErr) throw insErr;

        // 2. Egyenleg levonása
        const newBal = userProfile.real_balance - amount;
        await _supabase.from('profiles').update({ real_balance: newBal }).eq('id', currentUser.id);

        // Lokális frissítés
        userProfile.real_balance = newBal;
        document.getElementById("nav-real").innerText = newBal.toFixed(2) + " €";
        document.getElementById("w-real").innerText = newBal.toFixed(2) + " €";

        status.innerText = "✅ Withdrawal request sent!";
        status.style.color = "var(--success)";
        document.getElementById('withdraw-amount').value = "";
    } catch (err) {
        status.innerText = "❌ Error: " + err.message;
        status.style.color = "var(--danger)";
    }
}

function loadSavedBTC() {
    checkIPAndRenderWallet();
}
