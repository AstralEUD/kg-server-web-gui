"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, TrendingUp, Users, Cpu, Activity, Calendar, RefreshCw } from "lucide-react"
import { apiGet } from "@/lib/api"

import {
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts'

interface MetricPoint {
    timestamp: string
    time: string
    cpu: number
    ram: number
    fps: number
    players: number
}

interface UptimeData {
    uptimePercent: number
    totalMinutes: number
    onlineMinutes: number
}

export default function StatsPage() {
    const [servers, setServers] = useState<any[]>([])
    const [selectedServer, setSelectedServer] = useState("default")
    const [history, setHistory] = useState<MetricPoint[]>([])
    const [uptime, setUptime] = useState<UptimeData | null>(null)
    const [loading, setLoading] = useState(false)
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])

    useEffect(() => {
        fetchServers()
    }, [])

    useEffect(() => {
        if (selectedServer) {
            fetchStats()
        }
    }, [selectedServer, date])

    const fetchServers = async () => {
        try {
            const data = await apiGet<any[]>("/api/servers")
            setServers(data || [])
        } catch (e) { }
    }

    const fetchStats = async () => {
        setLoading(true)
        try {
            const historyData = await apiGet<any[]>(`/api/stats/history?id=${selectedServer}&date=${date}`)
            setHistory(historyData.map((p: any) => ({
                ...p,
                time: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            })))

            const uptimeData = await apiGet<UptimeData>(`/api/stats/uptime?id=${selectedServer}`)
            setUptime(uptimeData)
        } catch (e) { }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                            서버 통계 & 분석
                        </h1>
                        <p className="text-zinc-400 mt-1">성능 지표 및 가동 시간 리포트</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Input
                            type="date"
                            value={date}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
                            className="bg-zinc-800 border-zinc-700 w-[160px]"
                        />
                        <Select value={selectedServer} onValueChange={setSelectedServer}>
                            <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700">
                                <SelectValue placeholder="서버 선택" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                {servers.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={fetchStats} className="bg-zinc-800 border-zinc-700">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-zinc-800/40 border-zinc-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm text-zinc-400">일일 가동률</p>
                                    <p className="text-2xl font-bold">{uptime?.uptimePercent.toFixed(1)}%</p>
                                </div>
                                <Activity className="w-8 h-8 text-emerald-500 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-800/40 border-zinc-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm text-zinc-400">최대 동접자</p>
                                    <p className="text-2xl font-bold">{Math.max(0, ...history.map(h => h.players))}</p>
                                </div>
                                <Users className="w-8 h-8 text-blue-500 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-800/40 border-zinc-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm text-zinc-400">평균 CPU</p>
                                    <p className="text-2xl font-bold">
                                        {(history.reduce((a, b) => a + b.cpu, 0) / (history.length || 1)).toFixed(1)}%
                                    </p>
                                </div>
                                <Cpu className="w-8 h-8 text-purple-500 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-800/40 border-zinc-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm text-zinc-400">평균 FPS</p>
                                    <p className="text-2xl font-bold">
                                        {(history.reduce((a, b) => a + b.fps, 0) / (history.length || 1)).toFixed(1)}
                                    </p>
                                </div>
                                <TrendingUp className="w-8 h-8 text-yellow-500 opacity-50" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* CPU & RAM Chart */}
                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader>
                            <CardTitle className="text-lg">리소스 사용량</CardTitle>
                            <CardDescription>CPU (%) 및 RAM (MB) 추이</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={history}>
                                    <defs>
                                        <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="time" stroke="#666" fontSize={12} />
                                    <YAxis yAxisId="left" stroke="#8b5cf6" fontSize={12} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#ec4899" fontSize={12} />
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333' }} />
                                    <Area yAxisId="left" type="monotone" dataKey="cpu" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCpu)" name="CPU (%)" />
                                    <Line yAxisId="right" type="monotone" dataKey="ram" stroke="#ec4899" dot={false} name="RAM (MB)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Players Chart */}
                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader>
                            <CardTitle className="text-lg">접속자 수</CardTitle>
                            <CardDescription>시간별 온라인 플레이어</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="time" stroke="#666" fontSize={12} />
                                    <YAxis stroke="#3b82f6" fontSize={12} />
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333' }} />
                                    <Line type="stepAfter" dataKey="players" stroke="#3b82f6" strokeWidth={2} dot={false} name="플레이어" />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* FPS Chart */}
                    <Card className="bg-zinc-800/50 border-zinc-700 lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-lg">서버 성능 (FPS)</CardTitle>
                            <CardDescription>서버 엔진 틱레이트 추이</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="time" stroke="#666" fontSize={12} />
                                    <YAxis domain={[0, 100]} stroke="#f59e0b" fontSize={12} />
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333' }} />
                                    <Line type="monotone" dataKey="fps" stroke="#f59e0b" strokeWidth={2} dot={true} name="서버 FPS" />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

function Input({ className, ...props }: any) {
    return (
        <input
            className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
            {...props}
        />
    )
}
