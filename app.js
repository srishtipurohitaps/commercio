const aiService = new AIService();

class App {
    constructor() {
        this.currentPage = 'dashboard';
        this.currentGrade = localStorage.getItem('commercio_grade') || '12';
        this.init();
    }

    init() {
        console.log("Commercio initialized");
        this.updateGradeUI();
        this.updateDashboardWidgets();

        // Listen for Enter key on inputs
        ['accounts-input', 'bst-input', 'eco-input', 'global-query'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (id === 'global-query') this.handleGlobalSearch();
                        if (id === 'accounts-input') this.processAccounts();
                        if (id === 'bst-input') this.processBST();
                        if (id === 'eco-input') this.processEco();
                    }
                });
            }
        });
    }

    // Pro Features
    updateDashboardWidgets() {
        // Exam Countdown (Target: March 15th roughly)
        const examDate = new Date(new Date().getFullYear() + 1, 2, 15); // Next Year March 15
        const today = new Date();
        if (today.getMonth() > 2) examDate.setFullYear(examDate.getFullYear()); // If past March, aim for next year

        const diff = examDate - today;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const countEl = document.getElementById('countdown-days');
        if (countEl) countEl.innerText = days;

        // Daily Quote
        const quotes = [
            "The only way to do great work is to love what you do. - Steve Jobs",
            "Accounting is the language of business. - Warren Buffett",
            "Price is what you pay. Value is what you get. - Warren Buffett",
            "There are no secrets to success. It is the result of preparation. - Colin Powell"
        ];
        const quoteEl = document.getElementById('daily-quote');
        const authorEl = document.getElementById('quote-author');
        if (quoteEl && authorEl) {
            const random = quotes[Math.floor(Math.random() * quotes.length)];
            const [q, a] = random.split(" - ");
            quoteEl.innerText = `"${q}"`;
            authorEl.innerText = `- ${a}`;
        }
    }

    startVoice(targetId) {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Voice input is not supported in this browser. Try Chrome.");
            return;
        }

        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'en-IN'; // Indian English
        recognition.continuous = false;
        recognition.interimResults = false;

        const btn = document.querySelector(`button[onclick="app.startVoice('${targetId}')"]`);
        const originalIcon = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-rose-500"></i>';

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            const input = document.getElementById(targetId);
            input.value += (input.value ? ' ' : '') + text;
            btn.innerHTML = originalIcon;
        };

        recognition.onerror = () => {
            alert("Could not hear you. Please try again.");
            btn.innerHTML = originalIcon;
        };

        recognition.onend = () => {
            btn.innerHTML = originalIcon;
        };

        recognition.start();
    }

    exportPDF(elementId, filename) {
        const element = document.getElementById(elementId);
        const opt = {
            margin: 1,
            filename: `${filename}_${Date.now()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#0f172a' },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Clone and style for PDF (remove dark mode bg transparent issues)
        const clone = element.cloneNode(true);
        clone.style.color = "black";
        clone.style.background = "white";
        // We'll trust html2pdf to render the visible "dark mode" version if we don't mess with it,
        // OR we can make a printer-friendly version. Let's stick to screen capture style first
        // actually html2canvas captures the dark mode fine usually.

        html2pdf().set(opt).from(element).save();
    }

    // Grade Logic
    setGrade(grade) {
        this.currentGrade = grade;
        localStorage.setItem('commercio_grade', grade);
        this.updateGradeUI();
    }

    updateGradeUI() {
        // Update toggle buttons style
        const btn11 = document.getElementById('grade-btn-11');
        const btn12 = document.getElementById('grade-btn-12');
        if (btn11 && btn12) {
            btn11.className = `flex-1 py-2 text-sm rounded-lg transition-all ${this.currentGrade === '11' ? 'bg-primary text-white font-bold shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`;
            btn12.className = `flex-1 py-2 text-sm rounded-lg transition-all ${this.currentGrade === '12' ? 'bg-primary text-white font-bold shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`;
        }
    }

    // Navigation
    navigate(pageId) {
        // Update state
        this.currentPage = pageId;

        // Visual updates
        document.querySelectorAll('.view-section').forEach(el => {
            el.classList.add('hidden');
            el.classList.remove('block', 'animate-fade-in');
        });

        const target = document.getElementById(`${pageId}-view`);
        if (target) {
            target.classList.remove('hidden');
            target.classList.add('block', 'animate-fade-in');
        }

        // Nav Buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.page === pageId) btn.classList.add('active');
        });

        // Close mobile menu if open
        const sidebar = document.getElementById('sidebar');
        if (window.innerWidth < 768) {
            sidebar.classList.add('-translate-x-full');
        }
    }

    toggleMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('-translate-x-full');
    }

    // --- Feature Logic ---

    // Global Search
    async handleGlobalSearch() {
        const input = document.getElementById('global-query');
        const query = input.value.trim();
        if (!query) return;

        // Reuse the Eco chat interface for general queries or create a modal?
        // Let's create a temporary modal result for now or redirect to a 'Chat' page.
        // For simplicity: Alert the answer in a modal.

        this.showGlobalResult(true, "Thinking...");

        try {
            const html = await aiService.solveGeneral(query, this.currentGrade);
            this.showGlobalResult(true, html);
        } catch (err) {
            this.showGlobalResult(false, err.message);
        }
    }

    showGlobalResult(success, content) {
        // Quick dirty modal implementation for global result
        const modalId = 'global-result-modal';
        let modal = document.getElementById(modalId);

        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in";
            modal.innerHTML = `
                <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                    <div class="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 rounded-t-2xl">
                        <h3 class="text-xl font-bold text-white flex items-center gap-2">
                            <i class="fa-solid fa-sparkles text-yellow-400"></i> AI Answer (Class ${this.currentGrade})
                        </h3>
                        <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white transition-colors">
                            <i class="fa-solid fa-xmark text-xl"></i>
                        </button>
                    </div>
                    <div class="p-6 overflow-y-auto markdown-body text-slate-200" id="${modalId}-content">
                        <!-- Content -->
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        const contentDiv = document.getElementById(`${modalId}-content`);
        contentDiv.innerHTML = content;
    }

    // Accountancy
    async processAccounts() {
        const input = document.getElementById('accounts-input').value.trim();
        if (!input) return;

        const outputDiv = document.getElementById('accounts-output');
        this.setLoading(outputDiv, true);

        try {
            const html = await aiService.solveAccounts(input, this.currentGrade);
            outputDiv.innerHTML = `<div class="p-6 animate-fade-in">${html}</div>`;
        } catch (err) {
            this.showError(outputDiv, err);
        }
    }

    // BST
    async processBST() {
        const input = document.getElementById('bst-input').value.trim();
        if (!input) return;

        const outputDiv = document.getElementById('bst-output');
        this.setLoading(outputDiv, true);

        try {
            const html = await aiService.solveBST(input, this.currentGrade);
            outputDiv.innerHTML = `<div class="animate-fade-in">${html}</div>`;
        } catch (err) {
            this.showError(outputDiv, err);
        }
    }

    // Eco
    async processEco() {
        const inputEl = document.getElementById('eco-input');
        const query = inputEl.value.trim();
        if (!query) return;

        // Add user message immediately
        this.addChatMessage('user', query);
        inputEl.value = '';

        const historyDiv = document.getElementById('eco-chat-history');

        // Show typing indicator
        const loadingId = this.addLoadingMessage();
        historyDiv.scrollTop = historyDiv.scrollHeight;

        try {
            const html = await aiService.solveEco(query, this.currentGrade);
            this.removeMessage(loadingId);
            this.addChatMessage('ai', html, true); // true = render HTML
        } catch (err) {
            this.removeMessage(loadingId);
            this.addChatMessage('ai', "Sorry, I encountered an error: " + err.message);
        }
    }

    // --- Helpers ---

    setLoading(element, isLoading) {
        if (isLoading) {
            element.innerHTML = `
                <div class="h-full w-full flex flex-col justify-center items-center text-slate-400">
                    <div class="loader mb-4 border-slate-600 border-t-primary"></div>
                    <p class="animate-pulse">Analyzing...</p>
                </div>
            `;
        }
    }

    showError(element, err) {
        console.error("Full Error Details:", err);
        element.innerHTML = `
            <div class="h-full w-full flex flex-col justify-center items-center text-rose-400 p-6 text-center border-2 border-rose-500/50 rounded-2xl bg-rose-950/20">
                <i class="fa-solid fa-bug text-4xl mb-4 text-rose-500"></i>
                <h3 class="text-xl font-bold text-white mb-2">AI Connection Failed</h3>
                <div class="bg-black/50 p-4 rounded-xl text-left w-full max-w-md overflow-auto font-mono text-xs text-rose-300 border border-rose-900/50">
                    ${err.message}
                </div>
                <p class="text-sm mt-4 text-slate-400">Please send this error to your developer.</p>
            </div>
        `;
    }

    addChatMessage(role, text, isHtml = false) {
        const history = document.getElementById('eco-chat-history');
        const wrapper = document.createElement('div');
        wrapper.className = "flex gap-4 animate-fade-in";

        if (role === 'user') {
            wrapper.classList.add('flex-row-reverse');
            wrapper.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white flex-shrink-0"><i class="fa-solid fa-user"></i></div>
                <div class="bg-primary p-4 rounded-2xl rounded-tr-none max-w-[80%] text-white">
                    ${text}
                </div>
            `;
        } else {
            // AI
            wrapper.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0"><i class="fa-solid fa-robot"></i></div>
                <div class="bg-slate-700/50 p-4 rounded-2xl rounded-tl-none max-w-[80%] text-slate-200 markdown-body">
                    ${isHtml ? text : text} 
                </div>
            `;
        }
        history.appendChild(wrapper);
        history.scrollTop = history.scrollHeight;
    }

    addLoadingMessage() {
        const id = 'loading-' + Date.now();
        const history = document.getElementById('eco-chat-history');
        const wrapper = document.createElement('div');
        wrapper.id = id;
        wrapper.className = "flex gap-4 animate-fade-in";
        wrapper.innerHTML = `
             <div class="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0"><i class="fa-solid fa-robot"></i></div>
             <div class="bg-slate-700/50 p-4 rounded-2xl rounded-tl-none text-slate-400">
                 <div class="flex gap-1">
                    <span class="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
                    <span class="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
                    <span class="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style="animation-delay: 0.4s"></span>
                 </div>
             </div>
        `;
        history.appendChild(wrapper);
        return id;
    }

    removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }
}

// Global instance
const app = new App();
window.app = app;
