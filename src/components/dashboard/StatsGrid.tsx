import React from "react";
import {
    HiOutlineUserGroup,
    HiOutlineUsers,
    HiOutlineOfficeBuilding,
    HiOutlineLightningBolt,
} from "react-icons/hi";

interface StatsGridProps {
    totalCommunity: number;
    totalPersonnel: number;
    activeUnits: number;
    successRate: string | number;
}

const StatsGrid: React.FC<StatsGridProps> = ({
    totalCommunity,
    totalPersonnel,
    activeUnits,
    successRate,
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
                label="Community"
                count={totalCommunity}
                icon={<HiOutlineUserGroup size={22} />}
                color="blue"
                subText="Registered residents"
            />
            <MetricCard
                label="Specialists"
                count={totalPersonnel}
                icon={<HiOutlineUsers size={22} />}
                color="amber"
                subText="Skilled labor pool"
            />
            <MetricCard
                label="Active Units"
                count={activeUnits}
                icon={<HiOutlineOfficeBuilding size={22} />}
                color="emerald"
                subText="Deployed repair teams"
            />
            <MetricCard
                label="Efficiency"
                count={`${successRate}%`}
                icon={<HiOutlineLightningBolt size={22} />}
                color="orange"
                subText="Resolution success rate"
            />
        </div>
    );
};

const MetricCard = ({ label, count, icon, color, subText }: any) => {
    const colors: any = {
        blue: "bg-blue-50 text-blue-600",
        amber: "bg-amber-50 text-amber-600",
        emerald: "bg-emerald-50 text-emerald-600",
        orange: "bg-orange-50 text-orange-600",
    };
    return (
        <div className="bg-white p-6 shadow-sm border border-gray-100/50 rounded-2xl hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="text-[11px] uppercase text-gray-400 font-bold tracking-widest mb-1">
                        {label}
                    </p>
                    <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{count}</p>
                </div>
                <div className={`p-3 rounded-xl ${colors[color]} shadow-sm`}>{icon}</div>
            </div>
            <div className="flex items-center gap-2">
                {/* Mock Trend - In real app, calculate this */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color === 'orange' ? 'text-orange-600 bg-orange-50' : 'text-emerald-600 bg-emerald-50'}`}>
                    {color === 'orange' ? '+8.2%' : '+12.5%'}
                </span>
                <p className="text-[11px] text-gray-400 font-medium truncate">{subText}</p>
            </div>
        </div>
    );
};

export default StatsGrid;
