
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Transaction, User } from '../types';
import { TrendingDown, TrendingUp, DollarSign, PlusCircle, Calendar, Trash2, AlertCircle } from 'lucide-react';
import { format, isSameMonth, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, YAxis } from 'recharts';

interface FinanceManagerProps {
  user: User;
}

const FinanceManager: React.FC<FinanceManagerProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'REGISTER' | 'EXPENSES' | 'GAINS'>('REGISTER');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Register Form State
  const [inputText, setInputText] = useState('');
  const [transactionType, setTransactionType] = useState<'despesa' | 'ganho'>('despesa');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parsedAmount, setParsedAmount] = useState<number | null>(null);

  // --- 1. FETCH DATA ---
  useEffect(() => {
    fetchTransactions();
  }, [user.id]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Erro ao buscar finanças:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. LOGIC: PARSING ---
  const extractAmount = (text: string): number | null => {
    const regex = /(\d+([.,]\d{1,2})?)/g;
    const matches = text.match(regex);

    if (matches && matches.length > 0) {
      let valueStr = matches[0].replace(',', '.');
      const value = parseFloat(valueStr);
      return isNaN(value) ? null : value;
    }
    return null;
  };

  useEffect(() => {
    const amount = extractAmount(inputText);
    setParsedAmount(amount);
  }, [inputText]);

  // --- 3. LOGIC: SAVE ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedAmount || !user.id) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: transactionType,
          amount: parsedAmount,
          description: inputText,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setTransactions([data, ...transactions]);
        setInputText('');
        setActiveTab(transactionType === 'despesa' ? 'EXPENSES' : 'GAINS');
      }
    } catch (error: any) {
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Excluir esta transação?")) return;
    
    try {
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);
            
        if(error) throw error;
        setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
        console.error(err);
    }
  };

  // --- 4. DATA PROCESSING (Current vs Last Month) ---
  const { currentMonthData, lastMonthData } = useMemo(() => {
    const now = new Date();
    const lastMonth = subMonths(now, 1);

    const current = transactions.filter(t => isSameMonth(parseISO(t.created_at), now));
    const last = transactions.filter(t => isSameMonth(parseISO(t.created_at), lastMonth));

    return {
        currentMonthData: {
            expenses: current.filter(t => t.type === 'despesa'),
            gains: current.filter(t => t.type === 'ganho'),
            totalExpenses: current.filter(t => t.type === 'despesa').reduce((acc, curr) => acc + curr.amount, 0),
            totalGains: current.filter(t => t.type === 'ganho').reduce((acc, curr) => acc + curr.amount, 0)
        },
        lastMonthData: {
            totalExpenses: last.filter(t => t.type === 'despesa').reduce((acc, curr) => acc + curr.amount, 0),
            totalGains: last.filter(t => t.type === 'ganho').reduce((acc, curr) => acc + curr.amount, 0)
        }
    };
  }, [transactions]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
      const isExpense = activeTab === 'EXPENSES';
      const currentVal = isExpense ? currentMonthData.totalExpenses : currentMonthData.totalGains;
      const lastVal = isExpense ? lastMonthData.totalExpenses : lastMonthData.totalGains;
      
      return [
          { name: 'Mês Anterior', value: lastVal, color: '#374151' }, // Cinza escuro
          { name: 'Mês Atual', value: currentVal, color: isExpense ? '#E50914' : '#22c55e' } // Vermelho ou Verde
      ];
  }, [activeTab, currentMonthData, lastMonthData]);

  const activeList = activeTab === 'EXPENSES' ? currentMonthData.expenses : currentMonthData.gains;
  const activeTotal = activeTab === 'EXPENSES' ? currentMonthData.totalExpenses : currentMonthData.totalGains;

  // --- RENDER ---
  return (
    <div className="flex flex-col h-full space-y-4">
      
      {/* Compact Header Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-app-input rounded-lg border border-app-border shrink-0">
        <button
          onClick={() => setActiveTab('REGISTER')}
          className={`py-2 text-[10px] md:text-xs font-bold uppercase rounded transition-all ${activeTab === 'REGISTER' ? 'bg-app-card text-app-text shadow-sm border border-app-border' : 'text-app-subtext hover:text-app-text'}`}
        >
          Registrar
        </button>
        <button
          onClick={() => setActiveTab('EXPENSES')}
          className={`py-2 text-[10px] md:text-xs font-bold uppercase rounded transition-all flex items-center justify-center gap-1 ${activeTab === 'EXPENSES' ? 'bg-app-card text-app-red shadow-sm border border-app-red/20' : 'text-app-subtext hover:text-app-red'}`}
        >
          <TrendingDown size={12} /> Despesas
        </button>
        <button
          onClick={() => setActiveTab('GAINS')}
          className={`py-2 text-[10px] md:text-xs font-bold uppercase rounded transition-all flex items-center justify-center gap-1 ${activeTab === 'GAINS' ? 'bg-app-card text-green-500 shadow-sm border border-green-500/20' : 'text-app-subtext hover:text-green-500'}`}
        >
          <TrendingUp size={12} /> Ganhos
        </button>
      </div>

      {/* --- TAB: REGISTRAR --- */}
      {activeTab === 'REGISTER' && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full animate-in fade-in duration-300">
          <div className="w-full bg-app-card border border-app-border p-4 md:p-6 rounded-xl shadow-lg">
            <h2 className="text-sm md:text-lg font-bold text-app-text mb-4 flex items-center gap-2">
              <DollarSign className="text-app-gold w-4 h-4" /> Nova Movimentação
            </h2>

            <form onSubmit={handleRegister} className="space-y-4">
              
              {/* Type Selector Compact */}
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => setTransactionType('despesa')}
                  className={`cursor-pointer border rounded p-3 flex flex-row md:flex-col items-center justify-center gap-2 transition-all ${transactionType === 'despesa' ? 'border-app-red bg-app-red/10' : 'border-app-border bg-app-input opacity-60 hover:opacity-100'}`}
                >
                  <TrendingDown className={`w-4 h-4 md:w-5 md:h-5 ${transactionType === 'despesa' ? 'text-app-red' : 'text-app-subtext'}`} />
                  <span className={`text-[10px] md:text-xs font-bold uppercase ${transactionType === 'despesa' ? 'text-app-red' : 'text-app-subtext'}`}>Despesa</span>
                </div>
                <div 
                  onClick={() => setTransactionType('ganho')}
                  className={`cursor-pointer border rounded p-3 flex flex-row md:flex-col items-center justify-center gap-2 transition-all ${transactionType === 'ganho' ? 'border-green-500 bg-green-500/10' : 'border-app-border bg-app-input opacity-60 hover:opacity-100'}`}
                >
                  <TrendingUp className={`w-4 h-4 md:w-5 md:h-5 ${transactionType === 'ganho' ? 'text-green-500' : 'text-app-subtext'}`} />
                  <span className={`text-[10px] md:text-xs font-bold uppercase ${transactionType === 'ganho' ? 'text-green-500' : 'text-app-subtext'}`}>Ganho</span>
                </div>
              </div>

              {/* Input Area Compact */}
              <div>
                <label className="block text-[10px] text-app-subtext uppercase font-bold mb-1">Descrição e Valor</label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={transactionType === 'despesa' ? "Ex: 50,00 mercado" : "Ex: 200,00 freela"}
                  className="w-full bg-app-input border border-app-border rounded p-3 text-app-text outline-none focus:border-app-gold resize-none h-24 md:h-32 text-sm md:text-base"
                  autoFocus
                />
              </div>

              {/* Detected Amount Preview */}
              <div className="flex items-center justify-between bg-app-bg p-2 md:p-3 rounded border border-app-border">
                <span className="text-[10px] text-app-subtext uppercase font-bold">Valor:</span>
                <span className={`text-lg md:text-xl font-mono font-bold ${parsedAmount ? (transactionType === 'despesa' ? 'text-app-red' : 'text-green-500') : 'text-app-subtext'}`}>
                  {parsedAmount ? `R$ ${parsedAmount.toFixed(2)}` : 'R$ 0,00'}
                </span>
              </div>

              <button 
                type="submit"
                disabled={!parsedAmount || isSubmitting}
                className="w-full bg-app-gold hover:bg-yellow-400 text-black font-bold py-3 md:py-4 rounded uppercase tracking-widest text-xs md:text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? '...' : 'Confirmar'} <PlusCircle size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- TAB: DESPESAS & GANHOS (Charts & Lists) --- */}
      {(activeTab === 'EXPENSES' || activeTab === 'GAINS') && (
        <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full animate-in slide-in-from-right-4 duration-300 gap-4">
          
          {/* Top Section: Chart + Total */}
          <div className="bg-app-card border border-app-border p-3 md:p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
             
             {/* Total Text */}
             <div className="flex-1 w-full flex justify-between md:block items-center">
                <div>
                    <h3 className="text-[10px] md:text-xs text-app-subtext uppercase font-bold mb-1">
                      Total de {activeTab === 'EXPENSES' ? 'Despesas' : 'Ganhos'} (Mês)
                    </h3>
                    <div className={`text-2xl md:text-3xl font-mono font-bold ${activeTab === 'EXPENSES' ? 'text-app-red' : 'text-green-500'}`}>
                       R$ {activeTotal.toFixed(2)}
                    </div>
                </div>
                {/* Mobile Icon */}
                <div className={`md:hidden p-2 rounded-full ${activeTab === 'EXPENSES' ? 'bg-app-red/10 text-app-red' : 'bg-green-500/10 text-green-500'}`}>
                    {activeTab === 'EXPENSES' ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                </div>
             </div>

             {/* Mini Comparison Chart */}
             <div className="w-full md:w-1/2 h-[120px] md:h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <XAxis 
                            dataKey="name" 
                            stroke="#6B7280" 
                            tick={{fontSize: 10, fill: '#6B7280'}} 
                            tickLine={false} 
                            axisLine={false}
                        />
                        <YAxis hide />
                        <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{ backgroundColor: '#151F28', borderColor: '#374151', color: '#fff', fontSize: '12px', padding: '5px' }}
                            formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-2 pb-20 md:pb-8">
             {activeList.length === 0 && (
                <div className="text-center py-8 text-app-subtext flex flex-col items-center">
                   <AlertCircle size={32} className="mb-2 opacity-20" />
                   <p className="text-xs">Nenhum registro encontrado.</p>
                </div>
             )}

             {activeList.map(t => (
               <div key={t.id} className="bg-app-card border border-app-border p-3 rounded flex items-center justify-between group hover:border-app-subtext transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                     <div className={`p-1.5 rounded-full shrink-0 ${t.type === 'despesa' ? 'bg-app-red/10 text-app-red' : 'bg-green-500/10 text-green-500'}`}>
                        {t.type === 'despesa' ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                     </div>
                     <div className="min-w-0">
                        <p className="font-medium text-app-text truncate text-xs md:text-sm">{t.description}</p>
                        <span className="text-[10px] text-app-subtext flex items-center gap-1">
                           <Calendar size={10} /> {format(parseISO(t.created_at), "d MMM, HH:mm", { locale: ptBR })}
                        </span>
                     </div>
                  </div>
                  <div className="flex items-center gap-3 pl-2 shrink-0">
                     <span className={`font-mono font-bold text-xs md:text-sm ${t.type === 'despesa' ? 'text-app-red' : 'text-green-500'}`}>
                        {t.type === 'despesa' ? '- ' : '+ '}R$ {t.amount.toFixed(2)}
                     </span>
                     <button 
                        onClick={() => handleDelete(t.id)}
                        className="text-app-subtext hover:text-app-red md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1"
                        title="Excluir"
                     >
                        <Trash2 size={14} />
                     </button>
                  </div>
               </div>
             ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default FinanceManager;
