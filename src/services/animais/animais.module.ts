import { Module } from '@nestjs/common';

import { AnimaisController } from './animais.controller';

@Module({
  controllers: [AnimaisController],
})
export class AnimaisModule {}
