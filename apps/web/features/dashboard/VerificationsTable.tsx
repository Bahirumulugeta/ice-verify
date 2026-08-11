'use client';

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingState';
import { TBody, TD, THead, TH, TR, Table } from '@/components/ui/Table';
import { useVerifications } from '@/hooks/useVerifications';
import { formatCurrency, formatDate } from '@/lib/cn';
import { PROVIDERS, VERIFICATION_STATUSES } from '@/lib/constants';
import type { VerificationData } from '@/services/api';
import { cn } from '@/lib/cn';

const columns: ColumnDef<VerificationData>[] = [
  {
    accessorKey: 'reference',
    header: 'Reference',
    cell: ({ row }) => (
      <span className="font-mono text-sm text-ice-dark">{row.original.reference}</span>
    ),
  },
  {
    accessorKey: 'provider',
    header: 'Provider',
    cell: ({ getValue }) => <span className="capitalize">{String(getValue())}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
  },
  {
    id: 'amount',
    accessorFn: (row) => row.actualAmount ?? row.amount,
    header: 'Amount',
    cell: ({ row }) => {
      const amount = row.original.actualAmount ?? row.original.amount;
      if (amount === undefined) return '—';
      return formatCurrency(amount, row.original.currency ?? 'ETB');
    },
  },
  {
    accessorKey: 'currency',
    header: 'Currency',
    cell: ({ getValue }) => String(getValue() ?? 'ETB'),
  },
  {
    id: 'risk',
    accessorFn: (row) => row.risk?.level ?? '—',
    header: 'Risk',
    cell: ({ row }) => {
      const level = row.original.risk?.level;
      if (!level) return <span className="text-ink-subtle">—</span>;
      const variant =
        level === 'LOW' ? 'success' : level === 'MEDIUM' ? 'warning' : 'danger';
      return <Badge variant={variant}>{level}</Badge>;
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ getValue }) => {
      const value = getValue() as string | undefined;
      return value ? formatDate(value) : '—';
    },
  },
];

export function VerificationsTable() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);

  const pageSize = 10;
  const query = useVerifications({
    limit: pageSize,
    offset: (page - 1) * pageSize,
    search: search || undefined,
    status: statusFilter || undefined,
    provider: providerFilter || undefined,
  });

  const table = useReactTable({
    data: query.data?.items ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'All statuses' },
      ...VERIFICATION_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') })),
    ],
    [],
  );

  const providerOptions = useMemo(
    () => [
      { value: '', label: 'All providers' },
      ...PROVIDERS.map((p) => ({ value: p.name, label: p.displayName })),
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Search"
          placeholder="Reference or ID…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          label="Status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          options={statusOptions}
        />
        <Select
          label="Provider"
          value={providerFilter}
          onChange={(e) => {
            setProviderFilter(e.target.value);
            setPage(1);
          }}
          options={providerOptions}
        />
      </div>

      {query.isLoading && <LoadingSkeleton rows={8} />}
      {query.isError && (
        <ErrorState
          message={query.error?.message ?? 'Failed to load verifications'}
          onRetry={() => query.refetch()}
        />
      )}
      {!query.isLoading && !query.isError && query.data?.items.length === 0 && (
        <EmptyState
          title="No verifications found"
          description="Try adjusting filters or create a new verification in the playground."
          action={{ label: 'Go to playground', href: '/dashboard/playground' }}
        />
      )}
      {query.data && query.data.items.length > 0 && (
        <>
          <Table>
            <THead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TR key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TH key={header.id}>
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className={cn(
                            'inline-flex items-center gap-1',
                            header.column.getCanSort() && 'cursor-pointer hover:text-ink',
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: ' ↑',
                            desc: ' ↓',
                          }[header.column.getIsSorted() as string] ?? null}
                        </button>
                      )}
                    </TH>
                  ))}
                </TR>
              ))}
            </THead>
            <TBody>
              {table.getRowModel().rows.map((row) => (
                <TR
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() =>
                    router.push(`/dashboard/verifications/${row.original.verificationId}`)
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TD key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TD>
                  ))}
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={query.data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
