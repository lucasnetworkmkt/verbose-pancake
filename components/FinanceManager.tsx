
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Transaction, User } from '../types';
import { TrendingDown, TrendingUp, DollarSign, PlusCircle, Calendar, Trash2, AlertCircle } from 'lucide-react';
import { format, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  // Extrai número da string. Ex: "gastei 50 no mercado" -> 50.00
  const extractAmount = (text: string): number | null => {
    // Regex para capturar números:
    // Aceita: 100 | 100.50 | 100,50
    // Ignora símbolos de moeda se estiverem soltos, mas foca no valor numérico
    const regex = /(\d+([.,]\d{1,2})?)/g;
    const matches = text.match(regex);

    if (matches && matches.length > 0) {
      // Pega o primeiro número encontrado que pareça um valor
      // Substitui vírgula por ponto para float
      let valueStr = matches[0].replace(',', '.');
      const value = parseFloat(valueStr);
      return isNaN(value) ? null : value;
    }
    return null;
  };

  // Live preview of parsing
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
          description: inputText, // Salva o texto original para contexto
        })
        .select()
        .single();

      if (error) throw error;

      // Optimistic update
      if (data) {
        setTransactions([data, ...transactions]);
        setInputText('');
        // Auto-switch tab based on type to show feedback
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

  // --- 4. DATA PROCESSING (Month Filter) ---
  const currentMonthTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => isSameMonth(parseISO(t.created_at), now));
  }, [transactions]);

  const expensesList = currentMonthTransactions.filter(t => t.type === 'despesa');
  const gainsList = currentMonthTransactions.filter(t => t.type === 'ganho');

  const totalExpenses = expensesList.reduce((acc, curr) => acc + curr.amount, 0);
  const totalGains = gainsList.reduce((acc, curr) => acc + curr.amount, 0);

  // --- RENDER ---
  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Header Tabs */}
      <div className="grid grid-cols-3 gap-2 p-1 bg-app-input rounded-lg border border-app-border">
        <button
          onClick={() => setActiveTab('REGISTER')}
          className={`py-2 text-xs md:text-sm font-bold uppercase rounded transition-all ${activeTab === 'REGISTER' ? 'bg-app-card text-app-text shadow-sm border border-app-border' : 'text-app-subtext hover:text-app-text'}`}
        >
          Registrar
        </button>
        <button
          onClick={() => setActiveTab('EXPENSES')}
          className={`py-2 text-xs md:text-sm font-bold uppercase rounded transition-all flex items-center justify-center gap-2 ${activeTab === 'EXPENSES' ? 'bg-app-card text-app-red shadow-sm border border-app-red/20' : 'text-app-subtext hover:text-app-red'}`}
        >
          <TrendingDown size={14} /> Despesas
        </button>
        <button
          onClick={() => setActiveTab('GAINS')}
          className={`py-2 text-xs md:text-sm font-bold uppercase rounded transition-all flex items-center justify-center gap-2 ${activeTab === 'GAINS' ? 'bg-app-card text-green-500 shadow-sm border border-green-500/20' : 'text-app-subtext hover:text-green-500'}`}
        >
          <TrendingUp size={14} /> Ganhos
        </button>
      </div>

      {/* --- TAB: REGISTRAR --- */}
      {activeTab === 'REGISTER' && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full animate-in fade-in duration-300">
          <div className="w-full bg-app-card border border-app-border p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold text-app-text mb-6 flex items-center gap-2">
              <DollarSign className="text-app-gold" /> Nova Movimentação
            </h2>

            <form onSubmit={handleRegister} className="space-y-6">
              
              {/* Type Selector */}
              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => setTransactionType('despesa')}
                  className={`cursor-pointer border-2 rounded-lg p-4 flex flex-col items-center gap-2 transition-all ${transactionType === 'despesa' ? 'border-app-red bg-app-red/10' : 'border-app-border bg-app-input opacity-60 hover:opacity-100'}`}
                >
                  <TrendingDown className={transactionType === 'despesa' ? 'text-app-red' : 'text-app-subtext'} />
                  <span className={`text-xs font-bold uppercase ${transactionType === 'despesa' ? 'text-app-red' : 'text-app-subtext'}`}>Despesa</span>
                </div>
                <div 
                  onClick={() => setTransactionType('ganho')}
                  className={`cursor-pointer border-2 rounded-lg p-4 flex flex-col items-center gap-2 transition-all ${transactionType === 'ganho' ? 'border-green-500 bg-green-500/10' : 'border-app-border bg-app-input opacity-60 hover:opacity-100'}`}
                >
                  <TrendingUp className={transactionType === 'ganho' ? 'text-green-500' : 'text-app-subtext'} />
                  <span className={`text-xs font-bold uppercase ${transactionType === 'ganho' ? 'text-green-500' : 'text-app-subtext'}`}>Ganho</span>
                </div>
              </div>

              {/* Input Area */}
              <div>
                <label className="block text-xs text-app-subtext uppercase font-bold mb-2">Descrição (inclua o valor)</label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={transactionType === 'despesa' ? "Ex: 50,00 mercado semanal" : "Ex: Recebi 200,00 do freela"}
                  className="w-full bg-app-input border border-app-border rounded-lg p-4 text-app-text outline-none focus:border-app-gold resize-none h-32 text-lg"
                  autoFocus
                />
              </div>

              {/* Detected Amount Preview */}
              <div className="flex items-center justify-between bg-app-bg p-3 rounded border border-app-border">
                <span className="text-xs text-app-subtext uppercase font-bold">Valor Identificado:</span>
                <span className={`text-xl font-mono font-bold ${parsedAmount ? (transactionType === 'despesa' ? 'text-app-red' : 'text-green-500') : 'text-app-subtext'}`}>
                  {parsedAmount ? `R$ ${parsedAmount.toFixed(2)}` : 'R$ 0,00'}
                </span>
              </div>

              <button 
                type="submit"
                disabled={!parsedAmount || isSubmitting}
                className="w-full bg-app-gold hover:bg-yellow-400 text-black font-bold py-4 rounded uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Salvando...' : 'Confirmar Registro'} <PlusCircle size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- TAB: DESPESAS & GANHOS (Lists) --- */}
      {(activeTab === 'EXPENSES' || activeTab === 'GAINS') && (
        <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full animate-in slide-in-from-right-4 duration-300">
          
          {/* Summary Card */}
          <div className="bg-app-card border border-app-border p-6 rounded-xl mb-6 shadow-sm flex items-center justify-between">
             <div>
                <h3 className="text-xs text-app-subtext uppercase font-bold mb-1">
                  Total de {activeTab === 'EXPENSES' ? 'Despesas' : 'Ganhos'} (Este Mês)
                </h3>
                <div className={`text-3xl md:text-4xl font-mono font-bold ${activeTab === 'EXPENSES' ? 'text-app-red' : 'text-green-500'}`}>
                   R$ {(activeTab === 'EXPENSES' ? totalExpenses : totalGains).toFixed(2)}
                </div>
             </div>
             <div className={`p-4 rounded-full ${activeTab === 'EXPENSES' ? 'bg-app-red/10 text-app-red' : 'bg-green-500/10 text-green-500'}`}>
                {activeTab === 'EXPENSES' ? <TrendingDown size={32} /> : <TrendingUp size={32} />}
             </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-3 pb-8">
             {(activeTab === 'EXPENSES' ? expensesList : gainsList).length === 0 && (
                <div className="text-center py-12 text-app-subtext flex flex-col items-center">
                   <AlertCircle size={48} className="mb-4 opacity-20" />
                   <p className="text-sm">Nenhum registro encontrado neste mês.</p>
                </div>
             )}

             {(activeTab === 'EXPENSES' ? expensesList : gainsList).map(t => (
               <div key={t.id} className="bg-app-card border border-app-border p-4 rounded-lg flex items-center justify-between group hover:border-app-subtext transition-colors">
                  <div className="flex items-center gap-4 overflow-hidden">
                     <div className={`p-2 rounded-full shrink-0 ${t.type === 'despesa' ? 'bg-app-red/10 text-app-red' : 'bg-green-500/10 text-green-500'}`}>
                        {t.type === 'despesa' ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                     </div>
                     <div className="min-w-0">
                        <p className="font-medium text-app-text truncate text-sm md:text-base">{t.description}</p>
                        <span className="text-[10px] md:text-xs text-app-subtext flex items-center gap-1">
                           <Calendar size={10} /> {format(parseISO(t.created_at), "d 'de' MMM, HH:mm", { locale: ptBR })}
                        </span>
                     </div>
                  </div>
                  <div className="flex items-center gap-4 pl-2 shrink-0">
                     <span className={`font-mono font-bold text-sm md:text-base ${t.type === 'despesa' ? 'text-app-red' : 'text-green-500'}`}>
                        {t.type === 'despesa' ? '- ' : '+ '}R$ {t.amount.toFixed(2)}
                     </span>
                     <button 
                        onClick={() => handleDelete(t.id)}
                        className="text-app-subtext hover:text-app-red opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        title="Excluir registro"
                     >
                        <Trash2 size={16} />
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
