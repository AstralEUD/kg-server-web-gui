"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Layers, Plus, Trash2, Edit2, Save, Loader2, Check, Upload, Play } from "lucide-react"

import { apiGet, apiPost, apiDelete } from "@/lib/api"

// ... (interface Preset omitted)

export default function ProfilesPage() {
    const [presets, setPresets] = useState<Preset[]>([])
    const [loading, setLoading] = useState(false)
    const [createOpen, setCreateOpen] = useState(false)
    const [newPresetName, setNewPresetName] = useState("")
    const [newPresetDesc, setNewPresetDesc] = useState("")
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        fetchPresets()
    }, [])

    const fetchPresets = async () => {
        setLoading(true)
        try {
            const data = await apiGet<Preset[]>("/api/presets")
            setPresets(data || [])
        } catch (e) {
            console.error("프리셋 로드 실패", e)
        }
        setLoading(false)
    }

    const createPreset = async () => {
        if (!newPresetName.trim()) return
        setProcessing(true)
        try {
            // Fetch current state
            const config = await apiGet<any>("/api/config")
            const collections = await apiGet<any[]>("/api/collections")
            const currentCollection = collections.length > 0 ? collections[0].items : []

            await apiPost("/api/presets", {
                name: newPresetName,
                description: newPresetDesc,
                config: config,
                mods: config.game?.mods || [],
                collectionItems: currentCollection
            })

            setCreateOpen(false)
            setNewPresetName("")
            setNewPresetDesc("")
            fetchPresets()
        } catch (e) {
            console.error("프로필 생성 실패", e)
        }
        setProcessing(false)
    }

    const deletePreset = async (id: string) => {
        if (!confirm("정말 이 프로필을 삭제하시겠습니까?")) return
        try {
            await apiDelete(`/api/presets/${id}`)
            fetchPresets()
        } catch (e) {
            console.error("프리셋 삭제 실패", e)
        }
    }

    const applyPreset = async (preset: Preset) => {
        if (!confirm(`'${preset.name}' 프로필을 적용하시겠습니까?\n현재 서버 설정과 모음집이 덮어씌워집니다.`)) return
        try {
            await apiPost(`/api/presets/${preset.id}/apply`)
            alert("프로필이 적용되었습니다.")
        } catch (e) {
            console.error("프리셋 적용 실패", e)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">
                            서버 프로필 (Profiles)
                        </h1>
                        <p className="text-zinc-400 mt-1">서버 설정, 모드, 컬렉션을 포함한 전체 상태를 저장하고 전환합니다</p>
                    </div>
                    <div className="flex gap-2">
                        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600">
                                    <Plus className="w-4 h-4" /> 새 프로필 저장
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-zinc-800 border-zinc-700 text-white">
                                <DialogHeader>
                                    <DialogTitle>새 프로필 생성</DialogTitle>
                                    <DialogDescription>
                                        현재 서버 설정과 모드 리스트를 프로필로 저장합니다.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>이름</Label>
                                        <Input
                                            value={newPresetName}
                                            onChange={e => setNewPresetName(e.target.value)}
                                            placeholder="예: 바닐라 모드, 하드코어 설정"
                                            className="bg-zinc-900 border-zinc-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>설명</Label>
                                        <Input
                                            value={newPresetDesc}
                                            onChange={e => setNewPresetDesc(e.target.value)}
                                            placeholder="선택 사항"
                                            className="bg-zinc-900 border-zinc-700"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setCreateOpen(false)}>취소</Button>
                                    <Button onClick={createPreset} disabled={!newPresetName || processing}>
                                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {presets.map(preset => (
                        <Card key={preset.id} className="bg-zinc-800/50 border-zinc-700 hover:border-amber-500/50 transition-colors">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <Layers className="w-5 h-5 text-amber-400" />
                                        {preset.name}
                                    </CardTitle>
                                    <Button variant="ghost" size="sm" onClick={() => deletePreset(preset.id)} className="text-zinc-500 hover:text-red-400">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                <CardDescription>{preset.description || "설명 없음"}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2 text-sm text-zinc-400">
                                    <div className="flex justify-between">
                                        <span>Config 모드 (Enabled):</span>
                                        <span className="text-white bg-zinc-700 px-1.5 rounded">{preset.mods?.length || 0}개</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>내 모음집 (Collection):</span>
                                        <span className="text-white bg-zinc-700 px-1.5 rounded">{preset.collectionItems?.length || 0}개</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-zinc-700/50">
                                        <span>생성일:</span>
                                        <span className="text-xs">{preset.createdAt ? new Date(preset.createdAt).toLocaleDateString() : "-"}</span>
                                    </div>
                                </div>
                                <Button className="w-full gap-2" variant="outline" onClick={() => applyPreset(preset)}>
                                    <Play className="w-4 h-4" /> 이 프로필 적용 (Load)
                                </Button>
                            </CardContent>
                        </Card>
                    ))}

                    {presets.length === 0 && !loading && (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-xl">
                            <Layers className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-lg">저장된 프로필이 없습니다</p>
                            <p className="text-sm">현재 상태를 새 프로필로 저장해보세요</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
