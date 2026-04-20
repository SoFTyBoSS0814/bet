const SUPABASE_URL = "https://ldcrycuoynashsqlosae.supabase.co";
const SUPABASE_KEY = "sb_publishable_Jdda8r4L3n-CkQPLX4qsPA_A5kRJy1b";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function init() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) { window.location.href = "index.html"; return; }
    const { data: profile } = await _supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();
    if (!profile || !profile.is_admin) { window.location.href = "index.html"; return; }
    document.body.style.display = "block";
    loadData();
}

async function loadData() {
    await loadWithdrawals();
    await loadUsers();
}

async function loadWithdrawals() {
    const { data: ws, error } = await _supabase.from('withdrawals').select('*').eq('status', 'pending');
    const div = document.getElementById('withdrawal-list');
    if (error) return;
    if (!ws || ws.length === 0) { div.innerHTML = "Nincs függő kérelem."; return; }

    div.innerHTML = ws.map(w => `
        <div class="user-card">
            <div><strong>${w.username || 'Ismeretlen'}</strong>: ${w.amount}€</div>
            <div style="display:flex; gap:5px;">
                <button class="btn-approve" onclick="window.updateWithdrawal('${w.id}', 'completed')">Jóváhagyás</button>
                <button class="btn-reject" onclick="window.rejectWithdrawal('${w.id}', '${w.user_id}', ${w.amount})">Elutasítás</button>
            </div>
        </div>
    `).join('');
}

async function loadUsers() {
    const { data: users } = await _supabase.from('profiles').select('*').order('username');
    const div = document.getElementById('user-list');
    if (users) {
        div.innerHTML = users.map(u => `
            <div class="user-card ${u.is_restricted ? 'restricted' : ''}">
                <div><strong>${u.username}</strong> (${u.real_balance.toFixed(2)}€)</div>
                <button class="${u.is_restricted ? 'btn-unrestrict' : 'btn-restrict'}" onclick="window.toggleRestrict('${u.id}', ${u.is_restricted})">
                    ${u.is_restricted ? 'Feloldás' : 'Korlátozás'}
                </button>
            </div>
        `).join('');
    }
}

window.toggleRestrict = async function(uid, current) {
    await _supabase.from('profiles').update({ is_restricted: !current }).eq('id', uid);
    loadUsers();
};

// JAVÍTOTT JÓVÁHAGYÁS
window.updateWithdrawal = async function(id, status) {
    if (!confirm("Biztosan JÓVÁHAGYOD?")) return;
    
    // Kényszerített státusz állítás
    const { error } = await _supabase
        .from('withdrawals')
        .update({ status: 'completed' })
        .match({ id: id }); // eq helyett match, néha biztosabb

    if (error) {
        console.error("HIBA:", error);
        alert("Adatbázis hiba: " + error.message + "\nKód: " + error.code);
    } else {
        alert("Sikeres mentés!");
        await loadWithdrawals();
    }
};

// JAVÍTOTT ELUTASÍTÁS
window.rejectWithdrawal = async function(wid, uid, amount) {
    if (!confirm("Biztosan ELUTASÍTOD?")) return;

    // 1. Pénz visszaadása
    const { data: p } = await _supabase.from('profiles').select('real_balance').eq('id', uid).single();
    await _supabase.from('profiles').update({ real_balance: parseFloat(p.real_balance) + parseFloat(amount) }).eq('id', uid);

    // 2. Státusz átírása
    const { error } = await _supabase
        .from('withdrawals')
        .update({ status: 'rejected' })
        .match({ id: wid });

    if (error) {
        console.error("HIBA:", error);
        alert("Pénz visszaadva, de a kérést nem tudtam lezárni: " + error.message);
    } else {
        alert("Sikeresen elutasítva!");
        await loadData();
    }
};

init();
