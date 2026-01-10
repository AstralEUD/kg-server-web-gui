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
        const token = localStorage.getItem("auth_token")
        const username = localStorage.getItem("username")

        // Public routes that don't require auth
        const publicRoutes = ["/login"]

        if (!token || !username) {
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

    return <>{children}</>
}
