"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Square, RefreshCw, Loader2, Download, Layers, ChevronRight } from "lucide-react"
import Link from "next/link"

import LogViewer from '@/components/LogViewer'

export default function Dashboard() {
  const searchParams = useSearchParams()
  const serverId = searchParams.get('server') || 'default'

  const [status, setStatus] = useState<{ running: boolean; pid: number } | null>(null)
  const [presets, setPresets] = useState<any[]>([])
  const [steamcmdStatus, setSteamcmdStatus] = useState<any>(null)
  const [servers, setServers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchStatus = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/status?id=${serverId}`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setStatus({ running: data.running, pid: data.pid })
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

  const handleDownloadServer = async () => {
    try {
      await fetch("http://localhost:3000/api/steamcmd/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experimental: false, serverId: serverId }),
        credentials: "include"
      })
      alert("다운로드가 시작되었습니다.")
    } catch (e) { }
  }

  const handleAction = async (action: string) => {
    setLoading(true)
    try {
      // Use new instance API endpoints
      await fetch(`http://localhost:3000/api/servers/${serverId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ args: [] }),
        credentials: "include"
      })
    } catch (e) { }
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
            <LogViewer serverId={serverId} />
          </div>
        </div>

        {/* Presets List */}
        {presets.length > 0 && (
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
