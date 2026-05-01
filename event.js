const SB_URL = 'https://ldcrycuoynashsqlosae.supabase.co';
const SB_KEY = 'sb_publishable_Jdda8r4L3n-CkQPLX4qsPA_A5kRJy1b';
const _supabase = supabase.createClient(SB_URL, SB_KEY);

async function loadEventData(id) {
    console.log("Adatok lekérése a következő ID-hoz:", id);

    try {
        const { data, error } = await _supabase
            .from('markets') 
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error("Hiba:", error);
            document.getElementById('teams').innerText = "Esemény nem található.";
            return;
        }

        if (data) {
            // A főcím nálad a 'title' oszlop
            document.getElementById('teams').innerText = data.title;

            // A 'note' oszlopodban van az infó JSON formátumban, dolgozzuk fel:
            try {
                const details = JSON.parse(data.note || "[]");
                // Feltételezzük az első csoport adatait használjuk
                const marketData = details[0] || {};
                const outcomes = marketData.outcomes || [];

                // Első kimenetel (pl. 7,5 Felett vagy Tisza)
                if (outcomes[0]) {
                    document.getElementById('home-name').innerText = outcomes[0].n || "Hazai";
                    document.getElementById('home-odds').innerText = outcomes[0].o || "--";
                }

                // Második kimenetel (pl. 7,5 Alatt vagy Fidesz)
                if (outcomes[1]) {
                    document.getElementById('away-name').innerText = outcomes[1].n || "Vendég";
                    document.getElementById('away-odds').innerText = outcomes[1].o || "--";
                }
            } catch (jsonErr) {
                console.error("Hiba a note mező értelmezésekor:", jsonErr);
                // Ha nem JSON, akkor maradnak az alapértelmezett értékek
            }

            document.title = `StakeForge | ${data.title}`;
        }
    } catch (err) {
        console.error("Váratlan hiba:", err);
    }
}

const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');

if (eventId) {
    loadEventData(eventId);
} else {
    document.getElementById('teams').innerText = "Nincs megadva esemény ID.";
}

function placeBet(side) {
    const teamName = side === 'home' 
        ? document.getElementById('home-name').innerText 
        : document.getElementById('away-name').innerText;
    alert(`Fogadás rögzítése: ${teamName}`);
}
