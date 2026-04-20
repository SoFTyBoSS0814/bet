/**
 * STAKEFORGE - ADMIN & BAN PANEL (JAVÍTOTT TELJES VERZIÓ)
 */

let currentUser = null;

async function checkAdminAndInit() {
    console.log("Admin ellenőrzése folyamatban...");
    
    // 1. Megvárjuk a munkamenetet
    const { data: { session }, error: sessionError } = await _supabase.auth.getSession();
    
    if (sessionError || !session) {
        console.error("Nincs bejelentkezett felhasználó.");
        window.location.href = "index.html";
        return;
    }

    currentUser = session.user;

    // 2. Friss profil lekérése az adatbázisból (hogy biztosan lássuk az is_admin-t)
    const { data: profile, error: profileError } = await _supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    if (profileError || !profile || !profile.is_admin) {
        console.error("Hozzáférési hiba:", profileError);
        alert("Nincs admin jogosultságod!");
        window.location.href = "index.html";
        return;
    }

    console.log("Admin azonosítva: " + profile.username);
    
    // Ha minden jó, betöltjük az adatokat
    loadWithdrawals();
    loadUsers();
}

// --- KIFIZETÉSEK KEZELÉSE ---
async function loadWithdrawals() {
    const container = document.getElementById('withdrawal-list-container');
    if (!container) return;

    const { data: withdrawals, error } = await _supabase
        .from('withdrawals')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

    if (error) {
        container.innerHTML = "Hiba a kifizetések betöltésekor.";
        return;
    }

    if (withdrawals.length === 0) {
        container.innerHTML = "<p>Nincs függő kifizetési kérelem.</p>";
        return;
    }

    container.innerHTML = withdrawals.map(w => `
        <div class="admin-card withdrawal-card">
            <div class="card-header">
                <div class="user-info">
                    <strong>${w.username || 'Ismeretlen'}</strong><br>
                    <span>ID: ${w.user_id}</span>
                </div>
                <div>
                    <span style="font-size: 1.4rem; color: #f1c40f; font-weight: bold;">${w.amount} €</span>
                </div>
            </div>
            <p>BTC Cím: <code>${w.btc_address}</code></p>
            <div class="actions">
                <button class="btn-unban" onclick="approveWithdrawal('${w.id}')">JÓVÁHAGYÁS</button>
                <button class="btn-ban" onclick="rejectWithdrawal('${w.id}', '${w.user_id}', ${w.amount})">ELUTASÍTÁS</button>
            </div>
        </div>
    `).join('');
}

// --- FELHASZNÁLÓK KEZELÉSE ---
async function loadUsers() {
    const container = document.getElementById('user-list-container');
    if (!container) return;

    const { data: users, error } = await _supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = "Hiba a felhasználók betöltésekor.";
        return;
    }

    container.innerHTML = users.map(u => `
        <div class="admin-card ${u.is_banned ? 'is-restricted' : ''}">
            <div class="card-header">
                <div class="user-info">
                    <strong>${u.username || 'Névtelen'}</strong><br>
                    <span>Egyenleg: ${u.real_balance.toFixed(2)} €</span>
                </div>
                <div>
                    <span class="status-badge ${u.is_banned ? 'status-banned' : 'status-active'}">
                        ${u.is_banned ? 'KITILTVA' : 'AKTÍV'}
                    </span>
                </div>
            </div>
            <div class="actions">
                <button class="${u.is_banned ? 'btn-unban' : 'btn-ban'}" onclick="toggleBan('${u.id}', ${u.is_banned})">
                    ${u.is_banned ? 'FELOLDÁS' : 'KITILTÁS'}
                </button>
                <button class="btn-bonus" onclick="modifyBalance('${u.id}', 10)">+10€</button>
                <button class="btn-bonus" onclick="modifyBalance('${u.id}', 50)">+50€</button>
            </div>
        </div>
    `).join('');
}

// --- MŰVELETI FUNKCIÓK ---

async function toggleBan(uid, currentStatus) {
    if (!confirm("Biztosan módosítod a tiltási állapotot?")) return;

    const { error } = await _supabase
        .from('profiles')
        .update({ is_banned: !currentStatus })
        .eq('id', uid);

    if (error) alert("Hiba: " + error.message);
    else loadUsers();
}

async function approveWithdrawal(wid) {
    if (!confirm("Jóváhagyod a kifizetést?")) return;
    
    await _supabase.from('withdrawals').update({ status: 'completed' }).eq('id', wid);
    loadWithdrawals();
}

async function rejectWithdrawal(wid, uid, amount) {
    if (!confirm("Elutasítod? A pénz visszakerül a userhez.")) return;

    // 1. Egyenleg lekérése
    const { data: p } = await _supabase.from('profiles').select('real_balance').eq('id', uid).single();
    
    // 2. Visszaadás + Státusz frissítés
    await _supabase.from('profiles').update({ real_balance: p.real_balance + amount }).eq('id', uid);
    await _supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', wid);
    
    loadWithdrawals();
    loadUsers();
}

async function modifyBalance(uid, amount) {
    const { data: p } = await _supabase.from('profiles').select('real_balance').eq('id', uid).single();
    await _supabase.from('profiles').update({ real_balance: p.real_balance + amount }).eq('id', uid);
    loadUsers();
}

// INDÍTÁS
checkAdminAndInit();
