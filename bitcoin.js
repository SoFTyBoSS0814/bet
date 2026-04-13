/**
 * STAKEFORGE - BTC Module (Fix: Robust Initialization)
 */

async function checkIPAndRenderWallet() {
    const walletContainer = document.getElementById('btc-wallet-area');
    if (!walletContainer) return;

    console.log("BTC Modul inicializálása...");

    // Ha még nem töltött be a profil, próbálkozzunk újra, de csak 10-szer
    let retryCount = 0;
    const maxRetries = 10;

    const waitForData = setInterval(async () => {
        const isDataReady = typeof currentUser !== 'undefined' && currentUser !== null;
        
        if (isDataReady) {
            clearInterval(waitForData);
            await proceedWithIPCheck(walletContainer);
        } else {
            retryCount++;
            if (retryCount >= maxRetries) {
                clearInterval(waitForData);
                console.error("Hiba: Nem sikerült betölteni a felhasználói adatokat.");
                walletContainer.innerHTML = "<p>Kérlek jelentkezz be újra a tárca eléréséhez.</p>";
            }
        }
    }, 500);
}

async function proceedWithIPCheck(walletContainer) {
    try {
        console.log("IP ellenőrzés indítása...");
        const res = await fetch('https://ipapi.co/json/');
        const ipData = await res.json();
        
        // --- TESZTELÉSHEZ: Ha látni akarod HU-ból is, írd át true-ra az alábbi részt ---
        if (ipData.country_code === 'HU') {
            walletContainer.innerHTML = `
                <div style="padding:20px; border:1px solid #ff4646; background:rgba(255,70,70,0.1); border-radius:8px; margin-top:20px;">
                    <p style="color:#ff4646; font-size:13px; margin:0; font-weight:bold; text-align:center;">
                        ⚠️ Funkciók korlátozva: A kriptovaluta szolgáltatások az Ön régiójában (HU) jelenleg nem elérhetőek.
                    </p>
                </div>`;
            return;
        }

        // Ha van VPN és átment az IP szűrőn:
        if (!userProfile.btc_address) {
            console.log("Nincs cím a profilban, lekérés a poolból...");
            await grabAddressFromPool();
        }

        renderCryptoCard(walletContainer);
        
    } catch (e) {
        console.error("Hiba az IP ellenőrzés során:", e);
        // Hiba esetén (pl. adblocker blokkolja az ipapi-t) alapértelmezetten engedjük a renderelést
        renderCryptoCard(walletContainer);
    }
}

async function grabAddressFromPool() {
    try {
        // 1. Megnézzük, van-e már a btc_pool-ban cím
        const { data: existingEntry } = await _supabase
            .from('btc_pool')
            .select('address')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (existingEntry) {
            userProfile.btc_address = existingEntry.address;
            return;
        }

        // 2. Szabad cím foglalása
        const { data: assignedAddr, error: updateError } = await _supabase
            .from('btc_pool')
            .update({ is_allocated: true, user_id: currentUser.id })
            .eq('is_allocated', false)
            .order('id', { ascending: true })
            .select('address')
            .limit(1)
            .maybeSingle();

        if (updateError || !assignedAddr) {
            console.warn("Nem sikerült címet foglalni.");
            return;
        }

        // 3. Profil szinkron
        await _supabase.from('profiles').update({ btc_address: assignedAddr.address }).eq('id', currentUser.id);
        userProfile.btc_address = assignedAddr.address;

    } catch (err) {
        console.error("Pool hiba:", err);
    }
}

function renderCryptoCard(container) {
    const btcAddr = userProfile.btc_address || "Nincs elérhető cím. Frissíts rá!";
    
    container.innerHTML = `
        <div class="market-card" style="border: 1px solid var(--primary); background: rgba(0,212,255,0.05); margin-top:20px; text-align:left; padding:15px; border-radius:10px;">
            <h4 style="color:var(--primary); margin-top:0;">BTC Deposit Panel</h4>
            <p style="font-size:12px; color:#aaa; margin-bottom:10px;">Your Personal Deposit Address:</p>
            <code id="copy-btc" style="display:block; background:#000; padding:12px; border-radius:5px; word-break:break-all; font-size:11px; color:var(--primary); border: 1px dashed var(--primary); cursor:pointer;">
                ${btcAddr}
            </code>
            <small style="color:var(--primary); font-size:10px; margin-top:5px; display:block;">(Kattints a másoláshoz)</small>
            
            <hr style="border:0; border-top:1px solid #333; margin:20px 0;">
            
            <h4 style="margin-bottom:10px;">Withdraw</h4>
            <input type="number" id="withdraw-amount" placeholder="Amount (€)" style="width:100%; margin-bottom:10px; padding:8px; background:#111; border:1px solid #333; color:#fff;">
            <input type="text" id="withdraw-dest" placeholder="Target BTC Address" style="width:100%; margin-bottom:15px; padding:8px; background:#111; border:1px solid #333; color:#fff;">
            <button class="btn-primary" id="withdraw-btn" style="width:100%;">SEND REQUEST</button>
            <p id="withdraw-status" style="font-size:12px; margin-top:10px; display:none;"></p>
        </div>
    `;

    document.getElementById('copy-btc').onclick = () => {
        navigator.clipboard.writeText(btcAddr);
        alert("Cím másolva!");
    };

    document.getElementById('withdraw-btn').onclick = handleWithdrawRequest;
}

// A kifizetés függvény marad az előző verzióból...
async function handleWithdrawRequest() {
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const dest = document.getElementById('withdraw-dest').value.trim();
    const status = document.getElementById('withdraw-status');

    if (!amount || !dest) return alert("Minden mezőt tölts ki!");
    if (amount > userProfile.real_balance) return alert("Nincs elég egyenleg!");

    try {
        status.innerText = "Processing...";
        status.style.display = "block";

        const { error } = await _supabase.from('withdrawals').insert([{
            user_id: currentUser.id,
            amount: amount,
            btc_address: dest,
            status: 'pending'
        }]);

        if (error) throw error;

        alert("Sikeres kérelem!");
        location.reload();
    } catch (err) {
        status.innerText = "Hiba: " + err.message;
    }
}

// Indítás
loadSavedBTC();
