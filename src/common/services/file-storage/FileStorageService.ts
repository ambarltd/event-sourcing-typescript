import * as Minio from 'minio';
import { Readable } from 'stream';
import { log } from '@/common/util';
import env from '@/app/environment';

export interface FileStorageOptions {
  bucketName: string;
  objectName: string;
  stream: string | Buffer | Readable;
  size?: number;
  metaData?: Minio.ItemBucketMetadata;
}

export interface FileStorageServiceConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  region?: string;
}

export interface FileStorageResult {
  etag?: string;
  objectName: string;
  bucketName: string;
}

export interface FileDownloadResult {
  stream: Readable;
  stat: Minio.BucketItemStat;
}

export class FileStorageService {
  private client: Minio.Client;
  private config: FileStorageServiceConfig;

  constructor(config?: FileStorageServiceConfig) {
    this.config = config || this.getRequiredConfig();
    this.client = new Minio.Client({
      endPoint: this.config.endPoint,
      port: this.config.port,
      useSSL: this.config.useSSL,
      accessKey: this.config.accessKey,
      secretKey: this.config.secretKey,
    });

    log.info('File storage service initialized', {
      context: 'FileStorageService',
      endPoint: this.config.endPoint,
      port: this.config.port,
      useSSL: this.config.useSSL,
    });
  }

  private getRequiredConfig(): FileStorageServiceConfig {
    const endpointUrl = env.S3_ENDPOINT_URL;
    const url = new URL(endpointUrl);

    return {
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
    };
  }


  async createBucket(bucketName: string, region?: string): Promise<void> {
    try {
      const exists = await this.client.bucketExists(bucketName);
      if (!exists) {
        await this.client.makeBucket(bucketName, region || 'us-east-1');
        log.info('Bucket created successfully', {
          context: 'FileStorageService',
          bucketName,
          region: region || 'us-east-1',
        });
      } else {
        log.debug('Bucket already exists', {
          context: 'FileStorageService',
          bucketName,
        });
      }
    } catch (error) {
      log.error('Failed to create bucket', error as Error, {
        context: 'FileStorageService',
        bucketName,
      });
      throw error;
    }
  }

  async uploadFile(options: FileStorageOptions): Promise<FileStorageResult> {
    try {
      log.debug('Uploading file', {
        context: 'FileStorageService',
        bucketName: options.bucketName,
        objectName: options.objectName,
        size: options.size,
      });

      const uploadInfo = await this.client.putObject(
        options.bucketName,
        options.objectName,
        options.stream,
        options.size,
        options.metaData,
      );

      const result: FileStorageResult = {
        etag: uploadInfo.etag,
        objectName: options.objectName,
        bucketName: options.bucketName,
      };

      log.info('File uploaded successfully', {
        context: 'FileStorageService',
        ...result,
      });

      return result;
    } catch (error) {
      log.error('Failed to upload file', error as Error, {
        context: 'FileStorageService',
        bucketName: options.bucketName,
        objectName: options.objectName,
      });
      throw error;
    }
  }

  async downloadFile(
    bucketName: string,
    objectName: string,
  ): Promise<FileDownloadResult> {
    try {
      log.debug('Downloading file', {
        context: 'FileStorageService',
        bucketName,
        objectName,
      });

      const [stream, stat] = await Promise.all([
        this.client.getObject(bucketName, objectName),
        this.client.statObject(bucketName, objectName),
      ]);

      log.info('File downloaded successfully', {
        context: 'FileStorageService',
        bucketName,
        objectName,
        size: stat.size,
      });

      return { stream, stat };
    } catch (error) {
      log.error('Failed to download file', error as Error, {
        context: 'FileStorageService',
        bucketName,
        objectName,
      });
      throw error;
    }
  }

  async deleteFile(bucketName: string, objectName: string): Promise<void> {
    try {
      await this.client.removeObject(bucketName, objectName);

      log.info('File deleted successfully', {
        context: 'FileStorageService',
        bucketName,
        objectName,
      });
    } catch (error) {
      log.error('Failed to delete file', error as Error, {
        context: 'FileStorageService',
        bucketName,
        objectName,
      });
      throw error;
    }
  }

  async listFiles(
    bucketName: string,
    prefix?: string,
    recursive = false,
  ): Promise<Minio.BucketItem[]> {
    try {
      log.debug('Listing files', {
        context: 'FileStorageService',
        bucketName,
        prefix,
        recursive,
      });

      const objects: Minio.BucketItem[] = [];
      const stream = this.client.listObjects(bucketName, prefix, recursive);

      return new Promise((resolve, reject) => {
        stream.on('data', (obj: Minio.BucketItem) => objects.push(obj));
        stream.on('end', () => {
          log.info('Files listed successfully', {
            context: 'FileStorageService',
            bucketName,
            count: objects.length,
          });
          resolve(objects);
        });
        stream.on('error', (error) => {
          log.error('Failed to list files', error, {
            context: 'FileStorageService',
            bucketName,
          });
          reject(error);
        });
      });
    } catch (error) {
      log.error('Failed to list files', error as Error, {
        context: 'FileStorageService',
        bucketName,
      });
      throw error;
    }
  }

  async generatePresignedUrl(
    bucketName: string,
    objectName: string,
    expires = 7 * 24 * 60 * 60,
  ): Promise<string> {
    try {
      const url = await this.client.presignedGetObject(
        bucketName,
        objectName,
        expires,
      );

      log.info('Presigned URL generated', {
        context: 'FileStorageService',
        bucketName,
        objectName,
        expires,
      });

      return url;
    } catch (error) {
      log.error('Failed to generate presigned URL', error as Error, {
        context: 'FileStorageService',
        bucketName,
        objectName,
      });
      throw error;
    }
  }
}
