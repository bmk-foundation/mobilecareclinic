/**
 * Mobile Care Clinic (MCC) - মেইন জাভাস্ক্রিপ্ট ফাইল
 * ফিচার: হেডার কন্ট্রোল, অ্যাপয়েন্টমেন্ট বুকিং (স্লিপ ডাউনলোডসহ), এবং সার্ভিস ট্র্যাকিং।
 */

// ফায়ারবেস ডাটাবেজ কনফিগারেশন (অ্যাডমিন প্যানেলের সাথে সিঙ্ক করা)
const firebaseConfig = { 
    databaseURL: "https://bamandanga-voter-default-rtdb.asia-southeast1.firebasedatabase.app/" 
};
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const timingDb = firebase.database();
// টেলিগ্রাম বটের তথ্যাদি (কন্টাক্ট ফর্মের যে টোকেন ও চ্যাট আইডি আছে)
const TELEGRAM_BOT_TOKEN = "8986300996:AAH1nx4MDnSGrFzSPy2mRxhqAn3QJBImoI8";
const TELEGRAM_CHAT_ID = "8846602280";

let countdownInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');

    if (category) {
        const categorySelect = document.getElementById('service-category');
        if (categorySelect) {
            categorySelect.value = category; // ড্রপডাউনে ক্যাটাগরি সেট করা
            updateIssues(); // ক্যাটাগরি অনুযায়ী সমস্যার লিস্ট লোড করা
            
            // ফর্মের কাছে স্ক্রল করা
            const formSection = document.getElementById('appointment-form');
            if (formSection) {
                formSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }
// --- ১. হেডার ও মোবাইল মেনু লজিক ---
    const header = document.getElementById("main-header");
    const navMenu = document.getElementById("nav-menu");
    const mobileMenu = document.getElementById("mobile-menu");
    const body = document.body;
    let lastScrollTop = 0;

    // স্ক্রল করলে হেডার হাইড/শো
    if (header) {
        window.addEventListener("scroll", () => {
            let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (navMenu && navMenu.classList.contains("active") || scrollTop < 50) {
                header.classList.remove("hide");
                return;
            }
            if (scrollTop > lastScrollTop) {
                header.classList.add("hide");
            } else {
                header.classList.remove("hide");
            }
            lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; 
        }, { passive: true });
    }

    // মোবাইল মেনু টগল
    if (mobileMenu && navMenu) {
        mobileMenu.onclick = (e) => {
            e.stopPropagation();
            navMenu.classList.toggle("active");
            const icon = mobileMenu.querySelector('i');
            if (navMenu.classList.contains("active")) {
                icon.classList.replace('fa-bars', 'fa-times');
                body.style.overflow = 'hidden';
            } else {
                icon.classList.replace('fa-times', 'fa-bars');
                body.style.overflow = 'auto';
            }
        };

        // মেনুর বাইরে ক্লিক করলে বন্ধ হবে
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !mobileMenu.contains(e.target)) {
                navMenu.classList.remove('active');
                if(mobileMenu.querySelector('i')) mobileMenu.querySelector('i').classList.replace('fa-times', 'fa-bars');
                body.style.overflow = 'auto';
            }
        });
    }

    // --- ২. অ্যাপয়েন্টমেন্ট বুকিং লজিক ---
    const appointmentForm = document.getElementById('appointment-form');

    if (appointmentForm) {
        appointmentForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // ৪ ডিজিটের ইউনিক আইডি তৈরি
            const randomNumber = Math.floor(1000 + Math.random() * 9000);
            const bookingId = 'MCC' + randomNumber;

            // ফর্মের ইনপুট ডাটা সংগ্রহ
            const name = document.getElementById('cust-name').value;
            const phone = document.getElementById('cust-phone').value;
            const brand = document.getElementById('device-brand').value;
            const model = document.getElementById('device-model').value;
            const service = document.getElementById('service-type').value;
            const date = document.getElementById('service-date').value;
            const description = document.getElementById('issue-desc').value || "কোনো বিবরণ দেওয়া হয়নি";

            const bookingData = {
                bookingId: bookingId,
                name: name,
                phone: phone,
                brand: brand,
                model: model,
                service: service,
                date: date,
                description: description,
                status: 'Pending',
                createdAt: new Date().toLocaleString('bn-BD')
            };

            // Firebase-এ ডাটা পুশ
            if (typeof db !== 'undefined') {
                db.ref('appointments/' + bookingId).set(bookingData, (error) => {
                    if (error) {
                        Swal.fire('দুঃখিত!', 'বুকিং সম্পন্ন হয়নি, আবার চেষ্টা করুন।', 'error');
                    } else {

                        // 👇 --- টেলিগ্রাম বটে মেসেজ পাঠানোর লজিক --- 👇
                        const botToken = "8986300996:AAH1nx4MDnSGrFzSPy2mRxhqAn3QJBImoI8";
                        const chatId = "8846602280";

                        const telegramMessage = `
📌 <b>নতুন অনলাইন অ্যাপয়েন্টমেন্ট বুকিং!</b>
───────────────────
🆔 <b>বুকিং আইডি:</b> #${bookingId}
👤 <b>গ্রাহকের নাম:</b> ${name}
📞 <b>ফোন নম্বর:</b> <a href="tel:${phone}">${phone}</a>

📱 <b>ব্র্যান্ড ও মডেল:</b> ${brand} ${model}
🛠 <b>সমস্যা/সেবা:</b> ${service}
📅 <b>সম্ভাব্য তারিখ:</b> ${date}
📝 <b>বিবরণ:</b> ${description}
───────────────────
🕒 <b>বুকিং সময়:</b> ${bookingData.createdAt}
⚡ <i>Mobile Care Clinic (MCC) Automation</i>
                        `;

                        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                chat_id: chatId,
                                text: telegramMessage,
                                parse_mode: 'HTML'
                            })
                        }).catch(err => console.error("Telegram Notification Error:", err));
                        // 👆 ------------------------------------------- 👆

                        // সফল হলে সুন্দর অ্যানিমেটেড পপ-আপ (লক এবং "পরে করব" লজিকসহ)
                        Swal.fire({
                            title: 'বুকিং সফল হয়েছে!',
                            html: `আপনার ট্র্যাকিং আইডি: <b style="color:#00897b; font-size:1.2rem;">${bookingId}</b><br>ভবিষ্যতের জন্য স্লিপটি সেভ করে রাখুন।`,
                            icon: 'success',
                            showCancelButton: true,
                            confirmButtonText: '<i class="fas fa-download"></i> স্লিপ ডাউনলোড করুন',
                            cancelButtonText: 'পরে করব',
                            confirmButtonColor: '#00897b',
                            cancelButtonColor: '#666',
                            allowOutsideClick: false, // ফাঁকা জায়গায় ক্লিক করলে পপ-আপ যাবে না
                            allowEscapeKey: false     // Esc বাটন চাপলেও পপ-আপ যাবে না
                        }).then((result) => {
                            if (result.isConfirmed) {
                                downloadSlip(bookingData); // ইমেজ স্লিপ ডাউনলোড
                                appointmentForm.reset();   // ফর্ম ক্লিয়ার করা
                            } else if (result.dismiss === Swal.DismissReason.cancel) {
                                // "পরে করব" বাটনে ক্লিক করলে এই অ্যালার্টটি আসবে
                                Swal.fire({
                                    title: 'আইডিটি মনে রাখুন!',
                                    html: `আপনার ট্র্যাকিং আইডি: <b style="color:#e53935; font-size:1.2rem;">${bookingId}</b><br>অনুগ্রহ করে আইডিটির একটি স্ক্রিনশট নিন বা লিখে রাখুন।`,
                                    icon: 'info',
                                    confirmButtonColor: '#00897b',
                                    allowOutsideClick: false,
                                    allowEscapeKey: false
                                }).then(() => {
                                    appointmentForm.reset(); // ব্যবহারকারী নিশ্চিত করার পর মেইন ফর্ম রিসেট
                                });
                            }
                        });
                    }
                });
                
            } else {
                alert("Firebase DataBase Connection Error!");
            }
        });
    }

    
    
});

// --- ৩. স্লিপ ইমেজ জেনারেটর ফাংশন ---
function downloadSlip(data) {
    const slipContainer = document.getElementById('printable-slip');
    const slipContent = document.getElementById('slip-content');
    
    if (!slipContent || !slipContainer) {
        console.error("Template not found");
        return;
    }

    // স্লিপে ডাটা বসানো
    slipContent.innerHTML = `
        <div style="padding: 20px; border: 2px solid #00897b; background: #fff;">
            <div style="text-align:center; border-bottom:2px solid #00897b; margin-bottom:15px; padding-bottom:10px;">
                <h2 style="color: #00897b; margin:0; font-size:24px;">Mobile Care Clinic</h2>
                <p style="margin:2px 0; font-size:14px;">আপনার বিশ্বস্ত রিপেয়ার পার্টনার</p>
            </div>
            <div style="text-align:left; font-size:16px; line-height:1.8; color:#333;">
                <p><strong>আইডি:</strong> <span style="color:#00897b;">${data.bookingId}</span></p>
                <p><strong>নাম:</strong> ${data.name}</p>
                <p><strong>ফোন:</strong> ${data.phone}</p>
                <p><strong>মডেল:</strong> ${data.brand} ${data.model}</p>
                <p><strong>সেবা:</strong> ${data.service}</p>
                <p><strong>তারিখ:</strong> ${data.date}</p>
            </div>
            <div style="margin-top:20px; border-top:1px dashed #ccc; padding-top:10px; text-align:center; font-size:12px; color:#666;">
                দয়া করে দোকানে আসার সময় এই স্লিপটি দেখান।
            </div>
        </div>
    `;

    // অল্প সময় বিরতি দিয়ে ছবি তৈরি (ফন্ট লোড হওয়ার জন্য)
    setTimeout(() => {
        html2canvas(slipContainer, {
            scale: 2, // হাই কোয়ালিটি
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff"
        }).then(canvas => {
            // Blob পদ্ধতিতে ডাউনলোড (মোবাইল ফ্রেন্ডলি)
            canvas.toBlob(function(blob) {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `MCC-Slip-${data.bookingId}.png`;
                document.body.appendChild(a);
                a.click();
                
                setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                }, 200);
            }, 'image/png');
        }).catch(err => {
            console.error("Canvas Error:", err);
            Swal.fire('দুঃখিত!', 'সরাসরি ডাউনলোড সম্ভব হচ্ছে না, একটি স্ক্রিনশট নিন।', 'warning');
        });
    }, 800);
}

window.checkStatus = function() {
    const trackInput = document.getElementById('serviceID');
    const resultArea = document.getElementById('resultArea');

    if (!trackInput || !resultArea) return;

    const id = trackInput.value.trim().toUpperCase();

    if (id === "") {
        Swal.fire('আইডি দিন', 'দয়া করে আপনার সার্ভিস আইডিটি টাইপ করুন।', 'warning');
        return;
    }

    resultArea.style.display = "block";
    resultArea.innerHTML = "<div class='loader'>খোঁজা হচ্ছে...</div>";

    db.ref('appointments/' + id).once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // ডিফল্ট স্ট্যাটাস যদি ডাটাবেজে না থাকে তবে 'Pending' ধরে নিবে
                        // ডিফল্ট স্ট্যাটাস যদি ডাটাবেজে না থাকে তবে 'Pending' ধরে নিবে
            let currentStatus = data.status || 'Pending';
            
            // প্রগ্রেস বার, মেসেজ এবং কালার লজিক
            let progress = "12%"; 
            let statusDesc = "আপনার আবেদনটি পেন্ডিং অবস্থায় আছে। আমাদের প্রতিনিধি এটি যাচাই করবেন।";
            let isFailed = false;
            
            if(currentStatus === 'Accepted') {
                progress = "38%";
                statusDesc = "আপনার আবেদনটি গৃহীত হয়েছে। টেকনিশিয়ান শিঘ্রই কাজ শুরু করবেন।";
            } else if(currentStatus === 'Repairing') {
                progress = "65%";
                statusDesc = "আপনার ফোনের রিপেয়ারিং কাজ চলছে। অভিজ্ঞ টেকনিশিয়ান এটি দেখছেন।";
            } else if(currentStatus === 'Completed') {
                progress = "100%";
                statusDesc = "অভিনন্দন! আপনার ফোনটি সফলভাবে মেরামত করা হয়েছে। আপনি এটি সংগ্রহ করতে পারেন।";
            } else if(currentStatus === 'Failed') {
                progress = "100%"; // প্রগ্রেস ফুল হবে কিন্তু কালার লাল হবে
                statusDesc = "দুঃখিত! কোনো অনিবার্য কারণে আপনার ফোনটির রিপেয়ার কাজ ব্যর্থ হয়েছে। বিস্তারিত জানতে যোগাযোগ করুন।";
                isFailed = true;
            }

            // যদি কাজ ব্যর্থ হয় তবে প্রগ্রেস বারের কালার লাল করার জন্য CSS ক্লাস
            let barColorStyle = isFailed ? 'background-color: #f44336;' : '';

            resultArea.innerHTML = `
                <div class="tracking-card">
                    <div class="card-header">
                        <span class="id-tag"><i class="fas fa-hashtag"></i> ${data.bookingId}</span>
                        <span class="status-badge ${currentStatus.toLowerCase()}">${currentStatus === 'Failed' ? 'Failed' : currentStatus}</span>
                    </div>

                    <div class="progress-section">
                        <p class="status-msg">${statusDesc}</p>
                        <div class="progress-container">
                            <div class="progress-bar" style="width: ${progress}; ${barColorStyle}"></div>
                        </div>
                        <div class="progress-steps">
                            <span class="step ${progress >= '12%' ? 'active' : ''}">পেন্ডিং</span>
                            <span class="step ${progress >= '38%' ? 'active' : ''}">গৃহীত</span>
                            <span class="step ${progress >= '65%' ? 'active' : ''}">কাজ চলমান</span>
                            <span class="step ${progress === '100%' ? 'active' : ''} ${isFailed ? 'failed-step' : ''}">
                                ${isFailed ? 'ব্যর্থ' : 'ডেলিভারি'}
                            </span>
                        </div>
                    </div>

                    <div class="info-grid">
                        <div class="info-item">
                            <i class="fas fa-mobile-alt"></i>
                            <div><span>মডেল</span><p>${data.brand} ${data.model}</p></div>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-tools"></i>
                            <div><span>সমস্যা</span><p>${data.service}</p></div>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-calendar-alt"></i>
                            <div><span>বুকিং তারিখ</span><p>${data.date}</p></div>
                        </div>
                    </div>

                    <div class="action-buttons">
                        <a href="https://wa.me/8801972151775?text=আমার আইডি ${data.bookingId} এর আপডেট জানতে চাই।" target="_blank" class="btn-whatsapp">
                            <i class="fab fa-whatsapp"></i> হোয়াটস অ্যাপে কথা বলুন
                        </a>
                    </div>
                </div>
            `;

        } else {
            resultArea.innerHTML = `
                <div class="error-box">
                    <i class="fas fa-search"></i>
                    <p>দুঃখিত, এই আইডি (<b>${id}</b>) দিয়ে কোনো তথ্য পাওয়া যায়নি।</p>
                </div>
            `;
        }
    }).catch((error) => {
        console.error("Firebase Error:", error);
        Swal.fire('Error', 'তথ্য আনতে সমস্যা হয়েছে। দয়া করে ইন্টারনেট কানেকশন চেক করুন।', 'error');
    });
};



const issueData = {
    display: ["স্ক্রিন ভেঙে যাওয়া", "টাচ কাজ না করা", "টাচ নিজে নিজে কাজ করে", "ডিসপ্লে ব্ল্যাক", "গ্রীন লাইন", "স্ক্রিন ফ্লিকার", "ব্রাইটনেস সমস্যা", "অন্যান্য সমস্যা"],
    motherboard: ["মাদারবোর্ড ডেড", "IC সমস্যা", "শর্ট সার্কিট", "ফোন সম্পূর্ণ ডেড", "অন্যান্য সমস্যা"],
    battery: ["দ্রুত চার্জ শেষ হয়", "চার্জ ধরে না", "ফুল চার্জ হয় না", "হঠাৎ বন্ধ হয়", "ব্যাটারি ফুলে যাওয়া", "অতিরিক্ত গরম", "অন্যান্য সমস্যা"],
    charging: ["চার্জিং পোর্ট ঢিলা", "চার্জার কাজ করে না", "স্লো চার্জিং", "ফোন অন হয় না", "পাওয়ার বাটন সমস্যা", "অন্যান্য সমস্যা"],
    water: ["পানিতে পড়ে বন্ধ হওয়া", "স্পিকার/মাইক (পানিজনিত)", "শর্ট সার্কিট (পানিজনিত)", "অন্যান্য সমস্যা"],
    sound: ["স্পিকার কাজ করে না", "শব্দ কম/বিকৃত", "মাইক কাজ করে না", "কলের শব্দ শোনা যায় না", "অন্যান্য সমস্যা"],
    network: ["সিম কার্ড পায় না", "নেটওয়ার্ক নেই", "কল ড্রপ", "ইন্টারনেট সমস্যা", "IMEI সমস্যা", "অন্যান্য সমস্যা"],
    camera: ["ক্যামেরা ব্লার", "ক্যামেরা খোলে না", "ফোকাস সমস্যা", "ফ্ল্যাশ কাজ করে না", "অন্যান্য সমস্যা"],
    software: ["ফোন হ্যাং", "ল্যাগ", "বুট লুপ", "ভাইরাস", "অ্যাপ ক্র্যাশ", "আপডেট সমস্যা", "ফ্রিজ", "অন্যান্য সমস্যা"],
    security: ["পাসওয়ার্ড/পিন ভুলে যাওয়া", "FRP/Google লক", "ফিঙ্গারপ্রিন্ট সমস্যা", "ফেস আনলক সমস্যা", "অন্যান্য সমস্যা"],
    button: ["ভলিউম বাটন", "WiFi সমস্যা", "Bluetooth সমস্যা", "Hotspot সমস্যা", "GPS সমস্যা", "অন্যান্য সমস্যা"],
    other: ["অন্যান্য সমস্যা"]
};


function updateIssues() {
    const categorySelect = document.getElementById('service-category');
    const issueSelect = document.getElementById('service-type');
    const selectedCategory = categorySelect.value;

    // ক্লিয়ার করে নতুন অপশন যোগ করা
    issueSelect.innerHTML = '<option value="" disabled selected>নির্দিষ্ট সমস্যাটি বেছে নিন</option>';
    
    if (selectedCategory && issueData[selectedCategory]) {
        issueSelect.disabled = false; // ড্রপডাউন আনলক করা
        issueData[selectedCategory].forEach(issue => {
            let option = document.createElement('option');
            option.value = issue;
            option.text = issue;
            issueSelect.appendChild(option);
        });
    } else {
        issueSelect.disabled = true;
    }
}


// --- ৪. কন্টাক্ট ফর্ম থেকে টেলিগ্রাম বটে মেসেজ পাঠানো ---
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // আপনার টেলিগ্রাম বটের তথ্যাদি
            const botToken = "8986300996:AAH1nx4MDnSGrFzSPy2mRxhqAn3QJBImoI8";
            const chatId = "8846602280"; 

            // আইডি (ID) দিয়ে সরাসরি ইনপুট ভ্যালুসমূহ সংগ্রহ করা
            const name = document.getElementById('contact-name').value.trim();
            const contactInfo = document.getElementById('contact-info').value.trim();
            const subject = document.getElementById('contact-subject').value.trim() || "উল্লেখ নেই";
            const message = document.getElementById('contact-message').value.trim();

            // HTML ফরম্যাটে টেলিগ্রাম বটের মেসেজ সাজানো
            const telegramMessage = `
<b>📱 নতুন যোগাযোগ বার্তা (MCC)</b>
───────────────────
👤 <b>নাম:</b> ${name}
📞 <b>যোগাযোগ:</b> ${contactInfo}
📌 <b>বিষয়:</b> ${subject}
💬 <b>মেসেজ:</b> ${message}
───────────────────
🕒 <b>সময়:</b> ${new Date().toLocaleString('bn-BD')}
            `;

            // সাবমিট বাটনটি সাময়িকভাবে ডিজেবল করা
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerText;
            submitBtn.disabled = true;
            submitBtn.innerText = "পাঠানো হচ্ছে...";

            // Telegram API-তে ডাটা পাঠানো
            const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

            fetch(telegramUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: telegramMessage,
                    parse_mode: 'HTML'
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.ok) {
                    // SweetAlert দিয়ে সফলতার মেসেজ দেখানো
                    if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            title: 'ধন্যবাদ!',
                            text: 'আপনার মেসেজটি সফলভাবে আমাদের কাছে পৌঁছেছে।',
                            icon: 'success',
                            confirmButtonColor: '#00897b'
                        });
                    } else {
                        alert("মেসেজ সফলভাবে পাঠানো হয়েছে!");
                    }
                    contactForm.reset(); // ফর্মের ডাটা ক্লিয়ার করা
                } else {
                    console.error("Telegram API Error Response:", data);
                    throw new Error(data.description || "টেলিগ্রাম থেকে রেসপন্স আসেনি।");
                }
            })
            .catch(error => {
                console.error("Telegram Connection Error Detail:", error);
                if (typeof Swal !== 'undefined') {
                    Swal.fire('দুঃখিত!', 'মেসেজ পাঠানো যায়নি। আবার চেষ্টা করুন।', 'error');
                } else {
                    alert("দুঃখিত, মেসেজ পাঠানো যায়নি।");
                }
            })
            .finally(() => {
                // বাটন আবার আগের অবস্থায় ফিরিয়ে আনা
                submitBtn.disabled = false;
                submitBtn.innerText = originalBtnText;
            });
        });
    }
});
// ২. ডাটাবেজ থেকে রিয়েলটাইম ডাটা লোড
timingDb.ref('shopTiming').on('value', (snapshot) => {
    if (snapshot.exists()) {
        const data = snapshot.val();

        // ১২-ঘণ্টা AM/PM ফরম্যাটে সময় রেডি করা
        const satThuStr = data.satThuOff ? "<span class='text-closed'>বন্ধ</span>" : `${format12Hour(data.satThuOpen)} - ${format12Hour(data.satThuClose)}`;
        const friStr = data.friOff ? "<span class='text-closed'>বন্ধ</span>" : `${format12Hour(data.friOpen)} - ${format12Hour(data.friClose)}`;

        const satThuElem = document.getElementById('displaySatThu');
        const friElem = document.getElementById('displayFri');

        if(satThuElem) satThuElem.innerHTML = satThuStr;
        if(friElem) friElem.innerHTML = friStr;

        // নোটিশ প্রদর্শন
        const noticeBox = document.getElementById('userNoticeBox');
        if (noticeBox) {
            if (data.emergencyClose) {
                noticeBox.style.display = 'block';
                noticeBox.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <b>জরুরি বিজ্ঞপ্তি:</b> ${data.emergencyMsg || 'আজ দোকান সম্পূর্ণ বন্ধ থাকবে।'}`;
            } else {
                noticeBox.style.display = 'none';
            }
        }

        // লাইভ ওপেন/ক্লোজড ও কাউন্টডাউন চালনা
        calculateLiveStatusAndCountdown(data);
    } else {
        if(document.getElementById('displaySatThu')) document.getElementById('displaySatThu').innerHTML = "সকাল ০৯:০০ - রাত ০৯:৩০";
        if(document.getElementById('displayFri')) document.getElementById('displayFri').innerHTML = "দুপুর ০২:৩০ - রাত ০৯:৩০";
        if(document.getElementById('liveStatusBadge')) document.getElementById('liveStatusBadge').innerHTML = "স্ট্যাটাস নেই";
    }
});

// ৩. AM/PM টাইম ফরম্যাট
function format12Hour(timeStr) {
    if (!timeStr) return "";
    let [hours, minutes] = timeStr.split(':');
    hours = parseInt(hours);
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes.padStart(2, '0')} ${ampm}`;
}

function calculateLiveStatusAndCountdown(data) {
    const badge = document.getElementById('liveStatusBadge');
    const countdownBox = document.getElementById('countdownContainer');
    const countdownTimer = document.getElementById('countdownTimer');
    const countdownText = document.getElementById('countdownText');
    const countdownIcon = document.getElementById('countdownIcon');

    if (countdownInterval) clearInterval(countdownInterval);

    if (data.emergencyClose) {
        if(badge) {
            badge.className = "status-badge status-closed";
            badge.innerHTML = "🔴 এখন বন্ধ আছে";
        }
        if(countdownBox) countdownBox.style.display = "none";
        return;
    }

    function updateTimer() {
        const now = new Date();
        const day = now.getDay(); 
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        let isOpen = false;
        let targetTime = null;
        let labelText = "";

        let openTimeStr = (day === 5) ? data.friOpen : data.satThuOpen;
        let closeTimeStr = (day === 5) ? data.friClose : data.satThuClose;
        let isTodayOff = (day === 5) ? data.friOff : data.satThuOff;

        if (openTimeStr && closeTimeStr && !isTodayOff) {
            const [oH, oM] = openTimeStr.split(':').map(Number);
            const [cH, cM] = closeTimeStr.split(':').map(Number);

            const openMinutes = oH * 60 + oM;
            const closeMinutes = cH * 60 + cM;

            if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
                isOpen = true;
                targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), cH, cM, 0);
                labelText = "দোকান বন্ধ হতে আর বাকি আছে:";
            } else if (currentMinutes < openMinutes) {
                targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), oH, oM, 0);
                labelText = "দোকান খুলতে আর বাকি আছে:";
            }
        }

        if (!isOpen && !targetTime) {
            let tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            let tomorrowDay = tomorrow.getDay();

            let nextOpenStr = (tomorrowDay === 5) ? data.friOpen : data.satThuOpen;
            let isNextOff = (tomorrowDay === 5) ? data.friOff : data.satThuOff;

            if (nextOpenStr && !isNextOff) {
                const [nH, nM] = nextOpenStr.split(':').map(Number);
                targetTime = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), nH, nM, 0);
                labelText = "দোকান খুলতে আর বাকি আছে:";
            }
        }

        // ডায়নামিক কালার ভ্যারিয়েবল
        let timerColor = "#e53935"; // ডিফল্ট বন্ধের কালার (লাল)

        // ব্যাজ, আইকন, লেবেল ও টাইমারের ডায়নামিক কালার আপডেট
        if (isOpen) {
            timerColor = "#2e7d32"; // চালু থাকলে বন্ধ হওয়ার কাউন্টডাউন কালার (সবুজ)
            
            if(badge) {
                badge.className = "status-badge status-open";
                badge.innerHTML = "🟢 এখন খোলা আছে";
            }
            if(countdownIcon) {
                countdownIcon.className = "fas fa-hourglass-half";
                countdownIcon.style.color = timerColor;
            }
        } else {
            timerColor = "#e53935"; // বন্ধ থাকলে চালু হওয়ার কাউন্টডাউন কালার (লাল)

            if(badge) {
                badge.className = "status-badge status-closed";
                badge.innerHTML = "🔴 এখন বন্ধ আছে";
            }
            if(countdownIcon) {
                countdownIcon.className = "fas fa-clock";
                countdownIcon.style.color = timerColor;
            }
        }

        if(countdownText) countdownText.innerText = labelText;

        // টাইমার কাউন্টডাউন এবং কালার প্রয়োগ
        if (targetTime && countdownBox && countdownTimer) {
            countdownBox.style.display = "block";
            
            // টাইমার টেক্সটের ডায়নামিক কালার সেট
            countdownTimer.style.color = timerColor;

            let diffMs = targetTime - new Date();

            if (diffMs > 0) {
                let totalSec = Math.floor(diffMs / 1000);
                let hrs = Math.floor(totalSec / 3600);
                let mins = Math.floor((totalSec % 3600) / 60);
                let secs = totalSec % 60;

                let hStr = String(hrs).padStart(2, '0');
                let mStr = String(mins).padStart(2, '0');
                let sStr = String(secs).padStart(2, '0');

                countdownTimer.innerHTML = `${hStr} ঘণ্টা ${mStr} মিনিট ${sStr} সেকেন্ড`;
            } else {
                calculateLiveStatusAndCountdown(data);
            }
        } else if(countdownBox) {
            countdownBox.style.display = "none";
        }
    }

    updateTimer();
    countdownInterval = setInterval(updateTimer, 1000);
}
document.addEventListener('DOMContentLoaded', function () {
    
    // ১. সকল ছবিতে ড্র্যাগ ও রাইট-ক্লিক বন্ধ করা
    const allImages = document.querySelectorAll('img');
    allImages.forEach(img => {
        // ড্র্যাগ করা বন্ধ
        img.setAttribute('draggable', 'false');
        
        // ছবির ওপর রাইট-ক্লিক মেনু বন্ধ
        img.addEventListener('contextmenu', function (e) {
            e.preventDefault();
        });
    });

    // ২. F12 (Inspect Element) এবং কপি/সেভ শর্টকাট কি বন্ধ
    document.addEventListener('keydown', function (e) {
        // Ctrl+S (সেভ), Ctrl+U (ভিউ সোর্স), F12 (ইন্সপেক্ট)
        if (
            e.key === 'F12' || 
            (e.ctrlKey && (e.key === 's' || e.key === 'S' || e.key === 'u' || e.key === 'U')) ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c'))
        ) {
            e.preventDefault();
        }
    });
});
// হোমপেজে ৪টি সর্বশেষ পোস্ট দেখানোর লজিক
function loadHomeRecentStories() {
    const homeContainer = document.getElementById('homeRecentStories');
    if (!homeContainer) return;

    db.ref('client_stories').limitToLast(4).on('value', (snapshot) => {
        homeContainer.innerHTML = "";
        if (snapshot.exists()) {
            const data = snapshot.val();
            const keys = Object.keys(data).reverse(); // সর্বশেষ আপলোড হওয়া পোস্টগুলো আগে আসবে

            keys.forEach(key => {
                const item = data[key];
                const card = `
                    <a href="review-details.html?id=${key}" style="text-decoration: none; color: inherit; background: #f8f9fa; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; flex-direction: column; transition: transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                        <div style="height: 150px; overflow: hidden; background: #eee;">
                            <img src="${item.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <div style="padding: 15px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                            <h3 style="font-size: 15px; font-weight: bold; color: #222; margin-bottom: 8px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                                ${item.title}
                            </h3>
                            <div style="font-size: 12px; color: #00897b; font-weight: bold; margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                                <span><i class="fas fa-user-check"></i> ${item.customerName || 'গ্রাহক'}</span>
                                <i class="fas fa-chevron-right"></i>
                            </div>
                        </div>
                    </a>
                `;
                homeContainer.innerHTML += card;
            });
        } else {
            homeContainer.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #888;'>কোনো পোস্ট পাওয়া যায়নি।</p>";
        }
    });
}

// পেজ লোড হলে ফাংশনটি রান হবে
document.addEventListener("DOMContentLoaded", loadHomeRecentStories);
