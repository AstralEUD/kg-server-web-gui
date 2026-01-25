import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ServerConfig } from "@/types/schema"

interface Props {
    config: ServerConfig
    setConfig: (config: ServerConfig) => void
    updateGame: (field: any, value: any) => void
}

export function ConfigNetwork({ config, setConfig, updateGame }: Props) {
    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-zinc-800/50 border-zinc-700">
                <CardHeader><CardTitle>바인딩 설정</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>바인드 주소 (Bind Address)</Label>
                        <Input value={config.bindAddress || ""} onChange={e => setConfig({ ...config, bindAddress: e.target.value })} placeholder="0.0.0.0" className="bg-zinc-900 border-zinc-700" />
                    </div>
                    <div className="space-y-2">
                        <Label>바인드 포트</Label>
                        <Input type="number" value={config.bindPort} onChange={e => setConfig({ ...config, bindPort: parseInt(e.target.value) })} className="bg-zinc-900 border-zinc-700" />
                    </div>
                    <div className="space-y-2">
                        <Label>공개 주소 (Public Address)</Label>
                        <Input value={config.publicAddress || ""} onChange={e => setConfig({ ...config, publicAddress: e.target.value })} placeholder="자동 감지" className="bg-zinc-900 border-zinc-700" />
                    </div>
                    <div className="space-y-2">
                        <Label>공개 포트</Label>
                        <Input type="number" value={config.publicPort} onChange={e => setConfig({ ...config, publicPort: parseInt(e.target.value) })} className="bg-zinc-900 border-zinc-700" />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-zinc-800/50 border-zinc-700">
                <CardHeader><CardTitle>A2S (스팀 쿼리)</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>A2S 주소</Label>
                        <Input value={config.a2s?.address || ""} onChange={e => setConfig({ ...config, a2s: { ...config.a2s, address: e.target.value } })} placeholder="0.0.0.0" className="bg-zinc-900 border-zinc-700" />
                    </div>
                    <div className="space-y-2">
                        <Label>A2S 포트</Label>
                        <Input type="number" value={config.a2s?.port} onChange={e => setConfig({ ...config, a2s: { ...config.a2s, port: parseInt(e.target.value) } })} className="bg-zinc-900 border-zinc-700" />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-zinc-800/50 border-zinc-700">
                <CardHeader><CardTitle>RCON 설정</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>RCON 비밀번호</Label>
                        <Input type="password" value={config.game.rconPassword || ""} onChange={e => updateGame("rconPassword", e.target.value)} placeholder="RCON Password" className="bg-zinc-900 border-zinc-700" />
                    </div>
                    <div className="space-y-2">
                        <Label>RCON 포트</Label>
                        <Input type="number" value={config.game.rconPort} onChange={e => updateGame("rconPort", parseInt(e.target.value))} className="bg-zinc-900 border-zinc-700" />
                    </div>
                    <p className="text-xs text-zinc-500">주의: RCON 비밀번호는 관리자 기능(콘솔, 맵 변경 등)에 필수적입니다.</p>
                </CardContent>
            </Card>
        </div>
    )
}
