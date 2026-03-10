import React, { useState } from 'react';
import { Routine, DayOfWeek } from '../types';
import { X } from 'lucide-react';

interface CopyRoutineModalProps {
  routines: Routine[];
  onClose: () => void;
  onCopy: (sourceDay: DayOfWeek, targetDays: DayOfWeek[]) => void;
}

const CopyRoutineModal: React.FC<CopyRoutineModalProps> = ({ routines, onClose, onCopy }) => {
  const [sourceDay, setSourceDay] = useState<DayOfWeek>(DayOfWeek.MONDAY);
  const [targetDays, setTargetDays] = useState<DayOfWeek[]>([]);

  const toggleTargetDay = (day: DayOfWeek) => {
    if (targetDays.includes(day)) {
      setTargetDays(targetDays.filter(d => d !== day));
    } else {
      setTargetDays([...targetDays, day]);
    }
  };

  const dayLabels: Record<DayOfWeek, string> = {
      [DayOfWeek.MONDAY]: 'Segunda',
      [DayOfWeek.TUESDAY]: 'Terça',
      [DayOfWeek.WEDNESDAY]: 'Quarta',
      [DayOfWeek.THURSDAY]: 'Quinta',
      [DayOfWeek.FRIDAY]: 'Sexta',
      [DayOfWeek.SATURDAY]: 'Sábado',
      [DayOfWeek.SUNDAY]: 'Domingo',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-app-card p-6 rounded-lg w-full max-w-md border border-app-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-app-text">Copiar Rotinas</h2>
          <button onClick={onClose} className="text-app-subtext hover:text-app-text"><X /></button>
        </div>
        
        <div className="mb-4">
          <label className="block text-xs text-app-subtext mb-1 uppercase">Dia de Origem</label>
          <select value={sourceDay} onChange={(e) => setSourceDay(e.target.value as DayOfWeek)} className="w-full bg-app-input p-2 rounded border border-app-border text-app-text">
            {Object.values(DayOfWeek).map(day => <option key={day} value={day}>{dayLabels[day]}</option>)}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-app-subtext mb-1 uppercase">Dias de Destino</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(DayOfWeek).map(day => (
              <button 
                key={day}
                onClick={() => toggleTargetDay(day)}
                className={`p-2 rounded text-xs ${targetDays.includes(day) ? 'bg-app-red text-white' : 'bg-app-input text-app-text'}`}
              >
                {dayLabels[day]}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={() => { onCopy(sourceDay, targetDays); onClose(); }}
          className="w-full bg-app-red text-white p-2 rounded font-bold"
        >
          Copiar
        </button>
      </div>
    </div>
  );
};

export default CopyRoutineModal;
