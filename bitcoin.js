/**
 * STAKEFORGE - BTC Module (Final Production Version)
 */

async function checkIPAndRenderWallet() {
    const walletContainer = document.getElementById('btc-wallet-area');
    if (!walletContainer) return;

    // Profil adatok bevárása (biztosítjuk, hogy a currentUser és userProfile elérhető)
    if (typeof userProfile === 'undefined' || !userProfile || typeof currentUser === 'undefined') {
        setTimeout(() => checkIPAndRenderWallet(), 500);
        return;
    }

    try {
        // IP Ellenőrzés (HU korlátozás)
        const res = await fetch('https://ipapi.co/json/');
        const ipData = await res.json();
        
        if (ipData.country_code === 'HU') {
            walletContainer.innerHTML = `
                <div style="padding:20px; border:1px solid var(--danger); background:rgba(255,70,70,0.1); border-radius:8px;">
                    <p style="color:var(--danger); font-size:13px; margin:0; font-weight:bold;">
                        ⚠️ Funkciók korlátozva: A kriptovaluta szolgáltatások az Ön régiójában (HU) jelenleg nem elérhetőek.
                    </p>
                </div>`;
            return;
        }

        // Cím lekérése vagy kiosztása
        if (!userProfile.btc_address) {
            await grabAddressFromPool();
        }

        renderCryptoCard(walletContainer);
        
    } catch (e) {
        console.error("Hiba a BTC modul betöltésekor:", e);
        walletContainer.innerHTML = "<p>Hiba történt a pénztárca betöltésekor.</p>";
    }
}

async function grabAddressFromPool() {
    try {
        // 1. Megnézzük, van-e már a btc_pool-ban ehhez a userhez rendelt cím
        const { data: existingEntry, error: fetchError } = await _supabase
            .from('btc_pool')
            .select('address')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (existingEntry) {
            userProfile.btc_address = existingEntry.address;
            return;
        }

        // 2. Ha nincs, kiveszünk egy szabad címet és rögtön hozzárendeljük (Atomikus művelet)
        const { data: assignedAddr, error: updateError } = await _supabase
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

        if (updateError || !assignedAddr) {
            console.error("Nem sikerült címet foglalni a poolból:", updateError);
            return;
        }

        // 3. Profil frissítése a gyorsabb elérés érdekében
        await _supabase
            .from('profiles')
            .update({ btc_address: assignedAddr.address })
            .eq('id', currentUser.id);

        userProfile.btc_address = assignedAddr.address;

    } catch (err) {
        console.error("Kritikus hiba a pool kezelésekor:", err);
    }
}

function renderCryptoCard(container) {
    const btcAddr = userProfile.btc_address || "Cím generálása folyamatban... Frissíts rá!";
    
    container.innerHTML = `
        <div class="market-card" style="border: 1px solid var(--primary); background: rgba(0,212,255,0.05); margin-top:20px; text-align:left;">
            <h4 style="color:var(--primary); margin-top:0;">BTC Deposit/Withdraw Panel</h4>
            
            <p style="font-size:13px; margin-bottom:5px; color:#aaa;">Your Personal BTC Deposit Address:</p>
            <div id="btc-copy-box" style="cursor:pointer; position:relative;">
                <code id="btc-address-text" style="display:block; background:#000; padding:12px; border-radius:5px; word-break:break-all; font-size:11px; color:var(--primary); border: 1px dashed var(--primary)">
                    ${btcAddr}
                </code>
                <small style="color:var(--primary); font-size:10px; margin-top:4px; display:block;">(Kattints ide a másoláshoz)</small>
            </div>
            
            <hr style="border:0; border-top:1px solid var(--border); margin:20px 0;">
            
            <h4 style="margin-bottom:10px;">Withdraw Funds</h4>
            <div style="display:flex; flex-direction:column; gap:12px;">
                <div>
                    <label style="color:#aaa; font-size:12px;">Amount (€)</label>
                    <input type="number" id="withdraw-amount" placeholder="0.00" style="width:100%; padding:8px; background:#111; border:1px solid var(--border); color:#fff;">
                </div>
                <div>
                    <label style="color:#aaa; font-size:12px;">Target BTC Wallet Address</label>
                    <input type="text" id="withdraw-dest" placeholder="bc1q..." style="width:100%; padding:8px; background:#111; border:1px solid var(--border); color:#fff;">
                </div>
                <button class="btn-primary" id="withdraw-btn" style="width:100%; padding:10px; font-weight:bold;">REQUEST WITHDRAWAL</button>
            </div>
            <p id="withdraw-status" style="font-size:12px; margin-top:10px; font-weight:bold;"></p>
        </div>
    `;

    // Másolás vágólapra
    const copyBox = document.getElementById('btc-copy-box');
    if (copyBox) {
        copyBox.onclick = () => {
            if (userProfile.btc_address) {
                navigator.clipboard.writeText(userProfile.btc_address);
                alert("BTC cím a vágólapra másolva!");
            }
        };
    }

    // Kifizetés kezelése
    const btn = document.getElementById('withdraw-btn');
    if (btn) btn.onclick = handleWithdrawRequest;
}

async function handleWithdrawRequest() {
    const amountInput = document.getElementById('withdraw-amount');
    const destInput = document.getElementById('withdraw-dest');
    const status = document.getElementById('withdraw-status');
    
    const amount = parseFloat(amountInput.value);
    const dest = destInput.value.trim();

    if (isNaN(amount) || amount <= 0 || !dest) {
        alert("Kérlek adj meg érvényes összeget és célcímet!");
        return;
    }

    if (amount > userProfile.real_balance) {
        alert("Nincs elég fedezet a számláján!");
        return;
    }

    try {
        status.innerText = "Processing transaction...";
        status.style.color = "var(--primary)";
        status.style.display = "block";

        // 1. Kérelem mentése
        const { error: insErr } = await _supabase.from('withdrawals').insert([{
            user_id: currentUser.id,
            username: userProfile.username || 'unknown',
            amount: amount,
            btc_address: dest,
            status: 'pending'
        }]);

        if (insErr) throw insErr;

        // 2. Egyenleg frissítése az adatbázisban
        const newBalance = userProfile.real_balance - amount;
        const { error: upErr } = await _supabase
            .from('profiles')
            .update({ real_balance: newBalance })
            .eq('id', currentUser.id);

        if (upErr) throw upErr;

        // 3. UI frissítése
        userProfile.real_balance = newBalance;
        if (document.getElementById("nav-real")) document.getElementById("nav-real").innerText = newBalance.toFixed(2) + " €";
        
        status.innerText = "✅ Withdrawal request sent successfully!";
        status.style.color = "var(--success)";
        amountInput.value = "";
        destInput.value = "";

    } catch (err) {
        console.error("Kifizetési hiba:", err);
        status.innerText = "❌ Error: " + err.message;
        status.style.color = "var(--danger)";
    }
}

// Inicializálás
function loadSavedBTC() {
    checkIPAndRenderWallet();
}

// Ha van eseményfigyelőd a profil betöltésére, ide is bekötheted
document.addEventListener('DOMContentLoaded', loadSavedBTC);
