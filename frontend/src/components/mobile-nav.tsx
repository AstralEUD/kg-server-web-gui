"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Menu, X, ChevronDown, Server as ServerIcon, LayoutDashboard, Settings, Package, Map, Zap, Sliders, Users, Clock, BarChart3, HardDrive, Layers, Cog } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

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

export function MobileNav() {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const serverId = searchParams.get('server') || 'default'

    return (
        <div className="md:hidden flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800 sticky top-0 z-40">
            <div className="flex items-center gap-2">
                <img src="/Kichiguys_logo_origin_white.png" alt="Logo" className="h-6 w-auto" />
                <span className="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">리포저 매니저</span>
            </div>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-zinc-400">
                        <Menu className="w-6 h-6" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="bg-zinc-950 border-r border-zinc-800 p-0 w-[280px]">
                    <SheetHeader className="p-6 border-b border-zinc-900">
                        <SheetTitle className="text-left text-zinc-100 flex items-center gap-2 text-lg">
                            <ServerIcon className="w-5 h-5 text-amber-500" /> 메뉴
                        </SheetTitle>
                    </SheetHeader>
                    <nav className="flex flex-col p-4 space-y-1">
                        {navItems.map(item => {
                            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                            const linkHref = `${item.href}?server=${serverId}`

                            return (
                                <Link
                                    key={item.href}
                                    href={linkHref}
                                    onClick={() => setOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                                            ? "bg-amber-500/10 text-amber-400"
                                            : "text-zinc-500 hover:text-white"
                                        }`}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span className="font-medium text-sm">{item.label}</span>
                                </Link>
                            )
                        })}
                    </nav>
                </SheetContent>
            </Sheet>
        </div>
    )
}
