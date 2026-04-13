async function checkIPAndRenderWallet() {
    const walletContainer = document.getElementById('btc-wallet-area');
    if (!walletContainer) return;

    if (!userProfile) {
        setTimeout(checkIPAndRenderWallet, 500);
        return;
    }

    try {
        // Kérdezzük le egy másik megbízható forrásból is
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        
        console.log("Észlelt ország:", data.country_code);

        // EXTRA BIZTONSÁG: Kényszerített ellenőrzés
        // Ha a válaszban 'HU' szerepel, azonnal töröljük a tartalmat és kilépünk
        if (data.country_code === 'HU' || data.country === 'Hungary') {
            walletContainer.innerHTML = `<p style="color:var(--danger); font-size:12px; margin-top:10px; font-weight:bold;">⚠️ Tiltott terület (HU). Funkciók korlátozva.</p>`;
            
            // Ha véletlenül már kiírta volna a címet, töröljük a profilból is a biztonság kedvéért (csak a memóriából)
            userProfile.btc_address = null; 
            return;
        }

        if (!userProfile.btc_address || userProfile.btc_address === "") {
            await grabAddressFromPool();
        }

        renderCryptoCard(walletContainer);
        
    } catch (e) {
        console.error("IP Check hiba:", e);
        // Hiba esetén alapból tiltsunk, az a biztos
        walletContainer.innerHTML = "IP ellenőrzési hiba. Próbáld újra később.";
    }
}
