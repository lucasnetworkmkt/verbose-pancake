import React from 'react';
import { Routine, Priority, DayLog } from '../types';
import { getPriorityBorderClass, getPriorityColor } from '../constants';
import { Check, Clock, Settings, List, Trash2 } from 'lucide-react';

interface RoutineListProps {
  routines: Routine[];
  currentLog: DayLog | undefined;
  onToggle: (routineId: string) => void;
  onOpenDetails?: (routine: Routine) => void; 
  dateStr: string;
  onDelete?: (routineId: string) => void;
}

const RoutineList: React.FC<RoutineListProps> = ({ routines, currentLog, onToggle, onOpenDetails, dateStr, onDelete }) => {
  const completedIds = currentLog?.completedRoutineIds || [];
  
  // Sort: High Priority First, then completed last
  const sortedRoutines = [...routines].sort((a, b) => {
    const isACompleted = completedIds.includes(a.id);
    const isBCompleted = completedIds.includes(b.id);
    if (isACompleted !== isBCompleted) return isACompleted ? 1 : -1;
    
    const priorityMap = { [Priority.HIGH]: 3, [Priority.MODERATE]: 2, [Priority.LOW]: 1 };
    return priorityMap[b.priority] - priorityMap[a.priority];
  });

  if (routines.length === 0) {
    return (
      <div className="text-center py-10 text-app-subtext">
        <p>Nenhuma rotina definida para hoje.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedRoutines.map(routine => {
        const isCompleted = completedIds.includes(routine.id);
        const borderColor = getPriorityBorderClass(routine.priority);
        const iconColor = getPriorityColor(routine.priority);
        const taskCount = routine.routineTasks?.length || 0;

        return (
          <div 
            key={routine.id}
            className={`
              relative p-4 bg-app-card border-l-4 ${borderColor} 
              transition-all duration-200 flex items-center justify-between
              ${isCompleted ? 'opacity-50' : 'hover:bg-[#1C2834]'}
            `}
          >
            {/* Clickable Area for Toggling Main Routine */}
            <div 
                className="flex items-center gap-3 flex-1 cursor-pointer select-none"
                onClick={() => onToggle(routine.id)}
            >
                <div 
                  className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0
                    ${isCompleted ? '' : 'border-app-subtext'}
                  `}
                  style={{ 
                    backgroundColor: isCompleted ? iconColor : 'transparent', 
                    borderColor: isCompleted ? iconColor : (routine.priority === Priority.LOW ? '#6B7280' : (routine.priority === Priority.MODERATE ? '#FFD700' : '#E50914')) 
                  }}
                >
                  {isCompleted && <Check size={12} className="text-black font-bold" />}
                  {!isCompleted && (
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: iconColor }}></div>
                  )}
                </div>
                
                <div className="min-w-0 pr-2">
                  <h4 className={`font-medium truncate ${isCompleted ? 'text-app-subtext line-through' : 'text-white'}`}>
                    {routine.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-black text-gray-400 border border-gray-800 whitespace-nowrap">
                        {routine.category}
                    </span>
                    {routine.time && (
                      <span className="text-xs text-app-subtext flex items-center gap-1 whitespace-nowrap">
                        <Clock size={10} /> {routine.time}
                      </span>
                    )}
                    {taskCount > 0 && (
                       <span className="text-[10px] text-app-gold flex items-center gap-1 ml-1 whitespace-nowrap">
                           <List size={10} /> {taskCount} passos
                       </span>
                    )}
                  </div>
                </div>
            </div>

            {/* Actions Container - Isolated z-index */}
            <div className="flex items-center gap-1 z-10 shrink-0">
                {/* Delete Button */}
                {onDelete && (
                    <button 
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete(routine.id);
                        }}
                        className="p-2 text-gray-600 hover:text-app-red hover:bg-app-red/10 rounded transition-colors"
                        title="Excluir Rotina"
                    >
                        <Trash2 size={18} />
                    </button>
                )}

                {/* Config Button */}
                {onOpenDetails && (
                    <button 
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onOpenDetails(routine);
                        }}
                        className="p-2 text-gray-600 hover:text-white hover:bg-white/10 rounded transition-colors"
                        title="Detalhes"
                    >
                        <Settings size={18} />
                    </button>
                )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RoutineList;
