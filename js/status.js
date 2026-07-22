/**
 * Mobile Care Clinic (MCC) - পেজ স্ট্যাটাস হেডার স্ক্রিপ্ট
 * কাজ: ফায়ারবেস থেকে দোকানের লাইভ স্ট্যাটাস এনে হেডারে প্রদর্শন করা।
 */

document.addEventListener("DOMContentLoaded", function () {
    // ফায়ারবেস ডাটাবেজ কানেকশন নিশ্চিত করা
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        firebase.initializeApp({
            databaseURL: "https://bamandanga-voter-default-rtdb.asia-southeast1.firebasedatabase.app/"
        });
    }

    const headerBadge = document.getElementById('headerStatusBadge');
    const statusText = document.getElementById('headerStatusText');

    if (!headerBadge || !statusText) return; // যদি পেজে এলিমেন্ট না থাকে তবে চলবে না

    if (typeof firebase !== 'undefined') {
        const statusDb = firebase.database();

        statusDb.ref('shopTiming').on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            // জরুরি বন্ধ থাকলে
            if (data.emergencyClose) {
                headerBadge.className = "nav-status-badge closed";
                statusText.innerText = "এখন বন্ধ আছে";
                return;
            }

            const now = new Date();
            const day = now.getDay(); // 0 = Sun, 5 = Fri
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            let openTimeStr = (day === 5) ? data.friOpen : data.satThuOpen;
            let closeTimeStr = (day === 5) ? data.friClose : data.satThuClose;
            let isTodayOff = (day === 5) ? data.friOff : data.satThuOff;

            let isOpen = false;

            if (openTimeStr && closeTimeStr && !isTodayOff) {
                const [oH, oM] = openTimeStr.split(':').map(Number);
                const [cH, cM] = closeTimeStr.split(':').map(Number);

                const openMinutes = oH * 60 + oM;
                const closeMinutes = cH * 60 + cM;

                if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
                    isOpen = true;
                }
            }

            // টেক্সট ও স্টাইল পরিবর্তন
            if (isOpen) {
                headerBadge.className = "nav-status-badge open";
                statusText.innerText = "এখন খোলা আছে";
            } else {
                headerBadge.className = "nav-status-badge closed";
                statusText.innerText = "এখন বন্ধ আছে";
            }
        });
    }
});
