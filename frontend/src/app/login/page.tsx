"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, User, Loader2, AlertCircle } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const res = await fetch("http://localhost:3000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ username, password }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || "로그인 실패")
                setLoading(false)
                return
            }

            localStorage.setItem("auth_token", data.token)
            localStorage.setItem("username", data.username)
            localStorage.setItem("role", data.role)

            router.push("/")
        } catch (e) {
            setError("연결 오류 - 서버가 실행 중인지 확인하세요")
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-4">
            <div className="w-full max-w-md space-y-8">
                {/* Logo */}
                <div className="text-center space-y-4">
                    <div className="flex justify-center gap-4 items-center">
                        <img
                            src="/Kichiguys_logo_origin_white.png"
                            alt="Kimchi Guyz"
                            className="h-20 w-auto"
                        />
                        <span className="text-3xl text-zinc-500">×</span>
                        <img
                            src="/arma-reforger-white-transparent.png"
                            alt="Arma Reforger"
                            className="h-12 w-auto"
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-white">서버 매니저</h1>
                    <p className="text-zinc-500">서버 관리를 위해 로그인하세요</p>
                </div>

                {/* Login Card */}
                <Card className="bg-zinc-800/50 border-zinc-700">
                    <CardHeader>
                        <CardTitle>로그인</CardTitle>
                        <CardDescription>계정 정보를 입력하세요</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            {error && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="username">아이디</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <Input
                                        id="username"
                                        type="text"
                                        placeholder="admin"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className="pl-10 bg-zinc-900 border-zinc-700"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">비밀번호</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="pl-10 bg-zinc-900 border-zinc-700"
                                        required
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                로그인
                            </Button>

                            <p className="text-center text-xs text-zinc-500 mt-4">
                                기본 계정: admin / admin123!
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
