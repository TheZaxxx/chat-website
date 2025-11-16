// frontend/js/chat.js
class ChatManager {
    state = {
        signed: false,
        waitingSignature: true,
        waitingCheckIn: false,
        historyLoaded: false
    };

    constructor() {
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
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
        });

        this.loadPoints().catch(()=>{});
        this.showWelcome();
    }

    // MAIN MESSAGE HANDLER
    async handleSend(e) {
        e.preventDefault();
        const txt = this.messageInput.value.trim();
        if (!txt) return;

        this.addUserMessage(txt);
        this.saveChatHistory();
    
        // STEP 1: WAIT FOR START
        if (this.state.waitingSignature) {
            if (txt.toLowerCase() !== "start") {
                return this.streamAssistantMessage(`Wrong signature ⛔\nPlease type START to sign!`);
            }
            this.state.waitingSignature = false;
            this.state.signed = true;
            this.state.waitingCheckIn = true;
            await this.streamAssistantMessage(`DONE! You successfully signed ✔`);
            return this.sendWelcomeCheckInPrompt();
        }

        // STEP 2: WAIT FOR CHECK-IN
        if (this.state.waitingCheckIn) {
            if (txt.toLowerCase() !== "check-in") {
                return this.streamAssistantMessage(`@#$_&-+()/*"' :;!? what? you are wrong! ⛔`);
            }
            return this.processCheckIn();
        }

        // AFTER sign & first check-in, fallback to normal
        this.streamAssistantMessage("I don't understand that yet.");
    }

    // CUSTOM WELCOME
    async showWelcome() {
        if (!this.state.historyLoaded) {
            this.loadChatHistory();
            this.state.historyLoaded = true;
        }

        if (this.chatMessages.children.length > 0) return; // prevent duplicate

        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const date = now.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });

        await this.streamAssistantMessage(
            `Hello, you logged in today..\n⏱️ ${time}\n📅 ${date}\nPlease type START to sign!`
        );
    }

    // CUSTOM PROMPT AFTER SIGN
    async sendWelcomeCheckInPrompt() {
        const h = new Date().getHours();
        const greeting = h < 12 ? "Good morning!" : h < 18 ? "Good afternoon!" : "Good evening!";

        const checked = await this.checkAlreadyCheckedIn();

        if (checked) {
            return this.streamAssistantMessage(`${greeting} I see you've already checked in today. Great job! ✅`);
        }

        return this.streamAssistantMessage(`${greeting} Have you checked in today? Type "check-in" to earn 10 points! 🎯`);
    }

    async checkAlreadyCheckedIn() {
        const token = localStorage.getItem("authToken");
        const res = await fetch("/api/chat/today-status", {
            headers: { Authorization: token ? `Bearer ${token}` : "" }
        });

        if (!res.ok) return false;
        const data = await res.json();
        return !!data.checkedInToday;
    }

    // PROCESS CHECK-IN
    async processCheckIn() {
        const token = localStorage.getItem("authToken");
        const response = await fetch("/api/chat/check-in", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: token ? `Bearer ${token}` : ""
            },
            body: JSON.stringify({ message: "check-in" })
        });

        const data = await response.json();

        if (data.checkedIn && data.pointsEarned > 0) {
            await this.streamAssistantMessage(`🎉 Congratulations! You successfully check-in today!\nCome back tomorrow to keep earning points!`);
        } else {
            await this.streamAssistantMessage(`I see you've already checked in today.\nCome back tomorrow to earn more points! ✅`);
        }

        this.state.waitingCheckIn = false;
        this.saveChatHistory();
    }

    addUserMessage(text) {
        const wrapper = document.createElement('div');
        wrapper.className = 'message user-message-gold';
        wrapper.innerHTML = `<div class="message-content-gold"><strong>You:</strong> ${this.escapeHtml(text)}</div><div class="message-time-gold">${this.getTime()}</div>`;
        this.chatMessages.appendChild(wrapper);
        this.scrollBottom();
    }

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

            if (',.!?'.includes(ch)) {
                await this.sleep(200);
            } else {
                await this.sleep(18 + Math.random() * 30);
            }
        }

        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time-gold';
        timeDiv.textContent = this.getTime();
        wrapper.appendChild(timeDiv);
        this.scrollBottom();
        this.saveChatHistory();
    }

    saveChatHistory() {
        localStorage.setItem("chatHistory", this.chatMessages.innerHTML);
        localStorage.setItem("chatState", JSON.stringify(this.state));
    }

    loadChatHistory() {
        const saved = localStorage.getItem("chatHistory");
        const stateData = localStorage.getItem("chatState");

        if (saved) this.chatMessages.innerHTML = saved;
        if (stateData) this.state = JSON.parse(stateData);
    }

    // UTILS
    scrollBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    getTime() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    handleLogout() {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userData");
        window.location.href = "/login";
    }

    escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]));
    }
}

// SAFE INIT
function startChat() {
    if (document.getElementById("chatMessages")) {
        new ChatManager();
    } else {
        setTimeout(startChat, 120);
    }
}
document.addEventListener("DOMContentLoaded", startChat);
