import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CreateAdoptionRequestDto } from 'src/dto/createAdoptionRequest.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { AdoptionService } from 'src/services/adocao/adoption.service';


@Controller('adoption-requests')
@ApiTags('adoption-requests')
export class AdoptionController {
  private readonly logger = new Logger(AdoptionController.name);

  constructor(private readonly adoptionService: AdoptionService) { }

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Criar solicitação de adoção' })
  @ApiResponse({ status: 201, description: 'Solicitação criada com sucesso' })
  @UseGuards(AuthGuard)
  async createAdoptionRequest(
    @Body() dto: CreateAdoptionRequestDto,
    @Req() request: Request,
  ) {
    const user = request.user;

    try {
      const adoptionRequest = await this.adoptionService.createRequest({
        ...dto,
        requesterId: user.uid,
        requesterEmail: user.email,
        requesterName: user.displayName || `${user.nome || ''} ${user.sobrenome || ''}`.trim()
      });

      // Enviar notificação por email para o publicador
      await this.adoptionService.notifyPublisher(adoptionRequest);

      return {
        message: 'Solicitação de adoção enviada com sucesso!',
        request: adoptionRequest
      };

    } catch (error) {
      this.logger.error(`Erro ao criar solicitação de adoção: ${error.message}`);
      throw new HttpException(
        `Erro ao criar solicitação: ${error.message}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('my-requests')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar minhas solicitações de adoção' })
  @UseGuards(AuthGuard)
  async getMyRequests(@Req() request: Request) {
    const user = request.user;

    try {
      return await this.adoptionService.getRequestsByRequester(user.uid);
    } catch (error) {
      this.logger.error(`Erro ao buscar solicitações: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('received')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar solicitações recebidas para minhas publicações' })
  @UseGuards(AuthGuard)
  async getReceivedRequests(@Req() request: Request) {
    const user = request.user;

    try {
      return await this.adoptionService.getRequestsByPublisher(user.email);
    } catch (error) {
      this.logger.error(`Erro ao buscar solicitações recebidas: ${error.message}`);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}