import React, { useState } from 'react';
import { X, Plus, Trash2, Clock, Check, Sun, Sunset, Moon, Copy, GripVertical } from 'lucide-react';
import { Routine, RoutineTask, TimeBlock, DayOfWeek } from '../types';
import CopyRoutineModal from './CopyRoutineModal';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableTaskProps {
    task: RoutineTask;
    toggleTask: (id: string) => void;
    updateTaskTime: (id: string, time: string) => void;
    updateTaskTitle: (id: string, title: string) => void;
    deleteTask: (id: string) => void;
}

const SortableTask: React.FC<SortableTaskProps> = ({ task, toggleTask, updateTaskTime, updateTaskTitle, deleteTask }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div ref={setNodeRef} style={style} className="group bg-app-card border border-app-border p-2 rounded flex items-start gap-2 hover:border-app-subtext transition-colors">
            <button {...attributes} {...listeners} className="cursor-grab p-1 text-app-subtext hover:text-app-text"><GripVertical size={16} /></button>
            <button 
                onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
                className={`w-4 h-4 md:w-5 md:h-5 rounded border flex items-center justify-center transition-colors shrink-0 mt-0.5 ${task.isCompleted ? 'bg-app-gold border-app-gold' : 'border-app-subtext hover:border-app-text'}`}
            >
                {task.isCompleted && <Check size={10} className="md:w-3 md:h-3 text-black font-bold"/>}
            </button>
            
            <div className="flex-1 min-w-0">
                <input 
                    value={task.title}
                    onChange={(e) => updateTaskTitle(task.id, e.target.value)}
                    className={`bg-transparent w-full text-xs md:text-sm break-words leading-tight ${task.isCompleted ? 'text-app-subtext line-through' : 'text-app-text'} outline-none`}
                />
                <div className="flex items-center gap-2 mt-1.5">
                    <Clock size={10} className="text-app-red shrink-0"/>
                    <input 
                        type="time"
                        value={task.time}
                        onChange={(e) => updateTaskTime(task.id, e.target.value)}
                        className="bg-transparent text-[10px] md:text-xs text-app-subtext w-16 outline-none hover:text-app-text focus:text-app-gold p-0 cursor-pointer"
                    />
                </div>
            </div>

            <button 
                onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                className="text-app-subtext hover:text-app-red transition-colors p-0.5 md:p-1 mt-0.5"
                title="Excluir"
            >
                <Trash2 size={14} className="md:w-4 md:h-4" />
            </button>
        </div>
    );
};

const RoutineDetailsModal: React.FC<RoutineDetailsModalProps> = ({ isOpen, onClose, routine, onUpdateRoutine }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('08:00');
  const [activeBlock, setActiveBlock] = useState<TimeBlock>(TimeBlock.MORNING);
  const [activeDay, setActiveDay] = useState<DayOfWeek>(DayOfWeek.MONDAY);
  const [showCopyModal, setShowCopyModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!isOpen || !routine) return null;

  const handleCopyRoutines = (sourceDay: DayOfWeek, targetDays: DayOfWeek[]) => {
    const tasksToCopy = routine.routineTasks?.[sourceDay] || [];
    
    const updatedRoutine = {
      ...routine,
      routineTasks: {
        ...(routine.routineTasks || {} as Record<DayOfWeek, RoutineTask[]>),
      }
    };

    targetDays.forEach(day => {
        updatedRoutine.routineTasks[day] = [
            ...(updatedRoutine.routineTasks[day] || []),
            ...tasksToCopy.map(task => ({ ...task, id: Math.random().toString(36).substring(2, 9) }))
        ];
    });

    onUpdateRoutine(updatedRoutine);
  };

  const tasks = routine.routineTasks?.[activeDay] || [];

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
      const val = e.target.value;
      setter(val);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

        const newTask: RoutineTask = {
      id: Math.random().toString(36).substring(2, 9),
      title: newTaskTitle,
      time: newTaskTime,
      isCompleted: false,
      block: activeBlock
    };

    const updatedRoutine = {
      ...routine,
      routineTasks: {
        ...(routine.routineTasks || {} as Record<DayOfWeek, RoutineTask[]>),
        [activeDay]: [...tasks, newTask]
      }
    };

    onUpdateRoutine(updatedRoutine);
    setNewTaskTitle('');
  };

  const toggleTask = (taskId: string) => {
    const updatedTasks = tasks.map(t => 
      t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
    );
    onUpdateRoutine({ 
        ...routine, 
        routineTasks: {
            ...(routine.routineTasks || {} as Record<DayOfWeek, RoutineTask[]>),
            [activeDay]: updatedTasks
        }
    });
  };

  const deleteTask = (taskId: string) => {
    if (window.confirm("Excluir esta tarefa da rotina?")) {
        const updatedTasks = tasks.filter(t => t.id !== taskId);
        onUpdateRoutine({ 
            ...routine, 
            routineTasks: {
                ...(routine.routineTasks || {} as Record<DayOfWeek, RoutineTask[]>),
                [activeDay]: updatedTasks
            }
        });
    }
  };

  const updateTaskTime = (taskId: string, newTime: string) => {
    const updatedTasks = tasks.map(t => 
      t.id === taskId ? { ...t, time: newTime } : t
    );
    onUpdateRoutine({ 
        ...routine, 
        routineTasks: {
            ...(routine.routineTasks || {} as Record<DayOfWeek, RoutineTask[]>),
            [activeDay]: updatedTasks
        }
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
        const oldIndex = tasks.findIndex(t => t.id === active.id);
        const newIndex = tasks.findIndex(t => t.id === over.id);
        const newTasks = arrayMove(tasks, oldIndex, newIndex);
        onUpdateRoutine({
            ...routine,
            routineTasks: {
                ...(routine.routineTasks || {} as Record<DayOfWeek, RoutineTask[]>),
                [activeDay]: newTasks
            }
        });
    }
  };

  const updateTaskTitle = (taskId: string, newTitle: string) => {
    const updatedTasks = tasks.map(t => 
        t.id === taskId ? { ...t, title: newTitle } : t
    );
    onUpdateRoutine({ 
        ...routine, 
        routineTasks: {
            ...(routine.routineTasks || {} as Record<DayOfWeek, RoutineTask[]>),
            [activeDay]: updatedTasks
        }
    });
  };

  const getBlockIcon = (block: TimeBlock) => {
    switch (block) {
      case TimeBlock.MORNING: return <Sun size={16} className="text-app-gold" />;
      case TimeBlock.AFTERNOON: return <Sunset size={16} className="text-orange-500" />;
      case TimeBlock.NIGHT: return <Moon size={16} className="text-blue-400" />;
    }
  };

  const dayLabels: Record<DayOfWeek, string> = {
      [DayOfWeek.MONDAY]: 'Seg',
      [DayOfWeek.TUESDAY]: 'Ter',
      [DayOfWeek.WEDNESDAY]: 'Qua',
      [DayOfWeek.THURSDAY]: 'Qui',
      [DayOfWeek.FRIDAY]: 'Sex',
      [DayOfWeek.SATURDAY]: 'Sáb',
      [DayOfWeek.SUNDAY]: 'Dom',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4">
      <div className="w-full h-full md:h-[95vh] md:max-w-6xl bg-app-card border border-app-border rounded-none md:rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start p-4 md:p-6 border-b border-app-border shrink-0 bg-app-card z-10 rounded-t-none md:rounded-t-xl">
          <div className="min-w-0 pr-2">
            <h2 className="text-base md:text-2xl font-bold text-app-text uppercase tracking-wider break-words leading-tight">{routine.title}</h2>
            <p className="text-app-subtext text-[10px] md:text-sm truncate">Microtarefas e Execução Detalhada</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCopyModal(true)} className="text-app-subtext hover:text-app-gold transition-colors p-1 shrink-0" title="Copiar rotina para outros dias">
                <Copy size={20} className="md:w-6 md:h-6" />
            </button>
            <button onClick={onClose} className="text-app-subtext hover:text-app-text transition-colors p-1 shrink-0">
                <X size={20} className="md:w-6 md:h-6" />
            </button>
          </div>
        </div>

        {showCopyModal && (
            <CopyRoutineModal 
                routines={[routine]} 
                onClose={() => setShowCopyModal(false)} 
                onCopy={(sourceDay, targetDays) => {
                    handleCopyRoutines(sourceDay, targetDays);
                    setShowCopyModal(false);
                }} 
            />
        )}

        {/* Day Selector */}
        <div className="flex border-b border-app-border p-2 gap-1 overflow-x-auto">
            {Object.values(DayOfWeek).map(day => (
                <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${activeDay === day ? 'bg-app-gold text-black font-bold' : 'bg-app-input text-app-subtext hover:text-app-text'}`}
                >
                    {dayLabels[day]}
                </button>
            ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6 scrollbar-thin touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 pb-20 md:pb-0">
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
                  <div className="p-2 md:p-3 border-b border-app-border flex items-center gap-2 md:gap-3 bg-app-card/30 shrink-0">
                    {getBlockIcon(block)}
                    <h3 className="font-bold text-xs md:text-sm uppercase text-app-text">{block}</h3>
                    <span className="ml-auto text-[10px] md:text-xs bg-app-card border border-app-border px-2 py-0.5 rounded text-app-subtext">
                      {blockTasks.length}
                    </span>
                  </div>

                  {/* Tasks List */}
                  <div className={`flex-1 p-2 space-y-2 ${isSelected ? 'min-h-[100px]' : 'min-h-[60px]'} md:overflow-y-auto md:max-h-[300px] md:scrollbar-thin`}>
                    {blockTasks.length === 0 && (
                      <div className="flex flex-col items-center justify-center text-app-subtext text-[10px] md:text-xs italic py-4">
                        Sem tarefas
                      </div>
                    )}
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={blockTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                            {blockTasks.map(task => (
                                <SortableTask 
                                    key={task.id} 
                                    task={task} 
                                    toggleTask={toggleTask} 
                                    updateTaskTime={updateTaskTime} 
                                    updateTaskTitle={updateTaskTitle}
                                    deleteTask={deleteTask}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
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
                                className="bg-app-card text-[10px] text-app-subtext rounded px-1 border border-app-border outline-none w-12 md:w-14 h-6 md:h-7 text-center"
                            />
                            <button type="submit" className="bg-app-gold/10 hover:bg-app-gold text-app-gold hover:text-black p-1 md:p-1.5 rounded transition-colors">
                                <Plus size={14} className="md:w-4 md:h-4" />
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
