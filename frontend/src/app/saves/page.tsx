"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HardDrive, Archive, RotateCcw, Trash2, RefreshCw, Clock, Download, Upload, Loader2, FolderOpen } from "lucide-react"

interface SaveFile {
    name: string
    path: string
    size: number
    modified: string
    isBackup: boolean
}

function formatBytes(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("ko-KR");
}

export default function SavesPage() {
    const [saves, setSaves] = useState<SaveFile[]>([])
    const [backups, setBackups] = useState<SaveFile[]>([])
    const [loading, setLoading] = useState(false)
    const [processing, setProcessing] = useState<string | null>(null)

    useEffect(() => {
        fetchSaves()
        fetchBackups()
    }, [])

    const fetchSaves = async () => {
        setLoading(true)
        try {
            const res = await fetch("http://localhost:3000/api/saves", { credentials: "include" })
            if (res.ok) setSaves(await res.json())
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    const fetchBackups = async () => {
        try {
            const res = await fetch("http://localhost:3000/api/saves/backups", { credentials: "include" })
            if (res.ok) setBackups(await res.json())
        } catch (e) { console.error(e) }
    }

    const createBackup = async (saveName: string) => {
        setProcessing(saveName)
        try {
            await fetch("http://localhost:3000/api/saves/backup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ saveName })
            })
            fetchBackups()
        } catch (e) { console.error(e) }
        setProcessing(null)
    }

    const restoreBackup = async (backupName: string) => {
        if (!confirm("백업을 복원하시겠습니까? 현재 세이브 파일이 덮어씌워질 수 있습니다.")) return
        setProcessing(backupName)
        try {
            await fetch("http://localhost:3000/api/saves/restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ backupName })
            })
            fetchSaves()
        } catch (e) { console.error(e) }
        setProcessing(null)
    }

    const deleteSave = async (name: string, isBackup: boolean) => {
        if (!confirm(`정말 ${name} 파일을 삭제하시겠습니까?`)) return
        try {
            await fetch(`http://localhost:3000/api/saves/${name}`, {
                method: "DELETE",
                credentials: "include"
            })
            if (isBackup) fetchBackups()
            else fetchSaves()
        } catch (e) { console.error(e) }
    }

    const FileList = ({ files, isBackup }: { files: SaveFile[], isBackup: boolean }) => (
        <div className="space-y-2">
            {files.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">파일이 없습니다</div>
            ) : (
                files.map(file => (
                    <div key={file.name} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-zinc-600 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isBackup ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"}`}>
                                {isBackup ? <Archive className="w-5 h-5" /> : <HardDrive className="w-5 h-5" />}
                            </div>
                            <div>
                                <div className="font-medium">{file.name}</div>
                                <div className="text-xs text-zinc-500 flex items-center gap-2">
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(file.modified)}</span>
                                    <span>•</span>
                                    <span>{formatBytes(file.size)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {!isBackup && (
                                <Button size="sm" variant="outline" onClick={() => createBackup(file.name)} disabled={!!processing}>
                                    {processing === file.name ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                </Button>
                            )}
                            {isBackup && (
                                <Button size="sm" variant="outline" onClick={() => restoreBackup(file.name)} disabled={!!processing}>
                                    {processing === file.name ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                                </Button>
                            )}
                            <Button size="sm" variant="ghost" className="text-zinc-500 hover:text-red-400" onClick={() => deleteSave(file.name, isBackup)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))
            )}
        </div>
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                            세이브 관리
                        </h1>
                        <p className="text-zinc-400 mt-1">서버 저장 데이터 및 백업 관리</p>
                    </div>
                    <Button variant="outline" onClick={() => { fetchSaves(); fetchBackups(); }} className="gap-2">
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> 새로고침
                    </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Active Saves */}
                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <HardDrive className="w-5 h-5 text-blue-400" /> 활성 세이브 파일
                            </CardTitle>
                            <CardDescription>현재 서버에서 사용 중인 저장 데이터</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[500px] pr-4">
                                <FileList files={saves} isBackup={false} />
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Backups */}
                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Archive className="w-5 h-5 text-amber-400" /> 백업 파일
                            </CardTitle>
                            <CardDescription>보관된 이전 시점의 저장 데이터</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[500px] pr-4">
                                <FileList files={backups} isBackup={true} />
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
