import React, { useState } from 'react';
import { PieChart, Target, Plus, Search, Trash2, AlertCircle } from 'lucide-react';
import CategoryModal from './CategoryModal';
import { db } from '../firebase';
import { doc, deleteDoc } from 'firebase/firestore';

const BudgetSegments = ({ currency, rate, externalTransactions, categories }) => {
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [confirming, setConfirming] = useState(null);

    const symbol = currency === 'PKR' ? 'Rs.' : '$';
    const convert = (val) => currency === 'PKR' ? val * rate : val;

    const calculateCategoryStats = () => {
        const currentMonth = new Date().toISOString().split('-').slice(0, 2).join('-');
        const stats = categories.map(cat => {
            const spent = externalTransactions
                .filter(t => t.category === cat.name && t.date.startsWith(currentMonth) && (t.amount || 0) < 0)
                .reduce((acc, curr) => acc + Math.abs(curr.amount || 0), 0);

            return {
                ...cat,
                spent,
                percent: cat.monthlyLimit > 0 ? Math.round((spent / cat.monthlyLimit) * 100) : 0
            };
        });
        return stats.filter(s => s.type === 'Expense');
    };

    let categoryStats = calculateCategoryStats();

    if (search.trim()) {
        categoryStats = categoryStats.filter(c => c.name.toLowerCase().includes(search.toLowerCase().trim()));
    }

    const handleDelete = async (cat) => {
        if (confirming === cat.id) {
            try {
                await deleteDoc(doc(db, "categories", cat.id));
                setConfirming(null);
            } catch (error) {
                console.error("Deletion failed", error);
                alert("Failed to remove category from the cloud registry.");
            }
        } else {
            setConfirming(cat.id);
            setTimeout(() => setConfirming(null), 3000);
        }
    };

    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-3xl font-black text-navy-primary tracking-tighter uppercase leading-none">Budget Segments</h2>
                    <p className="text-gray-400 mt-2 font-medium italic">Monitor sub-limit operational flows</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsCatModalOpen(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-[#1a1f2e] text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-navy-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <Plus size={20} />
                        <span>New Segment</span>
                    </button>
                </div>
            </header>

            <div className="relative w-full md:w-[32rem] group mb-10">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-navy-primary/20 group-focus-within:text-navy-primary transition-colors" size={20} />
                <input
                    type="text"
                    placeholder="Search segments..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-16 pr-6 py-5 bg-white border border-[#e5e7eb] rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-navy-primary/5 focus:border-navy-primary transition-all text-navy-primary font-black uppercase text-xs tracking-widest shadow-sm"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                {categoryStats.length > 0 ? (
                    categoryStats.map(stat => {
                        const remaining = (stat.monthlyLimit || 0) - (stat.spent || 0);
                        return (
                            <div key={stat.id} className="bg-white p-7 rounded-[2.5rem] border border-[#e5e7eb] shadow-sm relative overflow-hidden group hover:border-[#1a1f2e] transition-all flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-5 relative z-10 w-full">
                                    <div className="w-full">
                                        <div className="flex justify-between items-center w-full mb-3">
                                            <h4 className="text-[12px] font-black text-gray-800 uppercase tracking-[0.2em]">{stat.name}</h4>
                                            <button
                                                onClick={() => handleDelete(stat)}
                                                className={`p-2 rounded-xl transition-all duration-300 ${confirming === stat.id ? 'bg-rose-500 text-white shadow-lg animate-pulse scale-105' : 'text-rose-200 hover:text-rose-500 bg-transparent hover:bg-rose-50'}`}
                                            >
                                                {confirming === stat.id && <span className="text-[9px] font-black uppercase leading-none mr-1 inline-block">Confirm?</span>}
                                                <Trash2 size={confirming === stat.id ? 14 : 18} />
                                            </button>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xl font-black text-navy-primary tracking-tighter">
                                                {symbol}{convert(stat.spent).toLocaleString()} <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Spent</span>
                                            </p>
                                            <p className={`text-sm font-black tracking-tight ${remaining < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {symbol}{convert(remaining).toLocaleString()} <span className="text-[9px] opacity-40 uppercase tracking-widest leading-none">Left</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                                        <span>Limit: {symbol}{convert(stat.monthlyLimit || 0).toLocaleString()}</span>
                                        <span>{stat.percent}%</span>
                                    </div>
                                    <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden border border-gray-100 shadow-inner relative z-10">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${stat.percent > 90 ? 'bg-red-500 shadow-xl' : 'bg-[#1a1f2e] shadow-lg'}`}
                                            style={{ width: `${Math.min(stat.percent, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-center px-10">
                        <div className="w-20 h-20 bg-navy-primary/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                            <AlertCircle size={40} className="text-navy-primary/20" />
                        </div>
                        <h3 className="text-xl font-black text-navy-primary uppercase tracking-[0.2em] mb-3">No Segments Found</h3>
                    </div>
                )}
            </div>

            <CategoryModal
                isOpen={isCatModalOpen}
                onClose={() => setIsCatModalOpen(false)}
                currency={currency}
                rate={rate}
            />
        </div>
    );
};

export default BudgetSegments;
