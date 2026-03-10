import React from 'react';
import { Plus, Calendar } from 'lucide-react';
import SummaryCards from './SummaryCards';
import DashboardChart from './DashboardChart';
import TransactionsList from './TransactionsList';

const Dashboard = ({ data, currency, rate, onAddClick, onUpdateUserField, onDeleteTransaction, selectedMonth, onMonthChange }) => {
    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-3xl font-black text-navy-primary tracking-tighter uppercase leading-none">Live Ledger</h2>
                    <p className="text-gray-400 mt-2 font-medium">Monitoring your financial flow in real-time.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group">
                        <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-navy-primary/40 group-focus-within:text-navy-primary transition-colors" size={18} />
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => onMonthChange(e.target.value)}
                            className="bg-white pl-14 pr-6 py-4 border border-[#e5e7eb] rounded-[1.5rem] font-black text-navy-primary uppercase tracking-[0.2em] focus:outline-none focus:ring-4 focus:ring-navy-primary/5 transition-all text-xs outline-none cursor-pointer shadow-sm"
                        />
                    </div>
                    <button
                        onClick={onAddClick}
                        className="flex items-center gap-3 px-8 py-4 bg-[#1a1f2e] text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-navy-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <Plus size={20} />
                        <span>Add Entry</span>
                    </button>
                </div>
            </header>

            <SummaryCards
                summary={data.summary}
                currency={currency}
                rate={rate}
                onUpdateUserField={onUpdateUserField}
            />

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                <DashboardChart
                    data={data.monthlyHistory}
                    currency={currency}
                    rate={rate}
                />
                <TransactionsList
                    transactions={data.transactions}
                    currency={currency}
                    rate={rate}
                    onDelete={onDeleteTransaction}
                />
            </div>
        </div>
    );
};

export default Dashboard;
