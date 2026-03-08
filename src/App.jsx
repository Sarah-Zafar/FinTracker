import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { db } from './firebase'
import { collection, onSnapshot, query, orderBy, doc, setDoc, addDoc, deleteDoc, runTransaction } from 'firebase/firestore'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Transactions from './components/Transactions'
import Banks from './components/Banks'
import CreditCards from './components/CreditCards'
import Loans from './components/Loans'
import BudgetSegments from './components/BudgetSegments'
import LoadingSpinner from './components/LoadingSpinner'
import CurrencyModal from './components/CurrencyModal'
import TransactionModal from './components/TransactionModal'
import SettingsModal from './components/SettingsModal'

function App() {
  const [transactions, setTransactions] = useState([]);
  const [banks, setBanks] = useState([]);
  const [cards, setCards] = useState([]);
  const [loans, setLoans] = useState([]);
  const [categories, setCategories] = useState([]);
  const [userData, setUserData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem('fintrackerAuth') === 'true');
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);

  const CONVERSION_RATE = 280;

  useEffect(() => {
    // 1. Transactions Listener
    const qTrans = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubTrans = onSnapshot(qTrans, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTransactions(data);
    });

    // 2. Banks Listener
    const unsubBanks = onSnapshot(collection(db, "banks"), (snap) => {
      setBanks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3. Cards Listener
    const unsubCards = onSnapshot(collection(db, "cards"), (snap) => {
      setCards(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3.5. Loans Listener
    const unsubLoans = onSnapshot(collection(db, "loans"), (snap) => {
      setLoans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 4. Categories Listener & Seeder
    const unsubCats = onSnapshot(collection(db, "categories"), (snap) => {
      if (snap.empty) {
        // Seed default categories from the "Outgoings" image
        const defaults = [
          "Electricity Bill", "Gas Bill", "Water Bill", "Internet Bill",
          "Society Bill", "Maid Salary", "Maali Salary", "Maintenance",
          "Petrol (Corolla)", "Petrol (Changan)", "Grocery", "Social expenses",
          "Committees", "Savings", "Investments"
        ];
        defaults.forEach(async (cat) => {
          await addDoc(collection(db, "categories"), { name: cat, type: 'Expense' });
        });
      } else {
        setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    });

    // 5. User Data Listener
    const unsubUser = onSnapshot(collection(db, "users"), (snap) => {
      if (!snap.empty) {
        setUserData({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        const userRef = doc(collection(db, "users"), "primary_user");
        setDoc(userRef, { monthlySalary: 5000, budgetLimit: 3000, totalBalance: 0 });
      }
      setLoading(false);
    });

    return () => {
      unsubTrans(); unsubBanks(); unsubCards(); unsubLoans(); unsubCats(); unsubUser();
    };
  }, []);

  const handleUpdateUserField = async (field, value) => {
    try {
      const userRef = doc(db, "users", userData.id || "primary_user");
      await setDoc(userRef, { [field]: value }, { merge: true });
    } catch (err) {
      console.error("User update failure:", err);
    }
  };

  const handleDeleteTransaction = async (transaction) => {
    try {
      const transRef = doc(db, "transactions", transaction.id);
      await deleteDoc(transRef);
    } catch (err) {
      console.error("Deletion/Sync Failure:", err);
      alert("Operational Failure: Could not remove transaction from cloud. Please check connectivity.");
    }
  };

  const handleCurrencySelect = (selectedCurrency) => setCurrency(selectedCurrency);
  const toggleCurrency = () => setCurrency(prev => prev === 'USD' ? 'PKR' : 'USD');

  const calculateDashboardData = () => {
    if (!userData) return null;

    // Use manually set totalDebt from Firestore if available, otherwise aggregate
    const aggregateDebt = cards.reduce((acc, curr) => acc + (curr.spent || 0), 0);
    const totalDebt = userData.totalDebt !== undefined ? userData.totalDebt : aggregateDebt;

    const currentMonth = new Date().toISOString().split('-').slice(0, 2).join('-');
    const currentYear = new Date().getFullYear();
    const currentMonthNum = new Date().getMonth();
    const daysInMonth = new Date(currentYear, currentMonthNum + 1, 0).getDate();

    const monthlySpending = transactions
      .filter(t => t.date.startsWith(currentMonth) && (t.amount || 0) < 0)
      .reduce((acc, curr) => acc + Math.abs(curr.amount || 0), 0);

    const baseSalary = userData.monthlySalary || 5000;
    const globalBudgetLimit = userData.budgetLimit || 3000;

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyDataMap = {};

    transactions.forEach(t => {
      const isExpense = (t.amount || 0) < 0;
      if (isExpense && t.date) {
        const monthKey = t.date.substring(0, 7);
        if (!monthlyDataMap[monthKey]) {
          monthlyDataMap[monthKey] = 0;
        }
        monthlyDataMap[monthKey] += Math.abs(t.amount || 0);
      }
    });

    const sortedMonths = Object.keys(monthlyDataMap).sort();

    const monthlyHistory = sortedMonths.map(monthKey => {
      const year = parseInt(monthKey.substring(0, 4));
      const monthNum = parseInt(monthKey.substring(5, 7));
      const monthLabel = `${monthNames[monthNum - 1]} ${year.toString().slice(-2)}`;

      const monthBudget = (userData.monthlyBudgets && userData.monthlyBudgets[monthKey])
        ? userData.monthlyBudgets[monthKey]
        : globalBudgetLimit;

      return {
        month: monthLabel,
        totalSpent: monthlyDataMap[monthKey],
        budget: monthBudget
      };
    });

    if (monthlyHistory.length === 0) {
      const year = parseInt(currentMonth.substring(0, 4));
      const monthNum = parseInt(currentMonth.substring(5, 7));
      const monthLabel = `${monthNames[monthNum - 1]} ${year.toString().slice(-2)}`;

      const monthBudget = (userData.monthlyBudgets && userData.monthlyBudgets[currentMonth])
        ? userData.monthlyBudgets[currentMonth]
        : globalBudgetLimit;

      monthlyHistory.push({
        month: monthLabel,
        totalSpent: 0,
        budget: monthBudget
      });
    }

    const totalLoansOut = loans.reduce((acc, curr) => acc + (curr.remainingBalance || 0), 0);
    const netWorth = (baseSalary - monthlySpending) + totalLoansOut - totalDebt;

    return {
      summary: {
        remainingSalary: baseSalary - monthlySpending,
        baseSalary: baseSalary,
        remainingBudget: globalBudgetLimit - monthlySpending,
        budgetLimit: globalBudgetLimit,
        debt: totalDebt,
        loansOut: totalLoansOut,
        netWorth: netWorth,
        budgetUse: Math.min(Math.round((monthlySpending / globalBudgetLimit) * 100), 100)
      },
      transactions: transactions.slice(0, 5),
      monthlyHistory: monthlyHistory
    };
  };

  const dashboardData = calculateDashboardData();

  if (loading || !dashboardData) {
    return <LoadingSpinner />;
  }

  const handlePinPress = (digit) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
    }
  };

  const handleClear = () => setPin('');

  const handleEnter = () => {
    if (pin === "1996") {
      setIsAuthenticated(true);
      localStorage.setItem('fintrackerAuth', 'true');
    } else {
      setShake(true);
      setPin('');
      setTimeout(() => setShake(false), 500);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-[#1a1f2e] flex flex-col items-center justify-center z-50 text-white font-sans">
        <style>
          {`
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-10px); }
              75% { transform: translateX(10px); }
            }
            .animate-shake { animation: shake 0.3s ease-in-out; }
          `}
        </style>
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-black tracking-tighter uppercase mb-2 text-white">Secure Access</h1>
          <p className="text-gray-400 font-medium tracking-widest text-sm uppercase">Enter 4-Digit PIN</p>
        </div>

        <div className="mb-10 flex gap-4 justify-center h-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${pin.length > i ? 'bg-white border-white scale-110' : 'border-white/20'}`} />
          ))}
        </div>

        <div className={`bg-[#1e2536] p-8 rounded-2xl shadow-2xl border border-white/5 ${shake ? 'animate-shake' : ''}`}>
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handlePinPress(num.toString())}
                className="w-16 h-16 rounded-full bg-[#1a1f2e] text-2xl font-black flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all shadow-lg border border-white/5"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 text-sm font-black uppercase tracking-widest flex items-center justify-center hover:bg-rose-500/20 active:scale-95 transition-all border border-rose-500/20"
            >
              CLR
            </button>
            <button
              onClick={() => handlePinPress('0')}
              className="w-16 h-16 rounded-full bg-[#1a1f2e] text-2xl font-black flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all shadow-lg border border-white/5"
            >
              0
            </button>
            <button
              onClick={handleEnter}
              className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 text-sm font-black uppercase tracking-widest flex items-center justify-center hover:bg-emerald-500/20 active:scale-95 transition-all border border-emerald-500/20"
            >
              ENT
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currency) {
    return <CurrencyModal onSelect={handleCurrencySelect} />;
  }

  return (
    <BrowserRouter>
      <div className="flex bg-[#f8f9fa] min-h-screen font-sans">
        <Sidebar
          currency={currency}
          onToggleCurrency={toggleCurrency}
          onSettingsClick={() => setIsSettingsOpen(true)}
        />

        <main className="flex-1 ml-64 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={
                <Dashboard
                  data={dashboardData}
                  currency={currency}
                  rate={CONVERSION_RATE}
                  onAddClick={() => setIsModalOpen(true)}
                  onUpdateUserField={handleUpdateUserField}
                  onDeleteTransaction={handleDeleteTransaction}
                />
              } />
              <Route path="/transactions" element={
                <Transactions
                  currency={currency}
                  rate={CONVERSION_RATE}
                  onAddClick={() => setIsModalOpen(true)}
                  externalTransactions={transactions}
                  categories={categories}
                  onDeleteTransaction={handleDeleteTransaction}
                />
              } />
              <Route path="/segments" element={
                <BudgetSegments
                  currency={currency}
                  rate={CONVERSION_RATE}
                  externalTransactions={transactions}
                  categories={categories}
                />
              } />
              <Route path="/banks" element={
                <Banks
                  currency={currency}
                  rate={CONVERSION_RATE}
                  banks={banks}
                  transactions={transactions}
                />
              } />
              <Route path="/cards" element={
                <CreditCards
                  currency={currency}
                  rate={CONVERSION_RATE}
                  cards={cards}
                  transactions={transactions}
                />
              } />
              <Route path="/loans" element={
                <Loans
                  currency={currency}
                  rate={CONVERSION_RATE}
                  loans={loans}
                />
              } />
              <Route path="*" element={
                <Dashboard
                  data={dashboardData}
                  currency={currency}
                  rate={CONVERSION_RATE}
                  onAddClick={() => setIsModalOpen(true)}
                  onUpdateUserField={handleUpdateUserField}
                  onDeleteTransaction={handleDeleteTransaction}
                />
              } />
            </Routes>
          </div>
        </main>

        <TransactionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          currency={currency}
          rate={CONVERSION_RATE}
          categories={categories}
          banks={banks}
          cards={cards}
          userData={userData}
        />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          userData={userData}
          currency={currency}
          rate={CONVERSION_RATE}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
