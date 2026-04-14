// geo.js
async function checkGeoRestriction() {
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        
        // Visszaadja, hogy magyar-e (true/false)
        return data.country_code === 'HU';
    } catch (e) {
        console.error("Geo-check hiba:", e);
        return false; // Hiba esetén biztonsági okból nem tiltunk le mindent
    }
}

function updateGeoUI(isHU, userBTCAddress) {
    const geoWarning = document.getElementById('geo-restriction');
    const btcArea = document.getElementById('btc-wallet-area');

    if (isHU) {
        // Ha magyar: üzenet mutat, BTC panel elrejt
        geoWarning.style.display = 'block';
        geoWarning.innerText = "⚠️ Magyarország területéről a kriptovaluta BE/KI fizetés nem engedélyezett.";
        btcArea.innerHTML = ""; 
    } else {
        // Ha nem magyar: üzenet elrejt, BTC panel kirajzolása
        geoWarning.style.display = 'none';
        renderBTCPanel(userBTCAddress);
    }
}
