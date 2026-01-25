import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"

interface Props {
    rawConfig: string
    setRawConfig: (val: string) => void
    validateRawConfig: () => void
}

export function ConfigRaw({ rawConfig, setRawConfig, validateRawConfig }: Props) {
    return (
        <Card className="bg-zinc-800/50 border-zinc-700 h-full">
            <CardHeader>
                <CardTitle className="text-amber-500">Raw Config Editor</CardTitle>
                <CardDescription>
                    server.json 파일을 직접 편집합니다. 문법 오류 시 서버가 시작되지 않을 수 있습니다.
                </CardDescription>
                <div className="flex justify-end mt-2">
                    <Button size="sm" variant="outline" onClick={validateRawConfig} className="gap-2 border-amber-500/50 text-amber-500 hover:bg-amber-500/10">
                        <CheckCircle2 className="w-4 h-4" /> 구성 검증 (Schema Check)
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <textarea
                    className="w-full h-[600px] bg-zinc-950 border border-zinc-700 rounded-md p-4 font-mono text-sm text-green-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                    value={rawConfig}
                    onChange={(e) => setRawConfig(e.target.value)}
                    spellCheck={false}
                />
            </CardContent>
        </Card>
    )
}
