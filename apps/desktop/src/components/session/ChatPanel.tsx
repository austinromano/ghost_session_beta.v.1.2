import { useState, useRef, useEffect } from 'react';
import { useSessionStore } from '../../stores/sessionStore';

export default function ChatPanel() {
  const { chatMessages, sendMessage } = useSessionStore();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(text.trim());
    setText('');
  };

  return (
    <div className="ghost-card flex flex-col h-80">
      <div className="px-3 py-2 border-b border-ghost-border">
        <h3 className="text-xs font-semibold text-ghost-text-secondary uppercase tracking-wider">Chat</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {chatMessages.map((msg, i) => (
          <div key={i}>
            <span className="text-xs font-bold" style={{ color: msg.colour }}>
              {msg.displayName}
            </span>
            <p className="text-sm text-ghost-text-primary">{msg.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-2 border-t border-ghost-border flex gap-2">
        <input
          className="ghost-input flex-1 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
        />
        <button
          onClick={handleSend}
          className="px-3 py-1 bg-ghost-green text-ghost-bg text-xs font-semibold rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
