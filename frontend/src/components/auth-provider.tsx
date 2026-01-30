"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

interface AuthProviderProps {
    children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

    useEffect(() => {
        // Check if user is logged in
        // Fix #Loop: auth_token is legacy (now using httpOnly cookie), so we rely on username as marker
        const username = localStorage.getItem("username")

        // Clean up legacy token if present
        if (localStorage.getItem("auth_token")) {
            localStorage.removeItem("auth_token")
        }

        // Public routes that don't require auth
        const publicRoutes = ["/login"]

        if (!username) {
            if (!publicRoutes.includes(pathname)) {
                setIsAuthenticated(false)
                router.replace("/login")
            } else {
                setIsAuthenticated(true)
            }
        } else {
            setIsAuthenticated(true)
            // If already logged in and trying to access login, redirect to home
            if (pathname === "/login") {
                router.replace("/")
            }
        }
    }, [pathname, router])

    // Show loading while checking auth
    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        )
    }

    if (!isAuthenticated) return null

    return <>{children}</>
}
