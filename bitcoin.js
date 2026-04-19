/**
 * STAKEFORGE - BTC Module (Golyóálló IP-szűrővel)
 */

async function checkIPAndRenderWallet() {
    const walletContainer = document.getElementById('btc-wallet-area');
    if (!walletContainer) return;

    // --- 1. KRITIKUS SOROMPÓ (IP ELLENŐRZÉS) ---
    // Megvárjuk az IP választ, mielőtt BÁRMI mást tennénk
    try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const ipData = await ipRes.json();
        
        if (ipData.country_code === 'HU') {
            console.log("Blokkolva: Magyar IP. Adatbázis műveletek leállítva.");
            
            // Megmutatjuk a tiltó üzenetet az index.html-ben
            const geoMsg = document.getElementById('geo-restriction');
            if (geoMsg) geoMsg.style.display = 'block';
            
            // Kiürítjük a wallet helyét, hogy ne is próbáljon megjelenni
            walletContainer.innerHTML = '';
            return; // ⛔️ STOP! Itt a kód végleg megáll. Nem megy tovább a Supabase-hez.
        }
    } catch (err) {
        console.error("Geo-IP hiba, biztonsági blokk.");
        return;
    }

    // --- 2. ADATOK BEVÁRÁSA ---
    // Csak ha NEM magyar, akkor várjuk meg a profiladatokat
    if (typeof userProfile === 'undefined' || !userProfile || typeof currentUser === 'undefined' || !currentUser) {
        setTimeout(() => checkIPAndRenderWallet(), 500);
        return;
    }

    // --- 3. CSAK KÜLFÖLDI IP ESETÉN FUT LE EZ A RÉSZ ---
    try {
        // Megnézzük, van-e már címe (csak lekérdezés)
        const { data: btcRow } = await _supabase
            .from('btc_pool')
            .select('address')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (btcRow) {
            userProfile.btc_address = btcRow.address;
        } else {
            // HA NINCS CÍM, CSAK MOST FOGLALUNK LE EGYET
            const { data: freeRows } = await _supabase
                .from('btc_pool')
                .select('id, address')
                .is('user_id', null)
                .limit(1);

            if (freeRows && freeRows.length > 0) {
                const target = freeRows[0];
                
                // Ez az a sor, ami "generálja" (beírja) a user_id-t:
                const { data: updated } = await _supabase
                    .from('btc_pool')
                    .update({ 
                        user_id: currentUser.id, 
                        is_allocated: true 
                    })
                    .eq('id', target.id)
                    .select();

                if (updated && updated.length > 0) {
                    userProfile.btc_address = updated[0].address;
                }
            }
        }
        
        // Kirajzoljuk a felületet (függvény lentebb)
        renderCryptoCard(walletContainer);

    } catch (e) {
        console.error("Adatbázis hiba:", e);
    }
}

// A kártya kirajzolása (külföldieknek)
function renderCryptoCard(container) {
    const addr = userProfile.btc_address || "Nincs szabad cím.";
    container.innerHTML = `
        <div class="market-card" style="border: 1px solid var(--primary); padding: 20px; border-radius: 12px;">
            <h4 style="color:var(--primary)">BTC Deposit</h4>
            <code style="display:block; background:#000; padding:15px; border: 1px dashed var(--primary); color:var(--primary); word-break:break-all;">
                ${addr}
            </code>
            <p style="font-size:10px; color:#666; margin-top:10px;">Kattints a címre a másoláshoz</p>
        </div>
    `;
}

// INDÍTÁS
checkIPAndRenderWallet();
