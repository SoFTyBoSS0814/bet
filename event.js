const SB_URL = 'https://ldcrycuoynashsqlosae.supabase.co';
const SB_KEY = 'sb_publishable_Jdda8r4L3n-CkQPLX4qsPA_A5kRJy1b';
const _supabase = supabase.createClient(SB_URL, SB_KEY);

async function loadEventData(id) {
    try {
        const { data, error } = await _supabase
            .from('markets') 
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (data) {
            // Cím és Meta adatok beállítása
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

            // Oddsok és nevek kinyerése a note (JSON) mezőből
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
        console.error("Hiba az adatoknál:", err);
    }
}

// URL-ből az ID kinyerése és indítás
const eventId = new URLSearchParams(window.location.search).get('id');
if (eventId) loadEventData(eventId);

// --- ÚJ FOGADÁSI LOGIKA (NEM ALERT) ---

function placeBet(side) {
    const name = document.getElementById(side + '-name').innerText;
    const odds = document.getElementById(side + '-odds').innerText;
    
    // Megkeressük a HTML-be rakott szelvényt
    const slip = document.getElementById('bet-slip');
    
    // Behelyettesítjük az adatokat a szelvénybe
    document.getElementById('slip-team').innerText = name;
    document.getElementById('slip-odds').innerText = odds;
    
    // Megjelenítjük az ablakot
    slip.style.display = 'block';
}

function confirmBet() {
    const team = document.getElementById('slip-team').innerText;
    const amount = document.getElementById('bet-amount').value;
    const odds = document.getElementById('slip-odds').innerText;

    // Itt egyelőre egy barátságos visszajelzés jön (nem rendszerszintű alert)
    // Később ide jön a Supabase-be való mentés
    console.log("Fogadás elküldve:", { team, amount, odds });
    
    // Bezárjuk a szelvényt
    document.getElementById('bet-slip').style.display = 'none';
    
    // Opcionális: egy kis értesítés, hogy sikerült
    alert("Sikeres fogadás!"); 
}
