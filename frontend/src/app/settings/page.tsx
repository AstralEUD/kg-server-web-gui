"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Cog, FolderOpen, Save, Server, Package, User, Loader2, CheckCircle } from "lucide-react"

interface AppSettings {
    serverPath: string
    addonsPath: string
    profilesPath: string
    steamcmdPath: string
    defaultServerName: string
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<AppSettings>({
        serverPath: "",
        addonsPath: "",
        profilesPath: "",
        steamcmdPath: "",
        defaultServerName: "default"
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
            const res = await fetch("http://localhost:3000/api/settings", { credentials: "include" })
            if (res.ok) {
                const data = await res.json()
                setSettings(data)
            }
        } catch (e) {
            console.error("설정 로드 실패", e)
        }
        setLoading(false)
    }

    const saveSettings = async () => {
        setSaving(true)
        setSaved(false)
        try {
            const res = await fetch("http://localhost:3000/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(settings)
            })
            if (res.ok) {
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
            }
        } catch (e) {
            console.error("설정 저장 실패", e)
        }
        setSaving(false)
    }

    const updateSetting = (key: keyof AppSettings, value: string) => {
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
                </Tabs>
            </div>
        </div>
    )
}
