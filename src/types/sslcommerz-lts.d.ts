declare module 'sslcommerz-lts' {
  interface ISslInitResponse {
    status: string;
    GatewayPageURL?: string;
    failedreason?: string;
    [key: string]: unknown;
  }

  interface ISslValidationResponse {
    status: string;
    tran_id: string;
    val_id: string;
    amount: string;
    currency: string;
    [key: string]: unknown;
  }

  class SSLCommerzPayment {
    constructor(storeId: string, storePassword: string, isLive: boolean);
    init(data: Record<string, unknown>): Promise<ISslInitResponse>;
    validate(data: Record<string, unknown>): Promise<ISslValidationResponse>;
    initiateRefund(data: Record<string, unknown>): Promise<Record<string, unknown>>;
    refundQuery(data: Record<string, unknown>): Promise<Record<string, unknown>>;
    transactionQueryBySessionId(data: Record<string, unknown>): Promise<Record<string, unknown>>;
    transactionQueryByTransactionId(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  }

  export = SSLCommerzPayment;
}
