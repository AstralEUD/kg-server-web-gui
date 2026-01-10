"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play, Square, RefreshCw, Activity, Terminal, Server, Cpu, HardDrive, Loader2, Download, Trash2, Layers, ChevronRight } from "lucide-react"
import Link from "next/link"

interface LogEntry {
  timestamp: string
  level: string
  message: string
}

interface Preset {
  id: string
  name: string
  description?: string
}

interface ServerInstance {
  id: string
  name: string
  status: string
  path: string
}

export default function Dashboard() {
  const [status, setStatus] = useState<{ running: boolean; pid: number } | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [steamcmdStatus, setSteamcmdStatus] = useState<{ running: boolean; serverInstalled: boolean; steamcmdInstalled: boolean } | null>(null)
  const [presets, setPresets] = useState<Preset[]>([])
  const [servers, setServers] = useState<ServerInstance[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)
  const lastTimestampRef = useRef<string | null>(null)

  const fetchStatus = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/status", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch (e) { }
  }

  const fetchSteamcmdStatus = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/steamcmd/status", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setSteamcmdStatus(data)
      }
    } catch (e) { }
  }

  const fetchPresets = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/presets", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setPresets(data || [])
      }
    } catch (e) { }
  }

  const fetchServers = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/servers", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setServers(data || [])
      }
    } catch (e) { }
  }

  const fetchLogs = async () => {
    try {
      let url = "http://localhost:3000/api/logs"
      if (lastTimestampRef.current) {
        url += `?since=${encodeURIComponent(lastTimestampRef.current)}`
      }
      const res = await fetch(url, { credentials: "include" })
      if (res.ok) {
        const data: LogEntry[] = await res.json()
        if (data && data.length > 0) {
          if (lastTimestampRef.current) {
            setLogs(prev => [...prev, ...data])
          } else {
            setLogs(data)
          }
          lastTimestampRef.current = data[data.length - 1].timestamp
        }
      }
    } catch (e) { }
  }

  useEffect(() => {
    fetchStatus()
    fetchSteamcmdStatus()
    fetchLogs()
    fetchPresets()
    fetchServers()

    const statusInterval = setInterval(fetchStatus, 3000)
    const logsInterval = setInterval(fetchLogs, 2000)

    return () => {
      clearInterval(statusInterval)
      clearInterval(logsInterval)
    }
  }, [])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  const handleAction = async (action: "start" | "stop" | "restart") => {
    setLoading(true)
    try {
      await fetch(`http://localhost:3000/api/server/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      })
    } catch (e) {
      console.error(`${action} 실패`, e)
    }
    setLoading(false)
    setTimeout(fetchStatus, 500)
  }

  const handleDownloadServer = async () => {
    try {
      await fetch("http://localhost:3000/api/steamcmd/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ experimental: false }),
      })
    } catch (e) { }
  }

  const applyPreset = async (id: string) => {
    try {
      await fetch(`http://localhost:3000/api/presets/${id}/apply`, {
        method: "POST",
        credentials: "include",
      })
      fetchLogs()
    } catch (e) { }
  }

  const clearLogs = async () => {
    try {
      await fetch("http://localhost:3000/api/logs", {
        method: "DELETE",
        credentials: "include",
      })
      setLogs([])
      lastTimestampRef.current = null
    } catch (e) { }
  }

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString("ko-KR")
    } catch {
      return ts
    }
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
            <p className="text-zinc-400 mt-1">서버 상태 모니터링 및 관리</p>
          </div>
        </div>

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

        {/* Presets Card */}
        {presets.length > 0 && (
          <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border-amber-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-amber-400">
                <Layers className="w-5 h-5" /> 프리셋
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
                  <Button variant="ghost" size="sm">모든 프리셋 보기</Button>
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
              <Button variant="ghost" size="sm" onClick={clearLogs}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] bg-zinc-900 rounded-lg p-4 font-mono text-sm">
                {logs.length === 0 ? (
                  <p className="text-zinc-500">로그가 없습니다</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex gap-2 py-0.5">
                      <span className="text-zinc-500 shrink-0">[{formatTime(log.timestamp)}]</span>
                      <span className={
                        log.level === "ERROR" ? "text-red-400" :
                          log.level === "WARN" ? "text-yellow-400" :
                            "text-zinc-300"
                      }>
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
