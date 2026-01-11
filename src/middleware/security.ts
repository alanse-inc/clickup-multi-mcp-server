/**
 * SPDX-FileCopyrightText: © 2025 Alanse Inc.
 * SPDX-License-Identifier: MIT
 *
 * Security Middleware for ClickUp MCP Server
 * 
 * This module provides optional security enhancements that can be enabled
 * without breaking existing functionality. All security features are opt-in
 * to maintain backwards compatibility.
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import config from '../config.js';
import { Logger } from '../logger.js';

const logger = new Logger('Security');

/**
 * Origin validation middleware - validates Origin header against whitelist
 * Only enabled when ENABLE_ORIGIN_VALIDATION=true
 */
export function createOriginValidationMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!config.enableOriginValidation) {
      next();
      return;
    }

    const origin = req.headers.origin;
    const referer = req.headers.referer;

    // For non-browser requests (like n8n, MCP Inspector), origin might be undefined
    // In such cases, we allow the request but log it for monitoring
    if (!origin && !referer) {
      logger.debug('Request without Origin/Referer header - allowing (likely non-browser client)', {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        path: req.path
      });
      next();
      return;
    }

    // Check if origin is in allowed list
    if (origin && !config.allowedOrigins.includes(origin)) {
      logger.warn('Blocked request from unauthorized origin', {
        origin,
        ip: req.ip,
        path: req.path,
        userAgent: req.headers['user-agent']
      });
      res.status(403).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Forbidden: Origin not allowed'
        },
        id: null
      });
      return;
    }

    // If referer is present, validate it too
    if (referer) {
      try {
        const refererOrigin = new URL(referer).origin;
        if (!config.allowedOrigins.includes(refererOrigin)) {
          logger.warn('Blocked request from unauthorized referer', {
            referer,
            refererOrigin,
            ip: req.ip,
            path: req.path
          });
          res.status(403).json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Forbidden: Referer not allowed'
            },
            id: null
          });
          return;
        }
      } catch (error) {
        logger.warn('Invalid referer URL', { referer, error: error.message });
        // Continue processing if referer is malformed
      }
    }

    logger.debug('Origin validation passed', { origin, referer });
    next();
  };
}

/**
 * Rate limiting middleware - protects against DoS attacks
 * Only enabled when ENABLE_RATE_LIMIT=true
 */
export function createRateLimitMiddleware() {
  if (!config.enableRateLimit) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  return rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    message: {
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Too many requests, please try again later'
      },
      id: null
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userAgent: req.headers['user-agent']
      });
      res.status(429).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Too many requests, please try again later'
        },
        id: null
      });
    }
  });
}

/**
 * CORS middleware - configures cross-origin resource sharing
 * Only enabled when ENABLE_CORS=true
 */
export function createCorsMiddleware() {
  if (!config.enableCors) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (config.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS blocked origin', { origin });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'mcp-session-id', 'Authorization'],
    exposedHeaders: ['mcp-session-id']
  });
}

/**
 * Security headers middleware - adds security-related HTTP headers
 * Only enabled when ENABLE_SECURITY_FEATURES=true
 */
export function createSecurityHeadersMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!config.enableSecurityFeatures) {
      return next();
    }

    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Only add HSTS for HTTPS
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    logger.debug('Security headers applied');
    next();
  };
}

/**
 * Request logging middleware for security monitoring
 */
export function createSecurityLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!config.enableSecurityFeatures) {
      return next();
    }

    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logData = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        origin: req.headers.origin,
        sessionId: req.headers['mcp-session-id']
      };

      if (res.statusCode >= 400) {
        logger.warn('HTTP error response', logData);
      } else {
        logger.debug('HTTP request completed', logData);
      }
    });

    next();
  };
}

/**
 * Input validation middleware - validates request size and content
 */
export function createInputValidationMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Always enforce reasonable request size limits
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) { // 50MB hard limit
      logger.warn('Request too large', {
        contentLength,
        ip: req.ip,
        path: req.path
      });
      res.status(413).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Request entity too large'
        },
        id: null
      });
      return;
    }

    next();
  };
}
