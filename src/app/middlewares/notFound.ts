import { Request, Response } from 'express';

const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: 'Not Found',
    errors: [{ path: req.originalUrl, message: 'The requested route does not exist' }],
  });
};

export default notFound;
