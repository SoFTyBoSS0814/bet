/**
 * STAKEFORGE - BTC Module (Full: IP Filter + Deposit + Withdraw)
 */

async function checkIPAndRenderWallet() {
    const walletContainer = document.getElementById('btc-wallet-area');
    const geoMsg = document.getElementById('geo-restriction');
    if (!walletContainer) return;

    // 1. KŐKEMÉNY IP SOROMPÓ
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        
        if (data.country_code === 'HU') {
            console.log("Blokkolva: Magyar IP.");
            if (geoMsg) geoMsg.style.display = 'block';
            walletContainer.innerHTML = ''; 
            return; // ⛔️ ITT VÉGE. Nem nyúl az adatbázishoz.
        } else {
            if (geoMsg) geoMsg.style.display = 'none';
        }
    } catch (e) {
        console.warn("Geo-check hiba, biztonsági stop.");
        return;
    }

    // 2. ADATOK BEVÁRÁSA
    if (typeof userProfile === 'undefined' || !userProfile || typeof currentUser === 'undefined' || !currentUser) {
        setTimeout(() => checkIPAndRenderWallet(), 500);
        return;
    }

    // 3. WALLET LOGIKA (Csak külföldieknek)
    try {
        // Megnézzük, van-e már címe
        const { data: btcRow } = await _supabase
            .from('btc_pool')
            .select('address')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (btcRow) {
            userProfile.btc_address = btcRow.address;
        } else {
            // Szabad cím keresése
            const { data: freeRows } = await _supabase
                .from('btc_pool')
                .select('id, address')
                .is('user_id', null)
                .limit(1);

            if (freeRows && freeRows.length > 0) {
                const target = freeRows[0];
                const { data: updated } = await _supabase
                    .from('btc_pool')
                    .update({ user_id: currentUser.id, is_allocated: true })
                    .eq('id', target.id)
                    .select();

                if (updated && updated.length > 0) {
                    userProfile.btc_address = updated[0].address;
                }
            }
        }
        
        // Kirajzolás
        renderCryptoCard(walletContainer);

    } catch (err) {
        console.error("BTC Hiba:", err);
    }
}

function renderCryptoCard(container) {
    const addr = userProfile.btc_address || "Nincs elérhető cím.";
    const balance = userProfile.real_balance || 0;

    container.innerHTML = `
        <div class="market-card" style="border: 1px solid var(--primary); padding: 20px; border-radius: 12px; background: rgba(0,212,255,0.05); text-align:left;">
            
            <h4 style="color:var(--primary); margin:0 0 10px 0;">BTC Deposit</h4>
            <p style="font-size:12px; color:#aaa; margin-bottom:10px;">Küldj BTC-t az alábbi címre a feltöltéshez:</p>
            <code id="btc-addr-code" style="display:block; background:#000; padding:15px; border-radius:8px; border: 1px dashed var(--primary); color:var(--primary); font-family:monospace; word-break:break-all; text-align:center; cursor:pointer;">
                ${addr}
            </code>
            <p style="font-size:10px; color:#555; margin-top:5px; text-align:center;">(Kattints a másoláshoz)</p>

            <hr style="border:0; border-top:1px solid #333; margin:20px 0;">

            <h4 style="color:var(--primary); margin:0 0 15px 0;">Withdraw</h4>
            <div style="margin-bottom:10px;">
                <small style="color:#888;">Elérhető egyenleg: ${balance} €</small>
            </div>
            <input type="number" id="withdraw-amount" placeholder="Összeg (€)" style="width:100%; padding:10px; margin-bottom:10px; background:#111; border:1px solid #333; color:white; border-radius:5px;">
            <input type="text" id="withdraw-address" placeholder="Cél BTC cím (bc1...)" style="width:100%; padding:10px; margin-bottom:15px; background:#111; border:1px solid #333; color:white; border-radius:5px;">
            
            <button class="btn-primary" onclick="handleWithdrawRequest()" style="width:100%; padding:12px; font-weight:bold;">Kifizetés indítása</button>
            <p id="withdraw-status" style="font-size:12px; margin-top:10px; text-align:center;"></p>
        </div>
    `;

    // Másolás esemény
    document.getElementById('btc-addr-code').onclick = function() {
        navigator.clipboard.writeText(addr);
        alert("Cím másolva a vágólapra!");
    };
}

async function handleWithdrawRequest() {
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const destAddr = document.getElementById('withdraw-address').value.trim();
    const status = document.getElementById('withdraw-status');

    if (!amount || amount <= 0 || !destAddr) {
        alert("Kérlek adj meg minden adatot!");
        return;
    }

    if (amount > userProfile.real_balance) {
        status.innerText = "Hiba: Nincs elég egyenleged!";
        status.style.color = "#ff4646";
        return;
    }

    try {
        status.innerText = "Feldolgozás...";
        status.style.color = "var(--primary)";

        // 1. Kérelem mentése a withdrawals táblába
        const { error: withdrawErr } = await _supabase
            .from('withdrawals')
            .insert([{
                user_id: currentUser.id,
                username: userProfile.username,
                amount: amount,
                btc_address: destAddr,
                status: 'pending'
            }]);

        if (withdrawErr) throw withdrawErr;

        // 2. Egyenleg levonása a profilból
        const newBalance = userProfile.real_balance - amount;
        const { error: balanceErr } = await _supabase
            .from('profiles')
            .update({ real_balance: newBalance })
            .eq('id', currentUser.id);

        if (balanceErr) throw balanceErr;

        // Siker!
        userProfile.real_balance = newBalance;
        alert("Kifizetési kérelem elküldve!");
        location.reload();

    } catch (err) {
        console.error("Kifizetési hiba:", err);
        status.innerText = "Hiba történt. Próbáld újra később!";
        status.style.color = "#ff4646";
    }
}

// Futtatás
checkIPAndRenderWallet();
