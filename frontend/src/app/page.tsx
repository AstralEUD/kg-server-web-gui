"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Square, RefreshCw, Loader2, Download, Layers, ChevronRight } from "lucide-react"
import Link from "next/link"
import { apiGet, apiPost } from "@/lib/api"
import { toast } from "sonner"

import LogViewer from '@/components/LogViewer'

import ResourceMonitor from '@/components/ResourceMonitor'

export default function Dashboard() {
  const searchParams = useSearchParams()
  const serverId = searchParams.get('server') || 'default'

  const [status, setStatus] = useState<{ running: boolean; pid: number } | null>(null)
  const [presets, setPresets] = useState<any[]>([])
  const [steamcmdStatus, setSteamcmdStatus] = useState<any>(null)
  const [servers, setServers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showLogs, setShowLogs] = useState(true)
  const [showPresets, setShowPresets] = useState(true)
  const [showStats, setShowStats] = useState(true)

  const fetchStatus = async () => {
    try {
      const data = await apiGet<{ running: boolean; pid: number }>(`/api/status?id=${serverId}`)
      setStatus(data)
    } catch (e) { setStatus({ running: false, pid: 0 }); console.error('Status fetch error:', e) }
  }

  const fetchPresets = async () => {
    try {
      const data = await apiGet<any[]>("/api/presets")
      setPresets(data || [])
    } catch (e) { console.error('Presets fetch error:', e) }
  }

  const applyPreset = async (id: string) => {
    if (!confirm("프리셋을 적용하시겠습니까?")) return
    try {
      await apiPost(`/api/presets/${id}/apply`)
      alert("적용되었습니다.")
    } catch (e) { console.error('Preset apply error:', e) }
  }

  const fetchSteamCMDStatus = async () => {
    try {
      const data = await apiGet<any>("/api/steamcmd/status")
      setSteamcmdStatus(data)
    } catch (e) { console.error('SteamCMD status error:', e) }
  }

  const fetchServers = async () => {
    try {
      const data = await apiGet<any[]>("/api/servers")
      setServers(data || [])
    } catch (e) { console.error('Servers fetch error:', e) }
  }

  const handleDownloadServer = async () => {
    try {
      await apiPost("/api/steamcmd/download", { experimental: false, serverId: serverId })
      alert("다운로드가 시작되었습니다.")
    } catch (e) { console.error('Download error:', e) }
  }


  const handleAction = async (action: string) => {
    setLoading(true)
    try {
      await apiPost(`/api/servers/${serverId}/${action}`, { args: [] })
      toast.success(`${action} 완료`)
    } catch (e) { toast.error(`${action} 실패`) }
    setLoading(false)
  }

  const handleBulkRestart = async () => {
    if (!confirm("모든 활성 서버를 재시작하시겠습니까?")) return
    setLoading(true)
    try {
      for (const s of servers) {
        if (s.status === "running") {
          await apiPost(`/api/servers/${s.id}/restart`)
        }
      }
      toast.success("모든 서버 재시작 명령이 전송되었습니다.")
    } catch (e) { toast.error("일괄 재시작 도중 오류가 발생했습니다.") }
    setLoading(false)
  }

  useEffect(() => {
    fetchStatus()
    fetchPresets()
    fetchSteamCMDStatus()
    fetchServers()

    const statusInterval = setInterval(fetchStatus, 3000)
    const steamInterval = setInterval(fetchSteamCMDStatus, 5000)

    return () => {
      clearInterval(statusInterval)
      clearInterval(steamInterval)
    }
  }, [serverId]) // Re-fetch when ID changes

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">
              대시보드
            </h1>
            <p className="text-zinc-400 mt-1">서버 상태 및 시스템 리소스 모니터링</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-zinc-800/50 p-1 rounded-lg border border-zinc-700 mr-4">
              <Button variant="ghost" size="sm" onClick={() => setShowStats(!showStats)} className={`text-xs px-2 ${showStats ? 'text-amber-500 bg-amber-500/10' : 'text-zinc-500'}`}>성능</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowLogs(!showLogs)} className={`text-xs px-2 ${showLogs ? 'text-amber-500 bg-amber-500/10' : 'text-zinc-500'}`}>로그</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowPresets(!showPresets)} className={`text-xs px-2 ${showPresets ? 'text-amber-500 bg-amber-500/10' : 'text-zinc-500'}`}>프리셋</Button>
            </div>

            <Button variant="outline" size="sm" onClick={handleBulkRestart} className="border-red-500/30 text-red-500 hover:bg-red-500/10">
              일괄 재시작
            </Button>

            {presets.length > 0 && (
              <div className="flex items-center gap-3 bg-zinc-800/50 p-2 rounded-lg border border-zinc-700">
                <span className="text-sm text-zinc-400">빠른 프로필:</span>
                <Select onValueChange={applyPreset}>
                  <SelectTrigger className="w-[160px] h-8 bg-zinc-900 border-zinc-600 text-sm">
                    <SelectValue placeholder="프로필 선택" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                    {presets.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Global Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-800/20 border-zinc-700/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="text-sm text-zinc-500">활성 서버</div>
              <div className="text-xl font-bold">{servers.filter(s => s.status === "running").length} / {servers.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-800/20 border-zinc-700/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="text-sm text-zinc-500">총 플레이어</div>
              <div className="text-xl font-bold text-amber-500">-</div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-800/20 border-zinc-700/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="text-sm text-zinc-500">충돌(오늘)</div>
              <div className="text-xl font-bold text-red-500">0</div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-800/20 border-zinc-700/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="text-sm text-zinc-500">가동률</div>
              <div className="text-xl font-bold text-emerald-500">100%</div>
            </CardContent>
          </Card>
        </div>

        {/* Resource Monitor */}
        {showStats && <ResourceMonitor serverId={serverId} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Controls & Status */}
          <div className="space-y-6">
            {/* Server Control */}
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-zinc-400">서버 제어</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-3 h-3 rounded-full ${status?.running ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                  <span className="text-xl font-bold">
                    {status?.running ? "실행 중" : "중지됨"}
                  </span>
                  {status?.pid && <span className="text-xs text-zinc-500 ml-auto">PID: {status.pid}</span>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleAction("start")}
                    disabled={loading || status?.running}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    시작
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={() => handleAction("stop")}
                    disabled={loading || !status?.running}
                  >
                    <Square className="w-4 h-4" /> 중지
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-2 border-zinc-700 hover:bg-zinc-800"
                  onClick={() => handleAction("restart")}
                  disabled={loading}
                >
                  <RefreshCw className="w-4 h-4" /> 재시작
                </Button>
              </CardContent>
            </Card>

            {/* SteamCMD Status */}
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">SteamCMD 상태</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-zinc-300">엔진 상태:</span>
                  <Badge variant={steamcmdStatus?.serverInstalled ? "default" : "destructive"}>
                    {steamcmdStatus?.serverInstalled ? "설치됨" : "미설치"}
                  </Badge>
                </div>
                {!steamcmdStatus?.serverInstalled && (
                  <Button size="sm" className="w-full gap-2 mt-2" onClick={handleDownloadServer}>
                    <Download className="w-4 h-4" /> 서버 다운로드
                  </Button>
                )}
                {steamcmdStatus?.running && (
                  <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> 작업 진행 중...
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Logs */}
          <div className="lg:col-span-2">
            {showLogs ? <LogViewer serverId={serverId} /> : (
              <Card className="bg-zinc-800/20 border-zinc-700 h-[600px] flex items-center justify-center text-zinc-600 italic">
                Logs hidden. Enable in dashboard settings.
              </Card>
            )}
          </div>
        </div>

        {/* Presets List */}
        {showPresets && presets.length > 0 && (
          <Card className="bg-zinc-800/30 border-zinc-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-zinc-400 text-sm">
                <Layers className="w-4 h-4" /> 추천 프리셋
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {presets.slice(0, 5).map(preset => (
                  <Button
                    key={preset.id}
                    variant="ghost"
                    size="sm"
                    className="gap-2 border border-zinc-700/50 bg-zinc-900/50 hover:bg-zinc-800"
                    onClick={() => applyPreset(preset.id)}
                  >
                    {preset.name}
                    <ChevronRight className="w-3 h-3 text-zinc-500" />
                  </Button>
                ))}
                <Link href="/presets">
                  <Button variant="ghost" size="sm" className="text-zinc-500">모든 프리셋 관리</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
