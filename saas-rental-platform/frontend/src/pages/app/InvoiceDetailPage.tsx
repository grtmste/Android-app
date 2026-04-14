import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '@/lib/api';
import { Invoice } from '@/types';
import { formatCurrency, formatDate, getStatusColor, capitalize } from '@/lib/utils';
import { ArrowLeft, Printer, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import SendEmailModal from '@/components/SendEmailModal';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showEmailModal, setShowEmailModal] = useState(false);

  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.getOne(id!).then(r => r.data),
    enabled: !!id,
  });

  const markSentMutation = useMutation({
    mutationFn: () => invoicesApi.update(id!, { status: 'sent' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-48 bg-gray-100 rounded-2xl" /><div className="h-64 bg-gray-100 rounded-2xl" /></div>;
  if (!invoice) return <div className="text-center py-12 text-gray-400">Invoice not found</div>;

  const balance = parseFloat(String(invoice.total)) - parseFloat(String(invoice.amount_paid));

  const defaultMessage = `Dear ${invoice.client_name || 'Client'},\n\nPlease find attached invoice ${invoice.invoice_number} for the amount of ${formatCurrency(parseFloat(String(invoice.total)), 'EUR')}.\n\nDue date: ${formatDate(invoice.due_date)}\n\nPlease don't hesitate to contact us if you have any questions.\n\nBest regards,\nStereo Sound OÜ`;

  return (
    <div className="max-w-3xl space-y-4 print-wrapper">
      <div className="flex items-center justify-between no-print">
        <Link to="/app/invoices" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-500 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </Link>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 text-sm border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Printer className="w-4 h-4" /> Print / PDF
          </button>
          <button
            onClick={() => setShowEmailModal(true)}
            className="inline-flex items-center gap-1.5 text-sm bg-primary-500 text-white px-3 py-2 rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Mail className="w-4 h-4" /> Send to Client
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">S</span>
                </div>
                <span className="font-bold text-xl text-primary-500">Stereo Sound OÜ</span>
              </div>
              <p className="text-sm text-gray-500">Tartu mnt 84, 10112 Tallinn, Estonia</p>
              <p className="text-sm text-gray-500">reg. 12345678 · VAT EE123456789</p>
              <p className="text-sm text-gray-500">billing@stereosound.ee</p>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
              <p className="text-lg font-semibold text-primary-500 mt-1">{invoice.invoice_number}</p>
              <span className={`inline-block text-xs px-3 py-1 rounded-full font-medium mt-2 ${getStatusColor(invoice.status)}`}>{capitalize(invoice.status)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bill To</p>
              <p className="font-semibold text-gray-900">{invoice.client_name || '—'}</p>
              {invoice.client_company && <p className="text-gray-600">{invoice.client_company}</p>}
              {invoice.client_email && <p className="text-gray-500 text-sm">{invoice.client_email}</p>}
            </div>
            <div className="text-right space-y-1 text-sm">
              <div className="flex justify-end gap-8">
                <span className="text-gray-500">Issue Date:</span>
                <span className="font-medium">{formatDate(invoice.issue_date)}</span>
              </div>
              {invoice.due_date && (
                <div className="flex justify-end gap-8">
                  <span className="text-gray-500">Due Date:</span>
                  <span className={`font-medium ${invoice.status === 'overdue' ? 'text-red-500' : ''}`}>{formatDate(invoice.due_date)}</span>
                </div>
              )}
              {invoice.project_name && (
                <div className="flex justify-end gap-8">
                  <span className="text-gray-500">Project:</span>
                  <span className="font-medium">{invoice.project_name}</span>
                </div>
              )}
            </div>
          </div>

          <table className="w-full mb-6">
            <thead>
              <tr className="bg-gray-50 border-t border-b border-gray-200">
                {['Description', 'Type', 'Qty', 'Unit Price', 'Total'].map(h => (
                  <th key={h} className={`text-xs font-semibold text-gray-600 uppercase tracking-wider py-3 ${h === 'Description' ? 'text-left pl-4' : 'text-right pr-4'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(invoice.items || []).map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pl-4 text-sm text-gray-900">{item.description}</td>
                  <td className="py-3 pr-4 text-sm text-gray-500 text-right capitalize">{item.type}</td>
                  <td className="py-3 pr-4 text-sm text-gray-900 text-right">{item.quantity}</td>
                  <td className="py-3 pr-4 text-sm text-gray-900 text-right">{formatCurrency(parseFloat(String(item.unit_price)), 'EUR')}</td>
                  <td className="py-3 pr-4 text-sm font-medium text-gray-900 text-right">{formatCurrency(parseFloat(String(item.total)), 'EUR')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(parseFloat(String(invoice.subtotal)), 'EUR')}</span></div>
              <div className="flex justify-between text-gray-600"><span>VAT ({invoice.tax_rate}%)</span><span>{formatCurrency(parseFloat(String(invoice.tax_amount)), 'EUR')}</span></div>
              <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-200">
                <span>Total</span><span>{formatCurrency(parseFloat(String(invoice.total)), 'EUR')}</span>
              </div>
              {parseFloat(String(invoice.amount_paid)) > 0 && (
                <>
                  <div className="flex justify-between text-green-600"><span>Amount Paid</span><span>-{formatCurrency(parseFloat(String(invoice.amount_paid)), 'EUR')}</span></div>
                  <div className="flex justify-between font-bold text-lg pt-1 border-t border-gray-200" style={{ color: balance > 0 ? '#ef4444' : '#22c55e' }}>
                    <span>Balance Due</span><span>{formatCurrency(balance, 'EUR')}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {invoice.notes && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
              <p className="text-sm text-gray-600">{invoice.notes}</p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">Stereo Sound OÜ · Tartu mnt 84, 10112 Tallinn, Estonia · reg. 12345678 · VAT EE123456789</p>
          </div>
        </CardContent>
      </Card>

      <SendEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        toEmail={invoice.client_email || ''}
        defaultSubject={`Invoice ${invoice.invoice_number} from Stereo Sound OÜ`}
        defaultMessage={defaultMessage}
        documentType="invoice"
        documentId={id!}
        onSent={() => {
          if (invoice.status === 'draft') {
            markSentMutation.mutate();
          }
        }}
      />
    </div>
  );
}
