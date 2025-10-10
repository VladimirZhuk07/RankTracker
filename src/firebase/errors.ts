
export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

function formatContext(context: SecurityRuleContext) {
    let message = `The following request was denied by Firestore Security Rules:\n{\n`;
    message += `  "auth": ${JSON.stringify(null, null, 2).replace(/\n/g, '\n  ')},\n`;
    message += `  "method": "${context.operation}",\n`;
    message += `  "path": "/databases/(default)/documents${context.path}"\n`;
    if (context.requestResourceData) {
        message += `  "request.resource.data": ${JSON.stringify(context.requestResourceData, null, 2).replace(/\n/g, '\n  ')}\n`;
    }
    message += `}`;
    return message;
}

export class FirestorePermissionError extends Error {
  constructor(public context: SecurityRuleContext) {
    super(`Missing or insufficient permissions: ${formatContext(context)}`);
    this.name = 'FirestorePermissionError';
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }
}
