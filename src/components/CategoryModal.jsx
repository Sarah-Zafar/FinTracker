import React, { useState } from 'react';
import { X, Plus, Tag, Loader2, Target, ShieldCheck } from 'lucide-react';
import { db } from '../firebase'
import { collection, addDoc } from 'firebase/firestore'

const CategoryModal = ({ isOpen, onClose, currency, rate }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState('Expense');
    const [limit, setLimit] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const symbol = currency === 'PKR' ? 'Rs.' : '$';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSaving(true);
        setError('');

        try {
            // Store limit as base USD if input is PKR
            const limitUSD = currency === 'PKR' ? parseFloat(limit || 0) / rate : parseFloat(limit || 0);

            await addDoc(collection(db, "categories"), {
                name: name.trim(),
                type,
                monthlyLimit: limitUSD,
                createdAt: new Date().toISOString()
            });

            setName('');
            setLimit('');
            setType('Expense');
            onClose();
        } catch (err) {
            console.error(err);
            setError('Cloud sync failure');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1a1f2e]/60 backdrop-blur-md px-4">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-10">
                    <header className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-navy-primary/5 rounded-2xl text-navy-primary">
                                <Target size={24} />
                            </div>
                            <h2 className="text-2xl font-black text-navy-primary tracking-tighter uppercase">New Budget Class</h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-2xl text-gray-400 transition-colors">
                            <X size={24} />
                        </button>
                    </header>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {error && <p className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black tracking-widest text-center border border-red-100 uppercase uppercase">{error}</p>}

                        <div className="relative group">
                            <label className="block text-[10px] font-black text-gray-400 mb-4 uppercase tracking-[0.3em] pl-1">Classification Name</label>
                            <div className="relative">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-navy-primary/20 group-focus-within:text-navy-primary transition-colors">
                                    <Tag size={20} />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Infrastructure, Leisure"
                                    className="w-full pl-14 pr-5 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-navy-primary/5 focus:border-navy-primary outline-none font-black text-navy-primary transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 mb-4 uppercase tracking-[0.3em] pl-1">Monthly Ceiling ({symbol})</label>
                                <input
                                    type="number"
                                    value={limit}
                                    onChange={(e) => setLimit(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-5 py-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-navy-primary transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 mb-4 uppercase tracking-[0.3em] pl-1">Fiscal Flow</label>
                                <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                                    {['Expense', 'Income'].map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setType(t)}
                                            className={`flex-1 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${type === t
                                                ? 'bg-[#1a1f2e] text-white shadow-xl'
                                                : 'text-gray-400 hover:text-navy-primary'
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSaving || !name.trim()}
                            className="w-full py-5.5 bg-[#1a1f2e] text-white rounded-[1.5rem] font-bold shadow-2xl shadow-navy-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
                            <span className="tracking-[0.4em] uppercase font-black text-xs">{isSaving ? 'Synching Cloud...' : 'Commit Section'}</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CategoryModal;
