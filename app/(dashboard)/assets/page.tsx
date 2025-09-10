
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { Asset, Episode } from '@/types';
import Icons from '@/components/Icons';
import { DEFAULT_ASSETS, DEFAULT_EPISODES } from '@/constants';

const AssetFileIcon: React.FC<{ type: Asset['type'], className?: string }> = ({ type, className = "w-8 h-8" }) => {
    const commonProps = { className: `${className} text-gray-400` };
    switch (type) {
        case 'Image': return <Icons.IconImage {...commonProps} />;
        case 'Video': return <Icons.IconVideo {...commonProps} />;
        case 'Audio': return <Icons.IconAudio {...commonProps} />;
        case 'Document': return <Icons.IconDocument {...commonProps} />;
        default: return <Icons.IconDocument {...commonProps} />;
    }
};

const AssetPreviewModal: React.FC<{ asset: Asset, onClose: () => void }> = ({ asset, onClose }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'auto';
        };
    }, [onClose]);

    const handleCopyLink = () => {
        if(asset.url && asset.url !== '#') {
            navigator.clipboard.writeText(asset.url);
            // In a real app with a toast provider available here, we'd show a confirmation.
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-[#1A1A1A] rounded-lg shadow-2xl border border-[#2A2A2A] w-full max-w-5xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Preview Column */}
                <div className="md:w-2/3 bg-[#0B0B0B] flex items-center justify-center p-4 relative min-h-[300px]">
                    {asset.type === 'Image' && <img src={asset.thumbnailUrl.replace('w=200', 'w=1200')} alt={asset.name} className="max-w-full max-h-full object-contain rounded-md" />}
                    {asset.type === 'Audio' && <div className="text-center text-gray-500"><AssetFileIcon type="Audio" className="w-32 h-32" /><p className="mt-4 text-lg">Audio preview unavailable.</p></div>}
                    {asset.type === 'Video' && <div className="text-center text-gray-500"><AssetFileIcon type="Video" className="w-32 h-32" /><p className="mt-4 text-lg">Video preview unavailable.</p></div>}
                    {asset.type === 'Document' && <div className="text-center text-gray-500"><AssetFileIcon type="Document" className="w-32 h-32" /><p className="mt-4 text-lg">Document preview unavailable.</p></div>}
                </div>
                {/* Details Column */}
                <div className="md:w-1/3 bg-[#121212] p-6 flex flex-col border-t md:border-t-0 md:border-l border-[#2A2A2A]">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-xl font-bold text-white pr-4 break-words">{asset.name}</h3>
                         <button onClick={onClose} className="p-1 text-gray-400 rounded-full hover:bg-[#2A2A2A] hover:text-white transition-colors flex-shrink-0">
                            <Icons.CloseLarge />
                        </button>
                    </div>

                    <div className="space-y-5 text-sm overflow-y-auto pr-2">
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Category</p>
                            <p className="text-white mt-1">{asset.category}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">File Type</p>
                                <p className="text-white mt-1">{asset.fileType.toUpperCase()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">File Size</p>
                                <p className="text-white mt-1">{asset.size}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Date Added</p>
                            <p className="text-white mt-1">{new Date(asset.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    </div>
                    
                    <div className="mt-auto pt-6 border-t border-[#2A2A2A] flex flex-col sm:flex-row gap-3">
                         <a href={asset.url} download className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-black bg-[#F1C87A] rounded-lg shadow-md hover:shadow-lg hover:shadow-[#F1C87A]/20 hover:-translate-y-0.5 transition-all transform">
                            <Icons.Download /> Download
                        </a>
                        <button onClick={handleCopyLink} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-transparent border border-gray-600 rounded-lg hover:bg-gray-700/50 transition-all">
                            <Icons.Link /> Copy Link
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const EpisodePackageCard: React.FC<{
    episode: Episode;
    assetCount: number;
    onClick: () => void;
}> = ({ episode, assetCount, onClick }) => (
    <button 
        onClick={onClick}
        className="group bg-[#121212] p-6 rounded-lg border border-[#2A2A2A] hover:border-[#F1C87A] hover:-translate-y-1 transition-transform duration-200 text-left w-full h-full flex flex-col"
    >
        <div className="flex justify-between items-start">
            <Icons.Episodes className="w-12 h-12 text-[#F1C87A] mb-4 transition-colors group-hover:text-white" />
            <span className={`px-2 py-1 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-300`}>
                {assetCount} Assets
            </span>
        </div>
        <div className="mt-auto">
            <p className="text-sm text-gray-400">{episode.type}</p>
            <h3 className="font-bold text-lg text-white mt-1">{episode.title}</h3>
        </div>
    </button>
);

export default function AssetsPage() {
    const assets = DEFAULT_ASSETS;
    const episodes = DEFAULT_EPISODES;

    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);

    const assetsByEpisode = useMemo(() => {
        return assets.reduce((acc, asset) => {
            if (asset.episodeId) {
                if (!acc[asset.episodeId]) {
                    acc[asset.episodeId] = [];
                }
                acc[asset.episodeId].push(asset);
            }
            return acc;
        }, {} as Record<string, Asset[]>);
    }, [assets]);
    
    const brandKitAssets = useMemo(() => assets.filter(a => a.category === 'Brand Kit'), [assets]);

    const selectedEpisodeAssets = useMemo(() => {
        if (!selectedEpisodeId) return [];
        return assetsByEpisode[selectedEpisodeId] || [];
    }, [selectedEpisodeId, assetsByEpisode]);

    const selectedEpisode = useMemo(() => {
        if (!selectedEpisodeId) return null;
        return episodes.find(e => e.id === selectedEpisodeId);
    }, [selectedEpisodeId, episodes]);

    const renderAssetGrid = (assetsToRender: Asset[]) => (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {assetsToRender.map(asset => (
                <div key={asset.id} className="group relative bg-[#121212] rounded-lg border border-[#2A2A2A] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#F1C87A]/10">
                    <div className="aspect-square w-full flex items-center justify-center bg-[#1A1A1A]">
                        {asset.thumbnailUrl ? (
                             <img src={asset.thumbnailUrl} alt={asset.name} className="w-full h-full object-cover" />
                        ) : (
                            <AssetFileIcon type={asset.type} className="w-16 h-16 text-gray-500" />
                        )}
                    </div>
                    <div className="p-3">
                        <p className="font-semibold text-sm text-white truncate" title={asset.name}>{asset.name}</p>
                        <p className="text-xs text-gray-400">{asset.size} &bull; {asset.fileType.toUpperCase()}</p>
                    </div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button onClick={() => setSelectedAsset(asset)} className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20"><Icons.Search /></button>
                        <a href={asset.url} download className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20"><Icons.Download /></a>
                    </div>
                </div>
            ))}
        </div>
    );
    
    if (selectedEpisodeId) {
        return (
            <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in bg-[#0B0B0B]">
                {selectedAsset && <AssetPreviewModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}
                <div className="mb-8">
                    <button onClick={() => setSelectedEpisodeId(null)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-4">
                        <Icons.ChevronLeft /> Back to Asset Packages
                    </button>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mt-1">Assets for {selectedEpisode?.title}</h1>
                </div>
                {renderAssetGrid(selectedEpisodeAssets)}
            </main>
        );
    }
    
    return (
        <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in bg-[#0B0B0B]">
            {selectedAsset && <AssetPreviewModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}
            {/* Header */}
            <div>
                <p className="text-lg font-semibold text-[#F1C87A]">ASSET MANAGEMENT</p>
                <h1 className="text-4xl md:text-5xl font-bold text-white mt-1">Episode Asset Packages</h1>
            </div>

            <section className="mt-10">
                <h2 className="text-2xl font-bold text-white mb-4">Brand Kit</h2>
                {renderAssetGrid(brandKitAssets)}
            </section>
            
            <section className="mt-12">
                <h2 className="text-2xl font-bold text-white mb-4">Episode Packages</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {episodes.map(episode => {
                        const count = assetsByEpisode[episode.id]?.length || 0;
                        if (count === 0) return null;
                        return (
                             <EpisodePackageCard 
                                key={episode.id}
                                episode={episode}
                                assetCount={count}
                                onClick={() => setSelectedEpisodeId(episode.id)}
                            />
                        )
                    })}
                </div>
            </section>
        </main>
    );
}
