import React, { useRef, useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const DashboardChart = ({ data, currency, rate }) => {
    const chartRef = useRef(null);
    const [chartDataState, setChartDataState] = useState({
        datasets: [],
    });

    const navyColor = '#1a1f2e';
    const grayColor = '#e5e7eb';

    const convert = (val) => currency === 'PKR' ? val * rate : val;
    const symbol = currency === 'PKR' ? 'Rs.' : '$';

    useEffect(() => {
        const chart = chartRef.current;

        if (!chart) {
            return;
        }

        const ctx = chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(26, 31, 46, 0.2)');
        gradient.addColorStop(1, 'rgba(26, 31, 46, 0)');

        setChartDataState({
            labels: data.map(item => item.month),
            datasets: [
                {
                    label: 'Monthly Budget',
                    data: data.map(item => convert(item.budget)),
                    borderColor: grayColor,
                    borderDash: [5, 5],
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0,
                    stepped: true
                },
                {
                    label: 'Actual Spending',
                    data: data.map(item => convert(item.totalSpent)),
                    borderColor: navyColor,
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: navyColor,
                    pointBorderColor: '#fff',
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: navyColor,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                },
            ],
        });
    }, [data, currency]);

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#1a1f2e',
                    font: { weight: '600', size: 12 },
                    padding: 20,
                    usePointStyle: true,
                }
            },
            tooltip: {
                backgroundColor: '#1a1f2e',
                titleFont: { size: 14, weight: 'bold' },
                bodyFont: { size: 13 },
                padding: 12,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    title: function (context) {
                        return context[0].label;
                    },
                    label: function (context) {
                        if (context.datasetIndex === 1) {
                            const dataIndex = context.dataIndex;
                            const spent = data[dataIndex].totalSpent;
                            const budget = data[dataIndex].budget;
                            return `Spent: ${symbol}${convert(spent).toLocaleString()} / Budget: ${symbol}${convert(budget).toLocaleString()}`;
                        }
                        return null;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: '#f3f4f6',
                    drawBorder: false,
                },
                ticks: {
                    color: '#9ca3af',
                    font: { size: 11 },
                    callback: (value) => `${symbol}${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`
                }
            },
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: '#1a1f2e',
                    font: { weight: '600', size: 12 },
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index',
        },
        maintainAspectRatio: false
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#e5e7eb] flex-1 w-full overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-navy-primary">Historical Budget vs. Spending</h3>
                <div className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase">Trend Analysis ({currency})</div>
            </div>
            <div className="h-72">
                <Line ref={chartRef} options={options} data={chartDataState} />
            </div>
        </div>
    );
};

export default DashboardChart;
