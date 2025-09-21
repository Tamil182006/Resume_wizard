import React, { useState } from "react";

function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input) return;
    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "bot", content: data.reply }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "bot", content: "Error! Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition"
      >
        💬
      </button>

      {/* Chat Window */}
      {open && (
  <div className="fixed bottom-20 right-8 w-96 h-[28rem] bg-white rounded-xl shadow-xl flex flex-col">

          <div className="bg-blue-600 text-white font-bold p-4 rounded-t-xl flex justify-between items-center">
            Resume Chat
            <button onClick={() => setOpen(false)}>✖</button>
          </div>
          <div className="flex-1 p-3 overflow-y-auto space-y-2">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === "user" ? "text-right" : "text-left"}>
                <span
                  className={`inline-block p-2 rounded-lg ${
                    msg.role === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-900"
                  }`}
                >
                  {msg.content}
                </span>
              </div>
            ))}
            {loading && <span className="text-gray-500">Typing...</span>}
          </div>
          <div className="p-2 flex gap-2 border-t">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me about your resume..."
              className="flex-1 border rounded-lg p-2"
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatbotWidget;
