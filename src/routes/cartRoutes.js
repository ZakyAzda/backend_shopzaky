const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

console.log("🔍 Cek Controller:", cartController);
router.post('/add', cartController.addToCart);
router.get('/:userId', cartController.getCart);
router.delete('/:cartId', cartController.removeFromCart);

module.exports = router;