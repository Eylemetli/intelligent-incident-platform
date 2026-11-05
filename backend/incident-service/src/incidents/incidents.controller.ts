import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';

import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentStatusDto } from './dto/update-incident-status.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('incidents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IncidentsController {
    constructor(
        private readonly incidentsService: IncidentsService,
    ) { }

    @Post()
    @Roles('admin', 'manager')
    create(@Body() dto: CreateIncidentDto) {
        return this.incidentsService.create(dto);
    }

    @Get()
    @Roles('admin', 'manager', 'developer')
    findAll() {
        return this.incidentsService.findAll();
    }

    @Get(':id')
    @Roles('admin', 'manager', 'developer')
    findOne(
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.incidentsService.findOne(id);
    }

    @Patch(':id/status')
    @Roles('admin', 'manager')
    updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateIncidentStatusDto,
    ) {
        return this.incidentsService.updateStatus(id, dto);
    }
}