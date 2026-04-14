import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { emailApi } from '@/lib/api';
import { X, Mail, Send, Loader2, CheckCircle } from 'lucide-react';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-filled recipient email */
  toEmail: string;
  /** Pre-filled subject line */
  defaultSubject: string;
  /** Pre-filled body message */
  defaultMessage: string;
  /** 'invoice' | 'quote' */
  documentType: string;
  documentId: string;
  /** Called after a successful send so the parent can update status */
  onSent?: () => void;
}

export default function SendEmailModal({
  isOpen,
  onClose,
  toEmail,
  defaultSubject,
  defaultMessage,
  documentType,
  documentId,
  onSent,
}: SendEmailModalProps) {
  const [to, setTo] = useState(toEmail);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      emailApi.send({ to, subject, message, documentType, documentId }),
    onSuccess: () => {
      setSent(true);
      onSent?.();
      setTimeout(() => {
        setSent(false);
        onClose();
      }, 2000);
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
              <Mail className="w-4 h-4 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Send to Client</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {sent ? (
          <div className="py-10 flex flex-col items-center gap-3">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="text-base font-medium text-gray-900">Email sent successfully!</p>
            <p className="text-sm text-gray-500">The {documentType} has been delivered to {to}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
                placeholder="client@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Message</label>
              <textarea
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 resize-none"
              />
            </div>

            {mutation.isError && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                Failed to send email. Please try again.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !to || !subject}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                ) : (
                  <><Send className="w-4 h-4" /> Send Email</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
