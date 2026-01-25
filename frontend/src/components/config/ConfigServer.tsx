import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ServerConfig } from "@/types/schema"

interface Props {
    config: ServerConfig
    updateGame: (field: any, value: any) => void
    adminsText: string
    setAdminsText: (text: string) => void
}

export function ConfigServer({ config, updateGame, adminsText, setAdminsText }: Props) {
    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-zinc-800/50 border-zinc-700">
                <CardHeader>
                    <CardTitle>기본 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>서버 이름</Label>
                        <Input placeholder="My Reforger Server" value={config.game.name} onChange={e => updateGame("name", e.target.value)} className="bg-zinc-900 border-zinc-700" />
                    </div>
                    <div className="space-y-2">
                        <Label>서버 비밀번호</Label>
                        <Input type="password" placeholder="Optional" value={config.game.password || ""} onChange={e => updateGame("password", e.target.value)} className="bg-zinc-900 border-zinc-700" />
                    </div>
                    <div className="space-y-2">
                        <Label>관리자 비밀번호</Label>
                        <Input type="password" placeholder="Admin Password" value={config.game.passwordAdmin || ""} onChange={e => updateGame("passwordAdmin", e.target.value)} className="bg-zinc-900 border-zinc-700" />
                    </div>
                    <div className="space-y-2">
                        <Label>최대 플레이어 수</Label>
                        <Input type="number" value={config.game.maxPlayers} onChange={e => updateGame("maxPlayers", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label>서버 공개 여부</Label>
                        <Switch checked={config.game.visible} onCheckedChange={v => updateGame("visible", v)} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label>크로스 플랫폼 지원</Label>
                        <Switch checked={config.game.crossPlatform} onCheckedChange={v => updateGame("crossPlatform", v)} />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-zinc-800/50 border-zinc-700">
                <CardHeader>
                    <CardTitle>관리자 (Admins)</CardTitle>
                    <CardDescription>Steam ID 또는 GUID를 한 줄에 하나씩 입력하세요</CardDescription>
                </CardHeader>
                <CardContent>
                    <textarea
                        className="w-full h-48 bg-zinc-900 border border-zinc-700 rounded-md p-3 font-mono text-sm resize-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                        placeholder="관리자 ID 입력..."
                        value={adminsText}
                        onChange={e => setAdminsText(e.target.value)}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
