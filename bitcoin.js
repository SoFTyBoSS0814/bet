/**
 * STAKEFORGE - BTC Module (Emergency Fix)
 */

async function checkIPAndRenderWallet() {
    const walletContainer = document.getElementById('btc-wallet-area');
    if (!walletContainer) return;

    console.log("BTC Modul: Kényszerített indítás...");

    // 1. Megvárjuk a user adatokat, de max 5 másodpercig
    let attempts = 0;
    const waitForData = setInterval(async () => {
        attempts++;
        const dataReady = typeof currentUser !== 'undefined' && currentUser !== null;
        
        if (dataReady) {
            clearInterval(waitForData);
            await startBtcProcess(walletContainer);
        } else if (attempts > 10) { 
            clearInterval(waitForData);
            // Ha nincs adat, megpróbáljuk beolvasni a tárolt session-ből
            const session = JSON.parse(localStorage.getItem('sb-token') || '{}');
            if (session.user) {
                window.currentUser = session.user;
                await startBtcProcess(walletContainer);
            } else {
                walletContainer.innerHTML = "<p style='color:orange;'>Kérlek jelentkezz be!</p>";
            }
        }
    }, 500);
}

async function startBtcProcess(walletContainer) {
    // Először renderelünk egy "Betöltés" állapotot, hogy ne legyen üres a helye
    walletContainer.innerHTML = "<p style='color:var(--primary);'>Wallet inicializálása...</p>";

    let country = "ALLOW"; // Alapértelmezett: engedélyezve

    try {
        // Gyors IP csekk, ha 2 mp alatt nem válaszol, átugorjuk
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const res = await fetch('https://ipapi.co/json/', { signal: controller.signal }).catch(() => null);
        if (res) {
            const ipData = await res.json();
            country = ipData.country_code;
        }
        clearTimeout(timeoutId);
    } catch (e) {
        console.log("IP ellenőrzés kihagyva (VPN/Timeout).");
    }

    // Csak akkor blokkolunk, ha fixen HU-t kaptunk vissza
    if (country === 'HU') {
        walletContainer.innerHTML = `
            <div style="padding:15px; border:1px solid #ff4646; background:rgba(255,70,70,0.1); border-radius:8px; text-align:center;">
                <p style="color:#ff4646; font-size:12px; font-weight:bold; margin:0;">⚠️ Szolgáltatás HU területén korlátozva.</p>
            </div>`;
        return;
    }

    // Cím biztosítása
    await forceGetAddress();
    
    // Panel megjelenítése
    renderCryptoCard(walletContainer);
}

async function forceGetAddress() {
    try {
        // Ellenőrizzük a profilban
        if (typeof userProfile !== 'undefined' && userProfile.btc_address) return;

        // Ellenőrizzük a btc_pool táblában
        const { data: entry } = await _supabase
            .from('btc_pool')
            .select('address')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (entry) {
            if (typeof userProfile !== 'undefined') userProfile.btc_address = entry.address;
            return;
        }

        // Ha nincs, foglalunk egyet
        const { data: assigned } = await _supabase
            .from('btc_pool')
            .update({ is_allocated: true, user_id: currentUser.id })
            .eq('is_allocated', false)
            .order('id', { ascending: true })
            .select('address')
            .limit(1)
            .maybeSingle();

        if (assigned && typeof userProfile !== 'undefined') {
            userProfile.btc_address = assigned.address;
            await _supabase.from('profiles').update({ btc_address: assigned.address }).eq('id', currentUser.id);
        }
    } catch (err) {
        console.error("Cím hiba:", err);
    }
}

function renderCryptoCard(container) {
    const btcAddr = (typeof userProfile !== 'undefined' && userProfile.btc_address) ? userProfile.btc_address : "Cím nem található.";
    
    container.innerHTML = `
        <div class="market-card" style="border: 1px solid var(--primary); background: rgba(0,212,255,0.05); padding:15px; border-radius:10px;">
            <h4 style="color:var(--primary); margin:0 0 10px 0;">Bitcoin Deposit</h4>
            <div onclick="navigator.clipboard.writeText('${btcAddr}'); alert('Másolva!');" style="cursor:pointer; background:#000; padding:12px; border-radius:5px; border: 1px dashed var(--primary); word-break:break-all; font-family:monospace; font-size:11px; color:var(--primary);">
                ${btcAddr}
            </div>
            <p style="font-size:10px; color:#aaa; margin-top:5px; text-align:center;">Kattints a másoláshoz</p>
            
            <hr style="border:0; border-top:1px solid #333; margin:15px 0;">
            
            <input type="number" id="w-amt" placeholder="Összeg (€)" style="width:100%; margin-bottom:8px; padding:8px; background:#111; border:1px solid #333; color:#fff; font-size:13px;">
            <input type="text" id="w-adr" placeholder="Saját BTC címed" style="width:100%; margin-bottom:12px; padding:8px; background:#111; border:1px solid #333; color:#fff; font-size:13px;">
            <button class="btn-primary" onclick="processWithdraw()" style="width:100%; font-size:13px; padding:10px;">WITHDRAW</button>
        </div>
    `;
}

async function processWithdraw() {
    const amt = parseFloat(document.getElementById('w-amt').value);
    const adr = document.getElementById('w-adr').value.trim();
    if(!amt || !adr) return alert("Hiányzó adatok!");
    
    const { error } = await _supabase.from('withdrawals').insert([{
        user_id: currentUser.id,
        amount: amt,
        btc_address: adr,
        status: 'pending'
    }]);

    if(error) alert("Hiba: " + error.message);
    else { alert("Kérelem rögzítve!"); location.reload(); }
}

// Futás!
checkIPAndRenderWallet();
