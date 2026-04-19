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

    // 1. IP ELLENŐRZÉS (Kőkemény blokkolás)
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        
        if (data.country_code === 'HU') {
            walletContainer.innerHTML = `
                <div style="padding:30px; border:1px solid #ff4646; background:rgba(255,70,70,0.1); border-radius:12px; text-align:center; margin-top:20px;">
                    <p style="color:#ff4646; font-size:14px; font-weight:bold; margin:0;">
                        ⚠️ Korlátozás: Magyarország területéről a kriptovaluta funkciók nem érhetőek el.
                    </p>
                </div>`;
            console.log("Blokkolva: Magyarországi IP.");
            return; // ⛔️ STOP! Itt garantáltan kilép, semmi nem fut tovább.
        }
    } catch (e) {
        console.warn("Geo-IP hiba, de a biztonság kedvéért blokkolunk.");
        // Opcionális: Ha nem sikerül lekérdezni az IP-t, dönthetsz, hogy engeded-e. 
        // Én itt most megállítom, hogy biztosra menjünk.
        return; 
    }

    // 2. WALLET LOGIKA (Csak ha NEM magyar az IP)
    try {
        // Megnézzük, van-e már a user_id-hoz rendelt cím
        const { data: btcRow } = await _supabase
            .from('btc_pool')
            .select('address')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (btcRow) {
            userProfile.btc_address = btcRow.address;
        } else {
            // NINCS CÍM -> Keresünk egy szabadot
            const { data: freeRows } = await _supabase
                .from('btc_pool')
                .select('id, address')
                .is('user_id', null)
                .limit(1);

            if (freeRows && freeRows.length > 0) {
                const target = freeRows[0];
                
                // Lefoglaljuk a címet az adatbázisban
                const { data: updated, error: upErr } = await _supabase
                    .from('btc_pool')
                    .update({ 
                        user_id: currentUser.id, 
                        is_allocated: true 
                    })
                    .eq('id', target.id)
                    .select();

                if (!upErr && updated && updated.length > 0) {
                    userProfile.btc_address = updated[0].address;
                    // Szinkron a profil táblával
                    await _supabase.from('profiles')
                        .update({ btc_address: updated[0].address })
                        .eq('id', currentUser.id);
                }
            }
        }
        
        // Megjelenítés
        renderCryptoCard(walletContainer);

    } catch (e) {
        console.error("Hiba a BTC modulban:", e);
        walletContainer.innerHTML = "<p>Szerver hiba a pénztárca betöltésekor.</p>";
    }
}

function renderCryptoCard(container) {
    const addr = userProfile.btc_address || "Nincs szabad BTC cím a rendszerben.";
    
    container.innerHTML = `
        <div class="market-card" style="border: 1px solid var(--primary); background: rgba(0,212,255,0.05); padding: 20px; border-radius: 12px; margin-top: 20px;">
            <h4 style="color:var(--primary); margin-top:0;">BTC Wallet</h4>
            
            <p style="font-size:12px; margin-bottom:10px; color:#aaa;">Befizetési címed:</p>
            <code id="btc-copy" style="display:block; background:#000; padding:15px; border-radius:8px; border: 1px dashed var(--primary); word-break:break-all; font-family:monospace; font-size:12px; color:var(--primary); cursor:pointer; text-align:center;">
                ${addr}
            </code>
            <p style="font-size:10px; color:#666; margin-top:8px; text-align:center;">(Kattints a címre a másoláshoz)</p>
            
            <hr style="border:0; border-top:1px solid #333; margin:20px 0;">
            
            <h4 style="margin-bottom:15px; font-size:14px;">Kifizetés (€)</h4>
            <input type="number" id="w-amt" placeholder="Összeg (€)" style="width:100%; margin-bottom:10px; background:#111; border:1px solid #333; color:white; padding:12px; border-radius:5px;">
            <input type="text" id="w-adr" placeholder="Cél BTC cím (bc1...)" style="width:100%; margin-bottom:15px; background:#111; border:1px solid #333; color:white; padding:12px; border-radius:5px;">
            <button class="btn-primary" onclick="handleWithdraw()" style="width:100%; font-weight:bold; padding:12px;">KIFIZETÉSI KÉRELEM</button>
            <p id="withdraw-status" style="font-size:12px; margin-top:15px; text-align:center;"></p>
        </div>
    `;

    const copyEl = document.getElementById('btc-copy');
    if (copyEl && userProfile.btc_address) {
        copyEl.onclick = () => {
            navigator.clipboard.writeText(userProfile.btc_address);
            alert("BTC cím másolva!");
        };
    }
}

async function handleWithdraw() {
    const amtInput = document.getElementById('w-amt');
    const adrInput = document.getElementById('w-adr');
    const status = document.getElementById('withdraw-status');
    
    const amt = parseFloat(amtInput.value);
    const adr = adrInput.value.trim();

    if (!amt || amt <= 0 || !adr) {
        alert("Hibás adatok!");
        return;
    }

    if (amt > userProfile.real_balance) {
        status.innerText = "❌ Nincs elég fedezet!";
        status.style.color = "#ff4646";
        return;
    }

    try {
        status.innerText = "Kérelem rögzítése...";
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

        alert("Sikeres kifizetési kérelem!");
        location.reload();

    } catch (err) {
        console.error(err);
        status.innerText = "❌ Hiba történt.";
        status.style.color = "#ff4646";
    }
}

// Start
checkIPAndRenderWallet();
