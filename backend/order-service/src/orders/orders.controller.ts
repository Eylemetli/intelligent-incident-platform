import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    Req,
    Patch,
    UseGuards,
} from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
    constructor(
        private readonly ordersService: OrdersService,
    ) { }


    @Post()
    create(
        @Body() dto: CreateOrderDto,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.ordersService.create(dto, request.user!.sub);
    }


    @Get()
    findAll(@Req() request: AuthenticatedRequest) {
        return this.ordersService.findAll(request.user!.sub);
    }

    @Get(':id')
    findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.ordersService.findOne(id, request.user!.sub);
    }

    @Patch(':id/cancel')
    cancel(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.ordersService.cancel(id, request.user!.sub);
    }
    //endpoint hem JWT doğrulamasından hem de rol kontrolünden geçer.
    @Patch(':id/confirm')
    @UseGuards(RolesGuard)
    @Roles('admin', 'manager')
    confirm(
        @Param('id', ParseUUIDPipe) id: string,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.ordersService.confirm(id, request.user!.sub);
    }


}
