import React, { useState } from 'react';
import { X, Plus, Trash2, Clock, Check, Sun, Sunset, Moon } from 'lucide-react';
import { Routine, RoutineTask, TimeBlock } from '../types';
import { COLORS } from '../constants';

interface RoutineDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  routine: Routine | null;
  onUpdateRoutine: (updatedRoutine: Routine) => void;
}

const RoutineDetailsModal: React.FC<RoutineDetailsModalProps> = ({ isOpen, onClose, routine, onUpdateRoutine }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('08:00');
  const [activeBlock, setActiveBlock] = useState<TimeBlock>(TimeBlock.MORNING);

  if (!isOpen || !routine) return null;

  const tasks = routine.routineTasks || [];

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
      const val = e.target.value;
      setter(val);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: RoutineTask = {
      id: crypto.randomUUID(),
      title: newTaskTitle,
      time: newTaskTime,
      isCompleted: false,
      block: activeBlock
    };

    const updatedRoutine = {
      ...routine,
      routineTasks: [...tasks, newTask]
    };

    onUpdateRoutine(updatedRoutine);
    setNewTaskTitle('');
  };

  const toggleTask = (taskId: string) => {
    const updatedTasks = tasks.map(t => 
      t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
    );
    onUpdateRoutine({ ...routine, routineTasks: updatedTasks });
  };

  const deleteTask = (taskId: string) => {
    if (window.confirm("Excluir esta tarefa da rotina?")) {
        const updatedTasks = tasks.filter(t => t.id !== taskId);
        onUpdateRoutine({ ...routine, routineTasks: updatedTasks });
    }
  };

  const updateTaskTime = (taskId: string, newTime: string) => {
    const updatedTasks = tasks.map(t => 
      t.id === taskId ? { ...t, time: newTime } : t
    );
    onUpdateRoutine({ ...routine, routineTasks: updatedTasks });
  };

  const getBlockIcon = (block: TimeBlock) => {
    switch (block) {
      case TimeBlock.MORNING: return <Sun size={18} className="text-app-gold" />;
      case TimeBlock.AFTERNOON: return <Sunset size={18} className="text-orange-500" />;
      case TimeBlock.NIGHT: return <Moon size={18} className="text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 md:p-4">
      <div className="w-full max-w-4xl bg-app-card border border-app-border rounded-lg shadow-2xl flex flex-col max-h-[95vh] md:max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-app-border shrink-0 bg-app-card z-10 rounded-t-lg">
          <div className="min-w-0 pr-2">
            <h2 className="text-lg md:text-2xl font-bold text-app-text uppercase tracking-wider truncate">{routine.title}</h2>
            <p className="text-app-subtext text-xs md:text-sm truncate">Microtarefas e Execução Detalhada</p>
          </div>
          <button onClick={onClose} className="text-app-subtext hover:text-app-text transition-colors p-1">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6 scrollbar-thin touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pb-20 md:pb-0">
            {Object.values(TimeBlock).map((block) => {
              const blockTasks = tasks.filter(t => t.block === block);
              const isSelected = activeBlock === block;

              return (
                <div 
                  key={block} 
                  className={`flex flex-col bg-app-input border rounded-lg transition-all duration-300 overflow-hidden ${isSelected ? 'border-app-subtext shadow-lg ring-1 ring-app-border' : 'border-app-border opacity-90 md:opacity-80 hover:opacity-100'}`}
                  onClick={() => setActiveBlock(block)}
                >
                  {/* Block Header */}
                  <div className="p-3 border-b border-app-border flex items-center gap-3 bg-app-card/30 shrink-0">
                    {getBlockIcon(block)}
                    <h3 className="font-bold text-xs md:text-sm uppercase text-app-text">{block}</h3>
                    <span className="ml-auto text-xs bg-app-card border border-app-border px-2 py-0.5 rounded text-app-subtext">
                      {blockTasks.length}
                    </span>
                  </div>

                  {/* Tasks List */}
                  <div className={`flex-1 p-2 space-y-2 ${isSelected ? 'min-h-[100px]' : 'min-h-[60px]'} md:overflow-y-auto md:max-h-[300px] md:scrollbar-thin`}>
                    {blockTasks.length === 0 && (
                      <div className="flex flex-col items-center justify-center text-app-subtext text-xs italic py-4">
                        Sem tarefas
                      </div>
                    )}
                    {blockTasks.map(task => (
                      <div key={task.id} className="group bg-app-card border border-app-border p-2 rounded flex items-center gap-2 hover:border-app-subtext transition-colors">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${task.isCompleted ? 'bg-app-gold border-app-gold' : 'border-app-subtext hover:border-app-text'}`}
                        >
                          {task.isCompleted && <Check size={12} className="text-black font-bold"/>}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs md:text-sm truncate ${task.isCompleted ? 'text-app-subtext line-through' : 'text-app-text'}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                             <Clock size={10} className="text-app-red shrink-0"/>
                             <input 
                                type="time"
                                value={task.time}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => updateTaskTime(task.id, e.target.value)}
                                className="bg-transparent text-xs text-app-subtext w-24 outline-none hover:text-app-text focus:text-app-gold p-0 cursor-pointer"
                             />
                          </div>
                        </div>

                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                          className="text-app-subtext hover:text-app-red transition-colors p-2 md:p-1"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Input */}
                  <div className={`p-2 border-t border-app-border shrink-0 ${isSelected ? 'bg-app-card/50' : ''}`}>
                    <form onSubmit={handleAddTask} className="flex gap-2 items-center">
                      <input 
                        type="text" 
                        placeholder={isSelected ? "Nova tarefa..." : "Editar"}
                        className="flex-1 min-w-0 bg-transparent text-xs text-app-text placeholder-app-subtext outline-none py-2"
                        value={isSelected ? newTaskTitle : ''}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        disabled={!isSelected}
                        onFocus={() => setActiveBlock(block)}
                      />
                       {isSelected && (
                         <div className="flex items-center gap-1 shrink-0">
                            <input 
                                type="time" 
                                value={newTaskTime}
                                onChange={e => handleTimeChange(e, setNewTaskTime)}
                                className="bg-app-card text-[10px] text-app-subtext rounded px-1 border border-app-border outline-none w-16 h-7 text-center"
                            />
                            <button type="submit" className="bg-app-gold/10 hover:bg-app-gold text-app-gold hover:text-black p-1.5 rounded transition-colors">
                                <Plus size={16} />
                            </button>
                         </div>
                       )}
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoutineDetailsModal;
