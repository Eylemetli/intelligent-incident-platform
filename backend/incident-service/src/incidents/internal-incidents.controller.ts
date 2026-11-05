import {
    Body,
    Controller,
    Post,
    UseGuards,
} from '@nestjs/common';

import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { InternalServiceGuard } from '../auth/guards/internal-service.guard';

@Controller('incidents/internal')
@UseGuards(InternalServiceGuard)
export class InternalIncidentsController {
    constructor(
        private readonly incidentsService: IncidentsService,
    ) { }

    @Post()
    create(@Body() dto: CreateIncidentDto) {
        return this.incidentsService.create(dto);
    }
}