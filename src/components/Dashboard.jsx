import React from 'react';
import { Plus } from 'lucide-react';
import SummaryCards from './SummaryCards';
import DashboardChart from './DashboardChart';
import TransactionsList from './TransactionsList';

const Dashboard = ({ data, currency, rate, onAddClick, onUpdateUserField, onDeleteTransaction }) => {
    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-3xl font-black text-navy-primary tracking-tighter uppercase leading-none">Live Ledger</h2>
                    <p className="text-gray-400 mt-2 font-medium">Monitoring your financial flow in real-time.</p>
                </div>
                <div className="flex items-center gap-4">
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
