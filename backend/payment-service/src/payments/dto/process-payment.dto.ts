import {
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
    ValidateIf,
    IsNotEmpty,
} from 'class-validator';

export enum PaymentProcessResult {
    SUCCESS = 'success',
    FAILED = 'failed',
}

export class ProcessPaymentDto {
    @IsEnum(PaymentProcessResult)
    result: PaymentProcessResult;

    @ValidateIf((dto: ProcessPaymentDto) =>
        dto.result === PaymentProcessResult.FAILED,
    )
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    failureReason?: string;
}