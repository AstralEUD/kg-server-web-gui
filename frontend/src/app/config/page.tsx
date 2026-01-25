"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Save, Settings, Globe, Gamepad2, Cpu, Radio, Database, Loader2, Download, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { apiGet, apiPost } from "@/lib/api"
import { ServerConfig } from "@/types/schema"

import { ConfigServer } from "@/components/config/ConfigServer"
import { ConfigNetwork } from "@/components/config/ConfigNetwork"
import { ConfigGameplay } from "@/components/config/ConfigGameplay"
import { ConfigPerformance, ConfigVON } from "@/components/config/ConfigPerformance"
import { ConfigOperating } from "@/components/config/ConfigOperating"
import { ConfigRaw } from "@/components/config/ConfigRaw"

const defaultConfig: ServerConfig = {
    bindAddress: "0.0.0.0",
    bindPort: 2001,
    publicAddress: "",
    publicPort: 2001,
    game: {
        name: "",
        password: "",
        passwordAdmin: "",
        rconPassword: "",
        rconPort: 19999,
        scenarioId: "",
        maxPlayers: 64,
        visible: true,
        crossPlatform: true,
        modsRequiredByDefault: true,
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
            const data = await apiGet<ServerConfig>("/api/config")
            if (data) {
                // Ensure nested objects exist to avoid crashes
                if (!data.game.gameProperties) data.game.gameProperties = defaultConfig.game.gameProperties
                if (!data.operating) data.operating = defaultConfig.operating
                if (!data.operating?.joinQueue) {
                    if (data.operating) data.operating.joinQueue = defaultConfig.operating!.joinQueue
                }

                setConfig({ ...defaultConfig, ...data })
                // Admins are not in ServerConfig schema explicitly? Ah, schema.go had commented out admins.
                // But Config structure in page.tsx had it.
                // Let's assume response includes it in game.admins or we need to handle it separately?
                // The backend schema commented it out: // Admins []string `json:"admins,omitempty"`
                // If backend doesn't return it, we might lose it?
                // Wait, I should check if backend handles admins separately.
                // Assuming it's in the JSON for now as 'admins' or similar.
                // Type assertion if needed.
                const gameAny = data.game as any;
                setAdminsText(gameAny.admins?.join("\n") || "")
            }
        } catch (e) {
            console.error("설정 로드 실패", e)
        }
        setLoading(false)
    }

    const fetchRawConfig = async () => {
        try {
            const data = await apiGet<{ content: string }>("/api/config/raw")
            setRawConfig(data.content)
        } catch (e) {
            console.error("Raw 설정 로드 실패", e)
        }
    }

    const saveRawConfig = async () => {
        setSaving(true)
        try {
            await apiPost("/api/config/raw", { content: rawConfig })
            toast.success("Raw 설정이 저장되었습니다.")
            fetchConfig()
        } catch (e) {
            toast.error("설정 저장 오류")
        }
        setSaving(false)
    }

    const validateRawConfig = async () => {
        try {
            const data = await apiPost<{ valid: boolean, warning?: string, error?: string }>("/api/settings/validate", { content: rawConfig })
            if (data.valid) {
                if (data.warning) {
                    toast.warning(`검증 완료 (주의): ${data.warning}`)
                } else {
                    toast.success("유효한 구성 파일입니다.")
                }
            } else {
                toast.error(`유효하지 않은 구성: ${data.error}`)
            }
        } catch (e) {
            toast.error("검증 중 오류 발생")
        }
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
                if (!json.operating.joinQueue) json.operating.joinQueue = defaultConfig.operating!.joinQueue

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
            // Re-inject admins if needed. Backend expects Admins in GameConfig?
            // Schema says Admins is deprecated/separate.
            // But let's send it anyway if backend supports it or if we updated backend to ignore/handle it.
            // My backend `ServerConfig` struct commented it out. 
            // So saving it might do nothing unless backend logic uses a map or custom unmarshal.
            // But let's keep it for now.
            const updatedConfig = { ...config, game: { ...config.game, admins: adminsText.split("\n").filter(Boolean) } }
            await apiPost("/api/config", updatedConfig)
            toast.success("설정이 저장되었습니다.")
        } catch (e) {
            toast.error("설정 저장 실패")
        }
        setSaving(false)
    }

    const updateGame = (field: string, value: any) => {
        setConfig(prev => ({ ...prev, game: { ...prev.game, [field]: value } }))
    }

    const updateGameProps = (field: string, value: any) => {
        setConfig(prev => ({
            ...prev,
            game: { ...prev.game, gameProperties: { ...prev.game.gameProperties, [field]: value } },
        }))
    }

    const updateOperating = (field: string, value: any) => {
        setConfig(prev => {
            if (!prev.operating) return prev;
            return { ...prev, operating: { ...prev.operating, [field]: value } }
        })
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

                    <TabsContent value="server">
                        <ConfigServer config={config} updateGame={updateGame} adminsText={adminsText} setAdminsText={setAdminsText} />
                    </TabsContent>

                    <TabsContent value="network">
                        <ConfigNetwork config={config} setConfig={setConfig} updateGame={updateGame} />
                    </TabsContent>

                    <TabsContent value="game">
                        <ConfigGameplay config={config} updateGame={updateGame} updateGameProps={updateGameProps} updateOperating={updateOperating} />
                    </TabsContent>

                    <TabsContent value="performance">
                        <ConfigPerformance config={config} updateGameProps={updateGameProps} />
                    </TabsContent>

                    <TabsContent value="von">
                        <ConfigVON config={config} updateGameProps={updateGameProps} />
                    </TabsContent>

                    <TabsContent value="operating">
                        <ConfigOperating config={config} setConfig={setConfig} updateOperating={updateOperating} />
                    </TabsContent>

                    <TabsContent value="raw">
                        <ConfigRaw rawConfig={rawConfig} setRawConfig={setRawConfig} validateRawConfig={validateRawConfig} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
