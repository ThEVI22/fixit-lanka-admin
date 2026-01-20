import React from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

interface ActivityChartProps {
    data: { date: string; count: number }[];
}

const ActivityChart: React.FC<ActivityChartProps> = ({ data }) => {
    return (
        <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow duration-300 w-full">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-[#00172D]">Report Activity</h3>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                        Daily reports over the last 7 days
                    </p>
                </div>
                {/* Optional: Add a filter button here if needed */}
            </div>
            <div className="w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        barSize={24}
                        margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "#94A3B8", fontWeight: 500 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "#94A3B8", fontWeight: 500 }}
                        />
                        <Tooltip
                            cursor={{ fill: "#F8FAFC" }}
                            contentStyle={{
                                backgroundColor: "#1E293B",
                                borderRadius: "12px",
                                border: "none",
                                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                color: "#fff",
                                padding: "8px 12px"
                            }}
                            itemStyle={{ color: "#fff", fontSize: "12px" }}
                            labelStyle={{ display: "none" }}
                        />
                        <Bar
                            dataKey="count"
                            fill="#3B82F6"
                            radius={[6, 6, 0, 0]}
                            animationDuration={1500}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ActivityChart;
