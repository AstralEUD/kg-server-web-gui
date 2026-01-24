"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown, Package, ExternalLink } from "lucide-react"

interface DependencyNode {
    id: string
    name: string
    version?: string
    dependencies?: DependencyNode[]
}

interface TreeItemProps {
    node: DependencyNode
    level: number
}

function TreeItem({ node, level }: TreeItemProps) {
    const [isOpen, setIsOpen] = useState(true)
    const hasDeps = node.dependencies && node.dependencies.length > 0

    return (
        <div className="select-none">
            <div
                className={`flex items-center gap-2 py-1 px-2 rounded-md transition-colors cursor-pointer
                    ${level === 0 ? 'bg-zinc-800/40' : 'hover:bg-zinc-800/20'}`}
                onClick={() => hasDeps && setIsOpen(!isOpen)}
            >
                <div className="w-4 h-4 flex items-center justify-center">
                    {hasDeps ? (
                        isOpen ? <ChevronDown className="w-3 h-3 text-zinc-500" /> : <ChevronRight className="w-3 h-3 text-zinc-500" />
                    ) : null}
                </div>
                <Package className={`w-3.5 h-3.5 ${level === 0 ? 'text-amber-500' : 'text-zinc-400'}`} />
                <span className={`text-xs font-medium ${level === 0 ? 'text-zinc-100' : 'text-zinc-300'}`}>
                    {node.name}
                </span>
                {node.version && (
                    <span className="text-[10px] text-zinc-500 font-mono">v{node.version}</span>
                )}
                <a
                    href={`https://reforger.armaplatform.com/workshop/mod/${node.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-700 rounded transition-all"
                    onClick={(e) => e.stopPropagation()}
                >
                    <ExternalLink className="w-3 h-3 text-zinc-600" />
                </a>
            </div>

            {hasDeps && isOpen && (
                <div className="ml-4 border-l border-zinc-700/50 mt-1 pl-1">
                    {node.dependencies!.map((dep, idx) => (
                        <TreeItem key={`${dep.id}-${idx}`} node={dep} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default function DependencyTree({ root }: { root: DependencyNode }) {
    return (
        <div className="space-y-1 p-2 bg-black/20 rounded-lg border border-zinc-800/50 max-h-[400px] overflow-y-auto custom-scrollbar">
            <TreeItem node={root} level={0} />
        </div>
    )
}
