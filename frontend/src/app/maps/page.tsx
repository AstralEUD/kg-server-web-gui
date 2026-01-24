"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Map, Play, Plus, Trash2, RefreshCw, Loader2, Check, Hash, Zap, MessageSquare } from "lucide-react"

import { apiFetch } from "@/lib/api"

interface MapMapping {
    slot: number
    scenarioId: string
    name: string
}

interface Scenario {
    scenarioId: string
    name: string
}

interface CurrentMap {
    slot?: number
    name?: string
    scenarioId: string
}

export default function MapsPage() {
    const [mappings, setMappings] = useState<MapMapping[]>([])
    const [scenarios, setScenarios] = useState<Scenario[]>([])
    const [currentMap, setCurrentMap] = useState<CurrentMap | null>(null)
    const [loading, setLoading] = useState(false)
    const [applying, setApplying] = useState<number | null>(null)

    // New mapping form
    const [newSlot, setNewSlot] = useState("")
    const [newScenarioId, setNewScenarioId] = useState("")
    const [newName, setNewName] = useState("")
    const [adding, setAdding] = useState(false)

    useEffect(() => {
        fetchMappings()
        fetchScenarios()
        fetchCurrentMap()
    }, [])

    const fetchMappings = async () => {
        try {
            const res = await apiFetch("/api/maps")
            if (res.ok) {
                const data = await res.json()
                setMappings(data || [])
            }
        } catch (e) {
            console.error("맵 매핑 로드 실패", e)
        }
    }

    const fetchScenarios = async () => {
        try {
            const res = await apiFetch("/api/scenarios")
            if (res.ok) {
                const data = await res.json()
                setScenarios(data || [])
            }
        } catch (e) {
            console.error("시나리오 로드 실패", e)
        }
    }

    const fetchCurrentMap = async () => {
        try {
            const res = await apiFetch("/api/servers/default/map")
            if (res.ok) {
                const data = await res.json()
                setCurrentMap(data)
            }
        } catch (e) {
            console.error("현재 맵 조회 실패", e)
        }
    }

    const addMapping = async () => {
        if (!newSlot || !newScenarioId) {
            alert("슬롯 번호와 시나리오 ID를 입력해주세요.")
            return
        }

        setAdding(true)
        try {
            const res = await apiFetch("/api/maps", {
                method: "POST",
                body: JSON.stringify({
                    slot: parseInt(newSlot),
                    scenarioId: newScenarioId,
                    name: newName || `Map ${newSlot}`
                })
            })
            if (res.ok) {
                setNewSlot("")
                setNewScenarioId("")
                setNewName("")
                fetchMappings()
            } else {
                const err = await res.json()
                alert(err.error || "추가 실패")
            }
        } catch (e) {
            console.error("추가 실패", e)
            alert("추가 실패")
        }
        setAdding(false)
    }

    const removeMapping = async (slot: number) => {
        if (!confirm(`슬롯 ${slot} 매핑을 삭제하시겠습니까?`)) return

        try {
            const res = await apiFetch(`/api/maps/${slot}`, {
                method: "DELETE",
            })
            if (res.ok) {
                fetchMappings()
            }
        } catch (e) {
            console.error("삭제 실패", e)
        }
    }

    const applyMap = async (slot: number) => {
        const mapping = mappings.find(m => m.slot === slot)
        if (!mapping) return

        if (!confirm(`${mapping.name}(으)로 맵을 변경하시겠습니까?\n서버가 재시작됩니다.`)) return

        setApplying(slot)
        try {
            const res = await apiFetch(`/api/maps/${slot}/apply`, {
                method: "POST",
            })
            if (res.ok) {
                alert("맵 변경 완료! 서버가 재시작됩니다.")
                fetchCurrentMap()
            } else {
                const err = await res.json()
                alert(err.error || "변경 실패")
            }
        } catch (e) {
            console.error("맵 변경 실패", e)
            alert("맵 변경 실패")
        }
        setApplying(null)
    }

    const sortedMappings = [...mappings].sort((a, b) => a.slot - b.slot)

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-500">
                            빠른 맵 변경
                        </h1>
                        <p className="text-zinc-400 mt-1">
                            슬롯 번호로 빠르게 맵을 변경하세요.
                            <span className="text-cyan-400 ml-2">!map 1</span> 형식으로 게임/Discord에서도 사용 가능
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { fetchMappings(); fetchCurrentMap(); }}>
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                </div>

                {/* Current Map Status */}
                <Card className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border-blue-500/30">
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <Map className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <div className="text-sm text-zinc-400">현재 맵</div>
                                    <div className="text-xl font-semibold">
                                        {currentMap?.name || "등록되지 않은 맵"}
                                        {currentMap?.slot && (
                                            <Badge variant="outline" className="ml-2 text-blue-400 border-blue-500/50">
                                                슬롯 {currentMap.slot}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-xs text-zinc-500 font-mono mt-1">
                                        {currentMap?.scenarioId || "N/A"}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-zinc-500 mb-1">명령어 예시</div>
                                <div className="flex gap-2">
                                    <Badge className="bg-purple-600/30 text-purple-300 border-purple-500/30">
                                        <MessageSquare className="w-3 h-3 mr-1" /> !maps
                                    </Badge>
                                    <Badge className="bg-green-600/30 text-green-300 border-green-500/30">
                                        <Zap className="w-3 h-3 mr-1" /> !map 1
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Map Slots */}
                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Hash className="w-5 h-5 text-cyan-400" /> 맵 슬롯
                            </CardTitle>
                            <CardDescription>
                                슬롯 번호를 사용하여 맵을 빠르게 변경합니다
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {sortedMappings.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500">
                                    등록된 맵 슬롯이 없습니다.
                                    <br />
                                    아래에서 새 슬롯을 추가하세요.
                                </div>
                            ) : (
                                sortedMappings.map(m => {
                                    const isActive = currentMap?.scenarioId === m.scenarioId

                                    return (
                                        <div
                                            key={m.slot}
                                            className={`flex items-center justify-between p-4 rounded-lg border transition-all ${isActive
                                                ? "bg-blue-900/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                                                : "bg-zinc-900 border-zinc-700 hover:border-zinc-600"
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${isActive ? "bg-blue-500 text-white" : "bg-zinc-700 text-zinc-300"
                                                    }`}>
                                                    {m.slot}
                                                </div>
                                                <div>
                                                    <div className={`font-medium ${isActive ? "text-blue-400" : ""}`}>
                                                        {m.name}
                                                        {isActive && <Badge variant="outline" className="ml-2 text-xs text-blue-400 border-blue-500/50">Active</Badge>}
                                                    </div>
                                                    <div className="text-xs text-zinc-500 font-mono mt-0.5 max-w-[200px] truncate">
                                                        {m.scenarioId}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => applyMap(m.slot)}
                                                    disabled={applying === m.slot || isActive}
                                                    className={isActive ? "bg-blue-600" : ""}
                                                >
                                                    {applying === m.slot ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : isActive ? (
                                                        <Check className="w-4 h-4" />
                                                    ) : (
                                                        <Play className="w-4 h-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                    onClick={() => removeMapping(m.slot)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </CardContent>
                    </Card>

                    {/* Add New Mapping */}
                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Plus className="w-5 h-5 text-green-400" /> 새 맵 슬롯 추가
                            </CardTitle>
                            <CardDescription>
                                시나리오를 슬롯에 등록하여 빠르게 변경하세요
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>슬롯 번호</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        placeholder="1"
                                        value={newSlot}
                                        onChange={(e) => setNewSlot(e.target.value)}
                                        className="bg-zinc-900 border-zinc-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>맵 이름</Label>
                                    <Input
                                        placeholder="Everon Conflict"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="bg-zinc-900 border-zinc-700"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>시나리오 선택</Label>
                                <Select value={newScenarioId} onValueChange={setNewScenarioId}>
                                    <SelectTrigger className="bg-zinc-900 border-zinc-700">
                                        <SelectValue placeholder="시나리오를 선택하세요" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-800 border-zinc-700">
                                        {scenarios.map(s => (
                                            <SelectItem key={s.scenarioId} value={s.scenarioId}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-zinc-500">
                                    또는 직접 입력:
                                </p>
                                <Input
                                    placeholder="{GUID}Missions/Name.conf"
                                    value={newScenarioId}
                                    onChange={(e) => setNewScenarioId(e.target.value)}
                                    className="bg-zinc-900 border-zinc-700 font-mono text-xs"
                                />
                            </div>

                            <Button
                                className="w-full bg-green-600 hover:bg-green-700"
                                onClick={addMapping}
                                disabled={adding}
                            >
                                {adding ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Plus className="w-4 h-4 mr-2" />
                                )}
                                슬롯 추가
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Command Reference */}
                    <Card className="bg-zinc-800/50 border-zinc-700 md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-purple-400" /> 채팅 명령어
                            </CardTitle>
                            <CardDescription>
                                Discord 또는 게임 내 채팅에서 사용할 수 있는 명령어
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-700">
                                    <div className="font-mono text-cyan-400 mb-2">!map &lt;슬롯&gt;</div>
                                    <div className="text-sm text-zinc-400">지정된 슬롯의 맵으로 변경합니다.</div>
                                    <div className="text-xs text-zinc-500 mt-2">예: <code className="text-cyan-300">!map 1</code></div>
                                </div>
                                <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-700">
                                    <div className="font-mono text-cyan-400 mb-2">!maps</div>
                                    <div className="text-sm text-zinc-400">등록된 맵 슬롯 목록을 표시합니다.</div>
                                </div>
                                <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-700">
                                    <div className="font-mono text-cyan-400 mb-2">!mapnow</div>
                                    <div className="text-sm text-zinc-400">현재 맵 정보를 표시합니다.</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
