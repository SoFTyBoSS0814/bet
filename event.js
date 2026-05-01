// A Supabase inicializálása (ezt már biztosan használod az index.js-ben is)
const supabase = supabase.createClient('URL', 'KEY');

async function loadEventData(id) {
    // Adatlekérés
    const { data, error } = await supabase
        .from('markets') // Ellenőrizd, hogy a táblád neve valóban 'markets'!
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error("Hiba az adatok betöltésekor:", error);
        document.getElementById('teams').innerText = "Esemény nem található.";
        return;
    }

    if (data) {
        // DOM feltöltése
        document.getElementById('teams').innerText = `${data.home_team} - ${data.away_team}`;
        document.getElementById('home-odds').innerText = data.home_odds;
        document.getElementById('away-odds').innerText = data.away_odds;
        
        // Founder tipp: Itt állítsd be az oldal címét is dynamic-ra
        document.title = `StakeForge | ${data.home_team} vs ${data.away_team}`;
    }
}

// URL paraméter kezelése
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');

if (eventId) {
    loadEventData(eventId);
} else {
    document.getElementById('teams').innerText = "Nincs megadva esemény ID.";
}
