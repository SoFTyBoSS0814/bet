/**
 * STAKEFORGE - Bitcoin Address Management Module
 * Feladata: BTC címek biztonságos mentése és betöltése
 */

// Mentés funkció
async function saveBTCAddress() {
    const btcInput = document.getElementById('acc-btc');
    const statusMsg = document.getElementById('btc-status');
    const address = btcInput.value.trim();

    // Ha üres, ne csináljon semmit
    if (!address) {
        alert("Kérlek, adj meg egy Bitcoin címet!");
        return;
    }

    // Alapvető BTC cím formátum ellenőrzés (SegWit, Legacy, P2SH)
    const btcRegex = /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/;
    if (!btcRegex.test(address)) {
        alert("Úgy tűnik, ez nem egy érvényes Bitcoin cím!");
        return;
    }

    try {
        const { error } = await _supabase
            .from('profiles')
            .update({ btc_address: address })
            .eq('id', currentUser.id);

        if (error) throw error;

        // Siker visszajelzés
        statusMsg.innerText = "✅ Cím sikeresen elmentve!";
        statusMsg.style.color = "var(--success)";
        
        // Frissítjük a memóriában is
        if (typeof userProfile !== 'undefined' && userProfile !== null) {
            userProfile.btc_address = address;
        }

        // 3 másodperc múlva eltüntetjük a feliratot
        setTimeout(() => { statusMsg.innerText = ""; }, 3000);

    } catch (err) {
        console.error("BTC Save Error:", err);
        alert("Hiba történt a mentés során. Ellenőrizd a kapcsolatot!");
    }
}

// Betöltés funkció (Ezt hívja meg az index.html a fetchProfile végén)
function loadSavedBTC(address) {
    const btcInput = document.getElementById('acc-btc');
    if (btcInput && address) {
        btcInput.value = address;
    }
}
