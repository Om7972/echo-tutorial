import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

let secretsManagerClient: SecretsManagerClient | null = null;

function getClient() {
  if (!secretsManagerClient) {
    secretsManagerClient = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
    });
  }
  return secretsManagerClient;
}

export async function getSecret(secretName: string): Promise<string | Record<string, string>> {
  const client = getClient();
  const command = new GetSecretValueCommand({ SecretId: secretName });
  
  try {
    const response = await client.send(command);
    
    if (response.SecretString) {
      try {
        return JSON.parse(response.SecretString);
      } catch {
        return response.SecretString;
      }
    }
    
    throw new Error('Secret not found');
  } catch (error) {
    console.error(`Error retrieving secret ${secretName}:`, error);
    throw error;
  }
}
