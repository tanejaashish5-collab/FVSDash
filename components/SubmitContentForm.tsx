
import React, { useState, useEffect } from 'react';
import { Episode, ToastNotification } from '../types';
import Icons from './Icons';
import DatePicker from './DatePicker';
import { GoogleGenAI, Type } from "@google/genai";

type FormData = Omit<Episode, 'id' | 'status' | 'column' | 'priority'>;

interface SubmitContentFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: FormData) => void;
    addToast: (toast: Omit<ToastNotification, 'id' | 'duration'>) => void;
}

const SubmitContentForm: React.FC<SubmitContentFormProps> = ({ isOpen, onClose, onSubmit, addToast }) => {
    const [formData, setFormData] = useState<FormData>({
        title: '',
        guestName: '',
        description: '',
        tags: '',
        hashtags: '',
        type: 'Podcast',
        dueDate: '',
    });
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [rawAssetFilename, setRawAssetFilename] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [glowFields, setGlowFields] = useState<string[]>([]);


    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, onClose]);
    
    useEffect(() => {
        if (!isOpen) {
            // Reset form when closed
            setFormData({
                title: '',
                guestName: '',
                description: '',
                tags: '',
                hashtags: '',
                type: 'Podcast',
                dueDate: '',
            });
            setIsConfirmed(false);
            setErrors({});
            setRawAssetFilename('');
        }
    }, [isOpen]);

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.title.trim()) newErrors.title = "Episode Name is required.";
        if (!formData.guestName.trim()) newErrors.guestName = "Guest Name is required.";
        if (!formData.description?.trim()) newErrors.description = "Episode Description is required.";
        if (!formData.dueDate) newErrors.dueDate = "Release Date is required.";
        if (!isConfirmed) newErrors.confirmed = "You must confirm the file upload.";
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSubmit(formData);
        }
    };

    const handleAnalyzeFilename = async () => {
        if (!rawAssetFilename.trim()) {
            addToast({ title: 'Filename needed', message: 'Please provide the filename of your uploaded asset.', type: 'warning' });
            return;
        }
        setIsAnalyzing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `
                Analyze the following podcast episode filename and extract the full episode title and the guest's name.
                - The title is usually prefixed with something like "EP 026 —". Include this prefix in the title.
                - The guest's name often follows the title, introduced by "with" or "on". It might be a person's name like "Dr. Jane Doe" or a company name.
                - If no guest name is explicitly mentioned, return an empty string for the guestName.
                Filename: "${rawAssetFilename}"
                Your response must be a valid JSON object that conforms to the provided schema. Do not include any other text, explanations, or markdown formatting.
            `;
            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "The full title of the episode, including any prefixes like 'EP 026 —'." },
                    guestName: { type: Type.STRING, description: "The name of the guest featured in the episode. Blank if not present." }
                },
                required: ["title", "guestName"]
            };
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: { responseMimeType: "application/json", responseSchema: responseSchema },
            });

            let jsonStr = response.text.trim();
            if (jsonStr.startsWith('```json')) jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
            else if (jsonStr.startsWith('```')) jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
            
            const data = JSON.parse(jsonStr);

            setFormData(prev => ({ ...prev, title: data.title, guestName: data.guestName }));
            addToast({ title: 'Analysis Complete!', message: 'Title and Guest Name have been pre-filled.', type: 'success' });
            
            setGlowFields(['title', 'guestName']);
            setTimeout(() => {
                setGlowFields([]);
            }, 2000);

        } catch (error: any) {
            addToast({ title: 'Analysis Failed', message: error.message, type: 'error' });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };
    
    const handleDateChange = (date: string) => {
        setFormData(prev => ({...prev, dueDate: date}));
         if (errors.dueDate) {
            setErrors(prev => ({ ...prev, dueDate: '' }));
        }
    }
    
    const handleConfirmationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsConfirmed(e.target.checked);
        if (errors.confirmed) {
            setErrors(prev => ({ ...prev, confirmed: '' }));
        }
    };

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-content-title"
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-[#1A1A1A] rounded-lg shadow-2xl border border-[#2A2A2A] w-full max-w-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
                    <h2 id="submit-content-title" className="text-xl font-bold text-white">Submit New Content</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 rounded-full hover:bg-[#2A2A2A] hover:text-white transition-colors">
                        <Icons.CloseLarge />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                     <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-200 border-b border-[#2A2A2A] pb-2">Step 1: Upload & Analyze</h3>
                        <p className="text-sm text-gray-400">First, upload your raw audio/video to your dedicated Google Drive folder. **After uploading, copy the exact filename** and paste it below for our AI to analyze.</p>
                        
                        <a 
                            href="https://drive.google.com/drive/u/1/folders/1Jvkt1R1lq05bCbLXREEcWPw8wR652eGM" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-3 px-6 py-3 text-md font-semibold text-black bg-[#F1C87A] rounded-lg shadow-md hover:shadow-lg hover:shadow-[#F1C87A]/20 hover:-translate-y-0.5 transition-all transform"
                        >
                            <Icons.CloudUpload />
                            Open Google Drive Folder
                        </a>

                        <div>
                            <div className="flex items-center gap-2 mb-1 group relative">
                                <label htmlFor="rawAssetFilename" className="block text-sm font-medium text-gray-300">Paste Filename Here*</label>
                                <Icons.Info className="w-4 h-4 text-gray-500 cursor-help" />
                                <div className="absolute bottom-full left-0 mb-2 w-80 p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg shadow-lg text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    <p className="font-bold text-white mb-1">For Best AI Results:</p>
                                    <p>Name your file like this:</p>
                                    <code className="block bg-[#121212] p-2 rounded-md my-1 text-white text-[11px] font-mono">
                                        [EpNum] — [Title] with [Guest].wav
                                    </code>
                                    <p className="font-bold text-white mt-2 mb-1">Example:</p>
                                    <code className="block bg-[#121212] p-2 rounded-md text-white text-[11px] font-mono">
                                        EP 027 — The Future of Marketing with Sarah Chen.mp4
                                    </code>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    id="rawAssetFilename"
                                    name="rawAssetFilename"
                                    value={rawAssetFilename}
                                    onChange={(e) => setRawAssetFilename(e.target.value)}
                                    className="w-full rounded-lg bg-[#121212] py-2 px-3 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] transition-all duration-300 focus:ring-2 focus:ring-[#F1C87A]"
                                    placeholder="e.g., EP 026 — Dr. Jane Doe on AI.wav"
                                />
                                <button 
                                    type="button"
                                    onClick={handleAnalyzeFilename}
                                    disabled={isAnalyzing || !rawAssetFilename}
                                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-semibold text-black bg-[#F1C87A] rounded-lg hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-wait"
                                    title="Analyze with AI"
                                >
                                    {isAnalyzing ? (
                                        <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : <Icons.Sparkles className="w-5 h-5"/>}
                                    Analyze
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4 pt-6 border-t border-[#2A2A2A]">
                         <h3 className="text-lg font-bold text-gray-200">Step 2: Confirm Details</h3>
                         <p className="text-sm text-gray-400">Review the AI-populated details below and fill in any remaining information.</p>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">Episode Name*</label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    className={`w-full rounded-lg bg-[#121212] py-2 px-3 text-sm text-white outline-none ring-1 ring-inset transition-all duration-300 ${errors.title ? 'ring-red-500' : 'ring-[#2A2A2A] focus:ring-2 focus:ring-[#F1C87A]'} ${glowFields.includes('title') ? 'animate-glow' : ''}`}
                                    placeholder="e.g., EP 026 — The Future of Space Travel"
                                />
                                 {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
                            </div>
                            <div>
                                <label htmlFor="guestName" className="block text-sm font-medium text-gray-300 mb-1">Guest Name*</label>
                                <input
                                    type="text"
                                    id="guestName"
                                    name="guestName"
                                    value={formData.guestName}
                                    onChange={handleChange}
                                    className={`w-full rounded-lg bg-[#121212] py-2 px-3 text-sm text-white outline-none ring-1 ring-inset transition-all duration-300 ${errors.guestName ? 'ring-red-500' : 'ring-[#2A2A2A] focus:ring-2 focus:ring-[#F1C87A]'} ${glowFields.includes('guestName') ? 'animate-glow' : ''}`}
                                    placeholder="e.g., Dr. Jane Doe"
                                />
                                 {errors.guestName && <p className="text-red-400 text-xs mt-1">{errors.guestName}</p>}
                            </div>
                         </div>
                         <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Episode Description*</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={5}
                                className={`w-full rounded-lg bg-[#121212] py-2 px-3 text-sm text-white outline-none ring-1 ring-inset transition-all duration-300 ${errors.description ? 'ring-red-500' : 'ring-[#2A2A2A] focus:ring-2 focus:ring-[#F1C87A]'}`}
                                placeholder="Provide a detailed overview of the episode, key topics discussed, or any specific instructions for the editing team."
                            ></textarea>
                            {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-1">Tags</label>
                                <input
                                    type="text"
                                    id="tags"
                                    name="tags"
                                    value={formData.tags}
                                    onChange={handleChange}
                                    className="w-full rounded-lg bg-[#121212] py-2 px-3 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] transition-all duration-300 focus:ring-2 focus:ring-[#F1C87A]"
                                    placeholder="Comma-separated, e.g., science, tech, future"
                                />
                            </div>
                            <div>
                                <label htmlFor="hashtags" className="block text-sm font-medium text-gray-300 mb-1">Hashtags</label>
                                <input
                                    type="text"
                                    id="hashtags"
                                    name="hashtags"
                                    value={formData.hashtags}
                                    onChange={handleChange}
                                    className="w-full rounded-lg bg-[#121212] py-2 px-3 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] transition-all duration-300 focus:ring-2 focus:ring-[#F1C87A]"
                                    placeholder="Comma-separated, e.g., #SpaceTravel, #AI"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                 <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1">Content Type</label>
                                 <select
                                    id="type"
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    className="w-full rounded-lg bg-[#121212] py-2 px-3 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] transition-all duration-300 focus:ring-2 focus:ring-[#F1C87A]"
                                 >
                                    <option value="Podcast">Podcast</option>
                                    <option value="Shorts">Shorts</option>
                                    <option value="Blog">Blog</option>
                                 </select>
                            </div>
                            <div>
                                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-300 mb-1">Release Date*</label>
                                <DatePicker
                                    selectedDate={formData.dueDate}
                                    onDateChange={handleDateChange}
                                    placeholder="Select a date"
                                    minDate={new Date().toISOString().split('T')[0]}
                                />
                                {errors.dueDate && <p className="text-red-400 text-xs mt-1">{errors.dueDate}</p>}
                            </div>
                        </div>
                        <div>
                            <div className="flex items-start">
                                <div className="flex items-center h-5">
                                    <input
                                        id="confirmation"
                                        name="confirmation"
                                        type="checkbox"
                                        checked={isConfirmed}
                                        onChange={handleConfirmationChange}
                                        className={`focus:ring-[#F1C87A] h-4 w-4 text-[#F1C87A] bg-[#121212] border-gray-500 rounded ${errors.confirmed ? 'ring-2 ring-red-500' : ''}`}
                                    />
                                </div>
                                <div className="ml-3 text-sm">
                                    <label htmlFor="confirmation" className="font-medium text-gray-300">
                                        I confirm that I've uploaded the file to Google Drive.*
                                    </label>
                                </div>
                            </div>
                             {errors.confirmed && <p className="text-red-400 text-xs mt-1">{errors.confirmed}</p>}
                        </div>
                    </div>
                     <div className="pt-4 flex justify-end gap-3 border-t border-[#2A2A2A]">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-white bg-transparent border border-gray-600 rounded-lg hover:bg-gray-700/50 transition-all">
                            Cancel
                        </button>
                         <button type="submit" className="px-4 py-2 text-sm font-semibold text-black bg-[#F1C87A] rounded-lg hover:-translate-y-0.5 transition-transform shadow-md hover:shadow-lg hover:shadow-[#F1C87A]/20">
                            Submit Content
                         </button>
                     </div>
                </form>
            </div>
        </div>
    );
};

export default SubmitContentForm;
