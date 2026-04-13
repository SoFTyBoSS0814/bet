/**
 * STAKEFORGE - BTC Module (Fix: RLS Compatible)
 */

async function checkIPAndRenderWallet() {
    const walletContainer = document.getElementById('btc-wallet-area');
    if (!walletContainer) return;

    // Bevárjuk a user adatokat
    if (typeof currentUser === 'undefined' || !currentUser) {
        setTimeout(() => checkIPAndRenderWallet(), 500);
        return;
    }

    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        
        if (data.country_code === 'HU') {
            walletContainer.innerHTML = `<p style="color:var(--danger); font-size:13px; font-weight:bold; text-align:center;">⚠️ Szolgáltatás korlátozva (HU).</p>`;
            return;
        }

        // Cím lekérése: Először a btc_pool-ból nézzük meg közvetlenül
        const { data: btcRow, error: btcErr } = await _supabase
            .from('btc_pool')
            .select('address')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (btcErr) console.error("Hiba a btc_pool lekérésekor:", btcErr);

        if (btcRow) {
            userProfile.btc_address = btcRow.address;
        } else {
            // Ha nincs azonosítóhoz rendelt cím, megpróbálunk egyet foglalni
            console.log("Nincs cím rendelve, foglalás indítása...");
            await grabAddressFromPool();
        }

        renderCryptoCard(walletContainer);
        
    } catch (e) {
        console.error("Váratlan hiba:", e);
        renderCryptoCard(walletContainer);
    }
}

async function grabAddressFromPool() {
    try {
        // Keressük meg a legkisebb ID-jú szabad címet
        const { data: freeAddrs } = await _supabase
            .from('btc_pool')
            .select('id, address')
            .is('user_id', null)
            .order('id', { ascending: true })
            .limit(1);

        if (!freeAddrs || freeAddrs.length === 0) {
            console.error("Nincs több szabad cím a poolban!");
            return;
        }

        const target = freeAddrs[0];

        // Foglaljuk le a címet a user UUID-jával
        const { data: updated, error: upErr } = await _supabase
            .from('btc_pool')
            .update({ 
                is_allocated: true, 
                user_id: currentUser.id 
            })
            .eq('id', target.id)
            .select();

        if (upErr) {
            console.error("Nem sikerült a foglalás (RLS hiba?):", upErr);
            return;
        }

        if (updated) {
            userProfile.btc_address = target.address;
            // Profil szinkronizálása
            await _supabase.from('profiles').update({ btc_address: target.address }).eq('id', currentUser.id);
        }
    } catch (err) {
        console.error("Kritikus hiba a grabAddress folyamatban:", err);
    }
}

function renderCryptoCard(container) {
    const btcAddr = userProfile.btc_address || "Nincs elérhető cím. Ellenőrizd az RLS szabályokat!";
    
    container.innerHTML = `
        <div class="market-card" style="border: 1px solid var(--primary); background: rgba(0,212,255,0.05); margin-top:20px; padding: 15px; border-radius: 8px;">
            <h4 style="color:var(--primary); margin: 0 0 10px 0;">BTC Deposit Panel</h4>
            <p style="font-size:12px; color:#aaa; margin-bottom:5px;">Your Unique Deposit Address:</p>
            <code id="btc-copy" style="display:block; background:#000; padding:12px; border-radius:5px; word-break:break-all; font-size:11px; color:var(--primary); border: 1px dashed var(--primary); cursor:pointer;">
                ${btcAddr}
            </code>
            
            <hr style="border:0; border-top:1px solid var(--border); margin:15px 0;">
            
            <h4 style="margin-bottom:10px; font-size:14px;">Withdrawal</h4>
            <input type="number" id="withdraw-amount" placeholder="Amount (€)" style="width:100%; margin-bottom:8px;">
            <input type="text" id="withdraw-dest" placeholder="Destination BTC Address" style="width:100%; margin-bottom:12px;">
            <button class="btn-primary" id="withdraw-btn" style="width:100%;">REQUEST WITHDRAWAL</button>
            <p id="withdraw-status" style="font-size:12px; margin-top:10px; font-weight:bold;"></p>
        </div>
    `;

    document.getElementById('btc-copy').onclick = () => {
        if(userProfile.btc_address) {
            navigator.clipboard.writeText(userProfile.btc_address);
            alert("Cím másolva!");
        }
    };

    document.getElementById('withdraw-btn').onclick = handleWithdrawRequest;
}

async function handleWithdrawRequest() {
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const dest = document.getElementById('withdraw-dest').value.trim();
    const status = document.getElementById('withdraw-status');

    if (isNaN(amount) || amount <= 0 || !dest) return alert("Hibás adatok!");

    if (amount > userProfile.real_balance) {
        status.innerText = "❌ Nincs elég egyenleged!";
        status.style.color = "var(--danger)";
        return;
    }

    const { error } = await _supabase.from('withdrawals').insert([{
        user_id: currentUser.id,
        username: userProfile.username,
        amount: amount,
        btc_address: dest,
        status: 'pending'
    }]);

    if (!error) {
        await _supabase.from('profiles').update({ real_balance: userProfile.real_balance - amount }).eq('id', currentUser.id);
        alert("Sikeres kérelem!");
        location.reload();
    }
}

checkIPAndRenderWallet();
