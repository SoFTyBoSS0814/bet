/**
 * STAKEFORGE - BTC Module (Optimized Production Version)
 */

async function checkIPAndRenderWallet() {
    const walletContainer = document.getElementById('btc-wallet-area');
    if (!walletContainer) return;

    // Bevárjuk a profil adatokat
    if (typeof userProfile === 'undefined' || !userProfile || typeof currentUser === 'undefined' || !currentUser) {
        setTimeout(() => checkIPAndRenderWallet(), 500);
        return;
    }

    // 1. IP ELLENŐRZÉS (Magyarországi tiltás)
    let isHungarian = false;
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        
        if (data.country_code === 'HU') {
            isHungarian = true;
            walletContainer.innerHTML = `
                <div style="padding:20px; border:1px solid #ff4646; background:rgba(255,70,70,0.1); border-radius:8px; text-align:center; margin-top:20px;">
                    <p style="color:#ff4646; font-size:13px; font-weight:bold; margin:0;">
                        ⚠️ Figyelem: Magyarország területéről a kriptovaluta BE/KI fizetés nem lehetséges.
                    </p>
                </div>`;
            return; 
        }
    } catch (e) {
        console.warn("IP ellenőrzés sikertelen, de folytatjuk...");
    }

    // 2. WALLET LOGIKA (Csak ha NEM magyar)
    try {
        // Megnézzük, van-e már címe a profiljában
        if (!userProfile.btc_address || userProfile.btc_address === '') {
            
            // Ha nincs címe és NEM magyar, akkor kérünk egyet az SQL-től (RPC)
            if (!isHungarian) {
                console.log("Cím igénylése a szervertől...");
                const { data: newAddress, error } = await _supabase
                    .rpc('assign_btc_to_user', { target_user_id: currentUser.id });

                if (error) {
                    console.error("RPC Hiba:", error);
                } else if (newAddress) {
                    userProfile.btc_address = newAddress;
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
    // Ha magyar, ide el se jut a kód a return miatt, de biztonsági tartaléknak:
    const addr = userProfile.btc_address || "No address found (Region Restricted)";
    
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
        if (userProfile.btc_address && userProfile.btc_address !== "No address found (Region Restricted)") {
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

    if(status) status.innerText = "";

    if (!amt || amt <= 0 || !adr) {
        if(status) status.innerText = "❌ Hiba: Adj meg összeget és címet!";
        return;
    }

    if (amt > userProfile.real_balance) {
        if(status) {
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

        status.innerText = "✅ Kérelem sikeresen rögzítve!";
        status.style.color = "var(--success)";
        
        setTimeout(() => location.reload(), 2000);

    } catch (err) {
        console.error(err);
        if(status) {
            status.innerText = "❌ Hiba történt.";
            status.style.color = "#ff4646";
        }
    }
}

checkIPAndRenderWallet();
