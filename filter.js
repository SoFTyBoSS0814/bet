function filterMarkets(type) {
    // 1. Gombok aktív stílusának váltása
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // Rárakjuk az aktív osztályt arra a gombra, amire kattintottunk
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    // 2. A meccsek szűrése az oldalon
    const markets = document.querySelectorAll('.market-group');
    
    markets.forEach(market => {
        const marketType = market.getAttribute('data-type'); // REAL vagy DEMO
        
        if (type === 'ALL') {
            market.style.display = ''; // Alapértelmezett megjelenítés
        } else if (marketType === type) {
            market.style.display = ''; // Megjelenítés, ha egyezik
        } else {
            market.style.display = 'none'; // Elrejtés, ha nem egyezik
        }
    });
}
