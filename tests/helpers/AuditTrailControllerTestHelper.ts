import { AuditTrailController } from '../../src/controllers/AuditTrailController';

export class AuditTrailControllerTestHelper extends AuditTrailController {
  public static testValidateLogRequest(data: unknown) {
    return this.validateLogRequest(data);
  }

  public static testFormatLogEntry(data: any) {
    return this.formatLogEntry(data);
  }
} 