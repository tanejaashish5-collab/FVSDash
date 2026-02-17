import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Users } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminPage() {
  const { authHeaders } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/clients`, { headers: authHeaders })
      .then(res => setClients(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authHeaders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="admin-page" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-sm bg-indigo-500/10 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Admin Panel
          </h1>
          <p className="text-xs text-zinc-500">Manage clients and impersonation controls</p>
        </div>
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-zinc-400" />
            <CardTitle className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              All Clients ({clients.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Client</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Contact</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Plan</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">ID</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map(c => (
                <TableRow key={c.id} className="border-zinc-800 hover:bg-white/[0.02]">
                  <TableCell>
                    <p className="text-sm text-white font-medium">{c.name}</p>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-xs text-zinc-300">{c.primaryContactName}</p>
                      <p className="text-xs text-zinc-500">{c.primaryContactEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                      {c.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-zinc-500">{c.id}</span>
                  </TableCell>
                  <TableCell>
                    <button
                      data-testid={`impersonate-${c.id}`}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Impersonate
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
