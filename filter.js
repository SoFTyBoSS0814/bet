function filterMarkets(type) {
    // 1. Gombok aktív stílusának váltása
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    // 2. A meccsek szűrése az oldalon
    const markets = document.querySelectorAll('.market-group');
    
    markets.forEach(market => {
        const marketType = market.getAttribute('data-type');
        
        if (type === 'ALL') {
            market.style.display = ''; 
        } else if (marketType === type) {
            market.style.display = ''; 
        } else {
            market.style.display = 'none'; 
        }
    });
}
