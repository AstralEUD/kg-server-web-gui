"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Plus, Trash2, Loader2, Shield, User as UserIcon } from "lucide-react"

interface User {
    id: string
    username: string
    role: string
    createdAt: string
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [newUsername, setNewUsername] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [newRole, setNewRole] = useState("user")
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const res = await fetch("http://localhost:3000/api/admin/users", { credentials: "include" })
            if (res.ok) {
                const data = await res.json()
                setUsers(data || [])
            }
        } catch (e) {
            console.error("Failed to fetch users", e)
        }
        setLoading(false)
    }

    const createUser = async () => {
        if (!newUsername || !newPassword) return
        setCreating(true)
        try {
            const res = await fetch("http://localhost:3000/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    username: newUsername,
                    password: newPassword,
                    role: newRole,
                }),
            })
            if (res.ok) {
                setNewUsername("")
                setNewPassword("")
                setNewRole("user")
                setDialogOpen(false)
                fetchUsers()
            }
        } catch (e) {
            console.error("Failed to create user", e)
        }
        setCreating(false)
    }

    const deleteUser = async (id: string) => {
        if (!confirm("Are you sure you want to delete this user?")) return
        try {
            const res = await fetch(`http://localhost:3000/api/admin/users/${id}`, {
                method: "DELETE",
                credentials: "include",
            })
            if (res.ok) {
                fetchUsers()
            }
        } catch (e) {
            console.error("Failed to delete user", e)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                            User Management
                        </h1>
                        <p className="text-zinc-400 mt-1">Manage user accounts and permissions</p>
                    </div>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600">
                                <Plus className="w-4 h-4" /> Add User
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New User</DialogTitle>
                                <DialogDescription>Add a new user account to the system.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Username</Label>
                                    <Input
                                        value={newUsername}
                                        onChange={e => setNewUsername(e.target.value)}
                                        placeholder="Enter username"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Password</Label>
                                    <Input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Enter password"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Role</Label>
                                    <Select value={newRole} onValueChange={setNewRole}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="user">User</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                                <Button onClick={createUser} disabled={creating}>
                                    {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Create
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Users Table */}
                <Card className="bg-zinc-800/50 border-zinc-700">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" /> Users
                        </CardTitle>
                        <CardDescription>{users.length} registered users</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Username</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="w-20"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map(user => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                {user.role === "admin" ? (
                                                    <Shield className="w-4 h-4 text-amber-400" />
                                                ) : (
                                                    <UserIcon className="w-4 h-4 text-zinc-500" />
                                                )}
                                                {user.username}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                                                    {user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-zinc-400 text-sm">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => deleteUser(user.id)}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
