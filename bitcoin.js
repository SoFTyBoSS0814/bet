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
            return; // Megállítjuk a folyamatot, nem tölt be a wallet
        }
    } catch (e) {
        console.warn("IP ellenőrzés sikertelen, de a rendszer folytatja a betöltést.");
    }

    // 2. WALLET LOGIKA (Cím lekérése/kiosztása)
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
            // Ha nincs, keresünk egy olyan sort, ahol a user_id MÉG NULL
            const { data: freeRows } = await _supabase
                .from('btc_pool')
                .select('id, address')
                .is('user_id', null)
                .limit(1);

            if (freeRows && freeRows.length > 0) {
                const target = freeRows[0];
                // Lefoglaljuk a címet
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
                    // Szinkronizáljuk a profil táblával is
                    await _supabase.from('profiles').update({ btc_address: target.address }).eq('id', currentUser.id);
                }
            }
        }
        
        // Megjelenítjük a kezelőfelületet
        renderCryptoCard(walletContainer);

    } catch (e) {
        console.error("Hiba történt a BTC modulban:", e);
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
            <p id="withdraw-status" style="font-size:11px; margin-top:10px;"></p>
        </div>
    `;

    document.getElementById('btc-copy').onclick = () => {
        if (userProfile.btc_address) {
            navigator.clipboard.writeText(addr);
            alert("BTC cím másolva!");
        }
    };
}

async function handleWithdraw() {
    const amtInput = document.getElementById('w-amt');
    const adrInput = document.getElementById('w-adr');
    const status = document.getElementById('withdraw-status');
    
    const amt = parseFloat(amtInput.value);
    const adr = adrInput.value.trim();

    // 1. Alapadatok ellenőrzése
    if (!amt || amt <= 0 || !adr) {
        alert("Kérlek adj meg érvényes összeget és BTC címet!");
        return;
    }

    // 2. Egyenleg ellenőrzése (STOP)
    if (amt > userProfile.real_balance) {
        status.innerText = "❌ Hiba: Nincs elég egyenleged!";
        status.style.color = "#ff4646";
        alert("Nincs elég fedezet a számládon!");
        return;
    }

    try {
        status.innerText = "Feldolgozás...";
        status.style.color = "var(--primary)";

        // 3. Kifizetési kérelem mentése
        const { error: insErr } = await _supabase.from('withdrawals').insert([{
            user_id: currentUser.id,
            username: userProfile.username,
            amount: amt,
            btc_address: adr,
            status: 'pending'
        }]);

        if (insErr) throw insErr;

        // 4. Egyenleg levonása az adatbázisból
        const { error: upErr } = await _supabase
            .from('profiles')
            .update({ real_balance: userProfile.real_balance - amt })
            .eq('id', currentUser.id);

        if (upErr) throw upErr;

        // Siker!
        alert("Kifizetési kérelem sikeresen rögzítve!");
        location.reload();

    } catch (err) {
        console.error(err);
        status.innerText = "❌ Hiba történt a kérés során.";
        status.style.color = "#ff4646";
    }
}

// Inicializálás
checkIPAndRenderWallet();
