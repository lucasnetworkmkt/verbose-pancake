import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DayLog } from '../types';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoryChartProps {
  logs: Record<string, DayLog>;
}

const HistoryChart: React.FC<HistoryChartProps> = ({ logs }) => {
  // Generate last 14 days data
  const data = Array.from({ length: 14 }).map((_, i) => {
    const date = subDays(new Date(), 13 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const log = logs[dateStr];
    
    // Calculate simple completion score (mocked based on valid status for visualization)
    // If valid: 100, if exists but invalid: 40, if empty: 0
    let score = 0;
    let color = '#374151'; // Default grey
    
    if (log) {
      if (log.isValid) {
        score = 100;
        color = '#FFD700';
      } else if (log.completedRoutineIds.length > 0) {
        score = 40;
        color = '#6B7280';
      }
    }

    return {
      day: format(date, 'dd', { locale: ptBR }),
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
            dataKey="day" 
            stroke="#9CA3AF" 
            tick={{ fill: '#9CA3AF', fontSize: 12 }} 
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <Tooltip 
            cursor={{fill: '#151F28', opacity: 0.5}}
            contentStyle={{ backgroundColor: '#151F28', borderColor: '#374151', color: '#fff' }}
            itemStyle={{ color: '#FFD700' }}
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