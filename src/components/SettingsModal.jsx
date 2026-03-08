import { useState, useEffect } from 'react';
import { X, CheckCircle, Loader2, Save, User, Wallet } from 'lucide-react';
import { db } from '../firebase'
import { doc, updateDoc } from 'firebase/firestore'

const SettingsModal = ({ isOpen, onClose, userData, currency, rate }) => {
    const [salary, setSalary] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const symbol = currency === 'PKR' ? 'Rs.' : '$';

    useEffect(() => {
        if (userData && isOpen) {
            // UI shows in PKR/USD based on selection, but we store as base (USD) or handle conversion
            const initialSalary = currency === 'PKR' ? (userData.monthlySalary || 0) * rate : (userData.monthlySalary || 0);
            setSalary(initialSalary.toString());
        }
    }, [userData, isOpen, currency, rate]);

    const handleSave = async (e) => {
        e.preventDefault();
        const numSalary = parseFloat(salary);
        if (isNaN(numSalary) || numSalary < 0) {
            setError('Please enter a valid salary amount');
            return;
        }

        setIsSaving(true);
        setError('');

        try {
            // Convert back to USD for base storage
            const baseSalary = currency === 'PKR' ? numSalary / rate : numSalary;

            const userRef = doc(db, "users", userData.id || "primary_user");
            await updateDoc(userRef, {
                monthlySalary: baseSalary
            });

            setIsSuccess(true);
            setTimeout(() => {
                setIsSuccess(false);
                setIsSaving(false);
                onClose();
            }, 1200);
        } catch (error) {
            console.error(error);
            setError('Failed to update cloud profile');
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1a1f2e]/60 backdrop-blur-md px-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
                {isSuccess && (
                    <div className="absolute inset-0 z-20 bg-white/95 flex flex-col items-center justify-center text-navy-primary font-bold">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle size={48} className="text-green-500" />
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Profile Updated</h3>
                        <p className="text-gray-400 mt-2 font-medium">Real-time sync complete.</p>
                    </div>
                )}

                <div className="p-10">
                    <header className="flex justify-between items-center mb-10">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-navy-primary/5 rounded-2xl text-navy-primary">
                                <User size={24} />
                            </div>
                            <h2 className="text-2xl font-black text-navy-primary tracking-tight">Fin Profile</h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors">
                            <X size={24} />
                        </button>
                    </header>

                    <form onSubmit={handleSave} className="space-y-8">
                        {error && <p className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold text-center border border-red-100">{error}</p>}

                        <div className="relative group">
                            <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest pl-1">Baseline Monthly Revenue (Salary)</label>
                            <div className="relative">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-navy-primary/40 group-focus-within:text-navy-primary transition-colors">
                                    <Wallet size={20} />
                                </div>
                                <input
                                    type="number"
                                    required
                                    value={salary}
                                    onChange={(e) => setSalary(e.target.value)}
                                    className="w-full pl-14 pr-5 py-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-navy-primary/5 focus:border-navy-primary outline-none font-black text-navy-primary text-2xl transition-all"
                                    placeholder="0.00"
                                />
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-navy-primary/20 text-sm tracking-widest uppercase">{currency}</div>
                            </div>
                            <p className="mt-3 text-[10px] text-gray-400 font-medium italic">This value determines your "Net Worth" projection and budget allocation metrics.</p>
                        </div>

                        <button
                            type="submit"
                            disabled={isSaving}
                            className="w-full py-5 bg-[#1a1f2e] text-white rounded-[1.5rem] font-bold shadow-2xl shadow-navy-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                            <span className="tracking-widest uppercase">{isSaving ? 'Synching...' : 'Commit Changes'}</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
