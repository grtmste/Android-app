import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { quotesApi } from '@/lib/api';
import { Quote } from '@/types';
import { formatCurrency, formatDate, getStatusColor, capitalize } from '@/lib/utils';
import { ArrowLeft, Printer, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: quote, isLoading } = useQuery<Quote>({
    queryKey: ['quote', id],
    queryFn: () => quotesApi.getOne(id!).then(r => r.data),
    enabled: !!id,
  });

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-48 bg-gray-100 rounded-2xl" /><div className="h-64 bg-gray-100 rounded-2xl" /></div>;
  if (!quote) return <div className="text-center py-12 text-gray-400">Quote not found</div>;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/app/quotes" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-500 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Quotes
        </Link>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 text-sm border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Printer className="w-4 h-4" /> Print / PDF
          </button>
          <button className="inline-flex items-center gap-1.5 text-sm bg-primary-500 text-white px-3 py-2 rounded-lg hover:bg-primary-600 transition-colors">
            <Mail className="w-4 h-4" /> Send to Client
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="p-8 print:p-0">
          {/* Quote Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">R</span>
                </div>
                <span className="font-bold text-xl text-primary-500">RentPro</span>
              </div>
              <p className="text-sm text-gray-500">123 Production Way, New York, NY 10001</p>
              <p className="text-sm text-gray-500">billing@rentpro.com</p>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold text-gray-900">QUOTE</h1>
              <p className="text-lg font-semibold text-primary-500 mt-1">{quote.quote_number}</p>
              <span className={`inline-block text-xs px-3 py-1 rounded-full font-medium mt-2 ${getStatusColor(quote.status)}`}>{capitalize(quote.status)}</span>
            </div>
          </div>

          {/* Bill To */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quote For</p>
              <p className="font-semibold text-gray-900">{quote.client_name || 'Client Name'}</p>
              {quote.client_company && <p className="text-gray-600">{quote.client_company}</p>}
              {quote.client_email && <p className="text-gray-500 text-sm">{quote.client_email}</p>}
            </div>
            <div className="text-right">
              <div className="space-y-1 text-sm">
                <div className="flex justify-end gap-8">
                  <span className="text-gray-500">Issue Date:</span>
                  <span className="font-medium">{formatDate(quote.created_at)}</span>
                </div>
                {quote.valid_until && (
                  <div className="flex justify-end gap-8">
                    <span className="text-gray-500">Valid Until:</span>
                    <span className="font-medium">{formatDate(quote.valid_until)}</span>
                  </div>
                )}
                {quote.project_name && (
                  <div className="flex justify-end gap-8">
                    <span className="text-gray-500">Project:</span>
                    <span className="font-medium">{quote.project_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Line Items */}
          <table className="w-full mb-6">
            <thead>
              <tr className="bg-gray-50 border-t border-b border-gray-200">
                {['Description', 'Type', 'Qty', 'Unit Price', 'Total'].map(h => (
                  <th key={h} className={`text-xs font-semibold text-gray-600 uppercase tracking-wider py-3 ${h === 'Description' ? 'text-left pl-4' : 'text-right pr-4'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(quote.items || []).map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pl-4 text-sm text-gray-900">{item.description}</td>
                  <td className="py-3 pr-4 text-sm text-gray-500 text-right capitalize">{item.type}</td>
                  <td className="py-3 pr-4 text-sm text-gray-900 text-right">{item.quantity}</td>
                  <td className="py-3 pr-4 text-sm text-gray-900 text-right">{formatCurrency(parseFloat(String(item.unit_price)))}</td>
                  <td className="py-3 pr-4 text-sm font-medium text-gray-900 text-right">{formatCurrency(parseFloat(String(item.total)))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(parseFloat(String(quote.subtotal)))}</span></div>
              <div className="flex justify-between text-gray-600"><span>Tax ({quote.tax_rate}%)</span><span>{formatCurrency(parseFloat(String(quote.tax_amount)))}</span></div>
              <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-200">
                <span>Total</span><span className="text-primary-500">{formatCurrency(parseFloat(String(quote.total)))}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
              <p className="text-sm text-gray-600">{quote.notes}</p>
            </div>
          )}
          {quote.terms && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Terms & Conditions</p>
              <p className="text-sm text-gray-600">{quote.terms}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
