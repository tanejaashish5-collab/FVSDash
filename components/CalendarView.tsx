
import React, { useState } from 'react';
import Icons from './Icons';

const CalendarView: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const changeMonth = (offset: number) => {
        setCurrentDate(new Date(year, month + offset, 1));
    };

    return (
        <section className="bg-[#121212] p-6 rounded-lg border border-[#2A2A2A] h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">{monthNames[month]} {year}</h3>
                <div className="flex gap-2">
                    <button onClick={() => changeMonth(-1)} className="p-1 rounded-md hover:bg-[#2A2A2A] text-[#B3B3B3]"><Icons.ChevronLeft /></button>
                    <button onClick={() => changeMonth(1)} className="p-1 rounded-md hover:bg-[#2A2A2A] text-[#B3B3B3]"><Icons.ChevronRight /></button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-xs text-[#B3B3B3]">
                {daysOfWeek.map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2 mt-2">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`}></div>)}
                {Array.from({ length: daysInMonth }).map((_, day) => {
                    const date = day + 1;
                    const isToday = new Date().toDateString() === new Date(year, month, date).toDateString();
                    return (
                        <div key={date} className={`flex items-center justify-center h-8 rounded-full text-sm ${isToday ? 'bg-[#F1C87A] text-black font-bold' : 'text-white'}`}>
                            {date}
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default CalendarView;
