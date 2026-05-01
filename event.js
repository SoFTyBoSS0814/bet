// 1. Supabase adatok PONTOSAN beállítva
const SB_URL = 'https://ldcrycuoynashsqlosae.supabase.co';
const SB_KEY = 'sb_publishable_Jdda8r4L3n-CkQPLX4qsPA_A5kRJy1b';

// Inicializálás a Supabase könyvtárral
const _supabase = supabase.createClient(SB_URL, SB_KEY);

/**
 * Betölti az esemény adatait az URL-ben kapott ID alapján
 */
async function loadEventData(id) {
    console.log("Lekérés indítása az ID-hoz:", id);

    try {
        // Adatlekérés a 'markets' táblából
        const { data, error } = await _supabase
            .from('markets') 
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error("Adatbázis hiba:", error);
            document.getElementById('teams').innerText = "Esemény nem található.";
            return;
        }

        if (data) {
            // A főcím beállítása (a te tábládban ez a 'title' oszlop)
            document.getElementById('teams').innerText = data.title;

            // A 'note' oszlopban lévő JSON feldolgozása az oddsokhoz
            try {
                const details = JSON.parse(data.note || "[]");
                const marketData = details[0] || {};
                const outcomes = marketData.outcomes || [];

                // Első kimenetel (pl. "Tisza" vagy "7,5 Felett")
                if (outcomes[0]) {
                    document.getElementById('home-name').innerText = outcomes[0].n || "Opció 1";
                    document.getElementById('home-odds').innerText = outcomes[0].o || "--";
                }

                // Második kimenetel (pl. "Fidesz" vagy "7,5 Alatt")
                if (outcomes[1]) {
                    document.getElementById('away-name').innerText = outcomes[1].n || "Opció 2";
                    document.getElementById('away-odds').innerText = outcomes[1].o || "--";
                }
            } catch (jsonErr) {
                console.error("JSON feldolgozási hiba a 'note' mezőnél:", jsonErr);
            }

            // Böngésző fül címének frissítése
            document.title = `StakeForge | ${data.title}`;
            console.log("Sikeres betöltés:", data.title);
        }
    } catch (err) {
        console.error("Váratlan hiba történt:", err);
    }
}

/**
 * URL paraméter kinyerése (pl. event.html?id=...)
 */
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');

if (eventId) {
    loadEventData(eventId);
} else {
    document.getElementById('teams').innerText = "Nincs megadva esemény ID az URL-ben.";
}

/**
 * Fogadási függvény a gombokhoz
 */
function placeBet(side) {
    const teamName = side === 'home' 
        ? document.getElementById('home-name').innerText 
        : document.getElementById('away-name').innerText;
    
    const odds = side === 'home'
        ? document.getElementById('home-odds').innerText
        : document.getElementById('away-odds').innerText;

    console.log(`Fogadás: ${teamName} (Odds: ${odds})`);
    alert(`Fogadás rögzítése:\n${teamName}\nOdds: ${odds}`);
}
