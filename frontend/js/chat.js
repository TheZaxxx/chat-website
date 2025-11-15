class ChatManager {
    constructor() {
        console.log("🔥 ChatManager initialized");
        this.chatMessages = document.getElementById("chatMessages");
        this.form = document.getElementById("chatForm");
        this.input = document.getElementById("messageInput");

        if (!this.chatMessages || !this.form || !this.input) {
            return console.error("❌ ChatManager failed: Required elements not found.");
        }

        this.form.addEventListener("submit", (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        this.showSystemMessage("SYSTEM READY ✓");
    }

    showSystemMessage(text) {
        this.addMessage(text, "assistant");
    }

    addMessage(text, sender) {
        const msg = document.createElement("div");
        msg.className = "message-gold";
        msg.innerHTML = `<div class="message-content-gold"><b>${sender}:</b> ${text}</div>`;
        this.chatMessages.appendChild(msg);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    async sendMessage() {
        const text = this.input.value.trim();
        if (!text) return;
        this.addMessage(text, "You");
        this.input.value = "";

        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();
        this.typeWriter("AI Assistant", data.reply);
    }

    async typeWriter(sender, text) {
        let container = document.createElement("div");
        container.className = "message-gold";
        container.innerHTML = `<div class="message-content-gold"><b>${sender}:</b> <span class="typing"></span></div>`;
        this.chatMessages.appendChild(container);
        let span = container.querySelector(".typing");

        for (let char of text) {
            span.textContent += char;
            await new Promise(res => setTimeout(res, 12));
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }
}


// === SAFE INITIALIZER ===
function startChat() {
    const el = document.getElementById("chatMessages");
    if (!el) {
        console.log("⏳ Waiting for chat container...");
        return setTimeout(startChat, 100);
    }
    console.log("✅ Chat container detected, starting chat");
    window.chat = new ChatManager();
}

document.addEventListener("DOMContentLoaded", startChat);
