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

        if (error) return console.error(error);

        if (data) {
            // 1. Cím és Meta adatok
            document.getElementById('teams').innerText = data.title;
            document.getElementById('event-host').innerText = data.creator_name || 'admin';
            document.getElementById('event-pool').innerText = `${data.initial_liquidity} ${data.type === 'REAL' ? '€' : 'DEMO'}`;
            
            // 2. Határidő formázása
            if (data.deadline) {
                const d = new Date(data.deadline);
                document.getElementById('event-deadline').innerText = `⌛ DEADLINE: ${d.toLocaleString('hu-HU')}`;
            }

            // 3. Oddsok és Gombok (a note-ból)
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

            document.title = `StakeForge | ${data.title}`;
        }
    } catch (err) {
        console.error("Hiba:", err);
    }
}

const eventId = new URLSearchParams(window.location.search).get('id');
if (eventId) loadEventData(eventId);

function placeBet(side) {
    const name = document.getElementById(side + '-name').innerText;
    const odds = document.getElementById(side + '-odds').innerText;
    alert(`Fogadás rögzítése:\n${name}\nOdds: ${odds}`);
}
