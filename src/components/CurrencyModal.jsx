import React from 'react';

const CurrencyModal = ({ onSelect }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
            <div className="bg-white p-10 rounded-[2rem] shadow-2xl max-w-md w-full mx-4 transform transition-all animate-in fade-in zoom-in duration-300">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-navy-primary rounded-2xl flex items-center justify-center text-white text-3xl font-black mb-6 shadow-lg shadow-navy-primary/20">
                        F
                    </div>
                    <h2 className="text-3xl font-bold text-navy-primary mb-2">Welcome to FinTracker</h2>
                    <p className="text-gray-500 mb-8 font-medium">Please select your preferred currency to start tracking your finances.</p>

                    <div className="grid grid-cols-1 gap-4 w-full">
                        <button
                            onClick={() => onSelect('USD')}
                            className="group flex items-center justify-between px-6 py-5 border-2 border-gray-100 rounded-2xl hover:border-navy-primary hover:bg-navy-primary transition-all duration-300 transform hover:-translate-y-1"
                        >
                            <div className="text-left">
                                <span className="block text-lg font-bold text-navy-primary group-hover:text-white transition-colors">Track in USD</span>
                                <span className="text-sm text-gray-400 group-hover:text-white/70 transition-colors">United States Dollar ($)</span>
                            </div>
                            <span className="text-2xl font-bold text-navy-primary group-hover:text-white transition-colors">$</span>
                        </button>

                        <button
                            onClick={() => onSelect('PKR')}
                            className="group flex items-center justify-between px-6 py-5 border-2 border-gray-100 rounded-2xl hover:border-navy-primary hover:bg-navy-primary transition-all duration-300 transform hover:-translate-y-1"
                        >
                            <div className="text-left">
                                <span className="block text-lg font-bold text-navy-primary group-hover:text-white transition-colors">Track in PKR</span>
                                <span className="text-sm text-gray-400 group-hover:text-white/70 transition-colors">Pakistani Rupee (Rs.)</span>
                            </div>
                            <span className="text-xl font-bold text-navy-primary group-hover:text-white transition-colors">Rs.</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CurrencyModal;
