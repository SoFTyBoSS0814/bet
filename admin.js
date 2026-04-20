const SUPABASE_URL = "https://ldcrycuoynashsqlosae.supabase.co";
const SUPABASE_KEY = "sb_publishable_Jdda8r4L3n-CkQPLX4qsPA_A5kRJy1b";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// SAJÁT ÉRTESÍTÉSI RENDSZER (Toast)
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; padding: 12px 20px; 
        background: ${type === 'success' ? '#28a745' : '#dc3545'}; 
        color: white; border-radius: 5px; z-index: 9999; font-family: sans-serif;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2); transition: opacity 0.5s ease;
    `;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

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
        <div class="user-card" id="card-${w.id}">
            <div><strong>${w.username || 'Ismeretlen'}</strong>: ${w.amount}€</div>
            <div style="display:flex; gap:5px;">
                <button class="btn-approve" onclick="window.updateWithdrawal('${w.id}')">Jóváhagyás</button>
                <button class="btn-reject" onclick="window.rejectWithdrawal('${w.id}', '${w.user_id}', ${w.amount})">Elutasítás</button>
            </div>
        </div>
    `).join('');
}

// JÓVÁHAGYÁS (Alert nélkül)
window.updateWithdrawal = async function(id) {
    const { error } = await _supabase
        .from('withdrawals')
        .update({ status: 'completed' })
        .eq('id', id);

    if (error) {
        showToast("HIBA: " + error.message, 'error');
    } else {
        showToast("Sikeresen jóváhagyva!");
        loadWithdrawals(); 
    }
};

// ELUTASÍTÁS (Alert nélkül)
window.rejectWithdrawal = async function(wid, uid, amount) {
    const { error: statusError } = await _supabase
        .from('withdrawals')
        .update({ status: 'rejected' })
        .eq('id', wid);

    if (statusError) {
        showToast("HIBA: Nem sikerült módosítani a státuszt!", 'error');
        return;
    }

    try {
        const { data: p } = await _supabase.from('profiles').select('real_balance').eq('id', uid).single();
        const newBalance = parseFloat(p.real_balance) + parseFloat(amount);
        
        await _supabase.from('profiles').update({ real_balance: newBalance }).eq('id', uid);
        
        showToast("Kifizetés elutasítva, pénz visszatérítve!");
        loadData();
    } catch (e) {
        showToast("Hiba történt a pénz visszaadásakor!", 'error');
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
    const { error } = await _supabase.from('profiles').update({ is_restricted: !current }).eq('id', uid);
    if (error) {
        showToast("Hiba történt!", 'error');
    } else {
        showToast(current ? "Korlátozás feloldva" : "Felhasználó korlátozva");
        loadUsers();
    }
};

init();
