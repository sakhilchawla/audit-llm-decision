import { Request, Response } from 'express';
import { AuditTrailControllerTestHelper } from '../helpers/AuditTrailControllerTestHelper';

describe('AuditTrailController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    mockRequest = {
      body: {
        prompt: 'test prompt',
        response: 'test response',
        modelType: 'test-model',
        modelVersion: '1.0',
        metadata: {
          client: 'test-client',
          timestamp: new Date().toISOString()
        }
      }
    };
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };
  });

  describe('validateLogRequest', () => {
    it('should validate a valid request', () => {
      const result = AuditTrailControllerTestHelper.testValidateLogRequest(mockRequest.body);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing required fields', () => {
      const invalidRequest = {
        prompt: 'test prompt'
      };
      const result = AuditTrailControllerTestHelper.testValidateLogRequest(invalidRequest);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('formatLogEntry', () => {
    it('should format a log entry correctly', () => {
      const formattedEntry = AuditTrailControllerTestHelper.testFormatLogEntry(mockRequest.body);
      expect(formattedEntry).toHaveProperty('prompt', mockRequest.body.prompt);
      expect(formattedEntry).toHaveProperty('response', mockRequest.body.response);
      expect(formattedEntry).toHaveProperty('model_type', mockRequest.body.modelType);
      expect(formattedEntry).toHaveProperty('model_version', mockRequest.body.modelVersion);
      expect(formattedEntry).toHaveProperty('metadata');
    });
  });
}); 