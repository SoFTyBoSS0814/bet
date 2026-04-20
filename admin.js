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
    // Csak a PENDING kéréseket mutatjuk
    const { data: ws, error } = await _supabase.from('withdrawals').select('*').eq('status', 'pending');
    const div = document.getElementById('withdrawal-list');
    if (error) return;
    if (!ws || ws.length === 0) { div.innerHTML = "Nincs függő kérelem."; return; }

    div.innerHTML = ws.map(w => `
        <div class="user-card" id="card-${w.id}">
            <div><strong>${w.username || 'Ismeretlen'}</strong>: ${w.amount}€</div>
            <div style="display:flex; gap:5px;">
                <button class="btn-approve" onclick="window.updateWithdrawal('${w.id}')">Jóváhagyás</button>
                <button class="btn-reject" onclick="window.rejectWithdrawal('${w.id}', '${w.user_id}', ${w.amount})">Elutasítás</button>
            </div>
        </div>
    `).join('');
}

// JÓVÁHAGYÁS
window.updateWithdrawal = async function(id) {
    if (!confirm("Biztosan JÓVÁHAGYOD?")) return;
    
    const { error } = await _supabase
        .from('withdrawals')
        .update({ status: 'completed' })
        .eq('id', id);

    if (error) {
        alert("HIBA: Az adatbázis nem engedi a módosítást! (RLS Policy hiba valószínűleg)\n" + error.message);
    } else {
        alert("Sikeresen jóváhagyva!");
        loadWithdrawals(); // Frissítés: el kell tűnnie
    }
};

// ELUTASÍTÁS (Pénz visszaadása + státusz váltás)
window.rejectWithdrawal = async function(wid, uid, amount) {
    if (!confirm("Biztosan ELUTASÍTOD?")) return;

    // 1. Előbb a státuszt próbáljuk megváltoztatni! 
    // Ha ez nem sikerül, meg sem próbáljuk visszaadni a pénzt (hogy ne lehessen spammelni)
    const { error: statusError } = await _supabase
        .from('withdrawals')
        .update({ status: 'rejected' })
        .eq('id', wid);

    if (statusError) {
        alert("HIBA: Nem tudtam megváltoztatni a kifizetés állapotát, így a pénzt sem adtam vissza! Ellenőrizd a Supabase Policy-t!\n" + statusError.message);
        return;
    }

    // 2. Ha a státusz váltás sikerült, CSAK AKKOR adjuk vissza a pénzt
    try {
        const { data: p } = await _supabase.from('profiles').select('real_balance').eq('id', uid).single();
        const newBalance = parseFloat(p.real_balance) + parseFloat(amount);
        
        await _supabase.from('profiles').update({ real_balance: newBalance }).eq('id', uid);
        
        alert("Kifizetés elutasítva, pénz visszatérítve!");
        loadData();
    } catch (e) {
        alert("A státusz megváltozott, de a pénz visszaadásakor hiba történt!");
    }
};

async function loadUsers() {
    const { data: users } = await _supabase.from('profiles').select('*').order('username');
    const div = document.getElementById('user-list');
    if (users) {
        div.innerHTML = users.map(u => `
            <div class="user-card">
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

init();
