"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, Loader2, AlertCircle, CheckCircle } from "lucide-react"

import { apiPost } from "@/lib/api"

export default function PasswordPage() {
    const router = useRouter()
    const [oldPassword, setOldPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setSuccess(false)

        if (newPassword !== confirmPassword) {
            setError("새 비밀번호가 일치하지 않습니다")
            return
        }

        if (newPassword.length < 6) {
            setError("비밀번호는 최소 6자 이상이어야 합니다")
            return
        }

        setLoading(true)

        try {
            await apiPost("/api/auth/password", { oldPassword, newPassword })

            setSuccess(true)
            setOldPassword("")
            setNewPassword("")
            setConfirmPassword("")

            setTimeout(() => {
                router.push("/")
            }, 2000)
        } catch (e: any) {
            setError(e.message || "비밀번호 변경 실패")
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-6">
            <div className="max-w-md mx-auto pt-20">
                <Card className="bg-zinc-800/50 border-zinc-700">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="w-5 h-5" /> 비밀번호 변경
                        </CardTitle>
                        <CardDescription>계정 비밀번호를 변경합니다</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                                    <CheckCircle className="w-4 h-4" />
                                    비밀번호가 변경되었습니다. 잠시 후 대시보드로 이동합니다.
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="oldPassword">현재 비밀번호</Label>
                                <Input
                                    id="oldPassword"
                                    type="password"
                                    value={oldPassword}
                                    onChange={e => setOldPassword(e.target.value)}
                                    className="bg-zinc-900 border-zinc-700"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="newPassword">새 비밀번호</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className="bg-zinc-900 border-zinc-700"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="bg-zinc-900 border-zinc-700"
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-600"
                                disabled={loading || success}
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                비밀번호 변경
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
