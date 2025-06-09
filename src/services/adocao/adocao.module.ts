import { Module } from '@nestjs/common';
import { FirebaseModule } from "src/config/firebase/firebase.module";
import { AdoptionController } from "src/controllers/adocao/adoption.controller";
import { AdoptionService } from "./adoption.service";

@Module({
  imports: [FirebaseModule],
  controllers: [AdoptionController],
  providers: [AdoptionService],
  exports: [AdoptionService],
})
export class AdoptionModule { }