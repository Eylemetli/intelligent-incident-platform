import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

import { IncidentSeverity } from '../entities/incident.entity';

export class CreateIncidentDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    sourceService: string;

    @IsOptional()
    @IsEnum(IncidentSeverity)
    severity?: IncidentSeverity;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    errorCode?: string;
}