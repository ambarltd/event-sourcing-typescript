import nodemailer from 'nodemailer';
import { log } from '@/common/util/Logger';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export interface EmailServiceConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  defaultFrom?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private config: EmailServiceConfig;

  constructor(config?: EmailServiceConfig) {
    this.config = config || this.getRequiredConfig();
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
    });

    log.info('Email service initialized', {
      context: 'EmailService',
      host: this.config.host,
      port: this.config.port,
    });
  }

  private getRequiredConfig(): EmailServiceConfig {
    return {
      host: this.getEnvVar('SMTP_HOST'),
      port: parseInt(this.getEnvVar('SMTP_PORT')),
      secure: true,
      auth: {
        user: this.getEnvVar('SMTP_USERNAME'),
        pass: this.getEnvVar('SMTP_PASSWORD'),
      },
      defaultFrom: this.getEnvVar('SMTP_FROM_EMAIL'),
    };
  }

  private getEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Environment variable ${name} is not defined`);
    }
    return value;
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: options.from || this.config.defaultFrom,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      log.debug('Sending email', {
        context: 'EmailService',
        to: mailOptions.to,
        subject: mailOptions.subject,
      });

      const info = await this.transporter.sendMail(mailOptions);

      log.info('Email sent successfully', {
        context: 'EmailService',
        messageId: info.messageId,
        to: mailOptions.to,
        subject: mailOptions.subject,
      });
    } catch (error) {
      log.error('Failed to send email', error as Error, {
        context: 'EmailService',
        to: options.to,
        subject: options.subject,
      });
      throw error;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      log.info('Email service connection verified', {
        context: 'EmailService',
      });
      return true;
    } catch (error) {
      log.error('Email service connection failed', error as Error, {
        context: 'EmailService',
      });
      return false;
    }
  }
}
