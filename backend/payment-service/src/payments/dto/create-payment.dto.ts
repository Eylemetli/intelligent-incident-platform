import {
    IsUUID,
    IsNumber,
    IsPositive,
    Max,
    IsOptional,
    IsString,
    Length,
} from 'class-validator';

export class CreatePaymentDto {
    @IsUUID()
    orderId: string;

    @IsUUID()
    userId: string;

    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    @Max(9999999999.99)
    amount: number;

    @IsOptional()
    @IsString()
    @Length(3, 3)
    currency?: string;
}