const SB_URL = 'https://ldcrycuoynashsqlosae.supabase.co';
const SB_KEY = 'sb_publishable_Jdda8r4L3n-CkQPLX4qsPA_A5kRJy1b';
const _supabase = supabase.createClient(SB_URL, SB_KEY);

let currentMarketLiquidity = 0; 
let currentCurrency = "DEMO";

async function loadEventData(id) {
    try {
        const { data, error } = await _supabase
            .from('markets') 
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (data) {
            currentMarketLiquidity = data.initial_liquidity || 0;
            currentCurrency = data.type === 'REAL' ? '€' : 'DEMO';

            document.getElementById('teams').innerText = data.title;
            document.getElementById('event-host').innerText = data.creator_name || 'admin';
            
            // Likviditás kiírása
            updateLiquidityDisplay();

            if (document.getElementById('event-deadline') && data.deadline) {
                const d = new Date(data.deadline);
                document.getElementById('event-deadline').innerText = `⌛ DEADLINE: ${d.toLocaleString('hu-HU')}`;
            }

            const details = JSON.parse(data.note || "[]");
            const outcomes = details[0]?.outcomes || [];

            if (outcomes[0]) {
                document.getElementById('home-name').innerText = outcomes[0].n;
                document.getElementById('home-odds').innerText = outcomes[0].o;
            }
            if (outcomes[1]) {
                document.getElementById('away-name').innerText = outcomes[1].n;
                document.getElementById('away-odds').innerText = outcomes[1].o;
            }
        }
    } catch (err) {
        console.error("Hiba:", err);
    }
}

// ÚJ: Függvény a pool kijelző frissítéséhez
function updateLiquidityDisplay() {
    const poolEl = document.getElementById('event-pool');
    if (poolEl) {
        poolEl.innerText = `${currentMarketLiquidity.toLocaleString()} ${currentCurrency}`;
    }
}

function placeBet(side) {
    const nameEl = document.getElementById(side + '-name');
    const oddsEl = document.getElementById(side + '-odds');
    const slip = document.getElementById('bet-slip');
    
    // Alaphelyzet: Üzenet elrejtése, gomb mutatása
    document.getElementById('slip-message').style.display = 'none';
    document.getElementById('confirm-btn').style.display = 'block';
    
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

    // --- SIKERES FOGADÁS LOGIKÁJA ---
    
    // 1. Levonjuk a likviditást helyileg
    currentMarketLiquidity -= amount;
    
    // 2. Frissítjük a kijelzőt a kártyán (Pool: XXX DEMO)
    updateLiquidityDisplay();

    // 3. Megjelenítjük a zöld üzenetet a dobozban
    showMessage("✓ Sikeres fogadás!", "#10b981");
    
    // 4. Elrejtjük a gombot
    btn.style.display = 'none';

    // 5. 2 másodperc múlva bezárjuk a szelvényt
    setTimeout(() => {
        document.getElementById('bet-slip').style.display = 'none';
    }, 2000);
}

function showMessage(text, color) {
    const msg = document.getElementById('slip-message');
    // Itt kivettem az alert tartalékot, hogy csak a dobozba írjon!
    msg.innerText = text;
    msg.style.backgroundColor = color + "22"; 
    msg.style.color = color;
    msg.style.display = 'block';
}

const eventId = new URLSearchParams(window.location.search).get('id');
if (eventId) loadEventData(eventId);
