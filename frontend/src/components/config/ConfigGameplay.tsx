import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ServerConfig } from "@/types/schema"
import { MissionHeaderEditor } from "./MissionHeaderEditor"

interface Props {
    config: ServerConfig
    updateGame: (field: any, value: any) => void
    updateGameProps: (field: any, value: any) => void
    updateOperating: (field: any, value: any) => void
}

export function ConfigGameplay({ config, updateGame, updateGameProps, updateOperating }: Props) {
    // Helper accessors
    const operating = config.operating || { disableAI: false, aiLimit: -1 };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-zinc-800/50 border-zinc-700">
                <CardHeader><CardTitle>게임 플레이 설정</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label>모드 필수 적용 (Mods Required by Default)</Label>
                        <Switch checked={config.game.modsRequiredByDefault} onCheckedChange={v => updateGame("modsRequiredByDefault", v)} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label>BattlEye 활성화</Label>
                        <Switch checked={config.game.gameProperties.battlEye} onCheckedChange={v => updateGameProps("battlEye", v)} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label>3인칭 시점 비활성화</Label>
                        <Switch checked={config.game.gameProperties.disableThirdPerson} onCheckedChange={v => updateGameProps("disableThirdPerson", v)} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label>빠른 검증 (Fast Validation)</Label>
                        <Switch checked={config.game.gameProperties.fastValidation} onCheckedChange={v => updateGameProps("fastValidation", v)} />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-zinc-800/50 border-zinc-700">
                <CardHeader><CardTitle>AI 및 봇 설정</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label>AI 비활성화</Label>
                        <Switch checked={operating.disableAI} onCheckedChange={v => updateOperating("disableAI", v)} />
                    </div>
                    <div className="space-y-2">
                        <Label>AI 제한 (-1 = 기본값)</Label>
                        <Input type="number" value={operating.aiLimit} onChange={e => updateOperating("aiLimit", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                    </div>
                </CardContent>
            </Card>

            {/* Mission Header Editor */}
            <MissionHeaderEditor 
                header={config.game.gameProperties.missionHeader || {}} 
                updateHeader={(newHeader) => updateGameProps("missionHeader", newHeader)} 
            />
        </div>
    )
}
