import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Cpu, CircuitBoard, Wifi, Users } from 'lucide-react';

interface ResourceMonitorProps {
    serverId?: string
}

export default function ResourceMonitor({ serverId = "default" }: ResourceMonitorProps) {
    const [data, setData] = useState<any[]>([]);
    const [current, setCurrent] = useState({ cpu: 0, ram: 0, fps: 0, players: 0, health: 'offline', watchdog: false });

    const fetchResources = async () => {
        try {
            // Parallel fetch for resources and metrics
            const [resResources, resMetrics] = await Promise.all([
                fetch(`http://localhost:3000/api/status/resources?id=${serverId}`, { credentials: "include" }),
                fetch(`http://localhost:3000/api/servers/${serverId}/metrics`, { credentials: "include" })
            ]);

            let fps = 0;
            let players = 0;

            if (resMetrics.ok) {
                const metrics = await resMetrics.json();
                fps = metrics.fps || 0;
                players = metrics.playerCount || 0;
            }

            if (resResources.ok) {
                const json = await resResources.json();
                // json: { history: [{time, cpu, memoryMb}], health: string, watchdog: bool }

                const history = (json.history || []).map((h: any) => ({
                    ...h,
                    time: new Date(h.time).toLocaleTimeString(),
                    fps: fps, // Add current FPS to history point (approximation)
                }));

                setData(history);

                if (history.length > 0) {
                    const last = history[history.length - 1];
                    setCurrent({
                        cpu: last.cpu,
                        ram: last.memoryMb,
                        fps: fps,
                        players: players,
                        health: json.health,
                        watchdog: json.watchdog
                    });
                } else {
                    // Reset current if no history (server stopped)
                    setCurrent({ cpu: 0, ram: 0, fps: 0, players: 0, health: json.health, watchdog: json.watchdog });
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Stats Cards */}
            <div className="bg-gray-800/50 p-4 rounded-lg flex items-center justify-between border border-gray-700 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Cpu className="text-blue-400 w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">CPU</p>
                        <p className="text-2xl font-bold text-gray-100">{current.cpu.toFixed(1)}%</p>
                    </div>
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

            <div className="bg-gray-800/50 p-4 rounded-lg flex items-center justify-between border border-gray-700 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                        <Activity className="text-green-400 w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">FPS</p>
                        <p className="text-2xl font-bold text-gray-100">{current.fps.toFixed(1)}</p>
                    </div>
                </div>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg flex items-center justify-between border border-gray-700 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                        <Users className="text-orange-400 w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">Players</p>
                        <p className="text-2xl font-bold text-gray-100">{current.players}</p>
                    </div>
                </div>
            </div>

            {/* Main Chart */}
            <div className="col-span-1 md:col-span-4 bg-gray-900 rounded-lg p-4 border border-gray-800 h-64">
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
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#C084FC" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#C084FC" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} tick={{ fill: '#9CA3AF' }} interval={10} />
                        <YAxis yAxisId="left" stroke="#60A5FA" fontSize={10} />
                        <YAxis yAxisId="right" orientation="right" stroke="#C084FC" fontSize={10} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                            itemStyle={{ color: '#F3F4F6' }}
                        />
                        <Area yAxisId="left" type="monotone" dataKey="cpu" stroke="#60A5FA" fillOpacity={1} fill="url(#colorCpu)" name="CPU %" />
                        <Area yAxisId="right" type="monotone" dataKey="memoryMb" stroke="#C084FC" fillOpacity={1} fill="url(#colorRam)" name="RAM (MB)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
