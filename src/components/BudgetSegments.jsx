import React, { useState } from 'react';
import { PieChart, Target, Plus, Search, Trash2, AlertCircle, Pencil, Calendar, RefreshCw, Loader2 } from 'lucide-react';
import CategoryModal from './CategoryModal';
import { db } from '../firebase';
import { doc, deleteDoc, updateDoc, collection, addDoc } from 'firebase/firestore';

const BudgetSegments = ({ currency, rate, externalTransactions, categories }) => {
    const activeCurrentMonth = new Date().toISOString().split('-').slice(0, 2).join('-');
    const [selectedMonth, setSelectedMonth] = useState(activeCurrentMonth);
    const [isReplicating, setIsReplicating] = useState(false);
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [confirming, setConfirming] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editSegment, setEditSegment] = useState({ id: '', name: '', limit: '', type: 'Expense', spent: '', received: '' });

    const symbol = currency === 'PKR' ? 'Rs.' : '$';
    const convert = (val) => currency === 'PKR' ? val * rate : val;

    const handleEditClick = (cat) => {
        setEditSegment({
            id: cat.id,
            name: cat.name,
            limit: convert(cat.monthlyLimit || 0).toString(),
            type: cat.type || 'Expense',
            spent: convert(cat.spent || 0).toString(),
            received: convert(cat.received || 0).toString()
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateSegment = async (e) => {
        e.preventDefault();
        try {
            const limitUSD = currency === 'PKR' ? parseFloat(editSegment.limit) / rate : parseFloat(editSegment.limit);
            const spentUSD = currency === 'PKR' ? parseFloat(editSegment.spent || 0) / rate : parseFloat(editSegment.spent || 0);
            const receivedUSD = currency === 'PKR' ? parseFloat(editSegment.received || 0) / rate : parseFloat(editSegment.received || 0);

            const segmentRef = doc(db, "categories", editSegment.id);
            const updates = {
                name: editSegment.name,
                monthlyLimit: limitUSD
            };

            if (editSegment.type === 'Income') {
                updates.received = receivedUSD;
            } else {
                updates.spent = spentUSD;
            }

            await updateDoc(segmentRef, updates);
            setIsEditModalOpen(false);
        } catch (error) {
            console.error('Update segment error:', error);
        }
    };

    const handleReplicate = async () => {
        const [yearStr, monthStr] = selectedMonth.split('-');
        let year = parseInt(yearStr);
        let month = parseInt(monthStr);

        month -= 1;
        if (month === 0) {
            month = 12;
            year -= 1;
        }
        const prevMonthStr = `${year}-${month.toString().padStart(2, '0')}`;

        const prevCategories = categories.filter(cat => (cat.month || activeCurrentMonth) === prevMonthStr);

        if (prevCategories.length === 0) {
            alert(`No categories found in the previous month (${prevMonthStr}) to replicate.`);
            return;
        }

        setIsReplicating(true);
        try {
            for (const cat of prevCategories) {
                const exists = categories.some(c => c.name === cat.name && (c.month || activeCurrentMonth) === selectedMonth);
                if (!exists) {
                    await addDoc(collection(db, "categories"), {
                        name: cat.name,
                        type: cat.type || 'Expense',
                        monthlyLimit: cat.monthlyLimit || 0,
                        month: selectedMonth,
                        createdAt: new Date().toISOString()
                    });
                }
            }
        } catch (err) {
            console.error("Replication failed", err);
            alert("Failed to replicate categories.");
        } finally {
            setIsReplicating(false);
        }
    };

    const calculateCategoryStats = () => {
        const stats = categories
            .filter(cat => (cat.month || activeCurrentMonth) === selectedMonth)
            .map(cat => {
                const isIncome = cat.type === 'Income';

                // Firestore exact map reading (supports increment atomic updates seamlessly)
                let calculatedSpent = isIncome ? (cat.received || 0) : (cat.spent || 0);

                // Fallback rendering for old, unmapped array nodes
                if (!cat.received && !cat.spent && externalTransactions) {
                    calculatedSpent = externalTransactions
                        .filter(t => t.category === cat.name && t.date.startsWith(selectedMonth))
                        .reduce((acc, curr) => {
                            const amt = curr.amount || 0;
                            if (isIncome && amt > 0) return acc + amt;
                            if (!isIncome && amt < 0) return acc + Math.abs(amt);
                            return acc;
                        }, 0);
                }

                return {
                    ...cat,
                    spent: calculatedSpent,
                    percent: cat.monthlyLimit > 0 ? Math.round((calculatedSpent / cat.monthlyLimit) * 100) : 0
                };
            });
        return stats;
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
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                <div>
                    <h2 className="text-3xl font-black text-navy-primary tracking-tighter uppercase leading-none">Budget Segments</h2>
                    <p className="text-gray-400 mt-2 font-medium italic">Monitor sub-limit operational flows</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group">
                        <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-navy-primary/40 group-focus-within:text-navy-primary transition-colors" size={18} />
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-white pl-14 pr-6 py-4 border border-[#e5e7eb] rounded-[1.5rem] font-black text-navy-primary uppercase tracking-[0.2em] focus:outline-none focus:ring-4 focus:ring-navy-primary/5 transition-all text-xs outline-none cursor-pointer shadow-sm"
                        />
                    </div>

                    <button
                        onClick={handleReplicate}
                        disabled={isReplicating}
                        className="flex items-center gap-3 px-6 py-4 bg-white border border-[#e5e7eb] text-navy-primary rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:border-navy-primary hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
                    >
                        {isReplicating ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                        <span>{isReplicating ? 'Replicating...' : 'Replicate Last Month'}</span>
                    </button>

                    <button
                        onClick={() => setIsCatModalOpen(true)}
                        className="flex items-center gap-3 px-6 py-4 bg-[#1a1f2e] text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-navy-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <Plus size={20} />
                        <span>New Category</span>
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
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEditClick(stat)}
                                                    className="p-2 rounded-xl transition-colors text-gray-300 hover:text-navy-primary hover:bg-gray-50"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(stat)}
                                                    className={`p-2 rounded-xl transition-all duration-300 ${confirming === stat.id ? 'bg-rose-500 text-white shadow-lg animate-pulse scale-105' : 'text-rose-200 hover:text-rose-500 bg-transparent hover:bg-rose-50'}`}
                                                >
                                                    {confirming === stat.id && <span className="text-[9px] font-black uppercase leading-none mr-1 inline-block">Confirm?</span>}
                                                    <Trash2 size={confirming === stat.id ? 14 : 18} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className={`text-xl font-black tracking-tighter ${stat.type === 'Income' ? 'text-emerald-500' : 'text-navy-primary'}`}>
                                                {symbol}{convert(stat.spent).toLocaleString()} <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">{stat.type === 'Income' ? 'Received' : 'Spent'}</span>
                                            </p>
                                            <p className={`text-sm font-black tracking-tight ${stat.type === 'Income'
                                                ? remaining <= 0 ? 'text-emerald-500' : 'text-gray-400'
                                                : remaining < 0 ? 'text-rose-500' : 'text-emerald-500'
                                                }`}>
                                                {symbol}{convert(Math.abs(remaining)).toLocaleString()} <span className="text-[9px] opacity-40 uppercase tracking-widest leading-none">{stat.type === 'Income' ? (remaining <= 0 ? 'Over Target' : 'Left') : (remaining < 0 ? 'Over' : 'Left')}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                                        <span>{stat.type === 'Income' ? 'Target' : 'Limit'}: {symbol}{convert(stat.monthlyLimit || 0).toLocaleString()}</span>
                                        <span>{stat.percent}%</span>
                                    </div>
                                    <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden border border-gray-100 shadow-inner relative z-10">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${stat.type === 'Income'
                                                ? stat.percent >= 100 ? 'bg-emerald-500 shadow-xl' : 'bg-emerald-400 shadow-lg'
                                                : stat.percent > 90 ? 'bg-red-500 shadow-xl' : 'bg-[#1a1f2e] shadow-lg'
                                                }`}
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
                selectedMonth={selectedMonth}
            />

            {isEditModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1a1f2e]/80 backdrop-blur-md px-4 text-left">
                    <div className="bg-[#1a1f2e] border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-10">
                            <h2 className="text-2xl font-black text-white mb-10 tracking-tighter uppercase">Edit Budget Segment</h2>
                            <form onSubmit={handleUpdateSegment} className="space-y-8">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Segment Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={editSegment.name}
                                        onChange={(e) => setEditSegment({ ...editSegment, name: e.target.value })}
                                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-white/5 focus:border-white/20 outline-none font-black text-white transition-all placeholder:text-gray-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Monthly Target/Limit ({symbol})</label>
                                    <input
                                        type="number"
                                        required
                                        value={editSegment.limit}
                                        onChange={(e) => setEditSegment({ ...editSegment, limit: e.target.value })}
                                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white transition-all placeholder:text-gray-600"
                                    />
                                </div>

                                {editSegment.type === 'Income' ? (
                                    <div>
                                        <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-3 ml-1">Amount Received ({symbol})</label>
                                        <input
                                            type="number"
                                            required
                                            value={editSegment.received}
                                            onChange={(e) => setEditSegment({ ...editSegment, received: e.target.value })}
                                            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white transition-all placeholder:text-gray-600"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] mb-3 ml-1">Amount Spent ({symbol})</label>
                                        <input
                                            type="number"
                                            required
                                            value={editSegment.spent}
                                            onChange={(e) => setEditSegment({ ...editSegment, spent: e.target.value })}
                                            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white transition-all placeholder:text-gray-600"
                                        />
                                    </div>
                                )}

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="flex-1 py-4 bg-white/5 border border-white/10 text-white/50 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all cursor-pointer"
                                    >Cancel</button>
                                    <button
                                        type="submit"
                                        className="flex-2 py-4 bg-emerald-500 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                                    >Save Changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BudgetSegments;
