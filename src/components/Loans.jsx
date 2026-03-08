import React, { useState } from 'react';
import { Plus, Trash2, HandCoins, User, Check, X, CreditCard as CardIcon } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const Loans = ({ currency, rate, loans }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newLoan, setNewLoan] = useState({ personName: '', totalLoanAmount: '' });

    // For updating payments
    const [updatingLoanId, setUpdatingLoanId] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [confirming, setConfirming] = useState(null);

    const symbol = currency === 'PKR' ? 'Rs.' : '$';
    const convert = (val) => currency === 'PKR' ? val * rate : val;

    const handleAddLoan = async (e) => {
        e.preventDefault();
        try {
            const totalUSD = currency === 'PKR' ? parseFloat(newLoan.totalLoanAmount) / rate : parseFloat(newLoan.totalLoanAmount);

            await addDoc(collection(db, "loans"), {
                personName: newLoan.personName,
                totalLoanAmount: totalUSD,
                amountPaid: 0,
                remainingBalance: totalUSD
            });

            setIsModalOpen(false);
            setNewLoan({ personName: '', totalLoanAmount: '' });
        } catch (error) {
            console.error('Add loan error:', error);
        }
    };

    const handleUpdatePayment = async (loan) => {
        const paymentUSD = currency === 'PKR' ? parseFloat(paymentAmount) / rate : parseFloat(paymentAmount);
        if (isNaN(paymentUSD) || paymentUSD <= 0) return;

        const newAmountPaid = (loan.amountPaid || 0) + paymentUSD;
        // make sure it doesn't exceed total
        const finalPaid = Math.min(newAmountPaid, loan.totalLoanAmount);
        const newRemaining = loan.totalLoanAmount - finalPaid;

        try {
            const loanRef = doc(db, "loans", loan.id);
            await updateDoc(loanRef, {
                amountPaid: finalPaid,
                remainingBalance: newRemaining
            });
            setUpdatingLoanId(null);
            setPaymentAmount('');
        } catch (err) {
            console.error("Update payment error:", err);
        }
    };

    const handleDelete = async (t) => {
        if (confirming === t.id) {
            try {
                await deleteDoc(doc(db, "loans", t.id));
            } catch (err) {
                console.error("Delete loan error:", err);
            }
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
                    <h2 className="text-3xl font-black text-navy-primary tracking-tighter uppercase leading-none">Loan Registry</h2>
                    <p className="text-gray-400 mt-2 font-medium">Monitoring {loans.length} active outward loans in {currency}.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-8 py-4 bg-[#1a1f2e] text-white rounded-[1.5rem] text-[10px] font-black hover:bg-navy-primary/95 transition-all shadow-2xl shadow-navy-primary/30 active:scale-95 uppercase tracking-[0.2em]"
                >
                    <Plus size={20} />
                    <span>Lend Money</span>
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {loans.map((loan) => {
                    const usagePercent = loan.totalLoanAmount > 0
                        ? Math.min(Math.round(((loan.amountPaid || 0) / loan.totalLoanAmount) * 100), 100)
                        : 0;

                    return (
                        <div key={loan.id} className="group relative">
                            {/* Premium Card UI */}
                            <div className="bg-gradient-to-br from-[#1a1f2e] via-[#2d324e] to-[#1a1f2e] p-12 rounded-[3rem] text-white shadow-[0_30px_60px_rgba(26,31,46,0.3)] relative overflow-hidden transition-all group-hover:shadow-[0_40px_80px_rgba(26,31,46,0.4)]">
                                <div className="absolute top-12 right-12 text-white/10 group-hover:text-white/20 transition-all pointer-events-none">
                                    <HandCoins size={80} />
                                </div>

                                <div className="flex flex-col h-full relative z-10">
                                    <div className="mb-14">
                                        <h3 className="text-3xl font-black tracking-tight uppercase opacity-95 flex items-center gap-3">
                                            <User size={28} className="text-white/40" />
                                            {loan.personName}
                                        </h3>
                                        <div className="flex justify-between items-center mt-4">
                                            <div className="flex items-center gap-3 text-emerald-400 text-[9px] font-black tracking-[0.4em]">
                                                <HandCoins size={14} />
                                                OUTWARD ASSET
                                            </div>
                                            <button
                                                onClick={() => handleDelete(loan)}
                                                className={`p-2 rounded-lg transition-all duration-300 ${confirming === loan.id
                                                    ? 'bg-rose-500 text-white shadow-lg animate-pulse scale-110'
                                                    : 'opacity-0 group-hover:opacity-100 text-rose-200 hover:text-rose-500 hover:bg-rose-500/20'}`}
                                            >
                                                <Trash2 size={confirming === loan.id ? 14 : 18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <div className="flex flex-col gap-2">
                                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Total Lent</p>
                                            <p className="text-2xl font-bold tracking-tighter">
                                                {symbol}{convert(loan.totalLoanAmount).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="text-right flex flex-col gap-2">
                                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Remaining Owed</p>
                                            <p className={`text-4xl font-black tracking-tighter ${loan.remainingBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                {symbol}{convert(loan.remainingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-white/5 rounded-full blur-[100px] pointer-events-none"></div>
                            </div>

                            {/* Payment Logic UI */}
                            <div className="mt-8 bg-white p-10 rounded-[2.5rem] border border-[#e5e7eb] shadow-sm flex flex-col gap-6">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4 font-black text-navy-primary uppercase text-[10px] tracking-[0.3em]">
                                        <CardIcon size={20} className="text-gray-300" />
                                        <span>Repayment Progress</span>
                                    </div>
                                    <span className="text-2xl font-black text-emerald-500">
                                        {usagePercent}%
                                    </span>
                                </div>

                                <div className="w-full bg-gray-50 h-5 rounded-full overflow-hidden p-1.5 border border-gray-100 shadow-inner">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000 shadow-xl bg-emerald-500 shadow-emerald-500/30"
                                        style={{ width: `${usagePercent}%` }}
                                    ></div>
                                </div>

                                <div className="flex justify-between items-center pt-2">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        Returned: {symbol}{convert(loan.amountPaid || 0).toLocaleString()}
                                    </div>

                                    {updatingLoanId === loan.id ? (
                                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                                            <input
                                                type="number"
                                                placeholder="Amount..."
                                                value={paymentAmount}
                                                onChange={(e) => setPaymentAmount(e.target.value)}
                                                className="w-24 px-3 py-1.5 text-xs font-bold border-b-2 border-navy-primary/30 focus:border-navy-primary outline-none"
                                            />
                                            <button onClick={() => handleUpdatePayment(loan)} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100">
                                                <Check size={14} />
                                            </button>
                                            <button onClick={() => setUpdatingLoanId(null)} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setUpdatingLoanId(loan.id)}
                                            disabled={loan.remainingBalance <= 0}
                                            className="px-4 py-2 bg-navy-primary/5 text-navy-primary text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-navy-primary/10 transition-colors disabled:opacity-50"
                                        >
                                            Record Payment
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1f2e]/60 backdrop-blur-md px-4 text-left">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-10">
                            <h2 className="text-2xl font-black text-navy-primary mb-10 tracking-tight uppercase">New Loan Agreement</h2>
                            <form onSubmit={handleAddLoan} className="space-y-8">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Borrower Name / Entity</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. John Doe"
                                        value={newLoan.personName}
                                        onChange={(e) => setNewLoan({ ...newLoan, personName: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-navy-primary/5 focus:border-navy-primary outline-none font-bold text-navy-primary transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Total Loan Sum ({symbol})</label>
                                    <input
                                        type="number"
                                        required
                                        value={newLoan.totalLoanAmount}
                                        onChange={(e) => setNewLoan({ ...newLoan, totalLoanAmount: e.target.value })}
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-navy-primary transition-all"
                                    />
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
                                    >Lend Funds</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Loans;
