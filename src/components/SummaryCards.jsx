import React, { useState } from 'react';
import { Landmark, TrendingUp, TrendingDown, PieChart, Pencil, Check, X } from 'lucide-react';

const SummaryCards = ({ summary, currency, rate, onUpdateUserField }) => {
    const symbol = currency === 'PKR' ? 'Rs.' : '$';
    const convert = (val) => currency === 'PKR' ? val * rate : val;
    const deconvert = (val) => currency === 'PKR' ? val / rate : val;

    const [editingField, setEditingField] = useState(null);
    const [editValue, setEditValue] = useState('');

    const format = (val) => {
        if (val === undefined) return '0';
        return `${symbol} ${convert(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const startEditing = (field, currentVal) => {
        setEditingField(field);
        setEditValue(Math.round(convert(currentVal)).toString());
    };

    const saveEdit = () => {
        const valUSD = deconvert(parseFloat(editValue));
        if (!isNaN(valUSD)) {
            const fieldMap = {
                'salary': 'monthlySalary',
                'budget': 'budgetLimit',
                'debt': 'totalDebt'
            };
            onUpdateUserField(fieldMap[editingField], valUSD);
        }
        setEditingField(null);
    };

    const cards = [
        {
            id: 'salary',
            title: 'Total Salary',
            value: format(summary.remainingSalary),
            isDark: true,
            icon: <Landmark className="text-white/80" />,
            editable: true,
            baseValue: summary.baseSalary
        },
        {
            id: 'budget',
            title: 'Total Budget',
            value: format(summary.remainingBudget),
            icon: <TrendingUp className="text-navy-primary" />,
            editable: true,
            baseValue: summary.budgetLimit
        },
        {
            id: 'debt',
            title: 'Active Debt',
            value: format(summary.debt),
            icon: <TrendingDown className="text-navy-primary" />,
            editable: true,
            baseValue: summary.debt
        },
        {
            id: 'use',
            title: 'Budget Use',
            value: `${summary.budgetUse}%`,
            icon: <PieChart className="text-navy-primary" />,
            editable: false
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className={`p-7 rounded-[2.5rem] shadow-sm border transition-all relative group ${card.isDark
                        ? 'bg-[#1a1f2e] text-white border-[#1a1f2e] shadow-xl shadow-navy-primary/20'
                        : 'bg-white text-navy-primary border-[#e5e7eb]'
                        }`}
                >
                    <div className="flex justify-between items-start mb-6">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${card.isDark ? 'text-white/40' : 'text-gray-400'}`}>
                            {card.title}
                        </span>
                        <div className="flex gap-2">
                            {card.editable && (
                                <button
                                    onClick={() => startEditing(card.id, card.baseValue)}
                                    className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${card.isDark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-gray-50 text-gray-300'}`}
                                >
                                    <Pencil size={12} />
                                </button>
                            )}
                            <div className={`p-3 rounded-2xl ${card.isDark ? 'bg-white/10' : 'bg-navy-primary/5'}`}>
                                {card.icon}
                            </div>
                        </div>
                    </div>

                    {editingField === card.id ? (
                        <div className="flex items-center gap-3 animate-in slide-in-from-left-2 duration-300">
                            <input
                                autoFocus
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={saveEdit}
                                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                className={`text-4xl font-black bg-transparent border-b-2 outline-none w-full ${card.isDark ? 'border-white/50 text-white' : 'border-navy-primary/50 text-navy-primary'}`}
                            />
                            <div className="flex flex-col gap-1">
                                <button onClick={saveEdit} className="p-1 hover:bg-emerald-500/10 rounded text-emerald-500"><Check size={16} /></button>
                                <button onClick={() => setEditingField(null)} className="p-1 hover:bg-rose-500/10 rounded text-rose-500"><X size={16} /></button>
                            </div>
                        </div>
                    ) : (
                        <div
                            onClick={() => startEditing(card.id, card.baseValue)}
                            className="text-3xl font-black tracking-tighter truncate cursor-text group-hover:opacity-80 transition-all flex items-center gap-3"
                        >
                            {card.value}
                            {card.editable && <Pencil size={14} className="opacity-0 group-hover:opacity-40 transition-opacity" />}
                        </div>
                    )}

                    <div className={`mt-3 text-[10px] font-bold uppercase tracking-widest ${card.isDark ? 'text-white/20' : 'text-gray-300'}`}>
                        {card.id === 'salary' ? 'Net after expenses' : card.id === 'budget' ? 'Monthly Limit' : 'Live Sync'} Insight
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SummaryCards;
