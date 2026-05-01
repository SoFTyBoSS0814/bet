// Konfiguráció
const SB_URL = 'https://ldcrycuoynashsqlosae.supabase.co';
const SB_KEY = 'sb_publishable_Jdda8r4L3n-CkQPLX4qsPA_A5kRJy1b';
const _supabase = supabase.createClient(SB_URL, SB_KEY);

let currentMarketLiquidity = 0; // Globális változó a likviditás ellenőrzéséhez

// 1. Adatok betöltése az oldal indulásakor
async function loadEventData(id) {
    try {
        const { data, error } = await _supabase
            .from('markets') 
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (data) {
            // Elmentjük a likviditást a későbbi ellenőrzéshez
            currentMarketLiquidity = data.initial_liquidity || 0;

            // Alapadatok kitöltése a HTML-ben
            if (document.getElementById('teams')) document.getElementById('teams').innerText = data.title;
            if (document.getElementById('event-host')) document.getElementById('event-host').innerText = data.creator_name || 'admin';
            
            // Pénznem és Pool megjelenítése
            if (document.getElementById('event-pool')) {
                const currency = data.type === 'REAL' ? '€' : 'DEMO';
                document.getElementById('event-pool').innerText = `${currentMarketLiquidity} ${currency}`;
            }

            // Határidő formázása
            if (document.getElementById('event-deadline') && data.deadline) {
                const d = new Date(data.deadline);
                document.getElementById('event-deadline').innerText = `⌛ DEADLINE: ${d.toLocaleString('hu-HU')}`;
            }

            // Oddsok kinyerése a JSON mezőből
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

            document.title = `StakeForge | ${data.title}`;
        }
    } catch (err) {
        console.error("Hiba az adatok betöltésekor:", err);
    }
}

// 2. Fogadószelvény megnyitása
function placeBet(side) {
    const nameEl = document.getElementById(side + '-name');
    const oddsEl = document.getElementById(side + '-odds');
    const slip = document.getElementById('bet-slip');
    const msg = document.getElementById('slip-message');
    const btn = document.getElementById('confirm-btn');

    // Ha bármelyik elem hiányzik a HTML-ből, ne fusson tovább a kód
    if (!nameEl || !oddsEl || !slip) {
        console.error("Hiba: Hiányzó HTML elemek a szelvényhez!");
        return;
    }

    // Ablak alaphelyzetbe állítása
    if (msg) msg.style.display = 'none';
    if (btn) btn.style.display = 'block';
    
    // Adatok behelyettesítése
    document.getElementById('slip-team').innerText = nameEl.innerText;
    document.getElementById('slip-odds').innerText = oddsEl.innerText;
    
    // Szelvény megjelenítése
    slip.style.display = 'block';
}

// 3. Fogadás véglegesítése (Gombnyomásra)
function confirmBet() {
    const amountInput = document.getElementById('bet-amount');
    const amount = parseFloat(amountInput.value);
    const btn = document.getElementById('confirm-btn');

    // Érvényesség ellenőrzése
    if (isNaN(amount) || amount <= 0) {
        showMessage("Érvénytelen tét!", "#f43f5e");
        return;
    }

    // Likviditás ellenőrzése (ne fogadhass többet, mint ami a bankban van)
    if (amount > currentMarketLiquidity) {
        showMessage("Hiba: Nincs elég likviditás!", "#f43f5e");
        return;
    }

    // --- SIKER ---
    showMessage("✓ Sikeres fogadás!", "#10b981");
    
    // Elrejtjük a gombot, hogy ne lehessen duplán rányomni
    if (btn) btn.style.display = 'none';

    // 2.5 másodperc múlva bezárjuk az ablakot
    setTimeout(() => {
        const slip = document.getElementById('bet-slip');
        if (slip) slip.style.display = 'none';
    }, 2500);
}

// 4. Segédfüggvény az üzenetek kiírásához a szelvényen belül
function showMessage(text, color) {
    const msg = document.getElementById('slip-message');
    if (msg) {
        msg.innerText = text;
        msg.style.backgroundColor = color + "22"; // Nagyon halvány háttér a színnek
        msg.style.color = color;
        msg.style.display = 'block';
    } else {
        // Ha véletlenül nincs meg a message div, végszükség esetén alert
        alert(text);
    }
}

// Inicializálás az URL-ben lévő ID alapján
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');

if (eventId) {
    loadEventData(eventId);
} else {
    console.warn("Nincs esemény ID az URL-ben.");
}
