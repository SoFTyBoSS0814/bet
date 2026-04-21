const urlParams = new URLSearchParams(window.location.search);
const currentEventId = urlParams.get('id');

async function initPage() {
    if (!currentEventId) return;

    // 1. Esemény adatainak lekérése
    const { data: event, error } = await _supabase
        .from('withdrawals') // Vagy a te esemény táblád neve (pl. 'events')
        .select('*')
        .eq('id', currentEventId)
        .single();

    if (event) {
        setupTabs(event.status);
        loadComments();
    }
}

function setupTabs(status) {
    const lockMessage = document.getElementById('bets-lock-message');
    const betsList = document.getElementById('public-bets-list');

    // Ha a státusz már befejezett (completed / rejected / closed)
    if (status === 'completed' || status === 'rejected') {
        lockMessage.style.display = 'none';
        betsList.style.display = 'block';
        loadPublicBets(); // Csak ekkor töltjük be az adatokat
    }
}

// Kommentek betöltése (VÉGIG ELÉRHETŐ)
async function loadComments() {
    const { data: comments } = await _supabase
        .from('comments')
        .select('*')
        .eq('bet_id', currentEventId)
        .order('created_at', { ascending: true });

    const list = document.getElementById('comment-list');
    list.innerHTML = comments.map(c => `
        <div class="comment-bubble">
            <span class="user">${c.username}:</span> ${c.comment_text}
        </div>
    `).join('');

    // Beviteli mező megjelenítése (48 órás korláttal, amit korábban írtam)
    setupCommentInput(); 
}

// Fogadások betöltése (CSAK KIÉRTÉKELÉSKOR)
async function loadPublicBets() {
    const { data: allBets } = await _supabase
        .from('bets')
        .select('username, bet_amount, multiplier, status')
        .eq('event_id', currentEventId); // Feltételezve, hogy van event_id a bets táblában

    const list = document.getElementById('public-bets-list');
    list.innerHTML = `
        <table style="width:100%">
            <tr><th>User</th><th>Tét</th><th>Eredmény</th></tr>
            ${allBets.map(b => `
                <tr>
                    <td>${b.username}</td>
                    <td>${b.bet_amount}€</td>
                    <td style="color:${b.status === 'win' ? '#00e701' : '#ff4646'}">${b.status}</td>
                </tr>
            `).join('')}
        </table>
    `;
}

function openTab(evt, tabName) {
    let tabcontent = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabcontent.length; i++) tabcontent[i].style.display = "none";
    
    let tablinks = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < tablinks.length; i++) tablinks[i].className = tablinks[i].className.replace(" active", "");
    
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

initPage();
