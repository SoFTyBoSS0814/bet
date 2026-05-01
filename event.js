// 1. Supabase inicializálása a te projekt adataiddal
const SB_URL = 'https://ldcrycuoynashsqlosae.supabase.co';
const SB_KEY = 'sb_publishable_Jdda8r4L3n-CkQPLX4qsPA_A5kRJy1b';

// A "supabase" változót a CDN-ből kapjuk, mi pedig létrehozzuk az ügyfelet _supabase néven
const _supabase = supabase.createClient(SB_URL, SB_KEY);

/**
 * Betölti az esemény adatait az ID alapján
 */
async function loadEventData(id) {
    console.log("Adatok lekérése a következő ID-hoz:", id);

    try {
        // 2. Adatlekérés a 'markets' táblából
        const { data, error } = await _supabase
            .from('markets') 
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error("Hiba az adatok betöltésekor:", error);
            document.getElementById('teams').innerText = "Esemény nem található.";
            return;
        }

        if (data) {
            // 3. A főcím beállítása (pl. Real Madrid - Barcelona)
            const teamTitle = document.getElementById('teams');
            if (teamTitle) teamTitle.innerText = `${data.home_team} - ${data.away_team}`;

            // 4. A csapatnevek beírása a gombokra (biztonsági ellenőrzéssel)
            const homeNameEl = document.getElementById('home-name');
            const awayNameEl = document.getElementById('away-name');
            
            if (homeNameEl) homeNameEl.innerText = data.home_team;
            if (awayNameEl) awayNameEl.innerText = data.away_team;

            // 5. Az oddsok beírása
            const homeOddsEl = document.getElementById('home-odds');
            const awayOddsEl = document.getElementById('away-odds');
            
            if (homeOddsEl) homeOddsEl.innerText = data.home_odds;
            if (awayOddsEl) awayOddsEl.innerText = data.away_odds;
            
            // 6. Böngésző fül címének frissítése
            document.title = `StakeForge | ${data.home_team} vs ${data.away_team}`;
            
            console.log("Sikeres betöltés:", data.home_team, "vs", data.away_team);
        }
    } catch (err) {
        console.error("Váratlan hiba:", err);
    }
}

/**
 * URL paraméter kinyerése (pl. event.html?id=123)
 */
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');

// Ha van ID az URL-ben, indítjuk a betöltést
if (eventId) {
    loadEventData(eventId);
} else {
    const teamTitle = document.getElementById('teams');
    if (teamTitle) teamTitle.innerText = "Nincs megadva esemény ID.";
    console.warn("Hiányzó event ID az URL-ből!");
}

/**
 * Fogadási függvény - Kezeli a gombnyomásokat
 */
function placeBet(side) {
    console.log("Fogadás kiválasztva:", side);
    
    // Lekérjük a csapat nevét a gomb alapján a felületről
    const teamName = side === 'home' 
        ? document.getElementById('home-name').innerText 
        : document.getElementById('away-name').innerText;

    alert(`Fogadás rögzítése: ${teamName}\nSikeresen kiválasztva! A fogadási panel hamarosan érkezik.`);
    
    // Itt folytathatjuk majd a valódi egyenleglevonással
}
