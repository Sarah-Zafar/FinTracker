import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors());

// Global Category State
let categories = [
    { name: 'Salary', type: 'Income', group: 'Personal' },
    { name: 'Savings', type: 'Income', group: 'Financial' },
    { name: 'Electricity Bill', type: 'Expense', group: 'Utilities' },
    { name: 'Gas Bill', type: 'Expense', group: 'Utilities' },
    { name: 'Water Bill', type: 'Expense', group: 'Utilities' },
    { name: 'Internet Bill', type: 'Expense', group: 'Utilities' },
    { name: 'Society Bill', type: 'Expense', group: 'Household' },
    { name: 'Maid Salary', type: 'Expense', group: 'Household' },
    { name: 'Maali Salary', type: 'Expense', group: 'Household' },
    { name: 'Maintenance', type: 'Expense', group: 'Household' },
    { name: 'Petrol (Corolla)', type: 'Expense', group: 'Transport' },
    { name: 'Petrol (Changan)', type: 'Expense', group: 'Transport' },
    { name: 'Committees', type: 'Expense', group: 'Life' },
    { name: 'Eid Expenses', type: 'Expense', group: 'Life' },
    { name: 'Qurbani Expense', type: 'Expense', group: 'Life' },
    { name: 'Credit card Payment (MCB)', type: 'Expense', group: 'Financial' },
    { name: 'Credit card Payment (UBL)', type: 'Expense', group: 'Financial' },
    { name: 'Investments', type: 'Expense', group: 'Financial' },
    { name: 'Grocery', type: 'Expense', group: 'Household' },
];

// Bank Data
let banks = [
    { id: 1, name: 'MCB Bank', accountNumber: '****5678', initialBalance: 12000, type: 'Savings' },
    { id: 2, name: 'UBL Bank', accountNumber: '****1234', initialBalance: 8000, type: 'Current' },
];

// Credit Card Data
let creditCards = [
    { id: 1, name: 'MCB Platinum', limit: 200000, statementDate: '5th', spent: 0 },
    { id: 2, name: 'UBL Visa', limit: 150000, statementDate: '15th', spent: 0 },
];

let transactions = [
    { id: 1, name: "March Salary Deposit", date: "2026-03-05", category: "Salary", amount: 5000.00, paymentMethod: 'Bank', paymentSource: "MCB Bank" },
    { id: 2, name: "Electricity Monthly", date: "2026-03-01", category: "Electricity Bill", amount: -150.00, paymentMethod: 'Bank', paymentSource: "MCB Bank" },
];

const getSortedTransactions = () => {
    return [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
};

// Dynamic Balance Calculations
const getFinancialRealities = () => {
    // 1. Calculate Bank Balances
    const calculatedBanks = banks.map(bank => {
        const sum = transactions
            .filter(t => t.paymentMethod === 'Bank' && t.paymentSource === bank.name)
            .reduce((acc, curr) => acc + curr.amount, 0);
        return { ...bank, currentBalance: bank.initialBalance + sum };
    });

    // 2. Calculate Credit Card Debt
    const calculatedCards = creditCards.map(card => {
        // Debt increases when we buy things on card (negative amount transaction)
        const purchases = transactions
            .filter(t => t.paymentMethod === 'Card' && t.paymentSource === card.name)
            .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

        // Debt decreases when we PAY a card from a BANK
        // We look for transactions where the category includes the card name and its a payment
        const payments = transactions
            .filter(t => t.paymentMethod === 'Bank' && t.category.includes('Credit card Payment') && t.category.includes(card.name.split(' ')[0]))
            .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

        return { ...card, spent: purchases - payments };
    });

    return { calculatedBanks, calculatedCards };
};

app.get('/api/categories', (req, res) => res.json(categories));

app.post('/api/categories', (req, res) => {
    const { name, type } = req.body;
    if (categories.find(c => c.name.toLowerCase() === name.toLowerCase())) return res.status(400).json({ message: "Exists" });
    categories.push({ name, type: type || 'Expense' });
    res.status(201).json({ name });
});

app.get('/api/banks', (req, res) => {
    const { calculatedBanks } = getFinancialRealities();
    res.json(calculatedBanks);
});

app.post('/api/banks', (req, res) => {
    banks.push({ id: Date.now(), ...req.body });
    res.status(201).json({ success: true });
});

app.get('/api/cards', (req, res) => {
    const { calculatedCards } = getFinancialRealities();
    res.json(calculatedCards);
});

app.post('/api/cards', (req, res) => {
    creditCards.push({ id: Date.now(), spent: 0, ...req.body });
    res.status(201).json({ success: true });
});

app.get('/api/dashboard', (req, res) => {
    const { calculatedBanks, calculatedCards } = getFinancialRealities();
    const sorted = getSortedTransactions();

    const totalBank = calculatedBanks.reduce((acc, curr) => acc + curr.currentBalance, 0);
    const totalDebt = calculatedCards.reduce((acc, curr) => acc + curr.spent, 0);
    const marchSpending = sorted
        .filter(t => t.date.includes('-03-') && t.amount < 0)
        .reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

    res.json({
        summary: {
            netWorth: totalBank - totalDebt,
            bankBalance: totalBank,
            debt: totalDebt,
            budgetUse: Math.min(Math.round((marchSpending / 3000) * 100), 100),
            budgetLimit: 3000
        },
        transactions: sorted.slice(0, 5),
        monthlyHistory: [
            { month: "Jan", totalSpent: 1900 },
            { month: "Feb", totalSpent: 2150 },
            { month: "Mar", totalSpent: Math.round(marchSpending) }
        ]
    });
});

app.get('/api/transactions', (req, res) => res.json(getSortedTransactions()));

app.post('/api/transactions', (req, res) => {
    const { name, amount, category, date, type, paymentMethod, paymentSource } = req.body;
    transactions.unshift({
        id: Date.now(),
        name,
        date,
        category,
        amount: type === 'Income' ? Math.abs(Number(amount)) : -Math.abs(Number(amount)),
        paymentMethod,
        paymentSource
    });
    res.status(201).json({ success: true });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
