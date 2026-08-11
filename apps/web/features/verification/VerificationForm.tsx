'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useCreateVerification } from '@/hooks/useVerifications';
import { formatCurrency, formatDate } from '@/lib/cn';
import { PROVIDERS } from '@/lib/constants';
import { api } from '@/services/api';
import type { ImageVerificationData, VerificationData } from '@/services/api';

const baseSchema = z.object({
  provider: z.string().min(2, 'Select a provider'),
  reference: z.string().min(3, 'Reference must be at least 3 characters'),
  accountSuffix: z.string().optional(),
  phoneNumber: z.string().optional(),
  claimAfterVerify: z.boolean().optional(),
});

type FormValues = z.infer<typeof baseSchema>;

function buildSchema(provider: string) {
  return baseSchema.superRefine((data, ctx) => {
    if (provider === 'cbe') {
      if (!data.accountSuffix || !/^\d{8}$/.test(data.accountSuffix)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CBE requires an 8-digit account suffix',
          path: ['accountSuffix'],
        });
      }
    }
    if (provider === 'boa') {
      if (!data.accountSuffix || !/^\d{5}$/.test(data.accountSuffix)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'BOA requires a 5-digit account suffix',
          path: ['accountSuffix'],
        });
      }
    }
    if (provider === 'cbebirr') {
      if (!data.phoneNumber || data.phoneNumber.length < 9) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CBE Birr requires a valid phone number',
          path: ['phoneNumber'],
        });
      }
    }
  });
}

export function VerificationForm({
  initialValues,
  onSuccess,
  variant = 'default',
}: {
  initialValues?: Partial<FormValues>;
  onSuccess?: (data: VerificationData) => void;
  variant?: 'default' | 'live-demo';
}) {
  const [form, setForm] = useState<FormValues>({
    provider: initialValues?.provider ?? '',
    reference: initialValues?.reference ?? '',
    accountSuffix: initialValues?.accountSuffix ?? '',
    phoneNumber: initialValues?.phoneNumber ?? '',
    claimAfterVerify: initialValues?.claimAfterVerify ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useCreateVerification();
  const [result, setResult] = useState<VerificationData | null>(null);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageForm, setImageForm] = useState({
    provider: '',
    reference: '',
    accountSuffix: '',
    phoneNumber: '',
  });
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageResult, setImageResult] = useState<ImageVerificationData | null>(null);

  function handleChange(field: keyof FormValues, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = buildSchema(form.provider).safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0]?.toString();
        if (key) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setClaimMessage(null);

    try {
      const payload = {
        provider: parsed.data.provider,
        reference: parsed.data.reference,
        ...(parsed.data.accountSuffix ? { accountSuffix: parsed.data.accountSuffix } : {}),
        ...(parsed.data.phoneNumber ? { phoneNumber: parsed.data.phoneNumber } : {}),
      };

      const data = await mutation.mutateAsync(payload);
      setResult(data);
      onSuccess?.(data);

      if (parsed.data.claimAfterVerify && data.status === 'VERIFIED') {
        const claimResult = await api.claimPayment({
          provider: data.provider,
          reference: data.reference,
          verificationId: data.verificationId,
        });
        if (claimResult.success) {
          setClaimMessage('Payment claimed successfully — reference cannot be reused.');
        } else {
          setClaimMessage(`Claim failed: ${claimResult.error.message}`);
        }
      }
    } catch {
      setResult(null);
    }
  }

  async function handleImageSubmit(e: React.FormEvent) {
    e.preventDefault();
    setImageError(null);
    setImageResult(null);

    if (!imageFile) {
      setImageError('Select a receipt image to upload.');
      return;
    }
    if (!imageForm.reference.trim()) {
      setImageError('Enter the reference extracted from the receipt.');
      return;
    }

    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('reference', imageForm.reference.trim());
    if (imageForm.provider) formData.append('provider', imageForm.provider);
    if (imageForm.accountSuffix) formData.append('accountSuffix', imageForm.accountSuffix);
    if (imageForm.phoneNumber) formData.append('phoneNumber', imageForm.phoneNumber);

    setImageLoading(true);
    try {
      const response = await api.verifyImage(formData);
      if (!response.success) {
        setImageError(response.error.message);
        return;
      }
      setImageResult(response.data);
    } catch {
      setImageError('Image verification failed. Please try again.');
    } finally {
      setImageLoading(false);
    }
  }

  const providerOptions = [
    { value: '', label: 'Select bank / wallet', disabled: true },
    ...PROVIDERS.filter((p) => p.status === 'available').map((p) => ({
      value: p.name,
      label: p.displayName,
    })),
  ];

  const showCbeSuffix = form.provider === 'cbe';
  const showBoaSuffix = form.provider === 'boa';
  const showCbebirrPhone = form.provider === 'cbebirr';

  const formCard = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Bank / Wallet"
        name="provider"
        value={form.provider}
        onChange={(e) => handleChange('provider', e.target.value)}
        options={providerOptions}
        error={errors.provider}
        required
      />
      <Input
        label="Reference / Transaction number"
        name="reference"
        value={form.reference}
        onChange={(e) => handleChange('reference', e.target.value)}
        placeholder="e.g. FT..., CE..., or CJU5RZ5NM3"
        error={errors.reference}
        required
      />
      {(showCbeSuffix || showBoaSuffix) && (
        <Input
          label="Account suffix"
          name="accountSuffix"
          value={form.accountSuffix ?? ''}
          onChange={(e) => handleChange('accountSuffix', e.target.value)}
          placeholder={showCbeSuffix ? '12345678' : '12345'}
          hint={
            showCbeSuffix
              ? 'Last 8 digits of your CBE account number'
              : 'Last 5 digits of your BOA account number'
          }
          error={errors.accountSuffix}
          inputMode="numeric"
          maxLength={showCbeSuffix ? 8 : 5}
          required
        />
      )}
      {showCbebirrPhone && (
        <Input
          label="Phone number"
          name="phoneNumber"
          value={form.phoneNumber ?? ''}
          onChange={(e) => handleChange('phoneNumber', e.target.value)}
          placeholder="0912345678"
          hint="Phone number used for the CBE Birr transaction"
          error={errors.phoneNumber}
          required
        />
      )}
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-surface-border bg-surface/50 p-3">
        <input
          type="checkbox"
          checked={form.claimAfterVerify ?? false}
          onChange={(e) => handleChange('claimAfterVerify', e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-surface-border text-ice focus:ring-ice"
        />
        <span className="text-sm">
          <span className="font-medium text-ink">Claim after verify</span>
          <span className="mt-0.5 block text-ink-muted">
            Automatically consume this payment after a successful verification to prevent reuse.
          </span>
        </span>
      </label>
      <Button type="submit" variant="ice" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? 'Verifying…' : 'Verify payment'}
      </Button>
      {variant === 'live-demo' && (
        <p className="text-center text-xs text-ink-subtle">
          Free to start. Submit a provider and reference to see the live payment details.
        </p>
      )}
    </form>
  );

  const imageSection = (
    <form onSubmit={handleImageSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">Receipt image</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-ink-muted file:mr-4 file:rounded-lg file:border-0 file:bg-ice/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-ice-dark hover:file:bg-ice/20"
        />
        <p className="mt-1 text-xs text-ink-subtle">
          Upload a screenshot or photo of the payment receipt (max 8 MB).
        </p>
      </div>
      <Select
        label="Provider (optional)"
        name="imageProvider"
        value={imageForm.provider}
        onChange={(e) => setImageForm((prev) => ({ ...prev, provider: e.target.value }))}
        options={[{ value: '', label: 'Auto-detect if possible' }, ...providerOptions.slice(1)]}
      />
      <Input
        label="Reference from receipt"
        value={imageForm.reference}
        onChange={(e) => setImageForm((prev) => ({ ...prev, reference: e.target.value }))}
        placeholder="Transaction reference visible on receipt"
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Account suffix (CBE/BOA)"
          value={imageForm.accountSuffix}
          onChange={(e) => setImageForm((prev) => ({ ...prev, accountSuffix: e.target.value }))}
          placeholder="If shown on receipt"
        />
        <Input
          label="Phone (CBE Birr)"
          value={imageForm.phoneNumber}
          onChange={(e) => setImageForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
          placeholder="If applicable"
        />
      </div>
      <Button type="submit" variant="secondary" disabled={imageLoading} className="w-full">
        {imageLoading ? 'Processing image…' : 'Verify from image'}
      </Button>
    </form>
  );

  const resultCard = result && (
    <Card>
      <CardHeader title="Verification result" />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={result.status} />
          <span className="text-sm text-ink-muted">ID: {result.verificationId}</span>
        </div>
        {result.message && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              result.verified ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
            }`}
          >
            {result.message}
          </p>
        )}
        {claimMessage && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              claimMessage.startsWith('Claim failed')
                ? 'bg-red-50 text-red-700'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {claimMessage}
          </p>
        )}
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-subtle">Reference</dt>
            <dd className="font-medium text-ink">{result.reference}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-subtle">Provider</dt>
            <dd className="font-medium capitalize text-ink">{result.provider}</dd>
          </div>
          {(result.actualAmount ?? result.amount) !== undefined && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-subtle">Amount</dt>
              <dd className="font-medium text-ink">
                {formatCurrency(
                  result.actualAmount ?? result.amount ?? 0,
                  result.currency ?? result.payment?.currency ?? 'ETB',
                )}
              </dd>
            </div>
          )}
          {(result.payment?.payerName || result.payment?.sender) && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-subtle">Payer</dt>
              <dd className="font-medium text-ink">
                {result.payment?.payerName ?? result.payment?.sender}
              </dd>
            </div>
          )}
          {(result.payment?.creditedPartyName ||
            result.actualReceiver ||
            result.payment?.receiver) && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-subtle">Receiver</dt>
              <dd className="font-medium text-ink">
                {result.payment?.creditedPartyName ??
                  result.actualReceiver ??
                  result.payment?.receiver}
              </dd>
            </div>
          )}
          {result.payment?.providerStatus && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-subtle">Provider status</dt>
              <dd className="font-medium text-ink">{result.payment.providerStatus}</dd>
            </div>
          )}
          {(result.payment?.transactionDate || result.createdAt) && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-subtle">Date</dt>
              <dd className="font-medium text-ink">
                {formatDate(result.payment?.transactionDate ?? result.createdAt ?? '')}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </Card>
  );

  const imageResultCard = imageResult && (
    <Card>
      <CardHeader title="Image verification result" />
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-ink">Extracted fields</h3>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-ink-subtle">Provider</dt>
              <dd className="font-medium capitalize">{imageResult.extracted.provider}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-subtle">Reference</dt>
              <dd className="font-mono text-sm">{imageResult.extracted.reference}</dd>
            </div>
            {imageResult.extracted.accountSuffix && (
              <div>
                <dt className="text-xs text-ink-subtle">Account suffix</dt>
                <dd>{imageResult.extracted.accountSuffix}</dd>
              </div>
            )}
            {imageResult.extracted.phoneNumber && (
              <div>
                <dt className="text-xs text-ink-subtle">Phone</dt>
                <dd>{imageResult.extracted.phoneNumber}</dd>
              </div>
            )}
          </dl>
        </div>
        {imageResult.verification && (
          <div className="border-t border-surface-border pt-4">
            <div className="mb-3 flex items-center gap-2">
              <StatusBadge status={imageResult.verification.status} />
              <span className="text-sm text-ink-muted">
                {imageResult.verification.verificationId}
              </span>
            </div>
            {(imageResult.verification.actualAmount ?? imageResult.verification.amount) !==
              undefined && (
              <p className="text-sm text-ink">
                Amount:{' '}
                {formatCurrency(
                  imageResult.verification.actualAmount ?? imageResult.verification.amount ?? 0,
                  imageResult.verification.currency ?? 'ETB',
                )}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );

  const wrapperClass =
    variant === 'live-demo'
      ? 'rounded-2xl border border-white/10 bg-ink/80 p-6 text-white shadow-xl backdrop-blur sm:p-8'
      : '';

  return (
    <div className="space-y-6">
      {variant === 'live-demo' ? <div className={wrapperClass}>{formCard}</div> : (
        <Card>
          <CardHeader
            title="Verify a payment"
            description="Choose a bank/wallet and paste the transaction reference. Amount and receiver come back from the provider."
          />
          {formCard}
        </Card>
      )}

      {mutation.isPending && <LoadingState message="Contacting provider…" />}

      {mutation.isError && (
        <ErrorState
          message={mutation.error?.message ?? 'Verification failed'}
          onRetry={() => mutation.reset()}
        />
      )}

      {resultCard}

      {variant === 'live-demo' ? (
        <div className={wrapperClass}>
          <h3 className="mb-4 font-display text-lg font-semibold text-white">
            Verify from receipt image
          </h3>
          {imageSection}
        </div>
      ) : (
        <Card>
          <CardHeader
            title="Verify from receipt image"
            description="Upload a payment screenshot with the reference and optional provider-specific fields."
          />
          {imageSection}
        </Card>
      )}

      {imageLoading && <LoadingState message="Uploading and verifying image…" />}
      {imageError && (
        <ErrorState message={imageError} onRetry={() => setImageError(null)} />
      )}
      {imageResultCard}
    </div>
  );
}
