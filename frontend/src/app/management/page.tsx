"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { apiGet, apiPost, apiDelete } from "@/lib/api"

// ... (AdvancedSettings and defaultSettings omitted)

export default function ManagementPage() {
    const router = useRouter()
    const [settings, setSettings] = useState<AdvancedSettings>(defaultSettings)
    const [saving, setSaving] = useState(false)
    const [downloading, setDownloading] = useState(false)

    // Server Management State
    const [servers, setServers] = useState<any[]>([])
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [newServerName, setNewServerName] = useState("")
    const [newServerId, setNewServerId] = useState("")
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        fetchServers()
    }, [])

    const fetchServers = async () => {
        try {
            const data = await apiGet<any[]>("/api/servers")
            setServers(data || [])
        } catch (e) { }
    }

    const update = <K extends keyof AdvancedSettings>(key: K, value: AdvancedSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }))
    }

    const saveSettings = async () => {
        setSaving(true)
        // Simulate save
        await new Promise(r => setTimeout(r, 1000))
        setSaving(false)
    }

    const downloadServer = async () => {
        setDownloading(true)
        try {
            await apiPost("/api/steamcmd/download", { experimental: false })
            alert("다운로드가 시작되었습니다. 로그를 확인하세요.")
        } catch (e: any) {
            console.error(e)
            alert(e.message || "다운로드 시작 실패")
        }
        setDownloading(false)
    }

    const createServer = async () => {
        if (!newServerId || !newServerName) {
            alert("ID와 이름을 모두 입력해주세요.")
            return
        }
        setCreating(true)
        try {
            await apiPost("/api/servers", { id: newServerId, name: newServerName })
            setCreateDialogOpen(false)
            setNewServerName("")
            setNewServerId("")
            fetchServers()
        } catch (e: any) {
            alert("생성 실패: " + (e.message || "알 수 없는 오류"))
        }
        setCreating(false)
    }

    const deleteServer = async (id: string) => {
        if (!confirm(`서버 '${id}'를 정말 삭제하시겠습니까?`)) return
        try {
            await apiDelete(`/api/servers/${id}`)
            fetchServers()
        } catch (e) { }
    }

    const switchToServer = (id: string) => {
        router.push(`/?server=${id}`)
    }

    const SettingRow = ({
        label, description, enabled, onEnabledChange, children
    }: {
        label: string; description?: string; enabled: boolean; onEnabledChange: (v: boolean) => void; children?: React.ReactNode
    }) => (
        <div className="flex items-start justify-between p-4 rounded-lg border border-zinc-800 bg-zinc-900/30">
            <div className="space-y-1">
                <div className="font-medium text-zinc-200">{label}</div>
                {description && <div className="text-sm text-zinc-500">{description}</div>}
                {children && <div className="pt-2">{children}</div>}
            </div>
            <Switch checked={enabled} onCheckedChange={onEnabledChange} />
        </div>
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">
                            서버 관리
                        </h1>
                        <p className="text-zinc-400 mt-1">고급 서버 관리 및 유지보수 도구</p>
                    </div>
                </div>

                <div className="grid gap-6">
                    {/* Server Instance Management */}
                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Server className="w-5 h-5 text-blue-400" /> 서버 인스턴스
                                </CardTitle>
                                <CardDescription>다중 서버 인스턴스를 생성하고 관리합니다</CardDescription>
                            </div>
                            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
                                        <Plus className="w-4 h-4" /> 새 서버 추가
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                                    <DialogHeader>
                                        <DialogTitle>새 서버 인스턴스 생성</DialogTitle>
                                        <DialogDescription>새로운 Arma Reforger 서버 인스턴스를 설정합니다.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>서버 ID (고유 식별자)</Label>
                                            <Input
                                                placeholder="my-server-2"
                                                value={newServerId}
                                                onChange={e => setNewServerId(e.target.value)}
                                                className="bg-zinc-800 border-zinc-700"
                                            />
                                            <p className="text-xs text-zinc-500">영문 소문자와 숫자, 하이픈만 사용 가능</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>서버 표시 이름</Label>
                                            <Input
                                                placeholder="My Awesome Server #2"
                                                value={newServerName}
                                                onChange={e => setNewServerName(e.target.value)}
                                                className="bg-zinc-800 border-zinc-700"
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="bg-transparent border-zinc-700 hover:bg-zinc-800">취소</Button>
                                        <Button onClick={createServer} disabled={creating} className="bg-blue-600 hover:bg-blue-700">
                                            {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                            생성
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-zinc-700 hover:bg-zinc-800/50">
                                        <TableHead className="text-zinc-400">ID</TableHead>
                                        <TableHead className="text-zinc-400">이름</TableHead>
                                        <TableHead className="text-zinc-400">상태</TableHead>
                                        <TableHead className="text-right text-zinc-400">관리</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {servers.map(server => (
                                        <TableRow key={server.id} className="border-zinc-700 hover:bg-zinc-800/50">
                                            <TableCell className="font-mono text-xs">{server.id}</TableCell>
                                            <TableCell className="font-medium">{server.name}</TableCell>
                                            <TableCell>
                                                <Badge variant={server.status === "running" ? "default" : "secondary"} className={server.status === "running" ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-zinc-700 text-zinc-400"}>
                                                    {server.status === "running" ? "실행 중" : "중지됨"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-emerald-400" onClick={() => switchToServer(server.id)} title="대시보드로 이동">
                                                    <Gauge className="w-4 h-4" />
                                                </Button>
                                                {server.id !== "default" && (
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/30" onClick={() => deleteServer(server.id)} title="삭제">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Maintenance Tools */}
                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-yellow-400" /> 유지보수 도구
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-900 border border-zinc-700">
                                <div>
                                    <div className="font-medium">서버 강제 업데이트 / 재설치</div>
                                    <div className="text-sm text-zinc-500">SteamCMD를 통해 서버 파일을 확인하고 업데이트합니다</div>
                                </div>
                                <Button onClick={downloadServer} disabled={downloading} variant="outline" className="gap-2 bg-transparent border-zinc-700 hover:bg-zinc-800">
                                    {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    업데이트 시작
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Advanced Operations */}
                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-gray-400" /> 고급 운영 설정
                            </CardTitle>
                            <Button onClick={saveSettings} disabled={saving} size="sm" className="gap-2">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                설정 저장
                            </Button>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <SettingRow
                                label="FPS 제한"
                                description="서버의 최대 프레임 속도를 제한합니다"
                                enabled={settings.limitServerMaxFPS}
                                onEnabledChange={v => update("limitServerMaxFPS", v)}
                            >
                                {settings.limitServerMaxFPS && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <Input
                                            type="number"
                                            value={settings.maxFPS}
                                            onChange={e => update("maxFPS", parseInt(e.target.value))}
                                            className="w-24 bg-zinc-800 border-zinc-700 h-8"
                                        />
                                        <span className="text-sm text-zinc-500">FPS</span>
                                    </div>
                                )}
                            </SettingRow>

                            <SettingRow
                                label="자동 재시작 스케줄러"
                                description="매일 정해진 시간에 서버를 자동으로 재시작합니다"
                                enabled={settings.autoRestart}
                                onEnabledChange={v => update("autoRestart", v)}
                            >
                                {settings.autoRestart && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <Clock className="w-4 h-4 text-zinc-500" />
                                        <Input
                                            type="time"
                                            value={settings.restartTime}
                                            onChange={e => update("restartTime", e.target.value)}
                                            className="w-32 bg-zinc-800 border-zinc-700 h-8"
                                        />
                                    </div>
                                )}
                            </SettingRow>

                            <SettingRow
                                label="애드온 검증 및 복구"
                                description="서버 시작 시 손상된 애드온을 확인하고 복구합니다"
                                enabled={settings.verifyRepairAddons}
                                onEnabledChange={v => update("verifyRepairAddons", v)}
                            />

                            <SettingRow
                                label="게임 종료 시 자동 재시작"
                                description="크래시나 예기치 않은 종료 발생 시 자동으로 서버를 다시 시작합니다"
                                enabled={settings.restartOnGameDestroyed}
                                onEnabledChange={v => update("restartOnGameDestroyed", v)}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
