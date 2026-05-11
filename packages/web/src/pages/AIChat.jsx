import { useState, useRef, useEffect } from 'react';
import { useSession } from '../lib/auth';
import './AIChat.css';

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: 'Halo! 👋 Saya asisten AI DMS. Saya bisa membantu Anda:\n\n• Memahami dokumen dan proses approval\n• Menjelaskan workflow dan alur persetujuan\n• Membantu review draft dokumen\n• Menjawab pertanyaan seputar fitur DMS\n\nAda yang bisa saya bantu?'
};

export default function AIChat() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [isLoading]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Add placeholder for streaming response
    setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }]);

    try {
      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : ''
      })).filter(m => m.role !== 'system');

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ messages: apiMessages, stream: true })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.isStreaming) {
                    updated[updated.length - 1] = { ...last, content: fullContent };
                  }
                  return updated;
                });
              }
            } catch { /* skip */ }
          }
        }
      }

      // Done streaming - remove streaming flag
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.isStreaming) {
          updated[updated.length - 1] = { role: 'assistant', content: last.content || 'Tidak ada respons.' };
        }
        return updated;
      });
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.isStreaming) {
          updated[updated.length - 1] = {
            role: 'assistant',
            content: `Maaf, terjadi kesalahan: ${err.message}. Silakan coba lagi.`
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE]);
  };

  return (
    <div className="ai-chat-container">
      <div className="ai-chat-header">
        <div className="ai-chat-title">
          <span className="ai-chat-icon">🤖</span>
          <h2>AI Assistant</h2>
        </div>
        <div className="ai-chat-actions">
          <button className="ai-btn-icon" onClick={clearChat} title="Reset chat">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M1 4L2 14H14L15 4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M6 4V2H10V4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 4H13" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="ai-chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`ai-message ${msg.role}`}>
            <div className="ai-message-avatar">
              {msg.role === 'assistant' ? '🤖' : '👤'}
            </div>
            <div className="ai-message-bubble">
              <div className="ai-message-content">
                {msg.content ? (
                  <div className="ai-message-text">
                    {msg.content.split('\n').map((line, j) => (
                      <span key={j}>
                        {line}
                        {j < msg.content.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="ai-typing">
                    <span className="ai-typing-dot" />
                    <span className="ai-typing-dot" />
                    <span className="ai-typing-dot" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <form className="ai-chat-input" onSubmit={sendMessage}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanya sesuatu tentang DMS..."
          disabled={isLoading}
          className="ai-input-field"
        />
        <button
          type="submit"
          className="ai-send-btn"
          disabled={!input.trim() || isLoading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
