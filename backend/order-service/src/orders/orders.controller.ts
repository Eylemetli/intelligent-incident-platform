
import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
} from '@nestjs/common';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
    constructor(
        private readonly ordersService: OrdersService,
    ) { }

    @Post()
    create(@Body() dto: CreateOrderDto) {
        return this.ordersService.create(dto);
    }

    @Get()
    findAll() {
        return this.ordersService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.ordersService.findOne(id);
    }
}
