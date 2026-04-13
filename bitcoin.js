/**
 * STAKEFORGE - BTC Module (Hibatűrő verzió)
 */

async function checkIPAndRenderWallet() {
    const walletContainer = document.getElementById('btc-wallet-area');
    if (!walletContainer) return;

    console.log("BTC Modul: Ellenőrzés indítása...");

    // 1. Kényszerített várakozás a globális adatokra (max 3 másodperc)
    let attempts = 0;
    const checkData = setInterval(async () => {
        attempts++;
        const hasUser = typeof currentUser !== 'undefined' && currentUser !== null;
        
        if (hasUser) {
            clearInterval(checkData);
            console.log("BTC Modul: Felhasználó bebetöltve, IP csekk jön...");
            await runBtcFlow(walletContainer);
        } else if (attempts > 30) { // 15 másodperc után feladjuk
            clearInterval(checkData);
            console.error("BTC Modul: Nem érkezett meg a currentUser adat.");
            walletContainer.innerHTML = "<p style='color:gray;'>Betöltés sikertelen. Kérlek frissíts!</p>";
        }
    }, 500);
}

async function runBtcFlow(walletContainer) {
    let country = "UNKNOWN";

    try {
        // IP Ellenőrzés időkorláttal (ha a VPN lassú, ne várjunk 10 mp-et)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 mp limit

        const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        const ipData = await res.json();
        country = ipData.country_code;
        clearTimeout(timeoutId);
    } catch (e) {
        console.warn("BTC Modul: IP API nem elérhető, biztonsági mód bekapcsolva.");
    }

    // Magyarországi korlátozás
    if (country === 'HU') {
        walletContainer.innerHTML = `
            <div style="padding:20px; border:1px solid #ff4646; background:rgba(255,70,70,0.1); border-radius:8px; margin-top:20px;">
                <p style="color:#ff4646; font-size:13px; margin:0; font-weight:bold; text-align:center;">
                    ⚠️ Funkciók korlátozva: A kriptovaluta szolgáltatások az Ön régiójában (HU) jelenleg nem elérhetőek.
                </p>
            </div>`;
        return;
    }

    // Ha átment a szűrőn (vagy ismeretlen az IP), generálunk/lekérünk címet
    await ensureBtcAddress();
    renderCryptoCard(walletContainer);
}

async function ensureBtcAddress() {
    try {
        // Ellenőrizzük, van-e már a poolban címe
        const { data: entry } = await _supabase
            .from('btc_pool')
            .select('address')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (entry) {
            userProfile.btc_address = entry.address;
            return;
        }

        // Ha nincs, kiveszünk egy újat
        const { data: assigned, error } = await _supabase
            .from('btc_pool')
            .update({ is_allocated: true, user_id: currentUser.id })
            .eq('is_allocated', false)
            .order('id', { ascending: true })
            .select('address')
            .limit(1)
            .maybeSingle();

        if (assigned) {
            userProfile.btc_address = assigned.address;
            // Profil szinkronizálása a háttérben
            await _supabase.from('profiles').update({ btc_address: assigned.address }).eq('id', currentUser.id);
        }
    } catch (err) {
        console.error("Cím biztosítási hiba:", err);
    }
}

function renderCryptoCard(container) {
    const address = userProfile.btc_address || "Cím lekérése sikertelen...";
    
    container.innerHTML = `
        <div class="market-card" style="border: 1px solid var(--primary); background: rgba(0,212,255,0.05); margin-top:20px; padding:15px; border-radius:10px;">
            <h4 style="color:var(--primary); margin:0 0 10px 0;">BTC Deposit</h4>
            <div id="copy-addr" style="cursor:pointer; background:#000; padding:12px; border-radius:5px; border: 1px dashed var(--primary); word-break:break-all; font-family:monospace; font-size:11px; color:var(--primary);">
                ${address}
            </div>
            <p style="font-size:10px; color:#aaa; margin-top:5px;">Kattints a címre a másoláshoz.</p>
            
            <hr style="border:0; border-top:1px solid #333; margin:20px 0;">
            
            <h4 style="margin-bottom:10px;">Withdraw</h4>
            <input type="number" id="w-amount" placeholder="Összeg (€)" style="width:100%; margin-bottom:10px; padding:8px; background:#111; border:1px solid #333; color:#fff;">
            <input type="text" id="w-dest" placeholder="BTC fogadó cím" style="width:100%; margin-bottom:15px; padding:8px; background:#111; border:1px solid #333; color:#fff;">
            <button class="btn-primary" onclick="executeWithdraw()" style="width:100%;">KIFIZETÉS INDÍTÁSA</button>
        </div>
    `;

    document.getElementById('copy-addr').onclick = () => {
        navigator.clipboard.writeText(address);
        alert("Cím másolva!");
    };
}

async function executeWithdraw() {
    const amt = parseFloat(document.getElementById('w-amount').value);
    const dest = document.getElementById('w-dest').value.trim();

    if (!amt || !dest) return alert("Tölts ki minden mezőt!");
    if (amt > userProfile.real_balance) return alert("Nincs elég egyenleged!");

    const { error } = await _supabase.from('withdrawals').insert([{
        user_id: currentUser.id,
        amount: amt,
        btc_address: dest,
        status: 'pending'
    }]);

    if (error) alert("Hiba: " + error.message);
    else {
        alert("Kérelem elküldve!");
        location.reload();
    }
}

// Indítás azonnal
checkIPAndRenderWallet();
