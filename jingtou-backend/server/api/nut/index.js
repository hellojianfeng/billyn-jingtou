'use strict';

var express = require('express');
var controller = require('./nut.controller');
import * as auth from '../../auth/auth.service';

var router = express.Router();

router.get('/', controller.index);
router.get('/user', auth.isAuthenticated(), controller.findAllUserPermitNut);
router.get('/permits/roles', controller.findAllPermitRole);
router.get('/:id', controller.show);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id', controller.update);
router.delete('/:id', controller.destroy);

module.exports = router;
