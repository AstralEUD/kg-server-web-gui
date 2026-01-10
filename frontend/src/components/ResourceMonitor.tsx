import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Cpu, CircuitBoard } from 'lucide-react';

interface ResourceMonitorProps {
    serverId?: string
}

export default function ResourceMonitor({ serverId = "default" }: ResourceMonitorProps) {
    const [data, setData] = useState<any[]>([]);
    const [current, setCurrent] = useState({ cpu: 0, ram: 0, health: 'offline', watchdog: false });

    const fetchResources = async () => {
        try {
            const res = await fetch(`http://localhost:3000/api/status/resources?id=${serverId}`, { credentials: "include" });
            if (res.ok) {
                const json = await res.json();
                // json: { history: [{time, cpu, memoryMb}], health: string, watchdog: bool }

                const history = (json.history || []).map((h: any) => ({
                    ...h,
                    time: new Date(h.time).toLocaleTimeString(),
                }));

                setData(history);

                if (history.length > 0) {
                    const last = history[history.length - 1];
                    setCurrent({
                        cpu: last.cpu,
                        ram: last.memoryMb,
                        health: json.health,
                        watchdog: json.watchdog
                    });
                } else {
                    // Reset current if no history (server stopped)
                    setCurrent({ cpu: 0, ram: 0, health: json.health, watchdog: json.watchdog });
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchResources();
        const interval = setInterval(fetchResources, 2000);
        return () => clearInterval(interval);
    }, [serverId]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Stats Cards */}
            <div className="bg-gray-800/50 p-4 rounded-lg flex items-center justify-between border border-gray-700 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Cpu className="text-blue-400 w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">CPU Usage</p>
                        <p className="text-2xl font-bold text-gray-100">{current.cpu.toFixed(1)}%</p>
                    </div>
                </div>
                <div className="h-10 w-24">
                    {/* Mini sparkline if needed */}
                </div>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg flex items-center justify-between border border-gray-700 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                        <CircuitBoard className="text-purple-400 w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">Memory</p>
                        <p className="text-2xl font-bold text-gray-100">{current.ram.toFixed(0)} MB</p>
                    </div>
                </div>
            </div>

            {/* Main Chart */}
            <div className="col-span-1 md:col-span-2 bg-gray-900 rounded-lg p-4 border border-gray-800 h-64">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-gray-300 font-medium flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-400" />
                        Live Performance
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${current.health === 'healthy' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="text-xs text-gray-400 capitalize">{current.health}</span>
                        {current.watchdog && <span className="ml-2 text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded border border-blue-800">Watchdog ON</span>}
                    </div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} interval={10} />
                        <YAxis yAxisId="left" stroke="#60A5FA" fontSize={10} />
                        <YAxis yAxisId="right" orientation="right" stroke="#C084FC" fontSize={10} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                            itemStyle={{ color: '#F3F4F6' }}
                        />
                        <Line yAxisId="left" type="monotone" dataKey="cpu" stroke="#60A5FA" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="CPU %" />
                        <Line yAxisId="right" type="monotone" dataKey="memoryMb" stroke="#C084FC" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="RAM (MB)" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
