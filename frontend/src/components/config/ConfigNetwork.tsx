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

            <Card className="bg-zinc-800/50 border-zinc-700 md:col-span-2">
                <CardHeader><CardTitle>RCON (원격 콘솔) 설정</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>RCON 주소</Label>
                                <Input 
                                    value={config.rcon?.address || "0.0.0.0"} 
                                    onChange={e => setConfig({ ...config, rcon: { ...config.rcon!, address: e.target.value || "0.0.0.0" } })} 
                                    className="bg-zinc-900 border-zinc-700" 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>RCON 포트</Label>
                                <Input type="number" value={config.rcon?.port || 19999} onChange={e => setConfig({ ...config, rcon: { ...config.rcon!, port: parseInt(e.target.value) } })} className="bg-zinc-900 border-zinc-700" />
                            </div>
                            <div className="space-y-2">
                                <Label>RCON 비밀번호</Label>
                                <Input type="password" value={config.rcon?.password || ""} onChange={e => setConfig({ ...config, rcon: { ...config.rcon!, password: e.target.value } })} className="bg-zinc-900 border-zinc-700" />
                            </div>
                            <div className="space-y-2">
                                <Label>권한 (Permission)</Label>
                                <Input value={config.rcon?.permission || "monitor"} onChange={e => setConfig({ ...config, rcon: { ...config.rcon!, permission: e.target.value } })} placeholder="monitor, admin" className="bg-zinc-900 border-zinc-700" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>화이트리스트 (Whitelist)</Label>
                                <p className="text-xs text-zinc-400">허용할 IP를 한 줄에 하나씩 입력하세요.</p>
                                <textarea 
                                    className="w-full h-24 bg-zinc-900 border border-zinc-700 rounded-md p-3 font-mono text-sm resize-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                                    value={config.rcon?.whitelist?.join("\n") || ""}
                                    onChange={e => setConfig({ ...config, rcon: { ...config.rcon!, whitelist: e.target.value.split("\n").filter(Boolean) } })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>블랙리스트 (Blacklist)</Label>
                                <p className="text-xs text-zinc-400">차단할 IP를 한 줄에 하나씩 입력하세요.</p>
                                <textarea 
                                    className="w-full h-24 bg-zinc-900 border border-zinc-700 rounded-md p-3 font-mono text-sm resize-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                                    value={config.rcon?.blacklist?.join("\n") || ""}
                                    onChange={e => setConfig({ ...config, rcon: { ...config.rcon!, blacklist: e.target.value.split("\n").filter(Boolean) } })}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
