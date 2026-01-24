"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard, Settings, Package, Map, Sliders,
    HardDrive, Layers, LogOut, User, ChevronDown, Cog, Server as ServerIcon, Plus, Zap,
    Users, Clock, BarChart3
} from "lucide-react"
import { useEffect, useState } from "react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"

const navItems = [
    { href: "/", label: "대시보드", icon: LayoutDashboard },
    { href: "/config", label: "서버 설정", icon: Settings },
    { href: "/mods", label: "모드 관리", icon: Package },
    { href: "/scenarios", label: "시나리오", icon: Map },
    { href: "/maps", label: "빠른 맵 변경", icon: Zap },
    { href: "/management", label: "서버 관리", icon: Sliders },
    { href: "/management/players", label: "플레이어 관리", icon: Users },
    { href: "/management/jobs", label: "스케줄러", icon: Clock },
    { href: "/stats", label: "통계 & 리포트", icon: BarChart3 },
    { href: "/saves", label: "세이브", icon: HardDrive },
    { href: "/presets", label: "서버 프로필", icon: Layers },
    { href: "/settings", label: "환경 설정", icon: Cog },
]

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [username, setUsername] = useState<string | null>(null)
    const [role, setRole] = useState<string | null>(null)
    const [servers, setServers] = useState<any[]>([])
    const [currentServer, setCurrentServer] = useState<any>(null)

    // Get server ID from URL or default
    const serverId = searchParams.get('server') || 'default'

    useEffect(() => {
        const storedUsername = localStorage.getItem("username")
        const storedRole = localStorage.getItem("role")
        if (storedUsername) {
            setUsername(storedUsername)
            setRole(storedRole)
        }
        fetchServers()
    }, [])

    useEffect(() => {
        if (servers.length > 0) {
            const found = servers.find(s => s.id === serverId) || servers.find(s => s.id === 'default')
            setCurrentServer(found)
        }
    }, [servers, serverId])

    const fetchServers = async () => {
        try {
            const res = await apiFetch("/api/servers")
            if (res.ok) {
                const data = await res.json()
                setServers(data || [])
            }
        } catch (e) { console.error('Servers fetch error:', e) }
    }

    const handleServerSwitch = (id: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('server', id)
        router.push(`${pathname}?${params.toString()}`)
    }

    const handleLogout = async () => {
        try {
            await apiFetch("/api/auth/logout", { method: "POST" })
        } catch (e) { console.error('Logout error:', e) }

        // Fix #9: Don't remove auth_token from localStorage (rely on httpOnly cookie)
        localStorage.removeItem("username")
        localStorage.removeItem("role")
        router.push("/login")
    }

    return (
        <aside className="w-64 border-r border-zinc-800 bg-zinc-900/50 backdrop-blur-sm hidden md:flex flex-col">
            {/* Logo - Full Width */}
            <div className="p-4 border-b border-zinc-800">
                <div className="flex flex-col items-center gap-2">
                    <img
                        src="/Kichiguys_logo_origin_white.png"
                        alt="Kimchi Guyz"
                        className="w-full max-w-[180px] h-auto object-contain"
                    />
                    <div className="text-center">
                        <div className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">
                            리포저 매니저
                        </div>
                        <div className="text-xs text-zinc-500">서버 관리 패널</div>
                    </div>
                </div>

                {/* Server Selector */}
                <div className="mt-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-between bg-zinc-900/50 border-zinc-700 hover:bg-zinc-800 h-9">
                                <span className="flex items-center gap-2 truncate text-sm">
                                    <ServerIcon className="w-3.5 h-3.5 text-zinc-400" />
                                    {currentServer ? currentServer.name : "서버 선택"}
                                </span>
                                <ChevronDown className="w-3 h-3 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 bg-zinc-900 border-zinc-700 text-zinc-100">
                            {servers.map(server => (
                                <DropdownMenuItem
                                    key={server.id}
                                    onClick={() => handleServerSwitch(server.id)}
                                    className="gap-2 cursor-pointer focus:bg-zinc-800"
                                >
                                    <div className={`w-2 h-2 rounded-full ${server.status === 'running' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    <span className="truncate">{server.name}</span>
                                    {server.id === serverId && <span className="ml-auto text-xs text-amber-500">Active</span>}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-zinc-800" onClick={() => router.push('/management?action=create')}>
                                <Plus className="w-4 h-4" /> 새 서버 추가
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                {navItems.map(item => {
                    const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                    // Append server ID to links to persist context
                    const linkHref = `${item.href}?server=${serverId}`

                    return (
                        <Link
                            key={item.href}
                            href={linkHref}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                                isActive
                                    ? "bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-400 border-l-2 border-amber-400"
                                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            {/* User Section */}
            <div className="p-4 border-t border-zinc-800">
                {username ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                                <User className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="text-sm font-medium">{username}</div>
                                <div className="text-xs text-zinc-500 capitalize">
                                    {role === "admin" ? "관리자" : "사용자"}
                                </div>
                            </div>
                            <ChevronDown className="w-4 h-4 text-zinc-500" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-zinc-700 text-zinc-100">
                            {role === "admin" && (
                                <>
                                    <DropdownMenuItem asChild>
                                        <Link href="/users">사용자 관리</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-zinc-800" />
                                </>
                            )}
                            <DropdownMenuItem asChild>
                                <Link href="/password">비밀번호 변경</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:bg-red-950/20 focus:text-red-300">
                                <LogOut className="w-4 h-4 mr-2" /> 로그아웃
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <Link
                        href="/login"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white"
                    >
                        <LogOut className="w-4 h-4" /> 로그인
                    </Link>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800">
                <div className="flex items-center justify-center gap-2">
                    <img
                        src="/arma-reforger-white-transparent.png"
                        alt="Arma Reforger"
                        className="h-6 w-auto opacity-50"
                    />
                </div>
                <div className="text-xs text-zinc-600 text-center mt-2">
                    v1.0.0
                </div>
            </div>
        </aside>
    )
}
