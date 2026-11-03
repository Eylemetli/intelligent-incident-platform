import {
    IsNumber,
    IsPositive,
    IsOptional,
    IsString,
    Length,
    Max,
} from 'class-validator';

export class CreateOrderDto {
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    @Max(9999999999.99)
    totalAmount: number;

    @IsOptional()
    @IsString()
    @Length(3, 3)
    currency?: string;
}