
import React from 'react';

const LoadingScreen = () => (
    <div className="flex-1 flex flex-col items-center justify-center h-full text-center">
        <div className="relative w-24 h-24 mb-4">
            <div className="absolute inset-0 bg-[#F1C87A] rounded-full animate-ping opacity-50"></div>
            <div className="w-24 h-24 bg-gradient-to-br from-[#121212] to-black rounded-full flex items-center justify-center border-2 border-[#2A2A2A]">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="w-12 h-12"><rect width="256" height="256" fill="none"/><path d="M128,24a104,104,0,1,0,104,104A104.11,104.11,0,0,0,128,24Zm-42.3,158.42a8,8,0,0,1-11.4,0L32.2,140.3a8,8,0,0,1,11.4-11.4L85.7,171a8,8,0,0,1,0,11.42ZM171,171l42.12-42.12a8,8,0,1,1,11.4,11.4l-42.1,42.1a8,8,0,0,1-11.42,0L128.9,139.3a8,8,0,0,1,11.4-11.4Z" opacity="0.2"/><path d="M128,24a104,104,0,1,0,104,104A104.11,104.11,0,0,0,128,24ZM74.3,182.42a8,8,0,0,1-11.4,0L20.8,140.3a8,8,0,0,1,11.4-11.4L74.3,171a8,8,0,0,1,0,11.42Zm96.8-1.12,42.12-42.12a8,8,0,1,1,11.4,11.4l-42.1,42.1a8,8,0,0,1-11.42,0L128.9,150.7a8,8,0,0,1,11.4-11.4Z" fill="#F1C87A"/></svg>
            </div>
        </div>
        <h2 className="text-xl font-bold text-white">Loading Your Dashboard...</h2>
        <p className="text-gray-400">Connecting to your workspace.</p>
    </div>
);

export default LoadingScreen;
