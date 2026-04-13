/**
 * STAKEFORGE - BTC Module (Javított, biztonságos verzió)
 */

async function checkIPAndRenderWallet() {
    const walletContainer = document.getElementById('btc-wallet-area');
    if (!walletContainer) return;

    // Bevárjuk a profiladatokat
    if (typeof userProfile === 'undefined' || !userProfile || typeof currentUser === 'undefined') {
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

        // Cím ellenőrzése / kiosztása
        if (!userProfile.btc_address) {
            await grabAddressFromPool();
        }

        renderCryptoCard(walletContainer);
        
    } catch (e) {
        // Ha az IP API nem válaszol (VPN), akkor is megmutatjuk a panelt
        console.warn("IP ellenőrzés sikertelen, panel betöltése...");
        renderCryptoCard(walletContainer);
    }
}

async function grabAddressFromPool() {
    try {
        // 1. Megnézzük, van-e már címe a btc_pool táblában
        const { data: entry } = await _supabase
            .from('btc_pool')
            .select('address')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (entry) {
            userProfile.btc_address = entry.address;
            return;
        }

        // 2. Ha nincs, foglalunk egy szabadot (is_allocated = false)
        const { data: target, error } = await _supabase
            .from('btc_pool')
            .update({ is_allocated: true, user_id: currentUser.id })
            .eq('is_allocated', false)
            .order('id', { ascending: true })
            .select('address')
            .limit(1)
            .maybeSingle();

        if (target) {
            userProfile.btc_address = target.address;
            // Profil szinkronizálás
            await _supabase.from('profiles').update({ btc_address: target.address }).eq('id', currentUser.id);
        }
    } catch (err) {
        console.error("Hiba a cím foglalásakor:", err);
    }
}

function renderCryptoCard(container) {
    const btcAddr = userProfile.btc_address || "Nincs elérhető cím.";
    
    container.innerHTML = `
        <div class="market-card" style="border: 1px solid var(--primary); background: rgba(0,212,255,0.05); margin-top:20px; text-align:left;">
            <h4 style="color:var(--primary); margin-top:0;">BTC Deposit/Withdraw Panel</h4>
            
            <p style="font-size:13px; margin-bottom:5px; color:#aaa;">Your Personal BTC Deposit Address:</p>
            <code id="btc-copy" style="display:block; background:#000; padding:10px; border-radius:5px; word-break:break-all; font-size:11px; color:var(--primary); border: 1px dashed var(--primary); cursor:pointer;">
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

    document.getElementById('withdraw-btn').onclick = handleWithdrawRequest;
    document.getElementById('btc-copy').onclick = () => {
        navigator.clipboard.writeText(btcAddr);
        alert("Cím másolva!");
    };
}

async function handleWithdrawRequest() {
    const amountInput = document.getElementById('withdraw-amount');
    const destInput = document.getElementById('withdraw-dest');
    const status = document.getElementById('withdraw-status');

    const amount = parseFloat(amountInput.value);
    const dest = destInput.value.trim();

    if (isNaN(amount) || amount <= 0 || !dest) {
        alert("Kérlek adj meg minden adatot!");
        return;
    }

    // --- KRITIKUS BIZTONSÁGI ELLENŐRZÉS ---
    if (amount > userProfile.real_balance) {
        status.innerText = "❌ Nincs elég egyenleged! Elérhető: " + userProfile.real_balance.toFixed(2) + " €";
        status.style.color = "var(--danger)";
        alert("Nincs elég egyenleged!");
        return; // <--- MEGÁLLÍTJA A FOLYAMATOT
    }

    try {
        status.innerText = "Processing...";
        status.style.color = "var(--primary)";

        // 1. Kérelem mentése
        const { error: insErr } = await _supabase.from('withdrawals').insert([{
            user_id: currentUser.id,
            username: userProfile.username || 'user',
            amount: amount,
            btc_address: dest,
            status: 'pending'
        }]);

        if (insErr) throw insErr;

        // 2. Egyenleg levonása
        const newBal = userProfile.real_balance - amount;
        await _supabase.from('profiles').update({ real_balance: newBal }).eq('id', currentUser.id);

        // Helyi frissítés
        userProfile.real_balance = newBal;
        if (document.getElementById("nav-real")) document.getElementById("nav-real").innerText = newBal.toFixed(2) + " €";

        status.innerText = "✅ Withdrawal request sent!";
        status.style.color = "var(--success)";
        amountInput.value = "";
        destInput.value = "";

    } catch (err) {
        status.innerText = "❌ Hiba: " + err.message;
        status.style.color = "var(--danger)";
    }
}

// Futás indítása
checkIPAndRenderWallet();
