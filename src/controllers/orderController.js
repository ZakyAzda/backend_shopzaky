const db = require('../config/database');
const midtransClient = require('midtrans-client');
require('dotenv').config();

const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});


exports.checkout = (req, res) => {
    const { user_id, address, total_price } = req.body;

    if (!user_id || !address || !total_price) {
        return res.status(400).json({ error: "Data tidak lengkap!" });
    }

    const midtransOrderId = `ORDER-${user_id}-${Math.floor(Date.now() / 1000)}`;
    const queryOrder = "INSERT INTO orders (user_id, midtrans_order_id, total_price, address, status) VALUES (?, ?, ?, ?, 'pending')";
    
    db.query(queryOrder, [user_id, midtransOrderId, total_price, address], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Gagal DB" });
        }
        const orderId = result.insertId;

        let parameter = {
            "transaction_details": {
                "order_id": midtransOrderId,
                "gross_amount": parseInt(total_price)
            },
            "customer_details": {
                "first_name": "User",
                "last_name": user_id.toString(),
                "address": address
            }
        };

        snap.createTransaction(parameter)
            .then((transaction) => {
                const snapToken = transaction.token;
                const snapUrl = transaction.redirect_url; 

                const updateQuery = "UPDATE orders SET snap_token = ? WHERE id = ?";
                db.query(updateQuery, [snapToken, orderId], () => {
                    processCartItems(user_id, orderId, res, snapToken, snapUrl, midtransOrderId);
                });
            })
            .catch((e) => {
                console.error("Midtrans Error:", e.message);
                res.status(500).json({ error: "Midtrans Gagal. Cek Key di .env!" });
            });
    });
};

exports.getUserOrders = (req, res) => {
    const userId = req.params.userId;

    const query = "SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC";

    db.query(query, [userId], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        const updatedOrders = await Promise.all(results.map(async (order) => {
            
            if (order.status === 'pending' && order.midtrans_order_id) {
                try {
                    const statusResponse = await snap.transaction.status(order.midtrans_order_id);
                    const transactionStatus = statusResponse.transaction_status;
                    const fraudStatus = statusResponse.fraud_status;

                    console.log(`🔍 Cek Order ${order.midtrans_order_id}: ${transactionStatus}`);

                    let newStatus = 'pending';
                    if (transactionStatus == 'capture' || transactionStatus == 'settlement') {
                        if (fraudStatus == 'challenge') {
                            newStatus = 'challenge';
                        } else {
                            newStatus = 'Success'; 
                        }
                    } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
                        newStatus = 'Failed';
                    } else if (transactionStatus == 'pending') {
                        newStatus = 'pending';
                    }

                    if (newStatus !== 'pending') {
                        const updateQ = "UPDATE orders SET status = ? WHERE id = ?";
                        await new Promise(resolve => db.query(updateQ, [newStatus, order.id], resolve));
                        order.status = newStatus; 
                    }

                } catch (e) {
                    console.log(`⚠️ Gagal cek status Midtrans order ${order.id}:`, e.message);
                }
            }
            return order;
        }));

        res.json(updatedOrders);
    });
};

function processCartItems(userId, orderId, res, snapToken, snapUrl, midtransOrderId) {
    const queryGetCart = "SELECT * FROM cart WHERE user_id = ?";
    db.query(queryGetCart, [userId], (err, cartItems) => {
        if (err || cartItems.length === 0) return res.status(400).json({ message: "Cart kosong" });

        const orderItemsData = cartItems.map(item => [orderId, item.product_id, item.quantity, 0]);
        const queryInsertItems = "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?";
        
        db.query(queryInsertItems, [orderItemsData], () => {
            const queryDeleteCart = "DELETE FROM cart WHERE user_id = ?";
            db.query(queryDeleteCart, [userId], () => {
                res.status(201).json({ 
                    message: "Order Dibuat!", 
                    snap_token: snapToken, 
                    payment_url: snapUrl,
                    order_id: midtransOrderId 
                });
            });
        });
    });
}