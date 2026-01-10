"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Settings, Clock, RotateCw, Shield, Gauge, Network, Cpu, Bug, Zap, Save, Power, Download, CheckCircle, Loader2 } from "lucide-react"

interface AdvancedSettings {
    limitServerMaxFPS: boolean
    maxFPS: number
    autoRestart: boolean
    restartTime: string
    verifyRepairAddons: boolean
    restartOnGameDestroyed: boolean
    autoReloadScenario: boolean
    reloadScenarioInterval: number
}

const defaultSettings: AdvancedSettings = {
    limitServerMaxFPS: false, maxFPS: 60,
    autoRestart: false, restartTime: "04:00",
    verifyRepairAddons: true,
    restartOnGameDestroyed: false,
    autoReloadScenario: false,
    reloadScenarioInterval: 0
}

export default function ManagementPage() {
    const [settings, setSettings] = useState<AdvancedSettings>(defaultSettings)
    const [saving, setSaving] = useState(false)
    const [downloading, setDownloading] = useState(false)

    const update = <K extends keyof AdvancedSettings>(key: K, value: AdvancedSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }))
    }

    const saveSettings = async () => {
        setSaving(true)
        // Simulate save
        await new Promise(r => setTimeout(r, 1000))
        setSaving(false)
    }

    const downloadServer = async () => {
        setDownloading(true)
        try {
            await fetch("http://localhost:3000/api/steamcmd/download", {
                method: "POST",
                credentials: "include",
                body: JSON.stringify({ experimental: false })
            })
            alert("다운로드가 시작되었습니다. 로그를 확인하세요.")
        } catch (e) {
            console.error(e)
        }
        setDownloading(false)
    }

    const SettingRow = ({
        label, description, enabled, onEnabledChange, children
    }: {
        label: string; description?: string; enabled: boolean; onEnabledChange: (v: boolean) => void; children?: React.ReactNode
    }) => (
        <div className="flex items-start justify-between p-4 rounded-lg border border-zinc-800 bg-zinc-900/30">
            <div className="space-y-1">
                <div className="font-medium text-zinc-200">{label}</div>
                {description && <div className="text-sm text-zinc-500">{description}</div>}
                {children && <div className="pt-2">{children}</div>}
            </div>
            <Switch checked={enabled} onCheckedChange={onEnabledChange} />
        </div>
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">
                            서버 관리
                        </h1>
                        <p className="text-zinc-400 mt-1">고급 서버 관리 및 유지보수 도구</p>
                    </div>
                </div>

                <div className="grid gap-6">
                    {/* Maintenance Tools */}
                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-yellow-400" /> 유지보수 도구
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-900 border border-zinc-700">
                                <div>
                                    <div className="font-medium">서버 강제 업데이트 / 재설치</div>
                                    <div className="text-sm text-zinc-500">SteamCMD를 통해 서버 파일을 확인하고 업데이트합니다</div>
                                </div>
                                <Button onClick={downloadServer} disabled={downloading} variant="outline" className="gap-2">
                                    {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    업데이트 시작
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Advanced Operations */}
                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-gray-400" /> 고급 운영 설정
                            </CardTitle>
                            <Button onClick={saveSettings} disabled={saving} size="sm" className="gap-2">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                설정 저장
                            </Button>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <SettingRow
                                label="FPS 제한"
                                description="서버의 최대 프레임 속도를 제한합니다"
                                enabled={settings.limitServerMaxFPS}
                                onEnabledChange={v => update("limitServerMaxFPS", v)}
                            >
                                {settings.limitServerMaxFPS && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <Input
                                            type="number"
                                            value={settings.maxFPS}
                                            onChange={e => update("maxFPS", parseInt(e.target.value))}
                                            className="w-24 bg-zinc-800 border-zinc-700 h-8"
                                        />
                                        <span className="text-sm text-zinc-500">FPS</span>
                                    </div>
                                )}
                            </SettingRow>

                            <SettingRow
                                label="자동 재시작 스케줄러"
                                description="매일 정해진 시간에 서버를 자동으로 재시작합니다"
                                enabled={settings.autoRestart}
                                onEnabledChange={v => update("autoRestart", v)}
                            >
                                {settings.autoRestart && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <Clock className="w-4 h-4 text-zinc-500" />
                                        <Input
                                            type="time"
                                            value={settings.restartTime}
                                            onChange={e => update("restartTime", e.target.value)}
                                            className="w-32 bg-zinc-800 border-zinc-700 h-8"
                                        />
                                    </div>
                                )}
                            </SettingRow>

                            <SettingRow
                                label="애드온 검증 및 복구"
                                description="서버 시작 시 손상된 애드온을 확인하고 복구합니다"
                                enabled={settings.verifyRepairAddons}
                                onEnabledChange={v => update("verifyRepairAddons", v)}
                            />

                            <SettingRow
                                label="게임 종료 시 자동 재시작"
                                description="크래시나 예기치 않은 종료 발생 시 자동으로 서버를 다시 시작합니다"
                                enabled={settings.restartOnGameDestroyed}
                                onEnabledChange={v => update("restartOnGameDestroyed", v)}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
