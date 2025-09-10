import React, { useState, useEffect, useRef } from 'react';
import Icons from './Icons';

const FilterDropdown: React.FC<{
    options: readonly string[];
    selectedValue: string;
    onSelect: (value: string) => void;
    tooltip?: string;
    label: string;
}> = ({ options, selectedValue, onSelect, tooltip, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (option: string) => {
        onSelect(option);
        setIsOpen(false);
    };

    return (
        <div className="relative group" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between gap-3 rounded-lg bg-[#1A1A1A] py-2 px-3 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] transition-all duration-300 focus:ring-2 focus:ring-[#F1C87A]"
                title={tooltip}
            >
                <div className="flex items-baseline gap-1.5">
                    <span className="text-gray-400">{label}:</span>
                    <span className="font-semibold text-white">{selectedValue}</span>
                </div>
                <span className={`transition-transform duration-200 text-gray-400 ${isOpen ? 'rotate-180' : ''}`}>
                    <Icons.ChevronDown />
                </span>
            </button>
            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg shadow-lg z-10 animate-fade-in-up min-w-max">
                    <ul className="py-1 max-h-60 overflow-y-auto">
                        {options.map(option => (
                            <li key={option}>
                                <button
                                    onClick={() => handleSelect(option)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#2A2A2A] hover:text-[#F1C87A] transition-colors"
                                >
                                    {option}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default FilterDropdown;