import { Body, Controller, Get, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DIRECTORY_CONFIGURATION } from '../../configuration';
import { AuthenticationGuard } from '../auth/auth.guard';
import { ExceptionsService } from '../exceptions/exceptions.service';
import { ApplicationResponse, CreateApplicationDto } from './application.dto';
import { ApplicationService } from './service/application.service';

@Controller('applications')
@ApiTags('Application')
@UseGuards(AuthenticationGuard)
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService, private readonly exceptionService: ExceptionsService) {}

  @Get('/property/:identifier')
  @ApiOperation({ description: 'Get the list of Properties.' })
  async getApplicationsByProperty(
    @Param('identifier') identifier: any,
    @Query('applicationIdentifier') applicationIdentifier: string,
    @Query('env') env: string,
    @Query('skip') skip: number,
    @Query('limit') limit: number
  ) {
    return this.applicationService.getApplicationsByProperty(identifier, applicationIdentifier, env, skip, limit);
  }

  @Post('/deploy/:propertyIdentifier/:env')
  @UseInterceptors(
    FileInterceptor('upload', {
      dest: DIRECTORY_CONFIGURATION.baseDir,
      fileFilter: (req, file, cb) => {
        file.filename = `${Date.now()}-${file.originalname}`;
        cb(null, true);
      }
    })
  )
  @ApiCreatedResponse({ status: 201, description: 'Application deployed successfully.', type: ApplicationResponse })
  async createApplication(
    @UploadedFile() file,
    @Body() applicationDto: CreateApplicationDto,
    @Param() params,
    @Query() queries
  ): Promise<ApplicationResponse> {
    const types = ['zip', 'tgz', 'gzip', 'gz', 'bzip2', 'bzip', '7z', 'rar', 'tar'];
    const fileFilter = file?.originalname.split('.');
    if (!types.includes(fileFilter[fileFilter.length - 1])) {
      this.exceptionService.badRequestException({ message: 'Invalid file type.' });
    }
    const application = this.applicationService.saveApplication(applicationDto, file.path, params.propertyIdentifier, params.env, queries.createdBy);
    return application;
  }
}
