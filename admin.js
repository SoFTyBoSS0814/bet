/**
 * STAKEFORGE - ADMIN & BAN PANEL LOGIC
 * Ez a fájl kezeli a kifizetéseket, a tiltásokat és az egyenlegmódosítást.
 */

// 1. Supabase Inicializálás (Feltételezve, hogy a konfiguráció már megvan)
// Ha nincs külön config fájlod, ide illesztheted a _supabase inicializálást.

async function checkAdminAndInit() {
    try {
        // Aktuális user lekérése
        const { data: { user } } = await _supabase.auth.getUser();
        
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        // Admin jogosultság ellenőrzése a profil táblában
        const { data: profile, error } = await _supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (error || !profile || !profile.is_admin) {
            alert("Hozzáférés megtagadva! Csak adminisztrátorok léphetnek be.");
            window.location.href = "index.html";
            return;
        }

        // Ha admin, indíthatjuk a listák betöltését
        console.log("Admin azonosítva, adatok betöltése...");
        loadWithdrawals();
        loadUsers();

    } catch (err) {
        console.error("Admin ellenőrzési hiba:", err);
        window.location.href = "index.html";
    }
}

// 2. FÜGGŐ KIFIZETÉSEK BETÖLTÉSE
async function loadWithdrawals() {
    const container = document.getElementById('withdrawal-list-container');
    
    const { data: withdrawals, error } = await _supabase
        .from('withdrawals')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

    if (error) {
        container.innerHTML = `<p style="color:red;">Hiba a kifizetések betöltésekor.</p>`;
        return;
    }

    if (withdrawals.length === 0) {
        container.innerHTML = `<p style="color: #557086;">Nincsenek függő kifizetési kérelmek. 😊</p>`;
        return;
    }

    container.innerHTML = withdrawals.map(w => `
        <div class="admin-card withdrawal-card">
            <div class="card-header">
                <div class="user-info">
                    <strong>${w.username || 'Ismeretlen'}</strong><br>
                    <span>ID: ${w.user_id}</span>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 1.4rem; color: #f1c40f; font-weight: bold;">${w.amount} €</span>
                </div>
            </div>
            <div style="margin-top: 10px;">
                <p style="margin: 5px 0;">BTC Cím: <code>${w.btc_address}</code></p>
            </div>
            <div class="actions">
                <button class="btn-unban" onclick="approveWithdrawal('${w.id}')">JÓVÁHAGYÁS (Kifizetve)</button>
                <button class="btn-ban" onclick="rejectWithdrawal('${w.id}', '${w.user_id}', ${w.amount})">ELUTASÍTÁS (Visszatérítés)</button>
            </div>
        </div>
    `).join('');
}

// 3. FELHASZNÁLÓK BETÖLTÉSE
async function loadUsers() {
    const container = document.getElementById('user-list-container');
    
    const { data: users, error } = await _supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = `<p style="color:red;">Hiba a felhasználók betöltésekor.</p>`;
        return;
    }

    container.innerHTML = users.map(u => `
        <div class="admin-card ${u.is_banned ? 'is-restricted' : ''}">
            <div class="card-header">
                <div class="user-info">
                    <strong>${u.username || 'Névtelen'}</strong><br>
                    <span>${u.email || 'Nincs email'}</span>
                </div>
                <div style="text-align: right;">
                    <span class="status-badge ${u.is_banned ? 'status-banned' : 'status-active'}">
                        ${u.is_banned ? 'KITILTVA' : 'AKTÍV'}
                    </span>
                    <div style="margin-top: 5px; font-weight: bold;">${u.real_balance.toFixed(2)} €</div>
                </div>
            </div>
            <div class="actions">
                <button class="${u.is_banned ? 'btn-unban' : 'btn-ban'}" onclick="toggleBan('${u.id}', ${u.is_banned})">
                    ${u.is_banned ? '🔓 FELOLDÁS' : '🚫 KITILTÁS'}
                </button>
                <button class="btn-bonus" onclick="modifyBalance('${u.id}', 10)">+10€</button>
                <button class="btn-bonus" onclick="modifyBalance('${u.id}', 50)">+50€</button>
                <button class="btn-bonus" style="background: #ff464622; color: #ff4646;" onclick="modifyBalance('${u.id}', -10)">-10€</button>
            </div>
        </div>
    `).join('');
}

// --- FUNKCIÓK ---

// Kifizetés Jóváhagyása
async function approveWithdrawal(id) {
    if (!confirm("Megerősíted, hogy a BTC-t elküldted a megadott címre?")) return;
    
    const { error } = await _supabase
        .from('withdrawals')
        .update({ status: 'completed' })
        .eq('id', id);

    if (error) alert("Hiba történt!");
    else {
        loadWithdrawals();
    }
}

// Kifizetés Elutasítása és Pénz visszaadása
async function rejectWithdrawal(wid, uid, amount) {
    if (!confirm("Elutasítod a kérelmet? Az összeg visszakerül a felhasználóhoz.")) return;

    // 1. Aktuális egyenleg lekérése
    const { data: profile } = await _supabase.from('profiles').select('real_balance').eq('id', uid).single();
    
    // 2. Egyenleg visszatöltése
    const { error: updateErr } = await _supabase
        .from('profiles')
        .update({ real_balance: profile.real_balance + amount })
        .eq('id', uid);

    if (updateErr) {
        alert("Hiba az egyenleg visszatöltésekor!");
        return;
    }

    // 3. Státusz frissítése
    await _supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', wid);
    
    loadWithdrawals();
    loadUsers();
}

// Kitiltás ki/be kapcsolása
async function toggleBan(uid, currentStatus) {
    const action = currentStatus ? "feloldani" : "kitiltani";
    if (!confirm(`Biztosan le akarod ${action} ezt a felhasználót?`)) return;

    const { error } = await _supabase
        .from('profiles')
        .update({ is_banned: !currentStatus })
        .eq('id', uid);

    if (error) alert("Hiba történt!");
    else loadUsers();
}

// Manuális egyenleg módosítás
async function modifyBalance(uid, amount) {
    const { data: profile } = await _supabase.from('profiles').select('real_balance').eq('id', uid).single();
    
    const { error } = await _supabase
        .from('profiles')
        .update({ real_balance: profile.real_balance + amount })
        .eq('id', uid);

    if (error) alert("Hiba történt!");
    else loadUsers();
}

// OLDAL INDÍTÁSA
checkAdminAndInit();
