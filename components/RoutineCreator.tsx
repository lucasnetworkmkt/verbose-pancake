import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Category, Priority, Goal } from '../types';

interface RoutineCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, priority: Priority, category: Category, goalId?: string) => void;
  goals: Goal[];
}

const RoutineCreator: React.FC<RoutineCreatorProps> = ({ isOpen, onClose, onCreate, goals }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>(Category.OTHER);
  const [priority, setPriority] = useState<Priority>(Priority.MODERATE);
  const [goalId, setGoalId] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(title, priority, category, goalId || undefined);
    // Reset
    setTitle('');
    setCategory(Category.OTHER);
    setPriority(Priority.MODERATE);
    setGoalId('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-app-card border border-app-border rounded-lg shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-app-border">
          <h2 className="text-xl font-bold text-app-text uppercase tracking-wider">Nova Rotina</h2>
          <button onClick={onClose} className="text-app-subtext hover:text-app-text">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-app-subtext mb-1 uppercase font-bold">Título</label>
            <input 
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-app-input border border-app-border text-app-text p-3 rounded focus:border-app-gold outline-none"
              placeholder="Ex: Treino de Força"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-app-subtext mb-1 uppercase font-bold">Categoria</label>
              <select 
                value={category} 
                onChange={e => setCategory(e.target.value as Category)}
                className="w-full bg-app-input border border-app-border text-app-text p-3 rounded focus:border-app-gold outline-none"
              >
                {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-app-subtext mb-1 uppercase font-bold">Prioridade</label>
              <select 
                value={priority} 
                onChange={e => setPriority(e.target.value as Priority)}
                className="w-full bg-app-input border border-app-border text-app-text p-3 rounded focus:border-app-gold outline-none"
              >
                <option value={Priority.HIGH}>Alta (Vermelho)</option>
                <option value={Priority.MODERATE}>Moderada (Dourado)</option>
                <option value={Priority.LOW}>Baixa (Cinza)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-app-subtext mb-1 uppercase font-bold">Associar a uma Meta (Opcional)</label>
            <select 
              value={goalId} 
              onChange={e => setGoalId(e.target.value)}
              className="w-full bg-app-input border border-app-border text-app-text p-3 rounded focus:border-app-gold outline-none"
            >
              <option value="">-- Nenhuma Meta --</option>
              {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>

          <button 
            type="submit"
            className="w-full bg-app-red hover:bg-red-700 text-white font-bold py-4 mt-4 uppercase tracking-widest rounded-sm transition-colors"
          >
            Criar Rotina
          </button>
        </form>
      </div>
    </div>
  );
};

export default RoutineCreator;
