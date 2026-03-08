import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DayLog } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoryChartProps {
  logs: Record<string, DayLog>;
  totalRoutines: number;
}

const HistoryChart: React.FC<HistoryChartProps> = ({ logs, totalRoutines }) => {
  // Generate last 14 days data
  const data = Array.from({ length: 14 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const log = logs[dateStr];
    
    let score = 0;
    let color = '#374151'; // Default grey
    
    if (log && totalRoutines > 0) {
      score = Math.round((log.completedRoutineIds.length / totalRoutines) * 100);
      if (score > 100) score = 100;
      
      if (log.isValid) {
        color = '#FFD700'; // Gold for valid days
      } else if (score > 0) {
        color = '#6B7280'; // Grey for partially completed
      }
    }

    return {
      name: format(date, 'dd', { locale: ptBR }),
      score,
      color,
      date: dateStr
    };
  });

  return (
    <div className="w-full mt-4" style={{ height: 300, minHeight: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
          <XAxis 
            dataKey="name" 
            stroke="#9CA3AF" 
            tick={{ fill: '#9CA3AF', fontSize: 10 }} 
            tickLine={false}
            axisLine={false}
            interval={1}
          />
          <Tooltip 
            cursor={{fill: '#151F28', opacity: 0.5}}
            contentStyle={{ backgroundColor: '#151F28', borderColor: '#374151', color: '#fff' }}
            itemStyle={{ color: '#FFD700' }}
            formatter={(value: number) => [`${value}%`, 'Consistência']}
            labelFormatter={(label) => `Dia ${label}`}
          />
          <Bar dataKey="score" radius={[2, 2, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HistoryChart;
