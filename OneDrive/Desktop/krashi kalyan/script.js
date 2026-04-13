document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // --- State Management ---
    const state = {
        currentUser: JSON.parse(localStorage.getItem('kk_user')) || null,
        history: JSON.parse(localStorage.getItem('kk_history')) || [],
        activeView: 'dashboard'
    };

    // --- Elements ---
    const authModal = document.getElementById('auth-modal');
    const historyList = document.getElementById('history-list');
    const userNameDisplay = document.querySelector('.user-name');
    const mainTitle = document.getElementById('main-view-title');

    // Section title mapping
    const SECTION_TITLES = {
        'dashboard': 'किसान डैशबोर्ड / <span class="english">FARMER DASHBOARD</span>',
        'soil': 'मिट्टी पोषण / <span class="english">SOIL ANALYSIS</span>',
        'disease': 'रोग जोखिम / <span class="english">DISEASE RISK</span>',
        'crop': 'फसल चक्र / <span class="english">CROP ROTATION</span>',
        'market': 'बाज़ार भाव / <span class="english">MARKET PRICES</span>',
        'storage': 'भंडारण / <span class="english">STORAGE</span>',
        'water': 'जल स्थिरता / <span class="english">WATER SUSTAINABILITY</span>',
        'finance': 'वित्तीय जोखिम / <span class="english">FINANCIAL RISK</span>',
        'weather': 'मौसम चार्ट / <span class="english">WEATHER ANALYSIS</span>',
        'help': 'सहायता / <span class="english">AI HELP CHATBOT</span>',
        'history': 'कार्य इतिहास / <span class="english">ACTIVITY HISTORY</span>'
    };

    let cropData = [];

    // --- Auth Logic ---
    const checkAuth = () => {
        if (!state.currentUser) {
            authModal.classList.remove('hidden');
        } else {
            authModal.classList.add('hidden');
            userNameDisplay.innerHTML = `${state.currentUser.name} / <span class="english-small">${state.currentUser.name.toUpperCase()}</span>`;
        }
    };

    const handleLogin = () => {
        const phone = document.getElementById('login-phone').value;
        const pass = document.getElementById('login-pass').value;
        if (phone && pass) {
            const user = { name: 'राम सिंह', phone: phone }; // Mocking login
            state.currentUser = user;
            localStorage.setItem('kk_user', JSON.stringify(user));
            checkAuth();
            renderHistory();
        } else {
            alert('कृपया सभी जानकारी भरें / Please fill all details');
        }
    };

    const handleRegister = () => {
        const name = document.getElementById('reg-name').value;
        const phone = document.getElementById('reg-phone').value;
        const pass = document.getElementById('reg-pass').value;
        if (name && phone && pass) {
            const user = { name: name, phone: phone };
            state.currentUser = user;
            localStorage.setItem('kk_user', JSON.stringify(user));
            checkAuth();
            renderHistory();
        } else {
            alert('कृपया सभी जानकारी भरें / Please fill all details');
        }
    };

    // --- History Logic ---
    const saveRecord = (type, details, status) => {
        const record = {
            date: new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            type: type,
            details: details,
            status: status
        };
        state.history.unshift(record);
        localStorage.setItem('kk_history', JSON.stringify(state.history));
        renderHistory();
    };

    const renderHistory = () => {
        historyList.innerHTML = state.history.map(item => `
            <tr>
                <td>${item.date}</td>
                <td>${item.type}</td>
                <td>${item.details}</td>
                <td><span class="status-tag ${item.status.toLowerCase()}">${item.status}</span></td>
            </tr>
        `).join('');
    };

    const clearHistory = () => {
        if (confirm('क्या आप वाकई सारा इतिहास मिटाना चाहते हैं? / Are you sure you want to clear all history?')) {
            state.history = [];
            localStorage.setItem('kk_history', JSON.stringify([]));
            renderHistory();
        }
    };

    // --- View Switching (Section-based) ---
    let cachedAgData = null; // Store latest ag data for section rendering
    let cachedWeatherData = null; // Store latest weather
    let soilChartFullInstance = null;

    const switchSection = (sectionName) => {
        // Hide all section views
        document.querySelectorAll('.section-view').forEach(s => s.classList.add('hidden'));
        document.getElementById('history-view')?.classList.add('hidden');

        // Update title
        mainTitle.innerHTML = SECTION_TITLES[sectionName] || SECTION_TITLES['dashboard'];

        if (sectionName === 'history') {
            document.getElementById('history-view').classList.remove('hidden');
            renderHistory();
            return;
        }

        const targetSection = document.getElementById(`section-${sectionName}`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            // Populate individual section content
            if (cachedAgData) populateSection(sectionName, cachedAgData);
        }
    };

    const populateSection = (name, data) => {
        if (name === 'soil') {
            const canvas = document.getElementById('soilChartFull');
            if (canvas) {
                if (soilChartFullInstance) soilChartFullInstance.destroy();
                soilChartFullInstance = new Chart(canvas.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: ['N (नाइट्रोजन)', 'P (फास्फोरस)', 'K (पोटैशियम)', 'pH'],
                        datasets: [{ label: 'Levels', data: [data.soil.N, data.soil.P, data.soil.K, data.soil.pH * 10], backgroundColor: ['#22c55e', '#4ade80', '#f59e0b', '#06b6d4'], borderRadius: 8, barThickness: 80 }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 200, ticks: { color: '#8b8fa3' }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#8b8fa3' }, grid: { display: false } } } }
                });
            }
        } else if (name === 'disease') {
            const d = data.sections.disease;
            document.getElementById('disease-full-msg').innerHTML = `जोखिम: <span class="${d.risk === 'Low' ? 'low-text' : d.risk === 'High' ? 'high-text' : 'medium-text'}">${d.risk}</span>`;
            document.getElementById('disease-full-rec').innerText = d.msg;
            document.getElementById('disease-full-indicator').className = `status-indicator ${d.risk.toLowerCase()}`;
        } else if (name === 'crop') {
            const el = document.getElementById('crop-full-rotation');
            if (data.top_crops && data.top_crops.length > 0) {
                el.innerHTML = data.top_crops.map((c, i) => `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);"><span>${i+1}. ${c.crop}</span><span style="color:var(--primary-light);font-weight:700;">${c.yield.toFixed(2)} t/ha</span></div>`).join('');
            }
            const guideEl = document.getElementById('crop-guide-full');
            if (data.crop_guide && data.crop_guide.crops) {
                guideEl.innerHTML = data.crop_guide.crops.map(c => `<div class="crop-guide-item">${c}</div>`).join('');
            }
        } else if (name === 'market') {
            const m = data.sections.market;
            document.getElementById('market-full-content').innerHTML = `
                <div class="price-data"><div class="data-row"><span class="label">मूल्य / Price</span><span class="value">${m.price}</span></div><div class="divider"></div><div class="data-row"><span class="label">लागत / Cost</span><span class="value">${m.cost}</span></div></div>
                <div class="margin-indicator positive"><i data-lucide="trending-up"></i><span class="margin-text">${m.margin} Margin</span></div>`;
            lucide.createIcons();
        } else if (name === 'storage') {
            const s = data.sections.storage;
            document.getElementById('storage-full-content').innerHTML = `
                <div class="storage-item"><span class="label">कैपेसिटी / Capacity</span><div class="progress-bar"><div class="progress" style="width:${s.capacity}%"></div></div><span class="value">${s.capacity}% Full</span></div>`;
        } else if (name === 'water') {
            const w = data.sections.water;
            document.getElementById('water-full-content').innerHTML = `
                <div class="water-gauge"><div class="gauge-level" style="width:${w.usage}%"></div><span class="percentage">${w.usage}%</span></div><p class="gauge-label">Water Usage Optimization — Rainfall: ${w.rainfall}</p>`;
        } else if (name === 'finance') {
            const m = data.sections.market;
            document.getElementById('finance-full-content').innerHTML = `
                <div class="risk-score ${m.margin === 'Good' ? 'green' : 'yellow'}"><span class="score">${m.margin === 'Good' ? 'A+' : 'B'}</span><span class="label">Credit Score</span></div>`;
        } else if (name === 'weather') {
            if (cachedWeatherData && cachedWeatherData.main) {
                document.getElementById('weather-city-name').innerText = cachedWeatherData.name + ' का मौसम';
                document.getElementById('weather-temp-main').innerText = Math.round(cachedWeatherData.main.temp) + '°C';
                document.getElementById('weather-desc').innerText = cachedWeatherData.weather[0].description.toUpperCase();
                document.getElementById('weather-humidity').innerText = cachedWeatherData.main.humidity + '%';
                document.getElementById('weather-wind').innerText = cachedWeatherData.wind.speed + ' m/s';
            } else {
                document.getElementById('weather-city-name').innerText = 'मौसम डेटा उपलब्ध नहीं है / Weather Data Unavailable';
            }
        }
    };

    // --- Dataset Logic (Now using Backend API) ---
    let soilChartInstance = null;

    const initSoilChart = (data = [50, 47, 16]) => {
        const ctx = document.getElementById('soilChart').getContext('2d');
        if (soilChartInstance) {
            soilChartInstance.destroy();
        }
        soilChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['N (नाइट्रोजन)', 'P (फास्फोरस)', 'K (पोटैशियम)'],
                datasets: [{
                    label: 'Nutrient Levels (kg/ha)',
                    data: data,
                    backgroundColor: ['#22c55e', '#4ade80', '#f59e0b'],
                    borderRadius: 8,
                    barThickness: 60
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { display: false },
                    tooltip: { enabled: true }
                },
                scales: {
                    y: { beginAtZero: true, max: 200, ticks: { color: '#8b8fa3' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { ticks: { color: '#8b8fa3' }, grid: { display: false } }
                }
            }
        });
    };

    // State-to-City mapping for weather
    const STATE_CITY_MAP = {
        'Andhra Pradesh': 'Hyderabad', 'Arunachal Pradesh': 'Itanagar', 'Assam': 'Guwahati',
        'Bihar': 'Patna', 'Chhattisgarh': 'Raipur', 'Delhi': 'Delhi', 'Goa': 'Panaji',
        'Gujarat': 'Ahmedabad', 'Haryana': 'Chandigarh', 'Himachal Pradesh': 'Shimla',
        'Jharkhand': 'Ranchi', 'Jammu and Kashmir': 'Srinagar', 'Karnataka': 'Bengaluru',
        'Kerala': 'Thiruvananthapuram', 'Madhya Pradesh': 'Bhopal', 'Maharashtra': 'Mumbai',
        'Manipur': 'Imphal', 'Meghalaya': 'Shillong', 'Mizoram': 'Aizawl',
        'Nagaland': 'Kohima', 'Odisha': 'Bhubaneswar', 'Puducherry': 'Puducherry',
        'Punjab': 'Chandigarh', 'Sikkim': 'Gangtok', 'Tamil Nadu': 'Chennai',
        'Telangana': 'Hyderabad', 'Tripura': 'Agartala', 'Uttar Pradesh': 'Lucknow',
        'Uttarakhand': 'Dehradun', 'West Bengal': 'Kolkata'
    };

    const loadStates = async () => {
        try {
            const res = await fetch('/api/states');
            const data = await res.json();
            const selector = document.getElementById('state-selector');
            selector.innerHTML = '';
            data.states.forEach(st => {
                const opt = document.createElement('option');
                opt.value = st;
                opt.textContent = st;
                selector.appendChild(opt);
            });
            // Set default
            selector.value = 'Uttar Pradesh';

            // Set default month in selector
            const currentMonth = new Date().getMonth() + 1;
            const monthSelector = document.getElementById('crop-month-selector');
            if (monthSelector) monthSelector.value = currentMonth;

            // On change, reload dashboard
            selector.addEventListener('change', () => {
                const selectedState = selector.value;
                const city = STATE_CITY_MAP[selectedState] || selectedState;
                fetchDashboardData(city, selectedState);
            });

            if (monthSelector) {
                monthSelector.addEventListener('change', () => {
                    const selectedState = selector.value;
                    const city = STATE_CITY_MAP[selectedState] || selectedState;
                    fetchDashboardData(city, selectedState);
                });
            }
        } catch (err) {
            console.error('Error loading states:', err);
        }
    };

    const fetchDashboardData = async (city = 'Lucknow', stateName = 'Uttar Pradesh') => {
        try {
            // 1. Fetch Weather
            const weatherRes = await fetch(`/api/weather/${city}`);
            const weatherData = await weatherRes.json();
            const weatherInfo = document.getElementById('weather-info');
            if (weatherInfo && !weatherData.error && weatherData.main) {
                const temp = Math.round(weatherData.main.temp);
                const desc = weatherData.weather[0].description;
                weatherInfo.innerHTML = `<i data-lucide="cloud-sun"></i><span>${temp}°C, ${desc.toUpperCase()}</span>`;
                lucide.createIcons();
                // Cache weather data for weather section
                cachedWeatherData = weatherData;
            }

            // 2. Fetch Agriculture Data
            const monthSelector = document.getElementById('crop-month-selector');
            const selectedMonth = monthSelector ? monthSelector.value : new Date().getMonth() + 1;
            const agRes = await fetch(`/api/data/${stateName}?month=${selectedMonth}`);
            const agData = await agRes.json();
            
            if (agData.error) {
                console.warn('Ag data error:', agData.error);
                return;
            }

            // Cache for section views
            cachedAgData = agData;

            // Update Season Info
            document.getElementById('current-season-text').innerText = `${agData.season_hindi} (${agData.season})`;

            // Update Soil Chart
            const soil = agData.soil;
            initSoilChart([soil.N, soil.P, soil.K]);

            // Update Crop Info (Seasonal Recommendation)
            if (agData.top_crops && agData.top_crops.length > 0) {
                const topCrop = agData.top_crops[0];
                const nextCrop = agData.top_crops[1] || { crop: 'Pulses' };
                
                document.getElementById('current-crop-display').innerHTML = `${topCrop.crop} / <span class="english-small">${topCrop.crop}</span>`;
                document.getElementById('crop-yield-info').innerText = `Avg Yield: ${topCrop.yield.toFixed(2)} t/ha`;
                document.getElementById('next-crop-name').innerText = nextCrop.crop;
            }

            // Update Monthly Crop Guide
            if (agData.crop_guide && agData.crop_guide.crops) {
                const guideList = document.getElementById('crop-guide-list');
                guideList.innerHTML = agData.crop_guide.crops.map(crop => `
                    <div class="crop-guide-item">
                        <span class="crop-guide-name">${crop}</span>
                    </div>
                `).join('');
            }

            // Update Market Section
            const market = agData.sections.market;
            document.getElementById('market-price-val').innerText = market.price;
            document.getElementById('market-cost-val').innerText = market.cost;
            document.getElementById('market-margin-text').innerText = `${market.margin} Margin`;
            
            // Update Water Section
            const water = agData.sections.water;
            document.getElementById('water-gauge-level').style.width = `${water.usage}%`;
            document.getElementById('water-percentage').innerText = `${water.usage}%`;

            // Update Storage Section
            const storage = agData.sections.storage;
            document.getElementById('storage-progress').style.width = `${storage.capacity}%`;
            document.getElementById('storage-value').innerText = `${storage.capacity}% Full`;

            // Update Disease Section
            const disease = agData.sections.disease;
            const riskClass = disease.risk === 'Low' ? 'low-text' : disease.risk === 'High' ? 'high-text' : 'medium-text';
            document.getElementById('disease-msg').innerHTML = `जोखिम: <span class="${riskClass}">${disease.risk}</span>`;
            document.getElementById('disease-recommendation').innerText = disease.msg;
            
            const indicator = document.getElementById('disease-status-indicator');
            indicator.className = `status-indicator ${disease.risk.toLowerCase()}`;
            if (disease.risk === 'High') {
                indicator.innerHTML = '<i data-lucide="alert-triangle"></i>';
            } else if (disease.risk === 'Medium') {
                indicator.innerHTML = '<i data-lucide="alert-circle"></i>';
            } else {
                indicator.innerHTML = '<i data-lucide="check-circle"></i>';
            }
            lucide.createIcons();

            // Update Financial Risk based on margin
            const finScore = document.getElementById('credit-score');
            const finContainer = document.getElementById('finance-risk-score');
            if (market.margin === 'Good') {
                finScore.innerText = 'A+';
                finContainer.className = 'risk-score green';
            } else {
                finScore.innerText = 'B';
                finContainer.className = 'risk-score yellow';
            }

        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        }
    };

    // --- Event Listeners ---
    document.getElementById('do-login').addEventListener('click', handleLogin);
    document.getElementById('do-register').addEventListener('click', handleRegister);
    document.getElementById('to-register').addEventListener('click', () => {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
    });
    document.getElementById('to-login').addEventListener('click', () => {
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            state.currentUser = null;
            localStorage.removeItem('kk_user');
            checkAuth();
        });
    }

    document.getElementById('clear-history').addEventListener('click', clearHistory);

    // Image Analysis Logic
    const handleImageAnalysis = (inputId, btnId, resultId) => {
        const fileInput = document.getElementById(inputId);
        const resultDiv = document.getElementById(resultId);
        const btn = document.getElementById(btnId);
        
        if (!fileInput.files.length) {
            alert('कृपया पहले फोटो अपलोड करें / Please upload a photo first');
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();

        btn.innerText = 'विश्लेषण हो रहा है... / Analyzing...';
        btn.disabled = true;
        resultDiv.innerHTML = 'कृपया प्रतीक्षा करें... / Please wait...';

        reader.onloadend = async () => {
            const base64String = reader.result;
            try {
                const res = await fetch('/api/analyze-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64String })
                });
                const data = await res.json();
                
                if (data.analysis) {
                    resultDiv.innerHTML = data.analysis.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                } else if (data.error) {
                    resultDiv.innerHTML = 'त्रुटि (Error): ' + data.error;
                }
            } catch (err) {
                console.error(err);
                resultDiv.innerHTML = 'कनेक्शन विफल / Connection failed';
            } finally {
                btn.innerText = 'बीमारी पहचानें / Analyze';
                btn.disabled = false;
            }
        };
        reader.readAsDataURL(file);
    };

    const dBtn = document.getElementById('analyze-disease-btn');
    if (dBtn) dBtn.addEventListener('click', () => handleImageAnalysis('disease-img-upload', 'analyze-disease-btn', 'disease-analysis-result'));
    
    const cBtn = document.getElementById('analyze-crop-btn');
    if (cBtn) cBtn.addEventListener('click', () => handleImageAnalysis('crop-img-upload', 'analyze-crop-btn', 'crop-analysis-result'));


    // Global navigation handler
    document.querySelectorAll('.nav-menu .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            if (!section) return;

            // Update active state
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Switch to the section
            switchSection(section);
        });
    });

    const actionBtn = document.querySelector('.action-btn');
    if (actionBtn) {
        actionBtn.addEventListener('click', () => {
            const nextCrop = document.getElementById('next-crop-name').innerText;
            actionBtn.innerText = 'Planning...';
            setTimeout(() => {
                alert(`${nextCrop} की योजना शुरू! / Planning for ${nextCrop} started!`);
                actionBtn.innerText = 'Plan Next';
                saveRecord('फसल चक्र / Crop Rotation', `${nextCrop} की योजना शुरू / Started Planning for ${nextCrop}`, 'सफल / Success');
            }, 1000);
        });
    }
    // === CHATBOT LOGIC ===
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatMessages = document.getElementById('chat-messages');

    const addMessage = (text, type = 'bot') => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${type}`;
        
        const avatar = type === 'bot' ? '🤖' : '👨‍🌾';
        
        // Format text: handle line breaks and bold
        const formattedText = text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        
        msgDiv.innerHTML = `
            <div class="msg-avatar">${avatar}</div>
            <div class="msg-bubble"><p>${formattedText}</p></div>
        `;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return msgDiv;
    };

    const showTyping = () => {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-msg bot';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="msg-avatar">🤖</div>
            <div class="msg-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>
        `;
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const removeTyping = () => {
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();
    };

    const sendChatMessage = async () => {
        const msg = chatInput.value.trim();
        if (!msg) return;

        // Add user message
        addMessage(msg, 'user');
        chatInput.value = '';
        chatSendBtn.disabled = true;

        // Show typing
        showTyping();

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg })
            });
            const data = await res.json();
            removeTyping();
            addMessage(data.reply || 'माफ़ करें, कोई त्रुटि हुई।', 'bot');
        } catch (err) {
            removeTyping();
            addMessage('माफ़ करें, सर्वर से जुड़ नहीं पाया। 🙏\n(Could not connect to server. Please try again.)', 'bot');
        }

        chatSendBtn.disabled = false;
        chatInput.focus();
    };

    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', sendChatMessage);
    }
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }

    // Initial Checks
    checkAuth();
    renderHistory();
    initSoilChart(); // Default values first
    loadStates();    // Load state dropdown
    fetchDashboardData(); // Then fetch real data
});
