import { Test, TestingModule } from '@nestjs/testing';
import { AnimalController } from './animal.controller';


describe('AnimaisController', () => {
  let controller: AnimalController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnimalController],
    }).compile();

    controller = module.get<AnimalController>(AnimalController);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
