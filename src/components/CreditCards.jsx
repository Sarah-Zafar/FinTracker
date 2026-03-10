import React, { useState } from 'react';
import { Plus, CreditCard as CardIcon, ChevronRight, Calendar, TrendingDown, ShieldCheck, TrendingUp, Pencil, Trash2 } from 'lucide-react';
import { db } from '../firebase'
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore'

const CreditCards = ({ currency, rate, cards, transactions = [] }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newCard, setNewCard] = useState({ name: '', limit: '', limitLeft: '' });

    const symbol = currency === 'PKR' ? 'Rs.' : '$';
    const convert = (val) => currency === 'PKR' ? val * rate : val;

    const handleAddCard = async (e) => {
        e.preventDefault();
        try {
            const limitUSD = currency === 'PKR' ? parseFloat(newCard.limit) / rate : parseFloat(newCard.limit);
            const limitLeftUSD = currency === 'PKR' ? parseFloat(newCard.limitLeft) / rate : parseFloat(newCard.limitLeft);

            await addDoc(collection(db, "cards"), {
                name: newCard.name,
                creditLimit: limitUSD,
                limitLeft: limitLeftUSD,
                paymentReceived: 0,
                type: "Credit Card"
            });

            setIsModalOpen(false);
            setNewCard({ name: '', limit: '', limitLeft: '' });
        } catch (error) {
            console.error('Add card error:', error);
        }
    };

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editCard, setEditCard] = useState({ id: '', name: '', limit: '', limitLeft: '' });
    const [confirming, setConfirming] = useState(null);

    const handleEditClick = (card) => {
        setEditCard({
            id: card.id,
            name: card.name,
            limit: convert(card.creditLimit || card.limit || 0).toString(),
            limitLeft: convert(card.limitLeft || (card.limit - (card.spent || 0)) || 0).toString()
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateCard = async (e) => {
        e.preventDefault();
        try {
            const limitUSD = currency === 'PKR' ? parseFloat(editCard.limit) / rate : parseFloat(editCard.limit);
            const limitLeftUSD = currency === 'PKR' ? parseFloat(editCard.limitLeft) / rate : parseFloat(editCard.limitLeft);
            const cardRef = doc(db, "cards", editCard.id);
            await updateDoc(cardRef, {
                name: editCard.name,
                creditLimit: limitUSD,
                limitLeft: limitLeftUSD,
                type: "Credit Card"
            });
            setIsEditModalOpen(false);
        } catch (error) {
            console.error('Update card error:', error);
        }
    };

    const handleDeleteCard = async (card) => {
        const hasTransactions = transactions.some(t => t.sourceId === card.id);
        if (hasTransactions) {
            alert('Cannot Delete: There are active historical transactions linked to this Liability Endpoint.');
            return;
        }

        if (confirming === card.id) {
            try {
                await deleteDoc(doc(db, "cards", card.id));
                setConfirming(null);
            } catch (err) {
                console.error("Deletion failed", err);
            }
        } else {
            setConfirming(card.id);
            setTimeout(() => setConfirming(null), 3000);
        }
    };

    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-3xl font-black text-navy-primary tracking-tighter uppercase leading-none">Liability Ledger</h2>
                    <p className="text-gray-400 mt-2 font-medium">Monitoring {cards.length} active credit lines in {currency}.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-8 py-4 bg-navy-primary text-white rounded-[1.5rem] text-xs font-black hover:bg-navy-primary/95 transition-all shadow-2xl shadow-navy-primary/30 active:scale-95 uppercase tracking-[0.2em]"
                >
                    <Plus size={20} />
                    <span>Open Credit Line</span>
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {cards.map((card) => {
                    // Backwards compatibility with old cards
                    const _creditLimit = card.creditLimit || card.limit || 0;
                    const _limitLeft = card.limitLeft !== undefined ? card.limitLeft : (_creditLimit - (card.spent || 0));
                    const _activeDebt = _creditLimit - _limitLeft;
                    const _paymentReceived = card.paymentReceived || 0;

                    const usagePercent = Math.min(Math.round((_activeDebt / (_creditLimit || 1)) * 100), 100);
                    const remainingColor = usagePercent > 80 ? 'text-red-500' : 'text-green-500';

                    return (
                        <div key={card.id} className="group relative">
                            {/* Premium Virtual Card UI */}
                            <div className="bg-gradient-to-br from-[#1a1f2e] via-[#2d324e] to-[#1a1f2e] p-12 rounded-[3rem] text-white shadow-[0_30px_60px_rgba(26,31,46,0.3)] relative overflow-hidden transition-all group-hover:shadow-[0_40px_80px_rgba(26,31,46,0.4)]">
                                <div className="absolute top-12 right-12 w-16 h-12 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-xl opacity-90 flex items-center justify-center shadow-lg pointer-events-none">
                                    <div className="w-full h-full opacity-20 flex flex-wrap gap-1.5 p-2">
                                        {[...Array(9)].map((_, i) => <div key={i} className="w-full h-px bg-black"></div>)}
                                    </div>
                                </div>

                                <div className="absolute top-8 right-32 flex items-center gap-2 z-20">
                                    <button
                                        onClick={() => handleEditClick(card)}
                                        className="p-2 rounded-xl transition-colors hover:bg-white/10 text-white/40 hover:text-white"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCard(card)}
                                        className={`p-2 rounded-xl transition-all duration-300 ${confirming === card.id ? 'bg-rose-500 text-white shadow-lg animate-pulse scale-105' : 'hover:bg-rose-500/20 text-white/40 hover:text-rose-400'}`}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <div className="flex flex-col h-full relative z-10">
                                    <div className="mb-20">
                                        <h3 className="text-3xl font-black tracking-tight uppercase opacity-95 flex items-center gap-3">
                                            <CardIcon size={28} className="text-white/40" />
                                            {card.name}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-4 text-white/30 text-[9px] font-black tracking-[0.4em]">
                                            <ShieldCheck size={14} />
                                            SECURE CLOUD ASSET
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <div className="flex flex-col gap-2">
                                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Credit Capacity</p>
                                            <p className="text-2xl font-bold tracking-tighter">
                                                {symbol}{convert(_creditLimit).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="text-right flex flex-col gap-2">
                                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Payment Received</p>
                                            <p className={`text-4xl font-black tracking-tighter text-emerald-400`}>
                                                {symbol}{convert(_paymentReceived).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-white/5 rounded-full blur-[100px] pointer-events-none"></div>
                            </div>

                            {/* Dynamic Utilization Stats */}
                            <div className="mt-8 bg-white p-10 rounded-[2.5rem] border border-[#e5e7eb] shadow-sm flex flex-col gap-6">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4 font-black text-navy-primary uppercase text-[10px] tracking-[0.3em]">
                                        <TrendingDown size={20} className="text-gray-300" />
                                        <span>Current Utilization</span>
                                    </div>
                                    <span className={`text-2xl font-black ${usagePercent > 80 ? 'text-red-600' : 'text-navy-primary'}`}>
                                        {usagePercent}%
                                    </span>
                                </div>

                                <div className="w-full bg-gray-50 h-5 rounded-full overflow-hidden p-1.5 border border-gray-100 shadow-inner">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 shadow-xl ${usagePercent > 80 ? 'bg-red-500 shadow-red-500/30' : 'bg-navy-primary shadow-navy-primary/30'}`}
                                        style={{ width: `${usagePercent}%` }}
                                    ></div>
                                </div>

                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest pt-2">
                                    <div></div>
                                    <div className="flex gap-3 items-center">
                                        <span className="text-gray-400">Limit Left:</span>
                                        <span className={`text-sm ${remainingColor}`}>{symbol}{convert(_limitLeft).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1f2e]/60 backdrop-blur-md px-4 text-left">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-10">
                            <h2 className="text-2xl font-black text-navy-primary mb-10 tracking-tight uppercase">Open New Credit Line</h2>
                            <form onSubmit={handleAddCard} className="space-y-8">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Card / Bank Entity</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. MCB Titanium, SCB Rewards"
                                        value={newCard.name}
                                        onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-navy-primary/5 focus:border-navy-primary outline-none font-bold text-navy-primary transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="relative">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Credit Limit ({symbol})</label>
                                        <input
                                            type="number"
                                            required
                                            value={newCard.limit}
                                            onChange={(e) => setNewCard({ ...newCard, limit: e.target.value })}
                                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-navy-primary transition-all"
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Limit Left ({symbol})</label>
                                        <input
                                            type="number"
                                            required
                                            value={newCard.limitLeft}
                                            onChange={(e) => setNewCard({ ...newCard, limitLeft: e.target.value })}
                                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-navy-primary transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200"
                                    >Cancel</button>
                                    <button
                                        type="submit"
                                        className="flex-2 py-4 bg-navy-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-navy-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >Commit Activation</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {isEditModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1a1f2e]/60 backdrop-blur-md px-4 text-left">
                    <div className="bg-[#1a1f2e] border-2 border-white/5 rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-10">
                            <h2 className="text-2xl font-black text-white mb-10 tracking-tight uppercase">Edit Credit Line</h2>
                            <form onSubmit={handleUpdateCard} className="space-y-8">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Card / Bank Entity</label>
                                    <input
                                        type="text"
                                        required
                                        value={editCard.name}
                                        onChange={(e) => setEditCard({ ...editCard, name: e.target.value })}
                                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-white/5 focus:border-white/20 outline-none font-bold text-white transition-all placeholder:text-gray-600"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="relative">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Credit Limit ({symbol})</label>
                                        <input
                                            type="number"
                                            required
                                            value={editCard.limit}
                                            onChange={(e) => setEditCard({ ...editCard, limit: e.target.value })}
                                            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white transition-all"
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Limit Left ({symbol})</label>
                                        <input
                                            type="number"
                                            required
                                            value={editCard.limitLeft}
                                            onChange={(e) => setEditCard({ ...editCard, limitLeft: e.target.value })}
                                            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="flex-1 py-4 bg-white/5 border border-white/10 text-white/50 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all"
                                    >Cancel</button>
                                    <button
                                        type="submit"
                                        className="flex-2 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >Flush Updates</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreditCards;
