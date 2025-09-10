import React, { useState, useEffect } from 'react';
import { Episode } from '../../types';
import Icons from '../Icons';
import DatePicker from '../DatePicker';

const EditContentModal: React.FC<{
    episode: Episode;
    isOpen: boolean;
    onClose: () => void;
    onSave: (episode: Episode) => void;
    onUnschedule: (episode: Episode) => void;
    onDelete: () => void;
}> = ({ episode, isOpen, onClose, onSave, onUnschedule, onDelete }) => {
    const [editedEpisode, setEditedEpisode] = useState(episode);
    const [isRescheduling, setIsRescheduling] = useState(false);

    useEffect(() => {
        setEditedEpisode(episode);
        setIsRescheduling(false); // Reset on new episode
    }, [episode]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditedEpisode(prev => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (date: string) => {
        setEditedEpisode(prev => ({ ...prev, dueDate: date }));
        setIsRescheduling(false);
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-[#1A1A1A] rounded-lg shadow-2xl border border-[#2A2A2A] w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
                    <h2 className="text-lg font-bold text-white">Edit Content</h2>
                    <button onClick={onClose} className="p-1 text-gray-400 rounded-full hover:bg-[#2A2A2A] hover:text-white transition-colors">
                        <Icons.CloseLarge />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="edit-title" className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                        <input id="edit-title" name="title" value={editedEpisode.title} onChange={handleChange} className="w-full rounded-lg bg-[#121212] py-2 px-3 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] focus:ring-2 focus:ring-[#F1C87A]" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Due Date</label>
                        {isRescheduling ? (
                            <DatePicker
                                selectedDate={editedEpisode.dueDate}
                                onDateChange={handleDateChange}
                                placeholder="Select a new date"
                            />
                        ) : (
                            <div className="flex items-center justify-between bg-[#121212] rounded-lg py-2 px-3 ring-1 ring-inset ring-[#2A2A2A]">
                                <span className="text-white text-sm">{new Date(editedEpisode.dueDate + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                <button onClick={() => setIsRescheduling(true)} className="text-sm font-semibold text-[#F1C87A] hover:underline">
                                    Reschedule
                                </button>
                            </div>
                        )}
                    </div>
                    <div>
                        <label htmlFor="edit-description" className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                        <textarea id="edit-description" name="description" value={editedEpisode.description || ''} onChange={handleChange} rows={4} className="w-full rounded-lg bg-[#121212] py-2 px-3 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] focus:ring-2 focus:ring-[#F1C87A] resize-none" />
                    </div>
                    <div>
                        <label htmlFor="edit-type" className="block text-sm font-medium text-gray-300 mb-1">Content Type</label>
                        <select id="edit-type" name="type" value={editedEpisode.type} onChange={handleChange} className="w-full rounded-lg bg-[#121212] py-2 px-3 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] focus:ring-2 focus:ring-[#F1C87A]">
                            <option>Podcast</option>
                            <option>Shorts</option>
                            <option>Blog</option>
                        </select>
                    </div>
                </div>
                <div className="px-6 py-4 bg-[#121212] flex justify-between items-center rounded-b-lg">
                    <button onClick={onDelete} className="text-sm font-semibold text-red-400 hover:text-red-300 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        Delete
                    </button>
                    <div className="flex gap-3">
                        <button onClick={() => onUnschedule(editedEpisode)} className="px-4 py-2 text-sm font-semibold text-white bg-transparent border border-gray-600 rounded-lg hover:bg-gray-700/50">Unschedule</button>
                        <button onClick={() => onSave(editedEpisode)} className="px-6 py-2 text-sm font-semibold text-black bg-[#F1C87A] rounded-lg hover:-translate-y-0.5 transition-transform">Save</button>
                    </div>
                </div>
            </div>
        </div>
    )
};

export default EditContentModal;