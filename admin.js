// admin.js

// --- 1. KONFIGURÁCIÓ ---
const SUPABASE_URL = "https://ldcrycuoynashsqlosae.supabase.co"; // Ezt pótold!
const SUPABASE_KEY = "sb_secret_wCUS6D_rwEfdSn0eRDgiMA_g7zGvWXZ"; // Az anon kulcsod
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 2. BIZTONSÁGI ADMIN ELLENŐRZÉS ---
async function initAdmin() {
    // Azonnal elrejtjük a tartalmat, amíg nem dől el a jogkör
    document.body.style.opacity = "0";

    const { data: { session }, error: sessionError } = await _supabase.auth.getSession();
    
    // Ha nincs munkamenet
    if (sessionError || !session) {
        window.location.replace("index.html");
        return;
    }

    // Admin jog lekérése
    const { data: profile, error: profileError } = await _supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();

    // Ha nem admin, vagy hiba van -> Drasztikus kidobás
    if (profileError || !profile || profile.is_admin !== true) {
        document.body.innerHTML = ""; // Mindent törlünk
        window.location.replace("index.html");
        return;
    }

    // Ha idáig eljutott, ő valóban Admin
    document.body.style.opacity = "1";
    console.log("Admin hozzáférés engedélyezve.");

    // Adatok betöltése
    loadWithdrawals();
    loadUsers();
}

// --- 3. KIFIZETÉSEK LISTÁZÁSA ---
async function loadWithdrawals() {
    const container = document.getElementById('withdrawal-list-container');
    const { data: withdrawals, error } = await _supabase
        .from('withdrawals')
        .select('*')
        .eq('status', 'pending');

    if (error || !withdrawals || withdrawals.length === 0) {
        container.innerHTML = "<p style='color:#557086;'>Nincs függő kifizetési kérelem.</p>";
        return;
    }

    container.innerHTML = withdrawals.map(w => `
        <div class="admin-card" style="border-left-color: #f1c40f;">
            <div class="card-header">
                <strong>${w.username || 'Ismeretlen'}</strong>
                <span style="color:#f1c40f; font-weight:bold;">${w.amount} €</span>
            </div>
            <code>BTC: ${w.btc_address}</code>
            <div class="actions">
                <button class="btn-approve" onclick="approveWithdrawal('${w.id}')">KIFIZETVE (Jóváhagyás)</button>
                <button class="btn-reject" onclick="rejectWithdrawal('${w.id}', '${w.user_id}', ${w.amount})">ELUTASÍTÁS</button>
            </div>
        </div>
    `).join('');
}

// --- 4. FELHASZNÁLÓK LISTÁZÁSA ÉS TILTÁSA ---
async function loadUsers() {
    const container = document.getElementById('user-list-container');
    const { data: users, error } = await _supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = "Hiba az adatok lekérésekor.";
        return;
    }

    container.innerHTML = users.map(u => `
        <div class="admin-card ${u.is_banned ? 'is-restricted' : ''}">
            <div class="card-header">
                <div>
                    <strong>${u.username || 'Felhasználó'}</strong><br>
                    <small style="color:#8a96a3;">Egyenleg: ${u.real_balance.toFixed(2)} €</small>
                </div>
                <div style="font-weight:bold; color: ${u.is_banned ? '#ff4646' : '#00e701'}">
                    ${u.is_banned ? 'KITILTVA' : 'AKTÍV'}
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

// --- 5. MŰVELETEK ---

// Kitiltás kapcsoló
async function toggleBan(uid, currentStatus) {
    if (!confirm(currentStatus ? "Biztosan feloldod a felhasználót?" : "Biztosan kitiltod a felhasználót?")) return;

    const { error } = await _supabase
        .from('profiles')
        .update({ is_banned: !currentStatus })
        .eq('id', uid);

    if (error) alert("Hiba történt: " + error.message);
    loadUsers();
}

// Kifizetés jóváhagyása
async function approveWithdrawal(wid) {
    if (!confirm("Jelölöd kifizetettként?")) return;
    await _supabase.from('withdrawals').update({ status: 'completed' }).eq('id', wid);
    loadWithdrawals();
}

// Kifizetés elutasítása (Pénz visszaadása)
async function rejectWithdrawal(wid, uid, amount) {
    if (!confirm("Elutasítod a kérelmet? Az összeg visszakerül a felhasználóhoz.")) return;

    const { data: p } = await _supabase.from('profiles').select('real_balance').eq('id', uid).single();
    const newBalance = (p.real_balance || 0) + amount;

    await _supabase.from('profiles').update({ real_balance: newBalance }).eq('id', uid);
    await _supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', wid);

    loadWithdrawals();
    loadUsers();
}

// Bónusz adás
async function modifyBalance(uid, amount) {
    const { data: p } = await _supabase.from('profiles').select('real_balance').eq('id', uid).single();
    const newBalance = (p.real_balance || 0) + amount;

    await _supabase.from('profiles').update({ real_balance: newBalance }).eq('id', uid);
    loadUsers();
}

// --- INDÍTÁS ---
initAdmin();
