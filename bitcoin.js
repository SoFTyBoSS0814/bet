/**
 * STAKEFORGE - BTC Module (Final Production Version)
 */

async function checkIPAndRenderWallet() {
    const walletContainer = document.getElementById('btc-wallet-area');
    if (!walletContainer) return;

    // 0. Bevárjuk a profil adatokat (currentUser és userProfile)
    if (typeof userProfile === 'undefined' || !userProfile || typeof currentUser === 'undefined' || !currentUser) {
        console.log("BTC Module: Waiting for user profile...");
        setTimeout(() => checkIPAndRenderWallet(), 500);
        return;
    }

    // 1. IP ELLENŐRZÉS AZONNAL (Magyarországi tiltás)
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        
        const geoMsg = document.getElementById('geo-restriction');

        if (data.country_code === 'HU') {
            console.log("STOP: Magyar IP észlelve. Generálás letiltva.");
            if(geoMsg) geoMsg.style.display = 'block'; // Megmutatjuk a piros figyelmeztetést
            walletContainer.innerHTML = ''; // Biztosra megyünk: üres marad a wallet helye
            return; // ⛔️ ITT VÉGE. Nem megy tovább az adatbázis felé!
        } else {
            if(geoMsg) geoMsg.style.display = 'none'; // Külföldi IP esetén elrejtjük a tiltó üzenetet
        }
    } catch (e) {
        console.warn("Geo-IP hiba, de biztonsági okokból nem generálunk.");
        return;
    }

    // 2. WALLET LOGIKA (Csak ha NEM magyar az IP, akkor fut le)
    try {
        // Megnézzük, van-e már a user_id-hoz rendelt cím a btc_pool-ban
        const { data: btcRow } = await _supabase
            .from('btc_pool')
            .select('address')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (btcRow) {
            userProfile.btc_address = btcRow.address;
        } else {
            // Ha nincs, keresünk egy szabad címet (ahol user_id IS NULL)
            const { data: freeRows } = await _supabase
                .from('btc_pool')
                .select('id, address')
                .is('user_id', null)
                .limit(1);

            if (freeRows && freeRows.length > 0) {
                const target = freeRows[0];
                
                // Lefoglaljuk a címet (Adatbázis UPDATE)
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
                    // Szinkronizáljuk a profiles táblával is
                    await _supabase.from('profiles')
                        .update({ btc_address: updated[0].address })
                        .eq('id', currentUser.id);
                }
            }
        }
        
        // 3. Ha minden megvan, kirajzoljuk a kártyát
        renderCryptoCard(walletContainer);

    } catch (e) {
        console.error("Hiba a BTC folyamatban:", e);
    }
}

function renderCryptoCard(container) {
    const addr = userProfile.btc_address || "Nincs szabad BTC cím a rendszerben.";
    
    container.innerHTML = `
        <div class="market-card" style="border: 1px solid var(--primary); background: rgba(0,212,255,0.05); padding: 20px; border-radius: 12px; margin-top: 20px;">
            <h4 style="color:var(--primary); margin-top:0;">BTC Deposit / Withdraw</h4>
            
            <p style="font-size:12px; margin-bottom:10px; color:#aaa;">Saját BTC befizetési címed:</p>
            <code id="btc-copy-btn" style="display:block; background:#000; padding:15px; border-radius:8px; border: 1px dashed var(--primary); word-break:break-all; font-family:monospace; font-size:12px; color:var(--primary); cursor:pointer; text-align:center;">
                ${addr}
            </code>
            <p style="font-size:10px; color:#666; margin-top:8px; text-align:center;">(Kattints a címre a másoláshoz)</p>
            
            <hr style="border:0; border-top:1px solid #333; margin:20px 0;">
            
            <h4 style="margin-bottom:15px; font-size:14px;">Kifizetés indítása</h4>
            <input type="number" id="w-amt" placeholder="Összeg (€)" style="width:100%; margin-bottom:10px; background:#111; border:1px solid #333; color:white; padding:12px; border-radius:5px;">
            <input type="text" id="w-adr" placeholder="Cél BTC cím (bc1...)" style="width:100%; margin-bottom:15px; background:#111; border:1px solid #333; color:white; padding:12px; border-radius:5px;">
            <button class="btn-primary" onclick="handleWithdraw()" style="width:100%; font-weight:bold; padding:12px;">KIFIZETÉSI KÉRELEM</button>
            <p id="withdraw-status" style="font-size:12px; margin-top:15px; text-align:center;"></p>
        </div>
    `;

    // Másolás funkció
    const copyEl = document.getElementById('btc-copy-btn');
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
        alert("Kérlek adj meg érvényes összeget és BTC címet!");
        return;
    }

    if (amt > userProfile.real_balance) {
        status.innerText = "❌ Hiba: Nincs elég egyenleged!";
        status.style.color = "#ff4646";
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

        alert("Kifizetési kérelem sikeresen rögzítve!");
        location.reload();

    } catch (err) {
        console.error(err);
        status.innerText = "❌ Hiba történt a kérés során.";
        status.style.color = "#ff4646";
    }
}

// Inicializálás - Ezt csak akkor hívd meg az index.html-ből, ha a Wallet szekció aktív!
// Vagy hagyd itt, ha azt akarod, hogy automatikusan csekkoljon betöltéskor:
checkIPAndRenderWallet();
