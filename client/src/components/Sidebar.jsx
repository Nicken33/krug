import React from 'react';
import { MessageSquare, Plus, Share2, Compass, ShieldAlert } from 'lucide-react';

export default function Sidebar({
  currentView,
  setCurrentView,
  room,
  onOpenInviteModal,
  onOpenJoinModal
}) {
  return (
    <aside className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 gap-2 border-r border-[#232428] select-none z-20">
      {/* Direct Messages Icon */}
      <div className="relative group flex items-center justify-center w-full">
        <button
          onClick={() => setCurrentView('dm')}
          className={`w-12 h-12 rounded-[24px] group-hover:rounded-[16px] transition-all duration-200 flex items-center justify-center ${
            currentView === 'dm'
              ? 'bg-[#5865f2] rounded-[16px] text-white'
              : 'bg-[#313338] text-[#dbdee1] hover:bg-[#5865f2] hover:text-white'
          }`}
          title="Личные сообщения"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>

      {/* Divider */}
      <div className="w-8 h-[2px] bg-[#35363c] rounded my-1" />

      {/* Current Room Icon */}
      {room && (
        <div className="relative group flex items-center justify-center w-full">
          <button
            onClick={() => setCurrentView('room')}
            className={`w-12 h-12 rounded-[24px] group-hover:rounded-[16px] transition-all duration-200 flex items-center justify-center font-bold text-lg ${
              currentView === 'room'
                ? 'bg-[#5865f2] rounded-[16px] text-white shadow-lg'
                : 'bg-[#313338] text-[#dbdee1] hover:bg-[#5865f2] hover:text-white'
            }`}
            title={room.name || room.code}
          >
            {(room.name || room.code || 'К').slice(0, 2).toUpperCase()}
          </button>
        </div>
      )}

      {/* Add / Join Room Button */}
      <div className="relative group flex items-center justify-center w-full">
        <button
          onClick={onOpenJoinModal}
          className="w-12 h-12 rounded-[24px] group-hover:rounded-[16px] transition-all duration-200 flex items-center justify-center bg-[#313338] text-[#23a55a] hover:bg-[#23a55a] hover:text-white"
          title="Сменить или создать комнату"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Share / Invite friends */}
      <div className="relative group flex items-center justify-center w-full">
        <button
          onClick={onOpenInviteModal}
          className="w-12 h-12 rounded-[24px] group-hover:rounded-[16px] transition-all duration-200 flex items-center justify-center bg-[#313338] text-[#5865f2] hover:bg-[#5865f2] hover:text-white"
          title="Пригласить друзей (ссылка)"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}
