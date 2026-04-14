/**
 * STAKEFORGE - BTC Module (Final Production Version)
 */

async function checkIPAndRenderWallet() {
    const walletContainer = document.getElementById('btc-wallet-area');
    if (!walletContainer) return;

    // Bevárjuk a profil adatokat (currentUser és userProfile)
    if (typeof userProfile === 'undefined' || !userProfile || typeof currentUser === 'undefined' || !currentUser) {
        setTimeout(() => checkIPAndRenderWallet(), 500);
        return;
    }

    // 1. IP ELLENŐRZÉS (Magyarországi tiltás)
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        
        if (data.country_code === 'HU') {
            walletContainer.innerHTML = `
                <div style="padding:20px; border:1px solid #ff4646; background:rgba(255,70,70,0.1); border-radius:8px; text-align:center; margin-top:20px;">
                    <p style="color:#ff4646; font-size:13px; font-weight:bold; margin:0;">
                        ⚠️ Figyelem: Magyarország területéről a kriptovaluta BE/KI fizetés nem lehetséges.
                    </p>
                </div>`;
            return; 
        }
    } catch (e) {
        console.warn("IP ellenőrzés sikertelen.");
    }

    // 2. WALLET LOGIKA
    try {
        const { data: btcRow } = await _supabase
            .from('btc_pool')
            .select('address')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (btcRow) {
            userProfile.btc_address = btcRow.address;
        } else {
            const { data: freeRows } = await _supabase
                .from('btc_pool')
                .select('id, address')
                .is('user_id', null)
                .limit(1);

            if (freeRows && freeRows.length > 0) {
                const target = freeRows[0];
                const { data: updated } = await _supabase
                    .from('btc_pool')
                    .update({ 
                        user_id: currentUser.id, 
                        is_allocated: true 
                    })
                    .eq('id', target.id)
                    .select();

                if (updated) {
                    userProfile.btc_address = target.address;
                    await _supabase.from('profiles').update({ btc_address: target.address }).eq('id', currentUser.id);
                }
            }
        }
        renderCryptoCard(walletContainer);
    } catch (e) {
        console.error("Hiba a BTC modulban:", e);
        renderCryptoCard(walletContainer);
    }
}

function renderCryptoCard(container) {
    const addr = userProfile.btc_address || "Nincs elérhető cím (Pool Error)";
    
    container.innerHTML = `
        <div class="market-card" style="border: 1px solid var(--primary); background: rgba(0,212,255,0.05); padding: 15px; border-radius: 8px; margin-top: 20px;">
            <h4 style="color:var(--primary); margin-top:0;">BTC Deposit / Withdraw</h4>
            
            <p style="font-size:12px; margin-bottom:5px; color:#aaa;">Saját BTC befizetési címed:</p>
            <code id="btc-copy" style="display:block; background:#000; padding:12px; border-radius:5px; border: 1px dashed var(--primary); word-break:break-all; font-family:monospace; font-size:11px; color:var(--primary); cursor:pointer;">
                ${addr}
            </code>
            <p style="font-size:10px; color:#555; margin-top:5px;">(Kattints a címre a másoláshoz)</p>
            
            <hr style="border:0; border-top:1px solid #333; margin:15px 0;">
            
            <h4 style="margin-bottom:10px; font-size:14px;">Kifizetés indítása</h4>
            <input type="number" id="w-amt" placeholder="Összeg (€)" style="width:100%; margin-bottom:8px; background:#111; border:1px solid #333; color:white; padding:8px;">
            <input type="text" id="w-adr" placeholder="Cél BTC cím (bc1q...)" style="width:100%; margin-bottom:12px; background:#111; border:1px solid #333; color:white; padding:8px;">
            <button class="btn-primary" onclick="handleWithdraw()" style="width:100%; font-weight:bold;">KIFIZETÉSI KÉRELEM</button>
            <p id="withdraw-status" style="font-size:14px; font-weight:bold; margin-top:10px; text-align:center; min-height:20px;"></p>
        </div>
    `;

    document.getElementById('btc-copy').onclick = () => {
        if (userProfile.btc_address) {
            navigator.clipboard.writeText(addr);
            // Itt maradhat az alert, mert ez egy pozitív visszajelzés (vagy lecserélheted)
            alert("BTC cím másolva!");
        }
    };
}

async function handleWithdraw() {
    const amtInput = document.getElementById('w-amt');
    const adrInput = document.getElementById('w-adr');
    const status = document.getElementById('withdraw-status');
    const walletErr = document.getElementById('wallet-error-msg'); // A HTML-ben lévő piros sáv
    
    const amt = parseFloat(amtInput.value);
    const adr = adrInput.value.trim();

    // Reset hibaüzenetek
    if(status) status.innerText = "";
    if(walletErr) walletErr.innerText = "";

    // 1. Alapadatok ellenőrzése
    if (!amt || amt <= 0 || !adr) {
        if(walletErr) walletErr.innerText = "❌ Hiba: Adj meg összeget és címet!";
        return;
    }

    // 2. Egyenleg ellenőrzése - ITT VOLT AZ ALERT TÖRLÉSE
    if (amt > userProfile.real_balance) {
        if(walletErr) {
            walletErr.innerText = "❌ Hiba: Nincs elég fedezet a számládon!";
        } else if(status) {
            status.innerText = "❌ Hiba: Nincs elég fedezet!";
            status.style.color = "#ff4646";
        }
        return;
    }

    try {
        status.innerText = "Feldolgozás...";
        status.style.color = "var(--primary)";

        const { error: insErr } = await _supabase.from('withdrawals').insert([{
            user_id: currentUser.id,
            username: userProfile.username,
            amount: amt,
            btc_address: adr,
            status: 'pending'
        }]);

        if (insErr) throw insErr;

        const { error: upErr } = await _supabase
            .from('profiles')
            .update({ real_balance: userProfile.real_balance - amt })
            .eq('id', currentUser.id);

        if (upErr) throw upErr;

        // Sikeres kifizetésnél maradhat egy utolsó alert vagy egy státusz üzenet
        status.innerText = "✅ Kérelem sikeresen rögzítve!";
        status.style.color = "var(--success)";
        
        setTimeout(() => location.reload(), 2000);

    } catch (err) {
        console.error(err);
        status.innerText = "❌ Hiba történt a kérés során.";
        status.style.color = "#ff4646";
    }
}

checkIPAndRenderWallet();
