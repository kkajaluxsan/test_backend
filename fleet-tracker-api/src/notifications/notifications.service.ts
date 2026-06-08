import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import twilio, { Twilio } from 'twilio';
import { Alert } from '../alerts/entities/alert.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseApp: admin.app.App | null = null;
  private twilioClient: Twilio | null = null;
  private firebaseWarned = false;
  private twilioWarned = false;

  constructor(private readonly configService: ConfigService) {}

  async sendFcm(alert: Alert) {
    const app = this.getFirebaseApp();
    if (!app) return;

    try {
      await admin.messaging(app).send({
        topic: 'admin-alerts',
        notification: {
          title: `Alert: ${alert.type}`,
          body: alert.message,
        },
        data: {
          alertType: alert.type,
          severity: alert.severity,
          truckId: alert.truckId || '',
          driverId: alert.driverId || '',
        },
      });
    } catch (error) {
      this.logger.warn(`FCM send failed: ${(error as Error).message}`);
    }
  }

  async sendSms(message: string) {
    const client = this.getTwilioClient();
    if (!client) return;

    const from = this.configService.get<string>('TWILIO_FROM_NUMBER');
    const to = this.configService.get<string>('TWILIO_ADMIN_NUMBER');
    if (!from || !to) {
      if (!this.twilioWarned) {
        this.logger.warn('Twilio numbers missing. Skipping SMS notifications.');
        this.twilioWarned = true;
      }
      return;
    }

    try {
      await client.messages.create({ from, to, body: message });
    } catch (error) {
      this.logger.warn(`Twilio send failed: ${(error as Error).message}`);
    }
  }

  private getFirebaseApp(): admin.app.App | null {
    if (this.firebaseApp) return this.firebaseApp;

    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      if (!this.firebaseWarned) {
        this.logger.warn('Firebase credentials missing. Skipping FCM notifications.');
        this.firebaseWarned = true;
      }
      return null;
    }

    const key = privateKey.replace(/\\n/g, '\n');
    this.firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: key,
      }),
    });

    return this.firebaseApp;
  }

  private getTwilioClient(): Twilio | null {
    if (this.twilioClient) return this.twilioClient;

    const sid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const token = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    if (!sid || !token) {
      if (!this.twilioWarned) {
        this.logger.warn('Twilio credentials missing. Skipping SMS notifications.');
        this.twilioWarned = true;
      }
      return null;
    }

    this.twilioClient = twilio(sid, token);
    return this.twilioClient;
  }
}
