import React, { useState, useEffect } from 'react';
import { Search, Plus, Download, Tag, AlertCircle, ChevronDown, PieChart, TrendingUp, TrendingDown, Target, Trash2 } from 'lucide-react';
import CategoryModal from './CategoryModal';

const Transactions = ({ currency, rate, onAddClick, externalTransactions, categories, onDeleteTransaction }) => {
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('All');
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);

    const symbol = currency === 'PKR' ? 'Rs.' : '$';
    const convert = (val) => currency === 'PKR' ? val * rate : val;

    useEffect(() => {
        let result = [...(externalTransactions || [])];
        if (search.trim()) {
            result = result.filter(t => t.name.toLowerCase().includes(search.toLowerCase().trim()));
        }
        if (activeTab === 'Income') {
            result = result.filter(t => (t.amount || 0) > 0);
        } else if (activeTab === 'Expense') {
            result = result.filter(t => (t.amount || 0) < 0);
        } else if (activeTab !== 'All') {
            result = result.filter(t => t.category === activeTab);
        }
        result.sort((a, b) => new Date(b.date) - new Date(a.date));
        setFilteredTransactions(result);
    }, [search, activeTab, externalTransactions]);

    const downloadCSV = () => {
        if (filteredTransactions.length === 0) return;
        const headers = ['Name', 'Date', 'Category', `Amount (${currency})`].join(',');
        const rows = filteredTransactions.map(t => {
            const displayAmount = convert(t.amount || 0).toFixed(2);
            return [`"${t.name}"`, t.date, `"${t.category}"`, (t.amount || 0) > 0 ? `+${displayAmount}` : displayAmount].join(',');
        });
        const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `FinTracker_Report_Realtime_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const [confirming, setConfirming] = useState(null);

    const handleDelete = (t) => {
        if (confirming === t.id) {
            onDeleteTransaction(t);
            setConfirming(null);
        } else {
            setConfirming(t.id);
            setTimeout(() => setConfirming(null), 3000);
        }
    };

    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-3xl font-black text-navy-primary tracking-tighter uppercase leading-none">Fiscal Ledger</h2>
                    <p className="text-gray-400 mt-2 font-medium italic">Synchronizing {externalTransactions?.length || 0} cloud documents globally.</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={downloadCSV}
                        disabled={filteredTransactions.length === 0}
                        className="flex items-center gap-3 px-6 py-4 bg-white border border-[#e5e7eb] text-navy-primary rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:border-navy-primary transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        <Download size={18} />
                        <span>Export CSV</span>
                    </button>
                    <button
                        onClick={onAddClick}
                        className="flex items-center gap-3 px-8 py-4 bg-[#1a1f2e] text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-navy-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <Plus size={20} />
                        <span>New Entry</span>
                    </button>
                </div>
            </header>

            <div className="flex flex-col md:flex-row gap-6 mb-10 items-center justify-between">
                <div className="relative w-full md:w-[32rem] group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-navy-primary/20 group-focus-within:text-navy-primary transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Scan ledger for keywords..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-16 pr-6 py-5 bg-white border border-[#e5e7eb] rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-navy-primary/5 focus:border-navy-primary transition-all text-navy-primary font-black uppercase text-xs tracking-widest shadow-sm"
                    />
                </div>

                <div className="relative w-full md:w-80">
                    <select
                        value={activeTab}
                        onChange={(e) => setActiveTab(e.target.value)}
                        className="w-full pl-6 pr-12 py-5 bg-white border border-[#e5e7eb] rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-navy-primary/5 focus:border-navy-primary appearance-none transition-all text-navy-primary font-black text-xs tracking-widest shadow-sm cursor-pointer uppercase"
                    >
                        <option value="All">Global Filter</option>
                        <optgroup label="Core Flows">
                            <option value="Income">Internal Credits</option>
                            <option value="Expense">External Debits</option>
                        </optgroup>
                        <optgroup label="Cloud Segments">
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                        </optgroup>
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-navy-primary/40 group-hover:text-navy-primary transition-colors">
                        <ChevronDown size={20} strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[3.5rem] shadow-sm border border-[#e5e7eb] overflow-hidden">
                {filteredTransactions.length > 0 ? (
                    <div className="overflow-x-auto text-left">
                        <table className="w-full min-w-[800px]">
                            <thead>
                                <tr className="bg-gray-50/30 border-b border-[#e5e7eb]">
                                    <th className="px-10 py-7 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Operational Source</th>
                                    <th className="px-10 py-7 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Effective Date</th>
                                    <th className="px-10 py-7 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Segment</th>
                                    <th className="px-10 py-7 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Flow Amount</th>
                                    <th className="px-10 py-7 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredTransactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50/50 transition-all group">
                                        <td className="px-12 py-7">
                                            <div className="flex items-center gap-5">
                                                <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-white group-hover:shadow-lg transition-all text-navy-primary border border-transparent group-hover:border-gray-100">
                                                    {(t.amount || 0) > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                                </div>
                                                <div className="flex flex-col min-w-[200px]">
                                                    <span className="font-black text-navy-primary text-sm uppercase tracking-tight truncate">{t.name}</span>
                                                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1 italic">{t.paymentSource || 'General Pool'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-12 py-7 text-xs font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{t.date}</td>
                                        <td className="px-12 py-7">
                                            <span className="px-5 py-2.5 bg-navy-primary/5 text-navy-primary text-[9px] font-black rounded-xl uppercase tracking-widest border border-navy-primary/10 whitespace-nowrap">
                                                {t.category}
                                            </span>
                                        </td>
                                        <td className={`px-12 py-7 text-right font-black tracking-tighter text-2xl whitespace-nowrap ${(t.amount || 0) > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {(t.amount || 0) > 0 ? '+' : ''}{symbol}{Math.abs(convert(t.amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                        </td>
                                        <td className="px-10 py-7 text-center">
                                            <button
                                                onClick={() => handleDelete(t)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${confirming === t.id
                                                    ? 'bg-rose-500 text-white shadow-lg animate-pulse scale-105'
                                                    : 'text-rose-200 hover:text-rose-500 bg-transparent hover:bg-rose-50'}`}
                                            >
                                                {confirming === t.id && <span className="text-[9px] font-black uppercase leading-none">Confirm?</span>}
                                                <Trash2 size={confirming === t.id ? 14 : 18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-32 flex flex-col items-center justify-center text-center px-10">
                        <div className="w-28 h-28 bg-navy-primary/5 rounded-full flex items-center justify-center mb-8 animate-pulse">
                            <AlertCircle size={56} className="text-navy-primary/20" />
                        </div>
                        <h3 className="text-3xl font-black text-navy-primary uppercase tracking-[0.2em] mb-3">No Cloud Entities Found</h3>
                        <p className="text-gray-400 font-medium max-w-sm leading-relaxed italic">The ledger is currently blank for this filter combination. Check your global sync status or adjust criteria.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Transactions;
