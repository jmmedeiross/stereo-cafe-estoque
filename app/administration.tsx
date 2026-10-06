'use client';
import { useEffect, useState } from 'react';
import { Download, ShieldCheck, Users, RotateCcw } from 'lucide-react';

type Person = { email: string; name: string; role: string; active: number };
export default function Administration({
  people,
  save,
  busy,
  revision,
}: {
  people: Person[];
  save: (a: any) => Promise<boolean>;
  busy: boolean;
  revision: number;
}) {
  const [backups, setBackups] = useState<any[]>([]),
    [error, setError] = useState(''),
    [form, setForm] = useState({ email: '', name: '', role: 'operator', active: true }),
    [restore, setRestore] = useState<any>(null),
    [confirmation, setConfirmation] = useState('');
  useEffect(() => {
    fetch('/api/backups')
      .then(async (r) => {
        const d: any = await r.json();
        if (!r.ok) throw Error(d.error);
        setBackups(d.backups);
      })
      .catch((e) => setError(e.message));
  }, [revision]);
  async function download(id?: string) {
    setError('');
    try {
      const r = await fetch('/api/backup' + (id ? '?id=' + encodeURIComponent(id) : ''));
      const data: any = await r.json();
      if (!r.ok) throw Error(data.error);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = 'stereo-backup-' + (id || new Date().toISOString().slice(0, 10)) + '.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function file(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setError('');
    try {
      if (selected.size > 10000000) throw Error('O arquivo excede 10 MB');
      const data = JSON.parse(await selected.text());
      if (!data.state?.items || !data.state?.lots)
        throw Error('Este arquivo não é um backup do sistema');
      setRestore(data);
      setConfirmation('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="action-grid">
        <section className="panel">
          <Users />
          <h2>Equipe da loja</h2>
          <p>
            Cada funcionário usa sua própria conta. Atendentes registram vendas, preparo, perdas e
            rotinas. Gerentes administram estoque, compras, receitas, equipe e backups.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save({ type: 'staff', ...form });
            }}
            className="admin-form"
          >
            <label>
              Nome
              <input
                required
                value={form.name}
                maxLength={150}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              E-mail da conta
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <div className="form-grid">
              <label>
                Permissão
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="operator">Atendente</option>
                  <option value="manager">Gerente</option>
                </select>
              </label>
              <label>
                Situação
                <select
                  value={String(form.active)}
                  onChange={(e) => setForm({ ...form, active: e.target.value === 'true' })}
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </label>
            </div>
            <button className="primary" disabled={busy}>
              Salvar funcionário
            </button>
          </form>
          <p className="access-note">
            Após cadastrar, o proprietário precisa liberar o mesmo e-mail no compartilhamento
            privado do site. O cadastro aqui define as permissões dentro da loja.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Funcionário</th>
                  <th>Perfil</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.email}>
                    <td>
                      {p.name}
                      <small>{p.email}</small>
                    </td>
                    <td>
                      {p.active ? (p.role === 'manager' ? 'Gerente' : 'Atendente') : 'Inativo'}
                    </td>
                    <td>
                      <button onClick={() => setForm({ ...p, active: !!p.active })}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <ShieldCheck />
          <h2>Backups e recuperação</h2>
          <p>
            Uma cópia dos saldos é criada antes da primeira operação de cada dia. Uma cópia
            adicional é criada antes de restaurar. Exporte também para um local externo à loja.
          </p>
          <button onClick={() => download()}>
            <Download size={18} />
            Exportar saldos e cadastros
          </button>
          <h3>Últimas cópias de segurança</h3>
          {backups.map((b) => (
            <div className="backup-row" key={b.id}>
              <div>
                <b>
                  {b.id.startsWith('daily-')
                    ? 'Antes da primeira operação do dia'
                    : 'Antes de uma restauração'}
                </b>
                <small>
                  {new Date(b.created_at).toLocaleString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                  })}
                </small>
              </div>
              <button onClick={() => download(b.id)}>Baixar</button>
            </div>
          ))}
          {!backups.length && <p>Nenhum backup automático registrado ainda.</p>}
          <h3>Restaurar saldos e cadastros</h3>
          <p>
            A restauração substitui os saldos e cadastros pelo arquivo escolhido. O histórico de
            auditoria e os acessos da equipe são preservados.
          </p>
          <label className="file-input">
            Selecionar backup JSON
            <input type="file" accept="application/json,.json" onChange={file} />
          </label>
          {restore && (
            <div className="restore-box">
              <p>
                Arquivo carregado: {restore.state.items.length} insumos e{' '}
                {restore.state.lots.length} lotes.
              </p>
              <label>
                Digite RESTAURAR para confirmar
                <input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
              </label>
              <button
                disabled={busy || confirmation !== 'RESTAURAR'}
                onClick={async () => {
                  if (await save({ type: 'restore', backup: restore, confirmation })) {
                    setRestore(null);
                    setConfirmation('');
                  }
                }}
              >
                <RotateCcw size={17} />
                Restaurar backup
              </button>
            </div>
          )}
        </section>
      </div>
      {error && (
        <div className="banner danger" role="alert">
          {error}
        </div>
      )}
    </>
  );
}
