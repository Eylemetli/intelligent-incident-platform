import {
    Injectable,
    Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface CreateIncidentPayload {
    title: string;
    description: string;
    sourceService: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    errorCode?: string;
}

@Injectable()
export class IncidentClientService {
    private readonly logger = new Logger(IncidentClientService.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    async createIncident(payload: CreateIncidentPayload): Promise<void> {
        const baseUrl =
            this.configService.getOrThrow<string>('INCIDENT_SERVICE_URL');

        const serviceKey =
            this.configService.getOrThrow<string>('INTERNAL_SERVICE_KEY');

        await firstValueFrom(
            this.httpService.post(
                `${baseUrl}/incidents/internal`,
                payload,
                {
                    headers: {
                        'X-Service-Key': serviceKey,
                    },
                    timeout: 5000,
                },
            ),
        );

        this.logger.log(
            `Incident bildirimi gönderildi: ${payload.title}`,
        );
    }
}