import React, { useState, useEffect, useRef } from 'react';
import { Hash, Send, Users, MessageSquare } from 'lucide-react';

export default function ChatArea({
  channelName,
  messages = [],
  onSendMessage,
  currentUser,
  onToggleUserList,
  isUserListOpen
}) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 bg-[#313338] flex flex-col justify-between h-full select-text">
      {/* Channel Header */}
      <div className="h-12 border-b border-[#232428] px-4 flex items-center justify-between shadow-sm select-none">
        <div className="flex items-center gap-2">
          <Hash className="w-5 h-5 text-[#80848e]" />
          <span className="font-semibold text-white">{channelName}</span>
          <span className="text-xs text-[#949ba4] hidden md:inline ml-2">
            Текстовый канал для общения с друзьями
          </span>
        </div>

        <button
          onClick={onToggleUserList}
          className={`p-1.5 rounded-md hover:bg-[#35373c] transition-colors ${
            isUserListOpen ? 'text-white' : 'text-[#b5bac1]'
          }`}
          title="Список участников"
        >
          <Users className="w-5 h-5" />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#949ba4] select-none">
            <div className="w-16 h-16 rounded-2xl bg-[#2b2d31] flex items-center justify-center text-[#5865f2] mb-3 shadow-md">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Добро пожаловать в #{channelName}!</h3>
            <p className="text-xs max-w-sm">
              Это начало канала #{channelName}. Отправьте первое сообщение своим друзьям!
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === currentUser?.userId;
            const prevMsg = messages[index - 1];
            const isSequence =
              prevMsg &&
              prevMsg.senderId === msg.senderId &&
              msg.timestamp - prevMsg.timestamp < 300000;

            return (
              <div
                key={msg.id || index}
                className={`flex gap-3 hover:bg-[#2e3035]/50 px-2 py-1 -mx-2 rounded-lg transition-colors group ${
                  isSequence ? 'mt-0.5' : 'mt-2.5'
                }`}
              >
                {!isSequence ? (
                  <div className="flex-shrink-0 select-none">
                    {msg.senderAvatarUrl ? (
                      <img
                        src={msg.senderAvatarUrl}
                        alt={msg.senderName}
                        className="w-10 h-10 rounded-full object-cover shadow-sm ring-1 ring-white/10"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-sm"
                        style={{ backgroundColor: msg.senderColor || '#5865f2' }}
                      >
                        {(msg.senderName || 'Г').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-10 flex-shrink-0 text-[10px] text-[#949ba4] opacity-0 group-hover:opacity-100 flex items-center justify-center select-none">
                    {formatTime(msg.timestamp)}
                  </div>
                )}

                <div className="flex-1 overflow-hidden">
                  {!isSequence && (
                    <div className="flex items-baseline gap-2 select-none mb-0.5">
                      <span className="font-semibold text-sm text-[#f2f3f5] hover:underline cursor-pointer">
                        {msg.senderName}
                      </span>
                      {isMe && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#5865f2]/20 text-[#5865f2] font-semibold">
                          ВЫ
                        </span>
                      )}
                      <span className="text-[11px] text-[#949ba4]">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  )}

                  <div className="text-sm text-[#dbdee1] leading-relaxed break-words whitespace-pre-wrap">
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bar */}
      <div className="p-4 pt-1">
        <form
          onSubmit={handleSend}
          className="bg-[#383a40] rounded-xl px-4 py-2.5 flex items-center gap-3 focus-within:ring-2 focus-within:ring-[#5865f2] transition-all"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Написать в #${channelName}`}
            className="flex-1 bg-transparent border-none outline-none text-sm text-[#dbdee1] placeholder-[#80848e]"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-1.5 rounded-full bg-[#5865f2] hover:bg-[#4752c4] text-white disabled:opacity-40 disabled:hover:bg-[#5865f2] transition-colors shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
