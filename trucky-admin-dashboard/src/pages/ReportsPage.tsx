import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { reportsApi } from '../api';
import { downloadReport } from '../api/client';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { downloadBlob, todayISO, monthISO } from '../lib/utils';
import type { ReportType } from '../types';

export function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [date, setDate] = useState(todayISO());
  const [month, setMonth] = useState(monthISO());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preview, setPreview] = useState<unknown>(null);

  const params = (): Record<string, string> => {
    if (reportType === 'daily') return { date };
    if (reportType === 'monthly') return { month };
    return { startDate, endDate };
  };

  const { refetch, isFetching } = useQuery({
    queryKey: ['reports', reportType, date, month, startDate, endDate],
    queryFn: async () => {
      const data = await reportsApi.preview(reportType, params());
      setPreview(data);
      return data;
    },
    enabled: false,
  });

  async function handleExport(format: 'pdf' | 'csv') {
    const blob = await downloadReport(reportType, params(), format);
    const ext = format === 'pdf' ? 'pdf' : 'csv';
    const name = `trucky-${reportType}-report.${ext}`;
    downloadBlob(blob, name);
  }

  return (
    <div>
      <PageHeader title="Reports" description="Generate and export fleet reports" />

      <Card title="Report settings">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Report type"
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value as ReportType);
              setPreview(null);
            }}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'custom', label: 'Custom range' },
              { value: 'fuel', label: 'Fuel' },
              { value: 'trips', label: 'Trips' },
            ]}
          />

          {reportType === 'daily' && (
            <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          )}
          {reportType === 'monthly' && (
            <Input label="Month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          )}
          {(reportType === 'custom' || reportType === 'fuel' || reportType === 'trips') && (
            <>
              <Input label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <Input label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={() => refetch()} disabled={isFetching}>
            Preview JSON
          </Button>
          <Button variant="secondary" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          <Button variant="secondary" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4" /> Download CSV
          </Button>
        </div>
      </Card>

      {preview !== null && (
        <Card title="Preview" className="mt-6">
          <pre className="max-h-96 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
            {JSON.stringify(preview, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
