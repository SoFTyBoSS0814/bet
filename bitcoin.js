/**
 * STAKEFORGE - BTC Module (Final Production Fix)
 */

async function checkIPAndRenderWallet() {
    const walletContainer = document.getElementById('btc-wallet-area');
    if (!walletContainer) return;

    if (typeof currentUser === 'undefined' || !currentUser) {
        setTimeout(() => checkIPAndRenderWallet(), 500);
        return;
    }

    try {
        // IP Ellenőrzés
        const res = await fetch('https://ipapi.co/json/').catch(() => null);
        if (res) {
            const data = await res.json();
            if (data.country_code === 'HU') {
                walletContainer.innerHTML = `<p style="color:red; text-align:center; padding:20px;">⚠️ Region restricted (HU).</p>`;
                return;
            }
        }

        // 1. Megnézzük, van-e már a felhasználónak címe
        const { data: btcRow, error: fetchError } = await _supabase
            .from('btc_pool')
            .select('address')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (btcRow) {
            userProfile.btc_address = btcRow.address;
        } else {
            // 2. Ha nincs, megpróbálunk egyet szerezni
            await grabAddressFromPool();
        }

        renderCryptoCard(walletContainer);

    } catch (e) {
        console.error("Fő hiba:", e);
        renderCryptoCard(walletContainer);
    }
}

async function grabAddressFromPool() {
    console.log("Cím keresése folyamatban...");
    
    try {
        // Keressük meg a legelső szabad sort. 
        // Fontos: Az 'is_allocated' oszlopnevet és a 'false' értéket ellenőrizd a Supabase-ben!
        const { data: freeRows, error: findError } = await _supabase
            .from('btc_pool')
            .select('id, address')
            .eq('is_allocated', false) // Itt szállt el 400-as hibával a képeden
            .limit(1);

        if (findError || !freeRows || freeRows.length === 0) {
            console.warn("Hiba vagy üres pool:", findError);
            return;
        }

        const target = freeRows[0];

        // Frissítés: Lefoglaljuk a címet
        const { data: updated, error: updateError } = await _supabase
            .from('btc_pool')
            .update({ 
                user_id: currentUser.id,
                is_allocated: true 
            })
            .eq('id', target.id)
            .select();

        if (updateError) {
            console.error("Update hiba:", updateError);
            return;
        }

        if (updated && updated.length > 0) {
            userProfile.btc_address = target.address;
            // Profil szinkronizálás
            await _supabase.from('profiles').update({ btc_address: target.address }).eq('id', currentUser.id);
            console.log("Cím sikeresen kiosztva!");
        }
    } catch (err) {
        console.error("Váratlan hiba a pool kezelésekor:", err);
    }
}

function renderCryptoCard(container) {
    const addr = userProfile.btc_address || "Nincs elérhető cím (Pool Error)";
    
    container.innerHTML = `
        <div class="market-card" style="border: 1px solid var(--primary); background: rgba(0,212,255,0.05); padding: 15px; border-radius: 8px;">
            <h4 style="color:var(--primary); margin: 0 0 10px 0;">Secure Crypto Gateway</h4>
            <p style="font-size:11px; color:#aaa;">Personal BTC Deposit Address:</p>
            <code id="btc-copy" style="display:block; background:#000; padding:12px; border-radius:5px; border: 1px dashed var(--primary); word-break:break-all; font-family:monospace; font-size:11px; color:var(--primary); cursor:pointer;">
                ${addr}
            </code>
            <p style="font-size:10px; color:#555; margin-top:5px;">Click address to copy</p>
            
            <hr style="border:0; border-top:1px solid #222; margin:15px 0;">
            
            <input type="number" id="w-amt" placeholder="Amount (€)" style="width:100%; margin-bottom:8px; background:#111; border:1px solid #333; color:white; padding:8px;">
            <input type="text" id="w-adr" placeholder="Destination BTC Address" style="width:100%; margin-bottom:12px; background:#111; border:1px solid #333; color:white; padding:8px;">
            <button class="btn-primary" onclick="handleWithdraw()" style="width:100%; font-weight:bold;">REQUEST WITHDRAWAL</button>
        </div>
    `;

    const copyBtn = document.getElementById('btc-copy');
    if (copyBtn) {
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(addr);
            alert("BTC Address copied!");
        };
    }
}

async function handleWithdraw() {
    const amt = parseFloat(document.getElementById('w-amt').value);
    const adr = document.getElementById('w-adr').value.trim();

    if (!amt || !adr) return alert("Please fill all fields!");
    if (amt > userProfile.real_balance) return alert("Insufficient funds!");

    const { error } = await _supabase.from('withdrawals').insert([{
        user_id: currentUser.id,
        username: userProfile.username,
        amount: amt,
        btc_address: adr,
        status: 'pending'
    }]);

    if (!error) {
        await _supabase.from('profiles').update({ real_balance: userProfile.real_balance - amt }).eq('id', currentUser.id);
        alert("Success! Request sent.");
        location.reload();
    } else {
        alert("Error: " + error.message);
    }
}

checkIPAndRenderWallet();
