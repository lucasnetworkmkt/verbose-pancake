
import React from 'react';
import { X, Activity } from 'lucide-react';
import { FriendProfile } from '../types';
import EvolutionMap from './EvolutionMap';
import HistoryChart from './HistoryChart';

interface FriendProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: FriendProfile | null;
}

const FriendProfileModal: React.FC<FriendProfileModalProps> = ({ isOpen, onClose, profile }) => {
  if (!isOpen || !profile) return null;

  // Calculando Streak do amigo
  let streak = 0;
  // (Lógica simplificada de streak, similar ao App.tsx)
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const log = profile.dayLogs[dateStr];
    if (i === 0 && (!log || !log.isValid)) continue; 
    if (log && log.isValid) streak += 1;
    else break;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-2">
       <div className="w-full h-full max-w-6xl bg-app-bg flex flex-col rounded-lg overflow-hidden border border-app-border">
          {/* Header */}
          <div className="p-4 border-b border-app-border flex items-center justify-between bg-app-card">
              <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-2 border-app-gold overflow-hidden">
                      {profile.user.avatarUrl ? (
                          <img src={profile.user.avatarUrl} className="w-full h-full object-cover" />
                      ) : (
                          <div className="w-full h-full bg-app-input flex items-center justify-center font-bold text-xl">{profile.user.username[0]}</div>
                      )}
                  </div>
                  <div>
                      <h2 className="text-xl font-bold text-app-text">{profile.user.username}</h2>
                      <div className="flex items-center gap-2 text-xs text-app-subtext">
                          <Activity size={14} className="text-app-gold" />
                          <span className="text-app-gold font-bold">{streak} Dias</span> de Sequência
                      </div>
                  </div>
              </div>
              <button onClick={onClose} className="p-2 bg-app-input rounded-full hover:bg-app-red hover:text-white transition-colors">
                  <X size={24} />
              </button>
          </div>

          {/* Content Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
              
              {/* History Section */}
              <div className="bg-app-card p-6 rounded border border-app-border">
                  <h3 className="text-sm font-bold uppercase text-app-subtext mb-4">Histórico de Consistência</h3>
                  <HistoryChart logs={profile.dayLogs} />
              </div>

              {/* Evolution Map (Read Only) */}
              <div className="h-[600px] border border-app-border rounded overflow-hidden">
                  <EvolutionMap 
                    evolutionState={profile.evolution}
                    isReadOnly={true}
                    onCompleteDay={() => {}}
                    onUndoDay={() => {}}
                    onCompleteDayLevel2={() => {}}
                    onUndoDayLevel2={() => {}}
                    onStartLevel1={() => {}}
                    onStartLevel2={() => {}}
                    onStartLevel3={() => {}}
                    onCompleteDayLevel3={() => {}}
                  />
              </div>
          </div>
       </div>
    </div>
  );
};

export default FriendProfileModal;
