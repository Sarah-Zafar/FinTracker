import React from 'react';

const LoadingSpinner = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8f9fa]">
            <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-navy-primary"></div>
                <div className="absolute top-0 left-0 animate-pulse rounded-full h-16 w-16 bg-navy-primary/10"></div>
            </div>
            <p className="mt-6 text-navy-primary font-bold tracking-widest text-sm uppercase">Loading FinTracker</p>
        </div>
    );
};

export default LoadingSpinner;
