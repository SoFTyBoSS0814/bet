// Konfiguráció
const SUPABASE_URL = "https://ldcrycuoynashsqlosae.supabase.co";
const SUPABASE_KEY = "sb_publishable_Jdda8r4L3n-CkQPLX4qsPA_A5kRJy1b";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Admin JS elindult");
alert("JS életjel!"); // Ha ez nem ugrik fel az oldal frissítésekor, be sem tölti a fájlt!

// Inicializálás
async function init() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) { window.location.href = "index.html"; return; }

    const { data: profile } = await _supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();

    if (!profile || !profile.is_admin) {
        window.location.href = "index.html";
        return;
    }

    document.body.style.display = "block";
    loadData();
}

async function loadData() {
    loadWithdrawals();
    loadUsers();
}

// Lista betöltése
async function loadWithdrawals() {
    const { data: ws, error } = await _supabase.from('withdrawals').select('*').eq('status', 'pending');
    const div = document.getElementById('withdrawal-list');
    
    if (error) { console.error("Hiba:", error); return; }
    if (!ws || ws.length === 0) { div.innerHTML = "Nincs függő kérelem."; return; }

    div.innerHTML = ws.map(w => `
        <div class="user-card">
            <div><strong>${w.username || 'Ismeretlen'}</strong>: ${w.amount}€ <br><code>${w.btc_address}</code></div>
            <div style="display:flex; gap:5px;">
                <button class="btn-approve" onclick="updateWithdrawal('${w.id}', 'completed')">Jóváhagyás</button>
                <button class="btn-reject" onclick="rejectWithdrawal('${w.id}', '${w.user_id}', ${w.amount})">Elutasítás</button>
            </div>
        </div>
    `).join('');
}

async function loadUsers() {
    const { data: users, error } = await _supabase.from('profiles').select('*').order('username');
    const div = document.getElementById('user-list');
    
    if (error) { console.error("Hiba:", error); return; }
    
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

// --- GLOBÁLISRA TETT MŰVELETEK (Ez a kulcs!) ---

window.toggleRestrict = async function(uid, current) {
    const { error } = await _supabase.from('profiles').update({ is_restricted: !current }).eq('id', uid);
    if (error) alert("Hiba: " + error.message);
    else loadUsers();
};

window.updateWithdrawal = async function(id, status) {
    if (!confirm("Biztosan JÓVÁHAGYOD ezt a kifizetést?")) return;
    
    const { error } = await _supabase.from('withdrawals').update({ status }).eq('id', id);
    if (error) {
        alert("Hiba: " + error.message);
    } else {
        alert("Kifizetés sikeresen lezárva!");
        loadWithdrawals();
    }
};

window.rejectWithdrawal = async function(wid, uid, amount) {
    if (!confirm("Biztosan ELUTASÍTOD a kifizetést?")) return;

    try {
        const { data: p, error: pErr } = await _supabase.from('profiles').select('real_balance').eq('id', uid).single();
        if (pErr) throw pErr;

        await _supabase.from('profiles').update({ real_balance: p.real_balance + amount }).eq('id', uid);
        await _supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', wid);

        alert("Kifizetés elutasítva, az összeg visszakerült a userhez!");
        loadData();
    } catch (err) {
        alert("Hiba történt!");
    }
};

// Indítás
init();
