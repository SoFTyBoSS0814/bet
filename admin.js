// Konfiguráció
const SUPABASE_URL = "https://ldcrycuoynashsqlosae.supabase.co";
const SUPABASE_KEY = "sb_publishable_Jdda8r4L3n-CkQPLX4qsPA_A5kRJy1b";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Inicializálás
async function init() {
    console.log("Admin felület inicializálása...");
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
    await loadWithdrawals();
    await loadUsers();
}

// Lista betöltése (Csak a függő kifizetések)
async function loadWithdrawals() {
    console.log("Kifizetések lekérése...");
    const { data: ws, error } = await _supabase
        .from('withdrawals')
        .select('*')
        .eq('status', 'pending');
    
    const div = document.getElementById('withdrawal-list');
    
    if (error) { console.error("Lekérési hiba:", error); return; }
    
    if (!ws || ws.length === 0) { 
        div.innerHTML = "<p style='text-align:center; color:gray; padding:20px;'>Nincs függő kérelem.</p>"; 
        return; 
    }

    div.innerHTML = ws.map(w => `
        <div class="user-card">
            <div>
                <strong>${w.username || 'Ismeretlen'}</strong>: <span style="color:var(--primary); font-weight:bold;">${w.amount}€</span>
                <br><small style="color:gray;">Cím: ${w.btc_address}</small>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn-approve" onclick="window.updateWithdrawal('${w.id}', 'completed')">Jóváhagyás</button>
                <button class="btn-reject" onclick="window.rejectWithdrawal('${w.id}', '${w.user_id}', ${w.amount})">Elutasítás</button>
            </div>
        </div>
    `).join('');
}

async function loadUsers() {
    const { data: users, error } = await _supabase.from('profiles').select('*').order('username');
    const div = document.getElementById('user-list');
    
    if (error) { console.error("Hiba a felhasználók lekérésekor:", error); return; }
    
    div.innerHTML = users.map(u => `
        <div class="user-card ${u.is_restricted ? 'restricted' : ''}">
            <div>
                <strong>${u.username}</strong> (${u.real_balance.toFixed(2)}€)
                <br><small>${u.is_restricted ? '🔴 KORLÁTOZVA' : '🟢 AKTÍV'}</small>
            </div>
            <button class="${u.is_restricted ? 'btn-unrestrict' : 'btn-restrict'}" 
                    onclick="window.toggleRestrict('${u.id}', ${u.is_restricted})">
                ${u.is_restricted ? 'Feloldás' : 'Korlátozás'}
            </button>
        </div>
    `).join('');
}

// --- GLOBÁLIS MŰVELETEK ---

window.toggleRestrict = async function(uid, current) {
    const { error } = await _supabase.from('profiles').update({ is_restricted: !current }).eq('id', uid);
    if (error) alert("Hiba: " + error.message);
    else loadUsers();
};

window.updateWithdrawal = async function(id, status) {
    if (!confirm("Biztosan JÓVÁHAGYOD ezt a kifizetést?")) return;
    
    console.log("Státusz frissítése COMPLETED-re, ID:", id);
    const { error } = await _supabase
        .from('withdrawals')
        .update({ status: 'completed' }) 
        .eq('id', id)
        .select();

    if (error) {
        alert("Hiba a jóváhagyáskor: " + error.message);
    } else {
        alert("Kifizetés sikeresen JÓVÁHAGYVA!");
        await loadWithdrawals(); // Frissítés, hogy eltűnjön a listából
    }
};

window.rejectWithdrawal = async function(wid, uid, amount) {
    if (!confirm("Biztosan ELUTASÍTOD a kifizetést? Az összeg visszakerül a felhasználóhoz.")) return;

    try {
        // 1. Egyenleg lekérése
        const { data: p, error: pErr } = await _supabase.from('profiles').select('real_balance').eq('id', uid).single();
        if (pErr) throw pErr;

        // 2. Egyenleg visszaadása
        const newBalance = parseFloat(p.real_balance) + parseFloat(amount);
        const { error: upErr } = await _supabase.from('profiles').update({ real_balance: newBalance }).eq('id', uid);
        if (upErr) throw upErr;

        // 3. Státusz átírása REJECTED-re
        const { error: wErr } = await _supabase
            .from('withdrawals')
            .update({ status: 'rejected' })
            .eq('id', wid)
            .select();
        
        if (wErr) throw wErr;

        alert("Kifizetés elutasítva és visszatérítve!");
        await loadData();
        
    } catch (err) {
        console.error("Elutasítási hiba:", err);
        alert("Hiba történt az elutasítás során: " + err.message);
    }
};

// Indítás
init();
