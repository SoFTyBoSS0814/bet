async function handleWithdrawRequest() {
    const amountInput = document.getElementById('withdraw-amount');
    const destInput = document.getElementById('withdraw-dest');
    const status = document.getElementById('withdraw-status');
    
    const amount = parseFloat(amountInput.value);
    const dest = destInput.value.trim();

    if (isNaN(amount) || amount <= 0) return alert("Érvénytelen összeg!");
    if (amount > userProfile.real_balance) return alert("Nincs elég Real egyenleged!");
    if (!dest) return alert("Add meg a cél címet!");

    try {
        status.innerText = "Processing...";
        status.style.color = "var(--primary)";

        // 1. LÉPÉS: Beküldjük a kérelmet a withdrawals táblába
        // FIGYELEM: Ellenőrizd, hogy a tábla neve pontosan 'withdrawals'
        const { error: requestError } = await _supabase
            .from('withdrawals')
            .insert([{
                user_id: currentUser.id,
                username: currentUser.username,
                amount: amount,
                btc_address: dest,
                status: 'pending'
            }]);

        if (requestError) {
            console.error("Adatbázis hiba (withdrawals):", requestError);
            throw new Error("Nem sikerült rögzíteni a kifizetési kérelmet: " + requestError.message);
        }

        // 2. LÉPÉS: Csak ha az előző sikerült, akkor vonjuk le az egyenleget
        const newBalance = userProfile.real_balance - amount;
        const { error: profileError } = await _supabase
            .from('profiles')
            .update({ real_balance: newBalance })
            .eq('id', currentUser.id);

        if (profileError) throw profileError;

        // UI Frissítés
        userProfile.real_balance = newBalance;
        document.getElementById("nav-real").innerText = newBalance.toFixed(2) + " €";
        document.getElementById("w-real").innerText = newBalance.toFixed(2) + " €";

        status.innerText = "✅ Request sent! Admin will review it.";
        status.style.color = "var(--success)";
        amountInput.value = ""; 

    } catch (err) {
        console.error("Hiba folyamat közben:", err);
        status.innerText = "❌ Hiba: " + err.message;
        status.style.color = "var(--danger)";
    }
}
