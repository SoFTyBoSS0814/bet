async function handleWithdrawRequest() {
    const amountInput = document.getElementById('withdraw-amount');
    const destInput = document.getElementById('withdraw-dest');
    const status = document.getElementById('withdraw-status');
    
    const amount = parseFloat(amountInput.value);
    const dest = destInput.value.trim();

    if (isNaN(amount) || amount <= 0) return alert("Érvénytelen összeg!");
    if (amount > userProfile.real_balance) return alert("Nincs elég Real egyenleged!");
    if (!dest) return alert("Hova küldjük? Adj meg egy BTC címet!");

    try {
        status.innerText = "Processing...";
        status.style.color = "var(--primary)";

        // 1. LÉPÉS: Beküldjük a kérelmet a withdrawals táblába
        const { error: requestError } = await _supabase
            .from('withdrawals')
            .insert([{
                user_id: currentUser.id,
                username: currentUser.username,
                amount: amount,
                btc_address: dest,
                status: 'pending'
            }]);

        if (requestError) throw requestError;

        // 2. LÉPÉS: Levonjuk az egyenleget a profilból
        const newBalance = userProfile.real_balance - amount;
        const { error: profileError } = await _supabase
            .from('profiles')
            .update({ real_balance: newBalance })
            .eq('id', currentUser.id);

        if (profileError) throw profileError;

        // UI Frissítés
        userProfile.real_balance = newBalance;
        if(document.getElementById("nav-real")) document.getElementById("nav-real").innerText = newBalance.toFixed(2) + " €";
        if(document.getElementById("w-real")) document.getElementById("w-real").innerText = newBalance.toFixed(2) + " €";

        status.innerText = "✅ Request sent! Admin will review it.";
        status.style.color = "var(--success)";
        amountInput.value = ""; // Mező ürítése

    } catch (err) {
        console.error("Hiba:", err);
        status.innerText = "❌ Error during request.";
        status.style.color = "var(--danger)";
    }
}
