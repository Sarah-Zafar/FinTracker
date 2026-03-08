import React, { useState } from 'react';
import { ShoppingBag, Home, Briefcase, Film, Utensils, Trash2 } from 'lucide-react';

const categoryIcons = {
    'Food': <Utensils size={18} className="text-navy-primary" />,
    'Rent': <Home size={18} className="text-navy-primary" />,
    'Salary': <Briefcase size={18} className="text-navy-primary" />,
    'Entertainment': <Film size={18} className="text-navy-primary" />,
    'Groceries': <ShoppingBag size={18} className="text-navy-primary" />,
};

const TransactionsList = ({ transactions, currency, rate, onDelete }) => {
    const symbol = currency === 'PKR' ? 'Rs.' : '$';
    const convert = (val) => currency === 'PKR' ? val * rate : val;
    const [confirming, setConfirming] = useState(null);

    const handleDelete = (t) => {
        if (confirming === t.id) {
            onDelete(t);
            setConfirming(null);
        } else {
            setConfirming(t.id);
            setTimeout(() => setConfirming(null), 3000);
        }
    };

    return (
        <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-[#e5e7eb] w-full lg:w-96">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase">Recent Flows</h3>
            </div>
            <div className="space-y-6">
                {[...transactions]
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((t) => {
                        const displayAmount = convert(t.amount);
                        return (
                            <div key={t.id} className="flex items-center justify-between group cursor-default py-1">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-[#1a1f2e] group-hover:text-white transition-all">
                                        {categoryIcons[t.category] || <ShoppingBag size={18} />}
                                    </div>
                                    <div className="max-w-[120px]">
                                        <p className="text-sm font-black text-[#1a1f2e] uppercase tracking-tight truncate">{t.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-navy-primary/30 px-2 py-0.5 bg-gray-50 rounded-md whitespace-nowrap">{t.category}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`text-lg font-black tracking-tighter ${t.amount > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {t.amount > 0 ? '+' : ''}{Math.abs(displayAmount).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                    </div>
                                    <button
                                        onClick={() => handleDelete(t)}
                                        className={`p-2 rounded-lg transition-all duration-300 ${confirming === t.id
                                            ? 'bg-rose-500 text-white shadow-lg animate-pulse scale-110'
                                            : 'opacity-0 group-hover:opacity-100 text-rose-200 hover:text-rose-500 hover:bg-rose-50'}`}
                                    >
                                        <Trash2 size={confirming === t.id ? 14 : 16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
            </div>
            <button className="w-full mt-6 py-2.5 text-sm font-semibold text-white bg-navy-primary hover:bg-navy-primary/90 rounded-xl transition-all shadow-sm">
                View All
            </button>
        </div>
    );
};

export default TransactionsList;
