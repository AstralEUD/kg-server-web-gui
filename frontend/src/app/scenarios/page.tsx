"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Map, Play, RefreshCw, Copy, Check, Loader2, Info, Plus, Trash2, GripVertical, Save } from "lucide-react"

interface Scenario {
    scenarioId: string
    name: string
    wbParam?: string // For missionHeader.mission value
}

interface MissionHeader {
    mission: string // The scenario ID pointing to .conf
    name?: string    // Optional override name
}

export default function ScenariosPage() {
    const [scenarios, setScenarios] = useState<Scenario[]>([])
    const [missionHeader, setMissionHeader] = useState<MissionHeader>({ mission: "" })
    const [rawMissionHeader, setRawMissionHeader] = useState("{}")
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [copied, setCopied] = useState("")

    useEffect(() => {
        fetchScenarios()
        fetchConfig()
    }, [])

    const fetchScenarios = async () => {
        setLoading(true)
        try {
            const res = await fetch("http://localhost:3000/api/scenarios", { credentials: "include" })
            if (res.ok) {
                const data = await res.json()
                setScenarios(data || [])
            }
        } catch (e) {
            console.error("시나리오 로드 실패", e)
        }
        setLoading(false)
    }

    const fetchConfig = async () => {
        try {
            const res = await fetch("http://localhost:3000/api/config", { credentials: "include" })
            if (res.ok) {
                const data = await res.json()
                if (data.missionHeader) {
                    setMissionHeader(data.missionHeader)
                    setRawMissionHeader(JSON.stringify(data.missionHeader, null, 4))
                }
            }
        } catch (e) {
            console.error("설정 로드 실패", e)
        }
    }

    const saveMissionHeader = async () => {
        setSaving(true)
        try {
            // Validate JSON
            let parsedHeader;
            try {
                parsedHeader = JSON.parse(rawMissionHeader)
            } catch (e) {
                alert("유효하지 않은 JSON 형식입니다. 문법을 확인해주세요.")
                setSaving(false)
                return
            }

            // First fetch current config to preserve other fields
            const configRes = await fetch("http://localhost:3000/api/config", { credentials: "include" })
            if (!configRes.ok) throw new Error("Config load failed")
            const config = await configRes.json()

            // Update missionHeader
            config.missionHeader = parsedHeader

            // Save back
            await fetch("http://localhost:3000/api/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(config)
            })

            // Update local parsed state
            setMissionHeader(parsedHeader)
            alert("미션 헤더가 저장되었습니다.")
        } catch (e) {
            console.error("저장 실패", e)
            alert("저장 실패")
        }
        setSaving(false)
    }

    const copyScenarioId = (id: string) => {
        navigator.clipboard.writeText(id)
        setCopied(id)
        setTimeout(() => setCopied(""), 2000)
    }

    const applyScenario = async (id: string) => {
        if (!confirm("이 시나리오를 서버 기본 시나리오로 설정하시겠습니까?")) return
        try {
            // Fetch current config
            const configRes = await fetch("http://localhost:3000/api/config", { credentials: "include" })
            if (!configRes.ok) throw new Error("Config load failed")
            const config = await configRes.json()

            // Update scenarioId
            config.game.scenarioId = id

            // Save back
            await fetch("http://localhost:3000/api/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(config)
            })
            alert("서버 시나리오가 변경되었습니다.")
        } catch (e) {
            console.error(e)
            alert("변경 실패")
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500">
                            시나리오 관리
                        </h1>
                        <p className="text-zinc-400 mt-1">이용 가능한 시나리오를 확인하고 미션 헤더를 설정하세요</p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Available Scenarios */}
                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Map className="w-5 h-5 text-emerald-400" /> 사용 가능 시나리오
                                </CardTitle>
                                <CardDescription>현재 모드에서 감지된 시나리오 목록</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" onClick={fetchScenarios}>
                                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {scenarios.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500">
                                    시나리오가 없습니다. 모드를 추가해주세요.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {scenarios.map(s => (
                                        <div key={s.scenarioId} className="flex flex-col gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-700">
                                            <div>
                                                <div className="font-medium">{s.name}</div>
                                                <div className="text-xs text-zinc-500 font-mono mt-1 break-all">{s.scenarioId}</div>
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => copyScenarioId(s.scenarioId)}
                                                    className="gap-2"
                                                >
                                                    {copied === s.scenarioId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                    {copied === s.scenarioId ? "복사됨" : "ID 복사"}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => applyScenario(s.scenarioId)}
                                                >
                                                    <Play className="w-3 h-3 mr-1" /> 서버에 적용
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Mission Header Configuration */}
                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <GripVertical className="w-5 h-5 text-amber-400" /> 미션 헤더 (Mission Header)
                                </CardTitle>
                                <CardDescription>서버 시작 시 실행할 미션 (.conf)</CardDescription>
                            </div>
                            <Button onClick={saveMissionHeader} disabled={saving} className="gap-2">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                저장
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="flex justify-between">
                                    <span>Raw JSON Configuration</span>
                                    <span className="text-xs text-zinc-500 font-mono">missionHeader: {"{ ... }"}</span>
                                </Label>
                                <textarea
                                    className="w-full h-[200px] bg-zinc-900 border border-zinc-700 rounded-md p-4 font-mono text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                                    value={rawMissionHeader}
                                    onChange={(e) => setRawMissionHeader(e.target.value)}
                                />
                                <p className="text-xs text-zinc-500">
                                    JSON 형식을 직접 편집합니다. 예:
                                    <pre className="mt-1 bg-zinc-950 p-2 rounded text-xs text-zinc-400">
                                        {`{
  "mission": "{Guid}Missions/Name.conf",
  "name": "Server Name Override"
}`}
                                    </pre>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
