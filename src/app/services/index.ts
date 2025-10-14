/*
  All application services
*/
export { type Services, initializeServices };

import { EmailService } from '@/app/services/email';
import { FileStorageService } from '@/app/services/file-storage';
import env from '@/app/environment';

type Services = {
  fileStorage: FileStorageService;
  email: EmailService;
};

function initializeServices(): Services {
  const url = new URL(env.S3_ENDPOINT_URL);
  return {
    fileStorage: new FileStorageService({
      endPoint: url.hostname,
      port: url.port
        ? parseInt(url.port)
        : url.protocol === 'https:'
          ? 443
          : 80,
      useSSL: url.protocol === 'https:',
      accessKey: env.S3_ACCESS_KEY,
      secretKey: env.S3_SECRET_KEY,
      region: env.S3_REGION,
    }),
    email: new EmailService({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: true,
      auth: {
        user: env.SMTP_USERNAME,
        pass: env.SMTP_PASSWORD,
      },
      defaultFrom: env.SMTP_FROM_EMAIL,
    }),
  };
}
