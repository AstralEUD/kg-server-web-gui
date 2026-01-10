"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Package, Plus, Trash2, Download, RefreshCw, ArrowUpDown, ExternalLink, Loader2, AlertTriangle, CheckCircle, Save, FolderHeart, List } from "lucide-react"

interface Mod {
    modId: string
    name: string
    version: string
    path: string
    dependencies: string[]
}

interface WorkshopAddon {
    id: string
    name: string
    summary?: string
    dependencies?: { id: string; name: string }[]
    scenarios?: { scenarioId: string; name: string }[]
}

export default function ModsPage() {
    const [installedMods, setInstalledMods] = useState<Mod[]>([]) // Disk
    const [enabledMods, setEnabledMods] = useState<Mod[]>([])     // Config
    const [collectionMods, setCollectionMods] = useState<Mod[]>([]) // User's "My List"

    const [searchQuery, setSearchQuery] = useState("")
    const [workshopQuery, setWorkshopQuery] = useState("")
    const [selectedAddon, setSelectedAddon] = useState<WorkshopAddon | null>(null)
    const [loading, setLoading] = useState(false)
    const [searching, setSearching] = useState(false)
    const [missingDeps, setMissingDeps] = useState<string[]>([])
    const [addingToConfig, setAddingToConfig] = useState(false)

    useEffect(() => {
        fetchInstalledMods()
        fetchConfig()
        loadCollection()
    }, [])

    // useEffect for auto-save removed, saving on action now.

    // Disk Mods
    const fetchInstalledMods = async () => {
        setLoading(true)
        try {
            const res = await fetch("http://localhost:3000/api/mods", { credentials: "include" })
            if (res.ok) setInstalledMods(await res.json() || [])
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    // Config Mods
    const fetchConfig = async () => {
        try {
            const res = await fetch("http://localhost:3000/api/config", { credentials: "include" })
            if (res.ok) {
                const data = await res.json()
                if (data.game?.mods && Array.isArray(data.game.mods)) {
                    setEnabledMods(data.game.mods.map((m: any) => ({
                        modId: m.modId || m.id,
                        name: m.name || m.modId,
                        version: m.version || "",
                        path: "",
                        dependencies: []
                    })))
                } else if (data.mods) {
                    // Legacy fallback
                    setEnabledMods(data.mods.map((m: any) => ({
                        modId: m.modId || m.id,
                        name: m.name || m.modId,
                        version: m.version || "",
                        path: "",
                        dependencies: []
                    })))
                }
            }
        } catch (e) { }
    }

    // Collection (Backend)
    const [collections, setCollections] = useState<any[]>([])
    const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null)

    const fetchCollections = async () => {
        try {
            const res = await fetch("http://localhost:3000/api/collections", { credentials: "include" })
            if (res.ok) {
                const cols = await res.json()
                setCollections(cols || [])

                // Select default or first
                if (cols && cols.length > 0) {
                    setActiveCollectionId(cols[0].id)
                    // Transform items to Mod format
                    setCollectionMods(cols[0].items.map((i: any) => ({
                        modId: i.modId,
                        name: i.name,
                        version: i.version || "",
                        path: "",
                        dependencies: i.deps || []
                    })))
                } else {
                    // Create default if none
                    createDefaultCollection()
                }
            }
        } catch (e) { console.error(e) }
    }

    const createDefaultCollection = async () => {
        try {
            const res = await fetch("http://localhost:3000/api/collections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "My Collection", items: [] }),
                credentials: "include"
            })
            if (res.ok) {
                fetchCollections()
            }
        } catch (e) { console.error(e) }
    }

    // Workshop Search
    const searchWorkshop = async () => {
        if (!workshopQuery.trim()) return
        setSearching(true)
        setSelectedAddon(null)
        try {
            const res = await fetch(`http://localhost:3000/api/workshop/${encodeURIComponent(workshopQuery)}`, { credentials: "include" })
            if (res.ok) {
                const data = await res.json()
                if (data && data.id) setSelectedAddon(data)
            }
        } catch (e) { console.error(e) }
        setSearching(false)
    }

    const loadCollection = () => {
        fetchCollections() // Alias for init
    }

    const saveCollectionToBackend = async (newMods: Mod[]) => {
        if (!activeCollectionId) return
        // Update local state first for responsiveness
        setCollectionMods(newMods)

        try {
            // Find current collection name
            const current = collections.find(c => c.id === activeCollectionId)
            const name = current ? current.name : "My Collection"

            await fetch("http://localhost:3000/api/collections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: activeCollectionId,
                    name: name,
                    items: newMods.map(m => ({
                        modId: m.modId,
                        name: m.name,
                        version: m.version,
                        deps: m.dependencies
                    }))
                }),
                credentials: "include"
            })
            // Optionally refresh cols
        } catch (e) { console.error(e) }
    }

    // Add Collection to Config (Enable)
    const enableModFromCollection = async (mod: Mod) => {
        setAddingToConfig(true)
        try {
            // Get current config
            const configRes = await fetch("http://localhost:3000/api/config", { credentials: "include" })
            if (!configRes.ok) throw new Error("Load failed")
            const config = await configRes.json()

            if (!config.game) config.game = {}
            if (!config.game.mods) config.game.mods = []

            if (!config.game.mods.find((m: any) => m.modId === mod.modId)) {
                config.game.mods.push({ modId: mod.modId, name: mod.name, version: "" })
            }

            // Save
            await fetch("http://localhost:3000/api/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(config)
            })
            fetchConfig() // Refresh enabled list
        } catch (e) { console.error(e) }
        setAddingToConfig(false)
    }

    // Add to Collection (Recursive)
    const addToCollection = async () => {
        if (!selectedAddon) return

        setLoading(true)
        const newModsMap = new Map<string, Mod>()

        // Add existing to map
        collectionMods.forEach(m => newModsMap.set(m.modId, m))

        // Helper to recursively fetch
        const resolve = async (id: string, name: string): Promise<void> => {
            if (newModsMap.has(id)) return // Already added

            // Fetch details to get deps
            try {
                const res = await fetch(`http://localhost:3000/api/workshop/${id}`, { credentials: "include" })
                if (res.ok) {
                    const info: WorkshopAddon = await res.json()
                    // Add this mod
                    newModsMap.set(info.id, {
                        modId: info.id,
                        name: info.name,
                        version: (info as any).version || "",
                        path: "",
                        dependencies: (info.dependencies || []).map(d => d.id)
                    })

                    // Recurse for deps
                    if (info.dependencies) {
                        for (const dep of info.dependencies) {
                            await resolve(dep.id, dep.name)
                        }
                    }
                } else {
                    // Fallback if fetch fails (e.g. invalid ID or hidden), just add what we know
                    if (!newModsMap.has(id)) {
                        newModsMap.set(id, { modId: id, name: name, version: "", path: "", dependencies: [] })
                    }
                }
            } catch (e) { console.error(e) }
        }

        // Start resolution with selected addon (we already have its info, but good to normalize)
        // We can optimize by using selectedAddon directly for the first level
        newModsMap.set(selectedAddon.id, {
            modId: selectedAddon.id,
            name: selectedAddon.name,
            version: (selectedAddon as any).version || "",
            path: "",
            dependencies: (selectedAddon.dependencies || []).map(d => d.id)
        })

        if (selectedAddon.dependencies) {
            for (const dep of selectedAddon.dependencies) {
                await resolve(dep.id, dep.name)
            }
        }

        saveCollectionToBackend(Array.from(newModsMap.values()))
        setLoading(false)
        alert("모음집에 추가되었습니다 (의존성 포함).")
    }

    const removeFromCollection = (modId: string) => {
        const newCollection = collectionMods.filter(m => m.modId !== modId)
        saveCollectionToBackend(newCollection)
    }

    // Helper to check status
    const getStatus = (modId: string) => {
        const isInstalled = installedMods.some(m => m.modId === modId)
        const isEnabled = enabledMods.some(m => m.modId === modId)
        return { isInstalled, isEnabled }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500">
                            모드 관리
                        </h1>
                        <p className="text-zinc-400 mt-1">워크샵 모드 검색, 컬렉션 관리 및 서버 적용</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={fetchInstalledMods}><RefreshCw className="w-4 h-4 mr-2" /> 새로고침</Button>
                    </div>
                </div>

                <Tabs defaultValue="collection" className="space-y-6">
                    <TabsList className="bg-zinc-800/50 p-1 rounded-lg">
                        <TabsTrigger value="collection" className="gap-2"><FolderHeart className="w-4 h-4" />나의 모음집 ({collectionMods.length})</TabsTrigger>
                        <TabsTrigger value="search" className="gap-2"><Search className="w-4 h-4" />워크샵 검색</TabsTrigger>
                        <TabsTrigger value="enabled" className="gap-2"><CheckCircle className="w-4 h-4" />활성화됨 (Config) ({enabledMods.length})</TabsTrigger>
                        <TabsTrigger value="installed" className="gap-2"><Package className="w-4 h-4" />설치됨 (Disk) ({installedMods.length})</TabsTrigger>
                    </TabsList>

                    {/* Collection Tab */}
                    <TabsContent value="collection">
                        <Card className="bg-zinc-800/50 border-zinc-700">
                            <CardHeader><CardTitle>모드 모음집 (내 리스트)</CardTitle><CardDescription>서버에 적용할 준비가 된 모드 목록입니다.</CardDescription></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>이름</TableHead>
                                            <TableHead>ID</TableHead>
                                            <TableHead>상태</TableHead>
                                            <TableHead>관리</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {collectionMods.map(mod => {
                                            const { isInstalled, isEnabled } = getStatus(mod.modId)
                                            return (
                                                <TableRow key={mod.modId}>
                                                    <TableCell className="font-medium">{mod.name}</TableCell>
                                                    <TableCell className="font-mono text-xs">{mod.modId}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            {isInstalled ? <Badge variant="secondary" className="bg-green-500/20 text-green-400">설치됨</Badge> : <Badge variant="secondary" className="bg-zinc-700">미설치</Badge>}
                                                            {isEnabled ? <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">활성</Badge> : <Badge variant="secondary" className="bg-zinc-700">비활성</Badge>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            {!isEnabled && (
                                                                <Button size="sm" variant="outline" onClick={() => enableModFromCollection(mod)} disabled={addingToConfig}>
                                                                    <Plus className="w-4 h-4 mr-1" /> 서버에 추가
                                                                </Button>
                                                            )}
                                                            <Button size="icon" variant="ghost" onClick={() => removeFromCollection(mod.modId)} className="text-red-400">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                        {collectionMods.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-zinc-500">모음집이 비어있습니다. 워크샵 검색 탭에서 추가하세요.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Workshop Search Tab */}
                    <TabsContent value="search">
                        <Card className="bg-zinc-800/50 border-zinc-700">
                            <CardHeader><CardTitle>워크샵 검색</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-2">
                                    <Input placeholder="모드 ID 또는 이름 (현재는 ID 검색만 지원)" value={workshopQuery} onChange={e => setWorkshopQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchWorkshop()} className="bg-zinc-900 border-zinc-700" />
                                    <Button onClick={searchWorkshop} disabled={searching}><Search className="w-4 h-4 mr-2" />검색</Button>
                                </div>
                                {selectedAddon && (
                                    <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-700">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-lg font-bold text-amber-500">{selectedAddon.name}</h3>
                                                <p className="text-sm text-zinc-400 font-mono mt-1">{selectedAddon.id}</p>
                                                {selectedAddon.dependencies && (
                                                    <div className="mt-2 text-sm space-y-1">
                                                        <div className="flex gap-4">
                                                            <span className="text-zinc-500">버전: <span className="text-zinc-300">{(selectedAddon as any).version || "N/A"}</span></span>
                                                            <span className="text-zinc-500">업데이트: <span className="text-zinc-300">{(selectedAddon as any).lastUpdated || "N/A"}</span></span>
                                                        </div>
                                                        <div>
                                                            <span className="text-zinc-500">의존성: </span>
                                                            <span className="text-zinc-300">{selectedAddon.dependencies?.length || 0}개</span>
                                                        </div>
                                                        {(selectedAddon as any).summary && <div className="text-zinc-400 text-xs mt-2 border-l-2 border-zinc-700 pl-2">{(selectedAddon as any).summary}</div>}
                                                    </div>
                                                )}
                                            </div>
                                            <Button onClick={addToCollection} className="bg-amber-600 hover:bg-amber-700">
                                                <FolderHeart className="w-4 h-4 mr-2" /> 모음집에 추가
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Enabled Tab */}
                    <TabsContent value="enabled">
                        <Card className="bg-zinc-800/50 border-zinc-700">
                            <CardHeader><CardTitle>서버 설정 (Enabled Mods)</CardTitle><CardDescription>server.json에 저장된 실제 로드될 모드 목록</CardDescription></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>목록</TableHead><TableHead></TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {enabledMods.map(mod => (
                                            <TableRow key={mod.modId}>
                                                <TableCell>{mod.name}</TableCell>
                                                <TableCell className="text-right">
                                                    {/* Removal logic would go here if implemented, or just rely on Collection management */}
                                                    <Badge variant="outline">Configured</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Installed Tab */}
                    <TabsContent value="installed">
                        <Card className="bg-zinc-800/50 border-zinc-700">
                            <CardHeader><CardTitle>디스크에 설치됨</CardTitle><CardDescription>서버 폴더에 실제로 존재하는 모드 파일들</CardDescription></CardHeader>
                            <CardContent><ScrollArea className="h-[400px]">
                                <Table>
                                    <TableBody>
                                        {installedMods.map(m => (
                                            <TableRow key={m.modId}><TableCell>{m.name}</TableCell><TableCell className="font-mono text-xs">{m.modId}</TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea></CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>
            </div>
        </div>
    )
}
