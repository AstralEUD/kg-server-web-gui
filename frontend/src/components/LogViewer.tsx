import { useState, useEffect, useRef } from 'react';
import { Trash2, Terminal, Send, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiGet, apiPost, apiDelete } from "@/lib/api"

interface LogViewerProps {
    serverId?: string
}

export default function LogViewer({ serverId = "default" }: LogViewerProps) {
    const [logs, setLogs] = useState<string[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const [command, setCommand] = useState("");
    const [sending, setSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [history, setHistory] = useState<string[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const fetchLogs = async () => {
        try {
            const data = await apiGet<any[]>("/api/logs");
            setLogs(prev => {
                return data.map((l: any) => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level}] ${l.message}`);
            });
        } catch (e) {
            console.error("Failed to fetch logs", e);
        }
    };

    const clearLogs = async () => {
        try {
            await apiDelete("/api/logs");
            setLogs([]);
        } catch (e) {
            console.error(e);
        }
    };

    const sendCommand = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!command.trim()) return;

        setSending(true);
        const cmd = command;
        setCommand(""); // Optimistic clear

        // Add to local logs immediately for feedback
        setLogs(prev => [...prev, `> ${cmd}`]);

        try {
            const data = await apiPost<any>(`/api/servers/${serverId}/rcon`, { command: cmd });

            fetchCommandHistory();
            if (data.response) {
                setLogs(prev => [...prev, data.response]);
            } else {
                setLogs(prev => [...prev, "[RCON] Command sent."]);
            }
        } catch (e) {
            setLogs(prev => [...prev, `[Error] Failed to send command.`]);
        }
        setSending(false);
        setHistoryIndex(-1);
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowUp") {
            e.preventDefault();
            const nextIndex = historyIndex + 1;
            if (nextIndex < history.length) {
                setHistoryIndex(nextIndex);
                setCommand(history[nextIndex]);
            }
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            const nextIndex = historyIndex - 1;
            if (nextIndex >= 0) {
                setHistoryIndex(nextIndex);
                setCommand(history[nextIndex]);
            } else {
                setHistoryIndex(-1);
                setCommand("");
            }
        } else if (e.key === "Escape") {
            setShowHistory(false);
        }
    };

    const fetchCommandHistory = async () => {
        try {
            const data = await apiGet<string[]>("/api/commands/history");
            setHistory(data);
        } catch (e) { }
    };

    useEffect(() => {
        fetchLogs();
        fetchCommandHistory();
        const interval = setInterval(fetchLogs, 2000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (autoScroll && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    return (
        <div className="bg-zinc-800/50 rounded-lg p-4 h-[600px] flex flex-col border border-zinc-700">
            <div className="flex justify-between items-center mb-4 gap-4">
                <h3 className="text-zinc-400 font-semibold flex items-center gap-2 whitespace-nowrap">
                    <Terminal className="w-4 h-4" /> Server Console ({serverId})
                </h3>
                <div className="flex-1 max-w-sm">
                    <Input
                        placeholder="로그 검색..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="h-8 bg-zinc-900/50 border-zinc-700 text-xs"
                    />
                </div>
                <div className="flex items-center gap-4">
                    <label className="flex items-center text-xs text-zinc-400 cursor-pointer hover:text-white transition-colors">
                        <input
                            type="checkbox"
                            checked={autoScroll}
                            onChange={(e) => setAutoScroll(e.target.checked)}
                            className="mr-2 accent-blue-500"
                        />
                        Auto-scroll
                    </label>
                    <button
                        onClick={clearLogs}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-900/20 flex items-center gap-1"
                    >
                        <Trash2 className="w-3 h-3" /> Clear
                    </button>
                </div>
            </div>

            {/* Log Window */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto font-mono text-xs text-zinc-300 space-y-1 bg-black/40 p-3 rounded-t border border-zinc-800 border-b-0 max-h-[500px]"
            >
                {logs.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-zinc-600 italic">No logs available...</div>
                ) : (
                    logs.filter(log => log.toLowerCase().includes(searchTerm.toLowerCase())).map((log, i) => (
                        <div key={i} className="whitespace-pre-wrap break-words border-b border-zinc-900/50 pb-0.5 pl-1">
                            {log}
                        </div>
                    ))
                )}
            </div>

            {/* Command Input */}
            <form onSubmit={sendCommand} className="flex gap-0 bg-black/40 rounded-b border border-zinc-800 border-t-0 p-2 relative">
                <div className="flex items-center px-2 text-zinc-500 font-mono text-sm">{'>'}</div>
                <input
                    type="text"
                    value={command}
                    onChange={(e) => {
                        setCommand(e.target.value);
                        if (historyIndex !== -1) setHistoryIndex(-1);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowHistory(true)}
                    placeholder="Enter RCON command..."
                    className="flex-1 bg-transparent border-none outline-none text-zinc-200 font-mono text-sm placeholder:text-zinc-600 focus:ring-0"
                    disabled={sending}
                />

                {showHistory && history.length > 0 && (
                    <div className="absolute bottom-full left-0 w-full bg-zinc-900 border border-zinc-700 rounded-t shadow-xl max-h-32 overflow-y-auto z-10">
                        {history.map((h, i) => (
                            <div
                                key={i}
                                className="px-3 py-1.5 text-xs font-mono text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer border-b border-zinc-800"
                                onClick={() => {
                                    setCommand(h);
                                    setShowHistory(false);
                                }}
                            >
                                {h}
                            </div>
                        ))}
                    </div>
                )}

                <Button type="button" variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="h-6 w-6 p-0 hover:bg-zinc-800">
                    <History className="w-3 h-3 text-zinc-500" />
                </Button>
                <Button type="submit" size="sm" variant="ghost" disabled={sending} className="h-6 w-6 p-0 hover:bg-zinc-800">
                    <Send className="w-3 h-3 text-zinc-400" />
                </Button>
            </form>
        </div>
    );
}
