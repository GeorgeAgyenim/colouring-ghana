import express from 'express';

import extractController from '../controllers/extractController';

const router = express.Router();

router.get('/', extractController.getAllDataExtracts);
router.get(`/${process.env.SUBDIRECTORY??''}/:extract_id`, extractController.getDataExtract);

export default router;
