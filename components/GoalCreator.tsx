import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Category, Priority } from '../types';
import { COLORS } from '../constants';

interface GoalCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { title: string; description: string; deadline: string; category: Category; priority: Priority }) => void;
}

const GoalCreator: React.FC<GoalCreatorProps> = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState<Category>(Category.OTHER);
  const [priority, setPriority] = useState<Priority>(Priority.MODERATE);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({ title, description, deadline, category, priority });
    // Reset
    setTitle('');
    setDescription('');
    setDeadline('');
    setCategory(Category.OTHER);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-app-card border border-gray-700 rounded-lg shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">Nova Meta</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
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
              className="w-full bg-[#0A0A0A] border border-gray-700 text-white p-3 rounded focus:border-app-gold outline-none"
              placeholder="Ex: Correr Maratona"
            />
          </div>

          <div>
            <label className="block text-xs text-app-subtext mb-1 uppercase font-bold">Descrição Curta</label>
            <textarea 
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-gray-700 text-white p-3 rounded focus:border-app-gold outline-none h-24 resize-none"
              placeholder="O que você quer alcançar exatamente?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-app-subtext mb-1 uppercase font-bold">Prazo</label>
              <input 
                type="date"
                required
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-gray-700 text-white p-3 rounded focus:border-app-gold outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-app-subtext mb-1 uppercase font-bold">Prioridade</label>
              <select 
                value={priority} 
                onChange={e => setPriority(e.target.value as Priority)}
                className="w-full bg-[#0A0A0A] border border-gray-700 text-white p-3 rounded focus:border-app-gold outline-none"
              >
                <option value={Priority.HIGH}>Alta (Vermelho)</option>
                <option value={Priority.MODERATE}>Moderada (Dourado)</option>
                <option value={Priority.LOW}>Baixa (Cinza)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-app-subtext mb-1 uppercase font-bold">Categoria</label>
            <select 
              value={category} 
              onChange={e => setCategory(e.target.value as Category)}
              className="w-full bg-[#0A0A0A] border border-gray-700 text-white p-3 rounded focus:border-app-gold outline-none"
            >
              {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <button 
            type="submit"
            className="w-full bg-app-red hover:bg-red-700 text-white font-bold py-4 mt-4 uppercase tracking-widest rounded-sm transition-colors"
          >
            Criar Meta
          </button>
        </form>
      </div>
    </div>
  );
};

export default GoalCreator;