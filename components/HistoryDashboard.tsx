import React, { useMemo } from 'react';
import { format, subDays, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell } from 'recharts';
import { DayLog, Routine, Category } from '../types';
import { Target, Flame } from 'lucide-react';
import HistoryChart from './HistoryChart';

interface HistoryDashboardProps {
  logs: Record<string, DayLog>;
  routines: Routine[];
}

const HistoryDashboard: React.FC<HistoryDashboardProps> = ({ logs, routines }) => {
  
  // 1. Streak Calculation
  const { currentStreak, bestStreak, streakHistory } = useMemo(() => {
    const today = new Date();
    let current = 0;
    let best = 0;
    let tempStreak = 0;
    const history = [];

    // Last 7 days for visual streak
    for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const log = logs[dateStr];
        const isValid = log?.isValid || false;
        history.push({ day: format(date, 'dd', { locale: ptBR }), isValid });
    }

    // Full history for best streak
    const sortedDates = Object.keys(logs).sort();
    for (const dateStr of sortedDates) {
        if (logs[dateStr].isValid) {
            tempStreak++;
            if (tempStreak > best) best = tempStreak;
        } else {
            tempStreak = 0;
        }
    }

    // Current streak
    for (let i = 0; i < 365; i++) {
        const date = subDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const log = logs[dateStr];
        if (i === 0 && (!log || !log.isValid)) continue;
        if (log && log.isValid) current++;
        else break;
    }

    return { currentStreak: current, bestStreak: best, streakHistory: history };
  }, [logs]);

  // 2. Weekly Evolution
  const weeklyData = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const end = endOfWeek(today, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const log = logs[dateStr];
        
        const totalRoutines = routines.length;
        const completed = log ? log.completedRoutineIds.length : 0;
        const percentage = totalRoutines > 0 ? Math.round((completed / totalRoutines) * 100) : 0;

        return {
            name: format(day, 'EEEE', { locale: ptBR }).substring(0, 3),
            percentage,
            completed
        };
    });
  }, [logs, routines]);

  // 3. Radar Chart (Life Areas)
  const radarData = useMemo(() => {
    const areas = Object.values(Category);
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const last7Days = eachDayOfInterval({
        start: subDays(today, 7),
        end: subDays(today, 1)
    });

    return areas.map(area => {
        const areaRoutines = routines.filter(r => r.category === area);
        const totalRoutinesInArea = areaRoutines.length;
        if (totalRoutinesInArea === 0) return { area, today: 0, lastWeek: 0, diff: 0 };

        // Today's progress
        const todayLog = logs[todayStr];
        const completedToday = todayLog ? areaRoutines.filter(r => todayLog.completedRoutineIds.includes(r.id)).length : 0;
        const todayPercentage = Math.round((completedToday / totalRoutinesInArea) * 100);

        // Last week's average
        const lastWeekPercentages = last7Days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const log = logs[dateStr];
            const completed = log ? areaRoutines.filter(r => log.completedRoutineIds.includes(r.id)).length : 0;
            return (completed / totalRoutinesInArea) * 100;
        });
        const lastWeekAverage = Math.round(lastWeekPercentages.reduce((a, b) => a + b, 0) / 7);

        return {
            area,
            today: todayPercentage,
            lastWeek: lastWeekAverage,
            diff: todayPercentage - lastWeekAverage
        };
    });
  }, [logs, routines]);

  return (
    <div className="space-y-6">
        {/* 1. History Chart */}
        <div className="bg-app-card p-4 md:p-6 rounded border border-app-border shadow-sm">
            <h3 className="text-xs md:text-sm uppercase text-app-subtext mb-4">Consistência (Últimos 14 dias)</h3>
            <HistoryChart logs={logs} totalRoutines={routines.length} />
        </div>

        {/* 2. Streak Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-app-card p-6 rounded border border-app-border shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                    <Flame className="text-app-red" size={32} />
                    <div>
                        <div className="text-2xl font-bold">{currentStreak}</div>
                        <div className="text-xs text-app-subtext uppercase">Sequência Atual</div>
                    </div>
                    <Target className="text-app-gold ml-auto" size={32} />
                    <div>
                        <div className="text-2xl font-bold">{bestStreak}</div>
                        <div className="text-xs text-app-subtext uppercase">Melhor Sequência</div>
                    </div>
                </div>
                <div className="flex gap-2">
                    {streakHistory.map((h, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                            <div className={`w-6 h-6 rounded ${h.isValid ? 'bg-app-gold' : 'bg-app-border'}`} />
                            <span className="text-[10px] text-app-subtext">{h.day}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. Radar Chart */}
            <div className="bg-app-card p-4 rounded border border-app-border shadow-sm">
                <h3 className="text-xs md:text-sm uppercase text-app-subtext mb-4">Progresso por Área</h3>
                <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={250}>
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <PolarGrid stroke="#374151" />
                            <PolarAngleAxis dataKey="area" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar name="Hoje" dataKey="today" stroke="#FFD700" fill="#FFD700" fillOpacity={0.5} />
                            <Radar name="Semana Passada" dataKey="lastWeek" stroke="#9CA3AF" fill="#9CA3AF" fillOpacity={0.3} />
                        </RadarChart>
                    </ResponsiveContainer>
                    <div className="text-xs text-app-subtext w-full mt-4 space-y-2">
                        <div className="grid grid-cols-4 font-bold text-app-text border-b border-app-border pb-2">
                            <span className="col-span-1">Área</span>
                            <span className="text-center">Hoje</span>
                            <span className="text-center">Sem.</span>
                            <span className="text-center">Dif.</span>
                        </div>
                        {radarData.map(d => (
                            <div key={d.area} className="grid grid-cols-4 py-1 border-b border-app-border/50 last:border-0">
                                <span className="col-span-1 truncate">{d.area}</span>
                                <span className="text-center">{d.today}%</span>
                                <span className="text-center">{d.lastWeek}%</span>
                                <span className={`text-center font-bold ${d.diff >= 0 ? 'text-green-500' : 'text-app-red'}`}>
                                    {d.diff > 0 ? '+' : ''}{d.diff}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* 3. Weekly Evolution */}
        <div className="bg-app-card p-6 rounded border border-app-border shadow-sm">
            <h3 className="text-sm uppercase text-app-subtext mb-4">Evolução Semanal</h3>
            <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData}>
                    <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#151F28', borderColor: '#374151', color: '#fff' }}
                        formatter={(value: number) => [`${value}%`, 'Consistência']}
                    />
                    <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                        {weeklyData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.percentage > 70 ? '#FFD700' : '#E50914'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};

export default HistoryDashboard;
