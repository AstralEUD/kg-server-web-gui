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
                }
            }
        } catch (e) {
            console.error("설정 로드 실패", e)
        }
    }

    const saveMissionHeader = async () => {
        setSaving(true)
        try {
            // First fetch current config to preserve other fields
            const configRes = await fetch("http://localhost:3000/api/config", { credentials: "include" })
            if (!configRes.ok) throw new Error("Config load failed")
            const config = await configRes.json()

            // Update missionHeader
            config.missionHeader = missionHeader

            // Save back
            await fetch("http://localhost:3000/api/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(config)
            })
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
                                        <div key={s.scenarioId} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-700">
                                            <div>
                                                <div className="font-medium">{s.name}</div>
                                                <div className="text-xs text-zinc-500 font-mono mt-1">{s.scenarioId}</div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => copyScenarioId(s.scenarioId)}
                                                className="gap-2"
                                            >
                                                {copied === s.scenarioId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                {copied === s.scenarioId ? "복사됨" : "ID 복사"}
                                            </Button>
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
                                <Label>Select Mission</Label>
                                <Select
                                    value={missionHeader.mission}
                                    onValueChange={(v) => setMissionHeader({ mission: v })}
                                >
                                    <SelectTrigger className="bg-zinc-900 border-zinc-700">
                                        <SelectValue placeholder="시나리오 선택..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {scenarios.map(s => (
                                            <SelectItem key={s.scenarioId} value={s.scenarioId}>
                                                {s.name} ({s.scenarioId})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Manual Entry (Editable)</Label>
                                <Input
                                    value={missionHeader.mission}
                                    onChange={(e) => setMissionHeader({ ...missionHeader, mission: e.target.value })}
                                    className="bg-zinc-900 border-zinc-700 font-mono text-sm"
                                    placeholder="{Guid}Missions/MissionName.conf"
                                />
                                <p className="text-xs text-zinc-500">
                                    직접 입력하거나 목록에서 선택하세요.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Override Mission Name (Optional)</Label>
                                <Input
                                    value={missionHeader.name || ""}
                                    onChange={(e) => setMissionHeader({ ...missionHeader, name: e.target.value })}
                                    className="bg-zinc-900 border-zinc-700"
                                    placeholder="Custom Server Name..."
                                />
                                <p className="text-xs text-zinc-500">
                                    서버 브라우저에 표시될 이름을 덮어씁니다.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
