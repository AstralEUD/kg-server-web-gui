import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ServerConfig } from "@/types/schema"

interface Props {
    config: ServerConfig
    updateGameProps: (field: any, value: any) => void
}

export function ConfigPerformance({ config, updateGameProps }: Props) {
    return (
        <Card className="bg-zinc-800/50 border-zinc-700">
            <CardHeader><CardTitle>성능 설정</CardTitle></CardHeader>
            <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label>서버 최대 시야 거리</Label>
                        <Input type="number" value={config.game.gameProperties.serverMaxViewDistance} onChange={e => updateGameProps("serverMaxViewDistance", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                    </div>
                    <div className="space-y-2">
                        <Label>서버 최소 잔디 거리</Label>
                        <Input type="number" value={config.game.gameProperties.serverMinGrassDistance} onChange={e => updateGameProps("serverMinGrassDistance", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                    </div>
                    <div className="space-y-2">
                        <Label>네트워크 시야 거리</Label>
                        <Input type="number" value={config.game.gameProperties.networkViewDistance} onChange={e => updateGameProps("networkViewDistance", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export function ConfigVON({ config, updateGameProps }: Props) {
    return (
        <Card className="bg-zinc-800/50 border-zinc-700">
            <CardHeader><CardTitle>음성 통신 (VON) 설정</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label>UI 비활성화 (VON Disable UI)</Label>
                    <Switch checked={config.game.gameProperties.VONDisableUI} onCheckedChange={v => updateGameProps("VONDisableUI", v)} />
                </div>
                <div className="flex items-center justify-between">
                    <Label>직접 대화 UI 비활성화</Label>
                    <Switch checked={config.game.gameProperties.VONDisableDirectSpeechUI} onCheckedChange={v => updateGameProps("VONDisableDirectSpeechUI", v)} />
                </div>
                <div className="flex items-center justify-between">
                    <Label>진영 간 음성 전송 허용</Label>
                    <Switch checked={config.game.gameProperties.VONCanTransmitCrossFaction} onCheckedChange={v => updateGameProps("VONCanTransmitCrossFaction", v)} />
                </div>
            </CardContent>
        </Card>
    )
}
