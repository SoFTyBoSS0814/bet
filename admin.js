// admin.js

// --- KONFIGURÁCIÓ ---
const SUPABASE_URL = "A_TE_SUPABASE_PROJECT_URL_CIMED"; // Pl: https://xyz.supabase.co
const SUPABASE_KEY = "sb_publishable_Jdda8r4L3n-CkQPLX4qsPA_A5kRJy1b"; // Amit küldtél
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ADMIN ELLENŐRZÉS ÉS INDÍTÁS
async function init() {
    const { data: { session } } = await _supabase.auth.getSession();
    
    if (!session) {
        window.location.href = "index.html";
        return;
    }

    const { data: profile } = await _supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();

    if (!profile || !profile.is_admin) {
        alert("Csak adminoknak!");
        window.location.href = "index.html";
        return;
    }

    loadWithdrawals();
    loadUsers();
}

// KIFIZETÉSEK
async function loadWithdrawals() {
    const { data: withdrawals } = await _supabase.from('withdrawals').select('*').eq('status', 'pending');
    const container = document.getElementById('withdrawal-list-container');
    
    if (!withdrawals || withdrawals.length === 0) {
        container.innerHTML = "<p>Nincs kifizetési kérelem.</p>";
        return;
    }

    container.innerHTML = withdrawals.map(w => `
        <div class="admin-card" style="border-left-color: #f1c40f;">
            <strong>${w.username}</strong> kért <strong>${w.amount} €</strong> összeget.
            <code>BTC: ${w.btc_address}</code>
            <div class="actions">
                <button class="btn-approve" onclick="approveWithdrawal('${w.id}')">KIFIZETVE</button>
                <button class="btn-reject" onclick="rejectWithdrawal('${w.id}', '${w.user_id}', ${w.amount})">ELUTASÍT</button>
            </div>
        </div>
    `).join('');
}

// FELHASZNÁLÓK
async function loadUsers() {
    const { data: users } = await _supabase.from('profiles').select('*').order('created_at', { ascending: false });
    const container = document.getElementById('user-list-container');
    
    container.innerHTML = users.map(u => `
        <div class="admin-card ${u.is_banned ? 'is-restricted' : ''}">
            <div class="card-header">
                <div>
                    <strong>${u.username || 'User'}</strong><br>
                    <span>Egyenleg: ${u.real_balance.toFixed(2)} €</span>
                </div>
                <div style="font-weight:bold; color: ${u.is_banned ? 'red' : 'green'}">
                    ${u.is_banned ? 'KITILTVA' : 'AKTÍV'}
                </div>
            </div>
            <div class="actions">
                <button class="${u.is_banned ? 'btn-unban' : 'btn-ban'}" onclick="toggleBan('${u.id}', ${u.is_banned})">
                    ${u.is_banned ? 'FELOLDÁS' : 'KITILTÁS'}
                </button>
                <button class="btn-bonus" onclick="addMoney('${u.id}', 10)">+10€</button>
            </div>
        </div>
    `).join('');
}

// --- FUNKCIÓK ---

async function toggleBan(uid, currentStatus) {
    if(!confirm("Módosítod a felhasználó állapotát?")) return;
    await _supabase.from('profiles').update({ is_banned: !currentStatus }).eq('id', uid);
    loadUsers(); // Frissítés
}

async function approveWithdrawal(wid) {
    await _supabase.from('withdrawals').update({ status: 'completed' }).eq('id', wid);
    loadWithdrawals();
}

async function rejectWithdrawal(wid, uid, amount) {
    const { data: p } = await _supabase.from('profiles').select('real_balance').eq('id', uid).single();
    await _supabase.from('profiles').update({ real_balance: p.real_balance + amount }).eq('id', uid);
    await _supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', wid);
    loadWithdrawals();
    loadUsers();
}

async function addMoney(uid, amount) {
    const { data: p } = await _supabase.from('profiles').select('real_balance').eq('id', uid).single();
    await _supabase.from('profiles').update({ real_balance: p.real_balance + amount }).eq('id', uid);
    loadUsers();
}

init();
