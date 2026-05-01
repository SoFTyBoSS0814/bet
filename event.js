// 1. Supabase inicializálása - Használd a saját URL-ed és Kulcsod!
const _supabase = supabase.createClient('URL', 'KEY');

async function loadEventData(id) {
    console.log("Adatok lekérése a következő ID-hoz:", id);

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
        document.getElementById('teams').innerText = `${data.home_team} - ${data.away_team}`;

        // 4. A csapatnevek beírása a gombokra
        if(document.getElementById('home-name')) {
            document.getElementById('home-name').innerText = data.home_team;
        }
        if(document.getElementById('away-name')) {
            document.getElementById('away-name').innerText = data.away_team;
        }

        // 5. Az oddsok beírása
        document.getElementById('home-odds').innerText = data.home_odds;
        document.getElementById('away-odds').innerText = data.away_odds;
        
        // 6. Böngésző fül címének frissítése
        document.title = `StakeForge | ${data.home_team} vs ${data.away_team}`;
        
        console.log("Sikeres betöltés:", data.home_team, "vs", data.away_team);
    }
}

// 7. URL paraméter kinyerése (pl. event.html?id=123)
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');

if (eventId) {
    loadEventData(eventId);
} else {
    document.getElementById('teams').innerText = "Nincs megadva esemény ID.";
    console.warn("Hiányzó event ID az URL-ből!");
}

// 8. Fogadási függvény (hogy ne dobjon hibát a gombnyomás)
function placeBet(side) {
    console.log("Fogadás kiválasztva:", side);
    alert("Fogadás kiválasztva: " + side + ". A fogadási logika következik!");
    // Ide jön majd a tényleges fogadási script, ha készen állsz
}
