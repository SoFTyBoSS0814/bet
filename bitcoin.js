/**
 * STAKEFORGE - BTC Module (Javított verzió a btc_pool táblához)
 */

async function checkIPAndRenderWallet() {
    const walletContainer = document.getElementById('btc-wallet-area');
    if (!walletContainer) return;

    // Profil adatok bevárása biztonságosan
    if (typeof userProfile === 'undefined' || !userProfile) {
        setTimeout(() => checkIPAndRenderWallet(), 500);
        return;
    }

    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        
        // IP Ellenőrzés
        if (data.country_code === 'HU') {
            walletContainer.innerHTML = `<p style="color:var(--danger); font-size:13px; margin-top:15px; font-weight:bold;">⚠️ Funkciók korlátozva (HU).</p>`;
            return;
        }

        // Fontos: Először ellenőrizzük a btc_pool táblát, hátha már van címe a usernek
        if (!userProfile.btc_address) {
            const { data: existingAddr } = await _supabase
                .from('btc_pool')
                .select('address')
                .eq('user_id', currentUser.id)
                .single();

            if (existingAddr) {
                userProfile.btc_address = existingAddr.address;
            } else {
                // Ha tényleg nincs, akkor kérünk egyet
                await grabAddressFromPool();
            }
        }

        renderCryptoCard(walletContainer);
        
    } catch (e) {
        console.error("Hiba a betöltéskor:", e);
    }
}

async function grabAddressFromPool() {
    try {
        // 1. Első szabad cím lekérése (is_allocated = false)
        const { data: freeAddrs, error: fetchError } = await _supabase
            .from('btc_pool')
            .select('*')
            .eq('is_allocated', false)
            .order('id', { ascending: true })
            .limit(1);

        if (fetchError || !freeAddrs || freeAddrs.length === 0) {
            console.warn("A BTC pool üres vagy hiba történt!");
            return;
        }

        const target = freeAddrs[0];

        // 2. Foglalás a btc_pool táblában (user_id és is_allocated)
        const { error: updatePoolError } = await _supabase
            .from('btc_pool')
            .update({ 
                is_allocated: true, 
                user_id: currentUser.id
            })
            .eq('id', target.id);

        if (updatePoolError) throw updatePoolError;

        // 3. Profil frissítése a profiles táblában
        await _supabase
            .from('profiles')
            .update({ 
                btc_address: target.address 
            })
            .eq('id', currentUser.id);

        // Helyi változó frissítése a kijelzéshez
        userProfile.btc_address = target.address;
        
    } catch (err) {
        console.error("Pool hiba:", err);
    }
}

function renderCryptoCard(container) {
    const btcAddr = userProfile.btc_address || "Nincs elérhető cím. Kérlek frissíts!";
    
    container.innerHTML = `
        <div class="market-card" style="border: 1px solid var(--primary); background: rgba(0,212,255,0.05); margin-top:20px; text-align:left;">
            <h4 style="color:var(--primary); margin-top:0;">BTC Deposit/Withdraw Panel</h4>
            
            <p style="font-size:13px; margin-bottom:5px; color:#aaa;">Your Personal BTC Deposit Address:</p>
            <code id="btc-copy-target" style="display:block; background:#000; padding:10px; border-radius:5px; word-break:break-all; font-size:11px; color:var(--primary); border: 1px dashed var(--primary); cursor:pointer;">
                ${btcAddr}
            </code>
            <small style="color:var(--primary); font-size:10px;">(Kattints a másoláshoz)</small>
            
            <hr style="border:0; border-top:1px solid var(--border); margin:20px 0;">
            
            <h4 style="margin-bottom:10px;">Withdraw Funds</h4>
            <div style="display:flex; flex-direction:column; gap:10px;">
                <div>
                    <small style="color:#aaa">Amount (€)</small>
                    <input type="number" id="withdraw-amount" placeholder="0.00">
                </div>
                <div>
                    <small style="color:#aaa">Target BTC Wallet Address</small>
                    <input type="text" id="withdraw-dest" placeholder="bc1q...">
                </div>
                <button class="btn-primary" id="withdraw-btn">REQUEST WITHDRAWAL</button>
            </div>
            <p id="withdraw-status" style="font-size:12px; margin-top:10px;"></p>
        </div>
    `;

    // Eseménykezelők
    const btn = document.getElementById('withdraw-btn');
    if (btn) btn.onclick = handleWithdrawRequest;

    const copyCode = document.getElementById('btc-copy-target');
    if (copyCode) {
        copyCode.onclick = () => {
            navigator.clipboard.writeText(btcAddr);
            alert("Cím másolva!");
        };
    }
}
