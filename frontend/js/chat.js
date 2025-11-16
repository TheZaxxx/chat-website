// frontend/js/chat.js
class ChatManager {
    state = {
    signed: false,
    waitingSignature: true,
    waitingCheckIn: false,
    historyLoaded: false
};
    constructor() {
        // safe selectors (match dashboard.html)
        this.chatMessages = document.getElementById("chatMessages");
        this.chatForm = document.getElementById("chatForm");
        this.messageInput = document.getElementById("messageInput");
        this.pointsValue = document.getElementById("pointsValue");
        this.logoutBtn = document.getElementById("logoutBtn");

        if (!this.chatMessages || !this.chatForm || !this.messageInput) {
            console.error("Chat UI elements not found. Aborting ChatManager init.");
            return;
        }

        this.baseSpeed = 18;
        this.maxSpeed = 45;
        this.punctuationDelay = 220;

        this.setup();
    }

    setup() {
        this.chatForm.addEventListener("submit", (e) => this.handleSend(e));
        if (this.logoutBtn) this.logoutBtn.addEventListener("click", () => this.handleLogout());
        // autoresize
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
        });

        this.loadPoints().catch(()=>{});
        this.showWelcome();
    }

    // robust send logic (calls backend /check-in)
    async handleSend(e) {
        e.preventDefault();
        const txt = this.messageInput.value.trim();
        if (!txt) return;
        this.addUserMessage(txt);
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';

        // show typing indicator
        const typingId = this.showTypingIndicator();

        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch('/api/chat/check-in', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ message: txt })
            });

            if (!res.ok) {
                // show server error
                this.removeTypingIndicator(typingId);
                this.addAssistantMessage(`⚠️ Server returned ${res.status}`);
                return;
            }

            const data = await res.json();
            this.removeTypingIndicator(typingId);

            // if backend returns 'response' (your current backend uses 'response' field)
            const replyText = data.response ?? data.reply ?? "No reply from server.";
            await this.streamAssistantMessage(replyText);

            if (data.checkedIn) await this.loadPoints();
        } catch (err) {
            this.removeTypingIndicator(typingId);
            console.error("Network error:", err);
            this.addAssistantMessage("❌ Failed to reach server. Check backend.");
        }
    }

    addUserMessage(text) {
        const wrapper = document.createElement('div');
        wrapper.className = 'message user-message-gold';
        wrapper.innerHTML = `<div class="message-content-gold"><strong>You:</strong> ${this.escapeHtml(text)}</div>
                             <div class="message-time-gold">${this.getTime()}</div>`;
        this.chatMessages.appendChild(wrapper);
        this.scrollBottom();
    }

    addAssistantMessage(text) {
        const wrapper = document.createElement('div');
        wrapper.className = 'message ai-message-gold';
        wrapper.innerHTML = `<div class="message-content-gold"><strong>assistant:</strong> ${this.escapeHtml(text)}</div>
                             <div class="message-time-gold">${this.getTime()}</div>`;
        this.chatMessages.appendChild(wrapper);
        this.scrollBottom();
    }

    // streaming typewriter with humanized delays
    async streamAssistantMessage(text) {
        const wrapper = document.createElement('div');
        wrapper.className = 'message ai-message-gold';
        const content = document.createElement('div');
        content.className = 'message-content-gold';
        content.innerHTML = `<strong>assistant:</strong> <span class="stream"></span>`;
        wrapper.appendChild(content);
        this.chatMessages.appendChild(wrapper);
        this.scrollBottom();

        const span = content.querySelector('.stream');
        let out = '';
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            out += this.escapeHtml(ch);
            span.innerHTML = out;
            this.scrollBottom();

            // punctuation pause
            if (',.!?'.includes(ch)) {
                await this.sleep(this.punctuationDelay);
            } else {
                const delay = this.baseSpeed + Math.random() * (this.maxSpeed - this.baseSpeed);
                await this.sleep(delay);
            }
        }

        // append time
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time-gold';
        timeDiv.textContent = this.getTime();
        wrapper.appendChild(timeDiv);
        this.scrollBottom();
    }

    showTypingIndicator() {
        // return id for later removal
        const id = 'typing-' + Date.now();
        const el = document.createElement('div');
        el.id = id;
        el.className = 'message ai-message-gold';
        el.innerHTML = `<div class="message-content-gold"><strong>assistant:</strong> <span class="typingdots">...</span></div>`;
        this.chatMessages.appendChild(el);
        this.scrollBottom();
        return id;
    }

    removeTypingIndicator(id) {
        if (!id) {
            const el = document.querySelector('.message.ai-message-gold .typingdots')?.closest('.message.ai-message-gold');
            if (el) el.remove();
            return;
        }
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    async loadPoints() {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch('/api/chat/points', {
                headers: { 'Authorization': token ? `Bearer ${token}` : '' }
            });
            if (!res.ok) return;
            const data = await res.json();
            if (this.pointsValue) this.pointsValue.textContent = data.totalPoints ?? 0;
        } catch (e) { console.warn(e); }
    }

    async showWelcome() {
    if (!this.state.historyLoaded) {
        this.loadChatHistory();
        this.state.historyLoaded = true;
    }

    if (this.chatMessages.children.length > 0) return; // prevent duplicate welcome

    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const date = now.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });

    await this.streamAssistantMessage(
        `Hello, you logged in today..\n⏱️ ${time}\n📅 ${date}\nPlease type START to sign!`
    );
}

    getGreeting() {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning!';
        if (h < 18) return 'Good afternoon!';
        return 'Good evening!';
    }

    getTime() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    scrollBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    handleLogout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/login';
    }

    escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]));
    }
}

// SAFE init: wait until element exists
function startChat() {
    if (document.getElementById("chatMessages")) {
        new ChatManager();
    } else {
        setTimeout(startChat, 120);
    }
}
document.addEventListener("DOMContentLoaded", startChat);
