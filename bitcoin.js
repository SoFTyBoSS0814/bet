/**
 * STAKEFORGE - BTC Module (Final Sync)
 */

async function checkIPAndRenderWallet() {
    const walletContainer = document.getElementById('btc-wallet-area');
    if (!walletContainer) return;

    // Bevárjuk a globális adatokat (currentUser, userProfile)
    if (typeof userProfile === 'undefined' || !userProfile || typeof currentUser === 'undefined' || !currentUser) {
        setTimeout(() => checkIPAndRenderWallet(), 500);
        return;
    }

    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        
        // IP Ellenőrzés (Magyarország tiltása)
        if (data.country_code === 'HU') {
            walletContainer.innerHTML = `<p style="color:var(--danger); font-size:13px; margin-top:15px; font-weight:bold; text-align:center;">⚠️ A szolgáltatás az Ön régiójában (HU) nem elérhető.</p>`;
            return;
        }

        // 1. Megnézzük, van-e már a btc_pool táblában ehhez a userhez rendelt cím
        if (!userProfile.btc_address) {
            const { data: assigned, error: fetchErr } = await _supabase
                .from('btc_pool')
                .select('address')
                .eq('user_id', currentUser.id)
                .maybeSingle();

            if (assigned) {
                userProfile.btc_address = assigned.address;
            } else {
                // 2. Ha még nincs, kérünk egyet a poolból (ahol is_allocated = false)
                await grabAddressFromPool();
            }
        }

        renderCryptoCard(walletContainer);
        
    } catch (e) {
        console.error("Betöltési hiba:", e);
        // VPN/Timeout esetén is rendereljünk
        renderCryptoCard(walletContainer);
    }
}

async function grabAddressFromPool() {
    try {
        // A legkisebb ID-jú szabad cím lefoglalása
        const { data: target, error: updateErr } = await _supabase
            .from('btc_pool')
            .update({ 
                is_allocated: true, 
                user_id: currentUser.id 
            })
            .eq('is_allocated', false)
            .order('id', { ascending: true })
            .select('address')
            .limit(1)
            .maybeSingle();

        if (updateErr) throw updateErr;

        if (target) {
            userProfile.btc_address = target.address;
            // Szinkronizáljuk a profiles táblával is a biztonság kedvéért
            await _supabase.from('profiles').update({ btc_address: target.address }).eq('id', currentUser.id);
        }
    } catch (err) {
        console.error("Pool hiba:", err);
    }
}

function renderCryptoCard(container) {
    const btcAddr = userProfile.btc_address || "Cím generálása folyamatban... Frissíts rá!";
    
    container.innerHTML = `
        <div class="market-card" style="border: 1px solid var(--primary); background: rgba(0,212,255,0.05); margin-top:20px; text-align:left; padding: 15px; border-radius: 8px;">
            <h4 style="color:var(--primary); margin-top:0;">Secure Crypto Gateway</h4>
            
            <p style="font-size:12px; margin-bottom:5px; color:#aaa;">Your Personal BTC Deposit Address:</p>
            <code id="btc-copy-btn" style="display:block; background:#000; padding:12px; border-radius:5px; word-break:break-all; font-size:11px; color:var(--primary); border: 1px dashed var(--primary); cursor:pointer;">
                ${btcAddr}
            </code>
            <p style="font-size:10px; color:var(--primary); margin-top:5px;">(Kattints a másoláshoz)</p>
            
            <hr style="border:0; border-top:1px solid var(--border); margin:15px 0;">
            
            <h4 style="margin-bottom:10px; font-size:14px;">Withdraw Funds</h4>
            <div style="display:flex; flex-direction:column; gap:8px;">
                <input type="number" id="withdraw-amount" placeholder="Amount (€)" style="width:100%;">
                <input type="text" id="withdraw-dest" placeholder="Target BTC Address" style="width:100%;">
                <button class="btn-primary" id="withdraw-btn" style="width:100%; padding:10px;">REQUEST WITHDRAWAL</button>
            </div>
            <p id="withdraw-status" style="font-size:12px; margin-top:10px; font-weight:bold;"></p>
        </div>
    `;

    // Másolás funkció
    document.getElementById('btc-copy-btn').onclick = () => {
        if(userProfile.btc_address) {
            navigator.clipboard.writeText(userProfile.btc_address);
            alert("Cím másolva a vágólapra!");
        }
    };

    document.getElementById('withdraw-btn').onclick = handleWithdrawRequest;
}

async function handleWithdrawRequest() {
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const dest = document.getElementById('withdraw-dest').value.trim();
    const status = document.getElementById('withdraw-status');

    if (isNaN(amount) || amount <= 0 || !dest) {
        alert("Kérlek adj meg minden adatot!");
        return;
    }

    // --- BIZTONSÁGI ELLENŐRZÉS ---
    if (amount > userProfile.real_balance) {
        status.innerText = "❌ Nincs elég egyenleged!";
        status.style.color = "var(--danger)";
        alert("Nincs elég egyenleged!");
        return; 
    }

    try {
        status.innerText = "Processing...";
        status.style.color = "var(--primary)";

        // 1. Withdrawals táblába beszúrás
        const { error: insErr } = await _supabase.from('withdrawals').insert([{
            user_id: currentUser.id,
            username: userProfile.username,
            amount: amount,
            btc_address: dest,
            status: 'pending'
        }]);

        if (insErr) throw insErr;

        // 2. Egyenleg levonása
        const { error: upErr } = await _supabase
            .from('profiles')
            .update({ real_balance: userProfile.real_balance - amount })
            .eq('id', currentUser.id);

        if (upErr) throw upErr;

        alert("Kifizetési kérelem sikeresen elküldve!");
        location.reload();

    } catch (err) {
        status.innerText = "❌ Hiba: " + err.message;
        status.style.color = "var(--danger)";
    }
}

// Modul indítása
checkIPAndRenderWallet();
