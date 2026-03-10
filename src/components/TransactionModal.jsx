import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Loader2, ChevronDown, Landmark, CreditCard, Send, Sparkles } from 'lucide-react';
import { db } from '../firebase'
import { collection, addDoc, runTransaction, doc, increment } from 'firebase/firestore'

const TransactionModal = ({ isOpen, onClose, currency, rate, categories, banks, cards, userData }) => {
    const [formType, setFormType] = useState('Expense');
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        category: '',
        paymentMethod: 'Bank',
        sourceId: '',
        toPaymentMethod: 'Bank',
        toSourceId: '',
        date: new Date().toISOString().split('T')[0],
        interestRate: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const symbol = currency === 'PKR' ? 'Rs.' : '$';

    useEffect(() => {
        if (isOpen) {
            // Default select exactly to Expense forms to avoid mismatch
            const expCats = categories.filter(c => c.type === 'Expense' || !c.type);
            setFormData(prev => ({
                ...prev,
                sourceId: banks.length > 0 ? banks[0].id : '',
                toSourceId: banks.length > 0 ? banks[0].id : '',
                category: expCats.length > 0 ? expCats[0].name : ''
            }));
            setFormType('Expense');
        }
    }, [isOpen, banks, categories]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Data Validation Guard
        const numAmount = parseFloat(formData.amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setError('Fiscal Guard: Positive numerical values only.');
            return;
        }

        setIsSaving(true);
        setError('');

        const baseAmount = currency === 'PKR' ? numAmount / rate : numAmount;

        if (formType === 'Internal Transfer' && formData.sourceId === formData.toSourceId) {
            setError('Fiscal Guard: From Bank and To Bank cannot be exactly identical.');
            setIsSaving(false);
            return;
        }

        try {
            await runTransaction(db, async (transaction) => {
                const transRef = doc(collection(db, "transactions"));
                let finalAmount = baseAmount;
                let actualType = formType;
                let finalName = formData.name || formType;

                if (formType === 'Income' || formType === 'Expense') {
                    finalAmount = formType === 'Income' ? baseAmount : -baseAmount;

                    if (formData.paymentMethod === 'Bank') {
                        if (!formData.sourceId) throw new Error("No primary target selected.");
                        const bankRef = doc(db, "banks", formData.sourceId);
                        const bankDoc = await transaction.get(bankRef);
                        if (!bankDoc.exists()) throw new Error("Target Treasury (Bank) not found in cloud registry.");
                        transaction.update(bankRef, { currentBalance: increment(finalAmount) });
                    } else {
                        if (!formData.sourceId) throw new Error("No primary target selected.");
                        const cardRef = doc(db, "cards", formData.sourceId);
                        const spentAdd = Math.abs(finalAmount) * (formType === 'Income' ? -1 : 1);
                        transaction.update(cardRef, {
                            spent: increment(spentAdd),
                            limitLeft: increment(-spentAdd) // Decrement limit by spent amount
                        });
                    }

                    // Action C: Budget Sync (Category Update)
                    const tMonth = formData.date.substring(0, 7);
                    const expectedType = formType === 'Income' ? 'Income' : 'Expense';
                    const matchedCat = categories.find(c => c.name === formData.category && (c.type === expectedType || !c.type) && (c.month === tMonth || !c.month));

                    if (matchedCat) {
                        const catRef = doc(db, "categories", matchedCat.id);
                        if (formType === 'Income') {
                            transaction.update(catRef, { received: increment(Math.abs(baseAmount)) });
                        } else {
                            transaction.update(catRef, { spent: increment(Math.abs(baseAmount)) });
                        }
                        formData.categoryId = matchedCat.id; // Map exact ID explicitly
                    }
                }
                else if (formType === 'Internal Transfer') {
                    finalAmount = -baseAmount; // Record negative on source
                    if (!formData.sourceId || !formData.toSourceId) throw new Error("Transfer targets missing");

                    const isSrcBank = banks.some(b => b.id === formData.sourceId);
                    const isDestBank = banks.some(b => b.id === formData.toSourceId);

                    // Action A: Source -> Subtract amount
                    if (isSrcBank) {
                        transaction.update(doc(db, "banks", formData.sourceId), { currentBalance: increment(-baseAmount) });
                    } else {
                        transaction.update(doc(db, "cards", formData.sourceId), { spent: increment(baseAmount), limitLeft: increment(-baseAmount) });
                    }

                    // Action B: Destination -> Add amount
                    if (isDestBank) {
                        transaction.update(doc(db, "banks", formData.toSourceId), { currentBalance: increment(baseAmount) });
                    } else {
                        transaction.update(doc(db, "cards", formData.toSourceId), { spent: increment(-baseAmount), limitLeft: increment(baseAmount) });
                    }

                    finalName = formData.name || `Internal Transfer`;
                }
                else if (formType === 'Credit Card Payment') {
                    finalAmount = -baseAmount; // Negative on Bank
                    if (!formData.sourceId || !formData.toSourceId) throw new Error("Payment targets missing");

                    // Action A: Debit Bank
                    const bRef = doc(db, "banks", formData.sourceId);
                    transaction.update(bRef, { currentBalance: increment(-baseAmount) });

                    // Action B: Credit Card
                    const cRef = doc(db, "cards", formData.toSourceId);
                    transaction.update(cRef, {
                        spent: increment(-baseAmount),
                        limitLeft: increment(baseAmount), // Return limit upon payment
                        paymentReceived: increment(baseAmount)
                    });

                    // Action C: Budget Sync (Category Update)
                    const tMonth = formData.date.substring(0, 7);
                    const matchedCat = categories.find(c => c.name === formData.category && (c.type === 'Expense' || !c.type) && (c.month === tMonth || !c.month));

                    if (matchedCat) {
                        const catRef = doc(db, "categories", matchedCat.id);
                        transaction.update(catRef, { spent: increment(baseAmount) });
                        formData.categoryId = matchedCat.id; // Map exact ID explicitly
                    }

                    finalName = formData.name || 'Card Payment Settlement';
                }
                else if (formType === 'Loan') {
                    finalAmount = -baseAmount; // Assuming giving loan reduces your bank

                    if (!formData.name) throw new Error("Lender name required");
                    if (!formData.sourceId) throw new Error("Funding source missing");

                    const lRef = doc(collection(db, "loans"));
                    transaction.set(lRef, {
                        personName: formData.name,
                        totalLoanAmount: baseAmount,
                        amountPaid: 0,
                        remainingBalance: baseAmount,
                        interestRate: formData.interestRate || '',
                        dueDate: formData.date
                    });

                    const bRef = doc(db, "banks", formData.sourceId);
                    const bDoc = await transaction.get(bRef);
                    if (bDoc.exists()) transaction.update(bRef, { currentBalance: (bDoc.data().currentBalance || 0) - baseAmount });

                    finalName = `Loan to ${formData.name}`;
                }

                transaction.set(transRef, {
                    name: finalName,
                    amount: finalAmount,
                    category: (formType === 'Income' || formType === 'Expense' || formType === 'Credit Card Payment') ? formData.category : formType,
                    categoryId: formData.categoryId || null,
                    bankId: formData.sourceId || null,
                    cardId: formType === 'Credit Card Payment' ? formData.toSourceId : null,
                    fromBankID: formType === 'Internal Transfer' ? formData.sourceId : null,
                    toBankID: formType === 'Internal Transfer' ? formData.toSourceId : null,
                    paymentMethod: formData.paymentMethod || 'Bank',
                    type: actualType,
                    createdAt: new Date().toISOString(),
                    date: formData.date,
                    syncStatus: 'COMMITTED'
                });
            });

            setIsSuccess(true);
            setTimeout(() => {
                setIsSuccess(false);
                setIsSaving(false);
                const expCats = categories.filter(c => c.type === 'Expense' || !c.type);
                setFormData({
                    name: '',
                    amount: '',
                    category: expCats.length > 0 ? expCats[0].name : '',
                    paymentMethod: 'Bank',
                    sourceId: banks[0]?.id || '',
                    toPaymentMethod: 'Bank',
                    toSourceId: banks[0]?.id || '',
                    date: new Date().toISOString().split('T')[0],
                    interestRate: '',
                });
                onClose();
            }, 1000);

        } catch (err) {
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
                                <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Transaction Type</label>
                                <div className="relative">
                                    <select
                                        value={formType}
                                        onChange={(e) => {
                                            const newType = e.target.value;
                                            setFormType(newType);
                                            // Real-time Mapping FIx
                                            if (newType === 'Income') {
                                                const incCats = categories.filter(c => c.type === 'Income');
                                                setFormData({ ...formData, category: incCats.length ? incCats[0].name : '' });
                                            } else if (newType === 'Expense') {
                                                const expCats = categories.filter(c => c.type === 'Expense' || !c.type);
                                                setFormData({ ...formData, category: expCats.length ? expCats[0].name : '' });
                                            } else if (newType === 'Credit Card Payment') {
                                                const expCats = categories.filter(c => c.type === 'Expense');
                                                const ccCards = cards.filter(c => c.type === 'Credit Card');
                                                setFormData({
                                                    ...formData,
                                                    category: expCats.length ? expCats[0].name : '',
                                                    toSourceId: ccCards.length ? ccCards[0].id : ''
                                                });
                                            } else if (newType === 'Internal Transfer') {
                                                const allAccounts = [...banks, ...cards];
                                                setFormData({
                                                    ...formData,
                                                    sourceId: allAccounts.length > 0 ? allAccounts[0].id : '',
                                                    toSourceId: allAccounts.length > 1 ? allAccounts[1].id : (allAccounts.length > 0 ? allAccounts[0].id : '')
                                                });
                                            }
                                        }}
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none appearance-none font-black text-[#1a1f2e] cursor-pointer hover:border-[#1a1f2e] text-sm uppercase transition-all"
                                    >
                                        <option value="Income">🟢 Income</option>
                                        <option value="Expense">🔴 Expense</option>
                                        <option value="Credit Card Payment">💳 Credit Card Payment</option>
                                        <option value="Internal Transfer">🔄 Internal Transfer</option>
                                        <option value="Loan">🏦 Loan</option>
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                                        <ChevronDown size={18} />
                                    </div>
                                </div>
                            </div>

                            {/* CONDITIONAL FORMS BELOW */}
                            {formType === 'Expense' && (
                                <>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-rose-600 mb-3 uppercase tracking-widest ml-1">Expense Amount ({symbol})</label>
                                        <input type="number" step="0.01" required value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-rose-100 rounded-xl focus:border-rose-500 outline-none font-black text-rose-600" placeholder="0.00" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Transaction Description</label>
                                        <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#1a1f2e] outline-none font-black" placeholder="Groceries, Electricity Bill..." />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Transaction Category</label>
                                        <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none appearance-none font-black text-rose-500 text-sm uppercase">
                                            {Array.from(new Map(categories.filter(c => c.type === 'Expense' || !c.type).map(c => [c.name, c])).values()).map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                                        </select>
                                        <ChevronDown size={18} className="absolute right-5 top-11 pointer-events-none text-gray-300" />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Bank</label>
                                        <select value={formData.sourceId} onChange={(e) => setFormData({ ...formData, sourceId: e.target.value, paymentMethod: 'Bank' })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none appearance-none font-black text-[#1a1f2e] text-sm uppercase">
                                            {banks.map(b => <option key={b.id} value={b.id}>{b.name} (Bank)</option>)}
                                        </select>
                                        <ChevronDown size={18} className="absolute right-5 top-11 pointer-events-none text-gray-300" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Effective Date</label>
                                        <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-black text-[#1a1f2e]" />
                                    </div>
                                </>
                            )}

                            {formType === 'Income' && (
                                <>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-emerald-600 mb-3 uppercase tracking-widest ml-1">Income Amount ({symbol})</label>
                                        <input type="number" step="0.01" required value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-emerald-100 rounded-xl focus:border-emerald-500 outline-none font-black text-emerald-600" placeholder="0.00" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Transaction Description</label>
                                        <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#1a1f2e] outline-none font-black" placeholder="Salary, Bonus, Sell..." />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Income Category</label>
                                        <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none appearance-none font-black text-emerald-500 text-sm uppercase">
                                            {Array.from(new Map(categories.filter(c => c.type === 'Income').map(c => [c.name, c])).values()).map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                                        </select>
                                        <ChevronDown size={18} className="absolute right-5 top-11 pointer-events-none text-gray-300" />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Destination Bank</label>
                                        <select value={formData.sourceId} onChange={(e) => setFormData({ ...formData, sourceId: e.target.value, paymentMethod: 'Bank' })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none appearance-none font-black text-[#1a1f2e] text-sm uppercase">
                                            {banks.map(b => <option key={b.id} value={b.id}>{b.name} (Bank)</option>)}
                                        </select>
                                        <ChevronDown size={18} className="absolute right-5 top-11 pointer-events-none text-gray-300" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Effective Date</label>
                                        <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-black text-[#1a1f2e]" />
                                    </div>
                                </>
                            )}

                            {formType === 'Internal Transfer' && (
                                <>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Transfer Amount ({symbol})</label>
                                        <input type="number" step="0.01" required value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#1a1f2e] outline-none font-black text-[#1a1f2e]" placeholder="0.00" />
                                    </div>
                                    <div className="relative text-[#1a1f2e]">
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">From Bank</label>
                                        <select value={formData.sourceId} onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none appearance-none font-black text-[#1a1f2e] text-sm uppercase">
                                            {[...banks, ...cards].map(item => <option key={item.id} value={item.id}>{item.name} ({item.type || 'Bank'})</option>)}
                                        </select>
                                        <ChevronDown size={18} className="absolute right-5 top-11 pointer-events-none text-gray-300" />
                                    </div>
                                    <div className="relative text-[#1a1f2e]">
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">To Bank</label>
                                        <select value={formData.toSourceId} onChange={(e) => setFormData({ ...formData, toSourceId: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none appearance-none font-black text-[#1a1f2e] text-sm uppercase">
                                            {[...banks, ...cards].map(item => <option key={item.id} value={item.id}>{item.name} ({item.type || 'Bank'})</option>)}
                                        </select>
                                        <ChevronDown size={18} className="absolute right-5 top-11 pointer-events-none text-gray-300" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Transfer Date</label>
                                        <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-black text-[#1a1f2e]" />
                                    </div>
                                </>
                            )}

                            {formType === 'Credit Card Payment' && (
                                <>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Payment Amount ({symbol})</label>
                                        <input type="number" step="0.01" required value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#1a1f2e] outline-none font-black text-[#1a1f2e]" placeholder="0.00" />
                                    </div>
                                    <div className="relative text-[#1a1f2e]">
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Which Card?</label>
                                        <select value={formData.toSourceId} onChange={(e) => setFormData({ ...formData, toSourceId: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none appearance-none font-black text-[#1a1f2e] text-sm uppercase">
                                            {cards.filter(c => c.type === 'Credit Card').map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                        </select>
                                        <ChevronDown size={18} className="absolute right-5 top-11 pointer-events-none text-gray-300" />
                                    </div>
                                    <div className="relative text-[#1a1f2e]">
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">From Bank</label>
                                        <select value={formData.sourceId} onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none appearance-none font-black text-[#1a1f2e] text-sm uppercase">
                                            {banks.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                        </select>
                                        <ChevronDown size={18} className="absolute right-5 top-11 pointer-events-none text-gray-300" />
                                    </div>
                                    <div className="md:col-span-2 relative text-[#1a1f2e]">
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Transaction Category</label>
                                        <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none appearance-none font-black text-[#1a1f2e] text-sm uppercase">
                                            {Array.from(new Map(categories.filter(c => c.type === 'Expense').map(c => [c.name, c])).values()).map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                                        </select>
                                        <ChevronDown size={18} className="absolute right-5 top-11 pointer-events-none text-gray-300" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Payment Date</label>
                                        <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-black text-[#1a1f2e]" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Reference</label>
                                        <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-black" placeholder="Optional reference..." />
                                    </div>
                                </>
                            )}

                            {formType === 'Loan' && (
                                <>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Loan Amount ({symbol})</label>
                                        <input type="number" step="0.01" required value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl focus:border-[#1a1f2e] outline-none font-black text-[#1a1f2e]" placeholder="0.00" />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Lender Name</label>
                                        <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-black text-[#1a1f2e]" placeholder="Who is the loan for?" />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Interest Rate (%)</label>
                                        <input type="number" value={formData.interestRate} onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-black text-[#1a1f2e]" placeholder="Optional" />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Fund Source</label>
                                        <select value={formData.sourceId} onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none appearance-none font-black text-[#1a1f2e] text-sm uppercase">
                                            {banks.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                        </select>
                                        <ChevronDown size={18} className="absolute right-5 top-11 pointer-events-none text-gray-300" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest ml-1">Due Date</label>
                                        <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none font-black text-[#1a1f2e]" />
                                    </div>
                                </>
                            )}
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
