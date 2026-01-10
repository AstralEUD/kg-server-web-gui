"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Save, Settings, Globe, Shield, Gamepad2, Cpu, Radio, Database, Loader2 } from "lucide-react"

interface ServerConfig {
    game: {
        name: string
        password: string
        scenarioId: string
        maxPlayers: number
        visible: boolean
        crossPlatform: boolean
        modsRequiredByDefault: boolean
        admins: string[]
        battlEye: boolean
        disableThirdPerson: boolean
        fastValidation: boolean
        lobbyPlayerSynchronise: boolean
        VONDisableUI: boolean
        VONDisableDirectSpeechUI: boolean
        VONCanTransmitCrossFaction: boolean
        gameProperties: {
            serverMaxViewDistance: number
            serverMinGrassDistance: number
            networkViewDistance: number
        }
        mods: { modId: string; name?: string }[]
    }
    a2s: {
        address: string
        port: number
    }
    rcon: {
        address: string
        port: number
        password: string
        maxClients: number
        permission: string
        blacklist: string[]
        whitelist: string[]
    }
    operating: {
        interval: number
        playerSaveTime: number
        disableAI: boolean
        aiLimit: number
        joinQueueMaxSize: number
        slotReservationTimeout: number
        disableServerShutdown: boolean
        disableCrashReporter: boolean
        disableNavmeshStreaming: boolean
    }
}

const defaultConfig: ServerConfig = {
    game: {
        name: "",
        password: "",
        scenarioId: "",
        maxPlayers: 64,
        visible: true,
        crossPlatform: true,
        modsRequiredByDefault: false,
        admins: [],
        battlEye: true,
        disableThirdPerson: false,
        fastValidation: true,
        lobbyPlayerSynchronise: true,
        VONDisableUI: false,
        VONDisableDirectSpeechUI: false,
        VONCanTransmitCrossFaction: false,
        gameProperties: {
            serverMaxViewDistance: 1600,
            serverMinGrassDistance: 50,
            networkViewDistance: 1500,
        },
        mods: [],
    },
    a2s: { address: "", port: 17777 },
    rcon: { address: "", port: 19999, password: "", maxClients: 16, permission: "MONITOR", blacklist: [], whitelist: [] },
    operating: { interval: 30, playerSaveTime: 120, disableAI: false, aiLimit: -1, joinQueueMaxSize: 0, slotReservationTimeout: 60, disableServerShutdown: false, disableCrashReporter: false, disableNavmeshStreaming: false },
}

export default function ConfigPage() {
    const [config, setConfig] = useState<ServerConfig>(defaultConfig)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [adminsText, setAdminsText] = useState("")

    useEffect(() => {
        fetchConfig()
    }, [])

    const fetchConfig = async () => {
        setLoading(true)
        try {
            const res = await fetch("http://localhost:3000/api/config", { credentials: "include" })
            if (res.ok) {
                const data = await res.json()
                setConfig({ ...defaultConfig, ...data })
                setAdminsText(data.game?.admins?.join("\n") || "")
            }
        } catch (e) {
            console.error("설정 로드 실패", e)
        }
        setLoading(false)
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
        } catch (e) {
            console.error("설정 저장 실패", e)
        }
        setSaving(false)
    }

    const updateGame = (field: keyof ServerConfig["game"], value: any) => {
        setConfig(prev => ({ ...prev, game: { ...prev.game, [field]: value } }))
    }

    const updateGameProps = (field: keyof ServerConfig["game"]["gameProperties"], value: number) => {
        setConfig(prev => ({
            ...prev,
            game: { ...prev.game, gameProperties: { ...prev.game.gameProperties, [field]: value } },
        }))
    }

    const updateRcon = (field: keyof ServerConfig["rcon"], value: any) => {
        setConfig(prev => ({ ...prev, rcon: { ...prev.rcon, [field]: value } }))
    }

    const updateA2s = (field: keyof ServerConfig["a2s"], value: any) => {
        setConfig(prev => ({ ...prev, a2s: { ...prev.a2s, [field]: value } }))
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
                        <Button variant="outline" className="gap-2" onClick={fetchConfig}>
                            <Upload className="w-4 h-4" /> 불러오기
                        </Button>
                        <Button className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700" onClick={saveConfig} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            저장하기
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="server" className="space-y-6">
                    <TabsList className="bg-zinc-800/50 p-1 rounded-lg">
                        <TabsTrigger value="server" className="gap-2"><Settings className="w-4 h-4" /> 일반</TabsTrigger>
                        <TabsTrigger value="network" className="gap-2"><Globe className="w-4 h-4" /> 네트워크</TabsTrigger>
                        <TabsTrigger value="rcon" className="gap-2"><Shield className="w-4 h-4" /> RCON</TabsTrigger>
                        <TabsTrigger value="game" className="gap-2"><Gamepad2 className="w-4 h-4" /> 게임</TabsTrigger>
                        <TabsTrigger value="performance" className="gap-2"><Cpu className="w-4 h-4" /> 성능</TabsTrigger>
                        <TabsTrigger value="von" className="gap-2"><Radio className="w-4 h-4" /> 음성(VON)</TabsTrigger>
                        <TabsTrigger value="advanced" className="gap-2"><Database className="w-4 h-4" /> 고급</TabsTrigger>
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
                                        <Input placeholder="0.0.0.0" className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>바인드 포트</Label>
                                        <Input type="number" defaultValue={2001} className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>공개 주소 (Public Address)</Label>
                                        <Input placeholder="자동 감지" className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>공개 포트</Label>
                                        <Input type="number" defaultValue={2001} className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-zinc-800/50 border-zinc-700">
                                <CardHeader><CardTitle>A2S (스팀 쿼리)</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>A2S 주소</Label>
                                        <Input value={config.a2s.address} onChange={e => updateA2s("address", e.target.value)} placeholder="0.0.0.0" className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>A2S 포트</Label>
                                        <Input type="number" value={config.a2s.port} onChange={e => updateA2s("port", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* RCON Tab */}
                    <TabsContent value="rcon">
                        <Card className="bg-zinc-800/50 border-zinc-700">
                            <CardHeader><CardTitle>RCON 설정</CardTitle></CardHeader>
                            <CardContent>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>RCON 주소</Label>
                                            <Input value={config.rcon.address} onChange={e => updateRcon("address", e.target.value)} placeholder="0.0.0.0" className="bg-zinc-900 border-zinc-700" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>RCON 포트</Label>
                                            <Input type="number" value={config.rcon.port} onChange={e => updateRcon("port", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>RCON 비밀번호</Label>
                                            <Input type="password" value={config.rcon.password} onChange={e => updateRcon("password", e.target.value)} className="bg-zinc-900 border-zinc-700" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>최대 클라이언트 수</Label>
                                            <Input type="number" value={config.rcon.maxClients} onChange={e => updateRcon("maxClients", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>권한 수준</Label>
                                            <Select value={config.rcon.permission} onValueChange={v => updateRcon("permission", v)}>
                                                <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="MONITOR">모니터링 (MONITOR)</SelectItem>
                                                    <SelectItem value="ADMIN">관리자 (ADMIN)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>차단 목록 (Blacklist IP)</Label>
                                            <textarea className="w-full h-24 bg-zinc-900 border border-zinc-700 rounded-md p-2 text-sm" placeholder="한 줄에 하나씩 IP 입력" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>허용 목록 (Whitelist IP)</Label>
                                            <textarea className="w-full h-24 bg-zinc-900 border border-zinc-700 rounded-md p-2 text-sm" placeholder="한 줄에 하나씩 IP 입력" />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Game Tab */}
                    <TabsContent value="game">
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="bg-zinc-800/50 border-zinc-700">
                                <CardHeader><CardTitle>게임 설정</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label>모드 필수 적용 (Mods Required by Default)</Label>
                                        <Switch checked={config.game.modsRequiredByDefault} onCheckedChange={v => updateGame("modsRequiredByDefault", v)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>BattlEye 활성화</Label>
                                        <Switch checked={config.game.battlEye} onCheckedChange={v => updateGame("battlEye", v)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>3인칭 시점 비활성화</Label>
                                        <Switch checked={config.game.disableThirdPerson} onCheckedChange={v => updateGame("disableThirdPerson", v)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>빠른 검증 (Fast Validation)</Label>
                                        <Switch checked={config.game.fastValidation} onCheckedChange={v => updateGame("fastValidation", v)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>로비 플레이어 동기화</Label>
                                        <Switch checked={config.game.lobbyPlayerSynchronise} onCheckedChange={v => updateGame("lobbyPlayerSynchronise", v)} />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-zinc-800/50 border-zinc-700">
                                <CardHeader><CardTitle>AI 및 플레이어 설정</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label>AI 비활성화</Label>
                                        <Switch checked={config.operating.disableAI} onCheckedChange={v => updateOperating("disableAI", v)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>AI 제한 (-1 = 기본값)</Label>
                                        <Input type="number" value={config.operating.aiLimit} onChange={e => updateOperating("aiLimit", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>슬롯 예약 시간 제한 (초)</Label>
                                        <Input type="number" value={config.operating.slotReservationTimeout} onChange={e => updateOperating("slotReservationTimeout", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>접속 대기열 최대 크기</Label>
                                        <Input type="number" value={config.operating.joinQueueMaxSize} onChange={e => updateOperating("joinQueueMaxSize", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
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
                                    <Switch checked={config.game.VONDisableUI} onCheckedChange={v => updateGame("VONDisableUI", v)} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>직접 대화 UI 비활성화</Label>
                                    <Switch checked={config.game.VONDisableDirectSpeechUI} onCheckedChange={v => updateGame("VONDisableDirectSpeechUI", v)} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>진영 간 음성 전송 허용</Label>
                                    <Switch checked={config.game.VONCanTransmitCrossFaction} onCheckedChange={v => updateGame("VONCanTransmitCrossFaction", v)} />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Advanced Tab */}
                    <TabsContent value="advanced">
                        <Card className="bg-zinc-800/50 border-zinc-700">
                            <CardHeader><CardTitle>고급 설정</CardTitle></CardHeader>
                            <CardContent>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>자동 저장 간격 (분)</Label>
                                            <Input type="number" value={config.operating.interval} onChange={e => updateOperating("interval", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>플레이어 저장 시간 (초)</Label>
                                            <Input type="number" value={config.operating.playerSaveTime} onChange={e => updateOperating("playerSaveTime", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label>서버 종료 기능 비활성화</Label>
                                            <Switch checked={config.operating.disableServerShutdown} onCheckedChange={v => updateOperating("disableServerShutdown", v)} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label>크래시 리포터 비활성화</Label>
                                            <Switch checked={config.operating.disableCrashReporter} onCheckedChange={v => updateOperating("disableCrashReporter", v)} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label>내비메시 스트리밍 비활성화</Label>
                                            <Switch checked={config.operating.disableNavmeshStreaming} onCheckedChange={v => updateOperating("disableNavmeshStreaming", v)} />
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
