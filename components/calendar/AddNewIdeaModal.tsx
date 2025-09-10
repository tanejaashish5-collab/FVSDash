import React, { useState, useEffect } from 'react';
import { UnscheduledItem } from '../../types';
import Icons from '../Icons';

const AddNewIdeaModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (idea: Omit<UnscheduledItem, 'id'>) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'Podcast' | 'Shorts' | 'Blog'>('Podcast');

    useEffect(() => {
        if (!isOpen) {
            setTitle('');
            setDescription('');
            setType('Podcast');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!title.trim()) return;
        onSave({ title, description, type });
        onClose();
    };

    return (
        <div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-[#1A1A1A] rounded-lg shadow-2xl border border-[#2A2A2A] w-full max-w-lg"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
                    <h2 className="text-lg font-bold text-white">Add New Idea</h2>
                    <button onClick={onClose} className="p-1 text-gray-400 rounded-full hover:bg-[#2A2A2A] hover:text-white transition-colors">
                        <Icons.CloseLarge />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                     <div>
                        <label htmlFor="idea-title" className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                        <input
                            type="text"
                            id="idea-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-lg bg-[#121212] py-2 px-3 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] transition-all duration-300 focus:ring-2 focus:ring-[#F1C87A]"
                            autoFocus
                        />
                    </div>
                     <div>
                        <label htmlFor="idea-description" className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                        <textarea
                            id="idea-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className="w-full rounded-lg bg-[#121212] py-2 px-3 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] transition-all duration-300 focus:ring-2 focus:ring-[#F1C87A] resize-none"
                        />
                    </div>
                     <div>
                        <label htmlFor="idea-type" className="block text-sm font-medium text-gray-300 mb-1">Content Type</label>
                         <select
                            id="idea-type"
                            value={type}
                            onChange={(e) => setType(e.target.value as any)}
                            className="w-full rounded-lg bg-[#121212] py-2 px-3 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] transition-all duration-300 focus:ring-2 focus:ring-[#F1C87A]"
                        >
                            <option value="Podcast">Podcast</option>
                            <option value="Shorts">Shorts</option>
                            <option value="Blog">Blog</option>
                        </select>
                    </div>
                </div>
                <div className="px-6 py-4 bg-[#121212] flex justify-end gap-3 rounded-b-lg">
                    <button onClick={handleSave} className="px-6 py-2 text-sm font-semibold text-black bg-[#F1C87A] rounded-lg hover:-translate-y-0.5 transition-transform shadow-md hover:shadow-lg hover:shadow-[#F1C87A]/20 disabled:opacity-50" disabled={!title.trim()}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddNewIdeaModal;
