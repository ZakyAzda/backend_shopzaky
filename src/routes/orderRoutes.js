const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
console.log("🔍 Cek Order Controller:", orderController);
router.post('/checkout', orderController.checkout);
router.get('/history/:userId', orderController.getUserOrders);
module.exports = router;