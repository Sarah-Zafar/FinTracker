import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Loader2, ChevronDown, Landmark, CreditCard, Send, Sparkles } from 'lucide-react';
import { db } from '../firebase'
import { collection, addDoc, runTransaction, doc } from 'firebase/firestore'

const TransactionModal = ({ isOpen, onClose, currency, rate, categories, banks, cards, userData }) => {
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        category: '',
        paymentMethod: 'Bank',
        paymentSource: '',
        sourceId: '',
        date: new Date().toISOString().split('T')[0],
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const symbol = currency === 'PKR' ? 'Rs.' : '$';

    useEffect(() => {
        if (isOpen) {
            // Default select first available source
            if (formData.paymentMethod === 'Bank' && banks.length > 0) {
                setFormData(prev => ({ ...prev, paymentSource: banks[0].name, sourceId: banks[0].id }));
            } else if (formData.paymentMethod === 'Card' && cards.length > 0) {
                setFormData(prev => ({ ...prev, paymentSource: cards[0].name, sourceId: cards[0].id }));
            }
            // Default select first available category
            if (categories.length > 0 && !formData.category) {
                setFormData(prev => ({ ...prev, category: categories[0].name }));
            }
        }
    }, [isOpen, formData.paymentMethod, banks, cards, categories]);

    const handleMethodChange = (method) => {
        const source = method === 'Bank' ? banks[0] : cards[0];
        setFormData(prev => ({
            ...prev,
            paymentMethod: method,
            paymentSource: source?.name || '',
            sourceId: source?.id || ''
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Data Validation Guard
        if (!formData.name.trim() || !formData.sourceId || !formData.category) {
            setError('Operational Guard: All data fields must be populated.');
            return;
        }

        const numAmount = parseFloat(formData.amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setError('Fiscal Guard: Positive numerical values only.');
            return;
        }

        const categoryExists = categories.some(c => c.name === formData.category);
        const sourceExists = formData.paymentMethod === 'Bank'
            ? banks.some(b => b.id === formData.sourceId)
            : cards.some(c => c.id === formData.sourceId);

        if (!categoryExists || !sourceExists) {
            setError('Sync Guard: Classification or Linked Account has been removed from the registry.');
            return;
        }

        setIsSaving(true);
        setError('');

        const isIncome = ['Salary', 'Savings', 'Investments', 'Inward'].includes(formData.category);
        const type = isIncome ? 'Income' : 'Expense';

        // USD base normalization
        const baseAmount = currency === 'PKR' ? numAmount / rate : numAmount;
        const normalizedAmount = type === 'Income' ? baseAmount : -baseAmount;

        try {
            // Atomic Commit Logic
            await runTransaction(db, async (transaction) => {
                const transRef = doc(collection(db, "transactions"));

                // Confirm Source Existence within Transaction
                if (formData.paymentMethod === 'Bank') {
                    const bankRef = doc(db, "banks", formData.sourceId);
                    const bankDoc = await transaction.get(bankRef);
                    if (!bankDoc.exists()) throw new Error("Target Treasury (Bank) not found in cloud registry.");

                    const newBalance = (bankDoc.data().currentBalance || 0) + normalizedAmount;
                    transaction.update(bankRef, { currentBalance: newBalance });
                } else {
                    const cardRef = doc(db, "cards", formData.sourceId);
                    const cardDoc = await transaction.get(cardRef);
                    if (!cardDoc.exists()) throw new Error("Target Liability (Card) not found in cloud registry.");

                    const newSpent = (cardDoc.data().spent || 0) + Math.abs(normalizedAmount) * (type === 'Income' ? -1 : 1);
                    transaction.update(cardRef, { spent: newSpent });
                }

                transaction.set(transRef, {
                    ...formData,
                    amount: normalizedAmount,
                    type,
                    createdAt: new Date().toISOString(),
                    syncStatus: 'COMMITTED'
                });
            });

            // Success Transition
            setIsSuccess(true);
            setTimeout(() => {
                setIsSuccess(false);
                setIsSaving(false);
                setFormData({
                    name: '',
                    amount: '',
                    category: categories[0]?.name || '',
                    paymentMethod: 'Bank',
                    paymentSource: banks[0]?.name || '',
                    sourceId: banks[0]?.id || '',
                    date: new Date().toISOString().split('T')[0],
                });
                onClose();
            }, 1000);

        } catch (err) {
            // High-fidelity error reporting
            const errMsg = err.message || "Cloud Transaction Failure";
            console.error(`[CLOUD ERROR]: ${errMsg}`, err);
            setError(`CLOUD FAILURE: ${errMsg}`);
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f172a]/70 backdrop-blur-md px-4 ml-64">
            <div className="bg-white rounded-[3rem] shadow-[0_50px_100px_rgba(26,31,46,0.3)] w-full max-w-2xl overflow-hidden relative animate-in fade-in zoom-in duration-300 border border-gray-100">
                {isSuccess && (
                    <div className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center text-navy-primary font-bold">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle size={48} className="text-green-500" />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Sync Successful</h3>
                    </div>
                )}

                <div className="p-10">
                    <header className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-[#1a1f2e] text-white rounded-xl shadow-lg">
                                <Sparkles size={20} />
                            </div>
                            <h2 className="text-xl font-black text-[#1a1f2e] tracking-tighter uppercase">Intelligent Ledger</h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"><X size={24} /></button>
                    </header>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && <p className="p-4 bg-red-50 text-red-600 rounded-xl text-[10px] font-black tracking-widest text-center border border-red-100 uppercase">{error}</p>}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Log Description</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#1a1f2e] focus:ring-4 focus:ring-[#1a1f2e]/5 outline-none text-[#1a1f2e] font-black transition-all"
                                    placeholder="Source of funds or expense..."
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Flow Amount ({symbol})</label>
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#1a1f2e] outline-none font-black text-[#1a1f2e]"
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="relative">
                                <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Classification</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none appearance-none font-black text-[#1a1f2e] cursor-pointer hover:border-[#1a1f2e] text-sm uppercase"
                                    required
                                >
                                    {(() => {
                                        const uniqueCategories = Array.from(new Map(categories.map(c => [c.name, c])).values());
                                        return uniqueCategories.length > 0 ? (
                                            uniqueCategories.map(cat => (
                                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                                            ))
                                        ) : (
                                            <option disabled>Syncing Cloud...</option>
                                        );
                                    })()}
                                </select>
                                <div className="absolute right-5 top-11 pointer-events-none text-gray-300">
                                    <ChevronDown size={18} />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Asset Allocation</label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleMethodChange('Bank')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border font-black transition-all uppercase text-[9px] tracking-widest ${formData.paymentMethod === 'Bank' ? 'bg-[#1a1f2e] text-white border-[#1a1f2e] shadow-lg' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-white'}`}
                                    >
                                        <Landmark size={18} />
                                        <span>Treasury</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleMethodChange('Card')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border font-black transition-all uppercase text-[9px] tracking-widest ${formData.paymentMethod === 'Card' ? 'bg-[#1a1f2e] text-white border-[#1a1f2e] shadow-lg' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-white'}`}
                                    >
                                        <CreditCard size={18} />
                                        <span>Liability</span>
                                    </button>
                                </div>
                            </div>

                            <div className="relative">
                                <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Linked Account</label>
                                <select
                                    value={formData.sourceId}
                                    onChange={(e) => {
                                        const selected = (formData.paymentMethod === 'Bank' ? banks : cards).find(item => item.id === e.target.value);
                                        setFormData({ ...formData, sourceId: e.target.value, paymentSource: selected?.name || '' });
                                    }}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none appearance-none font-black text-[#1a1f2e] text-sm cursor-pointer hover:border-[#1a1f2e] uppercase"
                                    required
                                >
                                    {(formData.paymentMethod === 'Bank' ? banks : cards).map(item => (
                                        <option key={item.id} value={item.id}>{item.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-5 top-11 pointer-events-none text-gray-300">
                                    <ChevronDown size={18} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Effective Date</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-black text-[#1a1f2e]"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSaving}
                            className="w-full py-5 bg-[#1a1f2e] text-white rounded-2xl font-black shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-50 uppercase text-[10px] tracking-widest mt-4"
                        >
                            {isSaving ? <Loader2 className="animate-spin text-white" /> : <Send size={20} />}
                            {isSaving ? 'Synchronizing Cloud...' : 'Commit to Ledger'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TransactionModal;
