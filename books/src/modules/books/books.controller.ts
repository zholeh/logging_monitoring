import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { RedisClient } from 'redis';

import { REDIS_CONNECTION, REDIS_TOPIC } from '../redis/redis.providers';
import { BookDto, CreateBookInput } from './books.dto';
import { BooksService } from './books.service';

@Controller('api/v1/books')
export class BooksController {
  private behavior = 3;
  constructor(
    private readonly booksService: BooksService,
    @Inject(REDIS_CONNECTION)
    private readonly redisInstance: RedisClient,
  ) {}

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  @Get('/')
  async getBooks(): Promise<BookDto[]> {
    console.log('Get books');
    this.behavior = this.behavior === 3 ? 1 : this.behavior + 1;
    if (this.behavior === 2) {
      await this.sleep(150);
    } else if (this.behavior === 3) {
      throw new BadRequestException('Emulated error');
    }
    return this.booksService.getBooks();
  }

  @Get('/:id')
  getBookById(@Param('id') id: string): BookDto {
    console.log('Get a book by ID');
    return this.booksService.findById(id);
  }

  @Post('/')
  async createBook(@Body() data: CreateBookInput): Promise<BookDto> {
    console.log('Create a book');
    const book = await this.booksService.create(data);
    this.sendPushNotification(book);
    return book;
  }

  private sendPushNotification(response: BookDto): void {
    this.redisInstance.set(REDIS_TOPIC, JSON.stringify(response));
  }
}
