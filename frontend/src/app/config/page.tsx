"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Save, Settings, Globe, Gamepad2, Cpu, Radio, Database, Loader2, Download, RefreshCw } from "lucide-react"

interface ServerConfig {
    bindAddress?: string
    bindPort?: number
    publicAddress?: string
    publicPort?: number
    game: {
        name: string
        password?: string
        passwordAdmin?: string
        scenarioId: string
        maxPlayers: number
        visible: boolean
        crossPlatform: boolean
        modsRequiredByDefault: boolean
        admins: string[]
        gameProperties: {
            serverMaxViewDistance: number
            serverMinGrassDistance: number
            networkViewDistance: number
            disableThirdPerson: boolean
            fastValidation: boolean
            battlEye: boolean
            VONDisableUI: boolean
            VONDisableDirectSpeechUI: boolean
            VONCanTransmitCrossFaction: boolean
            persistence?: {
                autoSaveInterval: number
            }
            missionHeader?: Record<string, any>
        }
        mods: { modId: string; name?: string; required?: boolean }[]
    }
    a2s?: {
        address: string
        port: number
    }
    operating: {
        lobbyPlayerSynchronise: boolean
        playerSaveTime: number
        aiLimit: number
        slotReservationTimeout: number
        disableServerShutdown: boolean
        disableCrashReporter: boolean
        disableAI: boolean
        joinQueue: {
            maxSize: number
        }
    }
}

const defaultConfig: ServerConfig = {
    bindAddress: "0.0.0.0",
    bindPort: 2001,
    publicAddress: "",
    publicPort: 2001,
    game: {
        name: "",
        password: "",
        passwordAdmin: "",
        scenarioId: "",
        maxPlayers: 64,
        visible: true,
        crossPlatform: true,
        modsRequiredByDefault: true,
        admins: [],
        gameProperties: {
            serverMaxViewDistance: 1600,
            serverMinGrassDistance: 50,
            networkViewDistance: 1500,
            disableThirdPerson: false,
            fastValidation: true,
            battlEye: false,
            VONDisableUI: false,
            VONDisableDirectSpeechUI: true,
            VONCanTransmitCrossFaction: true,
            persistence: {
                autoSaveInterval: 10
            }
        },
        mods: [],
    },
    a2s: { address: "0.0.0.0", port: 17777 },
    operating: {
        lobbyPlayerSynchronise: true,
        playerSaveTime: 300,
        aiLimit: -1,
        slotReservationTimeout: 60,
        disableServerShutdown: true,
        disableCrashReporter: false,
        disableAI: false,
        joinQueue: { maxSize: 0 }
    },
}

export default function ConfigPage() {
    const [config, setConfig] = useState<ServerConfig>(defaultConfig)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [adminsText, setAdminsText] = useState("")
    const [rawConfig, setRawConfig] = useState("")
    const [activeTab, setActiveTab] = useState("server")

    useEffect(() => {
        fetchConfig()
    }, [])


    useEffect(() => {
        if (activeTab === "raw") {
            fetchRawConfig()
        }
    }, [activeTab])

    const fetchConfig = async () => {
        setLoading(true)
        try {
            const res = await fetch("http://localhost:3000/api/config", { credentials: "include" })
            if (res.ok) {
                const data = await res.json()
                // Ensure nested objects exist to avoid crashes
                if (!data.game.gameProperties) data.game.gameProperties = defaultConfig.game.gameProperties
                if (!data.operating) data.operating = defaultConfig.operating
                if (!data.operating.joinQueue) data.operating.joinQueue = defaultConfig.operating.joinQueue

                setConfig({ ...defaultConfig, ...data })
                setAdminsText(data.game?.admins?.join("\n") || "")
            }
        } catch (e) {
            console.error("설정 로드 실패", e)
        }
        setLoading(false)
    }

    const fetchRawConfig = async () => {
        try {
            const res = await fetch("http://localhost:3000/api/config/raw", { credentials: "include" })
            if (res.ok) {
                const data = await res.json()
                setRawConfig(data.content)
            }
        } catch (e) {
            console.error("Raw 설정 로드 실패", e)
        }
    }

    const saveRawConfig = async () => {
        setSaving(true)
        try {
            // Validate JSON
            try {
                JSON.parse(rawConfig)
            } catch (e) {
                alert("유효하지 않은 JSON입니다.")
                setSaving(false)
                return
            }

            const res = await fetch("http://localhost:3000/api/config/raw", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ content: rawConfig }),
            })
            if (res.ok) {
                alert("Raw 설정이 저장되었습니다.")
                fetchConfig() // Refresh parsed config
            } else {
                alert("저장 실패")
            }
        } catch (e) {
            console.error("설정 저장 실패", e)
            alert("설정 저장 실패")
        }
        setSaving(false)
    }

    const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string)
                // Merge logic similar to fetch
                if (!json.game) json.game = defaultConfig.game
                if (!json.game.gameProperties) json.game.gameProperties = defaultConfig.game.gameProperties
                if (!json.operating) json.operating = defaultConfig.operating
                if (!json.operating.joinQueue) json.operating.joinQueue = defaultConfig.operating.joinQueue

                setConfig({ ...defaultConfig, ...json })
                setAdminsText(json.game?.admins?.join("\n") || "")
                alert("설정이 로드되었습니다. 적용하려면 '저장하기'를 눌러주세요.")
            } catch (err) {
                alert("유효하지 않은 설정 파일입니다.")
            }
        }
        reader.readAsText(file)
    }

    const exportConfig = () => {
        const jsonString = JSON.stringify(config, null, 2)
        const blob = new Blob([jsonString], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = "server.json"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const saveConfig = async () => {
        setSaving(true)
        try {
            const updatedConfig = { ...config, game: { ...config.game, admins: adminsText.split("\n").filter(Boolean) } }
            await fetch("http://localhost:3000/api/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(updatedConfig),
            })
            alert("설정이 저장되었습니다.")
        } catch (e) {
            console.error("설정 저장 실패", e)
            alert("설정 저장 실패")
        }
        setSaving(false)
    }

    const updateGame = (field: keyof ServerConfig["game"], value: any) => {
        setConfig(prev => ({ ...prev, game: { ...prev.game, [field]: value } }))
    }

    const updateGameProps = (field: keyof ServerConfig["game"]["gameProperties"], value: any) => {
        setConfig(prev => ({
            ...prev,
            game: { ...prev.game, gameProperties: { ...prev.game.gameProperties, [field]: value } },
        }))
    }

    const updateOperating = (field: keyof ServerConfig["operating"], value: any) => {
        setConfig(prev => ({ ...prev, operating: { ...prev.operating, [field]: value } }))
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">
                            서버 설정
                        </h1>
                        <p className="text-zinc-400 mt-1">Arma Reforger 전용 서버 설정을 관리합니다</p>
                    </div>
                    <div className="flex gap-3">
                        <input
                            type="file"
                            accept=".json"
                            className="hidden"
                            id="config-upload"
                            onChange={importConfig}
                        />
                        <Button variant="outline" className="gap-2" onClick={exportConfig}>
                            <Download className="w-4 h-4" /> 내보내기
                        </Button>
                        <Button variant="outline" className="gap-2" onClick={() => document.getElementById('config-upload')?.click()}>
                            <Upload className="w-4 h-4" /> 불러오기
                        </Button>
                        <Button variant="outline" className="gap-2" onClick={fetchConfig}>
                            <RefreshCw className="w-4 h-4" /> 새로고침
                        </Button>
                        <Button className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700" onClick={activeTab === "raw" ? saveRawConfig : saveConfig} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {activeTab === "raw" ? "Raw 저장" : "저장하기"}
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-zinc-800/50 p-1 rounded-lg">
                        <TabsTrigger value="server" className="gap-2"><Settings className="w-4 h-4" /> 일반</TabsTrigger>
                        <TabsTrigger value="network" className="gap-2"><Globe className="w-4 h-4" /> 네트워크</TabsTrigger>
                        <TabsTrigger value="game" className="gap-2"><Gamepad2 className="w-4 h-4" /> 게임 Play</TabsTrigger>
                        <TabsTrigger value="performance" className="gap-2"><Cpu className="w-4 h-4" /> 성능</TabsTrigger>
                        <TabsTrigger value="von" className="gap-2"><Radio className="w-4 h-4" /> 음성(VON)</TabsTrigger>
                        <TabsTrigger value="operating" className="gap-2"><Database className="w-4 h-4" /> 운영</TabsTrigger>
                        <TabsTrigger value="raw" className="gap-2 text-amber-500"><Database className="w-4 h-4" /> Raw 편집</TabsTrigger>
                    </TabsList>

                    {/* Server Tab */}
                    <TabsContent value="server">
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="bg-zinc-800/50 border-zinc-700">
                                <CardHeader>
                                    <CardTitle>기본 설정</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>서버 이름</Label>
                                        <Input placeholder="My Reforger Server" value={config.game.name} onChange={e => updateGame("name", e.target.value)} className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>서버 비밀번호</Label>
                                        <Input type="password" placeholder="Optional" value={config.game.password} onChange={e => updateGame("password", e.target.value)} className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>관리자 비밀번호</Label>
                                        <Input type="password" placeholder="Admin Password" value={config.game.passwordAdmin} onChange={e => updateGame("passwordAdmin", e.target.value)} className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>최대 플레이어 수</Label>
                                        <Input type="number" value={config.game.maxPlayers} onChange={e => updateGame("maxPlayers", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>서버 공개 여부</Label>
                                        <Switch checked={config.game.visible} onCheckedChange={v => updateGame("visible", v)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>크로스 플랫폼 지원</Label>
                                        <Switch checked={config.game.crossPlatform} onCheckedChange={v => updateGame("crossPlatform", v)} />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-zinc-800/50 border-zinc-700">
                                <CardHeader>
                                    <CardTitle>관리자 (Admins)</CardTitle>
                                    <CardDescription>Steam ID 또는 GUID를 한 줄에 하나씩 입력하세요</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <textarea
                                        className="w-full h-48 bg-zinc-900 border border-zinc-700 rounded-md p-3 font-mono text-sm resize-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                                        placeholder="관리자 ID 입력..."
                                        value={adminsText}
                                        onChange={e => setAdminsText(e.target.value)}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Network Tab */}
                    <TabsContent value="network">
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="bg-zinc-800/50 border-zinc-700">
                                <CardHeader><CardTitle>바인딩 설정</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>바인드 주소 (Bind Address)</Label>
                                        <Input value={config.bindAddress} onChange={e => setConfig({ ...config, bindAddress: e.target.value })} placeholder="0.0.0.0" className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>바인드 포트</Label>
                                        <Input type="number" value={config.bindPort} onChange={e => setConfig({ ...config, bindPort: parseInt(e.target.value) })} className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>공개 주소 (Public Address)</Label>
                                        <Input value={config.publicAddress} onChange={e => setConfig({ ...config, publicAddress: e.target.value })} placeholder="자동 감지" className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>공개 포트</Label>
                                        <Input type="number" value={config.publicPort} onChange={e => setConfig({ ...config, publicPort: parseInt(e.target.value) })} className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-zinc-800/50 border-zinc-700">
                                <CardHeader><CardTitle>A2S (스팀 쿼리)</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>A2S 주소</Label>
                                        <Input value={config.a2s?.address} onChange={e => setConfig({ ...config, a2s: { ...config.a2s!, address: e.target.value } })} placeholder="0.0.0.0" className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>A2S 포트</Label>
                                        <Input type="number" value={config.a2s?.port} onChange={e => setConfig({ ...config, a2s: { ...config.a2s!, port: parseInt(e.target.value) } })} className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Game Play Tab */}
                    <TabsContent value="game">
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="bg-zinc-800/50 border-zinc-700">
                                <CardHeader><CardTitle>게임 플레이 설정</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label>모드 필수 적용 (Mods Required by Default)</Label>
                                        <Switch checked={config.game.modsRequiredByDefault} onCheckedChange={v => updateGame("modsRequiredByDefault", v)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>BattlEye 활성화</Label>
                                        <Switch checked={config.game.gameProperties.battlEye} onCheckedChange={v => updateGameProps("battlEye", v)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>3인칭 시점 비활성화</Label>
                                        <Switch checked={config.game.gameProperties.disableThirdPerson} onCheckedChange={v => updateGameProps("disableThirdPerson", v)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>빠른 검증 (Fast Validation)</Label>
                                        <Switch checked={config.game.gameProperties.fastValidation} onCheckedChange={v => updateGameProps("fastValidation", v)} />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-zinc-800/50 border-zinc-700">
                                <CardHeader><CardTitle>AI 및 봇 설정</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label>AI 비활성화</Label>
                                        <Switch checked={config.operating.disableAI} onCheckedChange={v => updateOperating("disableAI", v)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>AI 제한 (-1 = 기본값)</Label>
                                        <Input type="number" value={config.operating.aiLimit} onChange={e => updateOperating("aiLimit", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Performance Tab */}
                    <TabsContent value="performance">
                        <Card className="bg-zinc-800/50 border-zinc-700">
                            <CardHeader><CardTitle>성능 설정</CardTitle></CardHeader>
                            <CardContent>
                                <div className="grid gap-6 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label>서버 최대 시야 거리</Label>
                                        <Input type="number" value={config.game.gameProperties.serverMaxViewDistance} onChange={e => updateGameProps("serverMaxViewDistance", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>서버 최소 잔디 거리</Label>
                                        <Input type="number" value={config.game.gameProperties.serverMinGrassDistance} onChange={e => updateGameProps("serverMinGrassDistance", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>네트워크 시야 거리</Label>
                                        <Input type="number" value={config.game.gameProperties.networkViewDistance} onChange={e => updateGameProps("networkViewDistance", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* VON Tab */}
                    <TabsContent value="von">
                        <Card className="bg-zinc-800/50 border-zinc-700">
                            <CardHeader><CardTitle>음성 통신 (VON) 설정</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>UI 비활성화 (VON Disable UI)</Label>
                                    <Switch checked={config.game.gameProperties.VONDisableUI} onCheckedChange={v => updateGameProps("VONDisableUI", v)} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>직접 대화 UI 비활성화</Label>
                                    <Switch checked={config.game.gameProperties.VONDisableDirectSpeechUI} onCheckedChange={v => updateGameProps("VONDisableDirectSpeechUI", v)} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>진영 간 음성 전송 허용</Label>
                                    <Switch checked={config.game.gameProperties.VONCanTransmitCrossFaction} onCheckedChange={v => updateGameProps("VONCanTransmitCrossFaction", v)} />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Operating Tab */}
                    <TabsContent value="operating">
                        <Card className="bg-zinc-800/50 border-zinc-700">
                            <CardHeader><CardTitle>운영 및 저장 설정</CardTitle></CardHeader>
                            <CardContent>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label>로비 플레이어 동기화</Label>
                                            <Switch checked={config.operating.lobbyPlayerSynchronise} onCheckedChange={v => updateOperating("lobbyPlayerSynchronise", v)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>자동 저장 간격 (분)</Label>
                                            <Input type="number" value={config.game.gameProperties.persistence?.autoSaveInterval || 10} onChange={e => setConfig(prev => ({ ...prev, game: { ...prev.game, gameProperties: { ...prev.game.gameProperties, persistence: { autoSaveInterval: parseInt(e.target.value) } } } }))} className="bg-zinc-900 border-zinc-700" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>플레이어 저장 시간 (초)</Label>
                                            <Input type="number" value={config.operating.playerSaveTime} onChange={e => updateOperating("playerSaveTime", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label>서버 종료 버튼 비활성화</Label>
                                            <Switch checked={config.operating.disableServerShutdown} onCheckedChange={v => updateOperating("disableServerShutdown", v)} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label>크래시 리포터 비활성화</Label>
                                            <Switch checked={config.operating.disableCrashReporter} onCheckedChange={v => updateOperating("disableCrashReporter", v)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>슬롯 예약 타임아웃 (초)</Label>
                                            <Input type="number" value={config.operating.slotReservationTimeout} onChange={e => updateOperating("slotReservationTimeout", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>접속 대기열 최대 크기</Label>
                                            <Input type="number" value={config.operating.joinQueue?.maxSize || 0} onChange={e => setConfig(prev => ({ ...prev, operating: { ...prev.operating, joinQueue: { maxSize: parseInt(e.target.value) } } }))} className="bg-zinc-900 border-zinc-700" />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Raw Edit Tab */}
                    <TabsContent value="raw">
                        <Card className="bg-zinc-800/50 border-zinc-700 h-full">
                            <CardHeader>
                                <CardTitle className="text-amber-500">Raw Config Editor</CardTitle>
                                <CardDescription>
                                    server.json 파일을 직접 편집합니다. 문법 오류 시 서버가 시작되지 않을 수 있습니다.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <textarea
                                    className="w-full h-[600px] bg-zinc-950 border border-zinc-700 rounded-md p-4 font-mono text-sm text-green-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                                    value={rawConfig}
                                    onChange={(e) => setRawConfig(e.target.value)}
                                    spellCheck={false}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
