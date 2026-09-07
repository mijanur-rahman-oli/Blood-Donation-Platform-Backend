import { Response } from 'express';

interface IMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface IApiResponse<T> {
  statusCode: number;
  success?: boolean;
  message: string;
  meta?: IMeta;
  data?: T;
}

const sendResponse = <T>(res: Response, payload: IApiResponse<T>): void => {
  const responseBody: Record<string, unknown> = {
    success: payload.success ?? true,
    message: payload.message,
  };

  if (payload.meta) {
    responseBody.data = {
      meta: payload.meta,
      result: payload.data,
    };
  } else {
    responseBody.data = payload.data ?? {};
  }

  res.status(payload.statusCode).json(responseBody);
};

export default sendResponse;
