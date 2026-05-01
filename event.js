const SB_URL = 'https://ldcrycuoynashsqlosae.supabase.co';
const SB_KEY = 'sb_publishable_Jdda8r4L3n-CkQPLX4qsPA_A5kRJy1b';
const _supabase = supabase.createClient(SB_URL, SB_KEY);

let currentMarketLiquidity = 0;

async function loadEventData(id) {
    try {
        const { data, error } = await _supabase
            .from('markets') 
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (data) {
            currentMarketLiquidity = data.initial_liquidity;

            if (document.getElementById('teams')) document.getElementById('teams').innerText = data.title;
            if (document.getElementById('event-host')) document.getElementById('event-host').innerText = data.creator_name || 'admin';
            
            if (document.getElementById('event-pool')) {
                const currency = data.type === 'REAL' ? '€' : 'DEMO';
                document.getElementById('event-pool').innerText = `${data.initial_liquidity} ${currency}`;
            }

            if (document.getElementById('event-deadline') && data.deadline) {
                const d = new Date(data.deadline);
                document.getElementById('event-deadline').innerText = `⌛ DEADLINE: ${d.toLocaleString('hu-HU')}`;
            }

            const details = JSON.parse(data.note || "[]");
            const outcomes = details[0]?.outcomes || [];

            if (outcomes[0]) {
                if (document.getElementById('home-name')) document.getElementById('home-name').innerText = outcomes[0].n;
                if (document.getElementById('home-odds')) document.getElementById('home-odds').innerText = outcomes[0].o;
            }
            if (outcomes[1]) {
                if (document.getElementById('away-name')) document.getElementById('away-name').innerText = outcomes[1].n;
                if (document.getElementById('away-odds')) document.getElementById('away-odds').innerText = outcomes[1].o;
            }
        }
    } catch (err) {
        console.error("Hiba:", err);
    }
}

const eventId = new URLSearchParams(window.location.search).get('id');
if (eventId) loadEventData(eventId);

// --- FOGADÁSI LOGIKA ---

function placeBet(side) {
    const nameEl = document.getElementById(side + '-name');
    const oddsEl = document.getElementById(side + '-odds');
    const slip = document.getElementById('bet-slip');
    const msg = document.getElementById('slip-message');
    const btn = document.getElementById('confirm-btn');

    if (!nameEl || !oddsEl || !slip) return;

    // Reset ablak állapota
    msg.style.display = 'none';
    btn.style.display = 'block';
    
    document.getElementById('slip-team').innerText = nameEl.innerText;
    document.getElementById('slip-odds').innerText = oddsEl.innerText;
    slip.style.display = 'block';
}

function confirmBet() {
    const amountInput = document.getElementById('bet-amount');
    const amount = parseFloat(amountInput.value);
    const btn = document.getElementById('confirm-btn');

    if (isNaN(amount) || amount <= 0) {
        showMessage("Érvénytelen tét!", "#f43f5e");
        return;
    }

    if (amount > currentMarketLiquidity) {
        showMessage("Hiba: Nincs elég likviditás!", "#f43f5e");
        return;
    }

    // Siker visszajelzés
    showMessage("✓ Sikeres fogadás!", "#10b981");
    btn.style.display = 'none';

    setTimeout(() => {
        document.getElementById('bet-slip').style.display = 'none';
    }, 2500);
}

function showMessage(text, color) {
    const msg = document.getElementById('slip-message');
    if (msg) {
        msg.innerText = text;
        msg.style.backgroundColor = color + "22"; 
        msg.style.color = color;
        msg.style.display = 'block';
    }
}
