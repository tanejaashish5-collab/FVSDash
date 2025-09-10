import React, { useState, useEffect, useRef } from 'react';
import Icons from './Icons';

const DatePicker: React.FC<{
    selectedDate: string;
    onDateChange: (date: string) => void;
    placeholder: string;
    minDate?: string;
}> = ({ selectedDate, onDateChange, placeholder, minDate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const initialDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
    if (isNaN(initialDate.getTime())) {
        initialDate.setTime(new Date().getTime());
    }
    const [currentDate, setCurrentDate] = useState(initialDate);
    const datePickerRef = useRef<HTMLDivElement>(null);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const changeMonth = (offset: number) => {
        setCurrentDate(new Date(year, month + offset, 1));
    };

    const handleDateSelect = (day: number) => {
        const newDate = new Date(year, month, day);
        onDateChange(newDate.toISOString().split('T')[0]);
        setIsOpen(false);
    };
    
    const minDateObj = minDate ? new Date(minDate + 'T00:00:00') : null;
    if (minDateObj) {
        minDateObj.setHours(0, 0, 0, 0);
    }

    return (
        <div className="relative" ref={datePickerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full rounded-lg bg-[#1A1A1A] py-2 px-3 text-sm text-left text-white outline-none ring-1 ring-inset ring-[#2A2A2A] transition-all duration-300 focus:ring-2 focus:ring-[#F1C87A] flex items-center justify-between"
            >
                <span className={selectedDate ? 'text-white' : 'text-gray-400'}>
                    {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString() : placeholder}
                </span>
                <Icons.DatePickerIcon />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 z-20 bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A] shadow-2xl animate-fade-in-up w-72">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => changeMonth(-1)} className="p-1 rounded-md hover:bg-[#2A2A2A] text-[#B3B3B3]"><Icons.ChevronLeft /></button>
                        <h3 className="text-sm font-bold text-white">{monthNames[month]} {year}</h3>
                        <button onClick={() => changeMonth(1)} className="p-1 rounded-md hover:bg-[#2A2A2A] text-[#B3B3B3]"><Icons.ChevronRight /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs text-[#B3B3B3]">
                        {daysOfWeek.map(day => <div key={day} className="w-8 h-8 flex items-center justify-center">{day.slice(0,2)}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1 mt-2">
                        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="w-8 h-8"></div>)}
                        {Array.from({ length: daysInMonth }).map((_, day) => {
                            const date = day + 1;
                            const fullDate = new Date(year, month, date);
                            const isSelected = selectedDate && new Date(selectedDate + 'T00:00:00').toDateString() === fullDate.toDateString();
                            
                            const currentDayDate = new Date(year, month, date);
                            currentDayDate.setHours(0, 0, 0, 0);
                            const isDisabled = !!minDateObj && currentDayDate < minDateObj;
                            
                            return (
                                <button
                                    key={date}
                                    onClick={() => !isDisabled && handleDateSelect(date)}
                                    disabled={isDisabled}
                                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm transition-colors
                                        ${isSelected ? 'bg-[#F1C87A] text-black font-bold' : 'text-white hover:bg-[#2A2A2A]'}
                                        ${isDisabled ? 'text-gray-600 cursor-not-allowed' : ''}
                                    `}>
                                    {date}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatePicker;
