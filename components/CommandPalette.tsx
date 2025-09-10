
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Command } from '../types';
import Icons from './Icons';
import { useAnalytics } from '../lib/AnalyticsProvider';

const CommandPalette: React.FC<{ isOpen: boolean; onClose: () => void; commands: Command[] }> = ({ isOpen, onClose, commands }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const { logEvent } = useAnalytics();

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const filteredCommands = useMemo(() => {
        if (!query) return commands;
        return commands.filter(cmd => cmd.name.toLowerCase().includes(query.toLowerCase()) || cmd.category.toLowerCase().includes(query.toLowerCase()));
    }, [query, commands]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [filteredCommands]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const command = filteredCommands[selectedIndex];
                if (command) {
                    command.action();
                    logEvent('command_palette_execute', { command: command.name });
                    onClose();
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, filteredCommands, onClose, logEvent]);
    
    useEffect(() => {
        listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)?.scrollIntoView({
            block: 'nearest',
        });
    }, [selectedIndex]);

    if (!isOpen) return null;

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-start justify-center pt-20" onClick={onClose}>
            <div className="fixed inset-0 bg-black/60 animate-fade-in" />
            <div
                className="relative z-10 w-full max-w-xl bg-[#1A1A1A] rounded-xl shadow-2xl border border-[#2A2A2A] animate-fade-in-up"
                onClick={e => e.stopPropagation()}
            >
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500"><Icons.Search /></span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Type a command or search..."
                        className="w-full bg-transparent py-4 pl-12 pr-4 text-white outline-none"
                    />
                </div>
                <hr className="border-t border-[#2A2A2A]" />
                <ul ref={listRef} className="max-h-96 overflow-y-auto p-2">
                    {filteredCommands.length > 0 ? (
                        filteredCommands.map((command, index) => (
                            <li
                                key={command.id}
                                data-index={index}
                                onMouseEnter={() => setSelectedIndex(index)}
                                onClick={() => { command.action(); onClose(); }}
                                className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors ${
                                    selectedIndex === index ? 'bg-[#F1C87A]/10 text-[#F1C87A]' : 'text-gray-300 hover:bg-[#2A2A2A]'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-500">{command.icon}</span>
                                    <span>{command.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-500">{command.category}</span>
                                    {selectedIndex === index && (
                                        <span className="text-gray-500"><Icons.EnterKey /></span>
                                    )}
                                </div>
                            </li>
                        ))
                    ) : (
                        <li className="p-4 text-center text-gray-400">No results found.</li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default CommandPalette;
