export interface ProviderCapabilities {
  supportsAmountValidation: boolean;
  supportsReceiverValidation: boolean;
  supportsSenderInformation: boolean;
  supportsReceiptVerification: boolean;
  supportsAsyncVerification: boolean;
  supportsWebhook: boolean;
  supportsBatchVerification: boolean;
  supportsTransactionSearch: boolean;
}

export const DEFAULT_CAPABILITIES: ProviderCapabilities = {
  supportsAmountValidation: true,
  supportsReceiverValidation: true,
  supportsSenderInformation: false,
  supportsReceiptVerification: false,
  supportsAsyncVerification: false,
  supportsWebhook: false,
  supportsBatchVerification: false,
  supportsTransactionSearch: false,
};
