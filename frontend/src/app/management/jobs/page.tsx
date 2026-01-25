"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Plus, Trash2, Play, RefreshCw, Save, X, Server } from "lucide-react"
import { apiGet, apiPost, apiDelete } from "@/lib/api"

// ... (Job interface and presets omitted)

export default function JobsPage() {
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingJob, setEditingJob] = useState<Job | null>(null)
    const [mapList, setMapList] = useState<any[]>([])

    // Form State
    const [name, setName] = useState("")
    const [type, setType] = useState("restart")
    const [cronExpr, setCronExpr] = useState("0 0 4 * * *")
    const [targetMap, setTargetMap] = useState("")
    const [instanceId, setInstanceId] = useState("default")

    useEffect(() => {
        fetchJobs()
        fetchMaps()
    }, [])

    const fetchJobs = async () => {
        setLoading(true)
        try {
            const data = await apiGet<Job[]>("/api/jobs")
            setJobs(data || [])
        } catch (e) { }
        setLoading(false)
    }

    const fetchMaps = async () => {
        try {
            const data = await apiGet<any[]>("/api/maps")
            setMapList(data || [])
        } catch (e) { }
    }

    const handleSave = async () => {
        const args = [instanceId]
        if (type === "changemap") {
            if (!targetMap) {
                alert("맵을 선택해주세요")
                return
            }
            args.push(targetMap)
        }

        const payload = {
            name,
            type,
            cronExpr,
            args,
            enabled: true,
            description: type === "restart" ? "서버 자동 재시작" : "자동 맵 변경"
        }

        try {
            if (editingJob) {
                await apiPost(`/api/jobs/${editingJob.id}`, { ...payload, id: editingJob.id, enabled: editingJob.enabled })
            } else {
                await apiPost("/api/jobs", payload)
            }
            setDialogOpen(false)
            fetchJobs()
        } catch (e) { alert("오류 발생") }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return
        try {
            await apiDelete(`/api/jobs/${id}`)
            fetchJobs()
        } catch (e) { }
    }

    const toggleEnabled = async (job: Job) => {
        try {
            await apiPost(`/api/jobs/${job.id}`, { ...job, enabled: !job.enabled })
            fetchJobs()
        } catch (e) { }
    }

    const openCreateDialog = () => {
        setEditingJob(null)
        setName("새 작업")
        setType("restart")
        setCronExpr("0 0 4 * * *")
        setInstanceId("default")
        setTargetMap("")
        setDialogOpen(true)
    }

    const openEditDialog = (job: Job) => {
        setEditingJob(job)
        setName(job.name)
        setType(job.type)
        setCronExpr(job.cronExpr)
        setInstanceId(job.args[0] || "default")
        if (job.type === "changemap" && job.args[1]) {
            setTargetMap(job.args[1])
        }
        setDialogOpen(true)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">
                            스케줄러
                        </h1>
                        <p className="text-zinc-400 mt-1">서버 자동화 작업 및 일정 관리</p>
                    </div>
                    <Button onClick={openCreateDialog} className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
                        <Plus className="w-4 h-4" /> 새 작업 추가
                    </Button>
                </div>

                <div className="grid gap-4">
                    {jobs.length === 0 ? (
                        <Card className="bg-zinc-800/50 border-zinc-700 p-8 text-center text-zinc-500">
                            예약된 작업이 없습니다.
                        </Card>
                    ) : (
                        jobs.map(job => (
                            <Card key={job.id} className={`bg-zinc-800/50 border-zinc-700 transition-all ${job.enabled ? 'border-l-4 border-l-emerald-500' : 'opacity-70 border-l-4 border-l-zinc-500'}`}>
                                <div className="flex flex-col md:flex-row items-start md:items-center p-4 gap-4">
                                    <div className="p-3 rounded-lg bg-zinc-900/50">
                                        {job.type === 'restart' ? <RefreshCw className="w-5 h-5 text-blue-400" /> :
                                            job.type === 'changemap' ? <Server className="w-5 h-5 text-purple-400" /> :
                                                <Clock className="w-5 h-5 text-zinc-400" />}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-lg">{job.name}</span>
                                            <Badge variant="outline" className="text-xs">{job.cronExpr}</Badge>
                                        </div>
                                        <div className="text-sm text-zinc-400">
                                            {job.type === 'restart' && `서버 재시작 (${job.args[0]})`}
                                            {job.type === 'changemap' && `맵 변경: 슬롯/ID ${job.args[1]}`}
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                                            <span className="flex items-center gap-1">
                                                <Play className="w-3 h-3" /> 마지막 실행: {job.lastRun ? new Date(job.lastRun).toLocaleString() : '없음'}
                                            </span>
                                            <span className="flex items-center gap-1 text-emerald-400">
                                                <Clock className="w-3 h-3" /> 다음 실행: {job.nextRun ? new Date(job.nextRun).toLocaleString() : '예약됨'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Switch checked={job.enabled} onCheckedChange={() => toggleEnabled(job)} />
                                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(job)}>
                                            <Save className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(job.id)} className="text-red-400 hover:text-red-300">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{editingJob ? "작업 수정" : "새 작업 추가"}</DialogTitle>
                            <DialogDescription>자동화 작업을 설정합니다. Cron 표현식을 사용하여 일정을 지정하세요.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">이름</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} className="col-span-3 bg-zinc-800 border-zinc-700" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">작업 유형</Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger className="col-span-3 bg-zinc-800 border-zinc-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                        <SelectItem value="restart">서버 재시작</SelectItem>
                                        <SelectItem value="changemap">맵 변경</SelectItem>
                                        <SelectItem value="start">서버 시작</SelectItem>
                                        <SelectItem value="stop">서버 중지</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {type === 'changemap' && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">대상 맵</Label>
                                    <Select value={targetMap} onValueChange={setTargetMap}>
                                        <SelectTrigger className="col-span-3 bg-zinc-800 border-zinc-700">
                                            <SelectValue placeholder="맵 선택..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                            {mapList.map(m => (
                                                <SelectItem key={m.slot} value={String(m.slot)}>
                                                    {m.name} (Slot {m.slot})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">실행 주기</Label>
                                <div className="col-span-3 space-y-2">
                                    <Input value={cronExpr} onChange={e => setCronExpr(e.target.value)} className="bg-zinc-800 border-zinc-700 font-mono" />
                                    <div className="flex flex-wrap gap-2">
                                        {PRESET_CRONS.map(p => (
                                            <Badge
                                                key={p.value}
                                                variant="outline"
                                                className="cursor-pointer hover:bg-zinc-700"
                                                onClick={() => setCronExpr(p.value)}
                                            >
                                                {p.label}
                                            </Badge>
                                        ))}
                                    </div>
                                    <p className="text-xs text-zinc-500">
                                        형식: 초 분 시 일 월 요일 (Seconds Minutes Hours Day Month Weekday)
                                        <br />예: <code>0 0 4 * * *</code> (매일 04:00:00)
                                    </p>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setDialogOpen(false)}>취소</Button>
                            <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700">저장</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}
