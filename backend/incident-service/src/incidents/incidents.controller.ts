import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
} from '@nestjs/common';

import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentStatusDto } from './dto/update-incident-status.dto';

@Controller('incidents')
export class IncidentsController {
    constructor(
        private readonly incidentsService: IncidentsService,
    ) { }

    @Post()
    create(@Body() dto: CreateIncidentDto) {
        return this.incidentsService.create(dto);
    }

    @Get()
    findAll() {
        return this.incidentsService.findAll();
    }

    @Get(':id')
    findOne(
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.incidentsService.findOne(id);
    }

    @Patch(':id/status')
    updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateIncidentStatusDto,
    ) {
        return this.incidentsService.updateStatus(id, dto);
    }
}