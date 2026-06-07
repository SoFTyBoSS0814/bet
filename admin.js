const SUPABASE_URL = "https://ldcrycuoynashsqlosae.supabase.co";
const SUPABASE_KEY = "sb_publishable_Jdda8r4L3n-CkQPLX4qsPA_A5kRJy1b"; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Közös stílus a felugró ablakoknak
const swalConfig = {
    background: '#1a2c38',
    color: '#b1bad3',
    confirmButtonColor: '#00e701',
    cancelButtonColor: '#ff4646'
};

async function init() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) { window.location.href = "index.html"; return; }
    const { data: profile } = await _supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();
    if (!profile || !profile.is_admin) { window.location.href = "index.html"; return; }
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
            <div>
                <strong>${w.username}</strong>: ${w.amount}€ 
                <br><br>
                <div style="background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.05); padding: 6px 12px; border-radius: 6px; display: inline-block;">
                    <strong style="color: #ffffff; font-size: 0.8rem; margin-right: 5px;">BTC WALLET:</strong>
                    <span style="color: #ffca28; font-size: 0.9rem; font-family: monospace; letter-spacing: 0.5px;">${w.btc_address}</span>
                </div>
            </div>
            <div>
                <button class="btn-approve" onclick="window.updateWithdrawal('${w.id}', 'completed')">Jóváhagyás</button>
                <button class="btn-reject" onclick="window.rejectWithdrawal('${w.id}', '${w.user_id}', ${w.amount})">Elutasítás</button>
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
                    onclick="window.toggleRestrict('${u.id}', ${u.is_restricted})">
                ${u.is_restricted ? 'Feloldás' : 'Korlátozás'}
            </button>
        </div>
    `).join('');
}

window.toggleRestrict = async function(uid, current) {
    await _supabase.from('profiles').update({ is_restricted: !current }).eq('id', uid);
    Swal.fire({ ...swalConfig, title: 'Kész!', text: 'Státusz frissítve.', icon: 'success', timer: 1500, showConfirmButton: false });
    loadUsers();
}

window.updateWithdrawal = async function(id, status) {
    const result = await Swal.fire({
        ...swalConfig,
        title: 'Jóváhagyás?',
        text: "Biztosan kifizeted ezt az összeget?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Igen, mehet!',
        cancelButtonText: 'Mégse'
    });

    if (result.isConfirmed) {
        await _supabase.from('withdrawals').update({ status }).eq('id', id);
        Swal.fire({ ...swalConfig, title: 'Siker!', text: 'Kifizetés jóváhagyva.', icon: 'success' });
        loadWithdrawals();
    }
}

window.rejectWithdrawal = async function(wid, uid, amount) {
    const result = await Swal.fire({
        ...swalConfig,
        title: 'Elutasítás?',
        text: `Biztosan elutasítod? ${amount}€ visszakerül a felhasználóhoz.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Igen, utasítsd el!',
        cancelButtonText: 'Mégse'
    });

    if (result.isConfirmed) {
        const { data: p } = await _supabase.from('profiles').select('real_balance').eq('id', uid).single();
        await _supabase.from('profiles').update({ real_balance: p.real_balance + amount }).eq('id', uid);
        await _supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', wid);
        Swal.fire({ ...swalConfig, title: 'Elutasítva', text: 'Az összeg visszatérítve.', icon: 'info' });
        loadData();
    }
}

init();
