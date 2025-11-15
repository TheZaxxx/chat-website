class ChatManager {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.chatForm = document.getElementById('chatForm');
        this.pointsValue = document.getElementById('pointsValue');
        this.userName = document.getElementById('userName');
        this.logoutBtn = document.getElementById('logoutBtn');

        this.baseSpeed = 18;  // min speed
        this.maxSpeed = 45;   // max speed
        this.punctuationDelay = 250; // extra wait after punctuation
        this.init();
    }

    init() {
        const token = localStorage.getItem('authToken');
        if (!token) return (window.location.href = '/login');

        this.loadUserData();
        this.setupEventListeners();
        this.loadPoints();
        this.showWelcomeMessage();
    }

    setupEventListeners() {
        this.chatForm.addEventListener('submit', (e) => this.handleSendMessage(e));
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // ===========================
    // TYPING / STREAMING EFFECT
    // ===========================
    async streamText(element, text) {
        element.innerHTML = `<strong>AI Assistant:</strong> `;
        const cursor = document.createElement("span");
        cursor.className = "cursor";
        cursor.textContent = "█";
        element.appendChild(cursor);

        let output = "";
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const delay = this.baseSpeed + Math.random() * (this.maxSpeed - this.baseSpeed);

            output += char;
            element.innerHTML = `<strong>AI Assistant:</strong> ${output}`;
            element.appendChild(cursor);

            // extra delay after punctuation
            if (".!?,".includes(char)) {
                await this.sleep(this.punctuationDelay);
            } else {
                await this.sleep(delay);
            }

            this.scrollToBottom();
        }

        cursor.remove();
    }

    sleep(ms) {
        return new Promise(res => setTimeout(res, ms));
    }

    // ===========================
    // ADD MESSAGES
    // ===========================
    async typewriterMessage(text) {
        const wrapper = document.createElement("div");
        wrapper.className = "message ai-message";

        const content = document.createElement("div");
        content.className = "message-content";
        wrapper.appendChild(content);

        this.chatMessages.appendChild(wrapper);
        this.scrollToBottom();

        await this.streamText(content, text);

        const time = document.createElement("div");
        time.className = "message-time";
        time.textContent = this.getCurrentTime();
        wrapper.appendChild(time);

        this.scrollToBottom();
    }

    addMessage(content, sender) {
        const wrapper = document.createElement("div");
        wrapper.className = `message ${sender}-message`;

        const msg = document.createElement("div");
        msg.className = "message-content";
        msg.textContent = content;

        const time = document.createElement("div");
        time.className = "message-time";
        time.textContent = this.getCurrentTime();

        wrapper.appendChild(msg);
        wrapper.appendChild(time);
        this.chatMessages.appendChild(wrapper);

        this.scrollToBottom();
    }

    showTypingIndicator() {
        const el = document.createElement("div");
        el.id = "typingIndicator";
        el.className = "message ai-message";
        el.innerHTML = `<div class="message-content"><strong>AI Assistant:</strong> <span class="typingdots">...</span></div>`;
        this.chatMessages.appendChild(el);
        this.scrollToBottom();
    }

    removeTypingIndicator() {
        const el = document.getElementById("typingIndicator");
        if (el) el.remove();
    }

    async handleSendMessage(e) {
        e.preventDefault();
        const msg = this.messageInput.value.trim();
        if (!msg) return;

        this.addMessage(msg, "user");
        this.messageInput.value = "";

        this.showTypingIndicator();

        try {
            const res = await fetch("/api/chat/check-in", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("authToken")}`
                },
                body: JSON.stringify({ message: msg })
            });

            const data = await res.json();
            this.removeTypingIndicator();

            if (res.ok) {
                await this.typewriterMessage(data.response);
                if (data.checkedIn) this.loadPoints();
            } else {
                await this.typewriterMessage("⚠️ Error: " + (data.error || "Unknown error"));
            }
        } catch {
            this.removeTypingIndicator();
            await this.typewriterMessage("⚠️ AI system error. Please try again.");
        }
    }

    async showWelcomeMessage() {
        const checked = await this.checkTodayStatus();
        const greet = this.getGreetingTime();
        const msg = checked
            ? `${greet} I see you're already checked in today. Nice work! ⭐ Come back tomorrow for more points!`
            : `${greet} Have you checked in today? Type "check-in" to earn 10 points! ⚡`;
        await this.typewriterMessage(msg);
    }

    handleLogout() {
        localStorage.clear();
        window.location.href = "/login";
    }

    async loadPoints() {
        const res = await fetch("/api/chat/points", {
            headers: { "Authorization": `Bearer ${localStorage.getItem("authToken")}` }
        });
        if (res.ok) {
            const data = await res.json();
            this.pointsValue.textContent = data.totalPoints;
        }
    }

    async checkTodayStatus() {
        const res = await fetch("/api/chat/today-status", {
            headers: { "Authorization": `Bearer ${localStorage.getItem("authToken")}` }
        });
        if (res.ok) {
            const data = await res.json();
            return data.checkedInToday;
        }
        return false;
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    getGreetingTime() {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning!";
        if (hour < 18) return "Good afternoon!";
        return "Good evening!";
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
}

document.addEventListener("DOMContentLoaded", () => new ChatManager());
