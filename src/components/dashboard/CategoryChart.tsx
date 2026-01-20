import React from "react";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

interface CategoryChartProps {
    data: { name: string; value: number }[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const CategoryChart: React.FC<CategoryChartProps> = ({ data }) => {
    return (
        <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow duration-300 h-fit">
            <div className="mb-4">
                <h3 className="text-lg font-bold text-[#00172D]">Category Distribution</h3>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                    Reports by issue category
                </p>
            </div>
            <div className="w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={95}
                            paddingAngle={4}
                            dataKey="value"
                            cornerRadius={6}
                        >
                            {data.map((_, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                    strokeWidth={0}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#1E293B",
                                borderRadius: "12px",
                                border: "none",
                                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                                color: "#fff",
                                padding: "8px 12px"
                            }}
                            itemStyle={{ color: "#fff", fontSize: "12px" }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            iconSize={8}
                            formatter={(value) => <span className="text-xs font-semibold text-slate-500 ml-1">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default CategoryChart;
