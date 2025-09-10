import React from 'react';
import { AudienceDemographics } from '../../types';
import Icons from '../Icons';

interface AudienceDemographicsChartProps {
    data: AudienceDemographics;
}

const Bar: React.FC<{ label: string; value: number; maxValue: number; color: string }> = ({ label, value, maxValue, color }) => (
    <div className="flex items-center gap-4 group">
        <div className="w-24 text-sm text-gray-400 text-right truncate">{label}</div>
        <div className="flex-1 bg-[#2A2A2A] rounded-full h-5">
            <div
                className={`${color} h-5 rounded-full flex items-center justify-end px-2 transition-all duration-700 ease-out`}
                style={{ width: `${(value / maxValue) * 100}%` }}
            >
                <span className="text-xs font-bold text-black opacity-0 group-hover:opacity-100 transition-opacity">{value}%</span>
            </div>
        </div>
    </div>
);


const AudienceDemographicsChart: React.FC<AudienceDemographicsChartProps> = ({ data }) => {
    const maxLocationValue = Math.max(...data.locations.map(l => l.value));
    const maxAgeValue = Math.max(...data.age.map(a => a.value));
    const maxDeviceValue = Math.max(...data.devices.map(d => d.value));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10 p-4">
            {/* Column 1: Top Locations */}
            <div className="space-y-4">
                <h4 className="font-semibold text-white flex items-center gap-2"><Icons.Globe className="w-5 h-5"/> Top Locations</h4>
                <div className="space-y-3">
                    {data.locations.map(loc => (
                        <Bar key={loc.country} label={loc.country} value={loc.value} maxValue={maxLocationValue} color="bg-blue-400"/>
                    ))}
                </div>
            </div>

            {/* Column 2: Age Demographics */}
            <div className="space-y-4">
                 <h4 className="font-semibold text-white flex items-center gap-2"><Icons.Cake className="w-5 h-5"/> Age Range</h4>
                <div className="space-y-3">
                    {data.age.map(age => (
                        <Bar key={age.range} label={age.range} value={age.value} maxValue={maxAgeValue} color="bg-purple-400"/>
                    ))}
                </div>
            </div>

            {/* Column 3: Devices */}
            <div className="space-y-4">
                 <h4 className="font-semibold text-white flex items-center gap-2"><Icons.DevicePhoneMobile className="w-5 h-5"/> Devices</h4>
                <div className="space-y-3">
                    {data.devices.map(device => (
                        <Bar key={device.type} label={device.type} value={device.value} maxValue={maxDeviceValue} color="bg-teal-400"/>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
                 {/* Column 4: Gender */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-white flex items-center gap-2"><Icons.Heart className="w-5 h-5"/> Gender</h4>
                    <div className="space-y-3">
                        {data.gender.map(g => (
                            <div key={g.type} className="flex justify-between items-center text-sm">
                                <span className="text-gray-300">{g.type}</span>
                                <span className="font-semibold text-white">{g.value}%</span>
                            </div>
                        ))}
                        <div className="w-full bg-[#2A2A2A] rounded-full h-2.5 flex">
                            <div className="bg-pink-400 h-2.5 rounded-l-full" style={{ width: `${data.gender.find(g => g.type === 'Female')?.value || 0}%` }}></div>
                            <div className="bg-orange-400 h-2.5" style={{ width: `${data.gender.find(g => g.type === 'Male')?.value || 0}%` }}></div>
                            <div className="bg-gray-400 h-2.5 rounded-r-full" style={{ width: `${data.gender.find(g => g.type === 'Other')?.value || 0}%` }}></div>
                        </div>
                    </div>
                </div>
                {/* Column 5: Viewers */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-white flex items-center gap-2"><Icons.Users className="w-5 h-5"/> Viewers</h4>
                    <div className="space-y-3">
                        {data.viewers.map(v => (
                            <div key={v.type} className="flex justify-between items-center text-sm">
                                <span className="text-gray-300">{v.type}</span>
                                <span className="font-semibold text-white">{v.value}%</span>
                            </div>
                        ))}
                         <div className="w-full bg-[#2A2A2A] rounded-full h-2.5 flex">
                            <div className="bg-green-400 h-2.5 rounded-l-full" style={{ width: `${data.viewers.find(v => v.type === 'Returning')?.value || 0}%` }}></div>
                            <div className="bg-yellow-400 h-2.5 rounded-r-full" style={{ width: `${data.viewers.find(v => v.type === 'New')?.value || 0}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default AudienceDemographicsChart;