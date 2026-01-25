"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Cog, FolderOpen, Save, Server, Package, User, Loader2, CheckCircle, Download, Upload } from "lucide-react"
import { toast } from "sonner"

import { apiGet, apiPost, apiFetch } from "@/lib/api"

interface AppSettings {
    serverPath: string
    addonsPath: string
    profilesPath: string
    steamcmdPath: string
    defaultServerName: string
    discordWebhookUrl: string
    enableWatchdog: boolean
    discordBotToken: string
    discordChannelId: string
    enableDiscordBot: boolean
    enableRconMonitor: boolean
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<AppSettings>({
        serverPath: "",
        addonsPath: "",
        profilesPath: "",
        steamcmdPath: "",
        defaultServerName: "default",
        discordWebhookUrl: "",
        enableWatchdog: false,
        discordBotToken: "",
        discordChannelId: "",
        enableDiscordBot: false,
        enableRconMonitor: false
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        setLoading(true)
        try {
            const data = await apiGet<AppSettings>("/api/settings")
            setSettings(data)
        } catch (e) {
            console.error("설정 로드 실패", e)
        }
        setLoading(false)
    }

    const saveSettings = async () => {
        setSaving(true)
        setSaved(false)
        try {
            await apiPost("/api/settings", settings)
            setSaved(true)
            toast.success("설정이 저장되었습니다.")
            setTimeout(() => setSaved(false), 3000)
        } catch (e: any) {
            toast.error(e.message || "설정 저장에 실패했습니다.")
        }
        setSaving(false)
    }

    const exportSettings = async () => {
        try {
            const data = await apiGet<any>("/api/settings/export")
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `kg_manager_backup_${new Date().toISOString().split('T')[0]}.json`
            a.click()
            toast.success("백업 파일이 다운로드되었습니다.")
        } catch (e: any) {
            toast.error(e.message || "백업 생성 중 오류가 발생했습니다.")
        }
    }

    const importSettings = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (event) => {
            try {
                const content = event.target?.result as string
                const data = JSON.parse(content)
                const res = await apiFetch("/api/settings/import", {
                    method: "POST",
                    body: JSON.stringify(data)
                })
                if (res.ok) {
                    toast.success("백업을 성공적으로 불러왔습니다. 페이지를 새로고침하세요.")
                    fetchSettings()
                } else {
                    toast.error("백업 파일 형식이 올바르지 않습니다.")
                }
            } catch (e) {
                toast.error("백업 불러오기 중 오류가 발생했습니다.")
            }
        }
        reader.readAsText(file)
    }

    const updateSetting = (key: keyof AppSettings, value: string | boolean) => {
        setSettings(prev => ({ ...prev, [key]: value }))
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">
                            환경 설정
                        </h1>
                        <p className="text-zinc-400 mt-1">서버, 애드온, 프로필 경로 등을 설정합니다</p>
                    </div>
                    <Button onClick={saveSettings} disabled={saving} className="gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {saved ? "저장됨!" : "저장"}
                    </Button>
                </div>

                <Tabs defaultValue="paths" className="space-y-6">
                    <TabsList className="bg-zinc-800/50 p-1 rounded-lg">
                        <TabsTrigger value="paths">경로 설정</TabsTrigger>
                        <TabsTrigger value="general">일반 설정</TabsTrigger>
                        <TabsTrigger value="monitoring">모니터링 & 알림</TabsTrigger>
                        <TabsTrigger value="backup">백업 및 복구</TabsTrigger>
                    </TabsList>

                    {/* Paths Tab */}
                    <TabsContent value="paths">
                        <Card className="bg-zinc-800/50 border-zinc-700">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <FolderOpen className="w-5 h-5" /> 경로 설정
                                    </CardTitle>
                                    <CardDescription>
                                        서버 파일과 데이터가 저장될 경로를 지정합니다.
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label className="whitespace-nowrap">빠른 템플릿:</Label>
                                    <select
                                        className="bg-zinc-900 border border-zinc-700 rounded text-xs p-1"
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === "portable") {
                                                setSettings(prev => ({
                                                    ...prev,
                                                    serverPath: ".\\server",
                                                    addonsPath: ".\\addons",
                                                    profilesPath: ".\\profiles",
                                                    steamcmdPath: ".\\steamcmd"
                                                }))
                                            } else if (val === "default") {
                                                setSettings(prev => ({
                                                    ...prev,
                                                    serverPath: "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Arma Reforger Server",
                                                    addonsPath: "C:\\Users\\Administrator\\Documents\\My Games\\ArmaReforger\\addons",
                                                    profilesPath: "C:\\Users\\Administrator\\Documents\\My Games\\ArmaReforger\\profile",
                                                    steamcmdPath: "C:\\SteamCMD"
                                                }))
                                            }
                                        }}
                                    >
                                        <option value="">선택하세요</option>
                                        <option value="portable">Portable (현재 폴더 기준)</option>
                                        <option value="default">Standard (기본 설치 경로)</option>
                                    </select>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Server className="w-4 h-4 text-amber-400" /> 서버 경로
                                    </Label>
                                    <Input
                                        placeholder="예: C:\ArmaReforger\Server"
                                        className="bg-zinc-900 border-zinc-700"
                                        value={settings.serverPath}
                                        onChange={e => updateSetting("serverPath", e.target.value)}
                                    />
                                    <p className="text-xs text-zinc-500">ArmaReforgerServer.exe가 위치한 폴더</p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-emerald-400" /> 애드온 경로
                                    </Label>
                                    <Input
                                        placeholder="예: C:\ArmaReforger\Addons"
                                        className="bg-zinc-900 border-zinc-700"
                                        value={settings.addonsPath}
                                        onChange={e => updateSetting("addonsPath", e.target.value)}
                                    />
                                    <p className="text-xs text-zinc-500">모드가 저장되는 폴더</p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-cyan-400" /> 프로필 경로
                                    </Label>
                                    <Input
                                        placeholder="예: C:\ArmaReforger\Profiles"
                                        className="bg-zinc-900 border-zinc-700"
                                        value={settings.profilesPath}
                                        onChange={e => updateSetting("profilesPath", e.target.value)}
                                    />
                                    <p className="text-xs text-zinc-500">서버 프로필이 저장되는 폴더</p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Cog className="w-4 h-4 text-purple-400" /> SteamCMD 경로
                                    </Label>
                                    <Input
                                        placeholder="예: C:\SteamCMD"
                                        className="bg-zinc-900 border-zinc-700"
                                        value={settings.steamcmdPath}
                                        onChange={e => updateSetting("steamcmdPath", e.target.value)}
                                    />
                                    <p className="text-xs text-zinc-500">SteamCMD가 설치된 폴더 (비워두면 자동 다운로드)</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* General Tab */}
                    <TabsContent value="general">
                        <Card className="bg-zinc-800/50 border-zinc-700">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Cog className="w-5 h-5" /> 일반 설정
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>기본 서버 이름</Label>
                                    <Input
                                        placeholder="기본 서버"
                                        className="bg-zinc-900 border-zinc-700"
                                        value={settings.defaultServerName}
                                        onChange={e => updateSetting("defaultServerName", e.target.value)}
                                    />
                                    <p className="text-xs text-zinc-500">다중 서버 사용 시 기본으로 선택되는 서버 이름</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Monitoring Tab */}
                    <TabsContent value="monitoring">
                        <Card className="bg-zinc-800/50 border-zinc-700">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Server className="w-5 h-5 text-blue-400" /> 모니터링 & 알림
                                </CardTitle>
                                <CardDescription>
                                    서버 자동 재시작 및 디스코드 알림을 설정합니다.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg border border-zinc-700">
                                    <div>
                                        <Label className="font-semibold text-base">Watchdog (자동 재시작)</Label>
                                        <p className="text-sm text-zinc-400">서버 충돌(Crash) 감지 시 자동으로 재시작합니다.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={settings.enableWatchdog}
                                            onChange={(e) => updateSetting("enableWatchdog", e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <span className="text-indigo-400 font-bold">Discord</span> Webhook URL
                                    </Label>
                                    <Input
                                        placeholder="https://discord.com/api/webhooks/..."
                                        className="bg-zinc-900 border-zinc-700"
                                        value={settings.discordWebhookUrl}
                                        onChange={e => updateSetting("discordWebhookUrl", e.target.value)}
                                    />
                                    <p className="text-xs text-zinc-500">서버 상태 변경(시작, 중지, 충돌)시 알림을 보낼 Webhook 주소</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Discord Bot Settings */}
                        <Card className="bg-zinc-800/50 border-zinc-700">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <span className="text-purple-400 font-bold">Discord Bot</span> 채팅 명령어
                                </CardTitle>
                                <CardDescription>
                                    Discord에서 !map, !maps 등의 명령어를 사용합니다.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg border border-zinc-700">
                                    <div>
                                        <Label className="font-semibold text-base">Discord Bot 활성화</Label>
                                        <p className="text-sm text-zinc-400">Discord 채팅에서 맵 변경 명령어를 사용합니다.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={settings.enableDiscordBot}
                                            onChange={(e) => updateSetting("enableDiscordBot", e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                    </label>
                                </div>

                                <div className="space-y-2">
                                    <Label>Bot Token</Label>
                                    <Input
                                        type="password"
                                        placeholder="Discord Developer Portal에서 발급받은 Bot Token"
                                        className="bg-zinc-900 border-zinc-700"
                                        value={settings.discordBotToken}
                                        onChange={e => updateSetting("discordBotToken", e.target.value)}
                                    />
                                    <p className="text-xs text-zinc-500">
                                        <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
                                            Discord Developer Portal
                                        </a>에서 Bot을 생성하고 Token을 발급받으세요.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Channel ID (선택)</Label>
                                    <Input
                                        placeholder="명령어를 수신할 채널 ID (비워두면 모든 채널)"
                                        className="bg-zinc-900 border-zinc-700"
                                        value={settings.discordChannelId}
                                        onChange={e => updateSetting("discordChannelId", e.target.value)}
                                    />
                                    <p className="text-xs text-zinc-500">특정 채널에서만 명령어를 처리하려면 채널 ID를 입력하세요.</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* RCON Monitor Settings */}
                        <Card className="bg-zinc-800/50 border-zinc-700">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <span className="text-cyan-400 font-bold">게임 내</span> 채팅 명령어
                                </CardTitle>
                                <CardDescription>
                                    게임 내에서 !map, !maps 등의 명령어를 사용합니다. (RCON 필요)
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg border border-zinc-700">
                                    <div>
                                        <Label className="font-semibold text-base">RCON 채팅 모니터 활성화</Label>
                                        <p className="text-sm text-zinc-400">게임 채팅을 모니터링하여 명령어를 처리합니다.</p>
                                        <p className="text-xs text-yellow-500 mt-1">⚠️ server.json에 RCON이 설정되어 있어야 합니다.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={settings.enableRconMonitor}
                                            onChange={(e) => updateSetting("enableRconMonitor", e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                                    </label>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="backup">
                        <Card className="bg-zinc-800/50 border-zinc-700">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Download className="w-5 h-5 text-blue-400" /> 데이터 백업 및 복구
                                </CardTitle>
                                <CardDescription>
                                    현재 설정, 맵 매핑, 스케줄러 작업을 하나로 묶어 내보내거나 가져옵니다.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-700 space-y-3">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <Download className="w-4 h-4" /> 설정 내보내기
                                        </h3>
                                        <p className="text-sm text-zinc-400">모든 구성을 JSON 파일로 다운로드합니다.</p>
                                        <Button onClick={exportSettings} variant="outline" className="w-full bg-zinc-800 border-zinc-700">
                                            지금 백업하기
                                        </Button>
                                    </div>
                                    <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-700 space-y-3">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <Upload className="w-4 h-4" /> 백업 불러오기
                                        </h3>
                                        <p className="text-sm text-zinc-400">이전에 저장한 백업 파일을 불러옵니다.</p>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept=".json"
                                                onChange={importSettings}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                            <Button variant="outline" className="w-full bg-zinc-800 border-zinc-700">
                                                파일 선택...
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
