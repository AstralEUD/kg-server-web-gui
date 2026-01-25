import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Edit2, Check, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface Props {
    header: Record<string, any>
    updateHeader: (header: Record<string, any>) => void
}

type ValueType = "string" | "number" | "boolean"

export function MissionHeaderEditor({ header, updateHeader }: Props) {
    const [newKey, setNewKey] = useState("")
    const [newValue, setNewValue] = useState("")
    const [newType, setNewType] = useState<ValueType>("string")
    const [editingKey, setEditingKey] = useState<string | null>(null)

    // Convert object to array for easier rendering
    const entries = Object.entries(header || {})

    const handleAdd = () => {
        if (!newKey.trim()) return

        let val: any = newValue
        if (newType === "number") val = Number(newValue)
        if (newType === "boolean") val = newValue === "true"

        updateHeader({ ...header, [newKey]: val })
        setNewKey("")
        setNewValue("")
    }

    const handleDelete = (key: string) => {
        const next = { ...header }
        delete next[key]
        updateHeader(next)
    }

    const inferType = (val: any): ValueType => {
        if (typeof val === "number") return "number"
        if (typeof val === "boolean") return "boolean"
        return "string"
    }

    return (
        <Card className="bg-zinc-800/50 border-zinc-700 mt-6 md:col-span-2">
            <CardHeader>
                <CardTitle>미션 헤더 (Mission Header)</CardTitle>
                <CardDescription>
                    미션 스크립트에 전달할 사용자 정의 변수를 설정합니다. (예: m_iPlayerCount, m_sCOE_DefaultFactionKey 등)
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Add New */}
                <div className="flex gap-2 items-end bg-zinc-900/50 p-3 rounded-md border border-zinc-800">
                    <div className="space-y-1 flex-1">
                        <Label className="text-xs text-zinc-400">키 (Key)</Label>
                        <Input 
                            placeholder="m_sName" 
                            value={newKey} 
                            onChange={e => setNewKey(e.target.value)} 
                            className="bg-zinc-900 border-zinc-700 h-8 text-sm"
                        />
                    </div>
                    <div className="space-y-1 w-24">
                        <Label className="text-xs text-zinc-400">타입</Label>
                        <Select value={newType} onValueChange={(v: ValueType) => setNewType(v)}>
                            <SelectTrigger className="h-8 bg-zinc-900 border-zinc-700 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="string">String</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="boolean">Boolean</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1 flex-1">
                        <Label className="text-xs text-zinc-400">값 (Value)</Label>
                        {newType === "boolean" ? (
                            <Select value={newValue} onValueChange={setNewValue}>
                                <SelectTrigger className="h-8 bg-zinc-900 border-zinc-700 text-xs">
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="true">True</SelectItem>
                                    <SelectItem value="false">False</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input 
                                placeholder="Value" 
                                type={newType === "number" ? "number" : "text"}
                                value={newValue} 
                                onChange={e => setNewValue(e.target.value)} 
                                className="bg-zinc-900 border-zinc-700 h-8 text-sm"
                            />
                        )}
                    </div>
                    <Button size="sm" onClick={handleAdd} className="h-8 bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>

                {/* List */}
                <div className="rounded-md border border-zinc-700 bg-zinc-900/30 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-zinc-700 hover:bg-transparent">
                                <TableHead className="w-[40%] text-zinc-400 h-8">Key</TableHead>
                                <TableHead className="w-[15%] text-zinc-400 h-8">Type</TableHead>
                                <TableHead className="text-zinc-400 h-8">Value</TableHead>
                                <TableHead className="w-[50px] text-right h-8"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-zinc-500 py-4 text-xs">
                                        설정된 헤더 값이 없습니다.
                                    </TableCell>
                                </TableRow>
                            )}
                            {entries.map(([key, value]) => (
                                <TableRow key={key} className="border-zinc-800 hover:bg-zinc-800/30">
                                    <TableCell className="font-mono text-xs text-amber-500 py-2">{key}</TableCell>
                                    <TableCell className="text-xs text-zinc-500 py-2">{inferType(value)}</TableCell>
                                    <TableCell className="text-sm font-medium py-2">
                                        {typeof value === "boolean" ? (
                                            value ? <span className="text-green-400">true</span> : <span className="text-red-400">false</span>
                                        ) : (
                                            <span>{String(value)}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-2 text-right">
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-950/30"
                                            onClick={() => handleDelete(key)}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
