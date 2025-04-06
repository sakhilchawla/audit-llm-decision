import { Request, Response } from 'express';
import { pool } from '../db';

export class HealthController {
  public static async check(req: Request, res: Response): Promise<void> {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'healthy' });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(500).json({ status: 'unhealthy', error: 'Database connection failed' });
    }
  }
} 