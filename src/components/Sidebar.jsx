import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ReceiptText, Wallet, CreditCard, LogOut, RefreshCw, HandCoins, PieChart } from 'lucide-react';

const Sidebar = ({ currency, onToggleCurrency, onSettingsClick, onLogout }) => {
    const menuItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
        { icon: <ReceiptText size={20} />, label: 'Transactions', path: '/transactions' },
        { icon: <PieChart size={20} />, label: 'Budget Segments', path: '/segments' },
        { icon: <Wallet size={20} />, label: 'Banks', path: '/banks' },
        { icon: <CreditCard size={20} />, label: 'Credit Cards', path: '/cards' },
        { icon: <HandCoins size={20} />, label: 'Loans', path: '/loans' },
    ];

    return (
        <div className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-[#e5e7eb] flex flex-col pt-8 z-50">
            <div className="px-6 mb-10">
                <h1 className="text-2xl font-bold text-navy-primary flex items-center gap-2">
                    <div className="w-8 h-8 bg-navy-primary rounded-lg flex items-center justify-center text-white font-black">F</div>
                    FinTracker
                </h1>
            </div>

            <nav className="flex-1 px-4">
                <ul className="space-y-2">
                    {menuItems.map((item, index) => (
                        <li key={index}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive
                                        ? 'bg-navy-primary text-white shadow-md'
                                        : 'text-gray-500 hover:text-navy-primary hover:bg-gray-50'
                                    }`
                                }
                            >
                                {item.icon}
                                {item.label}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="px-4 py-6 border-t border-gray-100 mt-auto space-y-2">
                <button
                    onClick={onToggleCurrency}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-navy-primary border border-gray-100 hover:border-navy-primary hover:bg-navy-primary hover:text-white transition-all group"
                >
                    <RefreshCw size={18} className="text-gray-400 group-hover:text-white transition-colors" />
                    Switch to {currency === 'USD' ? 'PKR' : 'USD'}
                </button>

                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                    <LogOut size={20} />
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
