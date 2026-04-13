const translations = {
    en: {
        deposit_title: "BTC Deposit / Withdraw",
        address_label: "Your Personal BTC Address:",
        copy_msg: "Click to copy",
        withdraw_h: "Request Withdrawal",
        amt_placeholder: "Amount (€)",
        adr_placeholder: "Destination BTC Address",
        btn_withdraw: "REQUEST WITHDRAWAL",
        hu_restriction: "⚠️ Attention: Crypto services are restricted in Hungary.",
        insufficient: "Insufficient funds!",
        success_msg: "Success! Request sent."
    },
    hu: {
        deposit_title: "BTC Befizetés / Kifizetés",
        address_label: "Saját BTC címed:",
        copy_msg: "Kattints a másoláshoz",
        withdraw_h: "Kifizetés indítása",
        amt_placeholder: "Összeg (€)",
        adr_placeholder: "Cél BTC cím",
        btn_withdraw: "KIFIZETÉSI KÉRELEM",
        hu_restriction: "⚠️ Figyelem: Magyarország területéről a kriptovaluta szolgáltatások korlátozottak.",
        insufficient: "Nincs elég egyenleged!",
        success_msg: "Siker! Kérelem elküldve."
    },
    de: {
        deposit_title: "BTC Einzahlung / Auszahlung",
        address_label: "Ihre persönliche BTC-Adresse:",
        copy_msg: "Zum Kopieren klicken",
        withdraw_h: "Auszahlung anfordern",
        amt_placeholder: "Betrag (€)",
        adr_placeholder: "Ziel BTC-Adresse",
        btn_withdraw: "AUSZAHLUNG ANFORDERN",
        hu_restriction: "⚠️ Achtung: Kryptodienste sind in Ungarn eingeschränkt.",
        insufficient: "Unzureichendes Guthaben!",
        success_msg: "Erfolg! Anfrage gesendet."
    },
    ru: {
        deposit_title: "BTC Депозит / Вывод",
        address_label: "Ваш личный BTC-адрес:",
        copy_msg: "Нажмите, чтобы скопировать",
        withdraw_h: "Запросить вывод средств",
        amt_placeholder: "Сумма (€)",
        adr_placeholder: "BTC-адрес получателя",
        btn_withdraw: "ЗАПРОСИТЬ ВЫВОД",
        hu_restriction: "⚠️ Внимание: Криптоуслуги в Венгрии ограничены.",
        insufficient: "Недостаточно средств!",
        success_msg: "Успех! Запрос отправлен."
    },
    zh: {
        deposit_title: "比特币 充值 / 提现",
        address_label: "您的专属比特币地址：",
        copy_msg: "点击复制",
        withdraw_h: "申请提现",
        amt_placeholder: "金额 (€)",
        adr_placeholder: "目标比特币地址",
        btn_withdraw: "确认提现申请",
        hu_restriction: "⚠️ 注意：匈牙利境内的加密货币服务受限。",
        insufficient: "余额不足！",
        success_msg: "成功！申请已提交。"
    }
};

// Nyelvkezelő logika
let currentLang = localStorage.getItem('selectedLang') || 'en';

function changeLang(lang) {
    currentLang = lang;
    localStorage.setItem('selectedLang', lang);
    location.reload(); 
}
