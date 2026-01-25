import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ServerConfig } from "@/types/schema"

interface Props {
    config: ServerConfig
    setConfig: (config: ServerConfig) => void
    updateOperating: (field: any, value: any) => void
}

export function ConfigOperating({ config, setConfig, updateOperating }: Props) {
    // Safely access operating config
    const operating = config.operating || {
        lobbyPlayerSynchronise: true,
        playerSaveTime: 300,
        aiLimit: -1,
        slotReservationTimeout: 60,
        disableServerShutdown: true,
        disableCrashReporter: false,
        disableAI: false,
        joinQueue: { maxSize: 0 }
    };

    return (
        <Card className="bg-zinc-800/50 border-zinc-700">
            <CardHeader><CardTitle>운영 및 저장 설정</CardTitle></CardHeader>
            <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>로비 플레이어 동기화</Label>
                            <Switch checked={operating.lobbyPlayerSynchronise} onCheckedChange={v => updateOperating("lobbyPlayerSynchronise", v)} />
                        </div>
                        <div className="space-y-2">
                            <Label>자동 저장 간격 (분)</Label>
                            <Input type="number"
                                value={config.game.gameProperties.persistence?.autoSaveInterval || 10}
                                onChange={e => setConfig({ ...config, game: { ...config.game, gameProperties: { ...config.game.gameProperties, persistence: { autoSaveInterval: parseInt(e.target.value) } } } })}
                                className="bg-zinc-900 border-zinc-700"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>플레이어 저장 시간 (초)</Label>
                            <Input type="number" value={operating.playerSaveTime} onChange={e => updateOperating("playerSaveTime", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>서버 종료 버튼 비활성화</Label>
                            <Switch checked={operating.disableServerShutdown} onCheckedChange={v => updateOperating("disableServerShutdown", v)} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>크래시 리포터 비활성화</Label>
                            <Switch checked={operating.disableCrashReporter} onCheckedChange={v => updateOperating("disableCrashReporter", v)} />
                        </div>
                        <div className="space-y-2">
                            <Label>슬롯 예약 타임아웃 (초)</Label>
                            <Input type="number" value={operating.slotReservationTimeout} onChange={e => updateOperating("slotReservationTimeout", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                        </div>
                        <div className="space-y-2">
                            <Label>접속 대기열 최대 크기</Label>
                            <Input type="number"
                                value={operating.joinQueue?.maxSize || 0}
                                onChange={e => updateOperating("joinQueue", { maxSize: parseInt(e.target.value) })}
                                className="bg-zinc-900 border-zinc-700"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-6 border-t border-zinc-700 pt-6">
                    <div className="space-y-2">
                        <Label>Navmesh Streaming 비활성화 목록 (Disable Navmesh Streaming)</Label>
                        <p className="text-xs text-zinc-400">네비메시 스트리밍을 비활성화할 항목을 한 줄에 하나씩 입력하세요. (대규모 작전 시 AI 동작 개선에 도움될 수 있음)</p>
                        <textarea
                            className="w-full h-24 bg-zinc-900 border border-zinc-700 rounded-md p-3 font-mono text-sm resize-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                            placeholder="항목 입력..."
                            value={operating.disableNavmeshStreaming?.join("\n") || ""}
                            onChange={e => updateOperating("disableNavmeshStreaming", e.target.value.split("\n").filter(Boolean))}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
