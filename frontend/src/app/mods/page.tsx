"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Package, Plus, Trash2, Download, RefreshCw, ArrowUpDown, ExternalLink, Loader2, AlertTriangle, CheckCircle, Save, FolderHeart, List, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, Database, GitGraph } from "lucide-react"
import { toast } from "sonner"
import { apiGet, apiPost, apiDelete } from "@/lib/api"
import DependencyTree from "@/components/DependencyTree"

function formatBytes(bytes: number) {
    if (typeof bytes !== 'number' || isNaN(bytes)) return '0 Bytes';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i < 0) return bytes + ' Bytes';
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface Mod {
    modId: string
    name: string
    version: string
    path: string
    size?: number
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

    const getModName = (modId: string) => {
        // Try to find name in all known mod lists
        const found = [...installedMods, ...enabledMods, ...collectionMods].find(m => m.modId === modId)
        return found ? found.name : modId
    }
    
    const [modCategories, setModCategories] = useState<Record<string, string>>({}) // ModID -> Category

    const [searchQuery, setSearchQuery] = useState("")
    const [workshopQuery, setWorkshopQuery] = useState("")
    const [selectedAddon, setSelectedAddon] = useState<WorkshopAddon | null>(null)
    const [loading, setLoading] = useState(false)
    const [searching, setSearching] = useState(false)
    const [missingDeps, setMissingDeps] = useState<string[]>([])
    const [addingToConfig, setAddingToConfig] = useState(false)

    // Sort/Filter for Collection
    const [collectionSortKey, setCollectionSortKey] = useState<'name' | 'size' | 'category'>('category')
    const [collectionSortOrder, setCollectionSortOrder] = useState<'asc' | 'desc'>('asc')

    const [treeTarget, setTreeTarget] = useState<any>(null)
    const [treeLoading, setTreeLoading] = useState(false)
    const [filterCategory, setFilterCategory] = useState<string>("All")

    useEffect(() => {
        fetchInstalledMods()
        fetchConfig()
        loadCollection()
        fetchCategories()
    }, [])

    // Disk Mods
    const fetchInstalledMods = async () => {
        setLoading(true)
        try {
            const data = await apiGet<Mod[]>("/api/mods")
            setInstalledMods(data || [])
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    const fetchCategories = async () => {
        try {
            const data = await apiGet<Record<string, string>>("/api/mods/categories")
            setModCategories(data || {})
        } catch (e) {
            console.error(e)
        }
    }

    const handleSetCategory = async (modId: string, category: string) => {
        setModCategories(prev => ({ ...prev, [modId]: category }))

        try {
            await apiPost("/api/mods/categories", { modId, category })
        } catch (e) {
            console.error("Failed to save category", e)
        }
    }

    const refreshAll = async () => {
        setLoading(true)
        await Promise.all([
            fetchInstalledMods(),
            fetchConfig(),
            fetchCollections(),
            fetchCategories()
        ])
        setLoading(false)
    }

    // Config Mods
    const fetchConfig = async () => {
        try {
            const data = await apiGet<any>("/api/config")
            if (data.game?.mods && Array.isArray(data.game.mods)) {
                setEnabledMods(data.game.mods.map((m: any) => ({
                    modId: m.modId || m.id,
                    name: m.name || m.modId,
                    version: m.version || "",
                    path: "",
                    dependencies: []
                })))
            } else if (data.mods) {
                setEnabledMods(data.mods.map((m: any) => ({
                    modId: m.modId || m.id,
                    name: m.name || m.modId,
                    version: m.version || "",
                    path: "",
                    dependencies: []
                })))
            }
        } catch (e) { }
    }

    // Collection (Backend)
    const [collections, setCollections] = useState<any[]>([])
    const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null)

    const fetchCollections = async () => {
        try {
            const cols = await apiGet<any[]>("/api/collections")
            setCollections(cols || [])

            if (cols && cols.length > 0) {
                setActiveCollectionId(cols[0].id)
                setCollectionMods(cols[0].items.map((i: any) => ({
                    modId: i.modId,
                    name: i.name,
                    version: i.version || "",
                    path: "",
                    dependencies: i.deps || []
                })))
            } else {
                createDefaultCollection()
            }
        } catch (e) { console.error(e) }
    }

    const createDefaultCollection = async () => {
        try {
            await apiPost("/api/collections", { name: "My Collection", items: [] })
            fetchCollections()
        } catch (e) { console.error(e) }
    }

    // Workshop Search
    const searchWorkshop = async () => {
        if (!workshopQuery.trim()) return
        setSearching(true)
        setSelectedAddon(null)
        try {
            const data = await apiGet<WorkshopAddon>(`/api/workshop/${encodeURIComponent(workshopQuery)}`)
            if (data && data.id) setSelectedAddon(data)
        } catch (e) { console.error(e) }
        setSearching(false)
    }

    const loadCollection = () => {
        fetchCollections() // Alias for init
    }

    const saveCollectionToBackend = async (newMods: Mod[]) => {
        if (!activeCollectionId) return
        setCollectionMods(newMods)

        try {
            const current = collections.find(c => c.id === activeCollectionId)
            const name = current ? current.name : "My Collection"

            await apiPost("/api/collections", {
                id: activeCollectionId,
                name: name,
                items: newMods.map(m => ({
                    modId: m.modId,
                    name: m.name,
                    version: m.version,
                    deps: m.dependencies
                }))
            })
        } catch (e) { console.error(e) }
    }

    const removeFromCollection = async (modId: string) => {
        if (!confirm("모음집에서 이 모드를 제거하시겠습니까?")) return
        const updated = collectionMods.filter(m => m.modId !== modId)
        await saveCollectionToBackend(updated)
    }

    const togglePinVersion = async (modId: string, currentVersion: string, isPinned: boolean) => {
        const nextMods = collectionMods.map(m => {
            if (m.modId === modId) {
                return { ...m, version: isPinned ? "" : currentVersion }
            }
            return m
        })
        await saveCollectionToBackend(nextMods)
    }

    // Add Collection to Config (Enable)
    const enableModFromCollection = async (mod: Mod) => {
        setAddingToConfig(true)
        try {
            const config = await apiGet<any>("/api/config")

            if (!config.game) config.game = {}
            if (!config.game.mods) config.game.mods = []

            if (!config.game.mods.find((m: any) => (m.modId || m.id) === mod.modId)) {
                config.game.mods.push({ modId: mod.modId, name: mod.name, version: mod.version || "" })
            }

            await apiPost("/api/config", config)
            fetchConfig()
        } catch (e) { console.error(e) }
        setAddingToConfig(false)
    }

    const saveEnabledModsToConfig = async (newEnabled: Mod[]) => {
        setAddingToConfig(true)
        try {
            const config = await apiGet<any>("/api/config")

            if (!config.game) config.game = {}
            config.game.mods = newEnabled.map(m => ({
                modId: m.modId,
                name: m.name,
                version: m.version || ""
            }))

            await apiPost("/api/config", config)
        } catch (e) {
            console.error(e)
            alert("순서 저장 실패")
        }
        setAddingToConfig(false)
    }

    const moveEnabledMod = (index: number, direction: 'up' | 'down' | 'top' | 'bottom') => {
        const newMods = [...enabledMods]
        const [item] = newMods.splice(index, 1)

        if (direction === 'up') newMods.splice(Math.max(0, index - 1), 0, item)
        else if (direction === 'down') newMods.splice(Math.min(newMods.length, index + 1), 0, item)
        else if (direction === 'top') newMods.unshift(item)
        else if (direction === 'bottom') newMods.push(item)

        setEnabledMods(newMods)
        saveEnabledModsToConfig(newMods)
    }

    const [syncing, setSyncing] = useState(false)
    const syncEnabledToCollection = async () => {
        if (!enabledMods || enabledMods.length === 0) {
            alert("동기화할 활성화된 모드가 없습니다.")
            return
        }

        setSyncing(true)
        try {
            const collections = await apiGet<any[]>("/api/collections")

            let targetCollection = collections?.[0]
            if (!targetCollection) {
                targetCollection = await apiPost<any>("/api/collections", { name: "My Collection", items: [] })
            }

            const existingItems = targetCollection.items || []
            const existingIds = new Set(existingItems.map((item: any) => item.modId))

            const newMods = enabledMods.filter(m => !existingIds.has(m.modId))

            if (newMods.length === 0) {
                alert("모든 활성화된 모드가 이미 컬렉션에 등록되어 있습니다.")
                setSyncing(false)
                return
            }

            const enrichData = await apiPost<any>("/api/config/enrich", { mods: newMods })

            const newItems = enrichData.mods.map((m: any) => ({
                modId: m.modId,
                name: m.name,
                version: "",
                deps: m.dependencies || []
            }))

            const mergedItems = [...existingItems, ...newItems]

            await apiPost("/api/collections", {
                id: targetCollection.id,
                name: targetCollection.name,
                items: mergedItems
            })

            await fetchCollections()
            alert(`동기화 완료!\n- 활성화된 모드 중 새 모드 ${newItems.length}개가 컬렉션에 추가되었습니다.`)

        } catch (e) {
            console.error(e)
            alert("동기화 실패")
        }
        setSyncing(false)
    }

    // ... (sorting/helpers omitted)

    // Add to Collection (Optimized using Backend Resolve)
    const addToCollection = async () => {
        if (!selectedAddon) return

        setLoading(true)
        try {
            const resolvedList = await apiPost<WorkshopAddon[]>("/api/workshop/resolve", { ids: [selectedAddon.id] })
            const newModsMap = new Map<string, Mod>()

            collectionMods.forEach(m => newModsMap.set(m.modId, m))

            resolvedList.forEach(info => {
                if (!newModsMap.has(info.id)) {
                    newModsMap.set(info.id, {
                        modId: info.id,
                        name: info.name,
                        version: (info as any).version || "",
                        path: "",
                        dependencies: (info.dependencies || []).map(d => d.id)
                    })
                }
            })

            await saveCollectionToBackend(Array.from(newModsMap.values()))
            toast.success(`${resolvedList.length}개의 모드와 의존성이 추가되었습니다.`)
        } catch (e) {
            toast.error("의존성 해결 중 오류가 발생했습니다.")
        }
        setLoading(false)
    }

    const buildTree = (modId: string, flatList: any[]): any => {
        const mod = flatList.find(m => (m.id || m.modId) === modId)
        if (!mod) return { id: modId, name: modId, dependencies: [] }

        return {
            id: mod.id || mod.modId,
            name: mod.name,
            version: mod.version,
            dependencies: (mod.dependencies || []).map((dep: any) => buildTree(dep.id || dep, flatList))
        }
    }

    const handleViewTree = async (modId: string) => {
        setTreeLoading(true)
        try {
            const flatList = await apiPost<any[]>("/api/workshop/resolve", { ids: [modId] })
            const tree = buildTree(modId, flatList)
            setTreeTarget(tree)
        } catch (e) { toast.error("트리를 생성할 수 없습니다.") }
        setTreeLoading(false)
    }

    const removeEnabledMod = async (modId: string) => {
        if (!confirm("서버 설정에서 이 모드를 제거하시겠습니까? (자동 저장됨)")) return
        try {
            const config = await apiGet<any>("/api/config")

            if (config.game && config.game.mods) {
                config.game.mods = config.game.mods.filter((m: any) => (m.modId || m.id) !== modId)
                await apiPost("/api/config", config)
                fetchConfig()
            }
        } catch (e) {
            console.error(e)
            alert("제거 실패")
        }
    }

    const deleteInstalledMod = async (modId: string) => {
        if (!confirm("디스크에서 모드 파일을 영구 삭제하시겠습니까?")) return
        try {
            await apiDelete(`/api/mods/${modId}`)
            alert("삭제되었습니다.")
            fetchInstalledMods()
        } catch (e) {
            console.error(e)
            alert("오류 발생")
        }
    }

    // Helper to check status
    const getStatus = (modId: string) => {
        const isInstalled = installedMods.some(m => m.modId === modId)
        const isEnabled = enabledMods.some(m => m.modId === modId)
        return { isInstalled, isEnabled }
    }
    const uniqueCategories = ["All", ...Array.from(new Set(Object.values(modCategories)))]

    const sortedCollection = collectionMods
        .filter(m => filterCategory === "All" || modCategories[m.modId] === filterCategory)
        .sort((a, b) => {
            if (collectionSortKey === 'name') {
                return collectionSortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
            } else if (collectionSortKey === 'size') {
                const sizeA = installedMods.find(m => m.modId === a.modId)?.size || 0
                const sizeB = installedMods.find(m => m.modId === b.modId)?.size || 0
                return collectionSortOrder === 'asc' ? sizeA - sizeB : sizeB - sizeA
            } else {
                const catA = modCategories[a.modId] || ""
                const catB = modCategories[b.modId] || ""
                return collectionSortOrder === 'asc' ? catA.localeCompare(catB) : catB.localeCompare(catA)
            }
        })

    const toggleCollectionSort = (key: 'name' | 'size' | 'category') => {
        if (collectionSortKey === key) {
            setCollectionSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setCollectionSortKey(key)
            setCollectionSortOrder('asc')
        }
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
                        <Button variant="outline" onClick={refreshAll} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> 새로고침</Button>
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
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>모드 모음집 (내 리스트)</CardTitle>
                                        <CardDescription>서버에 적용할 준비가 된 모드 목록입니다.</CardDescription>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <div className="flex bg-zinc-900 border border-zinc-700 rounded px-2 py-1 items-center gap-2 mr-2">
                                            <List className="w-3.5 h-3.5 text-zinc-500" />
                                            <select
                                                value={filterCategory}
                                                onChange={e => setFilterCategory(e.target.value)}
                                                className="bg-transparent border-none text-[10px] outline-none text-zinc-300 min-w-[80px]"
                                            >
                                                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={syncEnabledToCollection} disabled={syncing}>
                                            <Database className={`w-3 h-3 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                                            {syncing ? "동기화 중..." : "활성 모드 동기화"}
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => toggleCollectionSort('name')} className={collectionSortKey === 'name' ? 'bg-zinc-700' : ''}>
                                            이름순 {collectionSortKey === 'name' && (collectionSortOrder === 'asc' ? '↑' : '↓')}
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => toggleCollectionSort('size')} className={collectionSortKey === 'size' ? 'bg-zinc-700' : ''}>
                                            용량순 {collectionSortKey === 'size' && (collectionSortOrder === 'asc' ? '↑' : '↓')}
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => toggleCollectionSort('category')} className={collectionSortKey === 'category' ? 'bg-zinc-700' : ''}>
                                            카테고리순 {collectionSortKey === 'category' && (collectionSortOrder === 'asc' ? '↑' : '↓')}
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>이름</TableHead>
                                            <TableHead>ID</TableHead>
                                            <TableHead>용량</TableHead>
                                            <TableHead>의존성</TableHead>
                                            <TableHead>버전 고정</TableHead>
                                            <TableHead>카테고리</TableHead>
                                            <TableHead>관리</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedCollection.map((mod: Mod) => {
                                            const { isInstalled, isEnabled } = getStatus(mod.modId)
                                            const installedInfo = installedMods.find(im => im.modId === mod.modId)
                                            const size = installedInfo?.size || 0
                                            const category = modCategories[mod.modId] || ""
                                            const isMissing = !isInstalled

                                            return (
                                                <TableRow key={mod.modId} className={isMissing ? "bg-red-900/10" : ""}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {mod.name}
                                                            {isMissing && <Badge variant="destructive" className="text-[10px] px-1 py-0">MISSING</Badge>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs text-zinc-500">
                                                        <div className="flex items-center gap-2">
                                                            {mod.modId}
                                                            {isMissing && (
                                                                <Button variant="ghost" size="sm" className="h-4 px-1 text-[10px]" onClick={async () => {
                                                                    // Fetch info
                                                                    try {
                                                                        const info = await apiGet<any>(`/api/workshop/${mod.modId}`)
                                                                        setCollectionMods(prev => prev.map(m => m.modId === mod.modId ? { ...m, name: info.name } : m))
                                                                        alert(`정보 갱신: ${info.name}`)
                                                                    } catch (e) { console.error(e) }
                                                                }}>
                                                                    <Download className="w-3 h-3 mr-1" /> 정보 갱신
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-zinc-400">{size > 0 ? formatBytes(size) : "-"}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1 max-w-[300px]">
                                                            {mod.dependencies && mod.dependencies.length > 0 ? (
                                                                 mod.dependencies.slice(0, 5).map((depId: string) => (
                                                                    <Badge key={depId} variant="outline" className="text-[10px] py-0 px-1 bg-zinc-800/50 border-zinc-700 text-zinc-400 whitespace-nowrap" title={depId}>
                                                                        {getModName(depId)}
                                                                    </Badge>
                                                                ))
                                                            ) : (
                                                                <span className="text-zinc-600 text-xs">-</span>
                                                            )}
                                                            {mod.dependencies.length > 5 && (
                                                                <span className="text-[10px] text-zinc-500">+{mod.dependencies.length - 5} more</span>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-5 px-1 ml-1 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                                                                onClick={() => handleViewTree(mod.modId)}
                                                            >
                                                                <GitGraph className="w-3 h-3 mr-1" /> 트리 보기
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <input
                                                            type="text"
                                                            className="bg-transparent border-b border-zinc-700 text-sm w-24 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-700"
                                                            placeholder="분류.."
                                                            value={category}
                                                            onChange={(e) => handleSetCategory(mod.modId, e.target.value)}
                                                            list="category-suggestions"
                                                        />
                                                        <datalist id="category-suggestions">
                                                            <option value="Map" />
                                                            <option value="System" />
                                                            <option value="Weapon" />
                                                            <option value="Vehicle" />
                                                            <option value="Gear" />
                                                        </datalist>
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!mod.version}
                                                                onChange={() => togglePinVersion(mod.modId, installedInfo?.version || "", !!mod.version)}
                                                                className="accent-amber-500"
                                                            />
                                                            <span className="text-xs font-mono text-zinc-500">
                                                                {mod.version || (installedInfo?.version ? `(${installedInfo.version})` : "-")}
                                                            </span>
                                                        </div>
                                                    </TableCell>
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
                                        {collectionMods.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-zinc-500">모음집이 비어있습니다. 워크샵 검색 탭에서 추가하세요.</TableCell></TableRow>}
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
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>서버 설정 (Enabled Mods)</CardTitle>
                                        <CardDescription>server.json에 저장된 실제 로드될 모드 목록 (위쪽이 먼저 로드됨)</CardDescription>
                                    </div>
                                </div>
                                {/* Sync button removed as requested */}
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>목록</TableHead><TableHead>ID</TableHead><TableHead>용량</TableHead><TableHead>의존성</TableHead><TableHead className="text-right">순서 / 관리</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {enabledMods.map((mod, index) => {
                                            // Find full info from installed mods to get dependencies
                                            const installedInfo = installedMods.find(im => im.modId === (mod.modId || (mod as any).id))
                                            const deps = installedInfo?.dependencies || []
                                            const size = installedInfo?.size || 0

                                            return (
                                                <TableRow key={mod.modId}>
                                                    <TableCell className="font-medium">{mod.name}</TableCell>
                                                    <TableCell className="font-mono text-xs text-zinc-500">{mod.modId}</TableCell>
                                                    <TableCell className="text-sm text-zinc-400">{size > 0 ? formatBytes(size) : "-"}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1 max-w-[250px]">
                                                            {deps.length > 0 ? (
                                                                deps.slice(0, 3).map(depId => (
                                                                    <Badge key={depId} variant="outline" className="text-[10px] py-0 px-1 bg-blue-500/5 border-blue-500/20 text-blue-400/70 whitespace-nowrap" title={depId}>
                                                                        {getModName(depId)}
                                                                    </Badge>
                                                                ))
                                                            ) : (
                                                                <span className="text-zinc-600 text-xs">-</span>
                                                            )}
                                                            {deps.length > 3 && (
                                                                <span className="text-[10px] text-zinc-500">+{deps.length - 3}</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <div className="flex gap-0.5 mr-4 border-r border-zinc-700 pr-2">
                                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveEnabledMod(index, 'top')} title="맨 위로"><ChevronsUp className="w-4 h-4" /></Button>
                                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveEnabledMod(index, 'up')} title="위로"><ChevronUp className="w-4 h-4" /></Button>
                                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveEnabledMod(index, 'down')} title="아래로"><ChevronDown className="w-4 h-4" /></Button>
                                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => moveEnabledMod(index, 'bottom')} title="맨 아래로"><ChevronsDown className="w-4 h-4" /></Button>
                                                            </div>
                                                            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => removeEnabledMod(mod.modId)}>
                                                                <Trash2 className="w-4 h-4 mr-1" /> 제거
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Installed Tab */}
                    <TabsContent value="installed">
                        <Card className="bg-zinc-800/50 border-zinc-700">
                            <CardHeader><CardTitle>디스크에 설치됨</CardTitle><CardDescription>서버 폴더에 실제로 존재하는 모드 파일들</CardDescription></CardHeader>
                            <CardContent><ScrollArea className="h-[500px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>이름</TableHead>
                                            <TableHead>ID</TableHead>
                                            <TableHead>용량</TableHead>
                                            <TableHead>의존성</TableHead>
                                            <TableHead className="text-right">관리</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {installedMods.map(m => (
                                            <TableRow key={m.modId}>
                                                <TableCell className="font-medium">{m.name}</TableCell>
                                                <TableCell className="font-mono text-xs text-zinc-500">{m.modId}</TableCell>
                                                <TableCell className="text-sm text-zinc-400">{m.size ? formatBytes(m.size) : "-"}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1 max-w-[250px]">
                                                        {m.dependencies && m.dependencies.length > 0 ? (
                                                             m.dependencies.slice(0, 3).map((depId: string) => (
                                                                <Badge key={depId} variant="outline" className="text-[10px] py-0 px-1 bg-amber-500/5 border-amber-500/20 text-amber-500/70 whitespace-nowrap" title={depId}>
                                                                    {getModName(depId)}
                                                                </Badge>
                                                            ))
                                                        ) : (
                                                            <span className="text-zinc-600 text-xs">-</span>
                                                        )}
                                                        {m.dependencies && m.dependencies.length > 3 && (
                                                            <span className="text-[10px] text-zinc-500">+{m.dependencies.length - 3}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" variant="ghost" className="text-zinc-500 hover:text-red-400" onClick={() => deleteInstalledMod(m.modId)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea></CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>
            </div>

            {/* Tree Modal */}
            {treeTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <Card className="w-full max-w-2xl bg-zinc-900 border-zinc-700 shadow-2xl overflow-hidden">
                        <CardHeader className="border-b border-zinc-800 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <GitGraph className="w-5 h-5 text-blue-400" /> 의존성 트리 탐색기
                                </CardTitle>
                                <CardDescription>{treeTarget.name}</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setTreeTarget(null)}>
                                <Plus className="w-5 h-5 rotate-45" />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6">
                            <DependencyTree root={treeTarget} />
                            <div className="mt-6 flex justify-end gap-3">
                                <Button variant="outline" size="sm" onClick={() => setTreeTarget(null)}>닫기</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {treeLoading && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                    <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700 flex items-center gap-3 shadow-xl">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        <span className="text-sm font-medium">의존성 분석 중...</span>
                    </div>
                </div>
            )}
        </div>
    )
}
