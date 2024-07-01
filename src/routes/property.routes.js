import { Router } from 'express';
import { PropertyController } from '@/controllers';
import {
  AuthMiddleware,
  MulterMiddleware,
  PropertyMiddleware,
} from '@/middlewares';

const propertyRouter = Router();

propertyRouter.post(
  '/',
  // PropertyMiddleware.validateCreateProperty,
  AuthMiddleware.verifyToken,
  MulterMiddleware.upload.array('propertyImages', 5),
  PropertyController.createProperty
);
propertyRouter.get(
  '/owner-property/:id',
  AuthMiddleware.verifyToken,
  PropertyController.getAllOwnerProperty
);
propertyRouter.get('/', PropertyController.getProperties);
propertyRouter.get('/search', PropertyController.getPropertyNameList);
propertyRouter.get('/:id', PropertyController.getPropertyById);
propertyRouter.put(
  '/:id',
  AuthMiddleware.verifyToken,
  MulterMiddleware.upload.array('propertyImages', 5),
  PropertyController.updateProperty
);
propertyRouter.put(
  '/delete/:id',
  AuthMiddleware.verifyToken,
  PropertyController.deleteProperty
);

export default propertyRouter;
