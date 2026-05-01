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
            // 1. Cím beállítása
            if (document.getElementById('teams')) {
                document.getElementById('teams').innerText = data.title;
            }

            // 2. Extra adatok (csak ha léteznek a HTML-ben!)
            if (document.getElementById('event-host')) {
                document.getElementById('event-host').innerText = data.creator_name || 'admin';
            }
            if (document.getElementById('event-pool')) {
                const currency = data.type === 'REAL' ? '€' : 'DEMO';
                document.getElementById('event-pool').innerText = `${data.initial_liquidity} ${currency}`;
            }
            if (document.getElementById('event-deadline') && data.deadline) {
                const d = new Date(data.deadline);
                document.getElementById('event-deadline').innerText = `⌛ DEADLINE: ${d.toLocaleString('hu-HU')}`;
            }

            // 3. Oddsok kibontása a note oszlopból
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

// URL paraméter és indítás
const eventId = new URLSearchParams(window.location.search).get('id');
if (eventId) {
    loadEventData(eventId);
}

// Fogadás gomb
function placeBet(side) {
    const nameEl = document.getElementById(side + '-name');
    const oddsEl = document.getElementById(side + '-odds');
    if (nameEl && oddsEl) {
        alert(`Fogadás rögzítése:\n${nameEl.innerText}\nOdds: ${oddsEl.innerText}`);
    }
}
