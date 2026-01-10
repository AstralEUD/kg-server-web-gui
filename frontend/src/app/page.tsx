"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Square, RefreshCw, Activity, Terminal, Server, Cpu, HardDrive, Loader2, Download, Trash2, Layers, ChevronRight } from "lucide-react"
import Link from "next/link"

interface SystemStats {
  cpuPercent: number
  memoryUsed: number
  memoryTotal: number
  memoryPercent: number
  diskUsed: number
  diskTotal: number
  diskPercent: number
  networkBytesIn: number
  networkBytesOut: number
}

export default function Dashboard() {
  const [status, setStatus] = useState<{ running: boolean; pid: number } | null>(null)
  const [resources, setResources] = useState<SystemStats | null>(null)
  const [presets, setPresets] = useState<any[]>([])
  const [steamcmdStatus, setSteamcmdStatus] = useState<any>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [servers, setServers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // UI States
  const [autoScroll, setAutoScroll] = useState(true)

  const fetchStatus = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/status", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setStatus({ running: data.running, pid: data.pid })
      }
    } catch (e) { }
  }

  const fetchResources = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/status/resources", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setResources(data)
      }
    } catch (e) { }
  }

  const fetchPresets = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/presets", { credentials: "include" })
      if (res.ok) setPresets(await res.json() || [])
    } catch (e) { }
  }

  const applyPreset = async (id: string) => {
    if (!confirm("프리셋을 적용하시겠습니까?")) return
    try {
      await fetch(`http://localhost:3000/api/presets/${id}/apply`, { method: "POST", credentials: "include" })
      alert("적용되었습니다.")
    } catch (e) { }
  }

  const fetchSteamCMDStatus = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/steamcmd/status", { credentials: "include" })
      if (res.ok) setSteamcmdStatus(await res.json())
    } catch (e) { }
  }

  const fetchServers = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/servers", { credentials: "include" })
      if (res.ok) setServers(await res.json() || [])
    } catch (e) { }
  }

  const fetchLogs = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/logs", { credentials: "include" })
      if (res.ok) setLogs(await res.json() || [])
    } catch (e) { }
  }

  const handleDownloadServer = async () => {
    try {
      await fetch("http://localhost:3000/api/steamcmd/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experimental: false, serverId: "default" }),
        credentials: "include"
      })
      alert("다운로드가 시작되었습니다.")
    } catch (e) { }
  }

  const handleAction = async (action: string) => {
    setLoading(true)
    try {
      await fetch(`http://localhost:3000/api/server/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ args: [] }),
        credentials: "include"
      })
    } catch (e) { }
    setLoading(false)
  }

  const clearLogs = async () => {
    await fetch("http://localhost:3000/api/logs", { method: "DELETE", credentials: "include" })
    setLogs([])
  }

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString()
  }

  useEffect(() => {
    fetchStatus()
    fetchResources()
    fetchPresets()
    fetchSteamCMDStatus()
    fetchServers()
    fetchLogs()

    const statusInterval = setInterval(fetchStatus, 3000)
    const resourceInterval = setInterval(fetchResources, 2000)
    const logInterval = setInterval(fetchLogs, 3000)
    const steamInterval = setInterval(fetchSteamCMDStatus, 5000)

    return () => {
      clearInterval(statusInterval)
      clearInterval(resourceInterval)
      clearInterval(logInterval)
      clearInterval(steamInterval)
    }
  }, [])

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, autoScroll])

  // Helper for formatting
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">
              대시보드
            </h1>
            <p className="text-zinc-400 mt-1">서버 상태 및 시스템 리소스 모니터링</p>
          </div>

          {/* Quick Profile Selector */}
          {presets.length > 0 && (
            <div className="flex items-center gap-3 bg-zinc-800/50 p-2 rounded-lg border border-zinc-700">
              <span className="text-sm text-zinc-400">빠른 프로필 적용:</span>
              <Select onValueChange={applyPreset}>
                <SelectTrigger className="w-[200px] h-8 bg-zinc-900 border-zinc-600 text-sm">
                  <SelectValue placeholder="프로필 선택..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                  {presets.map(p => (
                    <SelectItem key={p.id} value={p.id} className="focus:bg-zinc-700">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* System Resources */}
        {resources && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-400 flex gap-2"><Cpu className="w-4 h-4" /> CPU</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{resources.cpuPercent.toFixed(1)}%</div><div className="h-1 w-full bg-zinc-700 mt-2 rounded overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${resources.cpuPercent}%` }}></div></div></CardContent>
            </Card>
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-400 flex gap-2"><Activity className="w-4 h-4" /> RAM</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{resources.memoryPercent.toFixed(1)}%</div><div className="text-xs text-zinc-500">{formatBytes(resources.memoryUsed)} / {formatBytes(resources.memoryTotal)}</div><div className="h-1 w-full bg-zinc-700 mt-2 rounded overflow-hidden"><div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${resources.memoryPercent}%` }}></div></div></CardContent>
            </Card>
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-400 flex gap-2"><HardDrive className="w-4 h-4" /> Disk</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{resources.diskPercent.toFixed(1)}%</div><div className="text-xs text-zinc-500">{formatBytes(resources.diskUsed)} / {formatBytes(resources.diskTotal)}</div><div className="h-1 w-full bg-zinc-700 mt-2 rounded overflow-hidden"><div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${resources.diskPercent}%` }}></div></div></CardContent>
            </Card>
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-400 flex gap-2"><Activity className="w-4 h-4" /> Network</CardTitle></CardHeader>
              <CardContent><div className="text-sm font-medium">↓ {formatBytes(resources.networkBytesIn)}/s</div><div className="text-sm font-medium">↑ {formatBytes(resources.networkBytesOut)}/s</div></CardContent>
            </Card>
          </div>
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Server Status */}
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">서버 상태</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${status?.running ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                <span className="text-2xl font-bold">
                  {status?.running ? "실행 중" : "중지됨"}
                </span>
              </div>
              {status?.pid ? (
                <p className="text-xs text-zinc-500 mt-1">PID: {status.pid}</p>
              ) : null}
            </CardContent>
          </Card>

          {/* Server Installation */}
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">서버 설치</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant={steamcmdStatus?.serverInstalled ? "default" : "destructive"}>
                  {steamcmdStatus?.serverInstalled ? "설치됨" : "미설치"}
                </Badge>
              </div>
              {!steamcmdStatus?.serverInstalled && (
                <Button size="sm" className="mt-2 w-full gap-2" onClick={handleDownloadServer}>
                  <Download className="w-4 h-4" /> 서버 다운로드
                </Button>
              )}
            </CardContent>
          </Card>

          {/* SteamCMD Status */}
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">SteamCMD</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={steamcmdStatus?.steamcmdInstalled ? "default" : "secondary"}>
                {steamcmdStatus?.steamcmdInstalled ? "설치됨" : "자동 설치 예정"}
              </Badge>
              {steamcmdStatus?.running && (
                <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> 다운로드 중...
                </p>
              )}
            </CardContent>
          </Card>

          {/* Server Count */}
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">서버 인스턴스</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{servers.length}</span>
              <p className="text-xs text-zinc-500 mt-1">
                {servers.filter(s => s.status === "running").length}개 실행 중
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Existing Presets List (Optional, keeping as secondary view or remove if cluttered) */}
        {/* Keeping it as it shows proper buttons and link to full page, but maybe reduce size or rely on dropdown */}
        {presets.length > 0 && (
          <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border-amber-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-amber-400">
                <Layers className="w-5 h-5" /> 추천 프리셋
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {presets.slice(0, 5).map(preset => (
                  <Button
                    key={preset.id}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => applyPreset(preset.id)}
                  >
                    {preset.name}
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                ))}
                <Link href="/presets">
                  <Button variant="ghost" size="sm">모든 프리셋 관리</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Server Control */}
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" /> 서버 제어
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full gap-2"
                onClick={() => handleAction("start")}
                disabled={loading || status?.running}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                서버 시작
              </Button>
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={() => handleAction("stop")}
                disabled={loading || !status?.running}
              >
                <Square className="w-4 h-4" /> 서버 중지
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => handleAction("restart")}
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4" /> 재시작
              </Button>
            </CardContent>
          </Card>

          {/* Console */}
          <Card className="lg:col-span-2 bg-zinc-800/50 border-zinc-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-5 h-5" /> 콘솔
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">자동 스크롤</span>
                  <Switch className="scale-75" checked={autoScroll} onCheckedChange={setAutoScroll} />
                </div>
                <div className="h-4 w-px bg-zinc-700"></div>
                <Button variant="ghost" size="sm" onClick={clearLogs} className="h-8 w-8 p-0">
                  <Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-400" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Increased height to 600px */}
              <ScrollArea className="h-[600px] bg-zinc-900 rounded-lg p-4 font-mono text-sm shadow-inner border border-zinc-800">
                {logs.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-zinc-600">
                    <div className="text-center">
                      <Terminal className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p>로그가 없습니다</p>
                    </div>
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex gap-2 py-0.5 hover:bg-zinc-800/30 px-1 rounded">
                      <span className="text-zinc-600 shrink-0 text-xs mt-0.5 w-[70px]">[{formatTime(log.timestamp)}]</span>
                      <span className={`break-all ${log.level === "ERROR" ? "text-red-400/90 font-medium" :
                          log.level === "WARN" ? "text-yellow-400/90" :
                            "text-zinc-300/90"
                        }`}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
