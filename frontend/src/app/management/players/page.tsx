"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Users, Shield, RefreshCw, Ban, UserX, AlertTriangle } from "lucide-react"
import { apiGet, apiPost } from "@/lib/api"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export default function PlayersPage() {
    const [servers, setServers] = useState<any[]>([])
    const [selectedServer, setSelectedServer] = useState("default")
    const [players, setPlayers] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [actionDialogOpen, setActionDialogOpen] = useState(false)
    const [actionType, setActionType] = useState<"kick" | "ban">("kick")
    const [targetPlayer, setTargetPlayer] = useState<any>(null)
    const [reason, setReason] = useState("")

    useEffect(() => {
        fetchServers()
    }, [])

    useEffect(() => {
        if (selectedServer) {
            fetchPlayers()
        }
    }, [selectedServer])

    const fetchServers = async () => {
        try {
            const list = await apiGet<any[]>("/api/servers")
            setServers(list || [])
            if (list && list.length > 0 && !selectedServer) setSelectedServer(list[0].id)
        } catch (e) { }
    }

    const fetchPlayers = async () => {
        setLoading(true)
        try {
            const data = await apiGet<any[]>(`/api/servers/${selectedServer}/players`)
            setPlayers(data || [])
        } catch (e) { }
        setLoading(false)
    }

    const handleAction = async () => {
        if (!targetPlayer) return

        const endpoint = actionType === "kick" ? "kick" : "ban"
        const payload = {
            index: targetPlayer.index,
            identifier: targetPlayer.beguid, // For ban
            reason: reason || (actionType === "kick" ? "Kicked by admin" : "Banned by admin")
        }

        try {
            await apiPost(`/api/servers/${selectedServer}/${endpoint}`, payload)
            setActionDialogOpen(false)
            fetchPlayers()
            alert(`${actionType === "kick" ? "추방" : "밴"} 성공`)
        } catch (e: any) {
            alert("실패: " + (e.message || "알 수 없는 오류"))
        }
    }

    const openActionDialog = (player: any, type: "kick" | "ban") => {
        setTargetPlayer(player)
        setActionType(type)
        setReason("")
        setActionDialogOpen(true)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">
                            플레이어 관리
                        </h1>
                        <p className="text-zinc-400 mt-1">접속자 실시간 확인 및 제재</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <Select value={selectedServer} onValueChange={setSelectedServer}>
                            <SelectTrigger className="w-[200px] bg-zinc-800 border-zinc-700">
                                <SelectValue placeholder="서버 선택" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                {servers.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.id})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={fetchPlayers} disabled={loading} className="bg-zinc-800 border-zinc-700">
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            새로고침
                        </Button>
                    </div>
                </div>

                <Card className="bg-zinc-800/50 border-zinc-700">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-400" /> 접속 플레이어 ({players.length})
                        </CardTitle>
                        <CardDescription>
                            RCON을 통해 가져온 실시간 접속자 목록입니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {players.length === 0 ? (
                            <div className="text-center py-8 text-zinc-500">
                                접속 중인 플레이어가 없거나 서버가 오프라인입니다.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-zinc-700 hover:bg-zinc-800/50">
                                        <TableHead className="w-[50px]">#</TableHead>
                                        <TableHead>이름</TableHead>
                                        <TableHead>IP</TableHead>
                                        <TableHead>UID / BEGUID</TableHead>
                                        <TableHead className="text-right">작업</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {players.map((p) => (
                                        <TableRow key={p.index} className="border-zinc-700 hover:bg-zinc-800/50">
                                            <TableCell className="font-mono text-zinc-500">{p.index}</TableCell>
                                            <TableCell className="font-medium">{p.name}</TableCell>
                                            <TableCell className="text-zinc-400 font-mono text-sm">{p.ip}</TableCell>
                                            <TableCell className="flex flex-col text-xs font-mono text-zinc-500">
                                                <span>UID: {p.uid}</span>
                                                <span>BE: {p.beguid}</span>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="sm" variant="destructive" className="h-8 bg-red-900/30 hover:bg-red-900/50 text-red-400" onClick={() => openActionDialog(p, "kick")}>
                                                    <UserX className="w-4 h-4 mr-1" /> 추방
                                                </Button>
                                                <Button size="sm" variant="destructive" className="h-8 bg-black/40 hover:bg-red-950 text-red-500 border border-red-900/50" onClick={() => openActionDialog(p, "ban")}>
                                                    <Ban className="w-4 h-4 mr-1" /> 밴
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
                    <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                {actionType === "kick" ? "플레이어 추방" : "플레이어 밴"}
                            </DialogTitle>
                            <DialogDescription>
                                {targetPlayer?.name} 님을 {actionType === "kick" ? "서버에서 내보냅니다." : "서버에서 차단합니다."}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>사유 (Reason)</Label>
                                <Input
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    placeholder={actionType === "kick" ? "규정 위반 등..." : "핵 사용 등..."}
                                    className="bg-zinc-800 border-zinc-700"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setActionDialogOpen(false)}>취소</Button>
                            <Button variant="destructive" onClick={handleAction}>
                                {actionType === "kick" ? "추방 실행" : "차단 실행"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}
