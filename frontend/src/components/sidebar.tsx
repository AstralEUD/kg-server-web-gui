"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard, Settings, Package, Map, Sliders,
    HardDrive, Layers, LogOut, User, ChevronDown, Cog
} from "lucide-react"
import { useEffect, useState } from "react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const navItems = [
    { href: "/", label: "대시보드", icon: LayoutDashboard },
    { href: "/config", label: "서버 설정", icon: Settings },
    { href: "/mods", label: "모드 관리", icon: Package },
    { href: "/scenarios", label: "시나리오", icon: Map },
    { href: "/management", label: "서버 관리", icon: Sliders },
    { href: "/saves", label: "세이브", icon: HardDrive },
    { href: "/presets", label: "프리셋", icon: Layers },
    { href: "/settings", label: "환경 설정", icon: Cog },
]

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [username, setUsername] = useState<string | null>(null)
    const [role, setRole] = useState<string | null>(null)

    useEffect(() => {
        const storedUsername = localStorage.getItem("username")
        const storedRole = localStorage.getItem("role")
        if (storedUsername) {
            setUsername(storedUsername)
            setRole(storedRole)
        }
    }, [])

    const handleLogout = async () => {
        try {
            await fetch("http://localhost:3000/api/auth/logout", {
                method: "POST",
                credentials: "include",
            })
        } catch (e) { }

        localStorage.removeItem("auth_token")
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
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                {navItems.map(item => {
                    const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
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
                        <DropdownMenuContent align="end" className="w-48">
                            {role === "admin" && (
                                <>
                                    <DropdownMenuItem asChild>
                                        <Link href="/users">사용자 관리</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                </>
                            )}
                            <DropdownMenuItem asChild>
                                <Link href="/password">비밀번호 변경</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="text-red-400">
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
