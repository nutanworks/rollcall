
import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className = '', ...props }, ref) => {
  return (
    <div className={`mb-5 group ${className}`}>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 transition-colors group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400">
        {label}
      </label>
      <input
        ref={ref}
        className={`w-full px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 border rounded-xl shadow-sm 
        focus:outline-none focus:ring-4 focus:ring-opacity-20 transition-all duration-300 ease-out
        hover:border-indigo-300 dark:hover:border-indigo-600 focus:-translate-y-1 focus:shadow-lg
        ${error 
          ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
          : 'border-gray-200 dark:border-gray-700 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-indigo-500'
        }`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400 animate-pulse">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
