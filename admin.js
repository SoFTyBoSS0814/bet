const SUPABASE_URL = "https://ldcrycuoynashsqlosae.supabase.co";
const SUPABASE_KEY = "sb_publishable_Jdda8r4L3n-CkQPLX4qsPA_A5kRJy1b"; // sb_publishable_...
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function init() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) { window.location.href = "index.html"; return; }

    const { data: profile } = await _supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();

    if (!profile || !profile.is_admin) {
        window.location.href = "index.html";
        return;
    }

    // Ha admin, megjelenítjük az oldalt
    document.body.style.display = "block";
    loadData();
}

async function loadData() {
    loadWithdrawals();
    loadUsers();
}

async function loadWithdrawals() {
    const { data: ws } = await _supabase.from('withdrawals').select('*').eq('status', 'pending');
    const div = document.getElementById('withdrawal-list');
    if (!ws || ws.length === 0) { div.innerHTML = "Nincs függő kérelem."; return; }

    div.innerHTML = ws.map(w => `
        <div class="user-card">
            <div><strong>${w.username}</strong>: ${w.amount}€ <code>${w.btc_address}</code></div>
            <div>
                <button class="btn-approve" onclick="updateWithdrawal('${w.id}', 'completed')">Jóváhagyás</button>
                <button class="btn-reject" onclick="rejectWithdrawal('${w.id}', '${w.user_id}', ${w.amount})">Elutasítás</button>
            </div>
        </div>
    `).join('');
}

async function loadUsers() {
    const { data: users } = await _supabase.from('profiles').select('*').order('username');
    const div = document.getElementById('user-list');
    
    div.innerHTML = users.map(u => `
        <div class="user-card ${u.is_restricted ? 'restricted' : ''}">
            <div>
                <strong>${u.username}</strong> (${u.real_balance.toFixed(2)}€)
                <br><small>${u.is_restricted ? '🔴 KORLÁTOZVA' : '🟢 AKTÍV'}</small>
            </div>
            <button class="${u.is_restricted ? 'btn-unrestrict' : 'btn-restrict'}" 
                    onclick="toggleRestrict('${u.id}', ${u.is_restricted})">
                ${u.is_restricted ? 'Feloldás' : 'Korlátozás'}
            </button>
        </div>
    `).join('');
}

// Műveletek
async function toggleRestrict(uid, current) {
    await _supabase.from('profiles').update({ is_restricted: !current }).eq('id', uid);
    loadUsers();
}

async function updateWithdrawal(id, status) {
    await _supabase.from('withdrawals').update({ status }).eq('id', id);
    loadWithdrawals();
}

async function rejectWithdrawal(wid, uid, amount) {
    const { data: p } = await _supabase.from('profiles').select('real_balance').eq('id', uid).single();
    await _supabase.from('profiles').update({ real_balance: p.real_balance + amount }).eq('id', uid);
    await _supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', wid);
    loadData();
}

init();
