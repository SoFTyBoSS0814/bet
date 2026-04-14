// geo.js
async function checkGeoRestriction() {
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        
        // Visszaadjuk, hogy magyar-e az IP
        return data.country_code === 'HU';
    } catch (e) {
        console.error("Geo-check error:", e);
        return false; // Hiba esetén alapértelmezetten nem tiltunk, vagy döntés szerint fordítva
    }
}

function applyGeoUI(isHungarian) {
    const restrictionWarning = document.getElementById('geo-restriction');
    const btcArea = document.getElementById('btc-wallet-area');

    if (isHungarian) {
        if (restrictionWarning) restrictionWarning.style.display = 'block';
        if (btcArea) btcArea.innerHTML = ""; 
    }
}
