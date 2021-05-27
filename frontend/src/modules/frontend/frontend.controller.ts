import { Controller, Get } from '@nestjs/common';

import { ApiClient } from '../api/api.interface';
import { ApiService } from '../api/api.service';
import { JaegerService } from '../jaeger/jaeger.service';
import { AuthorDto, BookDto, BooksAndAuthorsDto } from './frontend.dto';
import { Span } from 'opentracing';

@Controller('api/v1/details')
export class FrontendController {
  private readonly authorsApi: ApiClient;
  private readonly booksApi: ApiClient;

  constructor(apiService: ApiService, private readonly tracer: JaegerService) {
    this.authorsApi = apiService.getAuthorsApi();
    this.booksApi = apiService.getBooksApi();
  }

  private prepareHeaders(span: Span): unknown {
    // eslint-disable-next-line prefer-const
    let headers = {};
    this.tracer.inject(span, headers);

    return headers;
  }

  private async getBooks(span: Span): Promise<BookDto[]> {
    const { data: books } = await this.booksApi.get('/', {
      headers: this.prepareHeaders(span),
    });

    return books;
  }

  private async getAuthors(span: Span): Promise<AuthorDto[]> {
    const { data: authors } = await this.authorsApi.get('/', {
      headers: this.prepareHeaders(span),
    });

    return authors;
  }

  @Get('/')
  async getBooksAndAuthors(): Promise<BooksAndAuthorsDto> {
    const span = this.tracer.createControllerSpan('getBooksAndAuthors', 'GET');

    const authorsPromise = this.getAuthors(span);
    const booksPromise = this.getBooks(span);

    const res = await Promise.all([authorsPromise, booksPromise])
      .then((val) => ({
        authors: val[0],
        books: val[1],
      }))
      .catch((err) => {
        this.tracer.finishSpanWithResult(span, 500, true);
        throw err;
      });

    this.tracer.finishSpanWithResult(span, 200);
    return res;
  }
}
