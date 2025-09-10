


import React, { useState, useMemo } from 'react';
import { BlogPost } from '../types';
import Icons from '../components/Icons';
import FilterDropdown from '../components/FilterDropdown';
import { getBlogStatusPillStyle } from '../utils';
import ErrorDisplay from '../components/ErrorDisplay';

interface BlogPageProps {
    posts: BlogPost[];
    onEditPost: (post: BlogPost) => void;
    isLoading: boolean;
    error: string | null;
    onRetry: () => void;
}

const BlogPage: React.FC<BlogPageProps> = ({ posts, onEditPost, isLoading, error, onRetry }) => {
    const [statusFilter, setStatusFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof BlogPost; direction: 'asc' | 'desc' } | null>({ key: 'generatedAt', direction: 'desc' });

    const statusOptions = ['All', 'Needs Review', 'Scheduled', 'Published'];

    const processedPosts = useMemo(() => {
        if (!posts) return [];
        let filtered = posts.filter(post => {
            const matchesStatus = statusFilter === 'All' || post.status === statusFilter;
            const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesStatus && matchesSearch;
        });

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue == null && bValue == null) return 0;
                if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
                if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
                
                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        
        return filtered;
    }, [posts, statusFilter, searchTerm, sortConfig]);

    const requestSort = (key: keyof BlogPost) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader: React.FC<{ columnKey: keyof BlogPost, label: string }> = ({ columnKey, label }) => {
        const isSorted = sortConfig?.key === columnKey;
        return (
            <th className="p-4 cursor-pointer hover:bg-[#2A2A2A]/50 transition-colors" onClick={() => requestSort(columnKey)}>
                <div className="flex items-center gap-2">
                    {label}
                    {isSorted ? (
                        sortConfig?.direction === 'desc' ? <Icons.ArrowDown /> : <Icons.ArrowUp />
                    ) : <Icons.Sort className="text-gray-600" />}
                </div>
            </th>
        );
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center p-20" role="status">
                    <div className="relative w-12 h-12">
                        <div className="absolute inset-0 bg-[#F1C87A]/50 rounded-full animate-ping"></div>
                        <div className="w-12 h-12 bg-[#F1C87A]/20 rounded-full"></div>
                    </div>
                </div>
            );
        }

        if (error) {
            return <ErrorDisplay message={error} onRetry={onRetry} />;
        }

        return (
            <div className="bg-[#121212] p-2 rounded-lg border border-[#2A2A2A]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b-2 border-[#2A2A2A] text-[#B3B3B3] uppercase tracking-wider text-xs">
                            <tr>
                                <SortableHeader columnKey="title" label="Title" />
                                <th className="p-4">Status</th>
                                <SortableHeader columnKey="generatedAt" label="Generated On" />
                                <SortableHeader columnKey="publishedAt" label="Published On" />
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedPosts.map(post => (
                                <tr key={post.id} className="border-b border-[#2A2A2A] hover:bg-[#1A1A1A]/50 transition-colors">
                                    <td className="p-4 font-semibold text-white max-w-md truncate">{post.title}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getBlogStatusPillStyle(post.status)}`}>
                                            {post.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-400">{new Date(post.generatedAt).toLocaleDateString()}</td>
                                    <td className="p-4 text-gray-400">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '—'}</td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => onEditPost(post)}
                                            className="px-4 py-2 text-sm font-semibold text-white bg-[#2A2A2A] rounded-lg hover:bg-[#F1C87A] hover:text-black transition-colors"
                                        >
                                            {post.status === 'Needs Review' ? 'Review & Edit' : 'View'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {processedPosts.length === 0 && (
                        <p className="text-center p-8 text-gray-500">No blog posts match your criteria.</p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in bg-[#0B0B0B]">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-start mb-10">
                <div>
                    <p className="text-lg font-semibold text-[#F1C87A]">BLOG CONTENT</p>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mt-1">Review & Manage Posts</h1>
                </div>
                <div className="flex items-center gap-2 mt-4 md:mt-0">
                    <div className="relative w-full max-w-xs">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500"><Icons.Search /></span>
                        <input
                            type="text"
                            placeholder="Search posts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-lg bg-[#121212] py-2 pl-10 pr-4 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] transition-all duration-300 focus:ring-2 focus:ring-[#F1C87A]"
                        />
                    </div>
                    <FilterDropdown label="Status" options={statusOptions} selectedValue={statusFilter} onSelect={setStatusFilter} />
                </div>
            </div>
            
            {renderContent()}
        </main>
    );
};

export default BlogPage;
