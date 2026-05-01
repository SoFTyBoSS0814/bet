const SB_URL = 'https://ldcrycuoynashsqlosae.supabase.co';
const SB_KEY = 'sb_publishable_Jdda8r4L3n-CkQPLX4qsPA_A5kRJy1b';
const _supabase = supabase.createClient(SB_URL, SB_KEY);

let currentMarketLiquidity = 0; // Itt tároljuk a piac likviditását

async function loadEventData(id) {
    try {
        const { data, error } = await _supabase
            .from('markets') 
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (data) {
            currentMarketLiquidity = data.initial_liquidity; // Elmentjük a poolt ellenőrzéshez

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
        console.error("Hiba az adatoknál:", err);
    }
}

const eventId = new URLSearchParams(window.location.search).get('id');
if (eventId) loadEventData(eventId);

function placeBet(side) {
    const name = document.getElementById(side + '-name').innerText;
    const odds = document.getElementById(side + '-odds').innerText;
    const slip = document.getElementById('bet-slip');
    const msg = document.getElementById('slip-message');
    
    // Alaphelyzetbe állítás
    msg.style.display = 'none';
    document.getElementById('confirm-btn').style.display = 'block';
    
    document.getElementById('slip-team').innerText = name;
    document.getElementById('slip-odds').innerText = odds;
    slip.style.display = 'block';
}

function confirmBet() {
    const amount = parseFloat(document.getElementById('bet-amount').value);
    const msg = document.getElementById('slip-message');
    const btn = document.getElementById('confirm-btn');

    // 1. Üres vagy érvénytelen tét ellenőrzése
    if (isNaN(amount) || amount <= 0) {
        showMessage("Érvénytelen tét!", "#f43f5e");
        return;
    }

    // 2. Likviditás (Pool) ellenőrzése
    if (amount > currentMarketLiquidity) {
        showMessage("Hiba: Nincs elég likviditás a poolban!", "#f43f5e");
        return;
    }

    // 3. Siker (Szimuláció)
    // Itt küldenénk el a Supabase-nek a fogadást
    showMessage("✓ Sikeres fogadás!", "#10b981");
    btn.style.display = 'none'; // Elrejtjük a gombot, hogy ne küldhesse be újra

    // 3 másodperc múlva bezárjuk a szelvényt automatikusan
    setTimeout(() => {
        document.getElementById('bet-slip').style.display = 'none';
    }, 3000);
}

// Segédfüggvény az üzenetek kiírásához
function showMessage(text, color) {
    const msg = document.getElementById('slip-message');
    msg.innerText = text;
    msg.style.backgroundColor = color + "22"; // Átlátszó háttér
    msg.style.color = color;
    msg.style.display = 'block';
}
