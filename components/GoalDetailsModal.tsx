import React, { useState } from 'react';
import { X, Check, Clock, Trash2, ListTodo } from 'lucide-react';
import { Goal } from '../types';
import { getPriorityBorderClass, getPriorityColor } from '../constants';

interface GoalDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  onUpdateGoal: (updatedGoal: Goal) => void;
  readOnly?: boolean;
}

const GoalDetailsModal: React.FC<GoalDetailsModalProps> = ({ isOpen, onClose, goal, onUpdateGoal, readOnly }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');

  if (!isOpen || !goal) return null;

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask = {
      id: Math.random().toString(36).substring(2, 9),
      title: newTaskTitle,
      isCompleted: false,
      time: '00:00', // Time is no longer relevant for goals, but we keep it for type compatibility
    };

    onUpdateGoal({
      ...goal,
      tasks: [...goal.tasks, newTask]
    });
    setNewTaskTitle('');
  };

  const toggleTask = (taskId: string) => {
    const updatedTasks = goal.tasks.map(t => 
      t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
    );
    onUpdateGoal({ 
        ...goal, 
        tasks: updatedTasks 
    });
  };

  const deleteTask = (taskId: string) => {
    onUpdateGoal({
      ...goal,
      tasks: goal.tasks.filter(t => t.id !== taskId)
    });
  };

  const borderColor = getPriorityBorderClass(goal.priority);
  const progress = goal.tasks.length > 0 ? Math.round((goal.tasks.filter(t => t.isCompleted).length / goal.tasks.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-app-bg items-center">
      <div className="w-full h-full max-w-[1920px] bg-app-bg flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-app-border shrink-0 bg-app-card z-10 w-full">
          <div className="min-w-0 pr-2">
            <h2 className="text-base md:text-2xl font-bold text-app-text uppercase tracking-wider break-words leading-tight">{goal.title}</h2>
          </div>
          <button onClick={onClose} className="text-app-subtext hover:text-app-text transition-colors p-1 shrink-0">
            <X size={20} className="md:w-6 md:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-32 w-full">
            <div className="max-w-2xl mx-auto w-full space-y-6">
                
                {/* Meta Information */}
                <div className={`bg-app-card border-l-4 ${borderColor} border-y border-r border-app-border p-4 rounded shadow-sm`}>
                    <div className="flex flex-col gap-2">
                        <p className="text-app-subtext text-xs md:text-sm break-words">{goal.description}</p>
                        <div className="flex flex-wrap items-center gap-4 mt-2">
                            <span className="bg-app-input px-2 py-1 text-[10px] md:text-xs rounded text-app-text border border-app-border uppercase tracking-wider">{goal.category}</span>
                            <span className="text-[10px] md:text-xs text-app-red font-bold flex items-center gap-1"><Clock size={12}/> {goal.deadline}</span>
                            <span className="text-[10px] md:text-xs flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: getPriorityColor(goal.priority)}}></div>
                                {goal.priority === 'HIGH' ? 'ALTA' : (goal.priority === 'MODERATE' ? 'MODERADA' : 'BAIXA')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Progress */}
                <div className="bg-app-card p-4 rounded border border-app-border">
                    <div className="flex justify-between text-[10px] md:text-xs uppercase text-app-subtext mb-2 font-bold">
                        <span>Progresso da Meta</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-app-input h-2 rounded-full border border-app-border overflow-hidden">
                        <div className="bg-app-gold h-full transition-all duration-500" style={{ width: `${progress}%`}}></div>
                    </div>
                </div>

                {/* Tasks List */}
                <div className="bg-app-card rounded border border-app-border overflow-hidden flex flex-col">
                    <div className="p-3 md:p-4 bg-app-input border-b border-app-border flex justify-between items-center shrink-0">
                        <h3 className="text-xs md:text-sm font-bold text-app-text uppercase flex items-center gap-2"><ListTodo size={16} className="text-app-gold"/> Micro Tarefas</h3>
                    </div>

                    <div className="p-2 flex flex-col gap-2 min-h-[100px]">
                        {goal.tasks.length === 0 && <p className="text-app-subtext text-xs italic text-center py-4">Nenhuma micro tarefa definida.</p>}
                        {goal.tasks.map(task => (
                            <div key={task.id} className="group bg-app-bg border border-app-border p-3 rounded flex items-center gap-3 hover:border-app-subtext transition-colors">
                                <button 
                                    onClick={() => toggleTask(task.id)}
                                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${task.isCompleted ? 'bg-app-gold border-app-gold' : 'border-app-subtext hover:border-app-text'}`}
                                >
                                    {task.isCompleted && <Check size={12} className="text-black font-bold"/>}
                                </button>
                                <span className={`flex-1 text-sm break-words leading-tight ${task.isCompleted ? 'text-app-subtext line-through' : 'text-app-text'}`}>
                                    {task.title}
                                </span>
                                {!readOnly && (
                                    <button 
                                        onClick={() => deleteTask(task.id)}
                                        className="text-app-subtext hover:text-app-red transition-colors p-1"
                                        title="Excluir"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {!readOnly && (
                        <div className="p-3 border-t border-app-border bg-app-input mt-auto">
                            <form onSubmit={handleAddTask} className="flex gap-2 items-center">
                                <input 
                                    type="text" 
                                    placeholder="Adicionar nova micro tarefa..."
                                    className="flex-1 min-w-0 bg-app-bg border border-app-border text-sm text-app-text placeholder-app-subtext outline-none p-2 rounded focus:border-app-gold"
                                    value={newTaskTitle}
                                    onChange={e => setNewTaskTitle(e.target.value)}
                                />
                                <button type="submit" className="bg-app-gold hover:bg-yellow-600 text-black px-4 py-2 rounded text-sm font-bold uppercase transition-colors whitespace-nowrap">
                                    Adicionar
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default GoalDetailsModal;
