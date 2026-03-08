import React, { useState } from 'react';
import { Plus, Landmark, Wallet, MoreVertical, ShieldCheck, CreditCard as CardIcon, Pencil, Trash2 } from 'lucide-react';
import { db } from '../firebase'
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore'

const Banks = ({ currency, rate, banks, transactions = [] }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newBank, setNewBank] = useState({ name: '', balance: '', type: 'Savings', account: '' });

    const symbol = currency === 'PKR' ? 'Rs.' : '$';
    const convert = (val) => currency === 'PKR' ? val * rate : val;

    const handleAddBank = async (e) => {
        e.preventDefault();
        try {
            // Save initial balance as base USD if UI is PKR
            const initialBalanceUSD = currency === 'PKR' ? parseFloat(newBank.balance) / rate : parseFloat(newBank.balance);

            await addDoc(collection(db, "banks"), {
                name: newBank.name,
                initialBalance: initialBalanceUSD,
                currentBalance: initialBalanceUSD,
                type: newBank.type,
                accountNumber: newBank.account || '****' + Math.floor(1000 + Math.random() * 9000)
            });

            setIsModalOpen(false);
            setNewBank({ name: '', balance: '', type: 'Savings', account: '' });
        } catch (error) {
            console.error('Add bank error:', error);
        }
    };

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editBank, setEditBank] = useState({ id: '', name: '', balance: '', type: 'Savings', account: '' });
    const [confirming, setConfirming] = useState(null);

    const handleEditClick = (bank) => {
        setEditBank({
            id: bank.id,
            name: bank.name,
            balance: convert(bank.currentBalance || 0).toString(),
            type: bank.type,
            account: bank.accountNumber
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateBank = async (e) => {
        e.preventDefault();
        try {
            const currentBalanceUSD = currency === 'PKR' ? parseFloat(editBank.balance) / rate : parseFloat(editBank.balance);
            const bankRef = doc(db, "banks", editBank.id);
            await updateDoc(bankRef, {
                name: editBank.name,
                currentBalance: currentBalanceUSD,
                type: editBank.type,
                accountNumber: editBank.account || '****' + Math.floor(1000 + Math.random() * 9000)
            });
            setIsEditModalOpen(false);
        } catch (error) {
            console.error('Update bank error:', error);
        }
    };

    const handleDeleteBank = async (bank) => {
        const hasTransactions = transactions.some(t => t.sourceId === bank.id);
        if (hasTransactions) {
            alert('Cannot Delete: There are active historical transactions linked to this Treasury Endpoint.');
            return;
        }

        if (confirming === bank.id) {
            try {
                await deleteDoc(doc(db, "banks", bank.id));
                setConfirming(null);
            } catch (err) {
                console.error("Deletion failed", err);
            }
        } else {
            setConfirming(bank.id);
            setTimeout(() => setConfirming(null), 3000);
        }
    };

    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-3xl font-black text-navy-primary tracking-tighter uppercase">Treasury Management</h2>
                    <p className="text-gray-400 mt-1 font-medium">Monitoring {banks.length} active financial endpoints.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-4 bg-navy-primary text-white rounded-2xl text-sm font-bold hover:bg-navy-primary/95 transition-all shadow-xl shadow-navy-primary/20 active:scale-95 uppercase tracking-widest"
                >
                    <Plus size={20} />
                    <span>Link Account</span>
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {banks.map((bank, index) => (
                    <div
                        key={bank.id}
                        className={`p-10 rounded-[2.5rem] border transition-all hover:shadow-2xl group relative overflow-hidden ${index === 0
                            ? 'bg-navy-primary text-white border-navy-primary shadow-2xl shadow-navy-primary/30'
                            : 'bg-white text-navy-primary border-[#e5e7eb] shadow-sm'
                            }`}
                    >
                        <div className={`absolute -right-10 -top-10 w-48 h-48 rounded-full blur-3xl opacity-10 ${index === 0 ? 'bg-white' : 'bg-navy-primary'}`}></div>

                        <div className="flex justify-between items-start mb-12 relative z-10">
                            <div className={`p-5 rounded-2xl shadow-inner ${index === 0 ? 'bg-white/10' : 'bg-navy-primary/5'}`}>
                                {bank.type === 'Savings' ? <Landmark size={28} /> : <Wallet size={28} />}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleEditClick(bank)}
                                    className={`p-2 rounded-xl transition-colors ${index === 0 ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                                >
                                    <Pencil size={18} className={index === 0 ? 'text-white/40' : 'text-gray-400'} />
                                </button>
                                <button
                                    onClick={() => handleDeleteBank(bank)}
                                    className={`p-2 rounded-xl transition-all duration-300 ${confirming === bank.id ? 'bg-rose-500 text-white shadow-lg animate-pulse scale-105' : (index === 0 ? 'hover:bg-rose-500/20 text-white/40 hover:text-white' : 'hover:bg-rose-50 text-gray-400 hover:text-rose-500')}`}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="relative z-10">
                            <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-3 ${index === 0 ? 'text-white/60' : 'text-gray-400'}`}>
                                {bank.type} Liquidity
                            </p>
                            <h3 className="text-2xl font-black mb-1 tracking-tight">{bank.name}</h3>
                            <p className={`text-sm font-bold mb-10 font-mono tracking-tighter opacity-50 ${index === 0 ? 'text-white/60' : 'text-gray-400'}`}>
                                {bank.accountNumber}
                            </p>

                            <div className="flex items-end justify-between">
                                <div>
                                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${index === 0 ? 'text-white/60' : 'text-gray-400'}`}>
                                        Available Balance
                                    </p>
                                    <p className="text-4xl font-black tracking-tighter">
                                        {symbol}{convert(bank.currentBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                    </p>
                                </div>
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${index === 0 ? 'bg-white/10 text-white' : 'bg-navy-primary/5 text-navy-primary'
                                    }`}>
                                    <ShieldCheck size={14} />
                                    SECURED
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1f2e]/60 backdrop-blur-md px-4 text-left">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-10">
                            <h2 className="text-2xl font-black text-navy-primary mb-10 tracking-tighter uppercase">Initialize Treasury</h2>
                            <form onSubmit={handleAddBank} className="space-y-8">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Entity / Bank Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Habib, Standard Chartered, etc."
                                        value={newBank.name}
                                        onChange={(e) => setNewBank({ ...newBank, name: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-navy-primary/5 focus:border-navy-primary outline-none font-black text-navy-primary transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Initial Reserve ({symbol})</label>
                                        <input
                                            type="number"
                                            required
                                            value={newBank.balance}
                                            onChange={(e) => setNewBank({ ...newBank, balance: e.target.value })}
                                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-navy-primary transition-all"
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Asset Type</label>
                                        <select
                                            value={newBank.type}
                                            onChange={(e) => setNewBank({ ...newBank, type: e.target.value })}
                                            className="w-full px-6 py-4.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-navy-primary appearance-none cursor-pointer transition-all"
                                        >
                                            <option value="Savings">Savings</option>
                                            <option value="Current">Current</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all"
                                    >Abort</button>
                                    <button
                                        type="submit"
                                        className="flex-2 py-4 bg-navy-primary text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-navy-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >Commit Account</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {isEditModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1a1f2e]/60 backdrop-blur-md px-4 text-left">
                    <div className="bg-[#1a1f2e] border-2 border-white/5 rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-10">
                            <h2 className="text-2xl font-black text-white mb-10 tracking-tighter uppercase">Edit Treasury</h2>
                            <form onSubmit={handleUpdateBank} className="space-y-8">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Entity / Bank Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={editBank.name}
                                        onChange={(e) => setEditBank({ ...editBank, name: e.target.value })}
                                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-white/5 focus:border-white/20 outline-none font-black text-white transition-all placeholder:text-gray-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Account Digits</label>
                                    <input
                                        type="text"
                                        required
                                        value={editBank.account}
                                        onChange={(e) => setEditBank({ ...editBank, account: e.target.value })}
                                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-white/5 focus:border-white/20 outline-none font-black text-white transition-all font-mono placeholder:text-gray-600"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Available Reserve ({symbol})</label>
                                        <input
                                            type="number"
                                            required
                                            value={editBank.balance}
                                            onChange={(e) => setEditBank({ ...editBank, balance: e.target.value })}
                                            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white transition-all"
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Asset Type</label>
                                        <select
                                            value={editBank.type}
                                            onChange={(e) => setEditBank({ ...editBank, type: e.target.value })}
                                            className="w-full px-6 py-4.5 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white appearance-none cursor-pointer transition-all uppercase"
                                        >
                                            <option value="Savings" className="text-[#1a1f2e]">Savings</option>
                                            <option value="Current" className="text-[#1a1f2e]">Current</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="flex-1 py-4 bg-white/5 border border-white/10 text-white/50 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all"
                                    >Abort</button>
                                    <button
                                        type="submit"
                                        className="flex-2 py-4 bg-emerald-500 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
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

export default Banks;
